"""APIRouter para el dominio de Reservas de Prendas en Tienda Fisica (CU13)."""
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.usuarios.models import Usuario
from app.domains.usuarios.routers import get_current_user, require_permissions
from app.domains.reservas.services import ReservasService
from app.domains.reservas.schemas import (
    ReservasStatusResponse, ReservaCreate, ReservaResponse, ReservaCancelarRequest,
    AsignarProbadorRequest, FinalizarPruebaRequest, ReservaExpirarRequest
)

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


# ----------------- CU13: RESERVAR PRENDAS PARA PROBADOR -----------------
@router.post(
    "",
    response_model=ReservaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear Reserva de Prendas para Probador (CU13)"
)
async def crear_reserva(
    data: ReservaCreate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await ReservasService.crear_reserva(db, data, current_user, ip)


@router.post(
    "/{reserva_id}/cancelar",
    response_model=ReservaResponse,
    summary="Cancelar Reserva y Liberar Stock (CU13)"
)
async def cancelar_reserva(
    reserva_id: int,
    data: ReservaCancelarRequest,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await ReservasService.cancelar_reserva(db, reserva_id, data, current_user, ip)


@router.get(
    "/codigo/{codigo_reserva}",
    response_model=ReservaResponse,
    summary="Buscar Reserva por Código / Token QR (CU13 / CU14)"
)
async def buscar_reserva_codigo(
    codigo_reserva: str,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await ReservasService.buscar_reserva_por_codigo(db, codigo_reserva)


@router.get(
    "",
    response_model=List[ReservaResponse],
    summary="Listar Reservas de Prendas (CU13)"
)
async def listar_reservas(
    cliente_id: Optional[int] = None,
    sucursal_id: Optional[int] = None,
    estado: Optional[str] = None,
    fecha: Optional[date] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Si el usuario logueado es CLIENTE, solo puede ver sus propias reservas
    if current_user.rol and current_user.rol.nombre == "CLIENTE":
        cliente_id = current_user.id

    return await ReservasService.listar_reservas(
        db=db,
        cliente_id=cliente_id,
        sucursal_id=sucursal_id,
        estado=estado,
        fecha=fecha,
        limit=limit,
        offset=offset
    )


@router.get(
    "/{reserva_id}",
    response_model=ReservaResponse,
    summary="Obtener Detalle de Reserva (CU13)"
)
async def obtener_reserva(
    reserva_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    rsv = await ReservasService.obtener_reserva_por_id(db, reserva_id)
    return ReservasService._formatear_reserva(rsv)


# ----------------- CU14: ATENCIÓN Y GESTIÓN EN PROBADORES -----------------
@router.post(
    "/{reserva_id}/asignar-probador",
    response_model=ReservaResponse,
    summary="Asignar Cabina de Probador Físico (CU14)"
)
async def asignar_probador(
    reserva_id: int,
    data: AsignarProbadorRequest,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await ReservasService.asignar_probador(db, reserva_id, data, current_user, ip)


@router.post(
    "/{reserva_id}/finalizar-prueba",
    response_model=ReservaResponse,
    summary="Finalizar Prueba de Vestidor y Derivar a Caja (CU14)"
)
async def finalizar_prueba(
    reserva_id: int,
    data: FinalizarPruebaRequest,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await ReservasService.finalizar_prueba_vestidor(db, reserva_id, data, current_user, ip)


@router.post(
    "/{reserva_id}/expirar",
    response_model=ReservaResponse,
    summary="Marcar Reserva Expirada por No-Show (CU14)"
)
async def marcar_expirada(
    reserva_id: int,
    data: ReservaExpirarRequest,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await ReservasService.marcar_expirada(db, reserva_id, data, current_user, ip)

