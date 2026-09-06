import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import {
  Ciudad, CiudadCreate, CiudadUpdate,
  Sucursal, SucursalCreate, SucursalUpdate
} from '../models/inventario.models';

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/inventario`;

  // --- CIUDADES ---
  getCiudades(activoSolo = false): Observable<Ciudad[]> {
    const params = new HttpParams().set('activo_solo', activoSolo.toString());
    return this.http.get<Ciudad[]>(`${this.baseUrl}/ciudades`, { params });
  }

  createCiudad(data: CiudadCreate): Observable<Ciudad> {
    return this.http.post<Ciudad>(`${this.baseUrl}/ciudades`, data);
  }

  updateCiudad(id: number, data: CiudadUpdate): Observable<Ciudad> {
    return this.http.put<Ciudad>(`${this.baseUrl}/ciudades/${id}`, data);
  }

  deleteCiudad(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/ciudades/${id}`);
  }

  // --- SUCURSALES ---
  getSucursales(filtros?: { ciudad_id?: number; encargado_id?: number }): Observable<Sucursal[]> {
    let params = new HttpParams();
    if (filtros?.ciudad_id) params = params.set('ciudad_id', filtros.ciudad_id.toString());
    if (filtros?.encargado_id) params = params.set('encargado_id', filtros.encargado_id.toString());
    return this.http.get<Sucursal[]>(`${this.baseUrl}/sucursales`, { params });
  }

  getSucursalById(id: number): Observable<Sucursal> {
    return this.http.get<Sucursal>(`${this.baseUrl}/sucursales/${id}`);
  }

  createSucursal(data: SucursalCreate): Observable<Sucursal> {
    return this.http.post<Sucursal>(`${this.baseUrl}/sucursales`, data);
  }

  updateSucursal(id: number, data: SucursalUpdate): Observable<Sucursal> {
    return this.http.put<Sucursal>(`${this.baseUrl}/sucursales/${id}`, data);
  }

  deleteSucursal(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/sucursales/${id}`);
  }
}
