"""Esquemas Pydantic para el dominio de Ventas y Pagos."""
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.domains.inventario.schemas import SucursalResponse
from app.domains.usuarios.schemas import UsuarioResponse
from app.domains.catalogo.schemas import PrendaVarianteResponse

class BaseVentasSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class VentasStatusResponse(BaseModel):
    domain: str = "ventas"
    status: str = "active"
    message: str = "Dominio Ventas y Pagos operativo"

# ----------------- CU10: PUNTO DE VENTA (POS) SCHEMAS -----------------
class DetalleVentaCreate(BaseModel):
    variante_id: int
    cantidad: int = Field(..., gt=0)
    precio_unitario: Optional[Decimal] = Field(None, ge=0)

class PagoCreate(BaseModel):
    metodo_pago: str = Field(..., pattern="^(EFECTIVO|TARJETA|QR_SIMPLE|PAYPAL)$")
    monto: Optional[Decimal] = Field(None, ge=0)
    monto_entregado: Optional[Decimal] = Field(None, ge=0)  # Para cálculo de vuelto en efectivo
    transaccion_externa_id: Optional[str] = Field(None, max_length=100)

class VentaPOSCreate(BaseModel):
    sucursal_id: int
    cliente_id: Optional[int] = None
    cliente_nombre: str = Field("Consumidor Final", max_length=150)
    cliente_nit: str = Field("0", max_length=50)
    descuento: Decimal = Field(Decimal("0.00"), ge=0)
    observaciones: Optional[str] = None
    detalles: List[DetalleVentaCreate] = Field(..., min_length=1)
    pago: PagoCreate

class DetalleVentaResponse(BaseVentasSchema):
    id: int
    venta_id: int
    variante_id: int
    cantidad: int
    precio_unitario: Decimal
    subtotal: Decimal
    variante: Optional[PrendaVarianteResponse] = None

class PagoResponse(BaseVentasSchema):
    id: int
    venta_id: Optional[int] = None
    reserva_id: Optional[int] = None
    metodo_pago: str
    pasarela: Optional[str] = None
    monto: Decimal
    moneda: str = "USD"
    estado_pago: str
    transaccion_externa_id: Optional[str] = None
    cliente_email: Optional[str] = None
    qr_payload: Optional[str] = None
    datos_transaccion: Optional[str] = None
    fecha_hora: datetime

class EnvioPedidoResponse(BaseVentasSchema):
    id: int
    venta_id: int
    codigo_seguimiento: str
    tipo_entrega: str
    sucursal_recojo_id: Optional[int] = None
    direccion_linea1: Optional[str] = None
    direccion_linea2: Optional[str] = None
    ciudad: Optional[str] = None
    departamento: Optional[str] = None
    telefono_contacto: Optional[str] = None
    instrucciones_entrega: Optional[str] = None
    costo_envio: Decimal
    empresa_courier: Optional[str] = None
    estado_envio: str
    fecha_estimada_entrega: Optional[date] = None
    fecha_entregado: Optional[datetime] = None
    sucursal_recojo: Optional[SucursalResponse] = None
    created_at: datetime
    updated_at: datetime

class VentaResponse(BaseVentasSchema):
    id: int
    codigo_venta: str
    sucursal_id: int
    usuario_id: int
    cliente_id: Optional[int] = None
    canal_venta: str
    cliente_nombre: str
    cliente_nit: str
    subtotal: Decimal
    descuento: Decimal
    costo_envio: Decimal
    total: Decimal
    estado: str
    observaciones: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    sucursal: Optional[SucursalResponse] = None
    cajero: Optional[UsuarioResponse] = None
    cliente: Optional[UsuarioResponse] = None
    detalles: List[DetalleVentaResponse] = []
    pagos: List[PagoResponse] = []
    envio: Optional[EnvioPedidoResponse] = None



# ----------------- CU11: DEVOLUCIONES Y CAMBIOS SCHEMAS -----------------
class DetalleDevolucionCreate(BaseModel):
    variante_devuelta_id: int
    cantidad_devuelta: int = Field(..., gt=0)
    condicion_prenda: str = Field("APTO_PARA_VENTA", pattern="^(APTO_PARA_VENTA|DEFECTUOSO_MERMA)$")
    variante_cambio_id: Optional[int] = None
    cantidad_cambio: Optional[int] = Field(None, gt=0)


class DevolucionCreate(BaseModel):
    venta_id: int
    sucursal_id: int
    tipo: str = Field(..., pattern="^(DEVOLUCION|CAMBIO)$")
    motivo: str = Field("CAMBIO_TALLA", max_length=50)  # CAMBIO_TALLA, FALLA_FABRICA, DISCONFORMIDAD, OTRO
    metodo_reembolso: Optional[str] = Field("EFECTIVO", max_length=30)  # EFECTIVO, TARJETA, SALDO_FAVOR, NO_APLICA
    observaciones: Optional[str] = None
    detalles: List[DetalleDevolucionCreate] = Field(..., min_length=1)


