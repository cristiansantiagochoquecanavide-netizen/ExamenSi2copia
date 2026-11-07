"""
Esquemas Pydantic v2 (Contratos de API) para Presentación 3: IA Generativa y Machine Learning.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


# ==============================================================================
# 1. CONTRATOS CU21 & CU22: CONSULTAS DE LENGUAJE NATURAL Y EXPORTACIÓN
# ==============================================================================

class ConsultaIARequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=1000, description="Pregunta comercial en lenguaje natural")
    tipo_entrada: str = Field(default="TEXTO", pattern="^(TEXTO|VOZ)$", description="Canal de entrada: TEXTO o VOZ")
    audio_base64: Optional[str] = Field(default=None, description="Audio opcional codificado en Base64 si tipo_entrada es VOZ")


class ConsultaIAResponse(BaseModel):
    reporte_id: int
    empresa_id: int
    empresa_nombre: str
    prompt_consulta: str
    tipo_entrada: str
    sql_generado: str
    respuesta_resumen: str
    columnas: List[str]
    datos_tabulares: List[Dict[str, Any]]
    formato_exportacion: str = "PANTALLA"
    motor_ia: str = "Google Gemini 1.5 Flash"
    fecha_consulta: datetime

    model_config = ConfigDict(from_attributes=True)


class ReporteIAHistorialItem(BaseModel):
    reporte_id: int
    empresa_id: int
    prompt_consulta: str
    tipo_entrada: str
    sql_generado: Optional[str] = None
    respuesta_resumen: Optional[str] = None
    formato_exportacion: str
    fecha_consulta: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# 2. CONTRATOS CU23: MACHINE LEARNING SUPERVISADO Y NO SUPERVISADO
# ==============================================================================

class MLDemandaTrainRequest(BaseModel):
    algoritmo: str = Field(default="RandomForestRegressor", description="RandomForestRegressor o RidgeRegression")
    dias_historico: int = Field(default=90, ge=30, le=365)
    test_size: float = Field(default=0.2, ge=0.1, le=0.4)


class ProyeccionStockItem(BaseModel):
    prenda: str
    talla: str
    sucursal: str
    stock_actual: int
    demanda_proyectada_7d: int
    riesgo_quiebre: str


class PuntoComparativoDemanda(BaseModel):
    indice: int
    etiqueta: str
    demanda_real: float
    demanda_predicha: float


class MLDemandaTrainResponse(BaseModel):
    modelo_id: int
    empresa_id: int
    nombre_modelo: str
    tipo_aprendizaje: str
    variable_objetivo: str
    precision_r2: float
    mae: float
    rmse: float
    parametros: Dict[str, Any]
    importancia_variables: List[Dict[str, Any]] = Field(default_factory=list)
    serie_comparativa: List[PuntoComparativoDemanda] = Field(default_factory=list)
    proyecciones_stock: List[ProyeccionStockItem] = Field(default_factory=list)
    fecha_entrenamiento: datetime


class MLRFMTrainRequest(BaseModel):
    num_clusters: int = Field(default=3, ge=2, le=6)


class PerfilClusterRFM(BaseModel):
    cluster: int
    nombre: str
    cantidad_clientes: int
    recencia_dias: float
    frecuencia_compras: float
    gasto_medio_bs: float
    accion_sugerida: str
    color_hex: str


class PuntoClienteRFM(BaseModel):
    cliente: str
    cluster: int
    segmento: str
    recencia_dias: float
    frecuencia_compras: int
    monto_total_bs: float


class PuntoCodoWCSS(BaseModel):
    k: int
    wcss: float


class MLRFMTrainResponse(BaseModel):
    modelo_id: int
    empresa_id: int
    nombre_modelo: str
    tipo_aprendizaje: str
    num_clusters: int
    total_clientes_analizados: int
    silhouette_score: float
    inercia_wcss: float
    perfiles_clusters: List[PerfilClusterRFM]
    puntos_clientes: List[PuntoClienteRFM] = Field(default_factory=list)
    curva_codo: List[PuntoCodoWCSS] = Field(default_factory=list)
    fecha_entrenamiento: datetime


class MLEntrenarTodoResponse(BaseModel):
    empresa_id: int
    supervisado_demanda: MLDemandaTrainResponse
    no_supervisado_rfm: MLRFMTrainResponse


class ModeloMLPersistedItem(BaseModel):
    id: int
    empresa_id: int
    nombre_modelo: str
    tipo_aprendizaje: str
    variable_objetivo: Optional[str] = None
    precision_metrica: Optional[float] = None
    parametros_json: Optional[Dict[str, Any]] = None
    fecha_entrenamiento: datetime
    activo: bool

    model_config = ConfigDict(from_attributes=True)
