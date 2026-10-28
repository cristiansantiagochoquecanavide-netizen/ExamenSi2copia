from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr


# ----------------- SCHEMAS DE PLANES Y SUSCRIPCIONES -----------------
class PlanCreate(BaseModel):
    codigo: str = Field(..., max_length=50)
    nombre: str = Field(..., max_length=100)
    descripcion: Optional[str] = None
    precio_mensual: float = Field(..., ge=0)
    limite_sucursales: int = Field(..., ge=1)
    permite_ia: bool = False
    permite_offline: bool = False
    activo: bool = True


class PlanUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100)
    descripcion: Optional[str] = None
    precio_mensual: Optional[float] = Field(None, ge=0)
    limite_sucursales: Optional[int] = Field(None, ge=1)
    permite_ia: Optional[bool] = None
    permite_offline: Optional[bool] = None
    activo: Optional[bool] = None


class PlanResponse(BaseModel):
    id: int
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    precio_mensual: float
    limite_sucursales: int
    permite_ia: bool
    permite_offline: bool
    activo: bool

    class Config:
        from_attributes = True


class SuscripcionInfo(BaseModel):
    plan: str
    estado: str
    fecha_inicio: date
    fecha_fin: date


class CambiarPlanRequest(BaseModel):
    nuevo_plan_id: int = Field(..., description="ID del nuevo plan al cual migrar")


class SuscripcionDetalleResponse(BaseModel):
    id: int
    empresa_id: int
    plan_id: int
    plan_codigo: str
    plan_nombre: str
    estado: str
    fecha_inicio: date
    fecha_fin: date
    limite_sucursales: int
    sucursales_actuales: int
    permite_ia: bool
    permite_offline: bool
    dias_restantes: int


class EmpresaCreate(BaseModel):
    razon_social: str = Field(..., max_length=150)
    nit: str = Field(..., max_length=30)
    subdominio: str = Field(..., max_length=50)
    email_corporativo: EmailStr
    telefono: Optional[str] = Field(None, max_length=30)
    direccion_fiscal: Optional[str] = None
    plan_id: int = Field(..., description="ID del plan de suscripción seleccionado")
    admin_password: Optional[str] = Field("Password123!", description="Contraseña del usuario administrador")


class EmpresaResponse(BaseModel):
    id: int
    razon_social: str
    nit: str
    subdominio: str
    email_corporativo: str
    telefono: Optional[str] = None
    direccion_fiscal: Optional[str] = None
    activo: bool
    suscripcion: Optional[SuscripcionInfo] = None

    class Config:
        from_attributes = True


# ----------------- SCHEMAS DE SUCURSALES (CON CONTROL DE LÍMITES) -----------------
class SucursalTenantCreate(BaseModel):
    nombre: str = Field(..., max_length=150)
    ciudad: Optional[str] = Field(None, description="Nombre de la ciudad (ej: Santa Cruz, La Paz)")
    ciudad_id: Optional[int] = Field(None, description="ID de ciudad existente")
    direccion: str = Field(..., max_length=255)
    telefono: Optional[str] = Field(None, max_length=50)
    horario_atencion: Optional[str] = Field("09:00 - 20:00", max_length=100)
    capacidad_probadores: Optional[int] = Field(3, ge=1)
    activo: Optional[bool] = True


class SucursalTenantResponse(BaseModel):
    id: int
    empresa_id: Optional[int] = None
    nombre: str
    ciudad: Optional[str] = None
    direccion: str
    telefono: Optional[str] = None
    activo: bool

    class Config:
        from_attributes = True


# ----------------- SCHEMAS DE GUÍA ANATÓMICA DE MEDIDAS -----------------
class GuiaMedidaItem(BaseModel):
    id: Optional[int] = None
    talla_id: int
    talla: str = ""
    pecho_cm: float = Field(..., gt=0, description="Contorno de pecho en centímetros")
    cintura_cm: float = Field(..., gt=0, description="Contorno de cintura en centímetros")
    cadera_cm: float = Field(..., gt=0, description="Contorno de cadera en centímetros")
    largo_cm: float = Field(..., gt=0, description="Largo total de la prenda en centímetros")
    manga_cm: Optional[float] = Field(None, gt=0, description="Largo de manga en centímetros")
    observacion_calce: Optional[str] = Field(None, max_length=150)

    class Config:
        from_attributes = True


class GuiaMedidasProductoResponse(BaseModel):
    producto_id: int
    nombre: str
    tallas: List[GuiaMedidaItem]


class GuiaMedidaCreate(BaseModel):
    talla_id: int = Field(..., description="ID de la talla asociada")
    pecho_cm: float = Field(..., gt=0, description="Contorno de pecho en centímetros")
    cintura_cm: float = Field(..., gt=0, description="Contorno de cintura en centímetros")
    cadera_cm: float = Field(..., gt=0, description="Contorno de cadera en centímetros")
    largo_cm: float = Field(..., gt=0, description="Largo total de la prenda en centímetros")
    manga_cm: Optional[float] = Field(None, gt=0, description="Largo de manga en centímetros")
    observacion_calce: Optional[str] = Field(None, max_length=150)


# ----------------- SCHEMAS DE POLÍTICAS DE GARANTÍA (RN07: SIN REEMBOLSO) -----------------
class PoliticaGarantiaResponse(BaseModel):
    id: Optional[int] = None
    empresa_id: int
    plazo_dias_cambio: int
    permite_cambio_talla: bool = True
    admite_reembolso_dinero: bool = False  # Regla RN07 Inmutable
    requiere_etiqueta_original: bool = True

    class Config:
        from_attributes = True


class PoliticaGarantiaUpdate(BaseModel):
    plazo_dias_cambio: int = Field(..., gt=0, le=90, description="Días de tolerancia para cambio de talla (ej. 7, 15)")
    requiere_etiqueta_original: bool = Field(True, description="Exigencia de prenda en estado original con etiqueta")
