from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# ----------------- CU5: PARAMETROS DE MODA -----------------
class CategoriaCreate(BaseModel):
    nombre: str = Field(..., max_length=100)
    descripcion: Optional[str] = Field(None, max_length=255)
    sector: str = Field("UNISEX", pattern="^(MUJERES|HOMBRES|NINOS|UNISEX)$")
    activo: bool = True

class CategoriaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100)
    descripcion: Optional[str] = Field(None, max_length=255)
    sector: Optional[str] = Field(None, pattern="^(MUJERES|HOMBRES|NINOS|UNISEX)$")
    activo: Optional[bool] = None

class CategoriaResponse(BaseSchema):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    sector: str
    activo: bool
    created_at: datetime


class TallaCreate(BaseModel):
    codigo: str = Field(..., max_length=20)
    descripcion: Optional[str] = Field(None, max_length=100)
    orden: int = 0
    activo: bool = True

class TallaUpdate(BaseModel):
    codigo: Optional[str] = Field(None, max_length=20)
    descripcion: Optional[str] = Field(None, max_length=100)
    orden: Optional[int] = None
    activo: Optional[bool] = None

class TallaResponse(BaseSchema):
    id: int
    codigo: str
    descripcion: Optional[str] = None
    orden: int
    activo: bool


class ColorCreate(BaseModel):
    nombre: str = Field(..., max_length=100)
    codigo_hex: Optional[str] = Field(None, max_length=20)
    codigo_rgb: Optional[str] = Field(None, max_length=30)
    activo: bool = True

class ColorUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100)
    codigo_hex: Optional[str] = Field(None, max_length=20)
    codigo_rgb: Optional[str] = Field(None, max_length=30)
    activo: Optional[bool] = None

class ColorResponse(BaseSchema):
    id: int
    nombre: str
    codigo_hex: Optional[str] = None
    codigo_rgb: Optional[str] = None
    activo: bool


class TemporadaCreate(BaseModel):
    nombre: str = Field(..., max_length=150)
    codigo: str = Field(..., max_length=50)
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    activo: bool = True

class TemporadaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=150)
    codigo: Optional[str] = Field(None, max_length=50)
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    activo: Optional[bool] = None

class TemporadaResponse(BaseSchema):
    id: int
    nombre: str
    codigo: str
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    activo: bool
    created_at: datetime


# ----------------- CU6: PRENDAS, MULTIMEDIA Y AJUSTE DE INVENTARIO -----------------
class PrendaVarianteInput(BaseModel):
    talla_id: int
    color_id: int
    sku_variante: Optional[str] = None
    codigo_barras: Optional[str] = None

class PrendaCreate(BaseModel):
    sku: str = Field(..., max_length=50)
    nombre: str = Field(..., max_length=150)
    descripcion: str
    precio_base: Decimal = Field(..., ge=0)
    categoria_id: int
    temporada_id: int
    variantes: List[PrendaVarianteInput] = []

class PrendaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=150)
    descripcion: Optional[str] = None
    precio_base: Optional[Decimal] = Field(None, ge=0)
    categoria_id: Optional[int] = None
    temporada_id: Optional[int] = None
    activo: Optional[bool] = None

class PrendaMultimediaCreate(BaseModel):
    tipo: str = Field(..., pattern="^(IMAGEN|MODELO_3D_GLB|MODELO_3D_USDZ)$")
    url: str = Field(..., max_length=500)
    formato: str = Field(..., pattern=r"^\.(glb|usdz|jpg|jpeg|png|webp)$")
    es_portada: bool = False

class PrendaMultimediaResponse(BaseSchema):
    id: int
    prenda_id: int
    tipo: str
    url: str
    formato: str
    es_portada: bool
    created_at: datetime

class PrendaVarianteResponse(BaseSchema):
    id: int
    prenda_id: int
    talla_id: int
    color_id: int
    sku_variante: str
    codigo_barras: Optional[str] = None
    activo: bool
    talla: Optional[TallaResponse] = None
    color: Optional[ColorResponse] = None

class PrendaResponse(BaseSchema):
    id: int
    sku: str
    nombre: str
    descripcion: str
    precio_base: Decimal
    categoria_id: int
    temporada_id: int
    activo: bool
    created_at: datetime
    categoria: Optional[CategoriaResponse] = None
    temporada: Optional[TemporadaResponse] = None
    multimedia: List[PrendaMultimediaResponse] = []
    variantes: List[PrendaVarianteResponse] = []

class AjusteInventarioRequest(BaseModel):
    variante_id: int
    sucursal_id: int
    tipo_movimiento: str = Field(..., pattern="^(INGRESO_INICIAL|AJUSTE_POSITIVO|AJUSTE_NEGATIVO|VENTA|RESERVA_APARTADA|DEVOLUCION)$")
    cantidad: int = Field(..., gt=0)
    motivo: str = Field(..., max_length=255)

class InventarioStockResponse(BaseSchema):
    id: int
    variante_id: int
    sucursal_id: int
    cantidad_disponible: int
    cantidad_reservada: int
    stock_minimo: int
    updated_at: datetime
    variante: Optional[PrendaVarianteResponse] = None

class MensajeCatalogoResponse(BaseModel):
    mensaje: str
    exito: bool = True
