from datetime import datetime, timezone, date
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, JSON
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.core.database import Base


# ----------------- MODULO 7: PLATAFORMA SAAS Y PLANES DE SUSCRIPCIÓN -----------------
class PlanSuscripcion(Base):
    __tablename__ = "plan_suscripcion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)  # 'BASICO', 'INTERMEDIO', 'VIP'
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    precio_mensual: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    limite_sucursales: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    permite_ia: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    permite_offline: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    suscripciones: Mapped[List["Suscripcion"]] = relationship("Suscripcion", back_populates="plan")


class Empresa(Base):
    __tablename__ = "empresa"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    razon_social: Mapped[str] = mapped_column(String(150), nullable=False)
    nit: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    subdominio: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email_corporativo: Mapped[str] = mapped_column(String(150), nullable=False)
    telefono: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    direccion_fiscal: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    suscripciones: Mapped[List["Suscripcion"]] = relationship("Suscripcion", back_populates="empresa", cascade="all, delete-orphan")
    politica_garantia: Mapped[Optional["PoliticaGarantia"]] = relationship("PoliticaGarantia", back_populates="empresa", uselist=False, cascade="all, delete-orphan")


class Suscripcion(Base):
    __tablename__ = "suscripcion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    empresa_id: Mapped[int] = mapped_column(Integer, ForeignKey("empresa.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey("plan_suscripcion.id"), nullable=False)
    fecha_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_fin: Mapped[date] = mapped_column(Date, nullable=False)
    estado: Mapped[str] = mapped_column(String(20), default="ACTIVA", nullable=False)  # PRUEBA, ACTIVA, VENCIDA, CANCELADA, SUSPENDIDA
    monto_pago: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    renovacion_automatica: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    actualizado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    empresa: Mapped["Empresa"] = relationship("Empresa", back_populates="suscripciones")
    plan: Mapped["PlanSuscripcion"] = relationship("PlanSuscripcion", back_populates="suscripciones", lazy="selectin")


# ----------------- MODULO 8: GUÍA ANATÓMICA Y POLÍTICAS DE GARANTÍA -----------------
class GuiaMedida(Base):
    __tablename__ = "guia_medida"
    __table_args__ = (
        UniqueConstraint("producto_id", "talla_id", name="uq_guia_producto_talla"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    producto_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    talla_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    pecho_cm: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    cintura_cm: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    cadera_cm: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    largo_cm: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    manga_cm: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True)
    observacion_calce: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)


class PoliticaGarantia(Base):
    __tablename__ = "politica_garantia"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    empresa_id: Mapped[int] = mapped_column(Integer, ForeignKey("empresa.id", ondelete="CASCADE"), unique=True, nullable=False)
    plazo_dias_cambio: Mapped[int] = mapped_column(Integer, default=7, nullable=False)
    permite_cambio_talla: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    admite_reembolso_dinero: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # Regla RN07 inmutable
    requiere_etiqueta_original: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    empresa: Mapped["Empresa"] = relationship("Empresa", back_populates="politica_garantia")


class NotaDevolucion(Base):
    __tablename__ = "nota_devolucion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo_devolucion: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    empresa_id: Mapped[int] = mapped_column(Integer, ForeignKey("empresa.id"), nullable=False, index=True)
    venta_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    sucursal_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    usuario_id: Mapped[int] = mapped_column(Integer, nullable=False)
    cliente_id: Mapped[int] = mapped_column(Integer, nullable=False)
    motivo: Mapped[str] = mapped_column(String(50), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), default="COMPLETADA", nullable=False)
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fecha_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    detalles: Mapped[List["DetalleNotaDevolucion"]] = relationship("DetalleNotaDevolucion", back_populates="nota", cascade="all, delete-orphan")


class DetalleNotaDevolucion(Base):
    __tablename__ = "detalle_nota_devolucion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nota_devolucion_id: Mapped[int] = mapped_column(Integer, ForeignKey("nota_devolucion.id", ondelete="CASCADE"), nullable=False)
    variante_devuelta_id: Mapped[int] = mapped_column(Integer, nullable=False)
    cantidad_devuelta: Mapped[int] = mapped_column(Integer, nullable=False)
    variante_entregada_id: Mapped[int] = mapped_column(Integer, nullable=False)
    cantidad_entregada: Mapped[int] = mapped_column(Integer, nullable=False)
    diferencia_monetaria: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)

    nota: Mapped["NotaDevolucion"] = relationship("NotaDevolucion", back_populates="detalles")


