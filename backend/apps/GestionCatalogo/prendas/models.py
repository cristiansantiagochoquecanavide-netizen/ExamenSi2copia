from datetime import datetime, timezone, date
from typing import List, Optional
from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from apps.core.database import Base

# ----------------- CU5: CATEGORIAS, TALLAS, COLORES, TEMPORADAS -----------------
class Categoria(Base):
    __tablename__ = "categorias"
    __table_args__ = (
        UniqueConstraint("nombre", "sector", name="uq_categorias_nombre_sector"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    sector: Mapped[str] = mapped_column(String(50), default="UNISEX", nullable=False)  # MUJERES, HOMBRES, UNISEX
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    prendas: Mapped[List["Prenda"]] = relationship("Prenda", back_populates="categoria")


class Talla(Base):
    __tablename__ = "tallas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    orden: Mapped[int] = mapped_column(Integer, default=0)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)


class Color(Base):
    __tablename__ = "colores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    codigo_hex: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # Ej: #131313
    codigo_rgb: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)  # Ej: rgb(19, 19, 19)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)


class Temporada(Base):
    __tablename__ = "temporadas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    codigo: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    fecha_inicio: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    fecha_fin: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    prendas: Mapped[List["Prenda"]] = relationship("Prenda", back_populates="temporada")


# ----------------- CU6: PRENDAS, MULTIMEDIA AR Y CONTROL DE INVENTARIO -----------------
# ==========================================================================
# CASO DE USO: CU06 - ADMINISTRAR CATÁLOGO DE PRENDAS
# CAPA MVC: [MODELO DE BASE DE DATOS / ENTIDAD ORM PRENDA]
# ==========================================================================
class Prenda(Base):
    __tablename__ = "prendas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    empresa_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)  # Multitenant ID
    sku: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(150), index=True, nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    precio_base: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    categoria_id: Mapped[int] = mapped_column(Integer, ForeignKey("categorias.id"), nullable=False)
    temporada_id: Mapped[int] = mapped_column(Integer, ForeignKey("temporadas.id"), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    categoria: Mapped["Categoria"] = relationship("Categoria", back_populates="prendas", lazy="selectin")
    temporada: Mapped["Temporada"] = relationship("Temporada", back_populates="prendas", lazy="selectin")
    multimedia: Mapped[List["PrendaMultimedia"]] = relationship("PrendaMultimedia", back_populates="prenda", cascade="all, delete-orphan", lazy="selectin")
    variantes: Mapped[List["PrendaVariante"]] = relationship("PrendaVariante", back_populates="prenda", cascade="all, delete-orphan", lazy="selectin")
    calificaciones: Mapped[List["CalificacionPrenda"]] = relationship("CalificacionPrenda", back_populates="prenda", cascade="all, delete-orphan", lazy="selectin")

    @property
    def rating_promedio(self) -> float:
        califs = [c for c in (self.calificaciones or []) if getattr(c, "activo", True)]
        if not califs:
            return 0.0
        return round(sum(c.puntuacion for c in califs) / len(califs), 1)

    @property
    def total_resenas(self) -> int:
        return sum(1 for c in (self.calificaciones or []) if getattr(c, "activo", True))

    @property
    def stock_total(self) -> int:
        total = 0
        for var in (self.variantes or []):
            for stk in (getattr(var, "stock_items", []) or []):
                total += getattr(stk, "cantidad_disponible", 0)
        return total


class PrendaMultimedia(Base):
    __tablename__ = "prenda_multimedia"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    prenda_id: Mapped[int] = mapped_column(Integer, ForeignKey("prendas.id", ondelete="CASCADE"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)  # IMAGEN, MODELO_3D_GLB, MODELO_3D_USDZ
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    formato: Mapped[str] = mapped_column(String(20), nullable=False)  # .glb, .usdz, .jpg, .png, .webp
    es_portada: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    prenda: Mapped["Prenda"] = relationship("Prenda", back_populates="multimedia")


class PrendaVariante(Base):
    __tablename__ = "prenda_variantes"
    __table_args__ = (
        UniqueConstraint("prenda_id", "talla_id", "color_id", name="uq_prenda_talla_color"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    prenda_id: Mapped[int] = mapped_column(Integer, ForeignKey("prendas.id", ondelete="CASCADE"), nullable=False)
    talla_id: Mapped[int] = mapped_column(Integer, ForeignKey("tallas.id"), nullable=False)
    color_id: Mapped[int] = mapped_column(Integer, ForeignKey("colores.id"), nullable=False)
    sku_variante: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    codigo_barras: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    prenda: Mapped["Prenda"] = relationship("Prenda", back_populates="variantes")
    talla: Mapped["Talla"] = relationship("Talla", lazy="selectin")
    color: Mapped["Color"] = relationship("Color", lazy="selectin")
    stock_items: Mapped[List["InventarioStock"]] = relationship("InventarioStock", back_populates="variante", cascade="all, delete-orphan", lazy="selectin")


class InventarioStock(Base):
    __tablename__ = "inventario_stock"
    __table_args__ = (
        UniqueConstraint("variante_id", "sucursal_id", name="uq_variante_sucursal"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    variante_id: Mapped[int] = mapped_column(Integer, ForeignKey("prenda_variantes.id", ondelete="CASCADE"), nullable=False)
    sucursal_id: Mapped[int] = mapped_column(Integer, ForeignKey("sucursales.id"), nullable=False, index=True)
    cantidad_disponible: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cantidad_reservada: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stock_minimo: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    variante: Mapped["PrendaVariante"] = relationship("PrendaVariante", back_populates="stock_items", lazy="selectin")
    movimientos: Mapped[List["MovimientoInventario"]] = relationship("MovimientoInventario", back_populates="stock", cascade="all, delete-orphan")


class MovimientoInventario(Base):
    __tablename__ = "movimientos_inventario"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    stock_id: Mapped[int] = mapped_column(Integer, ForeignKey("inventario_stock.id", ondelete="CASCADE"), nullable=False)
    tipo_movimiento: Mapped[str] = mapped_column(String(50), nullable=False)  # INGRESO_INICIAL, AJUSTE_POSITIVO, AJUSTE_NEGATIVO, VENTA, RESERVA_APARTADA, DEVOLUCION
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    cantidad_anterior: Mapped[int] = mapped_column(Integer, nullable=False)
    cantidad_nueva: Mapped[int] = mapped_column(Integer, nullable=False)
    motivo: Mapped[str] = mapped_column(String(255), nullable=False)
    usuario_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    stock: Mapped["InventarioStock"] = relationship("InventarioStock", back_populates="movimientos")


# ----------------- CU18: CALIFICACIONES Y RESEÑAS DE PRENDAS -----------------
# ==========================================================================
# CASO DE USO: CU18 - CALIFICACIONES Y RESEÑAS DE PRENDAS
# CAPA MVC: [MODELO DE BASE DE DATOS / ENTIDAD ORM RESEÑAS]
# ==========================================================================
class CalificacionPrenda(Base):
    __tablename__ = "calificaciones_prenda"
    __table_args__ = (
        UniqueConstraint("prenda_id", "usuario_id", name="uq_prenda_usuario_calificacion"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    prenda_id: Mapped[int] = mapped_column(Integer, ForeignKey("prendas.id", ondelete="CASCADE"), nullable=False, index=True)
    usuario_id: Mapped[int] = mapped_column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    puntuacion: Mapped[int] = mapped_column(Integer, nullable=False)
    ajuste_talla: Mapped[str] = mapped_column(String(20), default="FIEL", nullable=False)  # PEQUENO, FIEL, GRANDE
    calidad: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    titulo: Mapped[str] = mapped_column(String(150), nullable=False)
    comentario: Mapped[str] = mapped_column(Text, nullable=False)
    compra_verificada: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    prenda: Mapped["Prenda"] = relationship("Prenda", back_populates="calificaciones")
    usuario: Mapped["app.domains.usuarios.models.Usuario"] = relationship("app.domains.usuarios.models.Usuario", lazy="selectin")

# ----------------- CU09: DIFUSIÓN DE NOVEDADES DE CATÁLOGO -----------------
# ==========================================================================
# CASO DE USO: CU09 - DIFUSIÓN DE NOVEDADES DE CATÁLOGO A CLIENTES
# CAPA MVC: [MODELO DE BASE DE DATOS / ENTIDAD ORM CAMPAÑA DIFUSIÓN]
# ==========================================================================
class DifusionCatalogo(Base):
    __tablename__ = "difusion_catalogo"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    empresa_id: Mapped[Optional[int]] = mapped_column(ForeignKey("empresa.id"), nullable=True, index=True)
    titulo_campana: Mapped[str] = mapped_column(String(150), nullable=False)
    mensaje_personalizado: Mapped[str] = mapped_column(Text, nullable=False)
    canal_envio: Mapped[str] = mapped_column(String(50), default="OMNICANAL", nullable=False)  # WHATSAPP, EMAIL, OMNICANAL, SMS
    segmento_objetivo: Mapped[str] = mapped_column(String(50), default="TODOS", nullable=False)  # TODOS, VIP, FRECUENTES, EN_RIESGO, NUEVOS
    prendas_destacadas: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON o lista de SKUs/nombres
    total_destinatarios: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tasa_apertura_estimada: Mapped[float] = mapped_column(Float, default=78.5, nullable=False)
    estado: Mapped[str] = mapped_column(String(30), default="ENVIADA", nullable=False)  # BORRADOR, PROGRAMADA, ENVIADA
    fecha_envio: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    creado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

