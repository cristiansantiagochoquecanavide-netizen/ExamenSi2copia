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
    sector: str = Field("UNISEX", pattern="^(MUJERES|HOMBRES|UNISEX)$")
    activo: bool = True

class CategoriaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100)
    descripcion: Optional[str] = Field(None, max_length=255)
    sector: Optional[str] = Field(None, pattern="^(MUJERES|HOMBRES|UNISEX)$")
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

class PrendaMultimediaCreate(BaseModel):
    tipo: str = Field(..., pattern="^(IMAGEN|MODELO_3D_GLB|MODELO_3D_USDZ)$")
    url: str = Field(..., max_length=500)
    formato: str = Field(..., pattern=r"^\.(glb|usdz|jpg|jpeg|png|webp|avif)$")
    es_portada: bool = False

class UploadImagenResponse(BaseModel):
    url: str
    formato: str
    nombre_original: str
    tamano_bytes: int

class StockDistribucionItem(BaseModel):
    talla_id: int
    color_id: int
    sucursal_id: int
    cantidad: int = Field(0, ge=0)

class PrendaCreate(BaseModel):
    sku: str = Field(..., max_length=50)
    nombre: str = Field(..., max_length=150)
    descripcion: str
    precio_base: Decimal = Field(..., ge=0)
    categoria_id: int
    temporada_id: int
    empresa_id: Optional[int] = None
    stock_inicial: Optional[int] = Field(50, ge=0)
    stock_distribucion: Optional[List[StockDistribucionItem]] = None
    activo: bool = True
    variantes: List[PrendaVarianteInput] = []
    multimedia: List[PrendaMultimediaCreate] = []
    tallas_ids: Optional[List[int]] = None
    colores_ids: Optional[List[int]] = None

class PrendaUpdate(BaseModel):
    sku: Optional[str] = Field(None, max_length=50)
    nombre: Optional[str] = Field(None, max_length=150)
    descripcion: Optional[str] = None
    precio_base: Optional[Decimal] = Field(None, ge=0)
    categoria_id: Optional[int] = None
    temporada_id: Optional[int] = None
    stock_inicial: Optional[int] = Field(None, ge=0)
    stock_distribucion: Optional[List[StockDistribucionItem]] = None
    activo: Optional[bool] = None
    multimedia: Optional[List[PrendaMultimediaCreate]] = None
    tallas_ids: Optional[List[int]] = None
    colores_ids: Optional[List[int]] = None

class PrendaMultimediaResponse(BaseSchema):
    id: int
    prenda_id: int
    tipo: str
    url: str
    formato: str
    es_portada: bool
    created_at: datetime

class PrendaSimpleResponse(BaseSchema):
    id: int
    sku: str
    nombre: str
    precio_base: Decimal
    descripcion: Optional[str] = None
    activo: bool

class PrendaVarianteSimpleResponse(BaseSchema):
    id: int
    prenda_id: int
    talla_id: int
    color_id: int
    sku_variante: str
    codigo_barras: Optional[str] = None
    activo: bool
    talla: Optional[TallaResponse] = None
    color: Optional[ColorResponse] = None
    prenda: Optional[PrendaSimpleResponse] = None

class InventarioStockResponse(BaseSchema):
    id: int
    variante_id: int
    sucursal_id: int
    cantidad_disponible: int
    cantidad_reservada: int
    stock_minimo: int
    updated_at: datetime
    variante: Optional[PrendaVarianteSimpleResponse] = None

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
    prenda: Optional[PrendaSimpleResponse] = None
    stock_items: List[InventarioStockResponse] = []

class PrendaResponse(BaseSchema):
    id: int
    sku: str
    nombre: str
    descripcion: str
    precio_base: Decimal
    categoria_id: int
    temporada_id: int
    empresa_id: Optional[int] = None
    activo: bool
    created_at: datetime
    categoria: Optional[CategoriaResponse] = None
    temporada: Optional[TemporadaResponse] = None
    multimedia: List[PrendaMultimediaResponse] = []
    variantes: List[PrendaVarianteResponse] = []
    rating_promedio: Optional[float] = 0.0
    total_resenas: Optional[int] = 0
    stock_total: Optional[int] = 0

class AjusteInventarioRequest(BaseModel):
    variante_id: int
    sucursal_id: int
    tipo_movimiento: str = Field(..., pattern="^(INGRESO_INICIAL|AJUSTE_POSITIVO|AJUSTE_NEGATIVO|VENTA|RESERVA_APARTADA|DEVOLUCION)$")
    cantidad: int = Field(..., gt=0)
    motivo: str = Field(..., max_length=255)

