"""Modelos ORM SQLAlchemy para el dominio de Inteligencia Artificial y Recomendaciones (CU19)."""
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship, Mapped, mapped_column
from apps.core.database import Base


class PreferenciaEstiloUsuario(Base):
    __tablename__ = "preferencias_estilo_usuario"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usuario_id: Mapped[int] = mapped_column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    sector_preferido: Mapped[str] = mapped_column(String(50), default="UNISEX", nullable=False)  # MUJER, HOMBRE, UNISEX, NINOS
    ocasion_frecuente: Mapped[str] = mapped_column(String(50), default="CASUAL", nullable=False)  # GALA, FORMAL_OFICINA, CASUAL, COCTEL, URBANO
    estilos_preferidos: Mapped[List[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    colores_favoritos: Mapped[List[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    presupuesto_max: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    completado: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relaciones
    usuario: Mapped["app.domains.usuarios.models.Usuario"] = relationship("app.domains.usuarios.models.Usuario", lazy="selectin")


class InteraccionRecomendacion(Base):
    __tablename__ = "interacciones_recomendacion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usuario_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True)
    prenda_id: Mapped[int] = mapped_column(Integer, ForeignKey("prendas.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo_evento: Mapped[str] = mapped_column(String(30), nullable=False)  # IMPRESION, CLICK, OUTFIT_VIEW, ADD_TO_CART
    score_aplicado: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    motivo: Mapped[str] = mapped_column(String(100), nullable=False)  # AFINIDAD_COMPRAS, QUIZ_ESTILO, TEMPORADA_ACTIVA, COMPLETA_LOOK
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relaciones
    usuario: Mapped[Optional["app.domains.usuarios.models.Usuario"]] = relationship("app.domains.usuarios.models.Usuario", lazy="selectin")
    prenda: Mapped["app.domains.catalogo.models.Prenda"] = relationship("app.domains.catalogo.models.Prenda", lazy="selectin")


class SesionChatIA(Base):
    __tablename__ = "sesiones_chat_ia"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_uuid: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    usuario_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True)
    titulo: Mapped[str] = mapped_column(String(150), default="Consulta con Atelier Concierge", nullable=False)
    activa: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relaciones
    usuario: Mapped[Optional["app.domains.usuarios.models.Usuario"]] = relationship("app.domains.usuarios.models.Usuario", lazy="selectin")
    mensajes: Mapped[List["MensajeChatIA"]] = relationship("MensajeChatIA", back_populates="sesion", cascade="all, delete-orphan", lazy="selectin", order_by="MensajeChatIA.created_at")


class MensajeChatIA(Base):
    __tablename__ = "mensajes_chat_ia"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sesion_id: Mapped[int] = mapped_column(Integer, ForeignKey("sesiones_chat_ia.id", ondelete="CASCADE"), nullable=False, index=True)
    remitente: Mapped[str] = mapped_column(String(20), nullable=False)  # USUARIO, ASISTENTE
    texto: Mapped[str] = mapped_column(Text, nullable=False)
    intencion_detectada: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # BUSCAR_PRENDA, CONSULTAR_STOCK, COMBINAR_LOOK, AGENDAR_PROBADOR, POLITICAS_TIENDA, SALUDO_GENERAL
    prendas_adjuntas_ids: Mapped[List[int]] = mapped_column(ARRAY(Integer), default=list, nullable=False)
    sugerencias_rapidas: Mapped[List[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relaciones
    sesion: Mapped["SesionChatIA"] = relationship("SesionChatIA", back_populates="mensajes")


