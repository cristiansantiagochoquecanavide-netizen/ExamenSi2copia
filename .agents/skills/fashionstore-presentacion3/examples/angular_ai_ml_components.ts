/**
 * Componentes y Servicios Angular para PRESENTACIÓN 3: IA Generativa y Machine Learning
 * INF412 - Sistemas de Información 2 (MSc. Ing. Angélica Garzón Cuéllar)
 * 
 * Implementa:
 * - CU21: Asistente conversacional por texto y voz (Web Speech API) con Google Gemini.
 * - CU22: Visor de reportes tabulares y botones de exportación dinámica a PDF y Excel (Blob).
 * - CU23: Panel de control de modelos de Machine Learning (Métricas R², MAE, RMSE, Silhouette Score).
 */

import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// Declaración de tipos para Web Speech API del navegador
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface ConsultaIAResponse {
  reporte_id: number;
  prompt_consulta: str;
  tipo_entrada: 'TEXTO' | 'VOZ';
  sql_generado: string;
  respuesta_resumen: string;
  columnas: string[];
  datos_tabulares: any[];
  fecha_consulta: string;
}

export interface MLDemandaMetrics {
  modelo_id: number;
  nombre_modelo: string;
  precision_r2: number;
  mae: number;
  rmse: number;
}

export interface MLRFMCluster {
  cluster: number;
  nombre: string;
  recencia_dias: number;
  frecuencia_compras: number;
  gasto_medio_bs: number;
}

export interface MLRFMMetrics {
  modelo_id: number;
  nombre_modelo: string;
  num_clusters: number;
  silhouette_score: number;
  inercia_wcss: number;
  perfiles_clusters: MLRFMCluster[];
}

// ==============================================================================
// 1. SERVICIO ANGULAR PARA IA Y MACHINE LEARNING
// ==============================================================================

export class FashionAiMlService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/v1';

  consultarIA(prompt: string, tipoEntrada: 'TEXTO' | 'VOZ'): Observable<ConsultaIAResponse> {
    return this.http.post<ConsultaIAResponse>(`${this.baseUrl}/ia/consultar`, {
      prompt,
      tipo_entrada: tipoEntrada
    });
  }

  descargarReportePdf(reporteId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/ia/reportes/${reporteId}/exportar/pdf`, {
      responseType: 'blob'
    });
  }

  descargarReporteExcel(reporteId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/ia/reportes/${reporteId}/exportar/excel`, {
      responseType: 'blob'
    });
  }

  entrenarDemandaStock(): Observable<MLDemandaMetrics> {
    return this.http.post<MLDemandaMetrics>(`${this.baseUrl}/ml/entrenar/demanda`, {
      algoritmo: 'RandomForestRegressor',
      test_size: 0.2
    });
  }

  entrenarSegmentacionRFM(): Observable<MLRFMMetrics> {
    return this.http.post<MLRFMMetrics>(`${this.baseUrl}/ml/entrenar/segmentacion-rfm`, {
      num_clusters: 3
    });
  }
}

// ==============================================================================
// 2. COMPONENTE ASISTENTE IA (TEXTO Y VOZ CON EXPORTACIÓN) - CU21 & CU22
// ==============================================================================

