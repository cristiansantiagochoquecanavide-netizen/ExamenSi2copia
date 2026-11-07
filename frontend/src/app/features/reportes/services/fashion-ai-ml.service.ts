import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

export interface ConsultaIAResponse {
  reporte_id: number;
  empresa_id: number;
  empresa_nombre: string;
  prompt_consulta: string;
  tipo_entrada: 'TEXTO' | 'VOZ' | string;
  sql_generado: string;
  respuesta_resumen: string;
  columnas: string[];
  datos_tabulares: Record<string, any>[];
  formato_exportacion: string;
  motor_ia: string;
  fecha_consulta: string;
}

export interface ReporteIAHistorialItem {
  reporte_id: number;
  empresa_id: number;
  prompt_consulta: string;
  tipo_entrada: string;
  sql_generado?: string;
  respuesta_resumen?: string;
  formato_exportacion: string;
  fecha_consulta: string;
}

export interface ProyeccionStockItem {
  prenda: string;
  talla: string;
  sucursal: string;
  stock_actual: number;
  demanda_proyectada_7d: number;
  riesgo_quiebre: string;
}

export interface PuntoComparativoDemanda {
  indice: number;
  etiqueta: string;
  demanda_real: number;
  demanda_predicha: number;
}

export interface MLDemandaTrainResponse {
  modelo_id: number;
  empresa_id: number;
  nombre_modelo: string;
  tipo_aprendizaje: string;
  variable_objetivo: string;
  precision_r2: number;
  mae: number;
  rmse: number;
  parametros: Record<string, any>;
  importancia_variables: { variable: string; importancia_pct: number }[];
  serie_comparativa: PuntoComparativoDemanda[];
  proyecciones_stock: ProyeccionStockItem[];
  fecha_entrenamiento: string;
}

export interface PerfilClusterRFM {
  cluster: number;
  nombre: string;
  cantidad_clientes: number;
  recencia_dias: number;
  frecuencia_compras: number;
  gasto_medio_bs: number;
  accion_sugerida: string;
  color_hex: string;
}

export interface PuntoClienteRFM {
  cliente: string;
  cluster: number;
  segmento: string;
  recencia_dias: number;
  frecuencia_compras: number;
  monto_total_bs: number;
}

export interface PuntoCodoWCSS {
  k: number;
  wcss: number;
}

export interface MLRFMTrainResponse {
  modelo_id: number;
  empresa_id: number;
  nombre_modelo: string;
  tipo_aprendizaje: string;
  num_clusters: number;
  total_clientes_analizados: number;
  silhouette_score: number;
  inercia_wcss: number;
  perfiles_clusters: PerfilClusterRFM[];
  puntos_clientes: PuntoClienteRFM[];
  curva_codo: PuntoCodoWCSS[];
  fecha_entrenamiento: string;
}

export interface MLEntrenarTodoResponse {
  empresa_id: number;
  supervisado_demanda: MLDemandaTrainResponse;
  no_supervisado_rfm: MLRFMTrainResponse;
}


export interface DistribucionSegmentoItem {
  segmento: string;
  clientes_count: number;
  porcentaje: number;
  color_hex: string;
}

export interface TendenciaDemandaItem {
  dia: string;
  demanda_estimada: number;
  limite_seguridad: number;
}

export interface DashboardAnaliticoMLResponse {
  empresa_id: number;
  precision_r2_demanda: number;
  silhouette_score_rfm: number;
  quiebres_inminentes_count: number;
  alertas_stock_minimo_count: number;
  total_variantes_evaluadas: number;
  distribucion_rfm: DistribucionSegmentoItem[];
  curva_tendencia_7d: TendenciaDemandaItem[];
  recomendaciones_ia: string[];
}

