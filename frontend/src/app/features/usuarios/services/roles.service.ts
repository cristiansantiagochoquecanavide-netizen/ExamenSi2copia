import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RolResponse, RolCreate, RolUpdate, PermisoResponse } from '../models/usuarios.models';

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/usuarios`;

  getRoles(): Observable<RolResponse[]> {
    return this.http.get<RolResponse[]>(`${this.baseUrl}/roles`);
  }

  getRolById(id: number): Observable<RolResponse> {
    return this.http.get<RolResponse>(`${this.baseUrl}/roles/${id}`);
  }

  createRol(data: RolCreate): Observable<RolResponse> {
    return this.http.post<RolResponse>(`${this.baseUrl}/roles`, data);
  }

  updateRol(id: number, data: RolUpdate): Observable<RolResponse> {
    return this.http.put<RolResponse>(`${this.baseUrl}/roles/${id}`, data);
  }

  deleteRol(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/roles/${id}`);
  }

  getPermisos(): Observable<PermisoResponse[]> {
    return this.http.get<PermisoResponse[]>(`${this.baseUrl}/permisos`);
  }
}
