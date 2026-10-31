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
  envio?: EnvioPedido | null;
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

// ----------------- CU15: CARRITO & CHECKOUT E-COMMERCE -----------------
export interface EnvioPedido {
  id: number;
  venta_id: number;
  tipo_entrega: 'DOMICILIO' | 'CLICK_AND_COLLECT';
  estado_envio: 'PENDIENTE' | 'PREPARANDO' | 'EN_CAMINO' | 'LISTO_RECOJO' | 'ENTREGADO' | 'CANCELADO';
  codigo_seguimiento: string;
  direccion_linea1?: string | null;
  direccion_linea2?: string | null;
  ciudad?: string | null;
  departamento?: string | null;
  codigo_postal?: string | null;
  telefono_contacto?: string | null;
  instrucciones_entrega?: string | null;
  costo_envio: number;
  courier_nombre?: string | null;
  fecha_despacho?: string | null;
  fecha_entrega_estimada?: string | null;
  fecha_entrega_real?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatosEnvioInput {
  tipo_entrega: 'DOMICILIO' | 'CLICK_AND_COLLECT';
  direccion_linea1?: string;
  direccion_linea2?: string;
  ciudad?: string;
  departamento?: string;
  codigo_postal?: string;
  telefono_contacto?: string;
  instrucciones_entrega?: string;
  sucursal_recojo_id?: number;
}

export interface VentaOnlineCheckoutRequest {
  sucursal_id: number;
  cliente_nombre: string;
  cliente_nit?: string;
  cliente_email: string;
  cliente_telefono?: string;
  observaciones?: string;
  descuento?: number;
  codigo_cupon?: string;
  detalles: DetalleVentaCreate[];
  datos_envio: DatosEnvioInput;
  pago: PagoElectronicoCreate;
}

export interface ActualizarEstadoEnvioRequest {
  estado_envio: 'PREPARANDO' | 'EN_CAMINO' | 'LISTO_RECOJO' | 'ENTREGADO' | 'CANCELADO';
  courier_nombre?: string;
  notas?: string;
}

// ----------------- CU16: PROMOCIONES Y DESCUENTOS -----------------
export interface Promocion {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  tipo_descuento: 'PORCENTAJE' | 'MONTO_FIJO' | 'ENVIO_GRATIS';
  valor_descuento: number;
  monto_minimo_compra: number;
  descuento_maximo?: number | null;
  limite_usos?: number | null;
  usos_actuales: number;
  limite_por_cliente: number;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  categoria_id?: number | null;
  sucursal_id?: number | null;
  created_at: string;
  updated_at: string;
  categoria?: { id: number; nombre: string } | null;
  sucursal?: Sucursal | null;
}

export interface PromocionCreate {
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipo_descuento: 'PORCENTAJE' | 'MONTO_FIJO' | 'ENVIO_GRATIS';
  valor_descuento: number;
  monto_minimo_compra: number;
  descuento_maximo?: number | null;
  limite_usos?: number | null;
  limite_por_cliente?: number;
  fecha_inicio: string;
  fecha_fin: string;
  activo?: boolean;
  categoria_id?: number | null;
  sucursal_id?: number | null;
}

export interface PromocionUpdate {
  nombre?: string;
  descripcion?: string;
  tipo_descuento?: 'PORCENTAJE' | 'MONTO_FIJO' | 'ENVIO_GRATIS';
  valor_descuento?: number;
  monto_minimo_compra?: number;
  descuento_maximo?: number | null;
  limite_usos?: number | null;
  limite_por_cliente?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  activo?: boolean;
  categoria_id?: number | null;
  sucursal_id?: number | null;
}

export interface ValidarCuponRequest {
  codigo: string;
  subtotal: number;
  costo_envio?: number;
  sucursal_id?: number;
  cliente_id?: number;
}

export interface ValidarCuponResponse {
  valido: boolean;
  codigo: string;
  mensaje: string;
  tipo_descuento?: 'PORCENTAJE' | 'MONTO_FIJO' | 'ENVIO_GRATIS';
  valor_descuento?: number;
  descuento_calculado: number;
  total_con_descuento: number;
  promocion?: Promocion;
}


// ----------------- CU19 & CU20: NOTAS DE DEVOLUCIÓN POR CAMBIO DE TALLA -----------------
export interface ValidarCambioGarantiaResponse {
  venta_id: number;
  codigo_venta: string;
  fecha_venta: string;
  dias_transcurridos: number;
  plazo_maximo_dias: number;
  garantia_vigente: boolean;
  permite_cambio_talla: boolean;
  admite_reembolso_dinero: boolean; // RN07
  mensaje: string;
  sucursal_id: number;
  sucursal_nombre: string;
  cliente_nombre: string;
  items: VentaParaDevolucionItem[];
}

export interface ItemNotaDevolucionCreate {
  variante_devuelta_id: number;
  cantidad_devuelta: number;
  variante_entregada_id: number;
  cantidad_entregada: number;
  diferencia_monetaria: number; // RN07: siempre 0.00
}

export interface NotaDevolucionFormalCreate {
  venta_id: number;
  sucursal_id: number;
  motivo: string;
  observaciones?: string;
  detalles: ItemNotaDevolucionCreate[];
}

export interface DetalleNotaDevolucionFormalResponse {
  id: number;
  variante_devuelta_id: number;
  prenda_devuelta_nombre?: string;
  talla_devuelta?: string;
  cantidad_devuelta: number;
  variante_entregada_id: number;
  prenda_entregada_nombre?: string;
  talla_entregada?: string;
  cantidad_entregada: number;
  diferencia_monetaria: number;
}

export interface NotaDevolucionFormalResponse {
  id: number;
  codigo_devolucion: string;
  venta_id: number;
  codigo_venta: string;
  sucursal_id: number;
  sucursal_nombre?: string;
  cliente_id?: number | null;
  cliente_nombre?: string;
  motivo: string;
  estado: string;
  diferencia_monetaria: number;
  observaciones?: string;
  fecha_hora: string;
  detalles: DetalleNotaDevolucionFormalResponse[];
}

// ----------------- CU17: CONFLICTOS DE INVENTARIO -----------------
export interface ConflictoInventarioResponse {
  id: number;
  sincronizacion_id: number;
  uuid_operacion?: string;
  sucursal_id: number;
  sucursal_nombre?: string;
  producto_variante_id: number;
  prenda_nombre?: string;
  talla?: string;
  color?: string;
  cantidad_solicitada: number;
  stock_disponible_servidor: number;
  estado_resolucion: 'PENDIENTE_RESOLUCION' | 'RESUELTO' | string;
  fecha_deteccion: string;
  fecha_resolucion?: string | null;
  resuelto_por_usuario_id?: number | null;
}

export interface ResolverConflictoRequest {
  accion: 'TRASPASO_INMEDIATO' | 'ADMITIR_SALDO_NEGATIVO' | 'ANULAR_VENTA' | string;
  observaciones: string;
  sucursal_proveedora_id?: number | null;
}