export interface ProyeccionStockDetalladaItem {
  variante_id: number;
  sku: string;
  prenda_nombre: string;
  talla: string;
  color: string;
  sucursal_id: number;
  sucursal_nombre: string;
  stock_disponible: number;
  demanda_proyectada_7d: number;
  dias_de_cobertura: number;
  estado_riesgo: 'QUIEBRE_INMINENTE' | 'STOCK_MINIMO' | 'STOCK_SUFICIENTE';
  accion_sugerida: string;
  rotacion_semanal_estimada: number;
}

export interface ProyeccionesStockResponse {
  empresa_id: number;
  total_analizadas: number;
  quiebres_inminentes: number;
  en_alerta_minimo: number;
  items: ProyeccionStockDetalladaItem[];
}

export interface ModeloMLPersistedItem {
  id: number;
  empresa_id: number;
  nombre_modelo: string;
  tipo_aprendizaje: string;
  variable_objetivo?: string;
  precision_metrica?: number;
  parametros_json?: Record<string, any>;
  fecha_entrenamiento: string;
  activo: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FashionAiMlService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private recognition: any = null;
  private readonly synth: SpeechSynthesis | null =
    typeof window !== 'undefined' ? window.speechSynthesis : null;

  constructor() {
    this.initSpeechRecognition();
  }

  private buildHeaders(overrideTenantId?: number): HttpHeaders {
    let headers = new HttpHeaders();
    const token = this.authService.getToken();
    if (overrideTenantId !== undefined && overrideTenantId !== null) {
      headers = headers.set('X-Tenant-ID', String(overrideTenantId));
    } else if (!token) {
      const fallbackTenant = this.authService.currentTenant().empresaId || 1;
      headers = headers.set('X-Tenant-ID', String(fallbackTenant));
    }
    return headers;
  }

  // =========================================================================
  // CU21: CONSULTAS EN LENGUAJE NATURAL (TEXTO / VOZ) CON GEMINI
  // =========================================================================

  consultarIA(
    prompt: string,
    tipoEntrada: 'TEXTO' | 'VOZ' = 'TEXTO',
    overrideTenantId?: number
  ): Observable<ConsultaIAResponse> {
    return this.http.post<ConsultaIAResponse>(
      `${this.apiUrl}/ia/consultar`,
      { prompt, tipo_entrada: tipoEntrada },
      { headers: this.buildHeaders(overrideTenantId) }
    );
  }

  listarHistorialIA(limit: number = 15, overrideTenantId?: number): Observable<ReporteIAHistorialItem[]> {
    return this.http.get<ReporteIAHistorialItem[]>(
      `${this.apiUrl}/ia/historial?limit=${limit}`,
      { headers: this.buildHeaders(overrideTenantId) }
    );
  }

  obtenerDetalleReporteIA(reporteId: number, overrideTenantId?: number): Observable<ConsultaIAResponse> {
    return this.http.get<ConsultaIAResponse>(
      `${this.apiUrl}/ia/reportes/${reporteId}`,
      { headers: this.buildHeaders(overrideTenantId) }
    );
  }

  // =========================================================================
  // CU22: EXPORTACIÓN DINÁMICA DE REPORTES DE IA (PDF / EXCEL)
  // =========================================================================

