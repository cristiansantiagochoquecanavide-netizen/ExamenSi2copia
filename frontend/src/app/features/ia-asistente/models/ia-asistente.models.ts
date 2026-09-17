export interface PreferenciaEstiloCreate {
  sector_preferido: string;
  ocasion_frecuente: string;
  estilos_preferidos: string[];
  colores_favoritos: string[];
  presupuesto_max?: number | null;
}

export interface PreferenciaEstilo {
  id: number;
  usuario_id: number;
  sector_preferido: string;
  ocasion_frecuente: string;
  estilos_preferidos: string[];
  colores_favoritos: string[];
  presupuesto_max?: number | null;
  completado: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecomendacionPrenda {
  id: number;
  sku: string;
  nombre: string;
  descripcion: string;
  precio_base: number;
  categoria_id: number;
  categoria_nombre: string;
  sector: string;
  temporada_nombre?: string;
  imagen_url?: string;
  rating_promedio: number;
  total_resenas: number;
  match_score: number;
  motivo_recomendacion: string;
  etiqueta_ia: string;
}

export interface OutfitSugerido {
  id: string;
  nombre_look: string;
  descripcion_estilo: string;
  ocasion: string;
  prendas: RecomendacionPrenda[];
  precio_total: number;
  ahorro_estimado: number;
  match_score: number;
}

export interface DashboardRecomendaciones {
  usuario_id?: number | null;
  usuario_nombre?: string | null;
  perfil_completado: boolean;
  preferencias?: PreferenciaEstilo | null;
  para_ti: RecomendacionPrenda[];
  novedades_temporada: RecomendacionPrenda[];
  outfits_destacados: OutfitSugerido[];
}

