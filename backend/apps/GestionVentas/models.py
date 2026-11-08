"""Modelos ORM SQLAlchemy para el dominio de Ventas y Pagos."""
from datetime import datetime, date, timezone
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import (
    Boolean, Column, DateTime, Date, ForeignKey, Integer, Numeric, String, Text
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from apps.core.database import Base


class Venta(Base):
    __tablename__ = "ventas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    empresa_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)  # Multitenant ID
    codigo_venta: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    sucursal_id: Mapped[int] = mapped_column(Integer, ForeignKey("sucursales.id"), nullable=False, index=True)
    usuario_id: Mapped[int] = mapped_column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)  # Cajero
    cliente_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("usuarios.id"), nullable=True, index=True)  # Cliente registrado opcional
    reserva_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # Reserva origen si aplica
    canal_venta: Mapped[str] = mapped_column(String(30), default="FISICA_POS", nullable=False)  # FISICA_POS, ONLINE_WEB
    cliente_nombre: Mapped[str] = mapped_column(String(150), default="Consumidor Final", nullable=False)
    cliente_nit: Mapped[str] = mapped_column(String(50), default="0", nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    descuento: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    costo_envio: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), default="PAGADA", nullable=False, index=True)  # PAGADA, PENDIENTE, ANULADA
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    sucursal: Mapped["app.domains.inventario.models.Sucursal"] = relationship("app.domains.inventario.models.Sucursal", lazy="selectin")
    cajero: Mapped["app.domains.usuarios.models.Usuario"] = relationship("app.domains.usuarios.models.Usuario", foreign_keys=[usuario_id], lazy="selectin")
    cliente: Mapped[Optional["app.domains.usuarios.models.Usuario"]] = relationship("app.domains.usuarios.models.Usuario", foreign_keys=[cliente_id], lazy="selectin")
    detalles: Mapped[List["DetalleVenta"]] = relationship("DetalleVenta", back_populates="venta", cascade="all, delete-orphan", lazy="selectin")
    pagos: Mapped[List["Pago"]] = relationship("Pago", back_populates="venta", cascade="all, delete-orphan", lazy="selectin")
    devoluciones: Mapped[List["Devolucion"]] = relationship("Devolucion", back_populates="venta", cascade="all, delete-orphan", lazy="selectin")
    envio: Mapped[Optional["EnvioPedido"]] = relationship("EnvioPedido", back_populates="venta", uselist=False, cascade="all, delete-orphan", lazy="selectin")



class DetalleVenta(Base):
    __tablename__ = "detalles_venta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    venta_id: Mapped[int] = mapped_column(Integer, ForeignKey("ventas.id", ondelete="CASCADE"), nullable=False)
    variante_id: Mapped[int] = mapped_column(Integer, ForeignKey("prenda_variantes.id"), nullable=False)
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    precio_unitario: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    venta: Mapped["Venta"] = relationship("Venta", back_populates="detalles")
    variante: Mapped["app.domains.catalogo.models.PrendaVariante"] = relationship("app.domains.catalogo.models.PrendaVariante", lazy="selectin")


class Pago(Base):
    __tablename__ = "pagos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    venta_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("ventas.id", ondelete="CASCADE"), nullable=True)
    reserva_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    metodo_pago: Mapped[str] = mapped_column(String(30), nullable=False)  # EFECTIVO, TARJETA, QR_SIMPLE, PAYPAL
    pasarela: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # LIBELULA_BOLIVIA, STRIPE_INTL, PAYPAL_EXPRESS, EFECTIVO_POS
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    moneda: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)  # USD, BOB
    estado_pago: Mapped[str] = mapped_column(String(20), default="CONFIRMADO", nullable=False, index=True)  # CONFIRMADO, PENDIENTE, RECHAZADO
    transaccion_externa_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    cliente_email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    qr_payload: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    datos_transaccion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fecha_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    venta: Mapped[Optional["Venta"]] = relationship("Venta", back_populates="pagos")


class Devolucion(Base):
    __tablename__ = "devoluciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    venta_id: Mapped[int] = mapped_column(Integer, ForeignKey("ventas.id", ondelete="CASCADE"), nullable=False, index=True)
    sucursal_id: Mapped[int] = mapped_column(Integer, ForeignKey("sucursales.id"), nullable=False, index=True)
    usuario_id: Mapped[int] = mapped_column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)  # Cajero/operador
    tipo: Mapped[str] = mapped_column(String(20), default="DEVOLUCION", nullable=False)  # DEVOLUCION, CAMBIO
    motivo: Mapped[str] = mapped_column(String(50), default="CAMBIO_TALLA", nullable=False)  # CAMBIO_TALLA, FALLA_FABRICA, DISCONFORMIDAD, OTRO
    estado: Mapped[str] = mapped_column(String(20), default="COMPLETADA", nullable=False)  # COMPLETADA, ANULADA
    total_devuelto: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_nuevo: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    diferencia: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)  # total_nuevo - total_devuelto
    metodo_reembolso: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)  # EFECTIVO, TARJETA, SALDO_FAVOR, NO_APLICA
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    venta: Mapped["Venta"] = relationship("Venta", back_populates="devoluciones")
    sucursal: Mapped["app.domains.inventario.models.Sucursal"] = relationship("app.domains.inventario.models.Sucursal", lazy="selectin")
    cajero: Mapped["app.domains.usuarios.models.Usuario"] = relationship("app.domains.usuarios.models.Usuario", foreign_keys=[usuario_id], lazy="selectin")
    detalles: Mapped[List["DetalleDevolucion"]] = relationship("DetalleDevolucion", back_populates="devolucion", cascade="all, delete-orphan", lazy="selectin")


