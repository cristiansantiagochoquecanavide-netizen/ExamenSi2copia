export interface Ciudad {
  id: number;
  nombre: string;
  codigo: string;
  activo: boolean;
  created_at: string;
}

export interface CiudadCreate {
  nombre: string;
  codigo: string;
}

export interface CiudadUpdate {
  nombre?: string;
  codigo?: string;
  activo?: boolean;
}

export interface Sucursal {
  id: number;
  nombre: string;
  direccion: string;
  telefono?: string;
  horario_atencion?: string;
  capacidad_probadores: number;
  ciudad_id: number;
  encargado_id?: number | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  ciudad?: Ciudad;
}

export interface SucursalCreate {
  nombre: string;
  direccion: string;
  telefono?: string;
  horario_atencion?: string;
  capacidad_probadores?: number;
  ciudad_id: number;
  encargado_id?: number | null;
}

export interface SucursalUpdate {
  nombre?: string;
  direccion?: string;
  telefono?: string;
  horario_atencion?: string;
  capacidad_probadores?: number;
  ciudad_id?: number;
  encargado_id?: number | null;
  activo?: boolean;
}

export interface InventarioState {
  id?: string;
  name?: string;
  status: 'active' | 'inactive' | 'pending';
}

// ----------------- CU8: PROVEEDORES & RECEPCIÓN DE MERCADERÍA -----------------
import { PrendaVariante } from '../../catalogo/models/catalogo.models';

export interface Proveedor {
  id: number;
  razon_social: string;
  nit: string;
  contacto_nombre?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  activo: boolean;
  created_at: string;
}

export interface ProveedorCreate {
  razon_social: string;
  nit: string;
  contacto_nombre?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  activo?: boolean;
}

export interface ProveedorUpdate {
  razon_social?: string;
  nit?: string;
  contacto_nombre?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  activo?: boolean;
}

export interface DetalleRecepcionCreate {
  variante_id: number;
  cantidad: number;
  costo_unitario: number;
}

export interface DetalleRecepcionResponse {
  id: number;
  recepcion_id: number;
  variante_id: number;
  cantidad: number;
  costo_unitario: number;
  subtotal: number;
  variante?: PrendaVariante;
}

export interface RecepcionMercaderiaCreate {
  numero_documento: string;
  proveedor_id: number;
  sucursal_id: number;
  fecha_recepcion?: string;
  observaciones?: string;
  detalles: DetalleRecepcionCreate[];
}

export interface RecepcionMercaderiaResponse {
  id: number;
  numero_documento: string;
  proveedor_id: number;
  sucursal_id: number;
  usuario_id: number;
  fecha_recepcion: string;
  observaciones?: string;
  costo_total: number;
  created_at: string;
  proveedor?: Proveedor;
  sucursal?: Sucursal;
  detalles: DetalleRecepcionResponse[];
}

// ----------------- CU9: TRANSFERENCIA DE STOCK -----------------
export interface DetalleTransferenciaCreate {
  variante_id: number;
  cantidad: number;
}

export interface DetalleTransferenciaResponse {
  id: number;
  transferencia_id: number;
  variante_id: number;
  cantidad: number;
  variante?: PrendaVariante;
}

export interface TransferenciaStockCreate {
  codigo?: string;
  sucursal_origen_id: number;
  sucursal_destino_id: number;
  motivo?: string;
  observaciones?: string;
  inmediata?: boolean;
  detalles: DetalleTransferenciaCreate[];
}

export interface TransferenciaStockResponse {
  id: number;
  codigo: string;
  sucursal_origen_id: number;
  sucursal_destino_id: number;
  usuario_envia_id: number;
  usuario_recibe_id?: number | null;
  estado: 'EN_TRANSITO' | 'COMPLETADA' | 'CANCELADA';
  motivo?: string;
  observaciones?: string;
  fecha_envio: string;
  fecha_recepcion?: string | null;
  total_prendas: number;
  created_at: string;
  updated_at: string;
  sucursal_origen?: Sucursal;
  sucursal_destino?: Sucursal;
  usuario_envia?: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
  };
  usuario_recibe?: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
  } | null;
  detalles: DetalleTransferenciaResponse[];
}


