import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Request, status, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.usuarios.models import Usuario
from app.domains.usuarios.routers import get_current_user, get_optional_current_user, require_permissions
from app.domains.catalogo.schemas import (
    CategoriaCreate, CategoriaUpdate, CategoriaResponse,
    TallaCreate, TallaUpdate, TallaResponse,
    ColorCreate, ColorUpdate, ColorResponse,
    TemporadaCreate, TemporadaUpdate, TemporadaResponse,
    PrendaCreate, PrendaUpdate, PrendaResponse,
    PrendaMultimediaCreate, PrendaMultimediaResponse, UploadImagenResponse,
    AjusteInventarioRequest, InventarioStockResponse, MensajeCatalogoResponse,
    CalificacionCreate, CalificacionUpdate, CalificacionResponse, ListadoCalificacionesResponse
)
from app.domains.catalogo.services import ParametrosModaService, PrendaService, StockService, CalificacionService


router = APIRouter(prefix="/catalogo", tags=["Cat?logo & Moda"])

# ----------------- CU5: CATEGORIAS -----------------
@router.get("/categorias", response_model=List[CategoriaResponse], summary="Listar Categorias (CU5)")
async def listar_categorias(activo_solo: bool = False, db: AsyncSession = Depends(get_db)):
    return await ParametrosModaService.listar_categorias(db, activo_solo)

