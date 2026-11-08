from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# ----------------- CIUDAD SCHEMAS -----------------
class CiudadCreate(BaseModel):
    nombre: str = Field(..., max_length=100)
    codigo: str = Field(..., max_length=20)
    activo: bool = True

class CiudadUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100)
    codigo: Optional[str] = Field(None, max_length=20)
    activo: Optional[bool] = None

class CiudadResponse(BaseSchema):
    id: int
    nombre: str
    codigo: str
    activo: bool
    created_at: datetime

# ----------------- SUCURSAL SCHEMAS -----------------
class SucursalCreate(BaseModel):
    nombre: str = Field(..., max_length=150)
    direccion: str = Field(..., max_length=255)
    telefono: Optional[str] = Field(None, max_length=50)
    horario_atencion: Optional[str] = Field(None, max_length=100)
    capacidad_probadores: int = Field(3, ge=1)
    ciudad_id: int
    encargado_id: Optional[int] = None
    activo: bool = True

class SucursalUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=150)
    direccion: Optional[str] = Field(None, max_length=255)
    telefono: Optional[str] = Field(None, max_length=50)
    horario_atencion: Optional[str] = Field(None, max_length=100)
    capacidad_probadores: Optional[int] = Field(None, ge=1)
    ciudad_id: Optional[int] = None
    encargado_id: Optional[int] = None
    activo: Optional[bool] = None

class AsignarEncargadoRequest(BaseModel):
    encargado_id: int

class SucursalResponse(BaseSchema):
    id: int
    nombre: str
    direccion: str
    telefono: Optional[str] = None
    horario_atencion: Optional[str] = None
    capacidad_probadores: int
    ciudad_id: int
    encargado_id: Optional[int] = None
    activo: bool
    created_at: datetime
    ciudad: Optional[CiudadResponse] = None

class MensajeInventarioResponse(BaseModel):
    mensaje: str
    exito: bool = True

# ----------------- CU8: PROVEEDOR SCHEMAS -----------------
class ProveedorCreate(BaseModel):
    razon_social: str = Field(..., max_length=150)
    nit: str = Field(..., max_length=25)
    contacto_nombre: Optional[str] = Field(None, max_length=100)
    telefono: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=100)
    direccion: Optional[str] = Field(None, max_length=255)
    activo: bool = True

class ProveedorUpdate(BaseModel):
    razon_social: Optional[str] = Field(None, max_length=150)
    nit: Optional[str] = Field(None, max_length=25)
    contacto_nombre: Optional[str] = Field(None, max_length=100)
    telefono: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=100)
    direccion: Optional[str] = Field(None, max_length=255)
    activo: Optional[bool] = None

class ProveedorResponse(BaseSchema):
    id: int
    razon_social: str
    nit: str
    contacto_nombre: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    activo: bool
    created_at: datetime

# ----------------- CU8: RECEPCIÓN DE MERCADERÍA SCHEMAS -----------------
from decimal import Decimal
from datetime import date
from apps.GestionCatalogo.schemas import PrendaVarianteResponse

class DetalleRecepcionCreate(BaseModel):
    variante_id: int
    cantidad: int = Field(..., gt=0)
    costo_unitario: Decimal = Field(..., ge=0)

class DetalleRecepcionResponse(BaseSchema):
    id: int
    recepcion_id: int
    variante_id: int
    cantidad: int
    costo_unitario: Decimal
    subtotal: Decimal
    variante: Optional[PrendaVarianteResponse] = None

class RecepcionMercaderiaCreate(BaseModel):
    numero_documento: str = Field(..., max_length=50)
    proveedor_id: int
    sucursal_id: int
    fecha_recepcion: Optional[date] = None
    observaciones: Optional[str] = None
    detalles: List[DetalleRecepcionCreate] = Field(..., min_length=1)

class RecepcionMercaderiaResponse(BaseSchema):
    id: int
    numero_documento: str
    proveedor_id: int
    sucursal_id: int
    usuario_id: int
    fecha_recepcion: date
    observaciones: Optional[str] = None
    costo_total: Decimal
    created_at: datetime
    proveedor: Optional[ProveedorResponse] = None
    sucursal: Optional[SucursalResponse] = None
    detalles: List[DetalleRecepcionResponse] = []


# ----------------- CU9: TRANSFERENCIA DE STOCK SCHEMAS -----------------
from apps.UsuariosSeguridad.schemas import UsuarioResponse

class DetalleTransferenciaCreate(BaseModel):
    variante_id: int
    cantidad: int = Field(..., gt=0)

class DetalleTransferenciaResponse(BaseSchema):
    id: int
    transferencia_id: int
    variante_id: int
    cantidad: int
    variante: Optional[PrendaVarianteResponse] = None

class TransferenciaStockCreate(BaseModel):
    codigo: Optional[str] = Field(None, max_length=50)
    sucursal_origen_id: int
    sucursal_destino_id: int
    motivo: Optional[str] = Field(None, max_length=255)
    observaciones: Optional[str] = None
    inmediata: bool = False
    detalles: List[DetalleTransferenciaCreate] = Field(..., min_length=1)

class TransferenciaStockResponse(BaseSchema):
    id: int
    codigo: str
    sucursal_origen_id: int
    sucursal_destino_id: int
    usuario_envia_id: int
    usuario_recibe_id: Optional[int] = None
    estado: str
    motivo: Optional[str] = None
    observaciones: Optional[str] = None
    fecha_envio: datetime
    fecha_recepcion: Optional[datetime] = None
    total_prendas: int
    created_at: datetime
    updated_at: datetime
    sucursal_origen: Optional[SucursalResponse] = None
    sucursal_destino: Optional[SucursalResponse] = None
    usuario_envia: Optional[UsuarioResponse] = None
    usuario_recibe: Optional[UsuarioResponse] = None
    detalles: List[DetalleTransferenciaResponse] = []

class RecibirTransferenciaRequest(BaseModel):
    observaciones: Optional[str] = None

class CancelarTransferenciaRequest(BaseModel):
    motivo: Optional[str] = None




# ----------------- CU11, CU12, CU13: INVENTARIO MULTI-SUCURSAL Y TRASPASOS -----------------
class StockSucursalItem(BaseModel):
    sucursal_id: int
    nombre_sucursal: str
    direccion: str
    telefono: Optional[str] = None
    stock_disponible: int

class ItemTraspasoCreate(BaseModel):
    producto_variante_id: int
    cantidad: int = Field(gt=0, description="Cantidad a transferir (debe ser mayor a cero)")

class TraspasoCreateRequest(BaseModel):
    sucursal_origen_id: int
    sucursal_destino_id: int
    motivo: Optional[str] = None
    items: List[ItemTraspasoCreate] = Field(..., min_length=1)

class ItemRecepcionConfirm(BaseModel):
    producto_variante_id: int
    cantidad_recibida: int = Field(ge=0, description="Cantidad efectivamente recibida")

class RecepcionTraspasoRequest(BaseModel):
    observaciones_recepcion: Optional[str] = None
    items_confirmados: Optional[List[ItemRecepcionConfirm]] = None

class TraspasoActionResponse(BaseModel):
    codigo_traspaso: Optional[str] = None
    traspaso_id: Optional[int] = None
    sucursal_origen_id: Optional[int] = None
    sucursal_destino_id: Optional[int] = None
    estado: str
    mensaje: str
