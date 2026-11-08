from datetime import datetime, timezone, date
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from apps.core.database import Base

class Ciudad(Base):
    __tablename__ = "ciudades"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    codigo: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    sucursales: Mapped[List["Sucursal"]] = relationship("Sucursal", back_populates="ciudad")


# ==========================================================================
# CASO DE USO: CU04 - ADMINISTRAR SUCURSALES
# CAPA MVC: [MODELO DE BASE DE DATOS / ENTIDAD ORM SUCURSAL]
# ==========================================================================
class Sucursal(Base):
    __tablename__ = "sucursales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    empresa_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)  # Multitenant ID
    nombre: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    direccion: Mapped[str] = mapped_column(String(255), nullable=False)
    telefono: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    horario_atencion: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    capacidad_probadores: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    ciudad_id: Mapped[int] = mapped_column(Integer, ForeignKey("ciudades.id"), nullable=False)
    encargado_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("usuarios.id"), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    ciudad: Mapped["Ciudad"] = relationship("Ciudad", back_populates="sucursales", lazy="selectin")
    recepciones: Mapped[List["RecepcionMercaderia"]] = relationship("RecepcionMercaderia", back_populates="sucursal")


# ----------------- CU8: PROVEEDORES Y RECEPCIÓN DE MERCADERÍA -----------------
class Proveedor(Base):
    __tablename__ = "proveedores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    empresa_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)  # Multitenant ID
    razon_social: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    nit: Mapped[str] = mapped_column(String(25), index=True, nullable=False)
    contacto_nombre: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    telefono: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    direccion: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    recepciones: Mapped[List["RecepcionMercaderia"]] = relationship("RecepcionMercaderia", back_populates="proveedor")


class RecepcionMercaderia(Base):
    __tablename__ = "recepciones_mercaderia"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    numero_documento: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    proveedor_id: Mapped[int] = mapped_column(Integer, ForeignKey("proveedores.id"), nullable=False)
    sucursal_id: Mapped[int] = mapped_column(Integer, ForeignKey("sucursales.id"), nullable=False)
    usuario_id: Mapped[int] = mapped_column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha_recepcion: Mapped[date] = mapped_column(Date, default=lambda: datetime.now(timezone.utc).date())
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    costo_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    proveedor: Mapped["Proveedor"] = relationship("Proveedor", back_populates="recepciones", lazy="selectin")
    sucursal: Mapped["Sucursal"] = relationship("Sucursal", back_populates="recepciones", lazy="selectin")
    usuario: Mapped["Usuario"] = relationship("Usuario", lazy="selectin")
    detalles: Mapped[List["DetalleRecepcionMercaderia"]] = relationship("DetalleRecepcionMercaderia", back_populates="recepcion", cascade="all, delete-orphan", lazy="selectin")


class DetalleRecepcionMercaderia(Base):
    __tablename__ = "detalles_recepcion_mercaderia"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    recepcion_id: Mapped[int] = mapped_column(Integer, ForeignKey("recepciones_mercaderia.id", ondelete="CASCADE"), nullable=False)
    variante_id: Mapped[int] = mapped_column(Integer, ForeignKey("prenda_variantes.id"), nullable=False)
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    costo_unitario: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    recepcion: Mapped["RecepcionMercaderia"] = relationship("RecepcionMercaderia", back_populates="detalles")
    variante: Mapped["PrendaVariante"] = relationship("PrendaVariante", lazy="selectin")


# ----------------- CU9: TRANSFERENCIA DE STOCK ENTRE SUCURSALES -----------------
# ==========================================================================
# CASO DE USO: CU12 & CU13 - TRASPASO DE INVENTARIO ENTRE TIENDAS
# CAPA MVC: [MODELO DE BASE DE DATOS / ENTIDAD ORM TRASPASO]
# ==========================================================================
class TransferenciaStock(Base):
    __tablename__ = "transferencias_stock"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    sucursal_origen_id: Mapped[int] = mapped_column(Integer, ForeignKey("sucursales.id"), nullable=False, index=True)
    sucursal_destino_id: Mapped[int] = mapped_column(Integer, ForeignKey("sucursales.id"), nullable=False, index=True)
    usuario_envia_id: Mapped[int] = mapped_column(Integer, ForeignKey("usuarios.id"), nullable=False)
    usuario_recibe_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("usuarios.id"), nullable=True)
    estado: Mapped[str] = mapped_column(String(20), default="EN_TRANSITO", nullable=False, index=True)  # EN_TRANSITO, COMPLETADA, CANCELADA
    motivo: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fecha_envio: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    fecha_recepcion: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    total_prendas: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    sucursal_origen: Mapped["Sucursal"] = relationship("Sucursal", foreign_keys=[sucursal_origen_id], lazy="selectin")
    sucursal_destino: Mapped["Sucursal"] = relationship("Sucursal", foreign_keys=[sucursal_destino_id], lazy="selectin")
    usuario_envia: Mapped["Usuario"] = relationship("Usuario", foreign_keys=[usuario_envia_id], lazy="selectin")
    usuario_recibe: Mapped[Optional["Usuario"]] = relationship("Usuario", foreign_keys=[usuario_recibe_id], lazy="selectin")
    detalles: Mapped[List["DetalleTransferenciaStock"]] = relationship("DetalleTransferenciaStock", back_populates="transferencia", cascade="all, delete-orphan", lazy="selectin")


class DetalleTransferenciaStock(Base):
    __tablename__ = "detalles_transferencia_stock"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    transferencia_id: Mapped[int] = mapped_column(Integer, ForeignKey("transferencias_stock.id", ondelete="CASCADE"), nullable=False)
    variante_id: Mapped[int] = mapped_column(Integer, ForeignKey("prenda_variantes.id"), nullable=False)
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)

    transferencia: Mapped["TransferenciaStock"] = relationship("TransferenciaStock", back_populates="detalles")
    variante: Mapped["PrendaVariante"] = relationship("PrendaVariante", lazy="selectin")


# ----------------- REUTILIZACIÓN MODELOS MÓDULO 9 (CU12, CU13) -----------------

