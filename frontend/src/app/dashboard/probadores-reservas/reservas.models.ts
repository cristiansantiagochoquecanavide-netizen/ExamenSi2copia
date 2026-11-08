import { Sucursal } from '../inventario-stock/inventario.models';
import { PrendaVariante } from '../catalogo-prendas/catalogo.models';

export interface DetalleReservaCreate {
  variante_id: number;
  cantidad: number;
}

export interface DetalleReserva {
  id: number;
  reserva_id: number;
  variante_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  probada: boolean;
  comprada: boolean;
  variante?: PrendaVariante;
}

export interface ReservaCreate {
  sucursal_id: number;
  fecha_reserva: string; // YYYY-MM-DD
  hora_estimada: string; // HH:MM
  cliente_id?: number | null;
  monto_anticipo: number;
  moneda: 'USD' | 'BOB';
  observaciones?: string | null;
  detalles: DetalleReservaCreate[];
}

export interface Reserva {
  id: number;
  codigo_reserva: string;
  cliente_id: number;
  sucursal_id: number;
  fecha_reserva: string;
  hora_estimada: string;
  estado: 'PENDIENTE' | 'CONFIRMADA' | 'EN_PROBADOR' | 'COMPLETADA' | 'CANCELADA' | 'EXPIRADA' | string;
  monto_anticipo: number;
  moneda: string;
  observaciones?: string | null;
  qr_token?: string | null;
  qr_svg?: string | null;
  probador_asignado?: string | null;
  atendido_por_id?: number | null;
  created_at: string;
  updated_at: string;
  cliente?: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
  };
  atendido_por?: {
    id: number;
    nombre: string;
    apellido?: string;
    email: string;
  };
  sucursal?: Sucursal;
  detalles: DetalleReserva[];
}

export interface ReservaCancelarRequest {
  motivo?: string;
}

// ----------------- CU14: ATENCIÓN EN PROBADORES -----------------
export interface AsignarProbadorRequest {
  probador: string;
  observaciones?: string | null;
}

export interface ResultadoDetalleInput {
  detalle_id: number;
  probada: boolean;
  comprada: boolean;
}

export interface FinalizarPruebaRequest {
  resultados: ResultadoDetalleInput[];
  derivar_a_pos: boolean;
  observaciones?: string | null;
}

export interface ReservaExpirarRequest {
  motivo?: string | null;
}

// ----------------- CU25: TRAZABILIDAD Y CICLO DE VIDA DE RESERVAS -----------------
export interface HitoTrazabilidadItem {
  etiqueta: string;
  descripcion: string;
  completado: boolean;
  fecha_hora?: string | null;
  icono: string;
  color_hex: string;
}

export interface ReservaTrazabilidadResponse {
  id: number;
  codigo_reserva: string;
  qr_token?: string | null;
  qr_svg?: string | null;
  cliente_nombre: string;
  cliente_email?: string | null;
  sucursal_nombre: string;
  sucursal_direccion?: string | null;
  fecha_reserva: string;
  hora_estimada: string;
  estado: string;
  esta_expirada: boolean;
  tiempo_restante_minutos?: number | null;
  probador_asignado?: string | null;
  observaciones?: string | null;
  hitos: HitoTrazabilidadItem[];
  detalles: DetalleReserva[];
  acciones_disponibles: string[];
}

