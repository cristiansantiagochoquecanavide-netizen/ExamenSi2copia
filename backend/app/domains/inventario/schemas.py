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
