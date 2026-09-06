export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  sector: 'MUJERES' | 'HOMBRES' | 'NINOS' | 'UNISEX';
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
}

export interface PrendaCreate {
  sku: string;
  nombre: string;
  descripcion: string;
  precio_base: number;
  categoria_id: number;
  temporada_id: number;
  variantes?: PrendaVarianteInput[];
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
