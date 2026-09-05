"""APIRouter para el dominio de Reservas en Tienda Fisica."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.domains.reservas.services import ReservasService
from app.domains.reservas.schemas import ReservasStatusResponse

router = APIRouter(
    prefix="/reservas",
    tags=["Reservas"]
)

@router.get(
    "/status",
    response_model=ReservasStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Estado del dominio Reservas en Tienda Fisica"
)
async def get_domain_status(db: AsyncSession = Depends(get_db)):
    service = ReservasService(db)
    result = await service.get_status()
    return ReservasStatusResponse(
        domain=result["domain"],
        status=result["status"],
        message=result["description"]
    )
