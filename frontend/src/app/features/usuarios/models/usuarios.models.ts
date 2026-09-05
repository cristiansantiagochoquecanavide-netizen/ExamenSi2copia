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

export interface UsuariosState {
  id?: string;
  name?: string;
  status: 'active' | 'inactive' | 'pending';
}
