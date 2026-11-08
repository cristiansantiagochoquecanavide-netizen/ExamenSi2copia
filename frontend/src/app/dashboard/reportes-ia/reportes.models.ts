export interface KPISummary {
  total_revenue: number;
  revenue_change_pct: number;
  active_orders: number;
  in_progress_fulfillment: number;
  conversion_rate: number;
  conversion_change_pct: number;
  avg_order_value: number;
  total_probadores: number;
  tasa_ocupacion_probadores: number;
}

export interface SalesVelocityPoint {
  periodo: string;
  monto: number;
  transacciones: number;
}

export interface InventoryAlertItem {
  prenda_id: number;
  nombre: string;
  categoria: string;
  sucursal: string;
  stock_actual: number;
  nivel_alerta: 'CRITICO' | 'BAJO' | 'NORMAL';
  mensaje: string;
  imagen_url?: string | null;
}

export interface RecentOrderRow {
  codigo_pedido: string;
  cliente_nombre: string;
  items_resumen: string;
  sucursal_o_ciudad: string;
  monto_total: number;
  estado: string;
  fecha: string;
}

export interface TopProductItem {
  prenda_id: number;
  nombre: string;
  categoria: string;
  unidades_vendidas: number;
  ingresos_totales: number;
  imagen_url?: string | null;
}

export interface FinancialIndicator {
  facturacion_actual: number;
  facturacion_anterior: number;
  variacion_pct: number;
  objetivo_mes: number;
  cumplimiento_pct: number;
  ticket_medio: number;
  pedidos_totales: number;
  unidades_vendidas: number;
  descuentos_totales: number;
  mensaje_insight: string;
  proyeccion_siguiente_mes?: number;
  proyeccion_mes_nombre?: string;
  proyeccion_variacion_pct?: number;
}

export interface ComparativeTrendPoint {
  periodo: string;
  monto_actual: number;
  monto_anterior: number;
  es_proyeccion?: boolean;
}

export interface InventoryStackedItem {
  categoria: string;
  disponible: number;
  reservado_probadores: number;
  alerta_critica: number;
}

export interface FunnelStepItem {
  etapa: string;
  cantidad: number;
  porcentaje: number;
  conversion_siguiente: number;
}

export interface DistributionSlice {
  nombre: string;
  porcentaje: number;
  cantidad: number;
  color: string;
}

export interface GeographicHub {
  sucursal: string;
  ciudad: string;
  pedidos: number;
  monto: number;
  tiempo_entrega_promedio: string;
  lat_relativa: number;
  lng_relativa: number;
}

export interface DashboardReporteResponse {
  rango: string;
  granularidad?: string;
  modo_vista?: 'HISTORICO' | 'PREDICTIVO' | 'SIN_DATOS_FUTURO';
  mensaje_futuro?: string;
  kpis: KPISummary;
  financial?: FinancialIndicator;
  comparative_trend?: ComparativeTrendPoint[];
  inventory_stacked?: InventoryStackedItem[];
  funnel_steps?: FunnelStepItem[];
  channel_distribution?: DistributionSlice[];
  order_status_donut?: DistributionSlice[];
  geographic_hubs?: GeographicHub[];
  sales_trend: SalesVelocityPoint[];
  inventory_alerts: InventoryAlertItem[];
  recent_orders: RecentOrderRow[];
  top_products: TopProductItem[];
  fecha_generacion: string;
}

export interface ConsultaVozRequest {
  query: string;
  rango_tiempo?: string;
  sucursal_id?: number;
}

export interface AnalisisVozResponse {
  intencion_detectada: string;
  pregunta: string;
  diagnostico_cuantitativo: string;
  interpretacion_negocio: string;
  recomendaciones_estrategicas: string[];
  speech_text: string;
  metricas_clave: Record<string, any>;
  filtros_sugeridos: Record<string, any>;
}
