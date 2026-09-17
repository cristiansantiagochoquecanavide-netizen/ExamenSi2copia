import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import {
  DashboardRecomendaciones,
  PreferenciaEstilo,
  PreferenciaEstiloCreate,
  OutfitSugerido
} from '../models/ia-asistente.models';

@Injectable({
  providedIn: 'root'
})
export class IaAsistenteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/ia_asistente`;

  getStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/status`);
  }

  getRecomendaciones(ocasion?: string, sector?: string, limit: number = 12): Observable<DashboardRecomendaciones> {
    let params = new HttpParams().set('limit', limit.toString());
    if (ocasion) params = params.set('ocasion', ocasion);
    if (sector) params = params.set('sector', sector);
    return this.http.get<DashboardRecomendaciones>(`${this.baseUrl}/recomendaciones`, { params });
  }

  getPerfilEstilo(): Observable<PreferenciaEstilo | null> {
    return this.http.get<PreferenciaEstilo | null>(`${this.baseUrl}/perfil-estilo`);
  }

  guardarPerfilEstilo(data: PreferenciaEstiloCreate): Observable<PreferenciaEstilo> {
    return this.http.post<PreferenciaEstilo>(`${this.baseUrl}/perfil-estilo`, data);
  }

  getOutfitSugerido(prendaId: number): Observable<OutfitSugerido> {
    return this.http.get<OutfitSugerido>(`${this.baseUrl}/outfit/${prendaId}`);
  }

  registrarInteraccion(
    prendaId: number,
    tipoEvento: string = 'CLICK',
    scoreAplicado: number = 0.0,
    motivo: string = 'EXPLORACION'
  ): Observable<any> {
    return this.http.post(`${this.baseUrl}/interacciones`, {
      prenda_id: prendaId,
      tipo_evento: tipoEvento,
      score_aplicado: scoreAplicado,
      motivo: motivo
    });
  }
}

