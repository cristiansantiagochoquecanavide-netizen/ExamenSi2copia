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