# ----------------- MODULO 9: TRASPASOS MULTI-SUCURSAL -----------------
class TraspasoInventario(Base):
    __tablename__ = "traspaso_inventario"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo_traspaso: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    empresa_id: Mapped[int] = mapped_column(Integer, ForeignKey("empresa.id"), nullable=False, index=True)
    sucursal_origen_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    sucursal_destino_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    usuario_despacha_id: Mapped[int] = mapped_column(Integer, nullable=False)
    usuario_recibe_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    estado: Mapped[str] = mapped_column(String(30), default="SOLICITADO", nullable=False)
    motivo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fecha_solicitud: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    fecha_despacho: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    fecha_recepcion: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    detalles: Mapped[List["DetalleTraspaso"]] = relationship("DetalleTraspaso", back_populates="traspaso", cascade="all, delete-orphan")


class DetalleTraspaso(Base):
    __tablename__ = "detalle_traspaso"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    traspaso_id: Mapped[int] = mapped_column(Integer, ForeignKey("traspaso_inventario.id", ondelete="CASCADE"), nullable=False)
    producto_variante_id: Mapped[int] = mapped_column(Integer, nullable=False)
    cantidad_enviada: Mapped[int] = mapped_column(Integer, nullable=False)
    cantidad_recibida: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    traspaso: Mapped["TraspasoInventario"] = relationship("TraspasoInventario", back_populates="detalles")


# ----------------- MODULO 10: PERSISTENCIA OFFLINE -----------------
class SincronizacionOffline(Base):
    __tablename__ = "sincronizacion_offline"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    empresa_id: Mapped[int] = mapped_column(Integer, ForeignKey("empresa.id"), nullable=False, index=True)
    sucursal_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    usuario_id: Mapped[int] = mapped_column(Integer, nullable=False)
    uuid_operacion: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    tipo_operacion: Mapped[str] = mapped_column(String(30), nullable=False)
    payload_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    estado: Mapped[str] = mapped_column(String(20), default="PENDIENTE", nullable=False)
    fecha_registro_local: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    fecha_sincronizacion: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    error_detalle: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class ConflictoInventario(Base):
    __tablename__ = "conflicto_inventario"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sincronizacion_id: Mapped[int] = mapped_column(Integer, ForeignKey("sincronizacion_offline.id", ondelete="CASCADE"), nullable=False)
    producto_variante_id: Mapped[int] = mapped_column(Integer, nullable=False)
    sucursal_id: Mapped[int] = mapped_column(Integer, nullable=False)
    cantidad_solicitada: Mapped[int] = mapped_column(Integer, nullable=False)
    stock_disponible_servidor: Mapped[int] = mapped_column(Integer, nullable=False)
    estado_resolucion: Mapped[str] = mapped_column(String(30), default="PENDIENTE", nullable=False)
    resuelto_por_usuario_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    fecha_deteccion: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    fecha_resolucion: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


# ----------------- MODULO 11: ANALÍTICA E IA GENERATIVA -----------------
class ReporteGenerativoIA(Base):
    __tablename__ = "reporte_generativo_ia"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    empresa_id: Mapped[int] = mapped_column(Integer, ForeignKey("empresa.id", ondelete="CASCADE"), nullable=False, index=True)
    usuario_id: Mapped[int] = mapped_column(Integer, nullable=False)
    prompt_consulta: Mapped[str] = mapped_column(Text, nullable=False)
    tipo_entrada: Mapped[str] = mapped_column(String(20), default="TEXTO", nullable=False)
    sql_generado: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    respuesta_resumen: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    formato_exportacion: Mapped[str] = mapped_column(String(20), default="PANTALLA", nullable=False)
    fecha_consulta: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ModeloAnaliticoML(Base):
    __tablename__ = "modelo_analitico_ml"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    empresa_id: Mapped[int] = mapped_column(Integer, ForeignKey("empresa.id", ondelete="CASCADE"), nullable=False, index=True)
    nombre_modelo: Mapped[str] = mapped_column(String(100), nullable=False)
    tipo_aprendizaje: Mapped[str] = mapped_column(String(50), nullable=False)
    variable_objetivo: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    precision_metrica: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 4), nullable=True)
    parametros_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    fecha_entrenamiento: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