class DetalleDevolucion(Base):
    __tablename__ = "detalles_devolucion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    devolucion_id: Mapped[int] = mapped_column(Integer, ForeignKey("devoluciones.id", ondelete="CASCADE"), nullable=False)
    variante_devuelta_id: Mapped[int] = mapped_column(Integer, ForeignKey("prenda_variantes.id"), nullable=False)
    cantidad_devuelta: Mapped[int] = mapped_column(Integer, nullable=False)
    precio_unitario_devuelto: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    subtotal_devuelto: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    condicion_prenda: Mapped[str] = mapped_column(String(30), default="APTO_PARA_VENTA", nullable=False)  # APTO_PARA_VENTA, DEFECTUOSO_MERMA

    variante_cambio_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("prenda_variantes.id"), nullable=True)
    cantidad_cambio: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    precio_unitario_cambio: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    subtotal_cambio: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    diferencia_linea: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    devolucion: Mapped["Devolucion"] = relationship("Devolucion", back_populates="detalles")
    variante_devuelta: Mapped["app.domains.catalogo.models.PrendaVariante"] = relationship(
        "app.domains.catalogo.models.PrendaVariante", foreign_keys=[variante_devuelta_id], lazy="selectin"
    )
    variante_cambio: Mapped[Optional["app.domains.catalogo.models.PrendaVariante"]] = relationship(
        "app.domains.catalogo.models.PrendaVariante", foreign_keys=[variante_cambio_id], lazy="selectin"
    )


# ----------------- CU15: DESPACHO Y ENVÍO DE PEDIDOS E-COMMERCE -----------------
class EnvioPedido(Base):
    __tablename__ = "envios_pedido"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    venta_id: Mapped[int] = mapped_column(Integer, ForeignKey("ventas.id", ondelete="CASCADE"), nullable=False, index=True)
    codigo_seguimiento: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    tipo_entrega: Mapped[str] = mapped_column(String(20), default="DOMICILIO", nullable=False)  # DOMICILIO, RECOJO_TIENDA
    sucursal_recojo_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("sucursales.id", ondelete="SET NULL"), nullable=True)
    direccion_linea1: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    direccion_linea2: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ciudad: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    departamento: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    telefono_contacto: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    instrucciones_entrega: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    costo_envio: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    empresa_courier: Mapped[Optional[str]] = mapped_column(String(100), default="Atelier Courier Express", nullable=True)
    estado_envio: Mapped[str] = mapped_column(String(30), default="PREPARANDO", nullable=False, index=True)  # PREPARANDO, EN_CAMINO, ENTREGADO, LISTO_RECOJO
    fecha_estimada_entrega: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    fecha_entregado: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relaciones
    venta: Mapped["Venta"] = relationship("Venta", back_populates="envio")
    sucursal_recojo: Mapped[Optional["app.domains.inventario.models.Sucursal"]] = relationship(
        "app.domains.inventario.models.Sucursal", foreign_keys=[sucursal_recojo_id], lazy="selectin"
    )


# ----------------- CU16: PROMOCIONES Y DESCUENTOS -----------------
class Promocion(Base):
    __tablename__ = "promociones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tipo_descuento: Mapped[str] = mapped_column(String(30), nullable=False)  # PORCENTAJE, MONTO_FIJO, ENVIO_GRATIS
    valor_descuento: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    monto_minimo_compra: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    descuento_maximo: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    limite_usos: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    usos_actuales: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    limite_por_cliente: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    fecha_inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    fecha_fin: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)
    categoria_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("categorias.id", ondelete="SET NULL"), nullable=True)
    sucursal_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("sucursales.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relaciones
    categoria: Mapped[Optional["app.domains.catalogo.models.Categoria"]] = relationship(
        "app.domains.catalogo.models.Categoria", lazy="selectin"
    )
    sucursal: Mapped[Optional["app.domains.inventario.models.Sucursal"]] = relationship(
        "app.domains.inventario.models.Sucursal", lazy="selectin"
    )
    usos: Mapped[List["UsoPromocion"]] = relationship("UsoPromocion", back_populates="promocion", cascade="all, delete-orphan")


class UsoPromocion(Base):
    __tablename__ = "usos_promocion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    promocion_id: Mapped[int] = mapped_column(Integer, ForeignKey("promociones.id", ondelete="CASCADE"), nullable=False, index=True)
    venta_id: Mapped[int] = mapped_column(Integer, ForeignKey("ventas.id", ondelete="CASCADE"), nullable=False, index=True)
    usuario_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    monto_descontado: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    fecha_canje: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relaciones
    promocion: Mapped["Promocion"] = relationship("Promocion", back_populates="usos")
    venta: Mapped["Venta"] = relationship("Venta", backref="usos_promocion")
    usuario: Mapped[Optional["app.domains.usuarios.models.Usuario"]] = relationship("app.domains.usuarios.models.Usuario", lazy="selectin")



