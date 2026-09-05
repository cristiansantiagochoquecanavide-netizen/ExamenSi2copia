"""APIRouter para el dominio de Ventas y Pagos."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.domains.ventas.services import VentasService
from app.domains.ventas.schemas import VentasStatusResponse

router = APIRouter(
    prefix="/ventas",
    tags=["Ventas"]
)

@router.get(
    "/status",
    response_model=VentasStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Estado del dominio Ventas y Pagos"
)
async def get_domain_status(db: AsyncSession = Depends(get_db)):
    service = VentasService(db)
    result = await service.get_status()
    return VentasStatusResponse(
        domain=result["domain"],
        status=result["status"],
        message=result["description"]
    )