class DetalleDevolucionResponse(BaseVentasSchema):
    id: int
    devolucion_id: int
    variante_devuelta_id: int
    cantidad_devuelta: int
    precio_unitario_devuelto: Decimal
    subtotal_devuelto: Decimal
    condicion_prenda: str
    variante_cambio_id: Optional[int] = None
    cantidad_cambio: Optional[int] = None
    precio_unitario_cambio: Optional[Decimal] = None
    subtotal_cambio: Optional[Decimal] = None
    diferencia_linea: Decimal
    variante_devuelta: Optional[PrendaVarianteResponse] = None
    variante_cambio: Optional[PrendaVarianteResponse] = None


class DevolucionResponse(BaseVentasSchema):
    id: int
    codigo: str
    venta_id: int
    sucursal_id: int
    usuario_id: int
    tipo: str
    motivo: str
    estado: str
    total_devuelto: Decimal
    total_nuevo: Decimal
    diferencia: Decimal
    metodo_reembolso: Optional[str] = None
    observaciones: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    venta: Optional[VentaResponse] = None
    sucursal: Optional[SucursalResponse] = None
    cajero: Optional[UsuarioResponse] = None
    detalles: List[DetalleDevolucionResponse] = []


class VentaParaDevolucionItem(BaseModel):
    detalle_id: int
    variante_id: int
    sku: str
    prenda_nombre: str
    talla: str
    color: str
    precio_unitario: Decimal
    cantidad_comprada: int
    cantidad_ya_devuelta: int
    cantidad_disponible_devolucion: int


class VentaParaDevolucionResponse(BaseModel):
    id: int
    codigo_venta: str
    sucursal_id: int
    sucursal_nombre: str
    fecha: datetime
    cliente_nombre: str
    cliente_nit: str
    total: Decimal
    estado: str
    cajero_nombre: str
    items: List[VentaParaDevolucionItem]


# ----------------- CU12: PAGOS ELECTRÓNICOS SCHEMAS -----------------
class DatosTarjetaInput(BaseModel):
    numero: str = Field(..., min_length=13, max_length=19)
    mes_exp: str = Field(..., pattern="^(0[1-9]|1[0-2])$")
    anio_exp: str = Field(..., pattern="^(2[4-9]|[3-9][0-9])$")
    cvc: str = Field(..., min_length=3, max_length=4)
    titular: str = Field(..., min_length=3, max_length=100)


class PagoElectronicoCreate(BaseModel):
    venta_id: Optional[int] = None
    reserva_id: Optional[int] = None
    metodo_pago: str = Field(..., pattern="^(QR_SIMPLE|TARJETA|PAYPAL|EFECTIVO)$")
    pasarela: str = Field(..., pattern="^(LIBELULA_BOLIVIA|STRIPE_INTL|PAYPAL_EXPRESS|EFECTIVO_POS)$")
    monto: Decimal = Field(..., gt=0)
    moneda: str = Field("USD", pattern="^(USD|BOB)$")
    cliente_email: Optional[str] = None
    datos_tarjeta: Optional[DatosTarjetaInput] = None
    concepto: Optional[str] = None


class ConfirmarPagoRequest(BaseModel):
    aprobado: bool = True
    codigo_autorizacion: Optional[str] = None
    motivo_rechazo: Optional[str] = None


class QRGenerarResponse(BaseModel):
    pago_id: int
    qr_string: str
    qr_imagen_svg: str
    codigo_recaudacion: str
    monto: Decimal
    moneda: str
    expira_en_segundos: int = 300


class WebhookPagoPayload(BaseModel):
    pasarela: str
    evento: str = "charge.succeeded"  # charge.succeeded, payment.completed, qr.confirmed
    transaccion_externa_id: str
    monto: Optional[Decimal] = None
    estado: str = "CONFIRMADO"


class PagoIniciarResponse(BaseModel):
    pago: PagoResponse
    qr: Optional[QRGenerarResponse] = None


# ----------------- CU15: CARRITO & CHECKOUT E-COMMERCE SCHEMAS -----------------
class DatosEnvioInput(BaseModel):
    tipo_entrega: str = Field("DOMICILIO", pattern="^(DOMICILIO|RECOJO_TIENDA)$")
    sucursal_recojo_id: Optional[int] = None
    direccion_linea1: Optional[str] = None
    direccion_linea2: Optional[str] = None
    ciudad: Optional[str] = None
    departamento: Optional[str] = None
    telefono_contacto: Optional[str] = None
    instrucciones_entrega: Optional[str] = None


class VentaOnlineCheckoutRequest(BaseModel):
    sucursal_despacho_id: int
    cliente_id: Optional[int] = None
    cliente_nombre: str = Field("Cliente E-Commerce", min_length=2, max_length=150)
    cliente_nit: str = Field("0", max_length=50)
    cliente_email: str = Field(..., max_length=150)
    descuento: Decimal = Field(Decimal("0.00"), ge=0)
    observaciones: Optional[str] = None
    detalles: List[DetalleVentaCreate] = Field(..., min_length=1)
    envio: DatosEnvioInput
    pago: PagoCreate


class ActualizarEstadoEnvioRequest(BaseModel):
    estado_envio: str = Field(..., pattern="^(PREPARANDO|EN_CAMINO|ENTREGADO|LISTO_RECOJO)$")
    empresa_courier: Optional[str] = None
    instrucciones_entrega: Optional[str] = None



