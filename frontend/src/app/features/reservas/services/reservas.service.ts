import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import {
  Reserva, ReservaCreate, AsignarProbadorRequest, FinalizarPruebaRequest, ReservaTrazabilidadResponse
} from '../models/reservas.models';
import { LocalOfflineStorageService } from '../../../core/services/local-offline-storage.service';

@Injectable({
  providedIn: 'root'
})
export class ReservasService {
  private readonly http = inject(HttpClient);
  private readonly offlineStorage = inject(LocalOfflineStorageService);
  private readonly baseUrl = `${environment.apiUrl}/reservas`;

  getStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/status`);
  }

  crearReserva(data: ReservaCreate): Observable<Reserva> {
    return this.http.post<Reserva>(this.baseUrl, data);
  }

  cancelarReserva(id: number, motivo?: string): Observable<Reserva> {
    return this.http.post<Reserva>(`${this.baseUrl}/${id}/cancelar`, { motivo: motivo || 'Cancelación solicitada por el cliente' });
  }

  getReservas(sucursalId?: number, estado?: string, fecha?: string): Observable<Reserva[]> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursal_id', sucursalId.toString());
    if (estado) params = params.set('estado', estado);
    if (fecha) params = params.set('fecha', fecha);
    return this.http.get<Reserva[]>(this.baseUrl, { params });
  }

  getReservaById(id: number): Observable<Reserva> {
    return this.http.get<Reserva>(`${this.baseUrl}/${id}`);
  }

  buscarReservaPorCodigo(codigo: string): Observable<Reserva> {
    return this.http.get<Reserva>(`${this.baseUrl}/codigo/${encodeURIComponent(codigo)}`);
  }

  // ----------------- CU14: ATENCIÓN Y GESTIÓN EN PROBADORES -----------------
  asignarProbador(id: number, data: AsignarProbadorRequest): Observable<Reserva> {
    return this.http.post<Reserva>(`${this.baseUrl}/${id}/asignar-probador`, data);
  }

  finalizarPrueba(id: number, data: FinalizarPruebaRequest): Observable<Reserva> {
    return this.http.post<Reserva>(`${this.baseUrl}/${id}/finalizar-prueba`, data);
  }

  marcarExpirada(id: number, motivo?: string): Observable<Reserva> {
    return this.http.post<Reserva>(`${this.baseUrl}/${id}/expirar`, {
      motivo: motivo || 'No show del cliente en probador'
    });
  }

  // ----------------- CU14: RESERVAS OFFLINE PARA PROBADOR FÍSICO (SIN PAGO) -----------------
  registrarReservaProbadorOffline(datos: {
    prenda_id: number;
    nombre_prenda: string;
    talla: string;
    hora_ensayo: string;
  }): Observable<string> {
    return this.offlineStorage.registrarReservaProbadorOffline(datos);
  }

  obtenerReservasProbadorOffline() {
    return this.offlineStorage.obtenerReservasOffline();
  }

  // ----------------- CU25: TRAZABILIDAD Y CICLO DE VIDA DE RESERVAS -----------------
  getTrazabilidad(identificador: string | number): Observable<ReservaTrazabilidadResponse> {
    return this.http.get<ReservaTrazabilidadResponse>(`${this.baseUrl}/${encodeURIComponent(String(identificador))}/trazabilidad`);
  }
}


