export interface LoginRequest {
  email: string;
  password: string;
}

export interface PermisoResponse {
  id: number;
  codigo: string;
  modulo: string;
  descripcion?: string;
}

export interface RolResponse {
  id: number;
  nombre: string;
  descripcion?: string;
  es_sistema: boolean;
  created_at: string;
  permisos: PermisoResponse[];
}

export interface UsuarioResponse {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  ci_nit: string;
  telefono?: string;
  direccion?: string;
  tipo_usuario: string; // PERSONAL, CLIENTE
  estado: string;       // ACTIVO, INACTIVO, BLOQUEADO
  rol_id: number;
  sucursal_id?: number;
  created_at: string;
  rol?: RolResponse;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  usuario: UsuarioResponse;
}

export interface RolCreate {
  nombre: string;
  descripcion?: string;
  permisos_ids: number[];
}

export interface RolUpdate {
  nombre?: string;
  descripcion?: string;
  permisos_ids?: number[];
}

export interface PersonalRegistroRequest {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  ci_nit: string;
  rol_id: number;
  sucursal_id?: number | null;
  telefono?: string;
  direccion?: string;
}

export interface ClienteRegistroRequest {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  ci_nit: string;
  telefono?: string;
  direccion?: string;
}

export interface UsuarioUpdate {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  direccion?: string;
  rol_id?: number;
  sucursal_id?: number | null;
}

export interface CambiarEstadoRequest {
  estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
}

export interface BitacoraAuditoriaResponse {
  id: number;
  timestamp: string;
  usuario_id?: number | null;
  usuario_email?: string | null;
  ip_address?: string | null;
  accion: string;
  modulo: string;
  detalle: string;
  valores_anteriores?: string | null;
  valores_nuevos?: string | null;
}

export interface UsuariosState {
  id?: string;
  name?: string;
  status: 'active' | 'inactive' | 'pending';
}