class MensajeCatalogoResponse(BaseModel):
    mensaje: str
    exito: bool = True


# ----------------- CU18: CALIFICACIONES Y RESEÑAS DE PRENDAS -----------------
class CalificacionCreate(BaseModel):
    puntuacion: int = Field(..., ge=1, le=5)
    ajuste_talla: str = Field("FIEL", pattern="^(PEQUENO|FIEL|GRANDE)$")
    calidad: int = Field(5, ge=1, le=5)
    titulo: str = Field(..., min_length=2, max_length=150)
    comentario: str = Field(..., min_length=5)

class CalificacionUpdate(BaseModel):
    puntuacion: Optional[int] = Field(None, ge=1, le=5)
    ajuste_talla: Optional[str] = Field(None, pattern="^(PEQUENO|FIEL|GRANDE)$")
    calidad: Optional[int] = Field(None, ge=1, le=5)
    titulo: Optional[str] = Field(None, min_length=2, max_length=150)
    comentario: Optional[str] = Field(None, min_length=5)

class CalificacionUsuarioInfo(BaseModel):
    id: int
    nombre: str
    apellido: str
    email: str

class CalificacionResponse(BaseSchema):
    id: int
    prenda_id: int
    usuario_id: int
    puntuacion: int
    ajuste_talla: str
    calidad: int
    titulo: str
    comentario: str
    compra_verificada: bool
    activo: bool
    created_at: datetime
    updated_at: datetime
    usuario: Optional[CalificacionUsuarioInfo] = None

class DesgloseEstrellas(BaseModel):
    estrellas_5: int = 0
    estrellas_4: int = 0
    estrellas_3: int = 0
    estrellas_2: int = 0
    estrellas_1: int = 0

class DesgloseAjuste(BaseModel):
    pequeno: int = 0
    fiel: int = 0
    grande: int = 0

class EstadisticasCalificacionesResponse(BaseModel):
    promedio: float = 0.0
    total_resenas: int = 0
    promedio_calidad: float = 0.0
    desglose_estrellas: DesgloseEstrellas = DesgloseEstrellas()
    desglose_ajuste: DesgloseAjuste = DesgloseAjuste()
    porcentaje_fiel_talla: int = 100

class ListadoCalificacionesResponse(BaseModel):
    estadisticas: EstadisticasCalificacionesResponse
    calificaciones: List[CalificacionResponse] = []
    mi_calificacion: Optional[CalificacionResponse] = None
    es_comprador_verificado: bool = False


# ----------------- VIRTUAL TRY-ON (V-TON) SCHEMAS -----------------
class VtonTryOnResponse(BaseModel):
    status: str = "success"
    result_url: str
    prenda_id: int
    prenda_nombre: str
    prenda_categoria: str
    precio: float
    calce_score: float
    ancho_hombros_px: int
    mensaje: str



# ----------------- CU08: CATÁLOGO LOCAL SYNC SCHEMA -----------------
class PrendaSyncItem(BaseModel):
    id: int
    nombre: str = Field(default="")
    categoria: str = Field(default="")
    precio: float
    talla: str
    color: str
    stock_disponible: int
    pecho_cm: Optional[float] = None
    cintura_cm: Optional[float] = None

# ----------------- CU09: DIFUSIÓN DE NOVEDADES DE CATÁLOGO -----------------
class DifusionCatalogoCreate(BaseModel):
    titulo_campana: str = Field(..., min_length=3, max_length=150, description="Título o asunto de la campaña")
    mensaje_personalizado: str = Field(..., min_length=5, description="Cuerpo del mensaje publicitario o catálogo")
    canal_envio: str = Field("OMNICANAL", pattern="^(WHATSAPP|EMAIL|OMNICANAL|SMS)$")
    segmento_objetivo: str = Field("TODOS", pattern="^(TODOS|VIP|FRECUENTES|EN_RIESGO|NUEVOS)$")
    prendas_destacadas: Optional[str] = Field(None, description="Prendas o SKUs destacados en la difusión")
    programar_fecha: Optional[datetime] = None


class DifusionCatalogoResponse(BaseSchema):
    id: int
    empresa_id: Optional[int] = None
    titulo_campana: str
    mensaje_personalizado: str
    canal_envio: str
    segmento_objetivo: str
    prendas_destacadas: Optional[str] = None
    total_destinatarios: int = 0
    tasa_apertura_estimada: float = 78.5
    estado: str = "ENVIADA"
    fecha_envio: datetime
    creado_por_id: Optional[int] = None
    created_at: datetime

