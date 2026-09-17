"""APIRouter para el dominio de Inteligencia Artificial y Recomendaciones (CU19)."""
from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.usuarios.models import Usuario
from app.domains.usuarios.routers import get_current_user, get_optional_current_user
from app.domains.ia_asistente.services import IaasistenteService
from app.domains.ia_asistente.schemas import (
    IaasistenteStatusResponse, PreferenciaEstiloCreate, PreferenciaEstiloResponse,
    RecomendacionPrendaItem, OutfitSugeridoResponse, DashboardRecomendacionesResponse,
    InteraccionCreate
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
        outfits = await service.generar_outfits_destacados([])
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

