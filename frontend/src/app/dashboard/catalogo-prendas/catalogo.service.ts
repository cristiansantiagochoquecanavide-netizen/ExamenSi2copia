import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import {
  Prenda,
  PrendaCreate,
  PrendaUpdate,
  UploadImagenResponse,
  PrendaMultimedia,
  PrendaMultimediaCreate,
  Categoria,
  CategoriaCreate,
  Temporada,
  TemporadaCreate,
  Talla,
  TallaCreate,
  Color,
  ColorCreate,
  AjusteInventarioRequest,
  InventarioStock,
  Calificacion,
  CalificacionCreate,
  ListadoCalificacionesResponse,
  DifusionCatalogoCreate,
  DifusionCatalogoResponse,
  Sucursal
} from './catalogo.models';


@Injectable({
  providedIn: 'root'
})
export class CatalogoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/catalogo`;

  // --- Sucursales de Inventario ---
  getSucursales(activoSolo: boolean = true): Observable<Sucursal[]> {
    return this.http.get<Sucursal[]>(`${environment.apiUrl}/inventario/sucursales`, {
      params: { activo_solo: activoSolo }
    });
  }

  // ==========================================
  // CU5: PARÁMETROS DE MODA (CATEGORÍAS, TALLAS, COLORES, TEMPORADAS)
  // ==========================================

  // --- Categorías ---
  getCategorias(activoSolo: boolean = false): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.baseUrl}/categorias`, {
      params: { activo_solo: activoSolo }
    });
  }

  createCategoria(data: CategoriaCreate): Observable<Categoria> {
    return this.http.post<Categoria>(`${this.baseUrl}/categorias`, data);
  }

  updateCategoria(id: number, data: Partial<CategoriaCreate>): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.baseUrl}/categorias/${id}`, data);
  }

  deleteCategoria(id: number): Observable<{ mensaje: string; exito: boolean }> {
    return this.http.delete<{ mensaje: string; exito: boolean }>(`${this.baseUrl}/categorias/${id}`);
  }

  // --- Tallas ---
  getTallas(activoSolo: boolean = false): Observable<Talla[]> {
    return this.http.get<Talla[]>(`${this.baseUrl}/tallas`, {
      params: { activo_solo: activoSolo }
    });
  }

  createTalla(data: TallaCreate): Observable<Talla> {
    return this.http.post<Talla>(`${this.baseUrl}/tallas`, data);
  }

  updateTalla(id: number, data: Partial<TallaCreate>): Observable<Talla> {
    return this.http.put<Talla>(`${this.baseUrl}/tallas/${id}`, data);
  }

  deleteTalla(id: number): Observable<{ mensaje: string; exito: boolean }> {
    return this.http.delete<{ mensaje: string; exito: boolean }>(`${this.baseUrl}/tallas/${id}`);
  }

  // --- Colores ---
  getColores(activoSolo: boolean = false): Observable<Color[]> {
    return this.http.get<Color[]>(`${this.baseUrl}/colores`, {
      params: { activo_solo: activoSolo }
    });
  }

  createColor(data: ColorCreate): Observable<Color> {
    return this.http.post<Color>(`${this.baseUrl}/colores`, data);
  }

  updateColor(id: number, data: Partial<ColorCreate>): Observable<Color> {
    return this.http.put<Color>(`${this.baseUrl}/colores/${id}`, data);
  }

  deleteColor(id: number): Observable<{ mensaje: string; exito: boolean }> {
    return this.http.delete<{ mensaje: string; exito: boolean }>(`${this.baseUrl}/colores/${id}`);
  }

  // --- Temporadas ---
  getTemporadas(activoSolo: boolean = false): Observable<Temporada[]> {
    return this.http.get<Temporada[]>(`${this.baseUrl}/temporadas`, {
      params: { activo_solo: activoSolo }
    });
  }

  createTemporada(data: TemporadaCreate): Observable<Temporada> {
    return this.http.post<Temporada>(`${this.baseUrl}/temporadas`, data);
  }

  updateTemporada(id: number, data: Partial<TemporadaCreate>): Observable<Temporada> {
    return this.http.put<Temporada>(`${this.baseUrl}/temporadas/${id}`, data);
  }

  deleteTemporada(id: number): Observable<{ mensaje: string; exito: boolean }> {
    return this.http.delete<{ mensaje: string; exito: boolean }>(`${this.baseUrl}/temporadas/${id}`);
  }

  // ==========================================
  // CU6: PRENDAS, MULTIMEDIA Y AJUSTE DE INVENTARIO
  // ==========================================

  getPrendas(params?: {
    categoria_id?: number;
    temporada_id?: number;
    sector?: string;
    sucursal_id?: number;
    search?: string;
    activo_solo?: boolean;
  }): Observable<Prenda[]> {
    let httpParams = new HttpParams();
    if (params?.categoria_id) {
      httpParams = httpParams.set('categoria_id', params.categoria_id.toString());
    }
    if (params?.temporada_id) {
      httpParams = httpParams.set('temporada_id', params.temporada_id.toString());
    }
    if (params?.sector) {
      httpParams = httpParams.set('sector', params.sector);
    }
    if (params?.sucursal_id) {
      httpParams = httpParams.set('sucursal_id', params.sucursal_id.toString());
    }
    if (params?.activo_solo !== undefined) {
      httpParams = httpParams.set('activo_solo', params.activo_solo.toString());
    }
    return this.http.get<Prenda[]>(`${this.baseUrl}/prendas`, { params: httpParams });
  }

  getPrendaById(id: number): Observable<Prenda> {
    return this.http.get<Prenda>(`${this.baseUrl}/prendas/${id}`);
  }

  createPrenda(data: PrendaCreate): Observable<Prenda> {
    return this.http.post<Prenda>(`${this.baseUrl}/prendas`, data);
  }

  updatePrenda(id: number, data: PrendaUpdate): Observable<Prenda> {
    return this.http.put<Prenda>(`${this.baseUrl}/prendas/${id}`, data);
  }

  deletePrenda(id: number): Observable<{ mensaje: string; exito: boolean }> {
    return this.http.delete<{ mensaje: string; exito: boolean }>(`${this.baseUrl}/prendas/${id}`);
  }

  uploadImagen(file: File): Observable<UploadImagenResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadImagenResponse>(`${this.baseUrl}/upload-imagen`, formData);
  }

  deleteMultimedia(prendaId: number, multimediaId: number): Observable<{ mensaje: string; exito: boolean }> {
    return this.http.delete<{ mensaje: string; exito: boolean }>(`${this.baseUrl}/prendas/${prendaId}/multimedia/${multimediaId}`);
  }

  vincularMultimedia(prendaId: number, data: PrendaMultimediaCreate): Observable<PrendaMultimedia> {
    return this.http.post<PrendaMultimedia>(`${this.baseUrl}/prendas/${prendaId}/multimedia`, data);
  }

  ajustarInventario(data: AjusteInventarioRequest): Observable<InventarioStock> {
    return this.http.post<InventarioStock>(`${this.baseUrl}/inventario/ajuste`, data);
  }

  getStockPorSucursal(sucursalId: number): Observable<InventarioStock[]> {
    return this.http.get<InventarioStock[]>(`${this.baseUrl}/inventario/sucursal/${sucursalId}`);
  }

  // ==========================================
  // CU18: CALIFICACIONES Y RESEÑAS DE PRENDAS
  // ==========================================
  getCalificacionesPrenda(prendaId: number): Observable<ListadoCalificacionesResponse> {
    return this.http.get<ListadoCalificacionesResponse>(`${this.baseUrl}/prendas/${prendaId}/calificaciones`);
  }

  calificarPrenda(prendaId: number, data: CalificacionCreate): Observable<Calificacion> {
    return this.http.post<Calificacion>(`${this.baseUrl}/prendas/${prendaId}/calificaciones`, data);
  }

  eliminarCalificacion(calificacionId: number): Observable<{ mensaje: string; exito: boolean }> {
    return this.http.delete<{ mensaje: string; exito: boolean }>(`${this.baseUrl}/calificaciones/${calificacionId}`);
  }

  // ==========================================
  // CU08: SINCRONIZACIÓN DE CATÁLOGO OFFLINE
  // ==========================================
  sincronizarCatalogoOffline(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/sincronizar-local`);
  }

  // ==========================================
  // CU09: DIFUSIÓN DE NOVEDADES DE CATÁLOGO A CLIENTES
  // ==========================================
  difundirNovedades(data: DifusionCatalogoCreate): Observable<DifusionCatalogoResponse> {
    return this.http.post<DifusionCatalogoResponse>(`${this.baseUrl}/difundir`, data);
  }

  listarDifusiones(limit: number = 50, offset: number = 0): Observable<DifusionCatalogoResponse[]> {
    return this.http.get<DifusionCatalogoResponse[]>(`${this.baseUrl}/difusiones`, {
      params: { limit, offset }
    });
  }
}


