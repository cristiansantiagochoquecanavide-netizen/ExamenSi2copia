import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PlanSuscripcionModel {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  precio_mensual: number;
  limite_sucursales: number;
  permite_ia: boolean;
  permite_offline: boolean;
  activo: boolean;
}

export interface EmpresaModel {
  id: number;
  razon_social: string;
  nit: string;
  subdominio: string;
  email_corporativo: string;
  telefono?: string;
  direccion_fiscal?: string;
  activo: boolean;
  created_at: string;
}

export interface GuiaMedidaItemModel {
  id?: number;
  talla_id: number;
  talla_nombre?: string;
  pecho_cm?: number;
  cintura_cm?: number;
  cadera_cm?: number;
  largo_cm?: number;
  manga_cm?: number;
  hombro_cm?: number;
}

export interface GuiaMedidasResponseModel {
  producto_id: number;
  producto_nombre: string;
  categoria?: string;
  medidas: GuiaMedidaItemModel[];
}

export interface PoliticaGarantiaModel {
  id: number;
  empresa_id: number;
  plazo_dias_cambio: number;
  permite_cambio_talla: boolean;
  admite_reembolso_dinero: boolean;
  requiere_etiqueta_original: boolean;
  activo: boolean;
}

export interface SucursalTenantModel {
  id: number;
  empresa_id: number;
  nombre: string;
  direccion: string;
  telefono?: string;
  horario_atencion?: string;
  capacidad_probadores?: number;
  ciudad_id?: number;
  activo: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SaasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getPlanes(): Observable<PlanSuscripcionModel[]> {
    return this.http.get<PlanSuscripcionModel[]>(`${this.baseUrl}/planes`);
  }

  crearEmpresa(data: any): Observable<EmpresaModel> {
    return this.http.post<EmpresaModel>(`${this.baseUrl}/empresas`, data);
  }

  getSucursalesTenant(): Observable<SucursalTenantModel[]> {
    return this.http.get<SucursalTenantModel[]>(`${this.baseUrl}/sucursales`);
  }

  crearSucursalTenant(data: any): Observable<SucursalTenantModel> {
    return this.http.post<SucursalTenantModel>(`${this.baseUrl}/sucursales`, data);
  }

  getGuiaMedidas(productoId: number): Observable<GuiaMedidasResponseModel> {
    return this.http.get<GuiaMedidasResponseModel>(`${this.baseUrl}/productos/${productoId}/guia-medidas`);
  }

  getPoliticaGarantia(): Observable<PoliticaGarantiaModel> {
    return this.http.get<PoliticaGarantiaModel>(`${this.baseUrl}/politica-garantia`);
  }

  actualizarPoliticaGarantia(data: { plazo_dias_cambio?: number; requiere_etiqueta_original?: boolean }): Observable<PoliticaGarantiaModel> {
    return this.http.put<PoliticaGarantiaModel>(`${this.baseUrl}/politica-garantia`, data);
  }

  getMiSuscripcion(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/suscripciones/mi-suscripcion`);
  }

  renovarSuscripcion(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/suscripciones/renovar`, {});
  }

  cambiarPlan(nuevoPlanId: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/suscripciones/cambiar-plan`, { nuevo_plan_id: nuevoPlanId });
  }

  crearPlan(data: any): Observable<PlanSuscripcionModel> {
    return this.http.post<PlanSuscripcionModel>(`${this.baseUrl}/planes`, data);
  }

  guardarGuiaMedida(productoId: number, data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/productos/${productoId}/guia-medidas`, data);
  }
}
