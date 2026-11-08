from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import select, and_, or_, desc, func, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from apps.GestionCatalogo.difusion.models import Notificacion, DispositivoPush
from apps.GestionCatalogo.difusion.schemas import (
    NotificacionCreate, NotificacionResponse, NotificacionResumenResponse,
    DispositivoSuscripcionCreate, DispositivoSuscripcionResponse,
    EmitirAlertaTestRequest
)


class NotificacionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def crear_notificacion(self, data: NotificacionCreate) -> NotificacionResponse:
        notif = Notificacion(
            usuario_id=data.usuario_id,
            titulo=data.titulo,
            mensaje=data.mensaje,
            tipo=data.tipo,
            canal=data.canal,
            prioridad=data.prioridad,
            leida=False,
            data_extra=data.data_extra or {},
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(notif)
        await self.db.commit()
        await self.db.refresh(notif)
        return NotificacionResponse.model_validate(notif)

    async def listar_notificaciones(
        self,
        usuario_id: Optional[int] = None,
        tipo: Optional[str] = None,
        solo_no_leidas: bool = False,
        limit: int = 40,
        offset: int = 0
    ) -> List[NotificacionResponse]:
        query = select(Notificacion)

        conds = []
        if usuario_id is not None:
            conds.append(or_(Notificacion.usuario_id == usuario_id, Notificacion.usuario_id == None))
        else:
            conds.append(Notificacion.usuario_id == None)

        if tipo and tipo != "TODAS":
            conds.append(Notificacion.tipo == tipo)

        if solo_no_leidas:
            conds.append(Notificacion.leida == False)

        if conds:
            query = query.where(and_(*conds))

        query = query.order_by(Notificacion.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(query)
        items = result.scalars().all()
        return [NotificacionResponse.model_validate(n) for n in items]

    async def contar_no_leidas(self, usuario_id: Optional[int] = None) -> int:
        conds = [Notificacion.leida == False]
        if usuario_id is not None:
            conds.append(or_(Notificacion.usuario_id == usuario_id, Notificacion.usuario_id == None))
        else:
            conds.append(Notificacion.usuario_id == None)

        query = select(func.count(Notificacion.id)).where(and_(*conds))
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def obtener_resumen(self, usuario_id: Optional[int] = None, limit: int = 5) -> NotificacionResumenResponse:
        total_no_leidas = await self.contar_no_leidas(usuario_id)
        ultimas = await self.listar_notificaciones(usuario_id=usuario_id, limit=limit)
        return NotificacionResumenResponse(
            total_no_leidas=total_no_leidas,
            ultimas=ultimas
        )

    async def marcar_como_leida(self, notificacion_id: int, usuario_id: Optional[int] = None) -> NotificacionResponse:
        query = select(Notificacion).where(Notificacion.id == notificacion_id)
        if usuario_id is not None:
            query = query.where(or_(Notificacion.usuario_id == usuario_id, Notificacion.usuario_id == None))

        result = await self.db.execute(query)
        notif = result.scalar_one_or_none()
        if not notif:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificación no encontrada")

        notif.leida = True
        notif.fecha_leida = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(notif)
        return NotificacionResponse.model_validate(notif)

    async def marcar_todas_como_leidas(self, usuario_id: Optional[int] = None) -> int:
        conds = [Notificacion.leida == False]
        if usuario_id is not None:
            conds.append(or_(Notificacion.usuario_id == usuario_id, Notificacion.usuario_id == None))
        else:
            conds.append(Notificacion.usuario_id == None)

        stmt = (
            update(Notificacion)
            .where(and_(*conds))
            .values(leida=True, fecha_leida=datetime.now(timezone.utc))
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount or 0

    async def eliminar_notificacion(self, notificacion_id: int, usuario_id: Optional[int] = None) -> bool:
        query = select(Notificacion).where(Notificacion.id == notificacion_id)
        if usuario_id is not None:
            query = query.where(or_(Notificacion.usuario_id == usuario_id, Notificacion.usuario_id == None))

        result = await self.db.execute(query)
        notif = result.scalar_one_or_none()
        if not notif:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificación no encontrada")

        await self.db.delete(notif)
        await self.db.commit()
        return True

    async def registrar_dispositivo(
        self, usuario_id: Optional[int], data: DispositivoSuscripcionCreate
    ) -> DispositivoSuscripcionResponse:
        result = await self.db.execute(
            select(DispositivoPush).where(DispositivoPush.token_dispositivo == data.token_dispositivo)
        )
        disp = result.scalar_one_or_none()

        now = datetime.now(timezone.utc)
        if disp:
            disp.usuario_id = usuario_id
            disp.plataforma = data.plataforma
            disp.activo = True
            disp.updated_at = now
        else:
            disp = DispositivoPush(
                usuario_id=usuario_id,
                token_dispositivo=data.token_dispositivo,
                plataforma=data.plataforma,
                activo=True,
                created_at=now,
                updated_at=now
            )
            self.db.add(disp)

        await self.db.commit()
        await self.db.refresh(disp)
        return DispositivoSuscripcionResponse.model_validate(disp)

    async def emitir_alerta_test(self, req: EmitirAlertaTestRequest) -> NotificacionResponse:
        """Crea alertas realistas para pruebas y evaluación de CU21 y CU19."""
        tipo = req.tipo.upper()
        data_extra = req.data_extra or {}

        if tipo == "RECOMENDACION_IA":
            titulo = req.custom_title or "✨ Nueva recomendación de Atelier Stylist (IA)"
            mensaje = (
                req.custom_message or
                "Hemos curado una selección exclusiva de vestidos y blazers afines a tu silueta y ocasiones frecuentes. ¡Descubrí tu nuevo look coordinado!"
            )
            data_extra.setdefault("modulo", "ia_asistente")
            data_extra.setdefault("url_destino", "/ia-asistente")
            data_extra.setdefault("cu_origen", "CU19")
        elif tipo == "RESERVA_PROBADOR":
            titulo = req.custom_title or "🕒 Probador físico confirmado en Boutique Palermo"
            mensaje = (
                req.custom_message or
                "Tu cita para el vestidor VIP ha sido confirmada para hoy a las 17:30. Tus prendas seleccionadas ya están preparadas y desinfectadas."
            )
            data_extra.setdefault("modulo", "reservas")
            data_extra.setdefault("url_destino", "/reservas")
            data_extra.setdefault("reserva_id", 101)
        elif tipo == "ESTADO_PEDIDO":
            titulo = req.custom_title or "🛍️ Tu pedido #FS-84920 está en camino"
            mensaje = (
                req.custom_message or
                "El courier prioritario ha retirado tu compra de alta costura. Tiempo estimado de entrega: 24 horas."
            )
            data_extra.setdefault("modulo", "ventas")
            data_extra.setdefault("url_destino", "/ventas/checkout")
            data_extra.setdefault("venta_id", 84920)
        elif tipo == "PROMOCION":
            titulo = req.custom_title or "🏷️ Oferta exclusiva: 20% OFF en Colección Gala"
            mensaje = (
                req.custom_message or
                "Utilizá el cupón ATELIER20 en tu próxima compra online. Válido hasta agotar stock."
            )
            data_extra.setdefault("modulo", "catalogo")
            data_extra.setdefault("url_destino", "/catalogo")
            data_extra.setdefault("cupon", "ATELIER20")
        elif tipo == "ALERTA_STOCK":
            titulo = req.custom_title or "⚠️ Alerta de Inventario: Stock mínimo"
            mensaje = (
                req.custom_message or
                "El artículo 'Vestido Noche Seda Noir' cuenta con menos de 3 unidades en la sucursal Centro."
            )
            data_extra.setdefault("modulo", "inventario")
            data_extra.setdefault("url_destino", "/inventario")
        else:
            titulo = req.custom_title or "Notificación del Sistema FashionStore"
            mensaje = req.custom_message or "Actualización de la plataforma completada con éxito."
            data_extra.setdefault("modulo", "general")

        payload = NotificacionCreate(
            usuario_id=req.usuario_id,
            titulo=titulo,
            mensaje=mensaje,
            tipo=tipo,
            canal="TODOS",
            prioridad="ALTA" if tipo in ["RESERVA_PROBADOR", "ALERTA_STOCK"] else "NORMAL",
            data_extra=data_extra
        )
        return await self.crear_notificacion(payload)