@Component({
  selector: 'app-ai-report-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ai-assistant-card p-6 bg-white rounded-xl shadow-lg border border-gray-100 max-w-5xl mx-auto">
      <!-- Encabezado del Asistente -->
      <div class="flex items-center justify-between border-b pb-4 mb-4">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl">
            ✨
          </div>
          <div>
            <h2 class="text-xl font-bold text-gray-800">FashionStore AI - Asistente de Reportes</h2>
            <p class="text-xs text-gray-500">Consultas analíticas por Voz y Texto blindadas por Tenant</p>
          </div>
        </div>
        <span class="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center">
          <span class="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span> Gemini 1.5 Flash Conectado
        </span>
      </div>

      <!-- Barra de Entrada de Consulta con Micrófono -->
      <div class="relative flex items-center mb-6">
        <input
          type="text"
          [(ngModel)]="promptInput"
          (keyup.enter)="ejecutarConsulta('TEXTO')"
          placeholder="Ej: ¿Cuál es la prenda más vendida en la sucursal Norte este mes?"
          class="w-full pl-4 pr-24 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
          [disabled]="isLoading()"
        />

        <div class="absolute right-2 flex items-center space-x-1">
          <!-- Botón de Grabación de Voz -->
          <button
            type="button"
            (click)="toggleGrabacionVoz()"
            [title]="isRecording() ? 'Detener escucha' : 'Hablar por micrófono'"
            [class]="isRecording() ? 'bg-red-500 animate-bounce' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'"
            class="p-2 rounded-full transition-all focus:outline-none"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 02-3-3V5a3 3 0 116 0v6a3 3 0 02-3 3z"/>
            </svg>
          </button>

          <!-- Botón de Envío de Texto -->
          <button
            type="button"
            (click)="ejecutarConsulta('TEXTO')"
            [disabled]="isLoading() || !promptInput.trim()"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
          >
            Consultar
          </button>
        </div>
      </div>

      <!-- Banner de Escucha Activa -->
      <div *ngIf="isRecording()" class="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2 animate-pulse">
        <span>🎙️ <b>Escuchando voz del usuario...</b> Hable claramente sobre su consulta de inventario o ventas.</span>
      </div>

      <!-- Spinner de Carga -->
      <div *ngIf="isLoading()" class="py-12 text-center text-gray-500">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
        <p class="mt-2 text-sm font-medium">Analizando consulta con Google Gemini y aislando datos de empresa...</p>
      </div>

      <!-- Resultados del Reporte Generado -->
      <div *ngIf="reporteActual() && !isLoading()" class="mt-6 border-t pt-6 space-y-6">
        <!-- Síntesis Ejecutiva -->
        <div class="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg">
          <div class="flex items-center justify-between mb-1">
            <h3 class="font-bold text-blue-900 text-sm">Resumen Ejecutivo de IA</h3>
            <span class="text-xs text-blue-600 font-mono">Entrada: {{ reporteActual()?.tipo_entrada }}</span>
          </div>
          <p class="text-sm text-blue-800 leading-relaxed">{{ reporteActual()?.respuesta_resumen }}</p>
        </div>

        <!-- Botones de Acción de Exportación (CU22) -->
        <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
          <span class="text-xs text-gray-600 font-medium">Opciones de descarga corporativa:</span>
          <div class="flex space-x-2">
            <button
              (click)="exportarPdf()"
              class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold flex items-center space-x-1 shadow-sm transition"
            >
              <span>📄</span> <span>Exportar a PDF</span>
            </button>
            <button
              (click)="exportarExcel()"
              class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center space-x-1 shadow-sm transition"
            >
              <span>📊</span> <span>Exportar a Excel</span>
            </button>
          </div>
        </div>

        <!-- Tabla Estructurada de Datos -->
        <div class="overflow-x-auto border rounded-lg shadow-sm">
          <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-800 text-white">
              <tr>
                <th *ngFor="let col of reporteActual()?.columnas" class="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">
                  {{ col.replace('_', ' ') }}
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-100">
              <tr *ngFor="let row of reporteActual()?.datos_tabulares; let i = index" [class.bg-gray-50]="i % 2 === 1">
                <td *ngFor="let col of reporteActual()?.columnas" class="px-4 py-2 text-gray-700 font-mono text-xs">
                  {{ row[col] }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Verificación de Seguridad SQL -->
        <div class="bg-gray-900 text-gray-300 p-3 rounded-lg text-xs font-mono">
          <span class="text-green-400 font-bold">SQL Seguro Verificado (Read-Only):</span> {{ reporteActual()?.sql_generado }}
        </div>
      </div>
    </div>
  `
})
export class AiReportAssistantComponent implements OnInit, OnDestroy {
  private aiService = inject(FashionAiMlService);

  promptInput = '';
  isLoading = signal(false);
  isRecording = signal(false);
  reporteActual = signal<ConsultaIAResponse | null>(null);

  private recognition: any;

  ngOnInit(): void {
    this.iniciarReconocimientoVoz();
  }

  ngOnDestroy(): void {
    if (this.recognition) {
      this.recognition.abort();
    }
  }

  private iniciarReconocimientoVoz(): void {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'es-BO';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.promptInput = transcript;
        this.isRecording.set(false);
        this.ejecutarConsulta('VOZ');
      };

      this.recognition.onerror = () => {
        this.isRecording.set(false);
      };

      this.recognition.onend = () => {
        this.isRecording.set(false);
      };
    }
  }

  toggleGrabacionVoz(): void {
    if (!this.recognition) {
      alert('El reconocimiento por voz no es compatible con su navegador.');
      return;
    }
    if (this.isRecording()) {
      this.recognition.stop();
      this.isRecording.set(false);
    } else {
      this.isRecording.set(true);
      this.recognition.start();
    }
  }

  ejecutarConsulta(tipo: 'TEXTO' | 'VOZ'): void {
    if (!this.promptInput.trim()) return;

    this.isLoading.set(true);
    this.aiService.consultarIA(this.promptInput, tipo).subscribe({
      next: (res) => {
        this.reporteActual.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        alert(err?.error?.detail || 'Error al procesar consulta de IA.');
        this.isLoading.set(false);
      }
    });
  }

  exportarPdf(): void {
    const rep = this.reporteActual();
    if (!rep) return;
    this.aiService.descargarReportePdf(rep.reporte_id).subscribe((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_IA_${rep.reporte_id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  exportarExcel(): void {
    const rep = this.reporteActual();
    if (!rep) return;
    this.aiService.descargarReporteExcel(rep.reporte_id).subscribe((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_IA_${rep.reporte_id}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }
}

// ==============================================================================
// 3. COMPONENTE DASHBOARD DE MACHINE LEARNING - CU23
// ==============================================================================

@Component({
  selector: 'app-ml-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ml-dashboard p-6 bg-gray-50 min-h-screen">
      <div class="max-w-6xl mx-auto space-y-8">
        <!-- Título -->
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Panel de Modelos Analíticos de Machine Learning</h1>
          <p class="text-sm text-gray-500">Evaluación académica y matemática: Supervisado (Demanda de Stock) y No Supervisado (K-Means RFM)</p>
        </div>

        <!-- SECCIÓN 1: MODELO SUPERVISADO (PREDICCIÓN DE DEMANDA) -->
        <div class="bg-white rounded-xl shadow p-6 border border-gray-100">
          <div class="flex items-center justify-between mb-4 border-b pb-3">
            <div>
              <h2 class="text-lg font-bold text-gray-800">1. Modelo Supervisado: Predicción de Demanda de Stock</h2>
              <span class="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-semibold">RandomForestRegressor / OLS</span>
            </div>
            <button
              (click)="entrenarDemanda()"
              [disabled]="entrenandoDemanda"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow transition disabled:opacity-50"
            >
              {{ entrenandoDemanda ? 'Entrenando...' : 'Reentrenar y Evaluar Modelo' }}
            </button>
          </div>

          <div *ngIf="metricasDemanda" class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div class="p-4 bg-indigo-50 rounded-lg text-center border border-indigo-200">
              <span class="text-xs font-bold text-indigo-600 uppercase tracking-wider">Coeficiente R² (Bondad de Ajuste)</span>
              <p class="text-3xl font-extrabold text-indigo-900 mt-1">{{ metricasDemanda.precision_r2 }}</p>
              <span class="text-xs text-indigo-700">Meta Académica: R² ≥ 0.70</span>
            </div>

            <div class="p-4 bg-emerald-50 rounded-lg text-center border border-emerald-200">
              <span class="text-xs font-bold text-emerald-600 uppercase tracking-wider">MAE (Error Absoluto Medio)</span>
              <p class="text-3xl font-extrabold text-emerald-900 mt-1">{{ metricasDemanda.mae }} u.</p>
              <span class="text-xs text-emerald-700">Desvío medio en prendas</span>
            </div>

            <div class="p-4 bg-amber-50 rounded-lg text-center border border-amber-200">
              <span class="text-xs font-bold text-amber-600 uppercase tracking-wider">RMSE (Raíz Error Cuadrático)</span>
              <p class="text-3xl font-extrabold text-amber-900 mt-1">{{ metricasDemanda.rmse }} u.</p>
              <span class="text-xs text-amber-700">Penalización de desvíos grandes</span>
            </div>
          </div>
        </div>

        <!-- SECCIÓN 2: MODELO NO SUPERVISADO (SEGMENTACIÓN RFM) -->
        <div class="bg-white rounded-xl shadow p-6 border border-gray-100">
          <div class="flex items-center justify-between mb-4 border-b pb-3">
            <div>
              <h2 class="text-lg font-bold text-gray-800">2. Modelo No Supervisado: Segmentación de Clientes RFM</h2>
              <span class="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-semibold">K-Means Clustering (k=3)</span>
            </div>
            <button
              (click)="entrenarRFM()"
              [disabled]="entrenandoRFM"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow transition disabled:opacity-50"
            >
              {{ entrenandoRFM ? 'Calculando Clusters...' : 'Ejecutar Clustering RFM' }}
            </button>
          </div>

          <div *ngIf="metricasRFM">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div class="p-4 bg-purple-50 rounded-lg text-center border border-purple-200">
                <span class="text-xs font-bold text-purple-600 uppercase tracking-wider">Silhouette Score (Separación)</span>
                <p class="text-3xl font-extrabold text-purple-900 mt-1">{{ metricasRFM.silhouette_score }}</p>
                <span class="text-xs text-purple-700">Calidad del agrupamiento (> 0.25)</span>
              </div>
              <div class="p-4 bg-gray-50 rounded-lg text-center border border-gray-200">
                <span class="text-xs font-bold text-gray-600 uppercase tracking-wider">Inercia / WCSS</span>
                <p class="text-3xl font-extrabold text-gray-800 mt-1">{{ metricasRFM.inercia_wcss }}</p>
                <span class="text-xs text-gray-500">Suma de cuadrados intra-cluster</span>
              </div>
            </div>

            <h3 class="text-sm font-bold text-gray-700 mb-3">Perfiles Estratégicos Detectados por K-Means:</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div *ngFor="let p of metricasRFM.perfiles_clusters" class="p-4 border rounded-lg bg-gray-50 hover:border-emerald-500 transition">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Cluster {{ p.cluster }}</span>
                </div>
                <h4 class="font-bold text-gray-800 text-sm mb-2">{{ p.nombre }}</h4>
                <div class="text-xs text-gray-600 space-y-1 font-mono">
                  <p>• Recencia: {{ p.recencia_dias }} días</p>
                  <p>• Frecuencia: {{ p.frecuencia_compras }} pedidos</p>
                  <p>• Gasto Promedio: Bs. {{ p.gasto_medio_bs }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class MlDashboardComponent implements OnInit {
  private aiService = inject(FashionAiMlService);

  entrenandoDemanda = false;
  entrenandoRFM = false;

  metricasDemanda: MLDemandaMetrics | null = null;
  metricasRFM: MLRFMMetrics | null = null;

  ngOnInit(): void {
    this.entrenarDemanda();
    this.entrenarRFM();
  }

  entrenarDemanda(): void {
    this.entrenandoDemanda = true;
    this.aiService.entrenarDemandaStock().subscribe({
      next: (data) => {
        this.metricasDemanda = data;
        this.entrenandoDemanda = false;
      },
      error: () => {
        this.entrenandoDemanda = false;
      }
    });
  }

  entrenarRFM(): void {
    this.entrenandoRFM = true;
    this.aiService.entrenarSegmentacionRFM().subscribe({
      next: (data) => {
        this.metricasRFM = data;
        this.entrenandoRFM = false;
      },
      error: () => {
        this.entrenandoRFM = false;
      }
    });
  }
}
