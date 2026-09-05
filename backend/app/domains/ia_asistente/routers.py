"""APIRouter para el dominio de Inteligencia Artificial y Recomendaciones."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.domains.ia_asistente.services import IaasistenteService
from app.domains.ia_asistente.schemas import IaasistenteStatusResponse

router = APIRouter(
    prefix="/ia_asistente",
    tags=["Inteligencia Artificial"]
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
