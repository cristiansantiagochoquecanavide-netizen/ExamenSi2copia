"""Esquemas Pydantic para el dominio de Inteligencia Artificial y Recomendaciones (CU19)."""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class BaseIaasistenteSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class IaasistenteStatusResponse(BaseModel):
    domain: str = "ia_asistente"
    status: str = "active"
    message: str = "Dominio Inteligencia Artificial y Recomendaciones operativo"


# --- PREFERENCIAS DE ESTILO (QUIZ) ---
class PreferenciaEstiloCreate(BaseModel):
    sector_preferido: str = Field(default="UNISEX", description="MUJER, HOMBRE, UNISEX, NINOS")
    ocasion_frecuente: str = Field(default="CASUAL", description="GALA, FORMAL_OFICINA, CASUAL, COCTEL, URBANO")
    estilos_preferidos: List[str] = Field(default_factory=list, description="Lista de estilos: Minimalista, Elegante, etc.")
    colores_favoritos: List[str] = Field(default_factory=list, description="Lista de colores favoritos")
    presupuesto_max: Optional[float] = Field(default=None, description="Presupuesto máximo sugerido")


class PreferenciaEstiloResponse(BaseIaasistenteSchema):
    id: int
    usuario_id: int
    sector_preferido: str
    ocasion_frecuente: str
    estilos_preferidos: List[str]
    colores_favoritos: List[str]
    presupuesto_max: Optional[float] = None
    completado: bool
    created_at: datetime
    updated_at: datetime


# --- ITEMS DE RECOMENDACIÓN INDIVIDUAL ---
class RecomendacionPrendaItem(BaseModel):
    id: int
    sku: str
    nombre: str
    descripcion: str
    precio_base: float
    categoria_id: int
    categoria_nombre: str
    sector: str
    temporada_nombre: Optional[str] = None
    imagen_url: Optional[str] = None
    rating_promedio: float = 5.0
    total_resenas: int = 0
    match_score: int = Field(default=95, description="Porcentaje de afinidad calculado por el algoritmo de IA (0-100)")
    motivo_recomendacion: str = Field(description="Explicación en lenguaje natural del por qué se recomienda")
    etiqueta_ia: str = Field(default="MATCH RECOMENDADO", description="Badge distintivo (ej. MATCH PERFECTO, TENDENCIA)")


# --- OUTFIT / COMPLETA TU LOOK ---
class OutfitSugeridoResponse(BaseModel):
    id: str
    nombre_look: str
    descripcion_estilo: str
    ocasion: str
    prendas: List[RecomendacionPrendaItem]
    precio_total: float
    ahorro_estimado: float = 0.0
    match_score: int = 95


# --- DASHBOARD COMPLETO DE RECOMENDACIONES IA ---
class DashboardRecomendacionesResponse(BaseModel):
    usuario_id: Optional[int] = None
    usuario_nombre: Optional[str] = None
    perfil_completado: bool = False
    preferencias: Optional[PreferenciaEstiloResponse] = None
    para_ti: List[RecomendacionPrendaItem] = Field(default_factory=list)
    novedades_temporada: List[RecomendacionPrendaItem] = Field(default_factory=list)
    outfits_destacados: List[OutfitSugeridoResponse] = Field(default_factory=list)


# --- TELEMETRÍA DE INTERACCIONES ---
class InteraccionCreate(BaseModel):
    prenda_id: int
    tipo_evento: str = Field(default="CLICK", description="IMPRESION, CLICK, OUTFIT_VIEW, ADD_TO_CART")
    score_aplicado: Optional[float] = 0.0
    motivo: Optional[str] = "EXPLORACION"


# --- CHATBOT / ASISTENTE VIRTUAL IA (CU20) ---
class PrendaChatCardResponse(BaseModel):
    id: int
    nombre: str
    sku: str
    precio_base: float
    categoria_nombre: str
    sector: str
    imagen_url: Optional[str] = None
    rating_promedio: float = 5.0
    total_resenas: int = 0


class MensajeChatCreate(BaseModel):
    texto: str = Field(min_length=1, max_length=1000, description="Texto de la consulta del usuario")
    session_uuid: Optional[str] = Field(default=None, description="UUID de la sesión existente si la hubiere")


class MensajeChatResponse(BaseIaasistenteSchema):
    id: int
    session_uuid: Optional[str] = None
    remitente: str
    texto: str
    intencion_detectada: Optional[str] = None
    prendas_recomendadas: List[PrendaChatCardResponse] = Field(default_factory=list)
    sugerencias_rapidas: List[str] = Field(default_factory=list)
    created_at: datetime


class SesionChatResponse(BaseIaasistenteSchema):
    session_uuid: str
    titulo: str
    mensajes: List[MensajeChatResponse] = Field(default_factory=list)
    created_at: datetime


class SesionChatResumen(BaseModel):
    session_uuid: str
    titulo: str
    total_mensajes: int
    updated_at: datetime


