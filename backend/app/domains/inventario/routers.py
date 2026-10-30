from typing import List, Optional
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.usuarios.models import Usuario
from app.domains.usuarios.routers import get_current_user, require_permissions
from app.domains.inventario.schemas import (
    CiudadCreate, CiudadUpdate, CiudadResponse,
    SucursalCreate, SucursalUpdate, SucursalResponse,
    AsignarEncargadoRequest, MensajeInventarioResponse,
    ProveedorCreate, ProveedorUpdate, ProveedorResponse,
    RecepcionMercaderiaCreate, RecepcionMercaderiaResponse,
    TransferenciaStockCreate, TransferenciaStockResponse,
    RecibirTransferenciaRequest, CancelarTransferenciaRequest
)
from app.domains.inventario.services import (
    CiudadService, SucursalService, ProveedorService, RecepcionMercaderiaService,
    TransferenciaStockService
)

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


# ----------------- CU8: GESTION DE PROVEEDORES -----------------
@router.get("/proveedores", response_model=List[ProveedorResponse], summary="Listar Proveedores Textiles (CU8)")
async def listar_proveedores(
    activo_solo: bool = False,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    return await ProveedorService.listar(db, activo_solo, search)


@router.post("/proveedores", response_model=ProveedorResponse, status_code=status.HTTP_201_CREATED, summary="Registrar Proveedor (CU8)")
async def crear_proveedor(
    data: ProveedorCreate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("inventario:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await ProveedorService.crear(db, data, current_user, ip)


@router.get("/proveedores/{proveedor_id}", response_model=ProveedorResponse, summary="Obtener Proveedor (CU8)")
async def obtener_proveedor(proveedor_id: int, db: AsyncSession = Depends(get_db)):
    return await ProveedorService.obtener_por_id(db, proveedor_id)


@router.put("/proveedores/{proveedor_id}", response_model=ProveedorResponse, summary="Actualizar Proveedor (CU8)")
async def actualizar_proveedor(
    proveedor_id: int,
    data: ProveedorUpdate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("inventario:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await ProveedorService.actualizar(db, proveedor_id, data, current_user, ip)


# ----------------- CU8: RECEPCIÓN DE MERCADERÍA / LOTES AL KARDEX -----------------
@router.get("/recepciones", response_model=List[RecepcionMercaderiaResponse], summary="Listar Recepciones de Mercadería (CU8)")
async def listar_recepciones(
    sucursal_id: Optional[int] = None,
    proveedor_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    return await RecepcionMercaderiaService.listar(db, sucursal_id, proveedor_id, limit, offset)


@router.post("/recepciones", response_model=RecepcionMercaderiaResponse, status_code=status.HTTP_201_CREATED, summary="Registrar Recepción de Mercadería en Kardex (CU8)")
async def registrar_recepcion(
    data: RecepcionMercaderiaCreate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("inventario:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await RecepcionMercaderiaService.registrar_recepcion(db, data, current_user, ip)


@router.get("/recepciones/{recepcion_id}", response_model=RecepcionMercaderiaResponse, summary="Obtener Detalle de Recepción (CU8)")
async def obtener_recepcion(recepcion_id: int, db: AsyncSession = Depends(get_db)):
    return await RecepcionMercaderiaService.obtener_por_id(db, recepcion_id)


# ----------------- CU9: TRANSFERENCIA DE STOCK ENTRE SUCURSALES -----------------
@router.get("/transferencias", response_model=List[TransferenciaStockResponse], summary="Listar Transferencias de Stock (CU9)")
async def listar_transferencias(
    sucursal_id: Optional[int] = None,
    estado: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    return await TransferenciaStockService.listar(db, sucursal_id, estado, limit, offset)


@router.post("/transferencias", response_model=TransferenciaStockResponse, status_code=status.HTTP_201_CREATED, summary="Registrar Transferencia de Stock (CU9)")
async def crear_transferencia(
    data: TransferenciaStockCreate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("inventario:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await TransferenciaStockService.crear_transferencia(db, data, current_user, ip)


@router.get("/transferencias/{transferencia_id}", response_model=TransferenciaStockResponse, summary="Obtener Detalle de Transferencia (CU9)")
async def obtener_transferencia(transferencia_id: int, db: AsyncSession = Depends(get_db)):
    return await TransferenciaStockService.obtener_por_id(db, transferencia_id)


@router.put("/transferencias/{transferencia_id}/recibir", response_model=TransferenciaStockResponse, summary="Confirmar Recepción de Traslado en Destino (CU9)")
async def recibir_transferencia(
    transferencia_id: int,
    data: RecibirTransferenciaRequest,
    request: Request,
    current_user: Usuario = Depends(require_permissions("inventario:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await TransferenciaStockService.recibir_transferencia(
        db, transferencia_id, current_user, data.observaciones, ip
    )


@router.put("/transferencias/{transferencia_id}/cancelar", response_model=TransferenciaStockResponse, summary="Cancelar Traslado y Revertir Stock (CU9)")
async def cancelar_transferencia(
    transferencia_id: int,
    data: CancelarTransferenciaRequest,
    request: Request,
    current_user: Usuario = Depends(require_permissions("inventario:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await TransferenciaStockService.cancelar_transferencia(
        db, transferencia_id, current_user, data.motivo, ip
    )




# ----------------- CU11, CU12, CU13: LOGÍSTICA MULTI-SUCURSAL Y TRASPASOS EN DOS FASES -----------------
from fastapi import Query
from app.core.tenant import get_optional_tenant_context, TenantContext
from app.domains.usuarios.routers import get_optional_current_user
from app.domains.inventario.schemas import (
    StockSucursalItem, TraspasoCreateRequest, RecepcionTraspasoRequest, TraspasoActionResponse
)
from app.domains.inventario.services import TraspasoService


@router.get("/sucursales-stock", response_model=List[StockSucursalItem], summary="Consultar Stock Multi-sucursal (CU11)")
async def consultar_stock_multisucursal(
    variante_id: int = Query(..., description="ID de la variante textil a consultar"),
    request: Request = None,
    current_user: Optional[Usuario] = Depends(get_optional_current_user),
    tenant_ctx: Optional[TenantContext] = Depends(get_optional_tenant_context),
    db: AsyncSession = Depends(get_db)
):
    """
    CU11: Consultar Disponibilidad de Inventario Multi-sucursal.
    Permite al vendedor y cliente ver el stock disponible en todas las sucursales del tenant.
    """
    empresa_id = (tenant_ctx.empresa_id if tenant_ctx else None) or (current_user.empresa_id if current_user else None)
    return await TraspasoService.consultar_stock_multisucursal(db, variante_id, empresa_id)


@router.post("/traspasos", status_code=status.HTTP_201_CREATED, summary="Solicitar y Despachar Traspaso Fase 1 (CU12)")
async def solicitar_y_despachar_traspaso(
    traspaso: TraspasoCreateRequest,
    request: Request,
    current_user: Optional[Usuario] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    CU12: Fase 1 del Traspaso.
    - Valida que sucursal_origen_id <> sucursal_destino_id.
    - Valida stock suficiente en origen.
    - Descuenta del disponible de origen y genera orden en estado 'EN_TRANSITO'.
    """
    ip = request.client.host if request.client else None
    return await TraspasoService.solicitar_y_despachar_traspaso(db, traspaso, current_user, ip)


@router.post("/traspasos/{traspaso_id}/recepcionar", summary="Confirmar Recepción de Traspaso Fase 2 (CU13)")
async def confirmar_recepcion_traspaso(
    traspaso_id: int,
    recepcion: RecepcionTraspasoRequest,
    request: Request,
    current_user: Optional[Usuario] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    CU13: Fase 2 del Traspaso.
    - Valida que el traspaso esté en estado 'EN_TRANSITO'.
    - Suma las cantidades recibidas al inventario disponible de destino.
    - Actualiza el estado a 'RECEPCIONADO'.
    """
    ip = request.client.host if request.client else None
    return await TraspasoService.confirmar_recepcion_traspaso(db, traspaso_id, recepcion, current_user, ip)
