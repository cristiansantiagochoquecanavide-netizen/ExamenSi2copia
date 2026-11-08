import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import {
  Ciudad, CiudadCreate, CiudadUpdate,
  Sucursal, SucursalCreate, SucursalUpdate,
  Proveedor, ProveedorCreate, ProveedorUpdate,
  RecepcionMercaderiaResponse, RecepcionMercaderiaCreate,
  TransferenciaStockCreate, TransferenciaStockResponse
} from './inventario.models';

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

  // ==========================================
  // CU8: PROVEEDORES & RECEPCIÓN DE MERCADERÍA
  // ==========================================

  // --- PROVEEDORES ---
  getProveedores(activoSolo = false, search?: string): Observable<Proveedor[]> {
    let params = new HttpParams().set('activo_solo', activoSolo.toString());
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<Proveedor[]>(`${this.baseUrl}/proveedores`, { params });
  }

  createProveedor(data: ProveedorCreate): Observable<Proveedor> {
    return this.http.post<Proveedor>(`${this.baseUrl}/proveedores`, data);
  }

  updateProveedor(id: number, data: ProveedorUpdate): Observable<Proveedor> {
    return this.http.put<Proveedor>(`${this.baseUrl}/proveedores/${id}`, data);
  }

  // --- RECEPCIÓN DE MERCADERÍA (LOTES AL KARDEX) ---
  getRecepciones(sucursalId?: number, proveedorId?: number): Observable<RecepcionMercaderiaResponse[]> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursal_id', sucursalId.toString());
    if (proveedorId) params = params.set('proveedor_id', proveedorId.toString());
    return this.http.get<RecepcionMercaderiaResponse[]>(`${this.baseUrl}/recepciones`, { params });
  }

  getRecepcionById(id: number): Observable<RecepcionMercaderiaResponse> {
    return this.http.get<RecepcionMercaderiaResponse>(`${this.baseUrl}/recepciones/${id}`);
  }

  createRecepcion(data: RecepcionMercaderiaCreate): Observable<RecepcionMercaderiaResponse> {
    return this.http.post<RecepcionMercaderiaResponse>(`${this.baseUrl}/recepciones`, data);
  }

  // ==========================================
  // CU9: TRANSFERENCIA DE STOCK ENTRE SUCURSALES
  // ==========================================
  getTransferencias(sucursalId?: number, estado?: string): Observable<TransferenciaStockResponse[]> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursal_id', sucursalId.toString());
    if (estado) params = params.set('estado', estado);
    return this.http.get<TransferenciaStockResponse[]>(`${this.baseUrl}/transferencias`, { params });
  }

  getTransferenciaById(id: number): Observable<TransferenciaStockResponse> {
    return this.http.get<TransferenciaStockResponse>(`${this.baseUrl}/transferencias/${id}`);
  }

  createTransferencia(data: TransferenciaStockCreate): Observable<TransferenciaStockResponse> {
    return this.http.post<TransferenciaStockResponse>(`${this.baseUrl}/transferencias`, data);
  }

  recibirTransferencia(id: number, observaciones?: string): Observable<TransferenciaStockResponse> {
    return this.http.put<TransferenciaStockResponse>(`${this.baseUrl}/transferencias/${id}/recibir`, { observaciones });
  }

  cancelarTransferencia(id: number, motivo?: string): Observable<TransferenciaStockResponse> {
    return this.http.put<TransferenciaStockResponse>(`${this.baseUrl}/transferencias/${id}/cancelar`, { motivo });
  }
}


