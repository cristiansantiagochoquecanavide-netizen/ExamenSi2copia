"""APIRouter para el dominio de Notificaciones Push y Alertas (CU21)."""
from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.usuarios.models import Usuario
from app.domains.usuarios.routers import get_current_user, get_optional_current_user
from app.domains.notificaciones.services import NotificacionService
from app.domains.notificaciones.schemas import (
    NotificacionCreate, NotificacionResponse, NotificacionResumenResponse,
    DispositivoSuscripcionCreate, DispositivoSuscripcionResponse,
    EmitirAlertaTestRequest
)

router = APIRouter(
    prefix="/notificaciones",
    tags=["Notificaciones Push & Alertas"]
)


@router.get(
    "",
    response_model=List[NotificacionResponse],
    status_code=status.HTTP_200_OK,
    summary="Listar notificaciones del usuario o públicas"
)
async def listar_notificaciones(
    tipo: Optional[str] = Query(None, description="Filtro por tipo: RESERVA_PROBADOR, ESTADO_PEDIDO, PROMOCION, RECOMENDACION_IA, ALERTA_STOCK"),
    solo_no_leidas: bool = Query(False, description="Filtrar solo alertas no leídas"),
    limit: int = Query(40, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[Usuario] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = NotificacionService(db)
    user_id = current_user.id if current_user else None
    return await service.listar_notificaciones(
        usuario_id=user_id,
        tipo=tipo,
        solo_no_leidas=solo_no_leidas,
        limit=limit,
        offset=offset
    )


@router.get(
    "/resumen",
    response_model=NotificacionResumenResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener total de no leídas y últimas alertas para la campana / badge"
)
async def obtener_resumen_notificaciones(
    limit: int = Query(5, ge=1, le=20),
    current_user: Optional[Usuario] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = NotificacionService(db)
    user_id = current_user.id if current_user else None
    return await service.obtener_resumen(usuario_id=user_id, limit=limit)


@router.patch(
    "/{notificacion_id}/leer",
    response_model=NotificacionResponse,
    status_code=status.HTTP_200_OK,
    summary="Marcar notificación individual como leída"
)
async def marcar_notificacion_leida(
    notificacion_id: int,
    current_user: Optional[Usuario] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = NotificacionService(db)
    user_id = current_user.id if current_user else None
    return await service.marcar_como_leida(notificacion_id, usuario_id=user_id)


@router.post(
    "/leer-todas",
    status_code=status.HTTP_200_OK,
    summary="Marcar todas las notificaciones como leídas"
)
async def marcar_todas_leidas(
    current_user: Optional[Usuario] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = NotificacionService(db)
    user_id = current_user.id if current_user else None
    actualizadas = await service.marcar_todas_como_leidas(usuario_id=user_id)
    return {"message": "Notificaciones marcadas como leídas", "actualizadas": actualizadas}


@router.delete(
    "/{notificacion_id}",
    status_code=status.HTTP_200_OK,
    summary="Eliminar o descartar una notificación"
)
async def eliminar_notificacion(
    notificacion_id: int,
    current_user: Optional[Usuario] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = NotificacionService(db)
    user_id = current_user.id if current_user else None
    exito = await service.eliminar_notificacion(notificacion_id, usuario_id=user_id)
    return {"message": "Notificación eliminada", "success": exito}


@router.post(
    "/dispositivos",
    response_model=DispositivoSuscripcionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar o actualizar token de dispositivo push (Móvil / Web)"
)
async def registrar_dispositivo_push(
    data: DispositivoSuscripcionCreate,
    current_user: Optional[Usuario] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = NotificacionService(db)
    user_id = current_user.id if current_user else None
    return await service.registrar_dispositivo(user_id, data)


@router.post(
    "/emitir-test",
    response_model=NotificacionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Emitir alerta de prueba para evaluación (Probadores, Pedidos, IA CU19, Stock)"
)
async def emitir_alerta_test(
    req: EmitirAlertaTestRequest,
    current_user: Optional[Usuario] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = NotificacionService(db)
    if not req.usuario_id and current_user:
        req.usuario_id = current_user.id
    return await service.emitir_alerta_test(req)
