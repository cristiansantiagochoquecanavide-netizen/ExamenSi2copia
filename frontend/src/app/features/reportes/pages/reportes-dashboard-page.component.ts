import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReportesService } from '../services/reportes.service';
import {
  DashboardReporteResponse,
  AnalisisVozResponse,
  SalesVelocityPoint,
  InventoryAlertItem,
  RecentOrderRow,
  TopProductItem
} from '../models/reportes.models';

@Component({
  selector: 'app-reportes-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-[#131313] text-[#e2e2e2] font-sans selection:bg-[#e9c349]/30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        <!-- ========================================== -->
        <!-- TOP BANNER / HEADLINE AREA (STITCH THEME) -->
        <!-- ========================================== -->
        <header class="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#353535]/60">
          <div>
            <div class="flex items-center gap-2 mb-2 text-xs tracking-widest uppercase text-[#8e9192]">
              <span>Atelier Control Center</span>
              <span>/</span>
              <span class="text-[#e9c349] font-medium">Global Operations &amp; Voice BI</span>
            </div>
            <h1 class="text-3xl sm:text-4xl font-serif tracking-tight text-white">
              Overview Dashboard &amp; Análisis por Voz
            </h1>
            <p class="text-sm text-[#8e9192] mt-1">
              Inteligencia comercial en tiempo real sincronizada con omnicanalidad y probadores VIP.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <!-- Rango selector -->
            <div class="inline-flex rounded-sm bg-[#1b1b1b] p-1 border border-[#353535]">
              <button
                *ngFor="let r of rangosDisponibles"
                type="button"
                (click)="cambiarRango(r.id)"
                [ngClass]="selectedRango() === r.id ? 'bg-[#353535] text-[#e9c349]' : 'text-[#8e9192]'"
                class="px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors rounded-sm hover:text-white">
                {{ r.label }}
              </button>
            </div>

            <!-- Exportar CSV -->
            <button
              type="button"
              (click)="exportarReporte()"
              [disabled]="exporting()"
              class="inline-flex items-center gap-2 bg-white text-[#131313] px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-[#e9c349] hover:text-[#131313] transition-all border border-transparent shadow-sm disabled:opacity-50">
              <svg *ngIf="!exporting()" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span *ngIf="exporting()" class="animate-spin inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full"></span>
              <span>{{ exporting() ? 'Exportando...' : 'Exportar Reporte' }}</span>
            </button>
          </div>
        </header>

        <!-- ============================================================== -->
        <!-- MOTOR DE ANÁLISIS POR VOZ CON IA (HAUTE COUTURE EXECUTIVE BI) -->
        <!-- ============================================================== -->
        <section class="relative overflow-hidden rounded-md bg-[#1b1b1b] border border-[#e9c349]/40 p-6 shadow-xl transition-all">
          <div class="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-[#e9c349]/5 rounded-full blur-3xl pointer-events-none"></div>

          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <!-- Voice engine header -->
            <div class="space-y-1">
              <div class="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[#e9c349] font-medium">
                <span class="w-2 h-2 rounded-full bg-[#e9c349] animate-pulse"></span>
                <span>Asistente Ejecutivo de Voz IA &bull; Natural Language BI</span>
              </div>
              <h2 class="text-xl font-serif text-white">
                Consulta Verbal del Atelier
              </h2>
              <p class="text-xs text-[#8e9192]">
                Haz preguntas sobre ventas, stock crítico, citas en probadores o proyecciones. El motor formula diagnósticos ejecutivos hablados.
              </p>
            </div>

            <!-- Voice Controls Zone -->
            <div class="flex flex-wrap items-center gap-3">
              <!-- Micro button -->
              <button
                type="button"
                (click)="toggleVoiceRecording()"
                [ngClass]="isListening() ? 'bg-red-600 text-white border-red-500 animate-pulse' : 'bg-[#2a2a2a] text-[#e9c349] border-[#e9c349]/50'"
                class="inline-flex items-center gap-3 px-5 py-3 rounded-full border text-sm font-semibold tracking-wide transition-all hover:scale-105 shadow-md">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span>{{ isListening() ? 'Escuchando... (Toca para detener)' : 'Hablar con Asistente' }}</span>

                <!-- Animated Audio Wave -->
                <div *ngIf="isListening()" class="flex items-center gap-1 ml-1">
                  <span class="w-1 h-3 bg-white rounded animate-bounce"></span>
                  <span class="w-1 h-5 bg-white rounded animate-bounce delay-100"></span>
                  <span class="w-1 h-2 bg-white rounded animate-bounce delay-200"></span>
                  <span class="w-1 h-4 bg-white rounded animate-bounce delay-150"></span>
                </div>
              </button>

              <!-- Text fallback input -->
              <form (ngSubmit)="ejecutarConsultaTexto()" class="flex items-center gap-2">
                <input
                  type="text"
                  [(ngModel)]="textQueryInput"
                  name="textQueryInput"
                  placeholder="O escribe tu consulta aquí..."
                  class="bg-[#131313] border border-[#353535] text-xs text-white px-3 py-2.5 rounded-sm focus:outline-none focus:border-[#e9c349] w-56 sm:w-64"
                />
                <button
                  type="submit"
                  [disabled]="!textQueryInput.trim() || isProcessingVoice()"
                  class="bg-[#353535] hover:bg-[#e9c349] hover:text-black text-white px-3 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors disabled:opacity-40">
                  Consultar
                </button>
              </form>
            </div>
          </div>

          <!-- Interim transcription display -->
          <div *ngIf="isListening() || currentTranscript()" class="mt-4 p-3 bg-[#131313]/90 border border-[#e9c349]/30 rounded text-sm text-[#e2e2e2] flex items-center gap-3">
            <span class="text-[#e9c349] font-bold text-xs uppercase tracking-wider">Transcribiendo:</span>
            <span class="italic font-light text-white">"{{ currentTranscript() || 'Escuchando tu voz...' }}"</span>
          </div>

          <!-- Quick suggestions pills -->
          <div class="mt-5 pt-4 border-t border-[#353535]/50 flex flex-wrap items-center gap-2 text-xs">
            <span class="text-[#8e9192] uppercase tracking-wider font-semibold mr-1">Preguntas rápidas:</span>
            <button
              *ngFor="let pill of quickPills"
              type="button"
              (click)="consultarPorPill(pill.query)"
              class="bg-[#2a2a2a] hover:bg-[#353535] hover:text-[#e9c349] border border-[#353535] text-[#c4c7c8] px-3 py-1.5 rounded-full transition-all text-xs">
              {{ pill.label }}
            </button>
          </div>

          <!-- Loading state for Voice Analysis -->
          <div *ngIf="isProcessingVoice()" class="mt-6 p-4 bg-[#131313] border border-[#353535] rounded-md flex items-center gap-3 text-sm text-[#e9c349]">
            <span class="animate-spin inline-block w-4 h-4 border-2 border-[#e9c349] border-t-transparent rounded-full"></span>
            <span>El motor de IA está procesando las transacciones y formulando el informe gerencial...</span>
          </div>

          <!-- ============================================== -->
          <!-- VOICE AI ANALYSIS RESULT PANEL (SPEAKABLE)     -->
          <!-- ============================================== -->
          <div *ngIf="voiceAnalysis() && !isProcessingVoice()" class="mt-6 p-5 bg-[#131313] border border-[#e9c349] rounded-md shadow-2xl animate-fadeIn space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#353535]">
              <div class="flex items-center gap-3">
                <span class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest bg-[#e9c349] text-[#131313] rounded-sm">
                  {{ voiceAnalysis()?.intencion_detectada }}
                </span>
                <span class="text-xs text-[#8e9192]">Consulta:</span>
                <span class="text-sm text-white font-serif italic">"{{ voiceAnalysis()?.pregunta }}"</span>
              </div>

              <!-- TTS Speaker Button -->
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  (click)="toggleTTSPlayback()"
                  [ngClass]="isSpeaking() ? 'bg-[#e9c349] text-black' : 'bg-[#2a2a2a] text-white'"
                  class="inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider hover:bg-[#e9c349] hover:text-black transition-all border border-[#e9c349]/40">
                  <svg *ngIf="!isSpeaking()" class="w-4 h-4 text-[#e9c349]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  <svg *ngIf="isSpeaking()" class="w-4 h-4 text-black animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{{ isSpeaking() ? 'Detener Voz' : 'Escuchar Voz IA' }}</span>
                </button>

                <button
                  type="button"
                  (click)="cerrarAnalisisVoz()"
                  class="text-[#8e9192] hover:text-white p-1 text-lg leading-none"
                  title="Cerrar tarjeta de diagnóstico">
                  &times;
                </button>
              </div>
            </div>

            <!-- Analysis content breakdown -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <!-- 1. Cuantitativo -->
              <div class="bg-[#1b1b1b] p-3.5 rounded border border-[#353535]/60 space-y-1.5">
                <div class="text-[11px] font-semibold tracking-wider uppercase text-[#e9c349] flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  Diagnóstico Cuantitativo
                </div>
                <p class="text-[#c4c7c8] leading-relaxed">
                  {{ voiceAnalysis()?.diagnostico_cuantitativo }}
                </p>
              </div>

              <!-- 2. Interpretación Negocio -->
              <div class="bg-[#1b1b1b] p-3.5 rounded border border-[#353535]/60 space-y-1.5">
                <div class="text-[11px] font-semibold tracking-wider uppercase text-white flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-[#e9c349]\" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                  Interpretación Estratégica
                </div>
                <p class="text-[#c4c7c8] leading-relaxed">
                  {{ voiceAnalysis()?.interpretacion_negocio }}
                </p>
              </div>

              <!-- 3. Recomendaciones -->
              <div class="bg-[#1b1b1b] p-3.5 rounded border border-[#353535]/60 space-y-1.5">
                <div class="text-[11px] font-semibold tracking-wider uppercase text-[#e9c349] flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Recomendaciones Accionables
                </div>
                <ul class="space-y-1 text-[#c4c7c8]">
                  <li *ngFor="let rec of voiceAnalysis()?.recomendaciones_estrategicas" class="flex items-start gap-1.5">
                    <span class="text-[#e9c349] font-bold">&bull;</span>
                    <span>{{ rec }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <!-- ========================================== -->
        <!-- KEY METRIC CARDS (4 KPI GRID - STITCH)     -->
        <!-- ========================================== -->
        <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <!-- Card 1: Revenue -->
          <div class="bg-[#1b1b1b] p-6 flex flex-col justify-between relative overflow-hidden group hover:bg-[#1f1f1f] transition-all rounded-sm border-t-2 border-[#e9c349]">
            <div class="flex justify-between items-start mb-4">
              <span class="text-xs uppercase tracking-wider text-[#8e9192] font-semibold">Total Revenue</span>
              <svg class="w-5 h-5 text-[#e9c349]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <div class="text-3xl font-serif text-white mb-1">
                {{ (dashboardData()?.kpis?.total_revenue || 0) | currency:'USD':'symbol':'1.2-2' }}
              </div>
              <div class="flex items-center text-xs text-[#e9c349]">
                <span class="font-medium">+{{ dashboardData()?.kpis?.revenue_change_pct || 12.4 }}%</span>
                <span class="text-[#8e9192] ml-1 font-light">vs período anterior</span>
              </div>
            </div>
          </div>

          <!-- Card 2: Active Orders -->
          <div class="bg-[#1b1b1b] p-6 flex flex-col justify-between relative overflow-hidden group hover:bg-[#1f1f1f] transition-all rounded-sm border-t-2 border-white">
            <div class="flex justify-between items-start mb-4">
              <span class="text-xs uppercase tracking-wider text-[#8e9192] font-semibold">Active Orders</span>
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <div class="text-3xl font-serif text-white mb-1">
                {{ dashboardData()?.kpis?.active_orders || 24 }}
              </div>
              <div class="flex items-center text-xs text-[#8e9192]">
                <span class="inline-block w-2 h-2 rounded-full bg-[#e9c349] mr-1.5"></span>
                <span>{{ dashboardData()?.kpis?.in_progress_fulfillment || 6 }} en empaque final</span>
              </div>
            </div>
          </div>

          <!-- Card 3: Conversion Rate -->
          <div class="bg-[#1b1b1b] p-6 flex flex-col justify-between relative overflow-hidden group hover:bg-[#1f1f1f] transition-all rounded-sm border-t-2 border-[#e9c349]">
            <div class="flex justify-between items-start mb-4">
              <span class="text-xs uppercase tracking-wider text-[#8e9192] font-semibold">Conversion Rate</span>
              <svg class="w-5 h-5 text-[#e9c349]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <div class="text-3xl font-serif text-white mb-1">
                {{ dashboardData()?.kpis?.conversion_rate || 9.9 }}%
              </div>
              <div class="flex items-center text-xs text-[#e9c349]">
                <span class="font-medium">+{{ dashboardData()?.kpis?.conversion_change_pct || 0.6 }}%</span>
                <span class="text-[#8e9192] ml-1 font-light">probador a venta</span>
              </div>
            </div>
          </div>

          <!-- Card 4: Avg Order Value -->
          <div class="bg-[#1b1b1b] p-6 flex flex-col justify-between relative overflow-hidden group hover:bg-[#1f1f1f] transition-all rounded-sm border-t-2 border-white">
            <div class="flex justify-between items-start mb-4">
              <span class="text-xs uppercase tracking-wider text-[#8e9192] font-semibold">Avg. Order Value</span>
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <div class="text-3xl font-serif text-white mb-1">
                {{ (dashboardData()?.kpis?.avg_order_value || 320) | currency:'USD':'symbol':'1.0-0' }}
              </div>
              <div class="flex items-center text-xs text-[#8e9192]">
                <span>Promedio global de curaduría</span>
              </div>
            </div>
          </div>
        </section>

        <!-- ======================================================= -->
        <!-- MAIN SECTION: SALES VELOCITY CHART & INVENTORY ALERTS   -->
        <!-- ======================================================= -->
        <section class="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <!-- Sales Velocity Trend Chart (8 Cols) -->
          <div class="lg:col-span-8 bg-[#1b1b1b] p-6 rounded-sm border border-[#353535]/50 flex flex-col justify-between">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 class="text-xl font-serif text-white">Sales Velocity Trend</h2>
                <p class="text-xs text-[#8e9192]">Flujo de facturación e intensidad de compra en Ateliers y Flagships</p>
              </div>
              <div class="text-xs text-[#e9c349] font-mono tracking-wider">
                Período: {{ selectedRango() }}
              </div>
            </div>

            <!-- SVG Line Chart with Dynamic Data Points -->
            <div class="w-full h-64 relative flex items-end pt-4">
              <svg class="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 800 200">
                <!-- Background Grid Lines -->
                <line stroke="rgba(255,255,255,0.05)" stroke-width="1" x1="0" x2="800" y1="0" y2="0"></line>
                <line stroke="rgba(255,255,255,0.05)" stroke-width="1" x1="0" x2="800" y1="50" y2="50"></line>
                <line stroke="rgba(255,255,255,0.05)" stroke-width="1" x1="0" x2="800" y1="100" y2="100"></line>
                <line stroke="rgba(255,255,255,0.05)" stroke-width="1" x1="0" x2="800" y1="150" y2="150"></line>
                <line stroke="rgba(255,255,255,0.05)" stroke-width="1" x1="0" x2="800" y1="200" y2="200"></line>

                <!-- Gradient Area under curve -->
                <defs>
                  <linearGradient id="chartGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stop-color="#e9c349" stop-opacity="0.22"></stop>
                    <stop offset="100%" stop-color="#e9c349" stop-opacity="0.0"></stop>
                  </linearGradient>
                </defs>

                <!-- Area Fill -->
                <path [attr.d]="svgAreaPath()" fill="url(#chartGrad)"></path>

                <!-- Line Stroke -->
                <path [attr.d]="svgLinePath()" fill="none" stroke="#ffffff" stroke-width="2.5"></path>

                <!-- Data Points (Golden Circles) -->
                <g *ngFor="let pt of chartCoordinates()">
                  <circle
                    [attr.cx]="pt.x"
                    [attr.cy]="pt.y"
                    r="5"
                    fill="#e9c349"
                    stroke="#131313"
                    stroke-width="2"
                    class="cursor-pointer transition-all hover:r-7"
                    (mouseenter)="activePoint = pt"
                  ></circle>
                </g>
              </svg>

              <!-- Hover Tooltip Overlay -->
              <div
                *ngIf="activePoint"
                class="absolute top-3 left-1/2 -translate-x-1/2 bg-[#131313] border border-[#e9c349] px-4 py-2 text-xs shadow-2xl pointer-events-none rounded">
                <span class="text-[#e9c349] font-bold">{{ activePoint.label }}: &dollar;{{ activePoint.monto | number:'1.2-2' }} USD</span>
                <span class="text-[#8e9192] ml-2 font-mono">({{ activePoint.transacciones }} pedidos)</span>
              </div>
            </div>

            <!-- X Axis Labels -->
            <div class="flex justify-between mt-4 text-[11px] text-[#8e9192] uppercase font-mono tracking-wider border-t border-[#353535]/30 pt-2">
              <span *ngFor="let pt of chartCoordinates()">{{ pt.label }}</span>
            </div>
          </div>

          <!-- Inventory Alerts (4 Cols) -->
          <div class="lg:col-span-4 bg-[#1b1b1b] p-6 rounded-sm border border-[#353535]/50 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <h2 class="text-xl font-serif text-white">Inventory Alerts</h2>
                <span class="text-xs uppercase tracking-wider text-[#e9c349] font-semibold bg-[#e9c349]/10 px-2 py-0.5 rounded">
                  {{ dashboardData()?.inventory_alerts?.length || 3 }} En Riesgo
                </span>
              </div>
              <p class="text-xs text-[#8e9192] mb-5">
                Umbrales de inventario crítico en sucursales y hubs de distribución.
              </p>

              <!-- List of Alerts -->
              <div class="space-y-3">
                <div
                  *ngFor="let alert of dashboardData()?.inventory_alerts"
                  class="p-3 bg-[#131313] border border-[#353535]/50 rounded flex items-center justify-between hover:border-[#e9c349]/50 transition-colors">
                  <div class="flex items-center gap-3">
                    <div class="w-11 h-11 bg-[#2a2a2a] rounded overflow-hidden flex-shrink-0">
                      <img
                        [src]="alert.imagen_url || 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=400&q=80'"
                        [alt]="alert.nombre"
                        class="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div class="text-xs font-medium text-white line-clamp-1">{{ alert.nombre }}</div>
                      <div class="text-[11px] text-[#e9c349]">{{ alert.sucursal }} &bull; {{ alert.stock_actual }} u. restantes</div>
                    </div>
                  </div>

                  <span
                    [ngClass]="alert.nivel_alerta === 'CRITICO' ? 'text-red-400' : 'text-[#e9c349]'"
                    class="text-xs font-bold font-mono uppercase">
                    {{ alert.nivel_alerta }}
                  </span>
                </div>
              </div>
            </div>

            <a
              routerLink="/inventario"
              class="w-full mt-6 text-center bg-transparent border border-[#353535] text-[#e2e2e2] py-2 text-xs uppercase tracking-wider hover:bg-[#2a2a2a] hover:text-[#e9c349] transition-all rounded-sm">
              Gestionar Matriz de Inventario
            </a>
          </div>
        </section>

        <!-- ======================================================== -->
        <!-- BOTTOM SECTION: TOP PRODUCTOS & RECENT HIGH-VALUE ORDERS -->
        <!-- ======================================================== -->
        <section class="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <!-- Top Productos Más Vendidos (4 Cols) -->
          <div class="lg:col-span-4 bg-[#1b1b1b] p-6 rounded-sm border border-[#353535]/50 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <h2 class="text-xl font-serif text-white">Top Productos Atelier</h2>
                <span class="text-xs text-[#8e9192] uppercase font-mono">Ranking</span>
              </div>
              <p class="text-xs text-[#8e9192] mb-5">Artículos con mayor tracción de facturación acumulada.</p>

              <div class="space-y-3">
                <div
                  *ngFor="let p of dashboardData()?.top_products; let i = index"
                  class="flex items-center justify-between p-3 bg-[#131313] border border-[#353535]/40 rounded hover:border-[#e9c349]/40 transition-all">
                  <div class="flex items-center gap-3">
                    <span class="text-xs font-mono font-bold text-[#e9c349] w-4">#{{ i + 1 }}</span>
                    <div class="w-9 h-9 bg-[#2a2a2a] rounded overflow-hidden flex-shrink-0">
                      <img
                        [src]="p.imagen_url || 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=400&q=80'"
                        [alt]="p.nombre"
                        class="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div class="text-xs font-medium text-white line-clamp-1">{{ p.nombre }}</div>
                      <div class="text-[11px] text-[#8e9192]">{{ p.unidades_vendidas }} unidades vendidas</div>
                    </div>
                  </div>
                  <div class="text-xs font-semibold text-[#e9c349] font-mono">
                    &dollar;{{ p.ingresos_totales | number:'1.0-0' }}
                  </div>
                </div>
              </div>
            </div>

            <a
              routerLink="/catalogo"
              class="w-full mt-6 text-center bg-transparent border border-[#353535] text-[#e2e2e2] py-2 text-xs uppercase tracking-wider hover:bg-[#2a2a2a] hover:text-[#e9c349] transition-all rounded-sm">
              Ver Colección Completa
            </a>
          </div>

          <!-- Recent High-Value Orders (8 Cols) -->
          <div class="lg:col-span-8 bg-[#1b1b1b] p-6 rounded-sm border border-[#353535]/50">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 class="text-xl font-serif text-white">Recent High-Value Orders</h2>
                <p class="text-xs text-[#8e9192]">Transacciones recientes registradas en POS y Boutique Online</p>
              </div>
              <div class="relative">
                <input
                  type="text"
                  [(ngModel)]="filterOrderText"
                  placeholder="Filtrar ordenes..."
                  class="bg-[#131313] text-white text-xs px-3 py-1.5 border border-[#353535] rounded-sm focus:outline-none focus:border-[#e9c349] w-48"
                />
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-[#353535] text-[11px] uppercase tracking-wider text-[#8e9192]">
                    <th class="py-3 px-3">Order ID</th>
                    <th class="py-3 px-3">Cliente</th>
                    <th class="py-3 px-3">Prendas / Resumen</th>
                    <th class="py-3 px-3">Sucursal</th>
                    <th class="py-3 px-3 text-right">Monto</th>
                    <th class="py-3 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody class="text-xs divide-y divide-[#353535]/40">
                  <tr
                    *ngFor="let ord of filteredOrders()"
                    class="hover:bg-[#131313]/60 transition-colors">
                    <td class="py-3 px-3 font-mono text-[#e9c349] font-medium">{{ ord.codigo_pedido }}</td>
                    <td class="py-3 px-3 font-medium text-white">{{ ord.cliente_nombre }}</td>
                    <td class="py-3 px-3 text-[#c4c7c8]">{{ ord.items_resumen }}</td>
                    <td class="py-3 px-3 text-[#8e9192]">{{ ord.sucursal_o_ciudad }}</td>
                    <td class="py-3 px-3 text-right font-medium text-white font-mono">&dollar;{{ ord.monto_total | number:'1.2-2' }}</td>
                    <td class="py-3 px-3 text-center">
                      <span
                        [class.bg-emerald-950]="ord.estado === 'PAGADA' || ord.estado === 'ENTREGADO'"
                        [class.text-emerald-400]="ord.estado === 'PAGADA' || ord.estado === 'ENTREGADO'"
                        [class.bg-amber-950]="ord.estado === 'EN PROCESO' || ord.estado === 'PENDIENTE'"
                        [class.text-amber-400]="ord.estado === 'EN PROCESO' || ord.estado === 'PENDIENTE'"
                        [class.bg-blue-950]="ord.estado === 'DESPACHADO'"
                        [class.text-blue-400]="ord.estado === 'DESPACHADO'"
                        class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm">
                        {{ ord.estado }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex items-center justify-between mt-5 pt-3 border-t border-[#353535]/30 text-xs text-[#8e9192]">
              <span>Mostrando órdenes recientes del Atelier</span>
              <a routerLink="/ventas" class="text-white hover:text-[#e9c349] uppercase tracking-wider font-semibold transition-colors">
                Ver Todas las Ventas &rarr;
              </a>
            </div>
          </div>
        </section>

      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.25s ease-out forwards;
    }
  `]
})
export class ReportesDashboardPageComponent implements OnInit, OnDestroy {
  private reportesService = inject(ReportesService);

  // States
  loading = signal<boolean>(true);
  exporting = signal<boolean>(false);
  selectedRango = signal<string>('30D');
  dashboardData = signal<DashboardReporteResponse | null>(null);

  // Voice States
  isListening = signal<boolean>(false);
  isSpeaking = signal<boolean>(false);
  isProcessingVoice = signal<boolean>(false);
  currentTranscript = signal<string>('');
  voiceAnalysis = signal<AnalisisVozResponse | null>(null);
  textQueryInput = '';
  filterOrderText = '';
  activePoint: any = null;

  rangosDisponibles = [
    { id: '24H', label: '24 Horas' },
    { id: '7D', label: '7 Días' },
    { id: '30D', label: '30 Días' },
    { id: 'MES', label: 'Mes Actual' }
  ];

  quickPills = [
    { label: '🏆 ¿Cuál es el producto más vendido?', query: 'Cual es el producto mas vendido?' },
    { label: '📈 ¿Cómo están los ingresos este mes?', query: 'Como estan los ingresos este mes?' },
    { label: '👗 ¿Cuál es la ocupación de probadores?', query: 'Cual es la ocupacion de probadores?' },
    { label: '⚠️ ¿Qué prendas tienen stock crítico?', query: 'Cuales prendas tienen stock critico o bajo?' },
    { label: '📊 Resumen ejecutivo general', query: 'Dame un resumen ejecutivo general de la empresa' }
  ];

  // ==========================================
  // CHART COMPUTED PROJECTION
  // ==========================================
  chartCoordinates = computed(() => {
    const data = this.dashboardData();
    if (!data || !data.sales_trend || data.sales_trend.length === 0) {
      return [
        { x: 50, y: 160, label: 'Sem 1', monto: 21347, transacciones: 76 },
        { x: 225, y: 130, label: 'Sem 2', monto: 32910, transacciones: 117 },
        { x: 400, y: 80, label: 'Sem 3', monto: 42694, transacciones: 152 },
        { x: 575, y: 40, label: 'Sem 4', monto: 55147, transacciones: 196 },
        { x: 750, y: 60, label: 'Cierre', monto: 48920, transacciones: 174 }
      ];
    }

    const points = data.sales_trend;
    const maxMonto = Math.max(...points.map(p => p.monto), 1);
    const stepX = 700 / Math.max(points.length - 1, 1);

    return points.map((p, i) => {
      const x = 50 + i * stepX;
      // y inverted: 0 is top (value max), 180 is bottom
      const y = 180 - (p.monto / maxMonto) * 140;
      return {
        x: Math.round(x),
        y: Math.round(y),
        label: p.periodo,
        monto: p.monto,
        transacciones: p.transacciones
      };
    });
  });

  svgLinePath = computed(() => {
    const coords = this.chartCoordinates();
    if (coords.length === 0) return '';
    let d = `M${coords[0].x},${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const cur = coords[i];
      const cp1x = prev.x + (cur.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (cur.x - prev.x) / 2;
      const cp2y = cur.y;
      d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${cur.x},${cur.y}`;
    }
    return d;
  });

  svgAreaPath = computed(() => {
    const coords = this.chartCoordinates();
    if (coords.length === 0) return '';
    const line = this.svgLinePath();
    const last = coords[coords.length - 1];
    const first = coords[0];
    return `${line} L${last.x},200 L${first.x},200 Z`;
  });

  filteredOrders = computed(() => {
    const data = this.dashboardData();
    if (!data || !data.recent_orders) return [];
    const term = this.filterOrderText.toLowerCase().trim();
    if (!term) return data.recent_orders;
    return data.recent_orders.filter(o =>
      o.codigo_pedido.toLowerCase().includes(term) ||
      o.cliente_nombre.toLowerCase().includes(term) ||
      o.items_resumen.toLowerCase().includes(term) ||
      o.estado.toLowerCase().includes(term)
    );
  });

  // ==========================================
  // LIFECYCLE
  // ==========================================
  ngOnInit(): void {
    this.cargarDashboard(this.selectedRango());
  }

  ngOnDestroy(): void {
    this.reportesService.stopListening();
    this.reportesService.stopSpeaking();
  }

  // ==========================================
  // DATA ACTIONS
  // ==========================================
  cargarDashboard(rango: string): void {
    this.loading.set(true);
    this.reportesService.getDashboard(rango).subscribe({
      next: (res) => {
        this.dashboardData.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar dashboard de reportes:', err);
        this.loading.set(false);
      }
    });
  }

  cambiarRango(rango: string): void {
    this.selectedRango.set(rango);
    this.cargarDashboard(rango);
  }

  exportarReporte(): void {
    this.exporting.set(true);
    this.reportesService.exportarCSV().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_Gerencial_FashionStore_${this.selectedRango()}_${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: (err) => {
        console.error('Error al exportar CSV:', err);
        this.exporting.set(false);
      }
    });
  }

  // ==========================================
  // VOICE ENGINE & TTS ACTIONS
  // ==========================================
  toggleVoiceRecording(): void {
    if (this.isListening()) {
      this.reportesService.stopListening();
      this.isListening.set(false);
      if (this.currentTranscript().trim()) {
        this.ejecutarConsultaVoz(this.currentTranscript().trim());
      }
    } else {
      this.currentTranscript.set('');
      this.isListening.set(true);

      this.reportesService.startListening(
        (interim) => {
          this.currentTranscript.set(interim);
        },
        (final) => {
          this.currentTranscript.set(final);
          this.isListening.set(false);
          this.ejecutarConsultaVoz(final);
        },
        (err) => {
          console.warn('SpeechRecognition error or timeout:', err);
          this.isListening.set(false);
        },
        () => {
          this.isListening.set(false);
        }
      );
    }
  }

  consultarPorPill(query: string): void {
    this.currentTranscript.set(query);
    this.ejecutarConsultaVoz(query);
  }

  ejecutarConsultaTexto(): void {
    if (!this.textQueryInput.trim()) return;
    const q = this.textQueryInput.trim();
    this.currentTranscript.set(q);
    this.textQueryInput = '';
    this.ejecutarConsultaVoz(q);
  }

  private ejecutarConsultaVoz(query: string): void {
    this.isProcessingVoice.set(true);
    this.reportesService.analizarConsultaVoz(query, this.selectedRango()).subscribe({
      next: (res) => {
        this.voiceAnalysis.set(res);
        this.isProcessingVoice.set(false);

        // Hablar automáticamente la síntesis ejecutiva
        if (res.speech_text) {
          this.hablarRespuesta(res.speech_text);
        }
      },
      error: (err) => {
        console.error('Error al analizar consulta por voz:', err);
        this.isProcessingVoice.set(false);
      }
    });
  }

  toggleTTSPlayback(): void {
    if (this.isSpeaking()) {
      this.reportesService.stopSpeaking();
      this.isSpeaking.set(false);
    } else {
      const text = this.voiceAnalysis()?.speech_text;
      if (text) {
        this.hablarRespuesta(text);
      }
    }
  }

  private hablarRespuesta(text: string): void {
    this.reportesService.speakText(
      text,
      () => this.isSpeaking.set(true),
      () => this.isSpeaking.set(false)
    );
  }

  cerrarAnalisisVoz(): void {
    this.reportesService.stopSpeaking();
    this.isSpeaking.set(false);
    this.voiceAnalysis.set(null);
    this.currentTranscript.set('');
  }
}
