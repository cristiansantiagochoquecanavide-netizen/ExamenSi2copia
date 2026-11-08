"""Servicios de negocio para Sincronización Offline e Idempotencia (CU16 y CU17)."""
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select, update, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from apps.GestionSaas.models import SincronizacionOffline, ConflictoInventario
from apps.GestionInventario.models import Sucursal
from apps.GestionCatalogo.models import PrendaVariante, Prenda, InventarioStock, MovimientoInventario
from apps.GestionVentas.models import Venta, DetalleVenta, Pago
from apps.GestionReservas.models import Reserva, DetalleReserva
from apps.UsuariosSeguridad.models import Usuario
from apps.GestionVentas.sincronizacion.schemas import (
    LoteSincronizacionRequest, SincronizacionBatchResponse, SincronizacionResultadoItem,
    ConflictoInventarioResponse, ResolverConflictoRequest
)


class SincronizacionService:

    @staticmethod
    async def procesar_lote_offline(
        db: AsyncSession,
        request: LoteSincronizacionRequest,
        current_user: Optional[Usuario] = None,
        empresa_id: Optional[int] = None
    ) -> SincronizacionBatchResponse:
        """
        CU16: Sincronizar Operaciones Comerciales Offline.
        Garantiza estricta Idempotencia (RN04) y detección de discrepancias de inventario (CU17).
        """
        total_recibidos = len(request.lote)
        procesados = 0
        duplicados = 0
        conflictos = 0
        errores = 0
        resultados: List[SincronizacionResultadoItem] = []

        # Determinar empresa y usuario por defecto si no vienen autenticados
        emp_id = empresa_id or (current_user.empresa_id if current_user and hasattr(current_user, 'empresa_id') else 1)
        usr_id = current_user.id if current_user else 1

        for tx in request.lote:
            uuid_op = tx.uuid_operacion.strip()

            try:
                # 1. COMPROBACIÓN DE IDEMPOTENCIA (RN04)
                stmt_existing = select(SincronizacionOffline).where(
                    SincronizacionOffline.uuid_operacion == uuid_op
                )
                res_existing = await db.execute(stmt_existing)
                existing = res_existing.scalar_one_or_none()

                if existing and existing.estado == "SINCRONIZADO":
                    duplicados += 1
                    resultados.append(SincronizacionResultadoItem(
                        uuid_operacion=uuid_op,
                        tipo_operacion=tx.tipo_operacion,
                        estado="DUPLICADO_IDEMPOTENTE",
                        mensaje="Transacción previamente sincronizada (Idempotencia verificada; no se duplicó inventario ni venta)."
                    ))
                    continue

                # Extraer datos del payload
                payload = tx.payload_json or {}
                sucursal_id = int(payload.get("sucursal_id") or 1)

                # 2. PROCESAMIENTO SEGÚN TIPO DE OPERACIÓN
                if tx.tipo_operacion in ["VENTA_LOCAL", "VENTA_CONTADO"]:
                    items = payload.get("items", [])
                    if not items:
                        errores += 1
                        resultados.append(SincronizacionResultadoItem(
                            uuid_operacion=uuid_op,
                            tipo_operacion=tx.tipo_operacion,
                            estado="ERROR",
                            mensaje="La venta offline no contiene artículos."
                        ))
                        continue

                    # Validar disponibilidad de stock en el servidor central
                    stock_conflicto = False
                    variante_en_conflicto = None
                    cant_solicitada = 0
                    stock_disponible_servidor = 0

                    for it in items:
                        var_id = int(it.get("producto_variante_id") or it.get("variante_id") or 0)
                        cant = int(it.get("cantidad") or 1)

                        # Consultar stock actual de la variante en la sucursal
                        stmt_stock = select(InventarioStock).where(
                            and_(
                                InventarioStock.variante_id == var_id,
                                InventarioStock.sucursal_id == sucursal_id
                            )
                        )
                        res_st = await db.execute(stmt_stock)
                        stock_item = res_st.scalar_one_or_none()

                        disponible = stock_item.cantidad_disponible if stock_item else 0
                        if disponible < cant:
                            stock_conflicto = True
                            variante_en_conflicto = var_id
                            cant_solicitada = cant
                            stock_disponible_servidor = disponible
                            break

                    # Registrar registro de sincronización
                    if not existing:
                        sync_reg = SincronizacionOffline(
                            empresa_id=emp_id,
                            sucursal_id=sucursal_id,
                            usuario_id=usr_id,
                            uuid_operacion=uuid_op,
                            tipo_operacion=tx.tipo_operacion,
                            payload_json=payload,
                            estado="PENDIENTE",
                            fecha_registro_local=tx.fecha_registro_local,
                            fecha_sincronizacion=datetime.now(timezone.utc)
                        )
                        db.add(sync_reg)
                        await db.flush()
                    else:
                        sync_reg = existing

                    # Si hubo colisión de inventario -> Registrar en conflicto_inventario (CU17)
                    if stock_conflicto:
                        conflictos += 1
                        sync_reg.estado = "CONFLICTO_STOCK"
                        sync_reg.error_detalle = f"Stock insuficiente en variante {variante_en_conflicto}. Solicitado: {cant_solicitada}, Servidor: {stock_disponible_servidor}"

                        conflicto_obj = ConflictoInventario(
                            sincronizacion_id=sync_reg.id,
                            producto_variante_id=variante_en_conflicto,
                            sucursal_id=sucursal_id,
                            cantidad_solicitada=cant_solicitada,
                            stock_disponible_servidor=stock_disponible_servidor,
                            estado_resolucion="PENDIENTE_RESOLUCION",
                            fecha_deteccion=datetime.now(timezone.utc)
                        )
                        db.add(conflicto_obj)
                        await db.flush()

                        resultados.append(SincronizacionResultadoItem(
                            uuid_operacion=uuid_op,
                            tipo_operacion=tx.tipo_operacion,
                            estado="CONFLICTO_STOCK",
                            mensaje=f"Discrepancia de inventario detectada: stock en servidor agotado ({stock_disponible_servidor} disponibles). Registrado en conflicto_inventario para arbitraje."
                        ))
                    else:
                        # Stock suficiente -> Asentar Venta definitiva en PostgreSQL
                        codigo_vta = f"VTA-OFF-{datetime.now().strftime('%Y%m%d%H%M')}-{uuid_op[:6].upper()}"
                        monto_total = Decimal(str(payload.get("monto_total") or 0.0))
                        cliente_nombre = payload.get("cliente_nombre") or "Cliente Presencial (Offline)"

                        nueva_venta = Venta(
                            codigo_venta=codigo_vta,
                            sucursal_id=sucursal_id,
                            usuario_id=usr_id,
                            cliente_id=payload.get("cliente_id"),
                            canal_venta="FISICA_POS",
                            cliente_nombre=cliente_nombre,
                            cliente_nit=str(payload.get("cliente_nit") or "0"),
                            subtotal=monto_total,
                            descuento=Decimal("0.00"),
                            costo_envio=Decimal("0.00"),
                            total=monto_total,
                            estado="PAGADA",
                            observaciones=f"Venta sincronizada offline. UUID: {uuid_op}"
                        )
                        db.add(nueva_venta)
                        await db.flush()

                        # Insertar detalles y rebajar stock
                        for it in items:
                            var_id = int(it.get("producto_variante_id") or it.get("variante_id") or 0)
                            cant = int(it.get("cantidad") or 1)
                            precio_unit = Decimal(str(it.get("precio_unitario") or it.get("precio") or 0.0))
                            subtot = precio_unit * cant

                            det_venta = DetalleVenta(
                                venta_id=nueva_venta.id,
                                variante_id=var_id,
                                cantidad=cant,
                                precio_unitario=precio_unit,
                                subtotal=subtot
                            )
                            db.add(det_venta)

                            # Actualizar stock
                            stmt_st_upd = select(InventarioStock).where(
                                and_(
                                    InventarioStock.variante_id == var_id,
                                    InventarioStock.sucursal_id == sucursal_id
                                )
                            )
                            res_st_upd = await db.execute(stmt_st_upd)
                            st_item = res_st_upd.scalar_one_or_none()
                            if st_item:
                                cant_ant = st_item.cantidad_disponible
                                st_item.cantidad_disponible = max(0, st_item.cantidad_disponible - cant)
                                st_item.updated_at = datetime.now(timezone.utc)

                                mov = MovimientoInventario(
                                    stock_id=st_item.id,
                                    tipo_movimiento="VENTA",
                                    cantidad=cant,
                                    cantidad_anterior=cant_ant,
                                    cantidad_nueva=st_item.cantidad_disponible,
                                    motivo=f"Venta Offline {codigo_vta}",
                                    usuario_id=usr_id
                                )
                                db.add(mov)

                        # Registrar Pago Efectivo (RN03)
                        pago = Pago(
                            venta_id=nueva_venta.id,
                            metodo_pago="EFECTIVO",
                            pasarela="EFECTIVO_POS",
                            monto=monto_total,
                            moneda="USD",
                            estado_pago="CONFIRMADO",
                            datos_transaccion=f"Pago contado offline UUID: {uuid_op}"
                        )
                        db.add(pago)

                        # Actualizar estado de la sincronización
                        sync_reg.estado = "SINCRONIZADO"
                        sync_reg.fecha_sincronizacion = datetime.now(timezone.utc)
                        procesados += 1

                        resultados.append(SincronizacionResultadoItem(
                            uuid_operacion=uuid_op,
                            tipo_operacion=tx.tipo_operacion,
                            estado="SINCRONIZADO",
                            mensaje="Venta offline confirmada exitosamente e inventario rebajado.",
                            codigo_referencia=codigo_vta
                        ))

                elif tx.tipo_operacion in ["RESERVA_LOCAL", "RESERVA"]:
                    # CU14 / RN05: Reserva de probador sin pago
                    codigo_res = f"RES-OFF-{datetime.now().strftime('%Y%m%d%H%M')}-{uuid_op[:6].upper()}"
                    hora_ensayo = payload.get("hora_ensayo") or "15:00"
                    prenda_id = payload.get("prenda_id") or 1

                    if not existing:
                        sync_reg = SincronizacionOffline(
                            empresa_id=emp_id,
                            sucursal_id=sucursal_id,
                            usuario_id=usr_id,
                            uuid_operacion=uuid_op,
                            tipo_operacion=tx.tipo_operacion,
                            payload_json=payload,
                            estado="SINCRONIZADO",
                            fecha_registro_local=tx.fecha_registro_local,
                            fecha_sincronizacion=datetime.now(timezone.utc)
                        )
                        db.add(sync_reg)
                        await db.flush()

                    nueva_reserva = Reserva(
                        codigo_reserva=codigo_res,
                        cliente_id=payload.get("cliente_id") or usr_id,
                        sucursal_id=sucursal_id,
                        fecha_reserva=datetime.now(timezone.utc).date(),
                        hora_estimada=hora_ensayo,
                        estado="CONFIRMADA",
                        monto_anticipo=Decimal("0.00"),
                        moneda="USD",
                        observaciones=f"Reserva para probador físico offline. UUID: {uuid_op}"
                    )
                    db.add(nueva_reserva)
                    await db.flush()

                    procesados += 1
                    resultados.append(SincronizacionResultadoItem(
                        uuid_operacion=uuid_op,
                        tipo_operacion=tx.tipo_operacion,
                        estado="SINCRONIZADO",
                        mensaje="Reserva de probador físico sin costo sincronizada exitosamente.",
                        codigo_referencia=codigo_res
                    ))

                else:
                    errores += 1
                    resultados.append(SincronizacionResultadoItem(
                        uuid_operacion=uuid_op,
                        tipo_operacion=tx.tipo_operacion,
                        estado="ERROR",
                        mensaje=f"Tipo de operación '{tx.tipo_operacion}' no reconocido."
                    ))

            except Exception as e_tx:
                errores += 1
                resultados.append(SincronizacionResultadoItem(
                    uuid_operacion=uuid_op,
                    tipo_operacion=tx.tipo_operacion,
                    estado="ERROR",
                    mensaje=f"Fallo al procesar transacción: {str(e_tx)}"
                ))

        await db.commit()

        return SincronizacionBatchResponse(
            total_recibidos=total_recibidos,
            procesados_exitosamente=procesados,
            duplicados_idempotentes=duplicados,
            conflictos_stock=conflictos,
            errores=errores,
            resultados=resultados
        )

    @staticmethod
    async def listar_conflictos(
        db: AsyncSession,
        sucursal_id: Optional[int] = None,
        estado_resolucion: Optional[str] = None
    ) -> List[ConflictoInventarioResponse]:
        """
        CU17: Listar anomalías y colisiones de inventario registradas durante sincronizaciones offline.
        """
        query = select(ConflictoInventario).order_by(ConflictoInventario.fecha_deteccion.desc())

        if sucursal_id:
            query = query.where(ConflictoInventario.sucursal_id == sucursal_id)
        if estado_resolucion:
            query = query.where(ConflictoInventario.estado_resolucion == estado_resolucion)

        res = await db.execute(query)
        conflictos = res.scalars().all()

        respuestas = []
        for c in conflictos:
            # Recuperar info de la variante y prenda
            stmt_var = select(PrendaVariante).options(
                selectinload(PrendaVariante.prenda),
                selectinload(PrendaVariante.talla),
                selectinload(PrendaVariante.color)
            ).where(PrendaVariante.id == c.producto_variante_id)
            res_var = await db.execute(stmt_var)
            variante = res_var.scalar_one_or_none()

            # Recuperar sucursal
            stmt_suc = select(Sucursal).where(Sucursal.id == c.sucursal_id)
            res_suc = await db.execute(stmt_suc)
            sucursal = res_suc.scalar_one_or_none()

            # Recuperar UUID de sincronizacion
            stmt_sync = select(SincronizacionOffline).where(SincronizacionOffline.id == c.sincronizacion_id)
            res_sync = await db.execute(stmt_sync)
            sync = res_sync.scalar_one_or_none()

            respuestas.append(ConflictoInventarioResponse(
                id=c.id,
                sincronizacion_id=c.sincronizacion_id,
                uuid_operacion=sync.uuid_operacion if sync else None,
                sucursal_id=c.sucursal_id,
                sucursal_nombre=sucursal.nombre if sucursal else f"Sucursal #{c.sucursal_id}",
                producto_variante_id=c.producto_variante_id,
                prenda_nombre=variante.prenda.nombre if (variante and variante.prenda) else f"Variante #{c.producto_variante_id}",
                talla=variante.talla.codigo if (variante and variante.talla) else None,
                color=variante.color.nombre if (variante and variante.color) else None,
                cantidad_solicitada=c.cantidad_solicitada,
                stock_disponible_servidor=c.stock_disponible_servidor,
                estado_resolucion=c.estado_resolucion,
                fecha_deteccion=c.fecha_deteccion,
                fecha_resolucion=c.fecha_resolucion,
                resuelto_por_usuario_id=c.resuelto_por_usuario_id
            ))

        return respuestas

    @staticmethod
    async def resolver_conflicto(
        db: AsyncSession,
        conflicto_id: int,
        data: ResolverConflictoRequest,
        usuario_id: int
    ) -> dict:
        """
        CU17: Resolver conflicto de consistencia aplicando arbitraje administrativo:
        - TRASPASO_INMEDIATO (CU12)
        - ADMITIR_SALDO_NEGATIVO
        - ANULAR_VENTA
        """
        stmt = select(ConflictoInventario).where(ConflictoInventario.id == conflicto_id)
        res = await db.execute(stmt)
        conflicto = res.scalar_one_or_none()

        if not conflicto:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conflicto de inventario no encontrado.")

        if conflicto.estado_resolucion == "RESUELTO":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El conflicto ya ha sido resuelto anteriormente.")

        accion = data.accion.upper()
        if accion not in ["TRASPASO_INMEDIATO", "ADMITIR_SALDO_NEGATIVO", "ANULAR_VENTA"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Acción '{accion}' inválida.")

        # Aplicar resolución
        if accion == "ADMITIR_SALDO_NEGATIVO":
            # Descontar stock aunque quede en negativo temporal hasta reposición
            stmt_st = select(InventarioStock).where(
                and_(
                    InventarioStock.variante_id == conflicto.producto_variante_id,
                    InventarioStock.sucursal_id == conflicto.sucursal_id
                )
            )
            res_st = await db.execute(stmt_st)
            stock_item = res_st.scalar_one_or_none()
            if stock_item:
                stock_item.cantidad_disponible -= conflicto.cantidad_solicitada
                stock_item.updated_at = datetime.now(timezone.utc)

        elif accion == "TRASPASO_INMEDIATO":
            # Si se especificó sucursal proveedora, descontar de origen
            if data.sucursal_proveedora_id:
                stmt_st_orig = select(InventarioStock).where(
                    and_(
                        InventarioStock.variante_id == conflicto.producto_variante_id,
                        InventarioStock.sucursal_id == data.sucursal_proveedora_id
                    )
                )
                res_st_orig = await db.execute(stmt_st_orig)
                stock_orig = res_st_orig.scalar_one_or_none()
                if stock_orig and stock_orig.cantidad_disponible >= conflicto.cantidad_solicitada:
                    stock_orig.cantidad_disponible -= conflicto.cantidad_solicitada

        conflicto.estado_resolucion = "RESUELTO"
        conflicto.resuelto_por_usuario_id = usuario_id
        conflicto.fecha_resolucion = datetime.now(timezone.utc)

        await db.commit()

        return {
            "conflicto_id": conflicto_id,
            "estado": "RESUELTO",
            "accion_aplicada": accion,
            "observaciones": data.observaciones,
            "mensaje": "Conflicto dirimido exitosamente. Consistencia de inventario recuperada."
        }
