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


class DashboardReporteResponse(BaseModel):
    rango: str
    kpis: KPISummaryResponse
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
