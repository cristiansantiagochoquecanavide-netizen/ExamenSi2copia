import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import {
  VentaPOSCreate, VentaResponse,
  DevolucionCreate, DevolucionResponse, VentaParaDevolucionResponse,
  PagoElectronicoCreate, ConfirmarPagoRequest, PagoIniciarResponse, PagoResponse,
  VentaOnlineCheckoutRequest, ActualizarEstadoEnvioRequest, EnvioPedido,
  Promocion, PromocionCreate, PromocionUpdate, ValidarCuponRequest, ValidarCuponResponse
} from '../models/ventas.models';

@Injectable({
  providedIn: 'root'
})
export class VentasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/ventas`;

  getStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/status`);
  }

  registrarVentaPOS(data: VentaPOSCreate): Observable<VentaResponse> {
    return this.http.post<VentaResponse>(`${this.baseUrl}/pos`, data);
  }

  getVentas(sucursalId?: number, fecha?: string, canalVenta?: string): Observable<VentaResponse[]> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursal_id', sucursalId.toString());
    if (fecha) params = params.set('fecha', fecha);
    if (canalVenta) params = params.set('canal_venta', canalVenta);
    return this.http.get<VentaResponse[]>(this.baseUrl, { params });
  }

  getVentaById(id: number): Observable<VentaResponse> {
    return this.http.get<VentaResponse>(`${this.baseUrl}/${id}`);
  }

  // ----------------- CU11: DEVOLUCIONES Y CAMBIOS -----------------
  buscarVentaPorCodigo(codigo: string): Observable<VentaParaDevolucionResponse> {
    return this.http.get<VentaParaDevolucionResponse>(`${this.baseUrl}/buscar-codigo/${encodeURIComponent(codigo)}`);
  }

  registrarDevolucion(data: DevolucionCreate): Observable<DevolucionResponse> {
    return this.http.post<DevolucionResponse>(`${this.baseUrl}/devoluciones`, data);
  }

  getDevoluciones(sucursalId?: number, tipo?: string): Observable<DevolucionResponse[]> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursal_id', sucursalId.toString());
    if (tipo) params = params.set('tipo', tipo);
    return this.http.get<DevolucionResponse[]>(`${this.baseUrl}/devoluciones/lista`, { params });
  }

  getDevolucionById(id: number): Observable<DevolucionResponse> {
    return this.http.get<DevolucionResponse>(`${this.baseUrl}/devoluciones/${id}`);
  }

  // ----------------- CU12: PAGOS ELECTRÓNICOS -----------------
  iniciarPagoElectronico(data: PagoElectronicoCreate): Observable<PagoIniciarResponse> {
    return this.http.post<PagoIniciarResponse>(`${this.baseUrl}/pagos/iniciar`, data);
  }

  confirmarPagoElectronico(pagoId: number, data: ConfirmarPagoRequest): Observable<PagoResponse> {
    return this.http.post<PagoResponse>(`${this.baseUrl}/pagos/${pagoId}/confirmar`, data);
  }

  getPagosElectronicos(pasarela?: string, estado?: string): Observable<PagoResponse[]> {
    let params = new HttpParams();
    if (pasarela) params = params.set('pasarela', pasarela);
    if (estado) params = params.set('estado', estado);
    return this.http.get<PagoResponse[]>(`${this.baseUrl}/pagos`, { params });
  }

  getPagoById(id: number): Observable<PagoResponse> {
    return this.http.get<PagoResponse>(`${this.baseUrl}/pagos/${id}`);
  }

  notificarWebhook(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/pagos/webhook`, payload);
  }

  // ----------------- CU15: CARRITO & CHECKOUT E-COMMERCE -----------------
  procesarCheckoutOnline(data: VentaOnlineCheckoutRequest): Observable<VentaResponse> {
    return this.http.post<VentaResponse>(`${this.baseUrl}/checkout-online`, data);
  }

  getPedidosOnline(sucursalId?: number, estadoEnvio?: string, clienteId?: number): Observable<VentaResponse[]> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursal_id', sucursalId.toString());
    if (estadoEnvio) params = params.set('estado_envio', estadoEnvio);
    if (clienteId) params = params.set('cliente_id', clienteId.toString());
    return this.http.get<VentaResponse[]>(`${this.baseUrl}/pedidos-online`, { params });
  }

  actualizarEstadoEnvio(envioId: number, data: ActualizarEstadoEnvioRequest): Observable<EnvioPedido> {
    return this.http.put<EnvioPedido>(`${this.baseUrl}/pedidos-online/${envioId}/estado`, data);
  }

  // ----------------- CU16: PROMOCIONES Y DESCUENTOS -----------------
  validarCupon(data: ValidarCuponRequest): Observable<ValidarCuponResponse> {
    return this.http.post<ValidarCuponResponse>(`${this.baseUrl}/promociones/validar`, data);
  }

  getPromociones(soloActivas?: boolean, tipoDescuento?: string, soloVigentes?: boolean): Observable<Promocion[]> {
    let params = new HttpParams();
    if (soloActivas !== undefined) params = params.set('activo', soloActivas.toString());
    if (tipoDescuento) params = params.set('tipo_descuento', tipoDescuento);
    if (soloVigentes) params = params.set('solo_vigentes', 'true');
    return this.http.get<Promocion[]>(`${this.baseUrl}/promociones`, { params });
  }

  getPromocionById(id: number): Observable<Promocion> {
    return this.http.get<Promocion>(`${this.baseUrl}/promociones/${id}`);
  }

  createPromocion(data: PromocionCreate): Observable<Promocion> {
    return this.http.post<Promocion>(`${this.baseUrl}/promociones`, data);
  }

  updatePromocion(id: number, data: PromocionUpdate): Observable<Promocion> {
    return this.http.put<Promocion>(`${this.baseUrl}/promociones/${id}`, data);
  }

  cambiarEstadoPromocion(id: number, activo: boolean): Observable<Promocion> {
    return this.http.patch<Promocion>(`${this.baseUrl}/promociones/${id}/estado`, null, {
      params: { activo: activo.toString() }
    });
  }

  deletePromocion(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/promociones/${id}`);
  }
}



