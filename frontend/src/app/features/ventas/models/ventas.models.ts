import { Sucursal } from '../../inventario/models/inventario.models';
import { PrendaVariante } from '../../catalogo/models/catalogo.models';
import { UsuarioResponse } from '../../usuarios/models/usuarios.models';

export interface DetalleVentaCreate {
  variante_id: number;
  cantidad: number;
  precio_unitario?: number;
}

export interface PagoCreate {
  metodo_pago: 'EFECTIVO' | 'TARJETA' | 'QR_SIMPLE';
  monto?: number;
  monto_entregado?: number;
  transaccion_externa_id?: string;
}

export interface VentaPOSCreate {
  sucursal_id: number;
  cliente_id?: number | null;
  cliente_nombre: string;
  cliente_nit: string;
  descuento?: number;
  observaciones?: string;
  detalles: DetalleVentaCreate[];
  pago: PagoCreate;
}

export interface DetalleVentaResponse {
  id: number;
  venta_id: number;
  variante_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  variante?: PrendaVariante;
}

export interface PagoResponse {
  id: number;
  venta_id?: number | null;
  reserva_id?: number | null;
  metodo_pago: string;
  pasarela?: string | null;
  monto: number;
  moneda: string;
  estado_pago: 'PENDIENTE' | 'CONFIRMADO' | 'RECHAZADO' | 'REVERTIDO' | string;
  transaccion_externa_id?: string | null;
  cliente_email?: string | null;
  qr_payload?: string | null;
  datos_transaccion?: string | null;
  fecha_hora: string;
}

export interface VentaResponse {
  id: number;
  codigo_venta: string;
  sucursal_id: number;
  usuario_id: number;
  cliente_id?: number | null;
  canal_venta: string;
  cliente_nombre: string;
  cliente_nit: string;
  subtotal: number;
  descuento: number;
  costo_envio: number;
  total: number;
  estado: 'PAGADA' | 'PENDIENTE' | 'ANULADA';
  observaciones?: string | null;
  created_at: string;
  updated_at: string;
  sucursal?: Sucursal;
  cajero?: UsuarioResponse;
  cliente?: UsuarioResponse | null;
  detalles: DetalleVentaResponse[];
  pagos: PagoResponse[];
}

// ----------------- CU11: DEVOLUCIONES Y CAMBIOS -----------------
export interface DetalleDevolucionCreate {
  variante_devuelta_id: number;
  cantidad_devuelta: number;
  condicion_prenda: 'APTO_PARA_VENTA' | 'DEFECTUOSO_MERMA';
  variante_cambio_id?: number | null;
  cantidad_cambio?: number | null;
}

export interface DevolucionCreate {
  venta_id: number;
  sucursal_id: number;
  tipo: 'DEVOLUCION' | 'CAMBIO';
  motivo: 'CAMBIO_TALLA' | 'FALLA_FABRICA' | 'DISCONFORMIDAD' | 'OTRO';
  metodo_reembolso?: 'EFECTIVO' | 'TARJETA' | 'SALDO_FAVOR' | 'NO_APLICA';
  observaciones?: string;
  detalles: DetalleDevolucionCreate[];
}

export interface DetalleDevolucionResponse {
  id: number;
  devolucion_id: number;
  variante_devuelta_id: number;
  cantidad_devuelta: number;
  precio_unitario_devuelto: number;
  subtotal_devuelto: number;
  condicion_prenda: string;
  variante_cambio_id?: number | null;
  cantidad_cambio?: number | null;
  precio_unitario_cambio?: number | null;
  subtotal_cambio?: number | null;
  diferencia_linea: number;
  variante_devuelta?: PrendaVariante;
  variante_cambio?: PrendaVariante | null;
}

export interface DevolucionResponse {
  id: number;
  codigo: string;
  venta_id: number;
  sucursal_id: number;
  usuario_id: number;
  tipo: string;
  motivo: string;
  estado: string;
  total_devuelto: number;
  total_nuevo: number;
  diferencia: number;
  metodo_reembolso?: string | null;
  observaciones?: string | null;
  created_at: string;
  updated_at: string;
  venta?: VentaResponse;
  sucursal?: Sucursal;
  cajero?: UsuarioResponse;
  detalles: DetalleDevolucionResponse[];
}

export interface VentaParaDevolucionItem {
  detalle_id: number;
  variante_id: number;
  sku: string;
  prenda_nombre: string;
  talla: string;
  color: string;
  precio_unitario: number;
  cantidad_comprada: number;
  cantidad_ya_devuelta: number;
  cantidad_disponible_devolucion: number;
}

export interface VentaParaDevolucionResponse {
  id: number;
  codigo_venta: string;
  sucursal_id: number;
  sucursal_nombre: string;
  fecha: string;
  cliente_nombre: string;
  cliente_nit: string;
  total: number;
  estado: string;
  cajero_nombre: string;
  items: VentaParaDevolucionItem[];
}

// ----------------- CU12: PAGOS ELECTRÓNICOS -----------------
export interface DatosTarjetaInput {
  numero: string;
  mes_exp: string;
  anio_exp: string;
  cvc: string;
  titular: string;
}

export interface PagoElectronicoCreate {
  venta_id?: number | null;
  reserva_id?: number | null;
  metodo_pago: 'QR_SIMPLE' | 'TARJETA' | 'PAYPAL' | 'EFECTIVO';
  pasarela: 'LIBELULA_BOLIVIA' | 'STRIPE_INTL' | 'PAYPAL_EXPRESS' | 'EFECTIVO_POS';
  monto: number;
  moneda: 'USD' | 'BOB';
  cliente_email?: string | null;
  datos_tarjeta?: DatosTarjetaInput | null;
  concepto?: string | null;
}

export interface ConfirmarPagoRequest {
  aprobado: boolean;
  codigo_autorizacion?: string | null;
  motivo_rechazo?: string | null;
}

export interface QRGenerarResponse {
  pago_id: number;
  qr_string: string;
  qr_imagen_svg: string;
  codigo_recaudacion: string;
  monto: number;
  moneda: string;
  expira_en_segundos: number;
}

export interface PagoIniciarResponse {
  pago: PagoResponse;
  qr?: QRGenerarResponse | null;
}
