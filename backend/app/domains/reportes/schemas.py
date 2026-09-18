from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class KPISummaryResponse(BaseModel):
    total_revenue: float
    revenue_change_pct: float
    active_orders: int
    in_progress_fulfillment: int
    conversion_rate: float
    conversion_change_pct: float
    avg_order_value: float
    total_probadores: int
    tasa_ocupacion_probadores: float

    model_config = ConfigDict(from_attributes=True)


class SalesVelocityPoint(BaseModel):
    periodo: str
    monto: float
    transacciones: int

    model_config = ConfigDict(from_attributes=True)


class InventoryAlertItem(BaseModel):
    prenda_id: int
    nombre: str
    categoria: str
    sucursal: str
    stock_actual: int
    nivel_alerta: str  # "CRITICO", "BAJO", "INFO"
    mensaje: str
    imagen_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RecentOrderRow(BaseModel):
    codigo_pedido: str
    cliente_nombre: str
    items_resumen: str
    sucursal_o_ciudad: str
    monto_total: float
    estado: str
    fecha: str

    model_config = ConfigDict(from_attributes=True)


class TopProductItem(BaseModel):
    prenda_id: int
    nombre: str
    categoria: str
    unidades_vendidas: int
    ingresos_totales: float
    imagen_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# =========================================================================
# NUEVAS ESTRUCTURAS PARA LOS 4 MÓDULOS GERENCIALES LIMPIOS
# =========================================================================

class FinancialIndicatorResponse(BaseModel):
    facturacion_actual: float
    facturacion_anterior: float
    variacion_pct: float
    objetivo_mes: float
    cumplimiento_pct: float
    ticket_medio: float
    pedidos_totales: int
    unidades_vendidas: int
    descuentos_totales: float
    mensaje_insight: str
    proyeccion_siguiente_mes: Optional[float] = None
    proyeccion_mes_nombre: Optional[str] = None
    proyeccion_variacion_pct: Optional[float] = None


class ComparativeTrendPoint(BaseModel):
    periodo: str
    monto_actual: float
    monto_anterior: float
    es_proyeccion: bool = False


class InventoryStackedItem(BaseModel):
    categoria: str
    disponible: int
    reservado_probadores: int
    alerta_critica: int


class FunnelStepItem(BaseModel):
    etapa: str
    cantidad: int
    porcentaje: float
    conversion_siguiente: float


class DistributionSlice(BaseModel):
    nombre: str
    porcentaje: float
    cantidad: int
    color: str


class GeographicHub(BaseModel):
    sucursal: str
    ciudad: str
    pedidos: int
    monto: float
    tiempo_entrega_promedio: str
    lat_relativa: float
    lng_relativa: float


class DashboardReporteResponse(BaseModel):
    rango: str
    granularidad: Optional[str] = "MES"
    kpis: KPISummaryResponse
    financial: FinancialIndicatorResponse
    comparative_trend: List[ComparativeTrendPoint]
    inventory_stacked: List[InventoryStackedItem]
    funnel_steps: List[FunnelStepItem]
    channel_distribution: List[DistributionSlice]
    order_status_donut: List[DistributionSlice]
    geographic_hubs: List[GeographicHub]
    sales_trend: List[SalesVelocityPoint]
    inventory_alerts: List[InventoryAlertItem]
    recent_orders: List[RecentOrderRow]
    top_products: List[TopProductItem]
    fecha_generacion: str

    model_config = ConfigDict(from_attributes=True)


class ConsultaVozRequest(BaseModel):
    query: str
    rango_tiempo: Optional[str] = "30D"
    sucursal_id: Optional[int] = None


class AnalisisVozResponse(BaseModel):
    intencion_detectada: str
    pregunta: str
    diagnostico_cuantitativo: str
    interpretacion_negocio: str
    recomendaciones_estrategicas: List[str]
    speech_text: str
    metricas_clave: Dict[str, Any]
    filtros_sugeridos: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)