  exportarReportePDF(reporteId: number, overrideTenantId?: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/ia/reportes/${reporteId}/exportar/pdf`, {
      headers: this.buildHeaders(overrideTenantId),
      responseType: 'blob'
    });
  }

  exportarReporteExcel(reporteId: number, overrideTenantId?: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/ia/reportes/${reporteId}/exportar/excel`, {
      headers: this.buildHeaders(overrideTenantId),
      responseType: 'blob'
    });
  }

  descargarBlobEnNavegador(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }

  // =========================================================================
  // CU23: ENTRENAMIENTO Y EVALUACIÓN DE MACHINE LEARNING
  // =========================================================================

  entrenarDemandaStock(
    algoritmo: string = 'RandomForestRegressor',
    diasHistorico: number = 90,
    testSize: number = 0.2,
    overrideTenantId?: number
  ): Observable<MLDemandaTrainResponse> {
    return this.http.post<MLDemandaTrainResponse>(
      `${this.apiUrl}/ml/entrenar/demanda`,
      { algoritmo, dias_historico: diasHistorico, test_size: testSize },
      { headers: this.buildHeaders(overrideTenantId) }
    );
  }

  entrenarSegmentacionRFM(
    numClusters: number = 3,
    overrideTenantId?: number
  ): Observable<MLRFMTrainResponse> {
    return this.http.post<MLRFMTrainResponse>(
      `${this.apiUrl}/ml/entrenar/segmentacion-rfm`,
      { num_clusters: numClusters },
      { headers: this.buildHeaders(overrideTenantId) }
    );
  }

  entrenarTodosLosModelos(overrideTenantId?: number): Observable<MLEntrenarTodoResponse> {
    return this.http.post<MLEntrenarTodoResponse>(
      `${this.apiUrl}/ml/entrenar-todo`,
      {},
      { headers: this.buildHeaders(overrideTenantId) }
    );
  }

  listarModelosML(overrideTenantId?: number): Observable<ModeloMLPersistedItem[]> {
    return this.http.get<ModeloMLPersistedItem[]>(
      `${this.apiUrl}/ml/modelos`,
      { headers: this.buildHeaders(overrideTenantId) }
    );
  }

  // =========================================================================
  // WEB SPEECH API: RECONOCIMIENTO Y SÍNTESIS DE VOZ
  // =========================================================================

  private initSpeechRecognition(): void {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'es-BO';
    }
  }

  isSpeechRecognitionSupported(): boolean {
    return this.recognition !== null;
  }

  startVoiceCapture(
    onInterim: (text: string) => void,
    onFinal: (text: string) => void,
    onError: (err: any) => void,
    onEnd: () => void
  ): void {
    if (!this.recognition) {
      onError(new Error('Reconocimiento de voz nativo no soportado en este navegador. Use Chrome o Edge.'));
      return;
    }
    this.recognition.onresult = (event: any) => {
      let interim = '';
      let finalTxt = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTxt += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (interim) onInterim(interim);
      if (finalTxt) onFinal(finalTxt.trim());
    };
    this.recognition.onerror = (ev: any) => onError(ev);
    this.recognition.onend = () => onEnd();
    try {
      this.recognition.start();
    } catch (err) {
      onError(err);
    }
  }

  stopVoiceCapture(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (_) {}
    }
  }

  speakSynthesis(text: string, onStart?: () => void, onEnd?: () => void): void {
    if (!this.synth) return;
    this.stopSynthesis();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.04;
    const voices = this.synth.getVoices();
    const spanishVoice = voices.find(v => v.lang.startsWith('es'));
    if (spanishVoice) utterance.voice = spanishVoice;
    if (onStart) utterance.onstart = () => onStart();
    if (onEnd) {
      utterance.onend = () => onEnd();
      utterance.onerror = () => onEnd();
    }
    this.synth.speak(utterance);
  }

  stopSynthesis(): void {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  // =========================================================================
  // CU24: DASHBOARD ANALÍTICO Y PREDICCIONES DE STOCK A 7 DÍAS
  // =========================================================================
  obtenerDashboardAnalitico(overrideTenantId?: number): Observable<DashboardAnaliticoMLResponse> {
    return this.http.get<DashboardAnaliticoMLResponse>(
      `${this.apiUrl}/ml/dashboard`,
      { headers: this.buildHeaders(overrideTenantId) }
    );
  }

  obtenerProyeccionesStock(sucursalId?: number, overrideTenantId?: number): Observable<ProyeccionesStockResponse> {
    let url = `${this.apiUrl}/ml/proyecciones-stock`;
    if (sucursalId) {
      url += `?sucursal_id=${sucursalId}`;
    }
    return this.http.get<ProyeccionesStockResponse>(
      url,
      { headers: this.buildHeaders(overrideTenantId) }
    );
  }
}
