import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IaAsistenteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/ia_asistente`;

  getStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/status`);
  }
}
