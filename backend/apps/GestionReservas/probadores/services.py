"""Capa de Servicio (Lógica de Negocio) para el dominio de Reservas de Prendas (CU13)."""
from datetime import datetime, date, timezone, timedelta
from decimal import Decimal
import io
import json
from typing import List, Optional
import uuid
import qrcode
import qrcode.image.svg
from fastapi import HTTPException, status
from sqlalchemy import select, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from apps.UsuariosSeguridad.models import Usuario
from apps.UsuariosSeguridad.services import AuditoriaService
from apps.GestionInventario.models import Sucursal
from apps.GestionCatalogo.models import PrendaVariante, InventarioStock, MovimientoInventario
from .models import Reserva, DetalleReserva
from apps.GestionVentas.models import Venta, DetalleVenta, Pago
from .schemas import (
    ReservaCreate, ReservaResponse, DetalleReservaResponse, ReservaCancelarRequest,
    AsignarProbadorRequest, FinalizarPruebaRequest, ReservaExpirarRequest
)



class ReservasService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_status(self) -> dict:
        """Retorna el estado operativo del servicio del dominio."""
        return {
            "domain": "reservas",
            "status": "ready",
            "description": "Agendamiento de prendas para prueba física en vestidores de sucursales (CU13)"
        }

    @staticmethod
    def _generar_svg_qr(payload: str) -> str:
        """Genera una cadena SVG limpia del código QR para validación presencial."""
        factory = qrcode.image.svg.SvgPathImage
        img = qrcode.make(payload, image_factory=factory)
        buf = io.BytesIO()
        img.save(buf)
        return buf.getvalue().decode("utf-8")

    @staticmethod
    def _formatear_reserva(rsv: Reserva) -> dict:
        """Formatea la entidad Reserva para serialización JSON/Pydantic."""
        qr_svg_str = ReservasService._generar_svg_qr(rsv.qr_token) if rsv.qr_token else None
        return {
            "id": rsv.id,
            "codigo_reserva": rsv.codigo_reserva,
            "cliente_id": rsv.cliente_id,
            "sucursal_id": rsv.sucursal_id,
            "fecha_reserva": rsv.fecha_reserva,
            "hora_estimada": rsv.hora_estimada,
            "estado": rsv.estado,
            "monto_anticipo": rsv.monto_anticipo,
            "moneda": rsv.moneda,
            "observaciones": rsv.observaciones,
            "qr_token": rsv.qr_token,
            "qr_svg": qr_svg_str,
            "probador_asignado": rsv.probador_asignado,
            "atendido_por_id": rsv.atendido_por_id,
            "created_at": rsv.created_at,
            "updated_at": rsv.updated_at,
            "cliente": rsv.cliente,
            "atendido_por": rsv.atendido_por,
            "sucursal": rsv.sucursal,
            "detalles": rsv.detalles
        }


    @staticmethod
    async def crear_reserva(
        db: AsyncSession,
        data: ReservaCreate,
        current_user: Optional[Usuario] = None,
        ip: Optional[str] = None
    ) -> dict:
        """
        Crea una reserva de prendas apartándolas en la sucursal elegida (CU13).
        Bloquea existencias en inventario (disponible -= cant, reservada += cant).
        """
        ahora = datetime.now(timezone.utc)
        hoy = ahora.date()

        # Validar fecha
        if data.fecha_reserva < hoy:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La fecha de reserva no puede ser anterior al día de hoy ({hoy})."
            )

        # Validar sucursal
        sucursal = await db.get(Sucursal, data.sucursal_id)
        if not sucursal or not sucursal.activo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La sucursal seleccionada no existe o se encuentra inactiva."
            )

        # Determinar cliente titular
        if current_user:
            cliente_id = current_user.id
            if data.cliente_id and data.cliente_id != current_user.id:
                cliente_obj = await db.get(Usuario, data.cliente_id)
                if cliente_obj and cliente_obj.estado == "ACTIVO":
                    cliente_id = data.cliente_id
        elif data.cliente_id:
            cliente_id = data.cliente_id
        else:
            res_cli = await db.execute(
                select(Usuario).where(Usuario.tipo_usuario == "CLIENTE").limit(1)
            )
            cli = res_cli.scalar_one_or_none()
            if not cli:
                cli = (await db.execute(select(Usuario).limit(1))).scalar_one()
            cliente_id = cli.id

        # Generar código único y QR token
        codigo_rsv = f"RSV-{ahora.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        qr_token_str = f"ATELIER-RESERVA|{codigo_rsv}|CLI:{cliente_id}|SUC:{data.sucursal_id}|FECHA:{data.fecha_reserva}|HORA:{data.hora_estimada}"
        qr_svg_str = ReservasService._generar_svg_qr(qr_token_str)

        # Procesar y validar stock de cada prenda solicitada
        detalles_a_crear = []
        total_prendas = 0

        for item in data.detalles:
            total_prendas += item.cantidad

            res_var = await db.execute(
                select(PrendaVariante)
                .options(selectinload(PrendaVariante.prenda))
                .where(PrendaVariante.id == item.variante_id)
            )
            variante = res_var.scalar_one_or_none()
            if not variante or not variante.activo:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"La variante de prenda ID {item.variante_id} no existe o se encuentra inactiva."
                )

            # Consultar existencias en la sucursal de destino
            res_stk = await db.execute(
                select(InventarioStock).where(
                    and_(
                        InventarioStock.variante_id == item.variante_id,
                        InventarioStock.sucursal_id == data.sucursal_id
                    )
                )
            )
            stock = res_stk.scalar_one_or_none()
            disponible = stock.cantidad_disponible if stock else 0

            if disponible < item.cantidad:
                nombre_prenda = variante.prenda.nombre if variante.prenda else 'Prenda'
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stock insuficiente en '{sucursal.nombre}' para '{nombre_prenda}' ({variante.sku_variante}). Disponible: {disponible} uds, Solicitado: {item.cantidad} uds."
                )

            precio_u = variante.prenda.precio_base if variante.prenda else Decimal("0.00")
            subtot = precio_u * item.cantidad

            # Bloqueo de existencias: pasa de disponible a reservado
            ant_disp = stock.cantidad_disponible
            stock.cantidad_disponible -= item.cantidad
            stock.cantidad_reservada += item.cantidad

            db.add(MovimientoInventario(
                stock_id=stock.id,
                tipo_movimiento="RESERVA_BLOQUEO",
                cantidad=-item.cantidad,
                cantidad_anterior=ant_disp,
                cantidad_nueva=stock.cantidad_disponible,
                motivo=f"Apartado para probador #{codigo_rsv} - Visita: {data.fecha_reserva} {data.hora_estimada}",
                usuario_id=current_user.id if current_user else cliente_id
            ))

            detalles_a_crear.append({
                "variante_id": item.variante_id,
                "cantidad": item.cantidad,
                "precio_unitario": precio_u,
                "subtotal": subtot
            })

        # Crear cabecera de la Reserva
        reserva = Reserva(
            codigo_reserva=codigo_rsv,
            cliente_id=cliente_id,
            sucursal_id=data.sucursal_id,
            fecha_reserva=data.fecha_reserva,
            hora_estimada=data.hora_estimada,
            estado="CONFIRMADA",
            monto_anticipo=data.monto_anticipo,
            moneda=data.moneda,
            observaciones=data.observaciones,
            qr_token=qr_token_str,
            created_at=ahora,
            updated_at=ahora
        )
        db.add(reserva)
        await db.flush()

        for d in detalles_a_crear:
            det = DetalleReserva(
                reserva_id=reserva.id,
                variante_id=d["variante_id"],
                cantidad=d["cantidad"],
                precio_unitario=d["precio_unitario"],
                subtotal=d["subtotal"],
                probada=False,
                comprada=False
            )
            db.add(det)

        await db.commit()

        # Emitir Notificación Push / Alerta de Reserva Exitosa
        try:
            from apps.GestionCatalogo.difusion.models import Notificacion
            notif_rsv = Notificacion(
                usuario_id=cliente_id,
                titulo="Reserva realizada con éxito",
                mensaje=f"Tu cita en {sucursal.nombre} está confirmada para el {data.fecha_reserva} a las {data.hora_estimada} (Pase: {codigo_rsv}).",
                tipo="RESERVA_PROBADOR",
                canal="IN_APP",
                prioridad="ALTA",
                leida=False,
                data_extra={
                    "reserva_id": reserva.id,
                    "codigo_reserva": codigo_rsv,
                    "sucursal": sucursal.nombre,
                    "accion_label": "Ver mis reservas",
                    "url_destino": "/reservas"
                },
                created_at=ahora
            )
            db.add(notif_rsv)
            await db.commit()
        except Exception:
            pass

        # Registro en Bitácora de Auditoría
        await AuditoriaService.registrar_evento(
            db,
            accion="RESERVA_CREADA",
            modulo="reservas",
            detalle=f"Reserva #{codigo_rsv} agendada en '{sucursal.nombre}' para el {data.fecha_reserva} a las {data.hora_estimada}. Total prendas: {total_prendas}, Anticipo: {data.moneda} {data.monto_anticipo}",
            usuario_id=current_user.id if current_user else cliente_id,
            usuario_email=current_user.email if current_user else "movil_cliente@fashionstore.local",
            ip_address=ip,
            valores_nuevos={
                "reserva_id": reserva.id,
                "codigo": codigo_rsv,
                "cliente_id": cliente_id,
                "sucursal_id": data.sucursal_id,
                "prendas": total_prendas,
                "anticipo": str(data.monto_anticipo)
            }
        )

        reserva_cargada = await ReservasService.obtener_reserva_por_id(db, reserva.id)
        return ReservasService._formatear_reserva(reserva_cargada)

    @staticmethod
    async def cancelar_reserva(
        db: AsyncSession,
        reserva_id: int,
        data: ReservaCancelarRequest,
        current_user: Usuario,
        ip: Optional[str] = None
    ) -> dict:
        """
        Cancela una reserva y reintegra el stock reservado a disponible en la sucursal (CU13).
        """
        reserva = await ReservasService.obtener_reserva_por_id(db, reserva_id)

        # Si no es staff/admin, solo el propio cliente puede cancelar su reserva
        if current_user.rol and current_user.rol.nombre == "CLIENTE":
            if reserva.cliente_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tiene autorización para cancelar esta reserva."
                )

        if reserva.estado not in ["PENDIENTE", "CONFIRMADA"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No es posible cancelar una reserva con estado '{reserva.estado}'."
            )

        # Revertir existencias de cada detalle
        for item in reserva.detalles:
            res_stk = await db.execute(
                select(InventarioStock).where(
                    and_(
                        InventarioStock.variante_id == item.variante_id,
                        InventarioStock.sucursal_id == reserva.sucursal_id
                    )
                )
            )
            stock = res_stk.scalar_one_or_none()
            if stock:
                ant_disp = stock.cantidad_disponible
                stock.cantidad_disponible += item.cantidad
                stock.cantidad_reservada = max(0, stock.cantidad_reservada - item.cantidad)

                db.add(MovimientoInventario(
                    stock_id=stock.id,
                    tipo_movimiento="RESERVA_LIBERACION",
                    cantidad=item.cantidad,
                    cantidad_anterior=ant_disp,
                    cantidad_nueva=stock.cantidad_disponible,
                    motivo=f"Liberación por cancelación de reserva #{reserva.codigo_reserva}. Motivo: {data.motivo}",
                    usuario_id=current_user.id
                ))

        reserva.estado = "CANCELADA"
        obs_adicional = f" [Cancelada por {current_user.nombre}: {data.motivo}]"
        reserva.observaciones = (reserva.observaciones or "") + obs_adicional
        reserva.updated_at = datetime.now(timezone.utc)

        await db.commit()
        reserva_cargada = await ReservasService.obtener_reserva_por_id(db, reserva.id)

        # Auditoría
        await AuditoriaService.registrar_evento(
            db,
            accion="RESERVA_CANCELADA",
            modulo="reservas",
            detalle=f"Reserva #{reserva_cargada.codigo_reserva} cancelada. Stock liberado en sucursal ID {reserva_cargada.sucursal_id}. Motivo: {data.motivo}",
            usuario_id=current_user.id,
            usuario_email=current_user.email,
            ip_address=ip,
            valores_nuevos={"reserva_id": reserva_cargada.id, "estado": "CANCELADA", "motivo": data.motivo}
        )

        return ReservasService._formatear_reserva(reserva_cargada)

    @staticmethod
    async def listar_reservas(
        db: AsyncSession,
        cliente_id: Optional[int] = None,
        sucursal_id: Optional[int] = None,
        estado: Optional[str] = None,
        fecha: Optional[date] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Reserva]:
        """Consulta el listado de reservas con filtros multidimensionales."""
        query = select(Reserva).options(
            selectinload(Reserva.cliente),
            selectinload(Reserva.atendido_por),
            selectinload(Reserva.sucursal),
            selectinload(Reserva.detalles).selectinload(DetalleReserva.variante).selectinload(PrendaVariante.prenda),
            selectinload(Reserva.detalles).selectinload(DetalleReserva.variante).selectinload(PrendaVariante.talla),
            selectinload(Reserva.detalles).selectinload(DetalleReserva.variante).selectinload(PrendaVariante.color)
        ).order_by(desc(Reserva.id))

        if cliente_id:
            query = query.where(Reserva.cliente_id == cliente_id)
        if sucursal_id:
            query = query.where(Reserva.sucursal_id == sucursal_id)
        if estado:
            query = query.where(Reserva.estado == estado.upper())
        if fecha:
            query = query.where(Reserva.fecha_reserva == fecha)

        res = await db.execute(query.limit(limit).offset(offset))
        return list(res.scalars().all())

    @staticmethod
    async def obtener_reserva_por_id(db: AsyncSession, reserva_id: int) -> Reserva:
        """Obtiene la reserva por su clave primaria con todas sus relaciones."""
        query = select(Reserva).options(
            selectinload(Reserva.cliente),
            selectinload(Reserva.atendido_por),
            selectinload(Reserva.sucursal),
            selectinload(Reserva.detalles).selectinload(DetalleReserva.variante).selectinload(PrendaVariante.prenda),
            selectinload(Reserva.detalles).selectinload(DetalleReserva.variante).selectinload(PrendaVariante.talla),
            selectinload(Reserva.detalles).selectinload(DetalleReserva.variante).selectinload(PrendaVariante.color)
        ).where(Reserva.id == reserva_id)

        res = await db.execute(query)
        rsv = res.scalar_one_or_none()
        if not rsv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reserva no encontrada")
        return rsv

    @staticmethod
    async def buscar_reserva_por_codigo(db: AsyncSession, codigo_reserva: str) -> dict:
        """Busca una reserva por su código alfanumérico o escaneo QR para atención en tienda (CU14)."""
        clean_code = codigo_reserva.strip().upper()
        # Si proviene de escaneo QR con separadores '|'
        if "|" in clean_code:
            for part in clean_code.split("|"):
                if part.startswith("RSV-"):
                    clean_code = part
                    break

        query = select(Reserva).options(
            selectinload(Reserva.cliente),
            selectinload(Reserva.atendido_por),
            selectinload(Reserva.sucursal),
            selectinload(Reserva.detalles).selectinload(DetalleReserva.variante).selectinload(PrendaVariante.prenda),
            selectinload(Reserva.detalles).selectinload(DetalleReserva.variante).selectinload(PrendaVariante.talla),
            selectinload(Reserva.detalles).selectinload(DetalleReserva.variante).selectinload(PrendaVariante.color)
        ).where(Reserva.codigo_reserva == clean_code)

        res = await db.execute(query)
        rsv = res.scalar_one_or_none()
        if not rsv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se encontró ninguna reserva con el código '{codigo_reserva}'."
            )
        return ReservasService._formatear_reserva(rsv)

    # ----------------- CU14: ATENCIÓN Y GESTIÓN EN PROBADORES -----------------
    @staticmethod
    async def asignar_probador(
        db: AsyncSession,
        reserva_id: int,
        data: AsignarProbadorRequest,
        staff_user: Usuario,
        ip: Optional[str] = None
    ) -> dict:
        """
        Recepciona al cliente y le asigna una cabina física de probador (CU14).
        El estado pasa a EN_PROBADOR y se asocia el empleado que atiende.
        """
        reserva = await ReservasService.obtener_reserva_por_id(db, reserva_id)

        if reserva.estado in ["CANCELADA", "EXPIRADA", "COMPLETADA"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se puede asignar probador a una reserva con estado '{reserva.estado}'."
            )

        reserva.estado = "EN_PROBADOR"
        reserva.probador_asignado = data.probador.strip()
        reserva.atendido_por_id = staff_user.id
        reserva.atendido_por = staff_user
        if data.observaciones:
            reserva.observaciones = (reserva.observaciones or "") + f" [Probador: {data.observaciones.strip()}]"
        reserva.updated_at = datetime.now(timezone.utc)

        await db.commit()

        # Registro de Auditoría
        await AuditoriaService.registrar_evento(
            db,
            accion="RESERVA_EN_PROBADOR",
            modulo="reservas",
            detalle=f"Reserva #{reserva.codigo_reserva} asignada a cabina '{reserva.probador_asignado}'. Atendido por {staff_user.nombre}",
            usuario_id=staff_user.id,
            usuario_email=staff_user.email,
            ip_address=ip,
            valores_nuevos={
                "reserva_id": reserva.id,
                "probador": data.probador,
                "estado": "EN_PROBADOR",
                "atendido_por_id": staff_user.id
            }
        )

        reserva_actualizada = await ReservasService.obtener_reserva_por_id(db, reserva.id)
        return ReservasService._formatear_reserva(reserva_actualizada)

    @staticmethod
    async def finalizar_prueba_vestidor(
        db: AsyncSession,
        reserva_id: int,
        data: FinalizarPruebaRequest,
        staff_user: Usuario,
        ip: Optional[str] = None
    ) -> dict:
        """
        Registra el resultado de la prueba física de vestidor (CU14).
        - Prendas compradas: Se apartan del inventario reservado y se derivan opcionalmente a POS.
        - Prendas no compradas: Retornan al stock disponible (RESERVA_LIBERACION).
        - Reserva transiciona a COMPLETADA.
        """
        reserva = await ReservasService.obtener_reserva_por_id(db, reserva_id)

        if reserva.estado not in ["EN_PROBADOR", "CONFIRMADA", "PENDIENTE"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No es posible finalizar una prueba para una reserva con estado '{reserva.estado}'."
            )

        resultados_map = {r.detalle_id: r for r in data.resultados}
        detalles_comprados = []
        total_comprado = Decimal("0.00")

        for item in reserva.detalles:
            res_inp = resultados_map.get(item.id)
            if res_inp:
                item.probada = res_inp.probada
                item.comprada = res_inp.comprada

            # Consultar existencias de la variante en la sucursal de la reserva
            res_stk = await db.execute(
                select(InventarioStock).where(
                    and_(
                        InventarioStock.variante_id == item.variante_id,
                        InventarioStock.sucursal_id == reserva.sucursal_id
                    )
                )
            )
            stock = res_stk.scalar_one_or_none()

            if item.comprada:
                detalles_comprados.append(item)
                total_comprado += item.subtotal

                if stock:
                    stock.cantidad_reservada = max(0, stock.cantidad_reservada - item.cantidad)
                    db.add(MovimientoInventario(
                        stock_id=stock.id,
                        tipo_movimiento="VENTA",
                        cantidad=-item.cantidad,
                        cantidad_anterior=stock.cantidad_disponible,
                        cantidad_nueva=stock.cantidad_disponible,
                        motivo=f"Venta concretada en probador - Reserva #{reserva.codigo_reserva}",
                        usuario_id=staff_user.id
                    ))
            else:
                # Prenda probada pero no adquirida: se reincorpora al perchero disponible
                if stock:
                    ant_disp = stock.cantidad_disponible
                    stock.cantidad_disponible += item.cantidad
                    stock.cantidad_reservada = max(0, stock.cantidad_reservada - item.cantidad)

                    db.add(MovimientoInventario(
                        stock_id=stock.id,
                        tipo_movimiento="RESERVA_LIBERACION",
                        cantidad=item.cantidad,
                        cantidad_anterior=ant_disp,
                        cantidad_nueva=stock.cantidad_disponible,
                        motivo=f"Prenda no adquirida tras prueba en probador - Reserva #{reserva.codigo_reserva}",
                        usuario_id=staff_user.id
                    ))

        # Generar Venta POS formal si fue solicitado y el cliente compró prendas
        venta_creada = None
        if data.derivar_a_pos and detalles_comprados:
            ahora = datetime.now(timezone.utc)
            codigo_vta = f"VTA-RSV-{reserva.codigo_reserva[-6:]}-{int(ahora.timestamp())}"
            cli_nombre = "Consumidor Final"
            cli_nit = "0"
            if reserva.cliente:
                cli_nombre = f"{reserva.cliente.nombre} {reserva.cliente.apellido or ''}".strip()
                cli_nit = getattr(reserva.cliente, "numero_documento", "0") or "0"

            anticipo_aplicado = min(reserva.monto_anticipo, total_comprado)
            saldo_restante = total_comprado - anticipo_aplicado

            venta_creada = Venta(
                codigo_venta=codigo_vta,
                sucursal_id=reserva.sucursal_id,
                usuario_id=staff_user.id,
                cliente_id=reserva.cliente_id,
                reserva_id=reserva.id,
                canal_venta="FISICA_RESERVA",
                cliente_nombre=cli_nombre,
                cliente_nit=cli_nit,
                subtotal=total_comprado,
                descuento=Decimal("0.00"),
                costo_envio=Decimal("0.00"),
                total=total_comprado,
                estado="PAGADA",
                observaciones=f"Venta originada en probador '{reserva.probador_asignado or 'N/A'}'. Anticipo aplicado: ${anticipo_aplicado} {reserva.moneda}. Reserva #{reserva.codigo_reserva}"
            )
            db.add(venta_creada)
            await db.flush()

            # Detalles de venta
            for dc in detalles_comprados:
                db.add(DetalleVenta(
                    venta_id=venta_creada.id,
                    variante_id=dc.variante_id,
                    cantidad=dc.cantidad,
                    precio_unitario=dc.precio_unitario,
                    subtotal=dc.subtotal
                ))

            # Registro de liquidación con anticipo
            if anticipo_aplicado > Decimal("0.00"):
                db.add(Pago(
                    venta_id=venta_creada.id,
                    reserva_id=reserva.id,
                    metodo_pago="ANTICIPO_RESERVA",
                    pasarela="PASARELA_RESERVA",
                    monto=anticipo_aplicado,
                    moneda=reserva.moneda,
                    estado_pago="CONFIRMADO",
                    transaccion_externa_id=f"ANTICIPO-{reserva.codigo_reserva}",
                    fecha_hora=ahora
                ))

            # Registro de liquidación del saldo en caja
            if saldo_restante > Decimal("0.00"):
                db.add(Pago(
                    venta_id=venta_creada.id,
                    reserva_id=reserva.id,
                    metodo_pago="EFECTIVO",
                    pasarela="EFECTIVO_POS",
                    monto=saldo_restante,
                    moneda=reserva.moneda,
                    estado_pago="CONFIRMADO",
                    transaccion_externa_id=f"POS-PROBADOR-{reserva.codigo_reserva}",
                    fecha_hora=ahora
                ))

        reserva.estado = "COMPLETADA"
        reserva.atendido_por_id = staff_user.id
        reserva.atendido_por = staff_user
        if data.observaciones:
            reserva.observaciones = (reserva.observaciones or "") + f" [Finalizado: {data.observaciones.strip()}]"
        reserva.updated_at = datetime.now(timezone.utc)

        await db.commit()

        # Registro de Auditoría
        await AuditoriaService.registrar_evento(
            db,
            accion="RESERVA_FINALIZADA_PROBADOR",
            modulo="reservas",
            detalle=f"Reserva #{reserva.codigo_reserva} completada. {len(detalles_comprados)} prendas compradas (${total_comprado}), {len(reserva.detalles) - len(detalles_comprados)} prendas devueltas a stock.",
            usuario_id=staff_user.id,
            usuario_email=staff_user.email,
            ip_address=ip,
            valores_nuevos={
                "reserva_id": reserva.id,
                "prendas_compradas": len(detalles_comprados),
                "total_comprado": str(total_comprado),
                "venta_id": venta_creada.id if venta_creada else None,
                "estado": "COMPLETADA"
            }
        )

        reserva_actualizada = await ReservasService.obtener_reserva_por_id(db, reserva.id)
        return ReservasService._formatear_reserva(reserva_actualizada)

    @staticmethod
    async def marcar_expirada(
        db: AsyncSession,
        reserva_id: int,
        data: ReservaExpirarRequest,
        staff_user: Usuario,
        ip: Optional[str] = None
    ) -> dict:
        """
        Marca la reserva como expirada cuando el cliente no se presenta (No-Show).
        Libera el 100% de las prendas apartadas al inventario disponible (RESERVA_EXPIRACION).
        """
        reserva = await ReservasService.obtener_reserva_por_id(db, reserva_id)

        if reserva.estado in ["COMPLETADA", "CANCELADA", "EXPIRADA"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La reserva ya se encuentra finalizada en estado '{reserva.estado}'."
            )

        for item in reserva.detalles:
            res_stk = await db.execute(
                select(InventarioStock).where(
                    and_(
                        InventarioStock.variante_id == item.variante_id,
                        InventarioStock.sucursal_id == reserva.sucursal_id
                    )
                )
            )
            stock = res_stk.scalar_one_or_none()
            if stock:
                ant_disp = stock.cantidad_disponible
                stock.cantidad_disponible += item.cantidad
                stock.cantidad_reservada = max(0, stock.cantidad_reservada - item.cantidad)

                db.add(MovimientoInventario(
                    stock_id=stock.id,
                    tipo_movimiento="RESERVA_EXPIRACION",
                    cantidad=item.cantidad,
                    cantidad_anterior=ant_disp,
                    cantidad_nueva=stock.cantidad_disponible,
                    motivo=f"Expiración de reserva #{reserva.codigo_reserva} (No-show de cliente). {data.motivo or ''}",
                    usuario_id=staff_user.id
                ))

        reserva.estado = "EXPIRADA"
        reserva.atendido_por_id = staff_user.id
        reserva.atendido_por = staff_user
        reserva.observaciones = (reserva.observaciones or "") + f" [Expirada: {data.motivo or 'No show'}]"
        reserva.updated_at = datetime.now(timezone.utc)

        await db.commit()

        # Registro de Auditoría
        await AuditoriaService.registrar_evento(
            db,
            accion="RESERVA_EXPIRADA",
            modulo="reservas",
            detalle=f"Reserva #{reserva.codigo_reserva} marcada como EXPIRADA. Stock reintegrado a disponible en sucursal ID {reserva.sucursal_id}. Motivo: {data.motivo}",
            usuario_id=staff_user.id,
            usuario_email=staff_user.email,
            ip_address=ip,
            valores_nuevos={"reserva_id": reserva.id, "estado": "EXPIRADA", "motivo": data.motivo}
        )

        reserva_actualizada = await ReservasService.obtener_reserva_por_id(db, reserva.id)
        return ReservasService._formatear_reserva(reserva_actualizada)

    @staticmethod
    async def obtener_trazabilidad(
        db: AsyncSession,
        identificador: str,
        current_user: Optional[Usuario] = None,
    ) -> dict:
        """
        CU25: Consultar la trazabilidad completa, línea de tiempo y estado del ciclo de vida
        de una reserva de probador. Aplica auto-expiración y liberación atómica de stock si venció.
        """
        stmt = (
            select(Reserva)
            .options(
                selectinload(Reserva.cliente),
                selectinload(Reserva.sucursal),
                selectinload(Reserva.detalles).selectinload(DetalleReserva.variante).selectinload(PrendaVariante.prenda),
                selectinload(Reserva.detalles).selectinload(DetalleReserva.variante).selectinload(PrendaVariante.talla),
                selectinload(Reserva.detalles).selectinload(DetalleReserva.variante).selectinload(PrendaVariante.color),
            )
        )
        if identificador.isdigit():
            stmt = stmt.where(Reserva.id == int(identificador))
        else:
            stmt = stmt.where(Reserva.codigo_reserva == identificador.strip())

        res = await db.execute(stmt)
        reserva = res.scalar_one_or_none()

        if not reserva:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Reserva con identificador '{identificador}' no encontrada en el sistema.",
            )

        # Evaluar auto-expiración frente al reloj del servidor
        ahora = datetime.now(timezone.utc)
        try:
            time_parts = [int(p) for p in reserva.hora_estimada.split(":")]
            hora_obj = datetime.now(timezone.utc).replace(hour=time_parts[0], minute=time_parts[1], second=0, microsecond=0).time()
        except Exception:
            hora_obj = datetime.now(timezone.utc).time()

        fecha_cita = datetime.combine(reserva.fecha_reserva, hora_obj).replace(tzinfo=timezone.utc)
        tolerancia_limite = fecha_cita + timedelta(hours=2)

        esta_expirada = False
        if reserva.estado in ["PENDIENTE", "CONFIRMADA"] and ahora > tolerancia_limite:
            reserva.estado = "EXPIRADA"
            esta_expirada = True
            for det in reserva.detalles:
                res_stock = await db.execute(
                    select(InventarioStock).where(
                        and_(
                            InventarioStock.variante_id == det.variante_id,
                            InventarioStock.sucursal_id == reserva.sucursal_id,
                        )
                    )
                )
                stock_item = res_stock.scalar_one_or_none()
                if stock_item:
                    stock_item.cantidad_disponible += det.cantidad
                    stock_item.cantidad_reservada = max(0, stock_item.cantidad_reservada - det.cantidad)
            await db.commit()
            await db.refresh(reserva)

        tiempo_restante_min = None
        if reserva.estado in ["PENDIENTE", "CONFIRMADA"]:
            diff = (tolerancia_limite - ahora).total_seconds() / 60
            tiempo_restante_min = max(0, int(diff))

        hitos = [
            {
                "etiqueta": "1. Reserva Emitida & Apartado",
                "descripcion": f"Prendas apartadas sin pago previo para la sucursal {reserva.sucursal.nombre if reserva.sucursal else 'Tienda'}.",
                "completado": True,
                "fecha_hora": reserva.created_at,
                "icono": "bookmark",
                "color_hex": "#c5a880",
            },
            {
                "etiqueta": "2. Preparación en Mostrador",
                "descripcion": "El personal de tienda aparta las prendas físicas en el mostrador para el ensayo.",
                "completado": reserva.estado in ["CONFIRMADA", "EN_PROBADOR", "COMPLETADA"],
                "fecha_hora": reserva.updated_at if reserva.estado != "PENDIENTE" else None,
                "icono": "inventory_2",
                "color_hex": "#3b82f6",
            },
            {
                "etiqueta": "3. Ingreso a Probador Físico",
                "descripcion": f"Asignado a: {reserva.probador_asignado or 'Cabina de Ensayo'}" if reserva.probador_asignado else "Cliente ingresa a cabina para prueba de talle y calce.",
                "completado": reserva.estado in ["EN_PROBADOR", "COMPLETADA"],
                "fecha_hora": reserva.updated_at if reserva.estado in ["EN_PROBADOR", "COMPLETADA"] else None,
                "icono": "checkroom",
                "color_hex": "#8b5cf6",
            },
        ]

        if reserva.estado == "COMPLETADA":
            hitos.append({
                "etiqueta": "4. Compra Concluida en Caja",
                "descripcion": "Prendas probadas con éxito y facturadas en Punto de Venta POS.",
                "completado": True,
                "fecha_hora": reserva.updated_at,
                "icono": "shopping_bag",
                "color_hex": "#10b981",
            })
        elif reserva.estado == "EXPIRADA":
            hitos.append({
                "etiqueta": "4. Vencimiento del Plazo de Gracia",
                "descripcion": "Reserva expirada por inasistencia. Stock liberado automáticamente al inventario vendible.",
                "completado": True,
                "fecha_hora": reserva.updated_at,
                "icono": "timer_off",
                "color_hex": "#6b7280",
            })
        elif reserva.estado == "CANCELADA":
            hitos.append({
                "etiqueta": "4. Cancelación Voluntaria",
                "descripcion": "El apartado fue cancelado y las prendas retornadas de inmediato al inventario de la sucursal.",
                "completado": True,
                "fecha_hora": reserva.updated_at,
                "icono": "cancel",
                "color_hex": "#ef4444",
            })
        else:
            hitos.append({
                "etiqueta": "4. Decisión de Compra en Caja",
                "descripcion": "Pendiente de facturación final en caja o devolución de prendas no adquiridas a mostrador.",
                "completado": False,
                "fecha_hora": None,
                "icono": "hourglass_empty",
                "color_hex": "#9ca3af",
            })

        acciones = []
        if reserva.estado in ["PENDIENTE", "CONFIRMADA"]:
            acciones.extend(["CANCELAR_RESERVA", "ASIGNAR_PROBADOR"])
        elif reserva.estado == "EN_PROBADOR":
            acciones.extend(["FINALIZAR_PRUEBA_POS", "LIBERAR_A_PERCHA"])

        detalles_resp = [
            {
                "id": d.id,
                "reserva_id": d.reserva_id,
                "variante_id": d.variante_id,
                "cantidad": d.cantidad,
                "precio_unitario": d.precio_unitario,
                "subtotal": d.subtotal,
                "probada": d.probada,
                "comprada": d.comprada,
                "variante": {
                    "id": d.variante.id,
                    "prenda_id": d.variante.prenda_id,
                    "talla_id": d.variante.talla_id,
                    "color_id": d.variante.color_id,
                    "sku_variante": d.variante.sku_variante,
                    "codigo_barras": d.variante.codigo_barras,
                    "precio_ajustado": d.variante.precio_ajustado,
                    "stock_minimo": d.variante.stock_minimo,
                    "activo": d.variante.activo,
                    "prenda": {
                        "id": d.variante.prenda.id,
                        "sku": d.variante.prenda.sku,
                        "nombre": d.variante.prenda.nombre,
                        "precio_base": d.variante.prenda.precio_base,
                        "categoria_id": d.variante.prenda.categoria_id,
                    } if d.variante and d.variante.prenda else None,
                    "talla": {
                        "id": d.variante.talla.id,
                        "codigo": d.variante.talla.codigo,
                        "nombre": d.variante.talla.nombre,
                    } if d.variante and d.variante.talla else None,
                    "color": {
                        "id": d.variante.color.id,
                        "nombre": d.variante.color.nombre,
                        "codigo_hex": d.variante.color.codigo_hex,
                    } if d.variante and d.variante.color else None,
                } if d.variante else None,
            }
            for d in reserva.detalles
        ]

        qr_svg_str = ReservasService._generar_svg_qr(reserva.qr_token) if reserva.qr_token else None

        return {
            "id": reserva.id,
            "codigo_reserva": reserva.codigo_reserva,
            "qr_token": reserva.qr_token,
            "qr_svg": qr_svg_str,
            "cliente_nombre": f"{reserva.cliente.nombre} {reserva.cliente.apellido}" if reserva.cliente else "Cliente Presencial",
            "cliente_email": reserva.cliente.email if reserva.cliente else None,
            "sucursal_nombre": reserva.sucursal.nombre if reserva.sucursal else "Sucursal Centro",
            "sucursal_direccion": reserva.sucursal.direccion if reserva.sucursal else "Av. Principal",
            "fecha_reserva": reserva.fecha_reserva,
            "hora_estimada": reserva.hora_estimada,
            "estado": reserva.estado,
            "esta_expirada": esta_expirada or (reserva.estado == "EXPIRADA"),
            "tiempo_restante_minutos": tiempo_restante_min,
            "probador_asignado": reserva.probador_asignado,
            "observaciones": reserva.observaciones,
            "hitos": hitos,
            "detalles": detalles_resp,
            "acciones_disponibles": acciones,
        }
