from typing import List, Optional
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.usuarios.models import Usuario
from app.domains.usuarios.routers import get_current_user, require_permissions
from app.domains.inventario.schemas import (
    CiudadCreate, CiudadUpdate, CiudadResponse,
    SucursalCreate, SucursalUpdate, SucursalResponse,
    AsignarEncargadoRequest, MensajeInventarioResponse
)
from app.domains.inventario.services import CiudadService, SucursalService

router = APIRouter(prefix="/inventario", tags=["Inventario & Sucursales"])

# ----------------- CU4: CIUDADES -----------------
@router.get("/ciudades", response_model=List[CiudadResponse], summary="Listar Ciudades (CU4)")
async def listar_ciudades(activo_solo: bool = False, db: AsyncSession = Depends(get_db)):
    return await CiudadService.listar(db, activo_solo)


@router.post("/ciudades", response_model=CiudadResponse, status_code=status.HTTP_201_CREATED, summary="Registrar Ciudad (CU4)")
async def crear_ciudad(
    data: CiudadCreate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("sucursales:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await CiudadService.crear(db, data, current_user, ip)


@router.get("/ciudades/{ciudad_id}", response_model=CiudadResponse, summary="Obtener Ciudad por ID (CU4)")
async def obtener_ciudad(ciudad_id: int, db: AsyncSession = Depends(get_db)):
    return await CiudadService.obtener_por_id(db, ciudad_id)


@router.put("/ciudades/{ciudad_id}", response_model=CiudadResponse, summary="Actualizar Ciudad (CU4)")
async def actualizar_ciudad(
    ciudad_id: int,
    data: CiudadUpdate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("sucursales:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await CiudadService.actualizar(db, ciudad_id, data, current_user, ip)


@router.delete("/ciudades/{ciudad_id}", response_model=MensajeInventarioResponse, summary="Eliminar Ciudad (CU4)")
async def eliminar_ciudad(
    ciudad_id: int,
    request: Request,
    current_user: Usuario = Depends(require_permissions("sucursales:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    await CiudadService.eliminar(db, ciudad_id, current_user, ip)
    return MensajeInventarioResponse(mensaje="Ciudad eliminada exitosamente")


# ----------------- CU4: SUCURSALES -----------------
@router.get("/sucursales", response_model=List[SucursalResponse], summary="Listar Sucursales (CU4)")
async def listar_sucursales(
    ciudad_id: Optional[int] = None,
    encargado_id: Optional[int] = None,
    activo_solo: bool = False,
    db: AsyncSession = Depends(get_db)
):
    return await SucursalService.listar(db, ciudad_id, encargado_id, activo_solo)


@router.post("/sucursales", response_model=SucursalResponse, status_code=status.HTTP_201_CREATED, summary="Registrar Sucursal (CU4)")
async def crear_sucursal(
    data: SucursalCreate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("sucursales:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await SucursalService.crear(db, data, current_user, ip)


@router.get("/sucursales/{sucursal_id}", response_model=SucursalResponse, summary="Detalle de Sucursal (CU4)")
async def obtener_sucursal(sucursal_id: int, db: AsyncSession = Depends(get_db)):
    return await SucursalService.obtener_por_id(db, sucursal_id)


@router.put("/sucursales/{sucursal_id}", response_model=SucursalResponse, summary="Actualizar Sucursal (CU4)")
async def actualizar_sucursal(
    sucursal_id: int,
    data: SucursalUpdate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("sucursales:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await SucursalService.actualizar(db, sucursal_id, data, current_user, ip)


@router.patch("/sucursales/{sucursal_id}/encargado", response_model=SucursalResponse, summary="Asignar Encargado a Sucursal (CU4)")
async def asignar_encargado_sucursal(
    sucursal_id: int,
    data: AsignarEncargadoRequest,
    request: Request,
    current_user: Usuario = Depends(require_permissions("sucursales:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await SucursalService.asignar_encargado(db, sucursal_id, data.encargado_id, current_user, ip)


@router.delete("/sucursales/{sucursal_id}", response_model=MensajeInventarioResponse, summary="Eliminar Sucursal (CU4)")
async def eliminar_sucursal(
    sucursal_id: int,
    request: Request,
    current_user: Usuario = Depends(require_permissions("sucursales:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    await SucursalService.eliminar(db, sucursal_id, current_user, ip)
    return MensajeInventarioResponse(mensaje="Sucursal eliminada exitosamente")
