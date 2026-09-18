import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReportesService } from '../services/reportes.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  DashboardReporteResponse,
  AnalisisVozResponse,
  TopProductItem,
  RecentOrderRow,
  FinancialIndicator,
  ComparativeTrendPoint,
  DistributionSlice
} from '../models/reportes.models';

@Component({
  selector: 'app-reportes-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="harbor-page-wrapper">
      <div class="harbor-container">

        <!-- ========================================================= -->
        <!-- 1. HEADER EJECUTIVO (ESTILO HARBOR)                       -->
        <!-- ========================================================= -->
        <header class="harbor-header">
          <div class="header-greeting-block">
            <h1 class="header-greeting">Buenos días, {{ currentUserName() }}</h1>
            <p class="header-date" *ngIf="selectedRango() !== 'MES_ESPECIFICO'">{{ currentDateFormatted() }}</p>
            <p class="header-date audit-highlight" *ngIf="selectedRango() === 'MES_ESPECIFICO' && modoVista() === 'HISTORICO'">
              <span class="audit-badge">AUDITORÍA HISTÓRICA</span> Período cerrado: {{ getNombreMes(selectedMes()) }} {{ selectedAnio() }}
            </p>
            <p class="header-date predictive-highlight" *ngIf="selectedRango() === 'MES_ESPECIFICO' && modoVista() === 'PREDICTIVO'">
              <span class="predictive-badge">ESTIMACIÓN PREDICTIVA</span> Proyección estimada: {{ getNombreMes(selectedMes()) }} {{ selectedAnio() }}
            </p>
            <p class="header-date future-empty-highlight" *ngIf="selectedRango() === 'MES_ESPECIFICO' && modoVista() === 'SIN_DATOS_FUTURO'">
              <span class="future-empty-badge">FUERA DE HORIZONTE</span> {{ getNombreMes(selectedMes()) }} {{ selectedAnio() }}
            </p>
          </div>

          <div class="header-actions-block">
            <!-- Selector de Rango Temporal -->
            <div class="timeframe-select-pill">
              <svg class="calendar-mini-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke-width="2" />
                <line x1="16" y1="2" x2="16" y2="6" stroke-width="2" />
                <line x1="8" y1="2" x2="8" y2="6" stroke-width="2" />
                <line x1="3" y1="10" x2="21" y2="10" stroke-width="2" />
              </svg>
              <select [ngModel]="selectedRango()" (ngModelChange)="cambiarRango($event)" class="timeframe-dropdown">
                <option value="MES_ACTUAL">Mes actual (En curso)</option>
                <option value="MES_ANTERIOR">Mes pasado (Cerrado)</option>
                <option value="MES_ESPECIFICO">Mes específico (Histórico)...</option>
                <option value="30D">Últimos 30 días</option>
                <option value="7D">Últimos 7 días</option>
                <option value="24H">Últimas 24 horas</option>
              </select>
            </div>

            <!-- Selector de Mes y Año específico -->
            <div *ngIf="selectedRango() === 'MES_ESPECIFICO'" class="month-picker-pill">
              <select [ngModel]="selectedMes()" (ngModelChange)="cambiarMes($event)" class="month-dropdown" title="Seleccionar mes de auditoría">
                <option *ngFor="let m of mesesDisponibles" [value]="m.id">{{ m.nombre }}</option>
              </select>
              <select [ngModel]="selectedAnio()" (ngModelChange)="cambiarAnio($event)" class="year-dropdown" title="Seleccionar año de auditoría">
                <option *ngFor="let y of aniosDisponibles" [value]="y">{{ y }}</option>
              </select>
            </div>

            <!-- Botón Exportar CSV -->
            <button
              type="button"
              class="btn-harbor-export"
              (click)="exportarReporte()"
              [disabled]="exporting()"
              title="Exportar informe en formato CSV">
              <svg class="export-mini-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <polyline points="7 10 12 15 17 10" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <line x1="12" y1="15" x2="12" y2="3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span>{{ exporting() ? 'Exportando...' : 'Exportar' }}</span>
            </button>
          </div>
        </header>

        <!-- ========================================================= -->
        <!-- 2. ASISTENTE DE VOZ IA UNIFICADO (HAUTE COUTURE CONCIERGE)-->
        <!-- ========================================================= -->
        <section class="harbor-voice-bar-section">
          <div class="voice-search-bar" [class.listening-active]="isListening()">
            <button
              type="button"
              class="voice-mic-trigger"
              (click)="toggleVoiceRecording()"
              [title]="isListening() ? 'Detener dictado' : 'Hablar al Asistente IA'"
              aria-label="Hablar al Asistente IA">
              <svg
                *ngIf="!isListening()"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                class="icon-mic"
                aria-hidden="true">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" fill="#ffffff"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill="#ffffff"/>
              </svg>

              <div *ngIf="isListening()" class="audio-wave-bars">
                <span class="bar bar-1"></span>
                <span class="bar bar-2"></span>
                <span class="bar bar-3"></span>
                <span class="bar bar-4"></span>
              </div>
            </button>

            <input
              type="text"
              class="voice-search-input"
              [(ngModel)]="textQueryInput"
              (keyup.enter)="ejecutarConsultaTexto()"
              [placeholder]="isListening() ? (currentTranscript() || 'Escuchando tu voz...') : 'Preguntá a la IA: ¿cuál es el producto más vendido?, ¿cómo va el objetivo mensual? (escribí o pulsá el micro)...'"
            />

            <button
              type="button"
              class="voice-submit-btn"
              (click)="ejecutarConsultaTexto()"
              [disabled]="!textQueryInput.trim() || isProcessingVoice()">
              {{ isProcessingVoice() ? 'Analizando...' : 'Consultar' }}
            </button>
          </div>

          <!-- Sugerencias Rápidas -->
          <div class="quick-prompts-row">
            <span class="prompt-hint">Consultas sugeridas:</span>
            <button
              *ngFor="let p of quickPills"
              type="button"
              class="prompt-chip"
              (click)="consultarPorPill(p.query)">
              {{ p.label }}
            </button>
          </div>

          <!-- Panel Desplegable de Diagnóstico IA -->
          <div *ngIf="voiceAnalysis() && !isProcessingVoice()" class="voice-result-card">
            <div class="voice-result-header">
              <div class="intent-zone">
                <span class="intent-badge">{{ voiceAnalysis()?.intencion_detectada }}</span>
                <span class="query-echo">"{{ voiceAnalysis()?.pregunta }}"</span>
              </div>
              <div class="voice-result-actions">
                <button
                  type="button"
                  class="btn-tts-speak"
                  [class.speaking]="isSpeaking()"
                  (click)="toggleTTSPlayback()">
                  <span>{{ isSpeaking() ? '⏹ Detener Audio' : '🔊 Escuchar Síntesis IA' }}</span>
                </button>
                <button type="button" class="btn-close-analysis" (click)="cerrarAnalisisVoz()">&times;</button>
              </div>
            </div>

            <div class="voice-diagnosis-grid">
              <div class="diagnosis-column">
                <h4 class="diag-title">DIAGNÓSTICO CUANTITATIVO</h4>
                <p class="diag-body">{{ voiceAnalysis()?.diagnostico_cuantitativo }}</p>
              </div>
              <div class="diagnosis-column">
                <h4 class="diag-title">INTERPRETACIÓN ESTRATÉGICA</h4>
                <p class="diag-body">{{ voiceAnalysis()?.interpretacion_negocio }}</p>
              </div>
              <div class="diagnosis-column">
                <h4 class="diag-title">RECOMENDACIONES</h4>
                <ul class="diag-list">
                  <li *ngFor="let rec of voiceAnalysis()?.recomendaciones_estrategicas">
                    &bull; {{ rec }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <!-- ========================================================= -->
        <!-- ESTADO VACÍO CUANDO SE SELECCIONA UN MES FUTURO LEJANO    -->
        <!-- ========================================================= -->
        <section *ngIf="modoVista() === 'SIN_DATOS_FUTURO'" class="future-empty-state-section">
          <div class="empty-state-card">
            <div class="empty-zen-icon">⏳</div>
            <h2 class="empty-title">"No te apresures en ver tu futuro, enfocate en el presente"</h2>
            <p class="empty-subtitle">
              Actualmente estamos en <strong>Septiembre 2026</strong>. Nuestro motor de Business Intelligence calcula proyecciones con un horizonte confiable de <strong>hasta un mes hacia adelante (Octubre 2026)</strong>.
              Para <strong>{{ getNombreMes(selectedMes()) }} {{ selectedAnio() }}</strong> aún no existen datos de ventas ni proyecciones estadísticas aplicables.
            </p>
            <div class="empty-actions">
              <button type="button" class="btn-empty-action" (click)="irAMesActual()">
                Ver Mes Actual (Septiembre)
              </button>
              <button type="button" class="btn-empty-outline" (click)="irAMesPredictivo()">
                Ver Estimación de Octubre
              </button>
            </div>
          </div>
        </section>

        <!-- ========================================================= -->
        <!-- CONTENIDO NORMAL O PREDICTIVO (SOLO SI NO ES FUTURO)      -->
        <!-- ========================================================= -->
        <ng-container *ngIf="modoVista() !== 'SIN_DATOS_FUTURO'">
          <!-- Banner Superior de Estimación Predictiva -->
          <div *ngIf="modoVista() === 'PREDICTIVO'" class="predictive-banner">
            <div class="predictive-banner-content">
              <strong>Modo Estimación Predictiva activado:</strong> Todas las métricas visualizadas para <strong>{{ getNombreMes(selectedMes()) }} {{ selectedAnio() }}</strong> son proyecciones calculadas automáticamente según el rendimiento del negocio en los meses pasados.
            </div>
          </div>

          <!-- ========================================================= -->
          <!-- 3. FILA SUPERIOR: 4 KPIS + SEMICIRCULAR SALES TARGET GAUGE-->
          <!-- ========================================================= -->
          <section class="harbor-top-metrics-grid">
          <!-- KPI 1: Facturación / Revenue -->
          <article class="harbor-kpi-card">
            <div class="kpi-header-row">
              <span class="kpi-tag-name">Facturación</span>
            </div>
            <div class="kpi-main-number">&dollar;{{ financialData().facturacion_actual | number:'1.2-2' }}</div>
            <div class="kpi-comparison-row">
              <span class="kpi-growth-pill positive">
                <span class="growth-arrow">▲</span> {{ financialData().variacion_pct }}%
              </span>
              <span class="kpi-period-ref">vs período anterior</span>
            </div>
          </article>

          <!-- KPI 2: Pedidos Totales / Orders -->
          <article class="harbor-kpi-card">
            <div class="kpi-header-row">
              <span class="kpi-tag-name">Pedidos Totales</span>
            </div>
            <div class="kpi-main-number">{{ financialData().pedidos_totales }}</div>
            <div class="kpi-comparison-row">
              <span class="kpi-growth-pill positive">
                <span class="growth-arrow">▲</span> 8.2%
              </span>
              <span class="kpi-period-ref">vs período anterior</span>
            </div>
          </article>

          <!-- KPI 3: Ticket Promedio / Avg Order Value -->
          <article class="harbor-kpi-card">
            <div class="kpi-header-row">
              <span class="kpi-tag-name">Ticket Promedio</span>
            </div>
            <div class="kpi-main-number">&dollar;{{ financialData().ticket_medio | number:'1.2-2' }}</div>
            <div class="kpi-comparison-row">
              <span class="kpi-growth-pill positive">
                <span class="growth-arrow">▲</span> 3.1%
              </span>
              <span class="kpi-period-ref">vs período anterior</span>
            </div>
          </article>

          <!-- KPI 4: Conversión Global / Conversion Rate -->
          <article class="harbor-kpi-card">
            <div class="kpi-header-row">
              <span class="kpi-tag-name">Conversión Global</span>
            </div>
            <div class="kpi-main-number">{{ dashboardData()?.kpis?.conversion_rate || 9.9 }}%</div>
            <div class="kpi-comparison-row">
              <span class="kpi-growth-pill positive">
                <span class="growth-arrow">▲</span> 0.6 pp
              </span>
              <span class="kpi-period-ref">probador a compra</span>
            </div>
          </article>

          <!-- Card 5: Meta de Ventas (Semicircle Radial Gauge + Info lateral) -->
          <article class="harbor-kpi-card target-gauge-card">
            <div class="kpi-header-row">
              <span class="kpi-tag-name">Meta de Ventas</span>
            </div>

            <div class="target-gauge-body">
              <div class="target-gauge-wrapper">
                <svg class="semicircle-svg" viewBox="0 0 160 92">
                  <!-- Pista base semicircular (gris muy suave) -->
                  <path
                    d="M 24 80 A 56 56 0 0 1 136 80"
                    fill="none"
                    stroke="#f1f5f9"
                    stroke-width="12"
                    stroke-linecap="round"
                  />
                  <!-- Arco de progreso (Coral Harbor) -->
                  <path
                    d="M 24 80 A 56 56 0 0 1 136 80"
                    fill="none"
                    stroke="#ff5733"
                    stroke-width="12"
                    stroke-linecap="round"
                    stroke-dasharray="175.93"
                    [attr.stroke-dashoffset]="semicircleDashoffset()"
                  />
                </svg>

                <div class="gauge-center-caption">
                  <span class="gauge-bold-pct">{{ financialData().cumplimiento_pct }}%</span>
                </div>
              </div>

              <div class="target-side-info">
                <div class="target-main-amount">&dollar;{{ (financialData().facturacion_actual / 1000) | number:'1.1-1' }}k</div>
                <div class="target-goal-text">Meta: &dollar;{{ (financialData().objetivo_mes / 1000) | number:'1.0-0' }}k</div>
              </div>
            </div>
          </article>
        </section>

        <!-- ========================================================= -->
        <!-- 4. FILA MEDIA: REVENUE ANALYTICS + ORDER FULFILLMENT      -->
        <!-- ========================================================= -->
        <section class="harbor-middle-grid">
          <!-- Columna Izquierda (65%): Tendencia de Ingresos -->
          <article class="harbor-card revenue-chart-card">
            <div class="card-header-flex revenue-single-header">
              <div class="revenue-header-info">
                <h3 class="revenue-title">Tendencia de Ingresos</h3>
                <span class="revenue-hero-number">&dollar;{{ financialData().facturacion_actual | number:'1.2-2' }}</span>
              </div>

              <!-- Selector de Granularidad: Día, Semana, Mes arriba a la derecha -->
              <div class="granularity-switcher-tabs">
                <button
                  type="button"
                  class="switcher-tab"
                  [class.active]="selectedGranularidad() === 'DIA'"
                  (click)="cambiarGranularidad('DIA')">
                  Día
                </button>
                <button
                  type="button"
                  class="switcher-tab"
                  [class.active]="selectedGranularidad() === 'SEMANA'"
                  (click)="cambiarGranularidad('SEMANA')">
                  Semana
                </button>
                <button
                  type="button"
                  class="switcher-tab"
                  [class.active]="selectedGranularidad() === 'MES'"
                  (click)="cambiarGranularidad('MES')">
                  Mes
                </button>
              </div>
            </div>

            <!-- Gráfico SVG Interactivo con Tracking Magnético -->
            <div class="chart-stage-container" (mousemove)="onChartMouseMove($event)" (mouseleave)="onChartMouseLeave()">
              <svg class="flowing-trend-svg" viewBox="0 0 680 250" preserveAspectRatio="none">
                <defs>
                  <!-- Gradiente Suave del Área -->
                  <linearGradient id="harborTrendAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#ff5733" stop-opacity="0.25" />
                    <stop offset="60%" stop-color="#ff5733" stop-opacity="0.06" />
                    <stop offset="100%" stop-color="#ff5733" stop-opacity="0.00" />
                  </linearGradient>

                  <!-- Gradiente de la Curva -->
                  <linearGradient id="harborCurveStrokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#ff7a59" />
                    <stop offset="100%" stop-color="#ff3811" />
                  </linearGradient>

                  <!-- Gradiente de las Barras -->
                  <linearGradient id="harborBarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#ff6b4a" />
                    <stop offset="100%" stop-color="#ff3811" />
                  </linearGradient>

                  <!-- Filtro de Resplandor Cálido -->
                  <filter id="harborCurveGlow" x="-10%" y="-20%" width="120%" height="150%">
                    <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#ff5733" flood-opacity="0.28" />
                  </filter>
                </defs>

                <!-- Escala Eje Y & Líneas de Guía Horizontales Sutiles -->
                <g *ngFor="let tick of trendYAxisTicks()">
                  <text x="56" [attr.y]="tick.y + 4" text-anchor="end" class="chart-y-label">{{ tick.label }}</text>
                  <line x1="64" [attr.y1]="tick.y" x2="675" [attr.y2]="tick.y" stroke="#f1f5f9" stroke-width="1.2" [attr.stroke-dasharray]="tick.y === 210 ? 'none' : '3,3'" />
                </g>

                <!-- MODO A: LÍNEA CONTINUA FLUIDA -->
                <ng-container *ngIf="chartViewType() === 'line'">
                  <!-- Área rellena suave -->
                  <path [attr.d]="svgAreaActual()" fill="url(#harborTrendAreaGrad)" class="trend-area-path" />

                  <!-- Curva Dotted: Período Anterior (Visible, con contraste óptimo) -->
                  <path
                    *ngIf="showComparative()"
                    [attr.d]="svgPathAnterior()"
                    fill="none"
                    stroke="#64748b"
                    stroke-width="2.4"
                    stroke-dasharray="6,4"
                    stroke-linecap="round"
                    class="trend-comparative-path"
                  />

                  <!-- Curva Sólida Fluida -->
                  <path
                    [attr.d]="svgPathActual()"
                    fill="none"
                    stroke="url(#harborCurveStrokeGrad)"
                    stroke-width="3.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    filter="url(#harborCurveGlow)"
                    class="trend-line-path"
                  />

                  <!-- Pulsing Beacon en el Último Punto -->
                  <g *ngIf="lastTrendPoint() && !hoveredTrendPoint" class="beacon-point-group">
                    <circle [attr.cx]="lastTrendPoint()!.x" [attr.cy]="lastTrendPoint()!.yActual" r="12" class="beacon-pulse-ring" />
                    <circle [attr.cx]="lastTrendPoint()!.x" [attr.cy]="lastTrendPoint()!.yActual" r="5" fill="#ff3811" stroke="#ffffff" stroke-width="2.5" />
                  </g>

                  <!-- Badge Flotante en el Último Punto (Live Value) -->
                  <g *ngIf="lastTrendPoint() && !hoveredTrendPoint" [attr.transform]="'translate(' + (lastTrendPoint()!.x - 45) + ',' + (lastTrendPoint()!.yActual - 32) + ')'" class="current-badge-group">
                    <rect width="90" height="24" rx="12" fill="#111827" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.25))" />
                    <text x="45" y="16.5" text-anchor="middle" fill="#ffffff" font-size="11.5" font-weight="800" font-family="ui-monospace, monospace">
                      &dollar;{{ lastTrendPoint()!.montoActual | number:'1.0-0' }}
                    </text>
                  </g>
                </ng-container>

                <!-- MODO B: BARRAS MODERNAS -->
                <ng-container *ngIf="chartViewType() === 'bar'">
                  <g *ngFor="let pt of trendChartCoords()">
                    <!-- Barra de fondo previa (si comparativa activa) -->
                    <rect
                      *ngIf="showComparative()"
                      [attr.x]="pt.x - 14"
                      [attr.y]="pt.yAnterior"
                      width="28"
                      [attr.height]="210 - pt.yAnterior"
                      rx="5"
                      fill="#e2e8f0"
                      opacity="0.45"
                      style="pointer-events: none;"
                    />
                    <!-- Barra actual -->
                    <rect
                      [attr.x]="pt.x - 14"
                      [attr.y]="pt.yActual"
                      width="28"
                      [attr.height]="210 - pt.yActual"
                      rx="5"
                      fill="url(#harborBarGrad)"
                      [class.active-bar]="hoveredTrendPoint && hoveredTrendPoint.periodo === pt.periodo"
                      class="animated-bar"
                    />
                  </g>
                </ng-container>

                <!-- GUÍA Y MARCADOR DE HOVER MAGNÉTICO -->
                <g *ngIf="hoveredTrendPoint">
                  <line
                    [attr.x1]="hoveredTrendPoint.x"
                    y1="20"
                    [attr.x2]="hoveredTrendPoint.x"
                    y2="210"
                    stroke="#ff3811"
                    stroke-dasharray="3,3"
                    stroke-width="1.5"
                    opacity="0.65"
                  />
                  <circle
                    [attr.cx]="hoveredTrendPoint.x"
                    [attr.cy]="hoveredTrendPoint.yActual"
                    r="7"
                    fill="#ff3811"
                    stroke="#ffffff"
                    stroke-width="3"
                    filter="drop-shadow(0 2px 5px rgba(255,56,17,0.45))"
                  />
                  <circle
                    *ngIf="showComparative()"
                    [attr.cx]="hoveredTrendPoint.x"
                    [attr.cy]="hoveredTrendPoint.yAnterior"
                    r="4.5"
                    fill="#94a3b8"
                    stroke="#ffffff"
                    stroke-width="2"
                  />
                </g>

                <!-- Capa invisible para capturar mousemove sobre el lienzo entero -->
                <rect
                  x="64"
                  y="0"
                  width="616"
                  height="225"
                  fill="transparent"
                  style="cursor: crosshair;"
                />
              </svg>

              <!-- Tooltip Flotante Ejecutivo (Glassmorphism) -->
              <div
                *ngIf="hoveredTrendPoint"
                class="trend-hover-tooltip"
                [style.left.px]="hoveredTooltipLeft()">
                <div class="tooltip-header-row">
                  <span class="tooltip-period-badge">{{ hoveredTrendPoint.periodo }}</span>
                  <span class="tooltip-diff-pill" [class.positive]="hoveredTrendPoint.montoActual >= hoveredTrendPoint.montoAnterior">
                    {{ hoveredTrendPoint.montoActual >= hoveredTrendPoint.montoAnterior ? '▲ +' : '▼ -' }}{{ getPointDiffPct(hoveredTrendPoint) }}%
                  </span>
                </div>
                <div class="tooltip-metric-grid">
                  <div class="tooltip-stat">
                    <span class="stat-lbl"><span class="dot-cur"></span> Este período:</span>
                    <span class="stat-val highlight">&dollar;{{ hoveredTrendPoint.montoActual | number:'1.2-2' }}</span>
                  </div>
                  <div class="tooltip-stat" *ngIf="showComparative()">
                    <span class="stat-lbl"><span class="dot-prev"></span> Período anterior:</span>
                    <span class="stat-val text-muted">&dollar;{{ hoveredTrendPoint.montoAnterior | number:'1.2-2' }}</span>
                  </div>
                  <div class="tooltip-stat tooltip-diff-row" *ngIf="showComparative()">
                    <span class="stat-lbl">Diferencia neta:</span>
                    <span class="stat-val" [class.highlight]="hoveredTrendPoint.montoActual >= hoveredTrendPoint.montoAnterior">
                      {{ hoveredTrendPoint.montoActual >= hoveredTrendPoint.montoAnterior ? '+' : '-' }}&dollar;{{ getPointDiffMonto(hoveredTrendPoint) | number:'1.2-2' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Eje X con Etiquetas Temporales -->
              <div class="chart-x-axis-row" style="padding-left: 64px; padding-right: 14px;">
                <span
                  *ngFor="let pt of trendChartCoords()"
                  class="x-tick-label"
                  [class.active-tick]="hoveredTrendPoint && hoveredTrendPoint.periodo === pt.periodo">
                  {{ pt.periodo }}
                </span>
              </div>
            </div>

            <!-- Barra Inferior BI Ejecutiva (Reemplazo del banner amarillo) -->
            <div class="executive-bi-strip">
              <div class="bi-stat-chip">
                <span class="bi-chip-bullet bullet-peak"></span>
                <div class="bi-chip-content">
                  <span class="bi-chip-title">Pico Máximo</span>
                  <span class="bi-chip-num">{{ trendPeakPoint()?.periodo }} &bull; &dollar;{{ trendPeakPoint()?.montoActual | number:'1.0-0' }}</span>
                </div>
              </div>

              <div class="bi-stat-chip">
                <span class="bi-chip-bullet bullet-avg"></span>
                <div class="bi-chip-content">
                  <span class="bi-chip-title">Promedio</span>
                  <span class="bi-chip-num">&dollar;{{ trendAverageVal() | number:'1.0-0' }}</span>
                </div>
              </div>

              <div class="bi-stat-chip">
                <span class="bi-chip-bullet bullet-pace"></span>
                <div class="bi-chip-content">
                  <span class="bi-chip-title">Meta de Ventas</span>
                  <span class="bi-chip-num">{{ financialData().cumplimiento_pct }}% cubierto</span>
                </div>
              </div>

              <div class="bi-ai-insight-box">
                <span class="ai-sparkle-symbol">✨</span>
                <span class="ai-insight-text">{{ financialData().mensaje_insight }}</span>
              </div>
            </div>
          </article>

          <!-- Columna Derecha (35%): Order Fulfillment (Cumplimiento Logístico) -->
          <article class="harbor-card fulfillment-card">
            <div class="card-header-flex">
              <div>
                <h3 class="card-main-title">Despacho de Pedidos</h3>
                <p class="card-subtitle">{{ financialData().pedidos_totales }} pedidos gestionados este período</p>
              </div>
            </div>

            <!-- Barras Horizontales de Estados de Pedido -->
            <div class="fulfillment-bars-list">
              <!-- Entregados -->
              <div class="fulfillment-bar-item">
                <div class="fulfillment-bar-label-row">
                  <span class="status-name">Entregados</span>
                  <span class="status-count-pct">222 &bull; <strong>65%</strong></span>
                </div>
                <div class="fulfillment-track">
                  <div class="fulfillment-fill fill-delivered" style="width: 65%;"></div>
                </div>
              </div>

              <!-- En Tránsito -->
              <div class="fulfillment-bar-item">
                <div class="fulfillment-bar-label-row">
                  <span class="status-name">En Tránsito</span>
                  <span class="status-count-pct">68 &bull; <strong>20%</strong></span>
                </div>
                <div class="fulfillment-track">
                  <div class="fulfillment-fill fill-shipped" style="width: 20%;"></div>
                </div>
              </div>

              <!-- En Preparación -->
              <div class="fulfillment-bar-item">
                <div class="fulfillment-bar-label-row">
                  <span class="status-name">En Preparación</span>
                  <span class="status-count-pct">41 &bull; <strong>12%</strong></span>
                </div>
                <div class="fulfillment-track">
                  <div class="fulfillment-fill fill-pending" style="width: 12%;"></div>
                </div>
              </div>

              <!-- Devoluciones / Cambios -->
              <div class="fulfillment-bar-item">
                <div class="fulfillment-bar-label-row">
                  <span class="status-name">Devoluciones / Cambios</span>
                  <span class="status-count-pct">11 &bull; <strong>3%</strong></span>
                </div>
                <div class="fulfillment-track">
                  <div class="fulfillment-fill fill-returns" style="width: 3%;"></div>
                </div>
              </div>
            </div>

            <!-- Indicadores Logísticos Inferiores -->
            <div class="fulfillment-summary-footer">
              <div class="logistics-stat-box">
                <span class="logistics-stat-val">96.8%</span>
                <span class="logistics-stat-lbl">Entregas a tiempo (SLA)</span>
              </div>
              <div class="logistics-stat-box">
                <span class="logistics-stat-val">18 min</span>
                <span class="logistics-stat-lbl">Tiempo prep. boutique</span>
              </div>
            </div>
          </article>
        </section>

        <!-- ========================================================= -->
        <!-- 5. FILA INFERIOR: TOP PRODUCTS + TABLA DE PEDIDOS         -->
        <!-- ========================================================= -->
        <section class="harbor-bottom-grid">
          <!-- Columna Izquierda (35%): Productos Más Vendidos -->
          <article class="harbor-card top-products-card">
            <div class="card-header-flex">
              <div>
                <h3 class="card-main-title">Productos Más Vendidos</h3>
                <p class="card-subtitle">Prendas líderes en facturación acumulada</p>
              </div>
              <a routerLink="/catalogo" class="link-harbor-action">Ver catálogo &rarr;</a>
            </div>

            <div class="top-products-list">
              <div *ngFor="let p of topProductsList(); let i = index" class="product-rank-row">
                <!-- Monograma o Miniatura estilo Harbor -->
                <div class="product-avatar-monogram">
                  {{ getInitials(p.nombre) }}
                </div>

                <div class="product-info-col">
                  <span class="product-title-text">{{ p.nombre }}</span>
                  <span class="product-category-text">{{ p.categoria }}</span>
                </div>

                <div class="product-revenue-col">
                  <span class="product-amount-number">&dollar;{{ p.ingresos_totales | number:'1.0-0' }}</span>
                  <span class="product-sold-units">{{ p.unidades_vendidas }} vendidos</span>
                </div>
              </div>
            </div>
          </article>

          <!-- Columna Derecha (65%): Tabla Ejecutiva de Pedidos Recientes -->
          <article class="harbor-card recent-orders-card">
            <div class="card-header-flex">
              <div>
                <h3 class="card-main-title">Pedidos Recientes</h3>
                <p class="card-subtitle">Últimas transacciones procesadas en boutique y e-commerce</p>
              </div>
              <a routerLink="/ventas" class="link-harbor-action">Ver ventas &rarr;</a>
            </div>

            <div class="orders-table-wrapper">
              <table class="harbor-table">
                <thead>
                  <tr>
                    <th>ORDEN</th>
                    <th>CLIENTE</th>
                    <th>PRENDAS</th>
                    <th>ESTADO</th>
                    <th class="text-right">TOTAL</th>
                    <th class="text-right">FECHA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let ord of recentOrdersList()">
                    <td class="col-order-code">{{ ord.codigo_pedido }}</td>
                    <td class="col-customer">
                      <div class="customer-cell">
                        <span class="customer-avatar-dot">{{ getInitials(ord.cliente_nombre) }}</span>
                        <span class="customer-name-text">{{ ord.cliente_nombre }}</span>
                      </div>
                    </td>
                    <td class="col-items-summary">{{ ord.items_resumen }}</td>
                    <td class="col-status">
                      <span class="status-pill-badge" [ngClass]="getStatusBadgeClass(ord.estado)">
                        <span class="status-dot-indicator"></span>
                        {{ ord.estado }}
                      </span>
                    </td>
                    <td class="col-total text-right">&dollar;{{ ord.monto_total | number:'1.2-2' }}</td>
                    <td class="col-date text-right">{{ ord.fecha }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </section>

        </ng-container>

      </div>
    </div>
  `,
  styles: [`
    /* =========================================================================
       HARBOR HAUTE COUTURE EXECUTIVE DASHBOARD - PURE SCOPED CSS
       ========================================================================= */

    .harbor-page-wrapper {
      background-color: #f8f9fa;
      color: #111827;
      min-height: calc(100vh - 70px);
      padding: 2rem 2rem 4rem 2rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
    }

    .harbor-container {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    /* 1. Header Ejecutivo */
    .harbor-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: 0.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-greeting-block {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .header-greeting {
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #111827;
      margin: 0;
      line-height: 1.2;
    }

    .header-date {
      font-size: 0.82rem;
      color: #6b7280;
      margin: 0;
      text-transform: capitalize;
    }

    .header-actions-block {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .timeframe-select-pill {
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      padding: 0.4rem 0.75rem;
      gap: 0.45rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }

    .calendar-mini-icon {
      width: 14px;
      height: 14px;
      color: #6b7280;
    }

    .timeframe-dropdown {
      background: transparent;
      border: none;
      font-size: 0.78rem;
      font-weight: 600;
      color: #1f2937;
      cursor: pointer;
      outline: none;
    }

    .month-picker-pill {
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1.5px solid #2563eb;
      border-radius: 8px;
      padding: 0.35rem 0.65rem;
      gap: 0.5rem;
      box-shadow: 0 1px 4px rgba(37, 99, 235, 0.15);
      animation: fadeIn 0.2s ease-in-out;
    }

    .month-dropdown,
    .year-dropdown {
      background: transparent;
      border: none;
      font-size: 0.78rem;
      font-weight: 700;
      color: #1d4ed8;
      cursor: pointer;
      outline: none;
    }

    .month-dropdown option,
    .year-dropdown option {
      color: #111827;
      background: #ffffff;
      font-weight: 500;
    }

    .audit-highlight {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #1e40af !important;
      font-weight: 600;
    }

    .audit-badge {
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }

    .predictive-highlight {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #7c3aed !important;
      font-weight: 600;
    }

    .predictive-badge {
      background: #f5f3ff;
      color: #7c3aed;
      border: 1px solid #ddd6fe;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }

    .future-empty-highlight {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #64748b !important;
      font-weight: 600;
    }

    .future-empty-badge {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }

    /* Banner Estimación Predictiva */
    .predictive-banner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
      border: 1px solid #c4b5fd;
      border-radius: 12px;
      padding: 0.85rem 1.25rem;
      color: #5b21b6;
      font-size: 0.82rem;
      line-height: 1.4;
      box-shadow: 0 2px 6px rgba(124, 58, 237, 0.08);
      animation: fadeIn 0.25s ease-in-out;
    }

    .predictive-banner-icon {
      font-size: 1.3rem;
      flex-shrink: 0;
    }

    /* Estado Vacío Amigable para Meses Futuros */
    .future-empty-state-section {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 420px;
      padding: 2rem 1rem;
      animation: fadeIn 0.3s ease-in-out;
    }

    .empty-state-card {
      background: #ffffff;
      border: 1.5px dashed #cbd5e1;
      border-radius: 16px;
      padding: 3.5rem 2.5rem;
      max-width: 640px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.04);
    }

    .empty-zen-icon {
      font-size: 3rem;
      background: #f8fafc;
      width: 76px;
      height: 76px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .empty-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: #1e293b;
      line-height: 1.3;
      margin: 0;
      font-style: italic;
    }

    .empty-subtitle {
      font-size: 0.88rem;
      color: #64748b;
      line-height: 1.6;
      margin: 0;
    }

    .empty-actions {
      display: flex;
      gap: 0.85rem;
      margin-top: 0.5rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .btn-empty-action {
      background: #111827;
      color: #ffffff;
      border: 1px solid #111827;
      border-radius: 8px;
      padding: 0.6rem 1.25rem;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .btn-empty-action:hover {
      background: #000000;
      transform: translateY(-1px);
    }

    .btn-empty-outline {
      background: #f5f3ff;
      color: #7c3aed;
      border: 1.5px solid #ddd6fe;
      border-radius: 8px;
      padding: 0.6rem 1.25rem;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-empty-outline:hover {
      background: #ede9fe;
      border-color: #c4b5fd;
      transform: translateY(-1px);
    }

    .btn-harbor-export {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      background: #111827;
      color: #ffffff;
      border: 1px solid #111827;
      border-radius: 8px;
      padding: 0.45rem 1rem;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .btn-harbor-export:hover:not(:disabled) {
      background: #d4af37;
      border-color: #d4af37;
      color: #000000;
    }

    .btn-harbor-export:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .export-mini-icon {
      width: 14px;
      height: 14px;
    }

    /* 2. Barra de Voz IA */
    .harbor-voice-bar-section {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .voice-search-bar {
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 12px;
      padding: 0.45rem 0.85rem;
      gap: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .voice-search-bar.listening-active {
      border-color: #d4af37;
      box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.2);
    }

    .voice-mic-trigger {
      background: #d4af37 !important;
      color: #ffffff !important;
      border: none;
      width: 38px !important;
      height: 38px !important;
      min-width: 38px !important;
      min-height: 38px !important;
      border-radius: 50%;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer;
      flex-shrink: 0 !important;
      transition: transform 0.15s ease, background-color 0.2s ease;
      box-shadow: 0 2px 6px rgba(212, 175, 55, 0.35);
      padding: 0 !important;
    }

    .voice-mic-trigger:hover {
      background: #b89324 !important;
      transform: scale(1.05);
    }

    .icon-mic {
      width: 20px !important;
      height: 20px !important;
      min-width: 20px !important;
      min-height: 20px !important;
      fill: #ffffff !important;
      color: #ffffff !important;
      display: block !important;
      pointer-events: none;
    }

    .audio-wave-bars {
      display: flex;
      align-items: center;
      gap: 2px;
      height: 14px;
    }

    .audio-wave-bars .bar {
      width: 2.5px;
      background-color: #ffffff;
      border-radius: 1px;
      animation: wavePulse 0.8s infinite ease-in-out;
    }

    .audio-wave-bars .bar-1 { height: 6px; animation-delay: 0.1s; }
    .audio-wave-bars .bar-2 { height: 12px; animation-delay: 0.2s; }
    .audio-wave-bars .bar-3 { height: 10px; animation-delay: 0.3s; }
    .audio-wave-bars .bar-4 { height: 7px; animation-delay: 0.4s; }

    @keyframes wavePulse {
      0%, 100% { transform: scaleY(0.4); }
      50% { transform: scaleY(1.2); }
    }

    .voice-search-input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 0.86rem;
      color: #111827;
      background: transparent;
    }

    .voice-search-input::placeholder {
      color: #9ca3af;
      font-size: 0.82rem;
    }

    .voice-submit-btn {
      background: #111827;
      color: #ffffff;
      border: none;
      padding: 0.45rem 1rem;
      font-size: 0.78rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .voice-submit-btn:hover:not(:disabled) {
      background: #d4af37;
      color: #000000;
    }

    .voice-submit-btn:disabled {
      background: #e5e7eb;
      color: #9ca3af;
      cursor: not-allowed;
    }

    .quick-prompts-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
      padding-left: 0.25rem;
    }

    .prompt-hint {
      font-size: 0.72rem;
      font-weight: 600;
      color: #6b7280;
    }

    .prompt-chip {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      color: #374151;
      font-size: 0.72rem;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .prompt-chip:hover {
      border-color: #d4af37;
      color: #000000;
      background: #fafafa;
    }

    .voice-result-card {
      background: #ffffff;
      border: 1px solid #d4af37;
      border-radius: 12px;
      padding: 1.25rem;
      box-shadow: 0 4px 12px rgba(212, 175, 55, 0.08);
    }

    .voice-result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid #f3f4f6;
      margin-bottom: 1rem;
    }

    .intent-zone {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .intent-badge {
      background: #111827;
      color: #ffffff;
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      padding: 0.25rem 0.55rem;
      border-radius: 4px;
    }

    .query-echo {
      font-size: 0.85rem;
      color: #4b5563;
      font-style: italic;
    }

    .voice-result-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-tts-speak {
      background: #fdf8e6;
      border: 1px solid #d4af37;
      color: #854d0e;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;
    }

    .btn-tts-speak.speaking {
      background: #fee2e2;
      border-color: #ef4444;
      color: #b91c1c;
    }

    .btn-close-analysis {
      background: transparent;
      border: none;
      font-size: 1.35rem;
      line-height: 1;
      color: #9ca3af;
      cursor: pointer;
    }

    .voice-diagnosis-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
    }

    .diag-title {
      font-size: 0.68rem;
      font-weight: 800;
      color: #6b7280;
      margin: 0 0 0.4rem 0;
    }

    .diag-body {
      font-size: 0.82rem;
      line-height: 1.5;
      color: #1f2937;
      margin: 0;
    }

    .diag-list {
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 0.8rem;
      line-height: 1.45;
      color: #1f2937;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    /* =========================================================
       3. FILA SUPERIOR: 4 KPIS + SEMICIRCULAR TARGET GAUGE
       ========================================================= */

    .harbor-top-metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr) 1.2fr;
      gap: 1rem;
    }

    .harbor-kpi-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 12px;
      padding: 1.25rem 1.15rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    }

    .kpi-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .kpi-tag-name {
      font-size: 0.78rem;
      font-weight: 600;
      color: #6b7280;
    }

    .kpi-icon-pill {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.72rem;
      font-weight: 700;
      background: #f3f4f6;
      color: #111827;
    }

    .kpi-main-number {
      font-size: 1.65rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #111827;
      line-height: 1.1;
    }

    .kpi-comparison-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.72rem;
    }

    .kpi-growth-pill {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-weight: 700;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
    }

    .kpi-growth-pill.positive {
      background: #ecfdf5;
      color: #059669;
    }

    .growth-arrow {
      font-size: 0.6rem;
    }

    .kpi-period-ref {
      color: #9ca3af;
    }

    /* Card 5: Meta de Ventas con Gauge Semicircular e Info lateral */
    .target-gauge-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .target-gauge-body {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 0.85rem;
      width: 100%;
    }

    .target-gauge-wrapper {
      position: relative;
      width: 92px;
      height: 54px;
      flex-shrink: 0;
    }

    .semicircle-svg {
      width: 100%;
      height: 100%;
    }

    .gauge-center-caption {
      position: absolute;
      bottom: 1px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      pointer-events: none;
    }

    .gauge-bold-pct {
      font-size: 1.15rem;
      font-weight: 800;
      color: #111827;
      line-height: 1;
      letter-spacing: -0.02em;
    }

    .target-side-info {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 0.15rem;
      min-width: 0;
      text-align: left;
    }

    .target-main-amount {
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #111827;
      line-height: 1.1;
      white-space: nowrap;
    }

    .target-goal-text {
      font-size: 0.72rem;
      font-weight: 600;
      color: #6b7280;
      white-space: nowrap;
    }

    /* =========================================================
       4. FILA MEDIA: REVENUE ANALYTICS + ORDER FULFILLMENT
       ========================================================= */

    .harbor-middle-grid {
      display: grid;
      grid-template-columns: 1.8fr 1fr;
      gap: 1.25rem;
    }

    .harbor-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .card-header-flex {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .revenue-single-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      flex-wrap: nowrap;
      margin-bottom: 0.25rem;
    }

    .revenue-header-info {
      display: flex;
      align-items: baseline;
      gap: 1.25rem;
      flex-wrap: nowrap;
    }

    .revenue-title {
      font-size: 1.05rem;
      font-weight: 800;
      color: #111827;
      margin: 0;
      white-space: nowrap;
      letter-spacing: -0.01em;
    }

    .revenue-hero-number {
      font-size: 1.65rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #111827;
      line-height: 1;
      white-space: nowrap;
    }

    .granularity-switcher-tabs {
      display: flex;
      background: #f3f4f6;
      padding: 3px;
      border-radius: 8px;
      gap: 2px;
    }

    .switcher-tab {
      background: transparent;
      border: none;
      padding: 0.35rem 0.85rem;
      font-size: 0.74rem;
      font-weight: 600;
      color: #6b7280;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.15s ease;
    }

    .switcher-tab.active {
      background: #ffffff;
      color: #111827;
      font-weight: 700;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    }

    /* Escenario SVG y Animaciones */
    .chart-stage-container {
      position: relative;
      width: 100%;
      height: 290px;
    }

    .flowing-trend-svg {
      width: 100%;
      height: 250px;
      overflow: visible;
    }

    .chart-y-label {
      font-size: 0.82rem;
      fill: #475569;
      font-weight: 700;
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      letter-spacing: -0.01em;
    }

    .trend-line-path {
      stroke-dasharray: 2000;
      stroke-dashoffset: 0;
      animation: drawTrendCurve 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes drawTrendCurve {
      from { stroke-dashoffset: 2000; }
      to { stroke-dashoffset: 0; }
    }

    .trend-area-path {
      animation: fadeInArea 0.8s ease forwards;
    }

    @keyframes fadeInArea {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .beacon-pulse-ring {
      fill: #ff3811;
      animation: harborBeaconPulse 2s infinite ease-out;
      transform-origin: center;
      pointer-events: none;
    }

    @keyframes harborBeaconPulse {
      0% { r: 4px; opacity: 0.85; }
      70% { r: 16px; opacity: 0; }
      100% { r: 16px; opacity: 0; }
    }

    .current-badge-group {
      filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.25));
      pointer-events: none;
    }

    .animated-bar {
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .animated-bar:hover, .animated-bar.active-bar {
      opacity: 0.9;
      filter: drop-shadow(0 2px 6px rgba(255, 56, 17, 0.45));
    }

    /* Tooltip Flotante Mejorado */
    .trend-hover-tooltip {
      position: absolute;
      top: 10px;
      background: rgba(17, 24, 39, 0.94);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      color: #ffffff;
      padding: 0.55rem 0.85rem;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.35);
      pointer-events: none;
      z-index: 20;
      min-width: 175px;
      transition: left 0.08s ease-out;
    }

    .tooltip-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 0.3rem;
      margin-bottom: 0.4rem;
    }

    .tooltip-period-badge {
      font-size: 0.72rem;
      font-weight: 700;
      color: #f1f5f9;
      text-transform: capitalize;
    }

    .tooltip-diff-pill {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      background: #fef2f2;
      color: #ef4444;
    }

    .tooltip-diff-pill.positive {
      background: #ecfdf5;
      color: #059669;
    }

    .tooltip-metric-grid {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .tooltip-stat {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.72rem;
    }

    .tooltip-stat .stat-lbl {
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .dot-cur {
      width: 7px;
      height: 7px;
      background: #ff5733;
      border-radius: 50%;
      display: inline-block;
    }

    .dot-prev {
      width: 7px;
      height: 7px;
      background: #64748b;
      border-radius: 50%;
      display: inline-block;
    }

    .stat-prev-val {
      color: #cbd5e1;
      font-weight: 600;
    }

    .tooltip-diff-row {
      border-top: 1px dashed rgba(255, 255, 255, 0.15);
      padding-top: 0.25rem;
      margin-top: 0.15rem;
    }

    .tooltip-stat .stat-val {
      font-weight: 700;
      font-family: ui-monospace, monospace;
    }

    .tooltip-stat .stat-val.highlight {
      color: #ff7a59;
      font-size: 0.8rem;
    }

    .chart-x-axis-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      font-weight: 700;
      color: #475569;
      padding-top: 0.65rem;
    }

    .x-tick-label {
      transition: all 0.15s ease;
      cursor: default;
    }

    .x-tick-label.active-tick {
      color: #ff3811;
      font-weight: 800;
      transform: scale(1.1);
    }

    /* Barra Inferior BI Ejecutiva */
    .executive-bi-strip {
      display: grid;
      grid-template-columns: repeat(3, auto) 1fr;
      align-items: center;
      gap: 0.85rem;
      background: #fafafa;
      border: 1px solid #f1f5f9;
      border-radius: 10px;
      padding: 0.65rem 1rem;
    }

    .bi-stat-chip {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-right: 1px solid #e2e8f0;
      padding-right: 0.85rem;
    }

    .bi-chip-bullet {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .bullet-peak { background: #ff5733; }
    .bullet-avg { background: #3b82f6; }
    .bullet-pace { background: #10b981; }

    .bi-chip-content {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .bi-chip-title {
      font-size: 0.65rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .bi-chip-num {
      font-size: 0.78rem;
      font-weight: 800;
      color: #0f172a;
      font-family: ui-monospace, monospace;
    }

    .bi-ai-insight-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-left: 0.35rem;
      font-size: 0.74rem;
      color: #475569;
      line-height: 1.35;
    }

    .ai-sparkle-symbol {
      font-size: 0.9rem;
      color: #ff5733;
      flex-shrink: 0;
    }

    /* Fulfillment de Pedidos (Escalado aumentado en 3 unidades) */
    .fulfillment-card .card-main-title {
      font-size: 1.15rem; /* +3px (era 0.95rem) */
    }

    .fulfillment-card .card-subtitle {
      font-size: 0.94rem; /* +3px (era 0.75rem) */
      margin-top: 0.25rem;
    }

    .card-main-title {
      font-size: 0.95rem;
      font-weight: 800;
      color: #111827;
      margin: 0;
    }

    .card-subtitle {
      font-size: 0.75rem;
      color: #6b7280;
      margin: 0.15rem 0 0 0;
    }

    .fulfillment-bars-list {
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
      margin-top: 0.85rem;
    }

    .fulfillment-bar-item {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .fulfillment-bar-label-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.94rem; /* +3px (era 0.75rem) */
    }

    .status-name {
      font-weight: 600;
      color: #374151;
    }

    .status-count-pct {
      color: #6b7280;
      font-size: 0.91rem; /* +3px (era 0.72rem) */
    }

    .fulfillment-track {
      height: 10px; /* +3px (era 7px) */
      background: #f1f5f9;
      border-radius: 6px;
      overflow: hidden;
    }

    .fulfillment-fill {
      height: 100%;
      border-radius: 6px;
      transition: width 0.4s ease;
    }

    .fill-delivered { background-color: #059669; }
    .fill-shipped { background-color: #2563eb; }
    .fill-pending { background-color: #d4af37; }
    .fill-returns { background-color: #ef4444; }

    .fulfillment-summary-footer {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      border-top: 1px solid #f3f4f6;
      padding-top: 1.25rem;
      margin-top: auto;
    }

    .logistics-stat-box {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .logistics-stat-val {
      font-size: 1.35rem; /* +3px (era 1.15rem) */
      font-weight: 800;
      color: #111827;
    }

    .logistics-stat-lbl {
      font-size: 0.87rem; /* +3px (era 0.68rem) */
      color: #6b7280;
    }

    /* =========================================================
       5. FILA INFERIOR: TOP PRODUCTS + TABLA DE PEDIDOS
       ========================================================= */

    .harbor-bottom-grid {
      display: grid;
      grid-template-columns: 1fr 1.8fr;
      gap: 1.25rem;
    }

    .link-harbor-action {
      font-size: 0.74rem;
      font-weight: 700;
      color: #111827;
      text-decoration: none;
      transition: color 0.15s;
    }

    .link-harbor-action:hover {
      color: #d4af37;
    }

    .top-products-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .product-rank-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding-bottom: 0.65rem;
      border-bottom: 1px solid #f9fafb;
    }

    .product-rank-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .product-avatar-monogram {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      background: #f3f4f6;
      color: #374151;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      flex-shrink: 0;
      border: 1px solid #e5e7eb;
    }

    .product-info-col {
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 0.1rem;
    }

    .product-title-text {
      font-size: 0.82rem;
      font-weight: 700;
      color: #111827;
    }

    .product-category-text {
      font-size: 0.7rem;
      color: #6b7280;
    }

    .product-revenue-col {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.1rem;
    }

    .product-amount-number {
      font-size: 0.85rem;
      font-weight: 800;
      color: #111827;
      font-family: ui-monospace, monospace;
    }

    .product-sold-units {
      font-size: 0.68rem;
      color: #9ca3af;
    }

    /* Tabla de Pedidos Recientes */
    .orders-table-wrapper {
      overflow-x: auto;
    }

    .harbor-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.76rem;
    }

    .harbor-table th {
      text-align: left;
      font-size: 0.66rem;
      font-weight: 700;
      color: #9ca3af;
      letter-spacing: 0.08em;
      padding: 0.6rem 0.75rem;
      border-bottom: 1px solid #f1f5f9;
    }

    .harbor-table td {
      padding: 0.75rem;
      border-bottom: 1px solid #f8f9fa;
      vertical-align: middle;
    }

    .harbor-table tr:hover td {
      background-color: #fafafa;
    }

    .col-order-code {
      font-family: ui-monospace, monospace;
      font-weight: 700;
      color: #111827;
    }

    .customer-cell {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .customer-avatar-dot {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #e5e7eb;
      color: #374151;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.58rem;
      font-weight: 800;
      flex-shrink: 0;
    }

    .customer-name-text {
      font-weight: 600;
      color: #1f2937;
    }

    .col-items-summary {
      color: #6b7280;
      max-width: 180px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .status-pill-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.68rem;
      font-weight: 700;
    }

    .status-dot-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .badge-delivered {
      background: #ecfdf5;
      color: #065f46;
    }
    .badge-delivered .status-dot-indicator { background: #059669; }

    .badge-processing {
      background: #eff6ff;
      color: #1e40af;
    }
    .badge-processing .status-dot-indicator { background: #2563eb; }

    .badge-shipped {
      background: #fdf8e6;
      color: #854d0e;
    }
    .badge-shipped .status-dot-indicator { background: #d4af37; }

    .badge-neutral {
      background: #f3f4f6;
      color: #374151;
    }
    .badge-neutral .status-dot-indicator { background: #6b7280; }

    .col-total {
      font-weight: 800;
      color: #111827;
      font-family: ui-monospace, monospace;
    }

    .col-date {
      color: #9ca3af;
      font-size: 0.72rem;
    }

    .text-right {
      text-align: right;
    }

    /* Responsividad */
    @media (max-width: 1100px) {
      .harbor-top-metrics-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .target-gauge-card {
        grid-column: span 2;
      }
      .harbor-middle-grid,
      .harbor-bottom-grid {
        grid-template-columns: 1fr;
      }
      .voice-diagnosis-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .harbor-container {
        padding: 1rem;
      }
      .harbor-header {
        flex-direction: column;
        align-items: flex-start;
      }
      .header-actions-block {
        width: 100%;
        justify-content: space-between;
      }
      .harbor-top-metrics-grid {
        grid-template-columns: 1fr;
      }
      .target-gauge-card {
        grid-column: span 1;
      }
      .card-header-flex {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }
      .chart-controls-cluster {
        width: 100%;
        justify-content: space-between;
      }
      .executive-bi-strip {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }
      .bi-stat-chip {
        border-right: none;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 0.35rem;
      }
      .granularity-switcher-tabs {
        width: 100%;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
      }
      .switcher-tab {
        text-align: center;
      }
      .quick-prompts-row {
        overflow-x: auto;
        flex-wrap: nowrap;
        padding-bottom: 0.4rem;
        -webkit-overflow-scrolling: touch;
      }
      .prompt-chip {
        white-space: nowrap;
      }
    }
  `]
})
export class ReportesDashboardPageComponent implements OnInit, OnDestroy {
  private reportesService = inject(ReportesService);
  private authService = inject(AuthService);

  // Estados reactivos
  loading = signal<boolean>(true);
  exporting = signal<boolean>(false);
  selectedRango = signal<string>('30D');
  selectedGranularidad = signal<'DIA' | 'SEMANA' | 'MES'>('MES');
  selectedMes = signal<number>(8); // Por defecto Agosto
  selectedAnio = signal<number>(2026);
  dashboardData = signal<DashboardReporteResponse | null>(null);

  mesesDisponibles = [
    { id: 1, nombre: 'Enero' },
    { id: 2, nombre: 'Febrero' },
    { id: 3, nombre: 'Marzo' },
    { id: 4, nombre: 'Abril' },
    { id: 5, nombre: 'Mayo' },
    { id: 6, nombre: 'Junio' },
    { id: 7, nombre: 'Julio' },
    { id: 8, nombre: 'Agosto' },
    { id: 9, nombre: 'Septiembre' },
    { id: 10, nombre: 'Octubre' },
    { id: 11, nombre: 'Noviembre' },
    { id: 12, nombre: 'Diciembre' }
  ];

  aniosDisponibles = [2026, 2025, 2024];

  // Asistente de Voz IA
  isListening = signal<boolean>(false);
  isSpeaking = signal<boolean>(false);
  isProcessingVoice = signal<boolean>(false);
  currentTranscript = signal<string>('');
  voiceAnalysis = signal<AnalisisVozResponse | null>(null);
  textQueryInput = '';

  // Interacción en gráfico
  hoveredTrendPoint: any = null;
  chartViewType = signal<'line' | 'bar'>('line');
  showComparative = signal<boolean>(true);

  quickPills = [
    { label: '¿Cuál es el producto más vendido?', query: 'Cual es el producto mas vendido?' },
    { label: '¿Cómo están los ingresos este mes?', query: 'Como estan los ingresos este mes?' },
    { label: '¿Cuál es la ocupación de probadores?', query: 'Cual es la ocupacion de probadores?' },
    { label: '¿Qué prendas tienen stock crítico?', query: 'Cuales prendas tienen stock critico o bajo?' }
  ];

  // Computadas para la cabecera
  currentUserName = computed(() => {
    const user = this.authService.currentUser();
    return user?.nombre || 'Administrador';
  });

  currentDateFormatted = computed(() => {
    const d = new Date();
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  });

  // Datos Financieros y de Cumplimiento
  financialData = computed<FinancialIndicator>(() => {
    const d = this.dashboardData();
    if (d && d.financial) {
      return d.financial;
    }
    return {
      facturacion_actual: 148245.0,
      facturacion_anterior: 130480.0,
      variacion_pct: 12.5,
      objetivo_mes: 172000.0,
      cumplimiento_pct: 86.2,
      ticket_medio: 320.0,
      pedidos_totales: 342,
      unidades_vendidas: 712,
      descuentos_totales: 4850.0,
      mensaje_insight: 'Estás al 86.2% del objetivo fijado con un crecimiento intermensual del +12.5%.'
    };
  });

  // Offset del semicírculo de meta (arco de 180°, circunferencia media = 175.93)
  semicircleDashoffset = computed(() => {
    const pct = Math.min(100, Math.max(0, this.financialData().cumplimiento_pct));
    const arcLength = 175.93; // PI * 56
    return arcLength * (1 - pct / 100);
  });

  // Escala cuantitativa dinámica para el eje Y
  maxTrendVal = computed(() => {
    const d = this.dashboardData();
    const points: ComparativeTrendPoint[] = (d && d.comparative_trend && d.comparative_trend.length > 0)
      ? d.comparative_trend
      : [];
    if (points.length === 0) return 25000;
    const peak = Math.max(...points.map(p => Math.max(p.monto_actual, p.monto_anterior)), 1000);
    if (peak <= 5000) return Math.ceil(peak / 1000) * 1000;
    if (peak <= 20000) return Math.ceil(peak / 2500) * 2500;
    if (peak <= 50000) return Math.ceil(peak / 5000) * 5000;
    return Math.ceil(peak / 10000) * 10000;
  });

  trendYAxisTicks = computed(() => {
    const maxVal = this.maxTrendVal();
    return [
      { label: this.formatCurrencyShort(maxVal), y: 30 },
      { label: this.formatCurrencyShort(Math.round(maxVal * 0.66)), y: 90 },
      { label: this.formatCurrencyShort(Math.round(maxVal * 0.33)), y: 150 },
      { label: '$0', y: 210 }
    ];
  });

  modoVista = computed(() => this.dashboardData()?.modo_vista || 'HISTORICO');
  mensajeFuturo = computed(() => this.dashboardData()?.mensaje_futuro || 'No te apresures en ver tu futuro, enfocate en el presente');

  // Coordenadas calculadas para la curva SVG
  trendChartCoords = computed(() => {
    const d = this.dashboardData();
    const points: ComparativeTrendPoint[] = (d && d.comparative_trend && d.comparative_trend.length > 0)
      ? d.comparative_trend
      : [
          { periodo: 'Ene', monto_actual: 5200, monto_anterior: 4200 },
          { periodo: 'Feb', monto_actual: 6300, monto_anterior: 4800 },
          { periodo: 'Mar', monto_actual: 8100, monto_anterior: 6500 },
          { periodo: 'Abr', monto_actual: 8900, monto_anterior: 7400 },
          { periodo: 'May', monto_actual: 11200, monto_anterior: 9100 },
          { periodo: 'Jun', monto_actual: 12400, monto_anterior: 10400 },
          { periodo: 'Jul', monto_actual: 13900, monto_anterior: 11200 },
          { periodo: 'Ago', monto_actual: 13100, monto_anterior: 11800 },
          { periodo: 'Sep', monto_actual: 15400, monto_anterior: 12900 }
        ];

    const maxVal = this.maxTrendVal();
    const startX = 72;
    const endX = 665;
    const stepX = (endX - startX) / Math.max(points.length - 1, 1);

    return points.map((p, i) => {
      const x = startX + i * stepX;
      const yAct = 210 - (p.monto_actual / maxVal) * 180;
      const yAnt = 210 - (p.monto_anterior / maxVal) * 180;
      return {
        x: Math.round(x),
        yActual: Math.round(yAct),
        yAnterior: Math.round(yAnt),
        periodo: p.periodo,
        montoActual: p.monto_actual,
        montoAnterior: p.monto_anterior
      };
    });
  });

  lastTrendPoint = computed(() => {
    const coords = this.trendChartCoords();
    return coords.length > 0 ? coords[coords.length - 1] : null;
  });

  svgPathActual = computed(() => {
    const coords = this.trendChartCoords();
    if (coords.length === 0) return '';
    let d = `M${coords[0].x},${coords[0].yActual}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const cur = coords[i];
      const cpx = prev.x + (cur.x - prev.x) / 2;
      d += ` C${cpx},${prev.yActual} ${cpx},${cur.yActual} ${cur.x},${cur.yActual}`;
    }
    return d;
  });

  svgAreaActual = computed(() => {
    const coords = this.trendChartCoords();
    if (coords.length === 0) return '';
    const line = this.svgPathActual();
    const last = coords[coords.length - 1];
    const first = coords[0];
    return `${line} L${last.x},210 L${first.x},210 Z`;
  });

  svgPathAnterior = computed(() => {
    const coords = this.trendChartCoords();
    if (coords.length === 0) return '';
    let d = `M${coords[0].x},${coords[0].yAnterior}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const cur = coords[i];
      const cpx = prev.x + (cur.x - prev.x) / 2;
      d += ` C${cpx},${prev.yAnterior} ${cpx},${cur.yAnterior} ${cur.x},${cur.yAnterior}`;
    }
    return d;
  });

  irAMesActual(): void {
    this.selectedMes.set(9);
    this.selectedAnio.set(2026);
    this.cambiarRango('MES_ACTUAL');
  }

  irAMesPredictivo(): void {
    this.selectedMes.set(10);
    this.selectedAnio.set(2026);
    this.cambiarMes(10);
  }

  trendPeakPoint = computed(() => {
    const coords = this.trendChartCoords();
    if (coords.length === 0) return null;
    return coords.reduce((max, cur) => cur.montoActual > max.montoActual ? cur : max, coords[0]);
  });

  trendAverageVal = computed(() => {
    const coords = this.trendChartCoords();
    if (coords.length === 0) return 0;
    const sum = coords.reduce((acc, cur) => acc + cur.montoActual, 0);
    return Math.round(sum / coords.length);
  });

  hoveredTooltipLeft(): number {
    if (!this.hoveredTrendPoint) return 0;
    return Math.min(Math.max(this.hoveredTrendPoint.x - 90, 10), 480);
  }

  getPointDiffPct(pt: any): string {
    if (!pt || !pt.montoAnterior || pt.montoAnterior === 0) return '0.0';
    const diff = ((pt.montoActual - pt.montoAnterior) / pt.montoAnterior) * 100;
    return Math.abs(diff).toFixed(1);
  }

  getPointDiffMonto(pt: any): number {
    if (!pt) return 0;
    return Math.abs(pt.montoActual - pt.montoAnterior);
  }

  onChartMouseMove(event: MouseEvent): void {
    const coords = this.trendChartCoords();
    if (coords.length === 0) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const svgX = (mouseX / rect.width) * 680;

    let closest = coords[0];
    let minDiff = Math.abs(coords[0].x - svgX);
    for (let i = 1; i < coords.length; i++) {
      const diff = Math.abs(coords[i].x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closest = coords[i];
      }
    }
    this.hoveredTrendPoint = closest;
  }

  onChartMouseLeave(): void {
    this.hoveredTrendPoint = null;
  }

  // Lista de Productos Más Vendidos
  topProductsList = computed<TopProductItem[]>(() => {
    const d = this.dashboardData();
    if (d && d.top_products && d.top_products.length > 0) {
      return d.top_products;
    }
    return [
      { prenda_id: 1, nombre: 'Cashmere Trench Coat Atelier', categoria: 'Alta Costura', unidades_vendidas: 142, ingresos_totales: 49200.0, imagen_url: null },
      { prenda_id: 2, nombre: 'Vestido de Seda Georgette Noir', categoria: 'Alta Costura', unidades_vendidas: 118, ingresos_totales: 38940.0, imagen_url: null },
      { prenda_id: 3, nombre: 'Tailored Wool Blazer Milano', categoria: 'Sastrería', unidades_vendidas: 95, ingresos_totales: 27455.0, imagen_url: null },
      { prenda_id: 4, nombre: 'Pantalón Palazzo Seda Marfil', categoria: 'Gala & Noche', unidades_vendidas: 84, ingresos_totales: 18480.0, imagen_url: null }
    ];
  });

  // Lista de Pedidos Recientes
  recentOrdersList = computed<RecentOrderRow[]>(() => {
    const d = this.dashboardData();
    if (d && d.recent_orders && d.recent_orders.length > 0) {
      return d.recent_orders;
    }
    return [
      { codigo_pedido: '#AT-9842', cliente_nombre: 'Helena Vance', items_resumen: 'Cashmere Trench Coat, Pañuelo Seda', sucursal_o_ciudad: 'Boutique Palermo', monto_total: 3450.00, estado: 'ENTREGADO', fecha: 'Hoy 14:20' },
      { codigo_pedido: '#AT-9841', cliente_nombre: 'Julian Sterling', items_resumen: 'Tailored Wool Blazer, Camisa Noir', sucursal_o_ciudad: 'Flagship Centro', monto_total: 2890.00, estado: 'EN PROCESO', fecha: 'Hoy 13:45' },
      { codigo_pedido: '#AT-9839', cliente_nombre: 'Camille Laurent', items_resumen: 'Vestido Sirena Terciopelo', sucursal_o_ciudad: 'E-Commerce Delivery', monto_total: 1850.00, estado: 'ENVIADO', fecha: 'Hoy 11:15' },
      { codigo_pedido: '#AT-9835', cliente_nombre: 'Aethelgard Corp', items_resumen: 'Prendas de Gala Ejecutivas (x3)', sucursal_o_ciudad: 'Boutique Recoleta', monto_total: 4220.00, estado: 'PAGADA', fecha: 'Ayer 18:30' }
    ];
  });

  // Ciclo de Vida
  ngOnInit(): void {
    this.cargarDashboard(this.selectedRango(), this.selectedGranularidad());
  }

  ngOnDestroy(): void {
    this.reportesService.stopListening();
    this.reportesService.stopSpeaking();
  }

  cargarDashboard(rango: string, granularidad: 'DIA' | 'SEMANA' | 'MES'): void {
    this.loading.set(true);
    const mes = rango === 'MES_ESPECIFICO' ? this.selectedMes() : undefined;
    const anio = rango === 'MES_ESPECIFICO' ? this.selectedAnio() : undefined;
    this.reportesService.getDashboard(rango, granularidad, undefined, mes, anio).subscribe({
      next: (res) => {
        this.dashboardData.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar dashboard BI:', err);
        this.loading.set(false);
      }
    });
  }

  cambiarRango(rango: string): void {
    this.selectedRango.set(rango);
    this.cargarDashboard(rango, this.selectedGranularidad());
  }

  cambiarMes(mes: any): void {
    const m = Number(mes);
    this.selectedMes.set(m);
    this.cargarDashboard('MES_ESPECIFICO', this.selectedGranularidad());
  }

  cambiarAnio(anio: any): void {
    const a = Number(anio);
    this.selectedAnio.set(a);
    this.cargarDashboard('MES_ESPECIFICO', this.selectedGranularidad());
  }

  getNombreMes(mesId: number): string {
    const mes = this.mesesDisponibles.find(m => m.id === Number(mesId));
    return mes ? mes.nombre : '';
  }

  cambiarGranularidad(gran: 'DIA' | 'SEMANA' | 'MES'): void {
    this.selectedGranularidad.set(gran);
    this.cargarDashboard(this.selectedRango(), gran);
  }

  exportarReporte(): void {
    this.exporting.set(true);
    this.reportesService.exportarCSV().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_Ejecutivo_FashionStore_${this.selectedGranularidad()}_${Date.now()}.csv`;
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

  // Helpers de visualización
  getInitials(name: string): string {
    if (!name) return 'AT';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getStatusBadgeClass(estado: string): string {
    const st = (estado || '').toUpperCase();
    if (st.includes('ENTREGAD') || st.includes('COMPLET')) return 'badge-delivered';
    if (st.includes('PROCES') || st.includes('PREPARAC')) return 'badge-processing';
    if (st.includes('ENVIAD') || st.includes('TRANSIT')) return 'badge-shipped';
    return 'badge-neutral';
  }

  formatCurrencyShort(val: number): string {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${Math.round(val / 1000)}k`;
    return `$${Math.round(val)}`;
  }

  // =========================================================================
  // INTEGRACIÓN DE VOZ (SPEECH RECOGNITION & TTS)
  // =========================================================================

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
          console.warn('Speech error:', err);
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
    this.textQueryInput = query;
    this.ejecutarConsultaVoz(query);
  }

  ejecutarConsultaTexto(): void {
    if (!this.textQueryInput.trim()) return;
    const q = this.textQueryInput.trim();
    this.currentTranscript.set(q);
    this.ejecutarConsultaVoz(q);
  }

  private ejecutarConsultaVoz(query: string): void {
    this.isProcessingVoice.set(true);
    this.reportesService.analizarConsultaVoz(query, this.selectedRango()).subscribe({
      next: (res) => {
        this.voiceAnalysis.set(res);
        this.isProcessingVoice.set(false);
        if (res.speech_text) {
          this.hablarRespuesta(res.speech_text);
        }
      },
      error: (err) => {
        console.error('Error al procesar consulta de voz con IA:', err);
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
