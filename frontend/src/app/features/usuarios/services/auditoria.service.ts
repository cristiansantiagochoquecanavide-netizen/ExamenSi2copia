import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { BitacoraAuditoriaResponse } from '../models/usuarios.models';

@Injectable({
  providedIn: 'root'
})
export class AuditoriaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/usuarios/auditoria`;

  consultar(filtros?: {
    modulo?: string;
    accion?: string;
    usuario_id?: number;
    ip_address?: string;
    limit?: number;
    offset?: number;
  }): Observable<BitacoraAuditoriaResponse[]> {
    let params = new HttpParams();
    if (filtros?.modulo) params = params.set('modulo', filtros.modulo);
    if (filtros?.accion) params = params.set('accion', filtros.accion);
    if (filtros?.usuario_id) params = params.set('usuario_id', filtros.usuario_id.toString());
    if (filtros?.ip_address) params = params.set('ip_address', filtros.ip_address);
    if (filtros?.limit) params = params.set('limit', filtros.limit.toString());
    if (filtros?.offset) params = params.set('offset', filtros.offset.toString());
    return this.http.get<BitacoraAuditoriaResponse[]>(`${this.baseUrl}/logs`, { params });
  }

  obtenerPorId(id: number): Observable<BitacoraAuditoriaResponse> {
    return this.http.get<BitacoraAuditoriaResponse>(`${this.baseUrl}/logs/${id}`);
  }
}
