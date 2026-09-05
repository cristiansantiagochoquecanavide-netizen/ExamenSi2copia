import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Prenda, Categoria, Temporada } from '../models/catalogo.models';

@Injectable({
  providedIn: 'root'
})
export class CatalogoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/catalogo`;

  getPrendas(params?: { categoria_id?: number; temporada_id?: number; search?: string }): Observable<Prenda[]> {
    let httpParams = new HttpParams();
    if (params?.categoria_id) {
      httpParams = httpParams.set('categoria_id', params.categoria_id.toString());
    }
    if (params?.temporada_id) {
      httpParams = httpParams.set('temporada_id', params.temporada_id.toString());
    }
    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }
    return this.http.get<Prenda[]>(`${this.baseUrl}/prendas`, { params: httpParams });
  }

  getPrendaById(id: number): Observable<Prenda> {
    return this.http.get<Prenda>(`${this.baseUrl}/prendas/${id}`);
  }

  getCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.baseUrl}/categorias`);
  }

  getTemporadas(): Observable<Temporada[]> {
    return this.http.get<Temporada[]>(`${this.baseUrl}/temporadas`);
  }
}
