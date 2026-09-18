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

export interface DashboardReporteResponse {
  rango: string;
  kpis: KPISummary;
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
