from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, String, Text, JSON
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.core.database import Base


class Notificacion(Base):
    __tablename__ = "notificaciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usuario_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=True, index=True
    )
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    mensaje: Mapped[str] = mapped_column(Text, nullable=False)
    tipo: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # RESERVA_PROBADOR, ESTADO_PEDIDO, PROMOCION, RECOMENDACION_IA, ALERTA_STOCK, SISTEMA
    canal: Mapped[str] = mapped_column(String(50), default="TODOS", nullable=False)  # PUSH, IN_APP, TODOS
    prioridad: Mapped[str] = mapped_column(String(20), default="NORMAL", nullable=False)  # BAJA, NORMAL, ALTA, URGENTE
    leida: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)
    data_extra: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict, nullable=True)
    fecha_leida: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )

    # Relación opcional con Usuario
    usuario: Mapped[Optional["Usuario"]] = relationship("Usuario", lazy="selectin")


class DispositivoPush(Base):
    __tablename__ = "dispositivos_push"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usuario_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=True, index=True
    )
    token_dispositivo: Mapped[str] = mapped_column(String(500), unique=True, index=True, nullable=False)
    plataforma: Mapped[str] = mapped_column(String(20), default="WEB", nullable=False)  # WEB, ANDROID, IOS
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    usuario: Mapped[Optional["Usuario"]] = relationship("Usuario", lazy="selectin")
