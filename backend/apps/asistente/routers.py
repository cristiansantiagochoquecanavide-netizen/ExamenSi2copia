"""APIRouter para el dominio de Inteligencia Artificial y Recomendaciones (CU19)."""
from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from apps.core.database import get_db
from apps.UsuariosSeguridad.models import Usuario
from apps.UsuariosSeguridad.routers import get_current_user, get_optional_current_user
from apps.asistente.services import IaasistenteService, ChatbotConciergeService
from apps.asistente.schemas import (
    IaasistenteStatusResponse, PreferenciaEstiloCreate, PreferenciaEstiloResponse,
    RecomendacionPrendaItem, OutfitSugeridoResponse, DashboardRecomendacionesResponse,
    InteraccionCreate, MensajeChatCreate, MensajeChatResponse, SesionChatResponse,
    SesionChatResumen
)

router = APIRouter(
    prefix="/ia_asistente",
    tags=["Inteligencia Artificial & Recomendaciones"]
)


@router.get(
    "/status",
    response_model=IaasistenteStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Estado del dominio Inteligencia Artificial y Recomendaciones"
)
async def get_domain_status(db: AsyncSession = Depends(get_db)):
    service = IaasistenteService(db)
    result = await service.get_status()
    return IaasistenteStatusResponse(
        domain=result["domain"],
        status=result["status"],
        message=result["description"]
    )


@router.get(
    "/recomendaciones",
    response_model=DashboardRecomendacionesResponse,
    summary="Dashboard de recomendaciones inteligentes personalizadas (CU19)"
)
async def obtener_recomendaciones(
    ocasion: Optional[str] = None,
    sector: Optional[str] = None,
    limit: int = 12,
    usuario: Optional[Usuario] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = IaasistenteService(db)
    usuario_id = usuario.id if usuario else None
    usuario_nombre = f"{usuario.nombre} {usuario.apellido}".strip() if usuario else None

    # Si se pasan filtros explícitos, calcular prendas con esos filtros
    if ocasion or sector:
        para_ti = await service.calcular_recomendaciones(
            usuario_id=usuario_id, limit=limit, ocasion=ocasion, sector=sector
        )
        pref = await service.obtener_preferencias(usuario_id) if usuario_id else None

        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        from apps.GestionCatalogo.models import Prenda

        query = select(Prenda).options(
            selectinload(Prenda.categoria),
            selectinload(Prenda.temporada),
            selectinload(Prenda.multimedia),
            selectinload(Prenda.calificaciones)
        ).where(Prenda.activo == True)
        res = await db.execute(query)
        todas = list(res.scalars().all())
        outfits = await service.generar_outfits_destacados(todas, ocasion=ocasion)

        return DashboardRecomendacionesResponse(
            usuario_id=usuario_id,
            usuario_nombre=usuario_nombre,
            perfil_completado=pref.completado if pref else False,
            preferencias=pref,
            para_ti=para_ti,
            novedades_temporada=para_ti[:4],
            outfits_destacados=outfits
        )

    return await service.obtener_dashboard_recomendaciones(
        usuario_id=usuario_id, usuario_nombre=usuario_nombre
    )


@router.get(
    "/perfil-estilo",
    response_model=Optional[PreferenciaEstiloResponse],
    summary="Obtener perfil de estilo del usuario autenticado"
)
async def obtener_perfil_estilo(
    usuario: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = IaasistenteService(db)
    return await service.obtener_preferencias(usuario.id)


@router.post(
    "/perfil-estilo",
    response_model=PreferenciaEstiloResponse,
    status_code=status.HTTP_200_OK,
    summary="Guardar o actualizar test de estilo personal (Quiz de Estilo)"
)
async def guardar_perfil_estilo(
    data: PreferenciaEstiloCreate,
    usuario: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = IaasistenteService(db)
    return await service.guardar_o_actualizar_preferencias(usuario.id, data)


@router.get(
    "/outfit/{prenda_id}",
    response_model=OutfitSugeridoResponse,
    summary="Sugerencia de combinación Completa tu Look para una prenda (CU19)"
)
async def obtener_outfit_prenda(
    prenda_id: int,
    db: AsyncSession = Depends(get_db)
):
    service = IaasistenteService(db)
    return await service.generar_outfit_para_prenda(prenda_id)


@router.post(
    "/interacciones",
    status_code=status.HTTP_201_CREATED,
    summary="Registrar telemetría de interacción con recomendación"
)
async def registrar_interaccion(
    data: InteraccionCreate,
    usuario: Optional[Usuario] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = IaasistenteService(db)
    usuario_id = usuario.id if usuario else None
    await service.registrar_interaccion(
        prenda_id=data.prenda_id,
        tipo_evento=data.tipo_evento,
        score_aplicado=data.score_aplicado or 0.0,
        motivo=data.motivo or "EXPLORACION",
        usuario_id=usuario_id
    )
    return {"status": "ok", "message": "Interaccion registrada exitosamente"}


# =============================================================================
# ENDPOINTS CHATBOT / ASISTENTE VIRTUAL IA (CU20)
# =============================================================================
@router.post(
    "/chat",
    response_model=MensajeChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Enviar mensaje a Atelier Concierge IA (CU20)"
)
async def enviar_mensaje_chat(
    payload: MensajeChatCreate,
    usuario: Optional[Usuario] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = ChatbotConciergeService(db)
    usuario_id = usuario.id if usuario else None
    try:
        return await service.procesar_mensaje(
            texto=payload.texto,
            session_uuid=payload.session_uuid,
            usuario_id=usuario_id
        )
    except Exception as e_chat:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en Atelier Concierge: {str(e_chat)}"
        )


@router.get(
    "/chat/sesiones",
    response_model=List[SesionChatResumen],
    summary="Listar sesiones previas de chat del usuario (CU20)"
)
async def listar_sesiones_chat(
    usuario: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = ChatbotConciergeService(db)
    return await service.listar_sesiones_usuario(usuario.id)


@router.get(
    "/chat/{session_uuid}",
    response_model=SesionChatResponse,
    summary="Obtener historial completo de una sesión de chat (CU20)"
)
async def obtener_historial_chat(
    session_uuid: str,
    db: AsyncSession = Depends(get_db)
):
    service = ChatbotConciergeService(db)
    historial = await service.obtener_historial_sesion(session_uuid)
    if not historial:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión de chat no encontrada")
    return historial


@router.delete(
    "/chat/{session_uuid}",
    status_code=status.HTTP_200_OK,
    summary="Eliminar o reiniciar sesión de chat (CU20)"
)
async def eliminar_sesion_chat(
    session_uuid: str,
    db: AsyncSession = Depends(get_db)
):
    service = ChatbotConciergeService(db)
    ok = await service.eliminar_sesion(session_uuid)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión de chat no encontrada")
    return {"status": "ok", "message": "Sesión eliminada"}


