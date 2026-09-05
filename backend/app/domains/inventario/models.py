from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, String, Text
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.core.database import Base

class Ciudad(Base):
    __tablename__ = "ciudades"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    codigo: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    sucursales: Mapped[List["Sucursal"]] = relationship("Sucursal", back_populates="ciudad")


class Sucursal(Base):
    __tablename__ = "sucursales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
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
