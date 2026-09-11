"""Modelos ORM SQLAlchemy para el dominio de Reservas de Prendas en Tienda Fisica (CU13)."""
from datetime import datetime, date, timezone
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import (
    Integer, String, Date, Numeric, Boolean, Text, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.core.database import Base


class Reserva(Base):
    __tablename__ = "reservas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo_reserva: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    cliente_id: Mapped[int] = mapped_column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    sucursal_id: Mapped[int] = mapped_column(Integer, ForeignKey("sucursales.id", ondelete="CASCADE"), nullable=False, index=True)
    fecha_reserva: Mapped[date] = mapped_column(Date, nullable=False)
    hora_estimada: Mapped[str] = mapped_column(String(10), nullable=False)  # ej: "15:30"
    estado: Mapped[str] = mapped_column(String(20), default="CONFIRMADA", nullable=False, index=True)
    # Estados: PENDIENTE, CONFIRMADA, EN_PROBADOR, COMPLETADA, CANCELADA, EXPIRADA
    monto_anticipo: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    moneda: Mapped[str] = mapped_column(String(5), default="USD", nullable=False)
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    qr_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    probador_asignado: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    atendido_por_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relaciones
    cliente: Mapped["app.domains.usuarios.models.Usuario"] = relationship("app.domains.usuarios.models.Usuario", foreign_keys=[cliente_id], lazy="selectin")
    atendido_por: Mapped[Optional["app.domains.usuarios.models.Usuario"]] = relationship("app.domains.usuarios.models.Usuario", foreign_keys=[atendido_por_id], lazy="selectin")
    sucursal: Mapped["app.domains.inventario.models.Sucursal"] = relationship("app.domains.inventario.models.Sucursal", foreign_keys=[sucursal_id], lazy="selectin")
    detalles: Mapped[List["DetalleReserva"]] = relationship("DetalleReserva", back_populates="reserva", cascade="all, delete-orphan", lazy="selectin")


class DetalleReserva(Base):
    __tablename__ = "detalles_reserva"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    reserva_id: Mapped[int] = mapped_column(Integer, ForeignKey("reservas.id", ondelete="CASCADE"), nullable=False, index=True)
    variante_id: Mapped[int] = mapped_column(Integer, ForeignKey("prenda_variantes.id", ondelete="RESTRICT"), nullable=False, index=True)
    cantidad: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    precio_unitario: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    probada: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    comprada: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relaciones
    reserva: Mapped["Reserva"] = relationship("Reserva", back_populates="detalles")
    variante: Mapped["app.domains.catalogo.models.PrendaVariante"] = relationship("app.domains.catalogo.models.PrendaVariante", foreign_keys=[variante_id], lazy="selectin")
