export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  sector: 'MUJERES' | 'HOMBRES' | 'UNISEX';
  activo: boolean;
  created_at?: string;
}

export interface CategoriaCreate {
  nombre: string;
  descripcion?: string;
  sector: string;
  activo?: boolean;
}

export interface Temporada {
  id: number;
  nombre: string;
  codigo: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  activo: boolean;
  created_at?: string;
}

export interface TemporadaCreate {
  nombre: string;
  codigo: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  activo?: boolean;
}

export interface Talla {
  id: number;
  codigo: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
}

export interface TallaCreate {
  codigo: string;
  descripcion?: string;
  orden?: number;
  activo?: boolean;
}

export interface Color {
  id: number;
  nombre: string;
  codigo_hex?: string;
  codigo_rgb?: string;
  activo: boolean;
}

export interface ColorCreate {
  nombre: string;
  codigo_hex?: string;
  codigo_rgb?: string;
  activo?: boolean;
}

export interface PrendaMultimedia {
  id: number;
  prenda_id: number;
  tipo: 'IMAGEN' | 'MODELO_3D_GLB' | 'MODELO_3D_USDZ';
  url: string;
  formato: string;
  es_portada: boolean;
  created_at?: string;
}

export interface PrendaMultimediaCreate {
  tipo: 'IMAGEN' | 'MODELO_3D_GLB' | 'MODELO_3D_USDZ';
  url: string;
  formato: string;
  es_portada?: boolean;
}

export interface PrendaVarianteInput {
  talla_id: number;
  color_id: number;
  sku_variante?: string;
  codigo_barras?: string;
}

export interface Sucursal {
  id: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
  activo?: boolean;
}

export interface StockDistribucionItem {
  talla_id: number;
  color_id: number;
  sucursal_id: number;
  cantidad: number;
}

export interface PrendaVariante {
  id: number;
  prenda_id: number;
  talla_id: number;
  color_id: number;
  sku_variante: string;
  codigo_barras?: string;
  activo: boolean;
  talla?: Talla;
  color?: Color;
  prenda?: Prenda;
  stock_items?: InventarioStock[];
}

export interface UploadImagenResponse {
  url: string;
  formato: string;
  nombre_original: string;
  tamano_bytes: number;
}

export interface PrendaCreate {
  sku: string;
  nombre: string;
  descripcion: string;
  precio_base: number;
  categoria_id: number;
  temporada_id: number;
  stock_inicial?: number;
  stock_distribucion?: StockDistribucionItem[];
  activo?: boolean;
  variantes?: PrendaVarianteInput[];
  multimedia?: PrendaMultimediaCreate[];
  tallas_ids?: number[];
  colores_ids?: number[];
}

export interface PrendaUpdate {
  sku?: string;
  nombre?: string;
  descripcion?: string;
  precio_base?: number;
  categoria_id?: number;
  temporada_id?: number;
  stock_inicial?: number;
  stock_distribucion?: StockDistribucionItem[];
  activo?: boolean;
  multimedia?: PrendaMultimediaCreate[];
  tallas_ids?: number[];
  colores_ids?: number[];
}

export interface Prenda {
  id: number;
  sku: string;
  nombre: string;
  descripcion: string;
  precio_base: number;
  categoria_id: number;
  temporada_id: number;
  activo: boolean;
  created_at: string;
  categoria?: Categoria;
  temporada?: Temporada;
  multimedia: PrendaMultimedia[];
  variantes: PrendaVariante[];
  rating_promedio?: number;
  total_resenas?: number;
  stock_total?: number;
}

// ----------------- CU18: CALIFICACIONES Y RESEÑAS -----------------
export interface CalificacionUsuarioInfo {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
}

export interface Calificacion {
  id: number;
  prenda_id: number;
  usuario_id: number;
  puntuacion: number;
  ajuste_talla: 'PEQUENO' | 'FIEL' | 'GRANDE';
  calidad: number;
  titulo: string;
  comentario: string;
  compra_verificada: boolean;
  activo: boolean;
  created_at: string;
  updated_at: string;
  usuario?: CalificacionUsuarioInfo;
}

export interface CalificacionCreate {
  puntuacion: number;
  ajuste_talla: 'PEQUENO' | 'FIEL' | 'GRANDE';
  calidad: number;
  titulo: string;
  comentario: string;
}

export interface DesgloseEstrellas {
  estrellas_5: number;
  estrellas_4: number;
  estrellas_3: number;
  estrellas_2: number;
  estrellas_1: number;
}

export interface DesgloseAjuste {
  pequeno: number;
  fiel: number;
  grande: number;
}

export interface EstadisticasCalificaciones {
  promedio: number;
  total_resenas: number;
  promedio_calidad: number;
  desglose_estrellas: DesgloseEstrellas;
  desglose_ajuste: DesgloseAjuste;
  porcentaje_fiel_talla: number;
}

export interface ListadoCalificacionesResponse {
  estadisticas: EstadisticasCalificaciones;
  calificaciones: Calificacion[];
  mi_calificacion?: Calificacion | null;
  es_comprador_verificado: boolean;
}

export interface AjusteInventarioRequest {
  variante_id: number;
  sucursal_id: number;
  tipo_movimiento: 'INGRESO_INICIAL' | 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO' | 'VENTA' | 'RESERVA_APARTADA' | 'DEVOLUCION';
  cantidad: number;
  motivo: string;
}

export interface InventarioStock {
  id: number;
  variante_id: number;
  sucursal_id: number;
  cantidad_disponible: number;
  cantidad_reservada: number;
  stock_minimo: number;
  updated_at: string;
  variante?: PrendaVariante;
}

export interface CatalogoState {
  id?: string;
  name?: string;
  status: 'active' | 'inactive' | 'pending';
}

// ----------------- CU09: DIFUSIÓN DE NOVEDADES DE CATÁLOGO -----------------
export interface DifusionCatalogoCreate {
  titulo_campana: string;
  mensaje_personalizado: string;
  canal_envio: 'WHATSAPP' | 'EMAIL' | 'OMNICANAL' | 'SMS' | string;
  segmento_objetivo: 'TODOS' | 'VIP' | 'FRECUENTES' | 'EN_RIESGO' | 'NUEVOS' | string;
  prendas_destacadas?: string | null;
  programar_fecha?: string | null;
}

export interface DifusionCatalogoResponse {
  id: number;
  empresa_id?: number | null;
  titulo_campana: string;
  mensaje_personalizado: string;
  canal_envio: string;
  segmento_objetivo: string;
  prendas_destacadas?: string | null;
  total_destinatarios: number;
  tasa_apertura_estimada: number;
  estado: string;
  fecha_envio: string;
  creado_por_id?: number | null;
  created_at: string;
}

