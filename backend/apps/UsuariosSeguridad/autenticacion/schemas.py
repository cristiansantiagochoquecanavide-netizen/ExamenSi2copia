from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

# Base Configuration
class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# ----------------- CU1: AUTH SCHEMAS -----------------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)

class SolicitarRecuperacionRequest(BaseModel):
    email: EmailStr

class RestablecerPasswordRequest(BaseModel):
    token: str
    nueva_password: str = Field(..., min_length=6)

class MensajeResponse(BaseModel):
    mensaje: str
    exito: bool = True

# ----------------- CU2: ROLES & RBAC SCHEMAS -----------------
class PermisoResponse(BaseSchema):
    id: int
    codigo: str
    modulo: str
    descripcion: Optional[str] = None

class RolCreate(BaseModel):
    nombre: str = Field(..., max_length=50)
    descripcion: Optional[str] = Field(None, max_length=255)
    permisos_ids: List[int] = []

class RolUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=50)
    descripcion: Optional[str] = Field(None, max_length=255)
    permisos_ids: Optional[List[int]] = None

class RolResponse(BaseSchema):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    es_sistema: bool
    created_at: datetime
    permisos: List[PermisoResponse] = []

# ----------------- CU3: USUARIOS & CLIENTES SCHEMAS -----------------
class ClienteRegistroRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    nombre: str = Field(..., max_length=100)
    apellido: str = Field(..., max_length=100)
    ci_nit: str = Field(..., max_length=50)
    telefono: Optional[str] = Field(None, max_length=50)
    direccion: Optional[str] = Field(None, max_length=255)

class PersonalRegistroRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    nombre: str = Field(..., max_length=100)
    apellido: str = Field(..., max_length=100)
    ci_nit: str = Field(..., max_length=50)
    rol_id: int
    sucursal_id: Optional[int] = None
    telefono: Optional[str] = Field(None, max_length=50)
    direccion: Optional[str] = Field(None, max_length=255)

class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100)
    apellido: Optional[str] = Field(None, max_length=100)
    telefono: Optional[str] = Field(None, max_length=50)
    direccion: Optional[str] = Field(None, max_length=255)
    rol_id: Optional[int] = None
    sucursal_id: Optional[int] = None

class CambiarEstadoRequest(BaseModel):
    estado: str = Field(..., pattern="^(ACTIVO|INACTIVO|BLOQUEADO)$")

class UsuarioResponse(BaseSchema):
    id: int
    email: str
    nombre: str
    apellido: str
    ci_nit: str
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    tipo_usuario: str
    estado: str
    rol_id: int
    sucursal_id: Optional[int] = None
    empresa_id: Optional[int] = None
    created_at: datetime
    rol: Optional[RolResponse] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    usuario: UsuarioResponse

# ----------------- CU7: AUDITORIA SCHEMAS -----------------
class BitacoraAuditoriaResponse(BaseSchema):
    id: int
    timestamp: datetime
    usuario_id: Optional[int] = None
    usuario_email: Optional[str] = None
    ip_address: Optional[str] = None
    accion: str
    modulo: str
    detalle: str
    valores_anteriores: Optional[str] = None
    valores_nuevos: Optional[str] = None
