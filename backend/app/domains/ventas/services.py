"""Capa de Servicio (Lógica de Negocio) para el dominio de Ventas y Pagos."""
from datetime import datetime, timezone, date, timedelta
from decimal import Decimal
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select, and_, desc, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

import io
import json
import uuid
import qrcode
import qrcode.image.svg
from app.domains.ventas.models import Venta, DetalleVenta, Pago, Devolucion, DetalleDevolucion, EnvioPedido
from app.domains.ventas.schemas import (
    VentaPOSCreate, DevolucionCreate, VentaParaDevolucionResponse, VentaParaDevolucionItem,
    PagoElectronicoCreate, ConfirmarPagoRequest, QRGenerarResponse, WebhookPagoPayload,
    VentaOnlineCheckoutRequest, ActualizarEstadoEnvioRequest
)
from app.domains.inventario.models import Sucursal
from app.domains.usuarios.models import Usuario
from app.domains.usuarios.services import AuditoriaService
from app.domains.catalogo.models import PrendaVariante, InventarioStock, MovimientoInventario, Prenda


class VentasService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_status(self) -> dict:
        """Retorna el estado operativo del servicio del dominio."""
        return {
            "domain": "ventas",
            "status": "ready",
            "description": "Ventas presenciales POS, compras digitales web/movil, pasarelas de pago y comprobantes"
        }

    @staticmethod
    async def listar_ventas(
        db: AsyncSession,
        sucursal_id: Optional[int] = None,
        fecha: Optional[date] = None,
        canal_venta: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Venta]:
        query = select(Venta).options(
            selectinload(Venta.sucursal),
            selectinload(Venta.cajero),
            selectinload(Venta.cliente),
            selectinload(Venta.pagos),
            selectinload(Venta.envio).selectinload(EnvioPedido.sucursal_recojo),
            selectinload(Venta.detalles).selectinload(DetalleVenta.variante).selectinload(PrendaVariante.prenda),
            selectinload(Venta.detalles).selectinload(DetalleVenta.variante).selectinload(PrendaVariante.talla),
            selectinload(Venta.detalles).selectinload(DetalleVenta.variante).selectinload(PrendaVariante.color)
        )

        if sucursal_id:
            query = query.where(Venta.sucursal_id == sucursal_id)
        if canal_venta:
            query = query.where(Venta.canal_venta == canal_venta.upper())
        if fecha:
            query = query.where(cast(Venta.created_at, Date) == fecha)

        result = await db.execute(query.order_by(desc(Venta.id)).limit(limit).offset(offset))
        return list(result.scalars().all())

    @staticmethod
    async def obtener_venta_por_id(db: AsyncSession, venta_id: int) -> Venta:
        query = select(Venta).options(
            selectinload(Venta.sucursal),
            selectinload(Venta.cajero),
            selectinload(Venta.cliente),
            selectinload(Venta.pagos),
            selectinload(Venta.envio).selectinload(EnvioPedido.sucursal_recojo),
            selectinload(Venta.detalles).selectinload(DetalleVenta.variante).selectinload(PrendaVariante.prenda),
            selectinload(Venta.detalles).selectinload(DetalleVenta.variante).selectinload(PrendaVariante.talla),
            selectinload(Venta.detalles).selectinload(DetalleVenta.variante).selectinload(PrendaVariante.color)
        ).where(Venta.id == venta_id)
        result = await db.execute(query)
        venta = result.scalar_one_or_none()
        if not venta:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venta no encontrada")
        return venta

    @staticmethod
    async def registrar_venta_pos(
        db: AsyncSession,
        data: VentaPOSCreate,
        cajero: Usuario,
        ip: Optional[str] = None
    ) -> Venta:
        # 1. Validar sucursal
        sucursal = await db.get(Sucursal, data.sucursal_id)
        if not sucursal or not sucursal.activo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sucursal de venta inválida o inactiva"
            )

        if not data.detalles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El ticket debe incluir al menos una prenda"
            )

        # 2. Validar stock disponible y calcular precios
        lineas_procesadas = []
        subtotal_acumulado = Decimal("0.00")

        for item in data.detalles:
            # Obtener variante y prenda asociada
            query_var = select(PrendaVariante).options(
                selectinload(PrendaVariante.prenda),
                selectinload(PrendaVariante.talla),
                selectinload(PrendaVariante.color)
            ).where(PrendaVariante.id == item.variante_id)
            res_var = await db.execute(query_var)
            variante = res_var.scalar_one_or_none()

            if not variante or not variante.activo:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Variante ID {item.variante_id} inexistente o inactiva"
                )

            # Consultar stock físico en la sucursal de venta
            res_stock = await db.execute(
                select(InventarioStock).where(
                    and_(
                        InventarioStock.variante_id == item.variante_id,
                        InventarioStock.sucursal_id == data.sucursal_id
                    )
                )
            )
            stock = res_stock.scalar_one_or_none()
            disponible = stock.cantidad_disponible if stock else 0

            if not stock or disponible < item.cantidad:
                nombre_prenda = variante.prenda.nombre if variante.prenda else "Prenda"
                talla_code = variante.talla.codigo if variante.talla else ""
                color_nom = variante.color.nombre if variante.color else ""
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stock insuficiente en la sucursal '{sucursal.nombre}' para '{nombre_prenda}' (Talla: {talla_code}, Color: {color_nom}, SKU: {variante.sku_variante}). Disponible: {disponible} uds, Solicitado: {item.cantidad} uds."
                )

            # Determinar precio unitario
            precio_unitario = item.precio_unitario if item.precio_unitario is not None else (
                variante.prenda.precio_base if variante.prenda else Decimal("0.00")
            )
            subtotal_linea = Decimal(item.cantidad) * Decimal(precio_unitario)
            subtotal_acumulado += subtotal_linea

            lineas_procesadas.append({
                "variante_id": item.variante_id,
                "cantidad": item.cantidad,
                "precio_unitario": Decimal(precio_unitario),
                "subtotal": subtotal_linea,
                "stock_obj": stock,
                "variante_obj": variante
            })

        # 3. Aplicar descuento y liquidar total
        descuento = Decimal(data.descuento) if data.descuento else Decimal("0.00")
        if descuento > subtotal_acumulado:
            descuento = subtotal_acumulado
        total_a_pagar = subtotal_acumulado - descuento

        # 4. Validar método de pago y monto
        monto_pago = Decimal(data.pago.monto) if data.pago.monto is not None else total_a_pagar
        if monto_pago < total_a_pagar:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El importe abonado (${monto_pago}) es inferior al total a liquidar (${total_a_pagar})."
            )

        # 5. Generar código único de comprobante / ticket
        ahora = datetime.now(timezone.utc)
        codigo_venta = f"VTA-{ahora.strftime('%Y%m%d%H%M%S')}-{data.sucursal_id}"

        # 6. Crear Venta Cabecera
        venta = Venta(
            codigo_venta=codigo_venta,
            sucursal_id=data.sucursal_id,
            usuario_id=cajero.id,
            cliente_id=data.cliente_id,
            canal_venta="FISICA_POS",
            cliente_nombre=data.cliente_nombre.strip() or "Consumidor Final",
            cliente_nit=data.cliente_nit.strip() or "0",
            subtotal=subtotal_acumulado,
            descuento=descuento,
            costo_envio=Decimal("0.00"),
            total=total_a_pagar,
            estado="PAGADA",
            observaciones=data.observaciones
        )
        db.add(venta)
        await db.flush()

        # 7. Insertar Detalles de Venta y Descontar Kardex
        for lp in lineas_procesadas:
            detalle = DetalleVenta(
                venta_id=venta.id,
                variante_id=lp["variante_id"],
                cantidad=lp["cantidad"],
                precio_unitario=lp["precio_unitario"],
                subtotal=lp["subtotal"]
            )
            db.add(detalle)

            # Afectación atómica de inventario
            stk = lp["stock_obj"]
            ant_cant = stk.cantidad_disponible
            stk.cantidad_disponible -= lp["cantidad"]
            nva_cant = stk.cantidad_disponible

            # Movimiento formal en Kardex
            movimiento = MovimientoInventario(
                stock_id=stk.id,
                tipo_movimiento="VENTA",
                cantidad=-lp["cantidad"],
                cantidad_anterior=ant_cant,
                cantidad_nueva=nva_cant,
                motivo=f"Venta POS Ticket #{codigo_venta} - Cajero: {cajero.email} - Cliente: {venta.cliente_nombre}",
                usuario_id=cajero.id
            )
            db.add(movimiento)

        # 8. Registrar Comprobante de Pago
        pago = Pago(
            venta_id=venta.id,
            metodo_pago=data.pago.metodo_pago,
            monto=total_a_pagar,
            estado_pago="CONFIRMADO",
            transaccion_externa_id=data.pago.transaccion_externa_id,
            fecha_hora=ahora
        )
        db.add(pago)

        await db.commit()

        # 9. Trazabilidad y Auditoría (CU7)
        await AuditoriaService.registrar_evento(
            db, accion="VENTA_POS_REGISTRADA", modulo="ventas",
            detalle=f"Venta POS #{codigo_venta} efectuada en '{sucursal.nombre}' por ${total_a_pagar} ({len(lineas_procesadas)} prendas) - Método: {data.pago.metodo_pago} - Cliente: {venta.cliente_nombre} (NIT: {venta.cliente_nit})",
            usuario_id=cajero.id, usuario_email=cajero.email,
            ip_address=ip,
            valores_nuevos={
                "venta_id": venta.id,
                "codigo_venta": codigo_venta,
                "total": str(total_a_pagar),
                "sucursal_id": data.sucursal_id,
                "metodo_pago": data.pago.metodo_pago,
                "cajero_id": cajero.id
            }
        )

        return await VentasService.obtener_venta_por_id(db, venta.id)

    # ----------------- CU11: DEVOLUCIONES Y CAMBIOS -----------------
    @staticmethod
    async def buscar_venta_para_devolucion(
        db: AsyncSession,
        codigo_venta: str
    ) -> VentaParaDevolucionResponse:
        query = select(Venta).options(
            selectinload(Venta.sucursal),
            selectinload(Venta.cajero),
            selectinload(Venta.detalles).selectinload(DetalleVenta.variante).selectinload(PrendaVariante.prenda),
            selectinload(Venta.detalles).selectinload(DetalleVenta.variante).selectinload(PrendaVariante.talla),
            selectinload(Venta.detalles).selectinload(DetalleVenta.variante).selectinload(PrendaVariante.color),
            selectinload(Venta.devoluciones).selectinload(Devolucion.detalles)
        ).where(Venta.codigo_venta == codigo_venta.strip())

        res = await db.execute(query)
        venta = res.scalar_one_or_none()
        if not venta:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ticket o Venta con código '{codigo_venta}' no encontrada"
            )

        if venta.estado != "PAGADA":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La venta #{codigo_venta} se encuentra en estado '{venta.estado}' y no admite devoluciones"
            )

        # Mapear devoluciones ya completadas por variante
        ya_devueltos_map = {}
        for dev in venta.devoluciones:
            if dev.estado == "COMPLETADA":
                for d_det in dev.detalles:
                    ya_devueltos_map[d_det.variante_devuelta_id] = (
                        ya_devueltos_map.get(d_det.variante_devuelta_id, 0) + d_det.cantidad_devuelta
                    )

        items_resp = []
        for det in venta.detalles:
            var = det.variante
            ya_dev = ya_devueltos_map.get(det.variante_id, 0)
            disponible = max(0, det.cantidad - ya_dev)
            items_resp.append(VentaParaDevolucionItem(
                detalle_id=det.id,
                variante_id=det.variante_id,
                sku=var.sku_variante if var else f"VAR-{det.variante_id}",
                prenda_nombre=var.prenda.nombre if var and var.prenda else "Prenda",
                talla=var.talla.codigo if var and var.talla else "-",
                color=var.color.nombre if var and var.color else "-",
                precio_unitario=det.precio_unitario,
                cantidad_comprada=det.cantidad,
                cantidad_ya_devuelta=ya_dev,
                cantidad_disponible_devolucion=disponible
            ))

        return VentaParaDevolucionResponse(
            id=venta.id,
            codigo_venta=venta.codigo_venta,
            sucursal_id=venta.sucursal_id,
            sucursal_nombre=venta.sucursal.nombre if venta.sucursal else f"Sucursal {venta.sucursal_id}",
            fecha=venta.created_at,
            cliente_nombre=venta.cliente_nombre,
            cliente_nit=venta.cliente_nit,
            total=venta.total,
            estado=venta.estado,
            cajero_nombre=f"{venta.cajero.nombre} {venta.cajero.apellido}" if venta.cajero else "Cajero",
            items=items_resp
        )

    @staticmethod
    async def registrar_devolucion_cambio(
        db: AsyncSession,
        data: DevolucionCreate,
        usuario: Usuario,
        ip: Optional[str] = None
    ) -> Devolucion:
        # 1. Validar venta
        query_v = select(Venta).options(
            selectinload(Venta.sucursal),
            selectinload(Venta.detalles).selectinload(DetalleVenta.variante).selectinload(PrendaVariante.prenda),
            selectinload(Venta.devoluciones).selectinload(Devolucion.detalles)
        ).where(Venta.id == data.venta_id)
        res_v = await db.execute(query_v)
        venta = res_v.scalar_one_or_none()
        if not venta:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venta original no encontrada")
        if venta.estado != "PAGADA":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Solo ventas PAGADAS admiten devoluciones o cambios")

        # 2. Validar sucursal
        sucursal = await db.get(Sucursal, data.sucursal_id)
        if not sucursal or not sucursal.activo:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sucursal inválida o inactiva")

        # Calcular unidades ya devueltas
        ya_devueltos_map = {}
        for dev in venta.devoluciones:
            if dev.estado == "COMPLETADA":
                for d_det in dev.detalles:
                    ya_devueltos_map[d_det.variante_devuelta_id] = (
                        ya_devueltos_map.get(d_det.variante_devuelta_id, 0) + d_det.cantidad_devuelta
                    )

        # Mapa de detalles vendidos
        detalles_venta_map = {d.variante_id: d for d in venta.detalles}

        total_devuelto = Decimal("0.00")
        total_nuevo = Decimal("0.00")
        detalles_a_crear = []
        ahora = datetime.now(timezone.utc)
        codigo_dev = f"DEV-{ahora.strftime('%Y%m%d%H%M%S')}-{ahora.microsecond // 1000:03d}-{data.sucursal_id}"

        for item in data.detalles:
            if item.variante_devuelta_id not in detalles_venta_map:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"La variante ID {item.variante_devuelta_id} no pertenece a esta venta"
                )

            det_orig = detalles_venta_map[item.variante_devuelta_id]
            ya_dev = ya_devueltos_map.get(item.variante_devuelta_id, 0)
            max_dev = det_orig.cantidad - ya_dev
            if item.cantidad_devuelta > max_dev:
                sku_txt = det_orig.variante.sku_variante if det_orig.variante else f"ID {det_orig.variante_id}"
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No se pueden devolver {item.cantidad_devuelta} uds de '{sku_txt}'. Saldo devuelto permitido: {max_dev} uds."
                )

            precio_dev = det_orig.precio_unitario
            sub_dev = precio_dev * item.cantidad_devuelta
            total_devuelto += sub_dev

            # Manejo de stock de la prenda devuelta
            res_stk_dev = await db.execute(
                select(InventarioStock).where(
                    and_(
                        InventarioStock.variante_id == item.variante_devuelta_id,
                        InventarioStock.sucursal_id == data.sucursal_id
                    )
                )
            )
            stk_dev = res_stk_dev.scalar_one_or_none()
            if not stk_dev:
                stk_dev = InventarioStock(
                    variante_id=item.variante_devuelta_id,
                    sucursal_id=data.sucursal_id,
                    cantidad_disponible=0,
                    cantidad_reservada=0,
                    stock_minimo=5
                )
                db.add(stk_dev)
                await db.flush()

            if item.condicion_prenda == "APTO_PARA_VENTA":
                ant_disp = stk_dev.cantidad_disponible
                stk_dev.cantidad_disponible += item.cantidad_devuelta
                nva_disp = stk_dev.cantidad_disponible
                mov_tipo = "DEVOLUCION_INGRESO" if data.tipo == "DEVOLUCION" else "CAMBIO_INGRESO"
                db.add(MovimientoInventario(
                    stock_id=stk_dev.id,
                    tipo_movimiento=mov_tipo,
                    cantidad=item.cantidad_devuelta,
                    cantidad_anterior=ant_disp,
                    cantidad_nueva=nva_disp,
                    motivo=f"{data.tipo} #{codigo_dev} - Ticket #{venta.codigo_venta} - Apto reventa",
                    usuario_id=usuario.id
                ))
            else:
                ant_disp = stk_dev.cantidad_disponible
                db.add(MovimientoInventario(
                    stock_id=stk_dev.id,
                    tipo_movimiento="MERMA_DEFECTO",
                    cantidad=0,
                    cantidad_anterior=ant_disp,
                    cantidad_nueva=ant_disp,
                    motivo=f"Prenda ingresada a MERMA por falla física - {data.tipo} #{codigo_dev}",
                    usuario_id=usuario.id
                ))

            # Si es CAMBIO y se especificó prenda nueva
            var_cambio_id = None
            cant_cambio = None
            pr_cambio = None
            sub_cambio = None
            if data.tipo == "CAMBIO" and item.variante_cambio_id:
                var_cambio_id = item.variante_cambio_id
                cant_cambio = item.cantidad_cambio or 1

                res_vc = await db.execute(
                    select(PrendaVariante).options(selectinload(PrendaVariante.prenda)).where(PrendaVariante.id == var_cambio_id)
                )
                v_cambio = res_vc.scalar_one_or_none()
                if not v_cambio or not v_cambio.activo:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Variante de cambio ID {var_cambio_id} inexistente o inactiva")

                pr_cambio = v_cambio.prenda.precio_base
                sub_cambio = pr_cambio * cant_cambio
                total_nuevo += sub_cambio

                res_stk_c = await db.execute(
                    select(InventarioStock).where(
                        and_(
                            InventarioStock.variante_id == var_cambio_id,
                            InventarioStock.sucursal_id == data.sucursal_id
                        )
                    )
                )
                stk_cambio = res_stk_c.scalar_one_or_none()
                if not stk_cambio or stk_cambio.cantidad_disponible < cant_cambio:
                    dispo = stk_cambio.cantidad_disponible if stk_cambio else 0
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Stock insuficiente en sucursal para entregar '{v_cambio.sku_variante}'. Disponible: {dispo} uds, Solicitado: {cant_cambio} uds."
                    )

                ant_c = stk_cambio.cantidad_disponible
                stk_cambio.cantidad_disponible -= cant_cambio
                nva_c = stk_cambio.cantidad_disponible

                db.add(MovimientoInventario(
                    stock_id=stk_cambio.id,
                    tipo_movimiento="CAMBIO_SALIDA",
                    cantidad=-cant_cambio,
                    cantidad_anterior=ant_c,
                    cantidad_nueva=nva_c,
                    motivo=f"Entrega de prenda por Cambio #{codigo_dev} - Cliente: {venta.cliente_nombre}",
                    usuario_id=usuario.id
                ))

            dif_linea = (sub_cambio or Decimal("0.00")) - sub_dev
            detalles_a_crear.append({
                "variante_devuelta_id": item.variante_devuelta_id,
                "cantidad_devuelta": item.cantidad_devuelta,
                "precio_unitario_devuelto": precio_dev,
                "subtotal_devuelto": sub_dev,
                "condicion_prenda": item.condicion_prenda,
                "variante_cambio_id": var_cambio_id,
                "cantidad_cambio": cant_cambio,
                "precio_unitario_cambio": pr_cambio,
                "subtotal_cambio": sub_cambio,
                "diferencia_linea": dif_linea
            })

        diferencia_total = total_nuevo - total_devuelto

        devolucion = Devolucion(
            codigo=codigo_dev,
            venta_id=data.venta_id,
            sucursal_id=data.sucursal_id,
            usuario_id=usuario.id,
            tipo=data.tipo,
            motivo=data.motivo,
            estado="COMPLETADA",
            total_devuelto=total_devuelto,
            total_nuevo=total_nuevo,
            diferencia=diferencia_total,
            metodo_reembolso=data.metodo_reembolso if total_devuelto > 0 else "NO_APLICA",
            observaciones=data.observaciones,
            created_at=ahora,
            updated_at=ahora
        )
        db.add(devolucion)
        await db.flush()

        for d in detalles_a_crear:
            det_dev = DetalleDevolucion(
                devolucion_id=devolucion.id,
                variante_devuelta_id=d["variante_devuelta_id"],
                cantidad_devuelta=d["cantidad_devuelta"],
                precio_unitario_devuelto=d["precio_unitario_devuelto"],
                subtotal_devuelto=d["subtotal_devuelto"],
                condicion_prenda=d["condicion_prenda"],
                variante_cambio_id=d["variante_cambio_id"],
                cantidad_cambio=d["cantidad_cambio"],
                precio_unitario_cambio=d["precio_unitario_cambio"],
                subtotal_cambio=d["subtotal_cambio"],
                diferencia_linea=d["diferencia_linea"]
            )
            db.add(det_dev)

        await db.commit()

        # Auditoría
        await AuditoriaService.registrar_evento(
            db,
            accion=f"{data.tipo}_PROCESADA",
            modulo="ventas",
            detalle=f"{data.tipo} #{codigo_dev} vinculada a Ticket #{venta.codigo_venta} procesada en '{sucursal.nombre}'. Total devuelto: ${total_devuelto}, Total entregado: ${total_nuevo}, Balance: ${diferencia_total} ({data.metodo_reembolso})",
            usuario_id=usuario.id,
            usuario_email=usuario.email,
            ip_address=ip,
            valores_nuevos={
                "devolucion_id": devolucion.id,
                "codigo": codigo_dev,
                "tipo": data.tipo,
                "motivo": data.motivo,
                "venta_codigo": venta.codigo_venta,
                "total_devuelto": str(total_devuelto),
                "total_nuevo": str(total_nuevo),
                "diferencia": str(diferencia_total)
            }
        )

        return await VentasService.obtener_devolucion_por_id(db, devolucion.id)

    @staticmethod
    async def listar_devoluciones(
        db: AsyncSession,
        sucursal_id: Optional[int] = None,
        tipo: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Devolucion]:
        query = select(Devolucion).options(
            selectinload(Devolucion.sucursal),
            selectinload(Devolucion.cajero),
            selectinload(Devolucion.venta),
            selectinload(Devolucion.detalles).selectinload(DetalleDevolucion.variante_devuelta).selectinload(PrendaVariante.prenda),
            selectinload(Devolucion.detalles).selectinload(DetalleDevolucion.variante_devuelta).selectinload(PrendaVariante.talla),
            selectinload(Devolucion.detalles).selectinload(DetalleDevolucion.variante_devuelta).selectinload(PrendaVariante.color),
            selectinload(Devolucion.detalles).selectinload(DetalleDevolucion.variante_cambio).selectinload(PrendaVariante.prenda),
            selectinload(Devolucion.detalles).selectinload(DetalleDevolucion.variante_cambio).selectinload(PrendaVariante.talla),
            selectinload(Devolucion.detalles).selectinload(DetalleDevolucion.variante_cambio).selectinload(PrendaVariante.color)
        )

        if sucursal_id:
            query = query.where(Devolucion.sucursal_id == sucursal_id)
        if tipo:
            query = query.where(Devolucion.tipo == tipo.upper())

        res = await db.execute(query.order_by(desc(Devolucion.id)).limit(limit).offset(offset))
        return list(res.scalars().all())

    @staticmethod
    async def obtener_devolucion_por_id(db: AsyncSession, devolucion_id: int) -> Devolucion:
        query = select(Devolucion).options(
            selectinload(Devolucion.sucursal),
            selectinload(Devolucion.cajero),
            selectinload(Devolucion.venta).selectinload(Venta.sucursal),
            selectinload(Devolucion.venta).selectinload(Venta.cajero),
            selectinload(Devolucion.detalles).selectinload(DetalleDevolucion.variante_devuelta).selectinload(PrendaVariante.prenda),
            selectinload(Devolucion.detalles).selectinload(DetalleDevolucion.variante_devuelta).selectinload(PrendaVariante.talla),
            selectinload(Devolucion.detalles).selectinload(DetalleDevolucion.variante_devuelta).selectinload(PrendaVariante.color),
            selectinload(Devolucion.detalles).selectinload(DetalleDevolucion.variante_cambio).selectinload(PrendaVariante.prenda),
            selectinload(Devolucion.detalles).selectinload(DetalleDevolucion.variante_cambio).selectinload(PrendaVariante.talla),
            selectinload(Devolucion.detalles).selectinload(DetalleDevolucion.variante_cambio).selectinload(PrendaVariante.color)
        ).where(Devolucion.id == devolucion_id)

        res = await db.execute(query)
        dev = res.scalar_one_or_none()
        if not dev:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Devolución no encontrada")
        return dev

    # ----------------- CU12: PROCESAR PAGOS ELECTRÓNICOS -----------------
    @staticmethod
    async def iniciar_pago_electronico(
        db: AsyncSession,
        data: PagoElectronicoCreate,
        usuario: Optional[Usuario] = None,
        ip: Optional[str] = None
    ) -> dict:
        ahora = datetime.now(timezone.utc)
        venta = None
        if data.venta_id:
            venta = await db.get(Venta, data.venta_id)
            if not venta:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venta asociada no encontrada")

        if data.metodo_pago == "QR_SIMPLE":
            codigo_rec = f"LIB-QR-{ahora.strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"
            exp_seg = 300
            qr_raw = f"LIBELULA-BO|REC:{codigo_rec}|MONTO:{data.monto}|MONEDA:{data.moneda}|EXP:{int(ahora.timestamp()) + exp_seg}"

            # Generar SVG del QR con la librería qrcode
            factory = qrcode.image.svg.SvgPathImage
            img = qrcode.make(qr_raw, image_factory=factory)
            buf = io.BytesIO()
            img.save(buf)
            svg_content = buf.getvalue().decode("utf-8")

            pago = Pago(
                venta_id=data.venta_id,
                reserva_id=data.reserva_id,
                metodo_pago="QR_SIMPLE",
                pasarela=data.pasarela or "LIBELULA_BOLIVIA",
                monto=data.monto,
                moneda=data.moneda,
                estado_pago="PENDIENTE",
                transaccion_externa_id=codigo_rec,
                cliente_email=data.cliente_email,
                qr_payload=qr_raw,
                datos_transaccion=json.dumps({
                    "concepto": data.concepto or "Cobro QR Simple Libélula",
                    "expira_en": exp_seg
                }),
                fecha_hora=ahora
            )
            db.add(pago)
            await db.commit()
            await db.refresh(pago)

            return {
                "pago": pago,
                "qr": QRGenerarResponse(
                    pago_id=pago.id,
                    qr_string=qr_raw,
                    qr_imagen_svg=svg_content,
                    codigo_recaudacion=codigo_rec,
                    monto=data.monto,
                    moneda=data.moneda,
                    expira_en_segundos=exp_seg
                )
            }

        elif data.metodo_pago == "TARJETA":
            if not data.datos_tarjeta:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Se requieren los datos de tarjeta (número, vencimiento, CVC, titular) para procesar el cobro"
                )

            tarjeta_num = data.datos_tarjeta.numero.replace(" ", "").replace("-", "")
            ultimos4 = tarjeta_num[-4:] if len(tarjeta_num) >= 4 else "0000"

            # Simulación de respuesta bancaria / Stripe Sandbox
            if tarjeta_num.startswith("4000"):
                auth_id = f"dec_{uuid.uuid4().hex[:14]}"
                pago = Pago(
                    venta_id=data.venta_id,
                    reserva_id=data.reserva_id,
                    metodo_pago="TARJETA",
                    pasarela=data.pasarela or "STRIPE_INTL",
                    monto=data.monto,
                    moneda=data.moneda,
                    estado_pago="RECHAZADO",
                    transaccion_externa_id=auth_id,
                    cliente_email=data.cliente_email,
                    datos_transaccion=json.dumps({
                        "titular": data.datos_tarjeta.titular,
                        "tarjeta_mascarada": f"**** **** **** {ultimos4}",
                        "error_pasarela": "Fondos insuficientes o tarjeta rechazada por el banco emisor"
                    }),
                    fecha_hora=ahora
                )
                db.add(pago)
                await db.commit()
                await db.refresh(pago)

                await AuditoriaService.registrar_evento(
                    db, accion="PAGO_TARJETA_RECHAZADO", modulo="ventas",
                    detalle=f"Cobro con tarjeta rechazada por el banco (Tarjeta terminación {ultimos4}) por ${data.monto} {data.moneda}",
                    usuario_id=usuario.id if usuario else None,
                    usuario_email=usuario.email if usuario else data.cliente_email,
                    ip_address=ip
                )

                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Transacción rechazada por el procesador bancario (Stripe Sandbox): Fondos insuficientes en la tarjeta **** {ultimos4}"
                )

            auth_id = f"ch_3O{uuid.uuid4().hex[:16]}"
            pago = Pago(
                venta_id=data.venta_id,
                reserva_id=data.reserva_id,
                metodo_pago="TARJETA",
                pasarela=data.pasarela or "STRIPE_INTL",
                monto=data.monto,
                moneda=data.moneda,
                estado_pago="CONFIRMADO",
                transaccion_externa_id=auth_id,
                cliente_email=data.cliente_email,
                datos_transaccion=json.dumps({
                    "titular": data.datos_tarjeta.titular,
                    "tarjeta_mascarada": f"**** **** **** {ultimos4}",
                    "franquicia": "VISA" if tarjeta_num.startswith("4") else ("MASTERCARD" if tarjeta_num.startswith("5") else "OTRO"),
                    "vencimiento": f"{data.datos_tarjeta.mes_exp}/{data.datos_tarjeta.anio_exp}",
                    "auth_code": f"AUTH-{uuid.uuid4().hex[:6].upper()}"
                }),
                fecha_hora=ahora
            )
            db.add(pago)

            if venta and venta.estado == "PENDIENTE":
                venta.estado = "PAGADA"

            await db.commit()
            await db.refresh(pago)

            await AuditoriaService.registrar_evento(
                db, accion="PAGO_ELECTRONICO_CONFIRMADO", modulo="ventas",
                detalle=f"Cobro de ${data.monto} {data.moneda} autorizado vía Stripe Sandbox (Tarjeta **** {ultimos4}) - Ref: {auth_id}",
                usuario_id=usuario.id if usuario else None,
                usuario_email=usuario.email if usuario else data.cliente_email,
                ip_address=ip,
                valores_nuevos={"pago_id": pago.id, "auth_id": auth_id, "monto": str(data.monto)}
            )

            return {"pago": pago}

        elif data.metodo_pago == "PAYPAL":
            auth_id = f"PAYID-{uuid.uuid4().hex[:14].upper()}"
            pago = Pago(
                venta_id=data.venta_id,
                reserva_id=data.reserva_id,
                metodo_pago="PAYPAL",
                pasarela=data.pasarela or "PAYPAL_EXPRESS",
                monto=data.monto,
                moneda=data.moneda,
                estado_pago="CONFIRMADO",
                transaccion_externa_id=auth_id,
                cliente_email=data.cliente_email,
                datos_transaccion=json.dumps({
                    "billetera": "PayPal Express Checkout",
                    "payer_id": f"PAYER-{uuid.uuid4().hex[:8].upper()}"
                }),
                fecha_hora=ahora
            )
            db.add(pago)
            if venta and venta.estado == "PENDIENTE":
                venta.estado = "PAGADA"

            await db.commit()
            await db.refresh(pago)

            await AuditoriaService.registrar_evento(
                db, accion="PAGO_PAYPAL_CONFIRMADO", modulo="ventas",
                detalle=f"Cobro de ${data.monto} {data.moneda} autorizado vía PayPal Sandbox - Ref: {auth_id}",
                usuario_id=usuario.id if usuario else None,
                usuario_email=usuario.email if usuario else data.cliente_email,
                ip_address=ip
            )

            return {"pago": pago}

        else:
            pago = Pago(
                venta_id=data.venta_id,
                reserva_id=data.reserva_id,
                metodo_pago=data.metodo_pago,
                pasarela="EFECTIVO_POS",
                monto=data.monto,
                moneda=data.moneda,
                estado_pago="CONFIRMADO",
                transaccion_externa_id=f"EFE-{ahora.strftime('%Y%m%d%H%M%S')}",
                cliente_email=data.cliente_email,
                fecha_hora=ahora
            )
            db.add(pago)
            if venta and venta.estado == "PENDIENTE":
                venta.estado = "PAGADA"
            await db.commit()
            await db.refresh(pago)
            return {"pago": pago}

    @staticmethod
    async def confirmar_pago_electronico(
        db: AsyncSession,
        pago_id: int,
        data: ConfirmarPagoRequest,
        usuario: Optional[Usuario] = None,
        ip: Optional[str] = None
    ) -> Pago:
        pago = await db.get(Pago, pago_id)
        if not pago:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pago no encontrado")

        if data.aprobado:
            pago.estado_pago = "CONFIRMADO"
            if not pago.transaccion_externa_id:
                pago.transaccion_externa_id = data.codigo_autorizacion or f"BNB-{uuid.uuid4().hex[:8].upper()}"
            
            if pago.venta_id:
                venta = await db.get(Venta, pago.venta_id)
                if venta and venta.estado == "PENDIENTE":
                    venta.estado = "PAGADA"

            await AuditoriaService.registrar_evento(
                db, accion="PAGO_ELECTRONICO_CONFIRMADO", modulo="ventas",
                detalle=f"Pago #{pago.id} ({pago.metodo_pago} / {pago.pasarela}) confirmado por ${pago.monto} {pago.moneda} - Ref: {pago.transaccion_externa_id}",
                usuario_id=usuario.id if usuario else None,
                usuario_email=usuario.email if usuario else pago.cliente_email,
                ip_address=ip
            )
        else:
            pago.estado_pago = "RECHAZADO"
            await AuditoriaService.registrar_evento(
                db, accion="PAGO_ELECTRONICO_RECHAZADO", modulo="ventas",
                detalle=f"Pago #{pago.id} rechazado. Motivo: {data.motivo_rechazo or 'Rechazo manual'}",
                usuario_id=usuario.id if usuario else None,
                usuario_email=usuario.email if usuario else pago.cliente_email,
                ip_address=ip
            )

        await db.commit()
        await db.refresh(pago)
        return pago

    @staticmethod
    async def procesar_webhook_pasarela(
        db: AsyncSession,
        payload: WebhookPagoPayload,
        ip: Optional[str] = None
    ) -> dict:
        res = await db.execute(
            select(Pago).where(Pago.transaccion_externa_id == payload.transaccion_externa_id)
        )
        pago = res.scalar_one_or_none()
        if not pago:
            return {"status": "ignored", "detail": f"Transacción {payload.transaccion_externa_id} no localizada"}

        pago.estado_pago = payload.estado.upper()
        if pago.estado_pago == "CONFIRMADO" and pago.venta_id:
            venta = await db.get(Venta, pago.venta_id)
            if venta and venta.estado == "PENDIENTE":
                venta.estado = "PAGADA"

        await AuditoriaService.registrar_evento(
            db, accion="WEBHOOK_PASARELA_PROCESADO", modulo="ventas",
            detalle=f"Webhook recibido de {payload.pasarela} para transacción {payload.transaccion_externa_id}. Nuevo estado: {pago.estado_pago}",
            ip_address=ip
        )
        await db.commit()
        return {"status": "success", "pago_id": pago.id, "estado": pago.estado_pago}

    @staticmethod
    async def listar_pagos_electronicos(
        db: AsyncSession,
        pasarela: Optional[str] = None,
        estado: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Pago]:
        query = select(Pago).order_by(desc(Pago.id))
        if pasarela:
            query = query.where(Pago.pasarela == pasarela.upper())
        if estado:
            query = query.where(Pago.estado_pago == estado.upper())
        res = await db.execute(query.limit(limit).offset(offset))
        return list(res.scalars().all())

    @staticmethod
    async def obtener_pago_por_id(db: AsyncSession, pago_id: int) -> Pago:
        pago = await db.get(Pago, pago_id)
        if not pago:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comprobante de pago no encontrado")
        return pago

    # ----------------- CU15: CARRITO Y CHECKOUT E-COMMERCE -----------------
    @staticmethod
    async def procesar_checkout_online(
        db: AsyncSession,
        data: VentaOnlineCheckoutRequest,
        current_user: Usuario,
        ip: Optional[str] = None
    ) -> Venta:
        """
        Procesa la venta digital de la bolsa de compras / carrito (CU15).
        - Valida stock disponible en la sucursal que despacha.
        - Calcula costos de envío según modalidad (Domicilio vs Click & Collect).
        - Genera venta con canal ONLINE_WEB, descuenta stock físico (VENTA_ONLINE).
        - Genera registro formal de comprobante de pago y despacho con código de tracking (ENV-...).
        """
        # 1. Validar sucursal de despacho / origen
        sucursal_id = data.sucursal_despacho_id or data.sucursal_id
        if not sucursal_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debe especificar la sucursal de despacho"
            )
        sucursal = await db.get(Sucursal, sucursal_id)
        if not sucursal or not sucursal.activo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sucursal de despacho inválida o inactiva"
            )

        if not data.detalles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El carrito de compras debe contener al menos una prenda"
            )

        # 2. Validar stock disponible para cada prenda
        lineas_procesadas = []
        subtotal_acumulado = Decimal("0.00")

        for item in data.detalles:
            query_var = select(PrendaVariante).options(
                selectinload(PrendaVariante.prenda),
                selectinload(PrendaVariante.talla),
                selectinload(PrendaVariante.color)
            ).where(PrendaVariante.id == item.variante_id)
            res_var = await db.execute(query_var)
            variante = res_var.scalar_one_or_none()

            if not variante or not variante.activo:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Variante ID {item.variante_id} inexistente o inactiva"
                )

            # Consultar existencias en la sucursal de despacho
            res_stock = await db.execute(
                select(InventarioStock).where(
                    and_(
                        InventarioStock.variante_id == item.variante_id,
                        InventarioStock.sucursal_id == sucursal_id
                    )
                )
            )
            stock = res_stock.scalar_one_or_none()
            disponible = stock.cantidad_disponible if stock else 0

            if not stock or disponible < item.cantidad:
                nombre_prenda = variante.prenda.nombre if variante.prenda else "Prenda"
                talla_code = variante.talla.codigo if variante.talla else ""
                color_nom = variante.color.nombre if variante.color else ""
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stock insuficiente en la boutique '{sucursal.nombre}' para '{nombre_prenda}' (Talla: {talla_code}, Color: {color_nom}). Disponible: {disponible} uds, Solicitado: {item.cantidad} uds."
                )

            precio_unitario = (
                item.precio_unitario if item.precio_unitario is not None
                else (variante.prenda.precio_base if variante.prenda else Decimal("0.00"))
            )
            subtotal_linea = Decimal(item.cantidad) * Decimal(precio_unitario)
            subtotal_acumulado += subtotal_linea

            lineas_procesadas.append({
                "variante_id": item.variante_id,
                "cantidad": item.cantidad,
                "precio_unitario": Decimal(precio_unitario),
                "subtotal": subtotal_linea,
                "stock_obj": stock,
                "variante_obj": variante
            })

        # 3. Calcular costo de envío y total
        descuento = Decimal(data.descuento) if data.descuento else Decimal("0.00")
        if descuento > subtotal_acumulado:
            descuento = subtotal_acumulado

        costo_envio = Decimal("0.00")
        envio_data = data.envio or data.datos_envio
        if not envio_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debe incluir los datos de envío"
            )

        es_recojo = envio_data.tipo_entrega in ("RECOJO_TIENDA", "CLICK_AND_COLLECT")
        if not es_recojo:
            # Si subtotal >= 150 -> Envío gratis, sino tarifa estándar $5.00
            costo_envio = Decimal("0.00") if (subtotal_acumulado - descuento) >= Decimal("150.00") else Decimal("5.00")
        else:
            costo_envio = Decimal("0.00")
            if envio_data.sucursal_recojo_id:
                suc_rec = await db.get(Sucursal, envio_data.sucursal_recojo_id)
                if not suc_rec or not suc_rec.activo:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="La sucursal de recojo seleccionada no existe o está inactiva"
                    )

        total_a_liquidar = (subtotal_acumulado - descuento) + costo_envio

        # 4. Validar método de pago
        metodo_pago = data.pago.metodo_pago.upper()

        # 5. Generar código de venta y crear cabecera Venta
        ahora = datetime.now(timezone.utc)
        codigo_venta = f"VTA-ONL-{ahora.strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"

        cliente_id = current_user.id if current_user.rol and current_user.rol.nombre == "CLIENTE" else data.cliente_id
        if not cliente_id and current_user:
            cliente_id = current_user.id

        venta = Venta(
            codigo_venta=codigo_venta,
            sucursal_id=sucursal_id,
            usuario_id=current_user.id,
            cliente_id=cliente_id,
            canal_venta="ONLINE_WEB",
            cliente_nombre=data.cliente_nombre.strip(),
            cliente_nit=data.cliente_nit.strip() or "0",
            subtotal=subtotal_acumulado,
            descuento=descuento,
            costo_envio=costo_envio,
            total=total_a_liquidar,
            estado="PAGADA",
            observaciones=data.observaciones
        )
        db.add(venta)
        await db.flush()

        # 6. Insertar Detalles y Descontar Kardex
        for lp in lineas_procesadas:
            db.add(DetalleVenta(
                venta_id=venta.id,
                variante_id=lp["variante_id"],
                cantidad=lp["cantidad"],
                precio_unitario=lp["precio_unitario"],
                subtotal=lp["subtotal"]
            ))

            stk = lp["stock_obj"]
            ant_cant = stk.cantidad_disponible
            stk.cantidad_disponible -= lp["cantidad"]

            db.add(MovimientoInventario(
                stock_id=stk.id,
                tipo_movimiento="VENTA_ONLINE",
                cantidad=-lp["cantidad"],
                cantidad_anterior=ant_cant,
                cantidad_nueva=stk.cantidad_disponible,
                motivo=f"Pedido Online Web #{codigo_venta} - Cliente: {venta.cliente_nombre}",
                usuario_id=current_user.id
            ))

        # 7. Registrar Comprobante de Pago
        ext_id = data.pago.transaccion_externa_id or f"PAY-ONL-{uuid.uuid4().hex[:8].upper()}"
        pago = Pago(
            venta_id=venta.id,
            metodo_pago=metodo_pago,
            pasarela=f"ECOMMERCE_{metodo_pago}",
            monto=total_a_liquidar,
            estado_pago="CONFIRMADO",
            transaccion_externa_id=ext_id,
            cliente_email=data.cliente_email.strip(),
            fecha_hora=ahora
        )
        db.add(pago)

        # 8. Crear EnvioPedido con tracking
        tracking_code = f"ENV-{ahora.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        estado_envio_inicial = "LISTO_RECOJO" if es_recojo else "PREPARANDO"
        courier_name = "Click & Collect Atelier" if es_recojo else "Yaigo Express Courier"

        envio = EnvioPedido(
            venta_id=venta.id,
            codigo_seguimiento=tracking_code,
            tipo_entrega="RECOJO_TIENDA" if es_recojo else "DOMICILIO",
            sucursal_recojo_id=envio_data.sucursal_recojo_id if es_recojo else None,
            direccion_linea1=envio_data.direccion_linea1 if not es_recojo else None,
            direccion_linea2=envio_data.direccion_linea2 if not es_recojo else None,
            ciudad=envio_data.ciudad if not es_recojo else None,
            departamento=envio_data.departamento if not es_recojo else None,
            telefono_contacto=envio_data.telefono_contacto,
            instrucciones_entrega=envio_data.instrucciones_entrega,
            costo_envio=costo_envio,
            empresa_courier=courier_name,
            estado_envio=estado_envio_inicial,
            fecha_estimada_entrega=(ahora + timedelta(days=2)).date()
        )
        db.add(envio)

        await db.commit()

        # 9. Auditoría
        await AuditoriaService.registrar_evento(
            db,
            accion="VENTA_ONLINE_CREADA",
            modulo="ventas",
            detalle=f"Venta E-Commerce #{codigo_venta} completada por ${total_a_liquidar}. Tracking envío #{tracking_code}. Modalidad: {data.envio.tipo_entrega}.",
            usuario_id=current_user.id,
            usuario_email=current_user.email,
            ip_address=ip,
            valores_nuevos={
                "venta_id": venta.id,
                "codigo_venta": codigo_venta,
                "tracking": tracking_code,
                "total": str(total_a_liquidar),
                "tipo_entrega": data.envio.tipo_entrega
            }
        )

        return await VentasService.obtener_venta_por_id(db, venta.id)

    @staticmethod
    async def listar_pedidos_online(
        db: AsyncSession,
        sucursal_id: Optional[int] = None,
        estado_envio: Optional[str] = None,
        cliente_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Venta]:
        """Consulta los pedidos e-commerce con sus datos de envío y tracking."""
        query = select(Venta).join(EnvioPedido, Venta.id == EnvioPedido.venta_id).options(
            selectinload(Venta.sucursal),
            selectinload(Venta.cliente),
            selectinload(Venta.pagos),
            selectinload(Venta.envio).selectinload(EnvioPedido.sucursal_recojo),
            selectinload(Venta.detalles).selectinload(DetalleVenta.variante).selectinload(PrendaVariante.prenda),
            selectinload(Venta.detalles).selectinload(DetalleVenta.variante).selectinload(PrendaVariante.talla),
            selectinload(Venta.detalles).selectinload(DetalleVenta.variante).selectinload(PrendaVariante.color)
        ).where(Venta.canal_venta == "ONLINE_WEB")

        if sucursal_id:
            query = query.where(Venta.sucursal_id == sucursal_id)
        if cliente_id:
            query = query.where(Venta.cliente_id == cliente_id)
        if estado_envio:
            query = query.where(EnvioPedido.estado_envio == estado_envio.upper())

        result = await db.execute(query.order_by(desc(Venta.id)).limit(limit).offset(offset))
        return list(result.scalars().all())

    @staticmethod
    async def actualizar_estado_envio(
        db: AsyncSession,
        envio_id: int,
        data: ActualizarEstadoEnvioRequest,
        staff_user: Usuario,
        ip: Optional[str] = None
    ) -> EnvioPedido:
        """Actualiza el estado de tracking de un envío de venta online."""
        res = await db.execute(
            select(EnvioPedido).options(
                selectinload(EnvioPedido.sucursal_recojo),
                selectinload(EnvioPedido.venta)
            ).where(EnvioPedido.id == envio_id)
        )
        envio = res.scalar_one_or_none()
        if not envio:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Envío no encontrado")

        envio.estado_envio = data.estado_envio
        courier = data.empresa_courier or data.courier_nombre
        if courier:
            envio.empresa_courier = courier
        notas = data.instrucciones_entrega or data.notas
        if notas:
            envio.instrucciones_entrega = notas
        if data.estado_envio == "ENTREGADO":
            envio.fecha_entregado = datetime.now(timezone.utc)
        envio.updated_at = datetime.now(timezone.utc)

        await db.commit()

        await AuditoriaService.registrar_evento(
            db,
            accion="ESTADO_ENVIO_ACTUALIZADO",
            modulo="ventas",
            detalle=f"Envío #{envio.codigo_seguimiento} actualizado a '{envio.estado_envio}' por {staff_user.nombre}.",
            usuario_id=staff_user.id,
            usuario_email=staff_user.email,
            ip_address=ip,
            valores_nuevos={"envio_id": envio.id, "estado_envio": envio.estado_envio}
        )

        return envio


