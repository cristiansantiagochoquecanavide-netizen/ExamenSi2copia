export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  sector: string;
  activo: boolean;
}

export interface Temporada {
  id: number;
  nombre: string;
  codigo: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  activo: boolean;
}

export interface Talla {
  id: number;
  codigo: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
}

export interface Color {
  id: number;
  nombre: string;
  codigo_hex?: string;
  codigo_rgb?: string;
  activo: boolean;
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

export interface CatalogoState {
  id?: string;
  name?: string;
  status: 'active' | 'inactive' | 'pending';
}
