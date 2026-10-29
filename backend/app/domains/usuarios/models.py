from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, String, Table, Text
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.core.database import Base

# Tabla intermedia para Roles y Permisos (RBAC)
rol_permisos = Table(
    "rol_permisos",
    Base.metadata,
    Column("rol_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permiso_id", Integer, ForeignKey("permisos.id", ondelete="CASCADE"), primary_key=True)
)

class Rol(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    descripcion: Mapped[str] = mapped_column(String(255), nullable=True)
    es_sistema: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    permisos: Mapped[List["Permiso"]] = relationship(
        "Permiso",
        secondary=rol_permisos,
        lazy="selectin"
    )
    usuarios: Mapped[List["Usuario"]] = relationship("Usuario", back_populates="rol")


class Permiso(Base):
    __tablename__ = "permisos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    modulo: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    descripcion: Mapped[str] = mapped_column(String(255), nullable=True)


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    apellido: Mapped[str] = mapped_column(String(100), nullable=False)
    ci_nit: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    telefono: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    direccion: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    tipo_usuario: Mapped[str] = mapped_column(String(20), default="CLIENTE", nullable=False)  # PERSONAL, CLIENTE
    estado: Mapped[str] = mapped_column(String(20), default="ACTIVO", nullable=False)  # ACTIVO, INACTIVO, BLOQUEADO
    rol_id: Mapped[int] = mapped_column(Integer, ForeignKey("roles.id"), nullable=False)
    sucursal_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # Vinculacion a sucursal si es personal
    empresa_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)  # Tenant ID
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    rol: Mapped["Rol"] = relationship("Rol", back_populates="usuarios", lazy="selectin")


class TokenBlacklist(Base):
    __tablename__ = "token_blacklist"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    token: Mapped[str] = mapped_column(Text, unique=True, index=True, nullable=False)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    revoked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class RecuperacionPassword(Base):
    __tablename__ = "recuperaciones_password"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(150), index=True, nullable=False)
    token: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    expira_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    usado: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class BitacoraAuditoria(Base):
    __tablename__ = "bitacora_auditoria"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    usuario_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    usuario_email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    empresa_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    accion: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    modulo: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    detalle: Mapped[str] = mapped_column(Text, nullable=False)
    valores_anteriores: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    valores_nuevos: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
