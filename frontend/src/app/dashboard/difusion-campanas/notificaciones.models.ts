export interface Notificacion {
  id: number;
  usuario_id?: number | null;
  titulo: string;
  mensaje: string;
  tipo: 'RESERVA_PROBADOR' | 'ESTADO_PEDIDO' | 'PROMOCION' | 'RECOMENDACION_IA' | 'ALERTA_STOCK' | 'SISTEMA' | string;
  canal: 'PUSH' | 'IN_APP' | 'TODOS' | string;
  prioridad: 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE' | string;
  leida: boolean;
  data_extra?: Record<string, any> | null;
  fecha_leida?: string | null;
  created_at: string;
}

export interface NotificacionResumen {
  total_no_leidas: number;
  ultimas: Notificacion[];
}

export interface DispositivoSuscripcion {
  token_dispositivo: string;
  plataforma: 'WEB' | 'ANDROID' | 'IOS' | string;
}

export interface EmitirAlertaTestRequest {
  tipo: string;
  usuario_id?: number | null;
  custom_title?: string | null;
  custom_message?: string | null;
  data_extra?: Record<string, any> | null;
}
