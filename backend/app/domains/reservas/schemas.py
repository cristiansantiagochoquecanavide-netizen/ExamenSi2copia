"""Esquemas Pydantic para el dominio de Reservas en Tienda Fisica (CU13)."""
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.domains.inventario.schemas import SucursalResponse
from app.domains.usuarios.schemas import UsuarioResponse
from app.domains.catalogo.schemas import PrendaVarianteResponse


class BaseReservasSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ReservasStatusResponse(BaseModel):
    domain: str = "reservas"
    status: str = "active"
    message: str = "Dominio Reservas en Tienda Fisica operativo"


# ----------------- CU13: RESERVA DE PRENDAS PARA PROBADOR -----------------
class DetalleReservaCreate(BaseModel):
    variante_id: int
    cantidad: int = Field(1, ge=1, le=10)


class DetalleReservaResponse(BaseReservasSchema):
    id: int
    reserva_id: int
    variante_id: int
    cantidad: int
    precio_unitario: Decimal
    subtotal: Decimal
    probada: bool = False
    comprada: bool = False
    variante: Optional[PrendaVarianteResponse] = None


class ReservaCreate(BaseModel):
    sucursal_id: int
    fecha_reserva: date
    hora_estimada: str = Field(..., pattern="^(0[8-9]|1[0-9]|2[0-1]):[0-5][0-9]$", description="Formato HH:MM entre 08:00 y 21:59")
    cliente_id: Optional[int] = None
    monto_anticipo: Decimal = Field(Decimal("0.00"), ge=0)
    moneda: str = Field("USD", pattern="^(USD|BOB)$")
    observaciones: Optional[str] = None
    detalles: List[DetalleReservaCreate] = Field(..., min_length=1, max_length=10)


class ReservaResponse(BaseReservasSchema):
    id: int
    codigo_reserva: str
    cliente_id: int
    sucursal_id: int
    fecha_reserva: date
    hora_estimada: str
    estado: str
    monto_anticipo: Decimal
    moneda: str
    observaciones: Optional[str] = None
    qr_token: Optional[str] = None
    qr_svg: Optional[str] = None
    probador_asignado: Optional[str] = None
    atendido_por_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    cliente: Optional[UsuarioResponse] = None
    atendido_por: Optional[UsuarioResponse] = None
    sucursal: Optional[SucursalResponse] = None
    detalles: List[DetalleReservaResponse] = []


class ReservaCancelarRequest(BaseModel):
    motivo: Optional[str] = "Cancelación solicitada por el cliente"


# ----------------- CU14: ATENCIÓN Y GESTIÓN EN PROBADORES -----------------
class AsignarProbadorRequest(BaseModel):
    probador: str = Field(..., min_length=1, max_length=50, description="Nombre o número de la cabina (ej: Probador #1, Cabina VIP)")
    observaciones: Optional[str] = None


class ResultadoDetalleInput(BaseModel):
    detalle_id: int
    probada: bool = True
    comprada: bool = False


class FinalizarPruebaRequest(BaseModel):
    resultados: List[ResultadoDetalleInput] = Field(..., min_length=1)
    derivar_a_pos: bool = Field(True, description="Si es True, genera una Venta POS o comprobante con saldo a favor")
    observaciones: Optional[str] = None


class ReservaExpirarRequest(BaseModel):
    motivo: Optional[str] = "No show del cliente en probador"


# ----------------- CU25: TRAZABILIDAD Y ESTADO DE RESERVAS -----------------
class HitoTrazabilidadItem(BaseModel):
    etiqueta: str
    descripcion: str
    completado: bool
    fecha_hora: Optional[datetime] = None
    icono: str = "schedule"
    color_hex: str = "#6b7280"


class ReservaTrazabilidadResponse(BaseModel):
    id: int
    codigo_reserva: str
    qr_token: Optional[str] = None
    qr_svg: Optional[str] = None
    cliente_nombre: str
    cliente_email: Optional[str] = None
    sucursal_nombre: str
    sucursal_direccion: Optional[str] = None
    fecha_reserva: date
    hora_estimada: str
    estado: str
    esta_expirada: bool = False
    tiempo_restante_minutos: Optional[int] = None
    probador_asignado: Optional[str] = None
    observaciones: Optional[str] = None
    hitos: List[HitoTrazabilidadItem] = []
    detalles: List[DetalleReservaResponse] = []
    acciones_disponibles: List[str] = []
