import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import {
  UsuarioResponse, PersonalRegistroRequest, ClienteRegistroRequest,
  UsuarioUpdate, CambiarEstadoRequest
} from './usuarios.models';

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/usuarios`;

  listar(filtros?: { tipo_usuario?: string; rol_id?: number; sucursal_id?: number; estado?: string }): Observable<UsuarioResponse[]> {
    let params = new HttpParams();
    if (filtros?.tipo_usuario) params = params.set('tipo_usuario', filtros.tipo_usuario);
    if (filtros?.rol_id) params = params.set('rol_id', filtros.rol_id.toString());
    if (filtros?.sucursal_id) params = params.set('sucursal_id', filtros.sucursal_id.toString());
    if (filtros?.estado) params = params.set('estado', filtros.estado);
    return this.http.get<UsuarioResponse[]>(`${this.baseUrl}/`, { params });
  }

  obtenerPorId(id: number): Observable<UsuarioResponse> {
    return this.http.get<UsuarioResponse>(`${this.baseUrl}/${id}`);
  }

  registrarPersonal(data: PersonalRegistroRequest): Observable<UsuarioResponse> {
    return this.http.post<UsuarioResponse>(`${this.baseUrl}/personal`, data);
  }

  registrarCliente(data: ClienteRegistroRequest): Observable<UsuarioResponse> {
    return this.http.post<UsuarioResponse>(`${this.baseUrl}/clientes/registro`, data);
  }

  actualizar(id: number, data: UsuarioUpdate): Observable<UsuarioResponse> {
    return this.http.put<UsuarioResponse>(`${this.baseUrl}/${id}`, data);
  }

  cambiarEstado(id: number, estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO'): Observable<UsuarioResponse> {
    return this.http.patch<UsuarioResponse>(`${this.baseUrl}/${id}/estado`, { estado });
  }
}