@router.post("/categorias", response_model=CategoriaResponse, status_code=status.HTTP_201_CREATED, summary="Crear Categoria (CU5)")
async def crear_categoria(
    data: CategoriaCreate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("catalogo:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await ParametrosModaService.crear_categoria(db, data, current_user, ip)

@router.put("/categorias/{id}", response_model=CategoriaResponse, summary="Actualizar Categoria (CU5)")
async def actualizar_categoria(
    id: int,
    data: CategoriaUpdate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("catalogo:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await ParametrosModaService.actualizar_categoria(db, id, data, current_user, ip)

@router.delete("/categorias/{id}", response_model=MensajeCatalogoResponse, summary="Eliminar Categoria (CU5)")
async def eliminar_categoria(
    id: int,
    request: Request,
    current_user: Usuario = Depends(require_permissions("catalogo:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    await ParametrosModaService.eliminar_categoria(db, id, current_user, ip)
    return MensajeCatalogoResponse(mensaje="Categoria eliminada exitosamente")

# ----------------- CU5: TALLAS -----------------
@router.get("/tallas", response_model=List[TallaResponse], summary="Listar Tallas (CU5)")
async def listar_tallas(activo_solo: bool = False, db: AsyncSession = Depends(get_db)):
    return await ParametrosModaService.listar_tallas(db, activo_solo)

@router.post("/tallas", response_model=TallaResponse, status_code=status.HTTP_201_CREATED, summary="Crear Talla (CU5)")
async def crear_talla(
    data: TallaCreate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("catalogo:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await ParametrosModaService.crear_talla(db, data, current_user, ip)

@router.put("/tallas/{id}", response_model=TallaResponse, summary="Actualizar Talla (CU5)")
async def actualizar_talla(
    id: int,
    data: TallaUpdate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("catalogo:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await ParametrosModaService.actualizar_talla(db, id, data, current_user, ip)

@router.delete("/tallas/{id}", response_model=MensajeCatalogoResponse, summary="Eliminar Talla (CU5)")
async def eliminar_talla(
    id: int,
    request: Request,
    current_user: Usuario = Depends(require_permissions("catalogo:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    await ParametrosModaService.eliminar_talla(db, id, current_user, ip)
    return MensajeCatalogoResponse(mensaje="Talla eliminada exitosamente")

# ----------------- CU5: COLORES -----------------
@router.get("/colores", response_model=List[ColorResponse], summary="Listar Colores (CU5)")
async def listar_colores(activo_solo: bool = False, db: AsyncSession = Depends(get_db)):
    return await ParametrosModaService.listar_colores(db, activo_solo)

@router.post("/colores", response_model=ColorResponse, status_code=status.HTTP_201_CREATED, summary="Crear Color (CU5)")
async def crear_color(
    data: ColorCreate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("catalogo:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await ParametrosModaService.crear_color(db, data, current_user, ip)

@router.put("/colores/{id}", response_model=ColorResponse, summary="Actualizar Color (CU5)")
async def actualizar_color(
    id: int,
    data: ColorUpdate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("catalogo:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await ParametrosModaService.actualizar_color(db, id, data, current_user, ip)

@router.delete("/colores/{id}", response_model=MensajeCatalogoResponse, summary="Eliminar Color (CU5)")
async def eliminar_color(
    id: int,
    request: Request,
    current_user: Usuario = Depends(require_permissions("catalogo:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    await ParametrosModaService.eliminar_color(db, id, current_user, ip)
    return MensajeCatalogoResponse(mensaje="Color eliminado exitosamente")

# ----------------- CU5: TEMPORADAS -----------------
@router.get("/temporadas", response_model=List[TemporadaResponse], summary="Listar Temporadas Comerciales (CU5)")
async def listar_temporadas(activo_solo: bool = False, db: AsyncSession = Depends(get_db)):
    return await ParametrosModaService.listar_temporadas(db, activo_solo)

@router.post("/temporadas", response_model=TemporadaResponse, status_code=status.HTTP_201_CREATED, summary="Crear Temporada (CU5)")
async def crear_temporada(
    data: TemporadaCreate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("catalogo:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await ParametrosModaService.crear_temporada(db, data, current_user, ip)

@router.put("/temporadas/{id}", response_model=TemporadaResponse, summary="Actualizar Temporada (CU5)")
async def actualizar_temporada(
    id: int,
    data: TemporadaUpdate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("catalogo:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await ParametrosModaService.actualizar_temporada(db, id, data, current_user, ip)

@router.delete("/temporadas/{id}", response_model=MensajeCatalogoResponse, summary="Eliminar Temporada (CU5)")
async def eliminar_temporada(
    id: int,
    request: Request,
    current_user: Usuario = Depends(require_permissions("catalogo:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    await ParametrosModaService.eliminar_temporada(db, id, current_user, ip)
    return MensajeCatalogoResponse(mensaje="Temporada eliminada exitosamente")

# ----------------- CU6: PRENDAS DE VESTIR -----------------
@router.get("/prendas", response_model=List[PrendaResponse], summary="Consultar Catalogo de Prendas (CU6)")
async def listar_prendas(
    categoria_id: Optional[int] = None,
    temporada_id: Optional[int] = None,
    sector: Optional[str] = None,
    sucursal_id: Optional[int] = None,
    activo_solo: bool = True,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    return await PrendaService.listar(db, categoria_id, temporada_id, sector, sucursal_id, activo_solo, limit, offset)

@router.post("/prendas", response_model=PrendaResponse, status_code=status.HTTP_201_CREATED, summary="Registrar Prenda en Catalogo (CU6)")
async def crear_prenda(
    data: PrendaCreate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("catalogo:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await PrendaService.crear(db, data, current_user, ip)

@router.get("/prendas/{prenda_id}", response_model=PrendaResponse, summary="Detalle de Prenda (CU6)")
async def obtener_prenda(prenda_id: int, db: AsyncSession = Depends(get_db)):
    return await PrendaService.obtener_por_id(db, prenda_id)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "uploads", "prendas")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/avif"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@router.post("/upload-imagen", response_model=UploadImagenResponse, summary="Subir Foto de Prenda (CU6)")
async def subir_imagen_prenda(
    file: UploadFile = File(...),
    current_user: Usuario = Depends(require_permissions("catalogo:write"))
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato no permitido ({ext}). Se admiten solo: JPG, JPEG, PNG, WEBP, AVIF"
        )
    if file.content_type and file.content_type.lower() not in ALLOWED_MIME_TYPES and file.content_type != "application/octet-stream":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de contenido no valido ({file.content_type}). Debe ser una imagen valida."
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La imagen excede el limite de 10 MB permitidos."
        )

    filename = f"prenda_{uuid.uuid4().hex[:12]}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(content)

    url = f"/static/uploads/prendas/{filename}"
    return UploadImagenResponse(
        url=url,
        formato=ext,
        nombre_original=file.filename or filename,
        tamano_bytes=len(content)
    )

@router.put("/prendas/{prenda_id}", response_model=PrendaResponse, summary="Actualizar Prenda (CU6)")
async def actualizar_prenda(
    prenda_id: int,
    data: PrendaUpdate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("catalogo:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await PrendaService.actualizar(db, prenda_id, data, current_user, ip)

@router.delete("/prendas/{prenda_id}", response_model=MensajeCatalogoResponse, summary="Eliminar Prenda (CU6)")
async def eliminar_prenda(
    prenda_id: int,
    request: Request,
    current_user: Usuario = Depends(require_permissions("catalogo:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    await PrendaService.eliminar(db, prenda_id, current_user, ip)
    return MensajeCatalogoResponse(mensaje="Prenda eliminada exitosamente")

@router.delete("/prendas/{prenda_id}/multimedia/{multimedia_id}", response_model=MensajeCatalogoResponse, summary="Eliminar Multimedia de Prenda (CU6)")
async def eliminar_multimedia_prenda(
    prenda_id: int,
    multimedia_id: int,
    request: Request,
    current_user: Usuario = Depends(require_permissions("catalogo:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    await PrendaService.eliminar_multimedia(db, prenda_id, multimedia_id, current_user, ip)
    return MensajeCatalogoResponse(mensaje="Foto multimedia eliminada exitosamente")

@router.post("/prendas/{prenda_id}/multimedia", response_model=PrendaMultimediaResponse, summary="Vincular Modelo 3D / Multimedia AR (CU6)")
async def vincular_multimedia_prenda(
    prenda_id: int,
    data: PrendaMultimediaCreate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("catalogo:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await PrendaService.vincular_multimedia(db, prenda_id, data, current_user, ip)

# ----------------- CU6: CONTROL Y AJUSTE DE INVENTARIO POR SUCURSAL -----------------
@router.post("/inventario/ajuste", response_model=InventarioStockResponse, summary="Ajustar Inventario por Sucursal (CU6)")
async def ajustar_inventario(
    data: AjusteInventarioRequest,
    request: Request,
    current_user: Usuario = Depends(require_permissions("inventario:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await StockService.ajustar_inventario(db, data, current_user, ip)

@router.get("/inventario/sucursal/{sucursal_id}", response_model=List[InventarioStockResponse], summary="Consultar Stock de Sucursal (CU6)")
async def consultar_stock_sucursal(sucursal_id: int, db: AsyncSession = Depends(get_db)):
    return await StockService.consultar_stock_sucursal(db, sucursal_id)


# ----------------- CU18: CALIFICACIONES Y RESEÑAS -----------------
@router.get("/prendas/{prenda_id}/calificaciones", response_model=ListadoCalificacionesResponse, summary="Listar Calificaciones y Métricas (CU18)")
async def listar_calificaciones_prenda(
    prenda_id: int,
    current_user: Optional[Usuario] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    return await CalificacionService.listar_calificaciones(db, prenda_id, user_id)


@router.post("/prendas/{prenda_id}/calificaciones", response_model=CalificacionResponse, status_code=status.HTTP_201_CREATED, summary="Calificar Prenda (CU18)")
async def calificar_prenda(
    prenda_id: int,
    data: CalificacionCreate,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await CalificacionService.crear_o_actualizar(db, prenda_id, data, current_user, ip)


@router.delete("/calificaciones/{calificacion_id}", response_model=MensajeCatalogoResponse, summary="Eliminar Calificación (CU18)")
async def eliminar_calificacion(
    calificacion_id: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    await CalificacionService.eliminar(db, calificacion_id, current_user, ip)
    return MensajeCatalogoResponse(mensaje="Calificación eliminada exitosamente")

