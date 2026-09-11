"""Esquemas Pydantic para el dominio de Ventas y Pagos."""
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional, Any
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domains.inventario.schemas import SucursalResponse
from app.domains.usuarios.schemas import UsuarioResponse
from app.domains.catalogo.schemas import PrendaVarianteResponse, CategoriaResponse

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
    codigo_cupon: Optional[str] = None
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
    tipo_entrega: str = Field("DOMICILIO", pattern="^(DOMICILIO|RECOJO_TIENDA|CLICK_AND_COLLECT)$")
    sucursal_recojo_id: Optional[int] = None
    direccion_linea1: Optional[str] = None
    direccion_linea2: Optional[str] = None
    ciudad: Optional[str] = None
    departamento: Optional[str] = None
    codigo_postal: Optional[str] = None
    telefono_contacto: Optional[str] = None
    instrucciones_entrega: Optional[str] = None


class PagoOnlineInput(BaseModel):
    metodo_pago: str = Field(..., pattern="^(EFECTIVO|TARJETA|QR_SIMPLE|PAYPAL)$")
    pasarela: Optional[str] = None
    monto: Optional[Decimal] = None
    moneda: Optional[str] = "USD"
    cliente_email: Optional[str] = None
    transaccion_externa_id: Optional[str] = None
    datos_tarjeta: Optional[DatosTarjetaInput] = None
    concepto: Optional[str] = None


class VentaOnlineCheckoutRequest(BaseModel):
    sucursal_despacho_id: Optional[int] = None
    sucursal_id: Optional[int] = None
    cliente_id: Optional[int] = None
    cliente_nombre: str = Field("Cliente E-Commerce", min_length=2, max_length=150)
    cliente_nit: str = Field("0", max_length=50)
    cliente_email: str = Field(..., max_length=150)
    cliente_telefono: Optional[str] = None
    descuento: Decimal = Field(Decimal("0.00"), ge=0)
    codigo_cupon: Optional[str] = None
    observaciones: Optional[str] = None
    detalles: List[DetalleVentaCreate] = Field(..., min_length=1)
    envio: Optional[DatosEnvioInput] = None
    datos_envio: Optional[DatosEnvioInput] = None
    pago: PagoOnlineInput

    @model_validator(mode="before")
    @classmethod
    def normalizar_payload(cls, values: Any) -> Any:
        if isinstance(values, dict):
            # Normalizar sucursal_despacho_id / sucursal_id
            if values.get("sucursal_despacho_id") is None and values.get("sucursal_id") is not None:
                values["sucursal_despacho_id"] = values["sucursal_id"]
            elif values.get("sucursal_id") is None and values.get("sucursal_despacho_id") is not None:
                values["sucursal_id"] = values["sucursal_despacho_id"]

            # Normalizar envio / datos_envio
            if values.get("envio") is None and values.get("datos_envio") is not None:
                values["envio"] = values["datos_envio"]
            elif values.get("datos_envio") is None and values.get("envio") is not None:
                values["datos_envio"] = values["envio"]
        return values


class ActualizarEstadoEnvioRequest(BaseModel):
    estado_envio: str = Field(..., pattern="^(PREPARANDO|EN_CAMINO|ENTREGADO|LISTO_RECOJO|CANCELADO)$")
    courier_nombre: Optional[str] = None
    empresa_courier: Optional[str] = None
    notas: Optional[str] = None
    instrucciones_entrega: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def normalizar_courier(cls, values: Any) -> Any:
        if isinstance(values, dict):
            if values.get("empresa_courier") is None and values.get("courier_nombre") is not None:
                values["empresa_courier"] = values["courier_nombre"]
            elif values.get("courier_nombre") is None and values.get("empresa_courier") is not None:
                values["courier_nombre"] = values["empresa_courier"]
        return values


# ----------------- CU16: PROMOCIONES Y DESCUENTOS SCHEMAS -----------------
class PromocionBase(BaseModel):
    codigo: str = Field(..., min_length=2, max_length=50)
    nombre: str = Field(..., min_length=2, max_length=150)
    descripcion: Optional[str] = None
    tipo_descuento: str = Field("PORCENTAJE", pattern="^(PORCENTAJE|MONTO_FIJO|ENVIO_GRATIS)$")
    valor_descuento: Decimal = Field(Decimal("0.00"), ge=0)
    monto_minimo_compra: Decimal = Field(Decimal("0.00"), ge=0)
    descuento_maximo: Optional[Decimal] = Field(None, ge=0)
    limite_usos: Optional[int] = Field(None, gt=0)
    limite_por_cliente: int = Field(1, gt=0)
    fecha_inicio: datetime
    fecha_fin: datetime
    activo: bool = True
    categoria_id: Optional[int] = None
    sucursal_id: Optional[int] = None

    @model_validator(mode="before")
    @classmethod
    def normalizar_codigo(cls, values: Any) -> Any:
        if isinstance(values, dict) and "codigo" in values and isinstance(values["codigo"], str):
            values["codigo"] = values["codigo"].strip().upper()
        return values


class PromocionCreate(PromocionBase):
    pass


class PromocionUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=150)
    descripcion: Optional[str] = None
    tipo_descuento: Optional[str] = Field(None, pattern="^(PORCENTAJE|MONTO_FIJO|ENVIO_GRATIS)$")
    valor_descuento: Optional[Decimal] = Field(None, ge=0)
    monto_minimo_compra: Optional[Decimal] = Field(None, ge=0)
    descuento_maximo: Optional[Decimal] = Field(None, ge=0)
    limite_usos: Optional[int] = Field(None, gt=0)
    limite_por_cliente: Optional[int] = Field(None, gt=0)
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    activo: Optional[bool] = None
    categoria_id: Optional[int] = None
    sucursal_id: Optional[int] = None


class PromocionResponse(BaseVentasSchema):
    id: int
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    tipo_descuento: str
    valor_descuento: Decimal
    monto_minimo_compra: Decimal
    descuento_maximo: Optional[Decimal] = None
    limite_usos: Optional[int] = None
    usos_actuales: int
    limite_por_cliente: int
    fecha_inicio: datetime
    fecha_fin: datetime
    activo: bool
    categoria_id: Optional[int] = None
    sucursal_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    categoria: Optional[CategoriaResponse] = None
    sucursal: Optional[SucursalResponse] = None


class ValidarCuponRequest(BaseModel):
    codigo: str = Field(..., min_length=2, max_length=50)
    subtotal: Decimal = Field(..., ge=0)
    costo_envio: Optional[Decimal] = Field(Decimal("0.00"), ge=0)
    sucursal_id: Optional[int] = None
    cliente_id: Optional[int] = None


class ValidarCuponResponse(BaseModel):
    valido: bool
    codigo: str
    mensaje: str
    tipo_descuento: Optional[str] = None
    valor_descuento: Optional[Decimal] = None
    descuento_calculado: Decimal = Decimal("0.00")
    total_con_descuento: Decimal = Decimal("0.00")
    promocion: Optional[PromocionResponse] = None


class UsoPromocionResponse(BaseVentasSchema):
    id: int
    promocion_id: int
    venta_id: int
    usuario_id: Optional[int] = None
    monto_descontado: Decimal
    fecha_canje: datetime





