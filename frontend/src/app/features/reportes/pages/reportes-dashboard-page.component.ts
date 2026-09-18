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
  TopProductItem,
  FinancialIndicator,
  ComparativeTrendPoint,
  InventoryStackedItem,
  FunnelStepItem,
  DistributionSlice,
  GeographicHub
} from '../models/reportes.models';

@Component({
  selector: 'app-reportes-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="dashboard-page-wrapper">
      <div class="dashboard-container">

        <!-- ========================================================= -->
        <!-- CABECERA PRINCIPAL EJECUTIVA (SIN "SI2")                  -->
        <!-- ========================================================= -->
        <header class="dashboard-header">
          <div class="header-titles">
            <div class="header-eyebrow">
              <span class="gold-dot">&bull;</span>
              <span>INTELLIGENCE &bull; ATELIER NOIR</span>
            </div>
            <h1 class="header-main-title">Dashboard Ejecutivo & Business Intelligence</h1>
            <p class="header-subtitle">
              Panel analítico consolidado de visión financiera, inventario de alta costura, funnel de conversión y logística.
            </p>
          </div>

          <div class="header-controls">
            <!-- Selector de Rango Temporal General -->
            <div class="period-selector-wrapper">
              <span class="period-label">RANGO:</span>
              <select class="period-select" [ngModel]="selectedRango()" (ngModelChange)="cambiarRango($event)">
                <option value="24H">Últimas 24 Horas</option>
                <option value="7D">Últimos 7 Días</option>
                <option value="30D">Últimos 30 Días</option>
                <option value="MES_ACTUAL">Mes en Curso</option>
              </select>
            </div>

            <!-- Botón Exportar CSV -->
            <button
              type="button"
              class="btn-export-csv"
              (click)="exportarReporte()"
              [disabled]="exporting()">
              <span *ngIf="!exporting()">↓ Exportar CSV</span>
              <span *ngIf="exporting()">Generando...</span>
            </button>
          </div>
        </header>

        <!-- ========================================================= -->
        <!-- ASISTENTE DE VOZ IA UNIFICADO (ZERO BOTONERA CLUTTER)     -->
        <!-- ========================================================= -->
        <section class="voice-ai-bar-section">
          <div class="voice-search-bar" [class.listening-active]="isListening()">
            <button
              type="button"
              class="voice-mic-trigger"
              (click)="toggleVoiceRecording()"
              [title]="isListening() ? 'Detener dictado' : 'Hablar al Asistente IA'">
              <svg
                *ngIf="!isListening()"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                class="icon-mic"
                aria-hidden="true"
              >
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
              [placeholder]="isListening() ? (currentTranscript() || 'Escuchando tu consulta...') : 'Preguntá a la IA: ¿cuál es la prenda más vendida?, ¿cómo va el objetivo mensual? (escribí o pulsá el micro)...'"
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
          <div class="quick-prompts-subtle">
            <span class="prompt-hint">Preguntas sugeridas:</span>
            <button
              *ngFor="let p of quickPills"
              type="button"
              class="prompt-chip"
              (click)="consultarPorPill(p.query)">
              {{ p.label }}
            </button>
          </div>

          <!-- Diagnóstico de Voz Desplegable -->
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
        <!-- 1. MÓDULO 1: RENDIMIENTO DE VENTAS (VISIÓN FINANCIERA)     -->
        <!--    Inspirado fielmente en el boceto "VENTAS POR MES"      -->
        <!-- ========================================================= -->
        <section class="bi-card financial-module">
          <!-- Header de la tarjeta con Switcher de Granularidad: Mes / Semana / Día -->
          <div class="bi-card-header">
            <div class="bi-header-left">
              <h2 class="bi-title">
                VENTAS POR {{ selectedGranularidad() === 'MES' ? 'MES' : (selectedGranularidad() === 'SEMANA' ? 'SEMANA' : 'DÍA') }}
              </h2>
              <p class="bi-subtitle">
                Comparación de ventas acumuladas frente al período anterior con proyección de meta.
              </p>
            </div>

            <div class="bi-header-right">
              <!-- Switcher de Granularidad (Día, Semana, Mes) -->
              <div class="granularity-tabs">
                <button
                  type="button"
                  class="gran-tab"
                  [class.active]="selectedGranularidad() === 'DIA'"
                  (click)="cambiarGranularidad('DIA')">
                  Día
                </button>
                <button
                  type="button"
                  class="gran-tab"
                  [class.active]="selectedGranularidad() === 'SEMANA'"
                  (click)="cambiarGranularidad('SEMANA')">
                  Semana
                </button>
                <button
                  type="button"
                  class="gran-tab"
                  [class.active]="selectedGranularidad() === 'MES'"
                  (click)="cambiarGranularidad('MES')">
                  Mes
                </button>
              </div>
            </div>
          </div>

          <!-- Contenido Principal: Doble Anillo + Mini KPIs (Izquierda) & Curvas Comparativas (Derecha) -->
          <div class="financial-main-layout">

            <!-- Lado Izquierdo: Anillo de Facturación vs Objetivo & Métricas Clave -->
            <div class="financial-left-col">
              <div class="ring-and-main-value">
                <!-- Concentric Double Ring Gauge (SVG) -->
                <div class="ring-gauge-wrapper">
                  <svg class="concentric-ring-svg" viewBox="0 0 140 140">
                    <!-- Anillo de fondo exterior -->
                    <circle cx="70" cy="70" r="56" fill="transparent" stroke="#f3f4f6" stroke-width="10" />
                    <!-- Anillo de progreso exterior (Facturación vs Meta) -->
                    <circle
                      cx="70" cy="70" r="56"
                      fill="transparent"
                      stroke="#111111"
                      stroke-width="10"
                      stroke-linecap="round"
                      stroke-dasharray="351.85"
                      [attr.stroke-dashoffset]="outerRingDashoffset()"
                      transform="rotate(-90 70 70)"
                    />
                    <!-- Anillo de fondo interior -->
                    <circle cx="70" cy="70" r="42" fill="transparent" stroke="#fdf8e6" stroke-width="7" />
                    <!-- Anillo de progreso interior (Dorado Haute Couture) -->
                    <circle
                      cx="70" cy="70" r="42"
                      fill="transparent"
                      stroke="#d4af37"
                      stroke-width="7"
                      stroke-linecap="round"
                      stroke-dasharray="263.89"
                      [attr.stroke-dashoffset]="innerRingDashoffset()"
                      transform="rotate(-90 70 70)"
                    />
                  </svg>
                  <div class="ring-center-text">
                    <span class="ring-pct-number">{{ financialData().cumplimiento_pct }}%</span>
                    <span class="ring-pct-label">Objetivo</span>
                  </div>
                </div>

                <!-- Monto Total Grande y Variación -->
                <div class="main-revenue-block">
                  <span class="revenue-caption">Facturación actual</span>
                  <div class="revenue-big-row">
                    <span class="revenue-currency">&dollar;</span>
                    <span class="revenue-amount">{{ financialData().facturacion_actual | number:'1.2-2' }}</span>
                  </div>
                  <div class="growth-pill-badge">
                    <span class="pill-arrow">▲</span>
                    <span>+{{ financialData().variacion_pct }}%</span>
                    <span class="pill-vs">vs anterior</span>
                  </div>
                </div>
              </div>

              <!-- Mini Cuadrícula de 4 Métricas Clave -->
              <div class="mini-kpis-grid">
                <div class="mini-kpi-box">
                  <span class="mini-kpi-label">Ticket medio</span>
                  <span class="mini-kpi-val">&dollar;{{ financialData().ticket_medio | number:'1.2-2' }}</span>
                </div>
                <div class="mini-kpi-box">
                  <span class="mini-kpi-label">Pedidos</span>
                  <span class="mini-kpi-val">{{ financialData().pedidos_totales }}</span>
                </div>
                <div class="mini-kpi-box">
                  <span class="mini-kpi-label">Uds. vendidas</span>
                  <span class="mini-kpi-val">{{ financialData().unidades_vendidas }}</span>
                </div>
                <div class="mini-kpi-box">
                  <span class="mini-kpi-label">Descuentos</span>
                  <span class="mini-kpi-val">&dollar;{{ financialData().descuentos_totales | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>

            <!-- Lado Derecho: Curvas Comparativas de Tendencia (Este período vs Anterior) -->
            <div class="financial-right-col">
              <!-- Leyenda Gráfica Superior -->
              <div class="comparative-legend-bar">
                <div class="legend-series">
                  <span class="legend-chip-color solid-black"></span>
                  <span class="legend-label">Este período</span>
                </div>
                <div class="legend-series">
                  <span class="legend-chip-color dashed-gray"></span>
                  <span class="legend-label">Período anterior</span>
                </div>
              </div>

              <!-- Lienzo SVG con Curvas de Beziers Suaves -->
              <div class="trend-chart-container">
                <svg class="trend-svg" viewBox="0 0 640 200" preserveAspectRatio="none">
                  <!-- Líneas de Guía Horizontal (Grid) -->
                  <line x1="0" y1="35" x2="640" y2="35" stroke="#f3f4f6" stroke-width="1" />
                  <line x1="0" y1="80" x2="640" y2="80" stroke="#f3f4f6" stroke-width="1" />
                  <line x1="0" y1="125" x2="640" y2="125" stroke="#f3f4f6" stroke-width="1" />
                  <line x1="0" y1="170" x2="640" y2="170" stroke="#e5e7eb" stroke-width="1" />

                  <!-- Gradiente para el Área Actual -->
                  <defs>
                    <linearGradient id="curveFillActual" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#111111" stop-opacity="0.14" />
                      <stop offset="100%" stop-color="#111111" stop-opacity="0.00" />
                    </linearGradient>
                  </defs>

                  <!-- Área Rellena del Período Actual -->
                  <path [attr.d]="svgAreaActual()" fill="url(#curveFillActual)" />

                  <!-- Curva Dotted: Período Anterior -->
                  <path [attr.d]="svgPathAnterior()" fill="none" stroke="#9ca3af" stroke-width="2" stroke-dasharray="5,5" />

                  <!-- Curva Sólida: Este Período -->
                  <path [attr.d]="svgPathActual()" fill="none" stroke="#111111" stroke-width="2.6" />

                  <!-- Nodos Interactivos (Puntos Actuales) -->
                  <g *ngFor="let pt of trendChartCoords()">
                    <circle
                      [attr.cx]="pt.x"
                      [attr.cy]="pt.yActual"
                      r="4.5"
                      fill="#ffffff"
                      stroke="#111111"
                      stroke-width="2.5"
                      (mouseenter)="hoveredTrendPoint = pt"
                      (mouseleave)="hoveredTrendPoint = null"
                      class="interactive-node"
                    />
                  </g>
                </svg>

                <!-- Tooltip Dinámico en Hover -->
                <div *ngIf="hoveredTrendPoint" class="trend-hover-tooltip" [style.left.px]="hoveredTrendPoint.x - 60">
                  <div class="tooltip-title">{{ hoveredTrendPoint.periodo }}</div>
                  <div class="tooltip-row">
                    <span class="dot-cur"></span>
                    <span>Actual: <strong>&dollar;{{ hoveredTrendPoint.montoActual | number:'1.2-2' }}</strong></span>
                  </div>
                  <div class="tooltip-row">
                    <span class="dot-prev"></span>
                    <span>Anterior: &dollar;{{ hoveredTrendPoint.montoAnterior | number:'1.2-2' }}</span>
                  </div>
                </div>

                <!-- Eje X con Etiquetas de Granularidad (Días, Semanas o Meses) -->
                <div class="trend-x-axis">
                  <span *ngFor="let pt of trendChartCoords()">{{ pt.periodo }}</span>
                </div>
              </div>
            </div>

          </div>

          <!-- Banner Inferior de Logro / Insight Gerencial -->
          <div class="achievement-callout-banner">
            <div class="achievement-icon">🚀</div>
            <div class="achievement-text">
              <strong>¡Excelente ritmo operativo!</strong>
              <span>{{ financialData().mensaje_insight }}</span>
            </div>
          </div>
        </section>

        <!-- ========================================================= -->
        <!-- 2. MÓDULO 2: ANÁLISIS DE PRODUCTOS E INVENTARIO           -->
        <!--    Barras Horizontales (Top) + Barras Apiladas (Stock)     -->
        <!-- ========================================================= -->
        <section class="bi-grid-row two-columns-equal">

          <!-- Gráfico de Barras Horizontales: Top Productos Más Vendidos -->
          <article class="bi-card">
            <div class="bi-card-header">
              <div>
                <h3 class="bi-title-medium">Top Productos Más Vendidos</h3>
                <p class="bi-subtitle">Prendas con mayor demanda y facturación acumulada.</p>
              </div>
              <span class="subtle-badge">RANKING ATELIER</span>
            </div>

            <div class="horizontal-bars-container">
              <div *ngFor="let p of topProductsList(); let idx = index" class="hbar-item">
                <div class="hbar-meta-row">
                  <div class="hbar-info">
                    <span class="hbar-rank">#{{ idx + 1 }}</span>
                    <img
                      [src]="p.imagen_url || '/assets/catalog/vestido-noir.jpg'"
                      class="hbar-thumb"
                      [alt]="p.nombre"
                    />
                    <div class="hbar-names">
                      <span class="hbar-product-name">{{ p.nombre }}</span>
                      <span class="hbar-category">{{ p.categoria }} &bull; {{ p.unidades_vendidas }} unidades</span>
                    </div>
                  </div>
                  <div class="hbar-amount">
                    <strong>&dollar;{{ p.ingresos_totales | number:'1.2-2' }}</strong>
                  </div>
                </div>

                <!-- Barra Horizontal -->
                <div class="hbar-track">
                  <div
                    class="hbar-fill"
                    [style.width.%]="(p.ingresos_totales / maxProductRevenue()) * 100"
                  ></div>
                </div>
              </div>
            </div>
          </article>

          <!-- Gráfico de Barras Apiladas: Stock Disponible vs Reservado vs Crítico -->
          <article class="bi-card">
            <div class="bi-card-header">
              <div>
                <h3 class="bi-title-medium">Inventario por Categoría (Barras Apiladas)</h3>
                <p class="bi-subtitle">Disponibilidad en almacén, reservas en probador y riesgo crítico.</p>
              </div>
              <a routerLink="/inventario" class="link-action-header">Ver Almacén &rarr;</a>
            </div>

            <!-- Leyenda de Colores Apilados -->
            <div class="stacked-legend-row">
              <div class="stacked-legend-item">
                <span class="color-dot bg-black"></span>
                <span>Disponible</span>
              </div>
              <div class="stacked-legend-item">
                <span class="color-dot bg-gold"></span>
                <span>En Probador VIP / Carrito</span>
              </div>
              <div class="stacked-legend-item">
                <span class="color-dot bg-red"></span>
                <span>Alerta Crítica (&le;6 u.)</span>
              </div>
            </div>

            <!-- Lista de Barras Apiladas por Categoría -->
            <div class="stacked-bars-list">
              <div *ngFor="let cat of inventoryStackedList()" class="stacked-bar-item">
                <div class="stacked-bar-labels">
                  <span class="cat-name">{{ cat.categoria }}</span>
                  <span class="cat-total">{{ cat.disponible + cat.reservado_probadores + cat.alerta_critica }} u. totales</span>
                </div>

                <div class="stacked-bar-track">
                  <!-- Segmento Disponible -->
                  <div
                    class="segment seg-disponible"
                    [style.width.%]="getStackedPct(cat, 'disponible')"
                    [title]="'Disponible: ' + cat.disponible + ' unidades'">
                  </div>
                  <!-- Segmento Reservado Probadores -->
                  <div
                    class="segment seg-reservado"
                    [style.width.%]="getStackedPct(cat, 'reservado')"
                    [title]="'En Probador: ' + cat.reservado_probadores + ' unidades'">
                  </div>
                  <!-- Segmento Alerta Crítica -->
                  <div
                    class="segment seg-alerta"
                    [style.width.%]="getStackedPct(cat, 'alerta')"
                    [title]="'Riesgo Crítico: ' + cat.alerta_critica + ' unidades'">
                  </div>
                </div>

                <div class="stacked-values-breakdown">
                  <span>Disp: <strong>{{ cat.disponible }}</strong></span>
                  <span>Probadores: <strong>{{ cat.reservado_probadores }}</strong></span>
                  <span class="text-critico">Alerta: <strong>{{ cat.alerta_critica }}</strong></span>
                </div>
              </div>
            </div>
          </article>

        </section>

        <!-- ========================================================= -->
        <!-- 3. MÓDULO 3: COMPORTAMIENTO Y CONVERSIÓN DEL CLIENTE      -->
        <!--    Gráfico de Embudo (Funnel) + Gráfico Circular Canales   -->
        <!-- ========================================================= -->
        <section class="bi-grid-row two-columns-equal">

          <!-- Gráfico de Embudo (Sales Funnel) -->
          <article class="bi-card">
            <div class="bi-card-header">
              <div>
                <h3 class="bi-title-medium">Embudo de Conversión de Clientes (Sales Funnel)</h3>
                <p class="bi-subtitle">Desde la primera visita al catálogo hasta el cobro en caja o web.</p>
              </div>
              <span class="subtle-badge">CONVERSIÓN 4.4%</span>
            </div>

            <!-- Estructura Visual del Funnel Descendente -->
            <div class="funnel-container">
              <div *ngFor="let step of funnelStepsList(); let i = index" class="funnel-step-row">
                <div class="funnel-step-info">
                  <span class="step-badge">Paso {{ i + 1 }}</span>
                  <span class="step-title">{{ step.etapa }}</span>
                  <span class="step-count font-mono">{{ step.cantidad | number }} clientes</span>
                </div>

                <!-- Barra Trapecio del Funnel -->
                <div class="funnel-bar-wrapper">
                  <div
                    class="funnel-trapezoid-bar"
                    [style.width.%]="step.porcentaje"
                    [class.funnel-step-final]="i === funnelStepsList().length - 1">
                    <span class="funnel-pct-text">{{ step.porcentaje }}%</span>
                  </div>
                </div>

                <div *ngIf="i < funnelStepsList().length - 1" class="funnel-drop-indicator">
                  <span class="drop-arrow">&darr;</span>
                  <span class="drop-rate">{{ step.conversion_siguiente }}% avanzan al siguiente paso</span>
                </div>
              </div>
            </div>
          </article>

          <!-- Gráfico Circular / Anillo de Distribución de Canales -->
          <article class="bi-card">
            <div class="bi-card-header">
              <div>
                <h3 class="bi-title-medium">Distribución por Canales de Venta</h3>
                <p class="bi-subtitle">Aportación de boutiques físicas, canal digital y citas VIP.</p>
              </div>
              <span class="subtle-badge">OMNICANAL</span>
            </div>

            <div class="donut-distribution-layout">
              <!-- SVG Donut Chart -->
              <div class="donut-canvas-box">
                <svg class="donut-slice-svg" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="60" fill="transparent" stroke="#f3f4f6" stroke-width="20" />
                  <!-- Slice 1: Tiendas Físicas (54.5%) -> 376.99 * 0.545 = 205.46 -->
                  <circle
                    cx="80" cy="80" r="60"
                    fill="transparent"
                    stroke="#111827"
                    stroke-width="20"
                    stroke-dasharray="205.46 376.99"
                    stroke-dashoffset="0"
                    transform="rotate(-90 80 80)"
                  />
                  <!-- Slice 2: E-Commerce Noir (32.2%) -> 376.99 * 0.322 = 121.39 -->
                  <circle
                    cx="80" cy="80" r="60"
                    fill="transparent"
                    stroke="#d4af37"
                    stroke-width="20"
                    stroke-dasharray="121.39 376.99"
                    stroke-dashoffset="-205.46"
                    transform="rotate(-90 80 80)"
                  />
                  <!-- Slice 3: Citas Privadas VIP (13.3%) -> 376.99 * 0.133 = 50.14 -->
                  <circle
                    cx="80" cy="80" r="60"
                    fill="transparent"
                    stroke="#9ca3af"
                    stroke-width="20"
                    stroke-dasharray="50.14 376.99"
                    stroke-dashoffset="-326.85"
                    transform="rotate(-90 80 80)"
                  />
                </svg>
                <div class="donut-center-caption">
                  <span class="donut-center-bold">342</span>
                  <span class="donut-center-sub">Ventas Totales</span>
                </div>
              </div>

              <!-- Lista de Leyendas del Canal -->
              <div class="donut-details-list">
                <div *ngFor="let ch of channelList()" class="donut-detail-item">
                  <div class="donut-detail-header">
                    <span class="detail-color-pill" [style.background-color]="ch.color"></span>
                    <span class="detail-name">{{ ch.nombre }}</span>
                  </div>
                  <div class="donut-detail-metrics">
                    <strong class="font-mono">{{ ch.porcentaje }}%</strong>
                    <span class="detail-orders">({{ ch.cantidad }} pedidos)</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="client-loyalty-tip">
              <strong>Estrategia Omnicanal:</strong> El 68% de las reservas en probadores físicos generan una compra complementaria en el canal online en menos de 14 días.
            </div>
          </article>

        </section>

        <!-- ========================================================= -->
        <!-- 4. MÓDULO 4: OPERACIÓN Y LOGÍSTICA                         -->
        <!--    Gráfico Circular de Estados + Mapa Geográfico Densidad  -->
        <!-- ========================================================= -->
        <section class="bi-grid-row two-columns-equal">

          <!-- Gráfico Circular de Estados de Entrega -->
          <article class="bi-card">
            <div class="bi-card-header">
              <div>
                <h3 class="bi-title-medium">Estados Operativos de Pedidos</h3>
                <p class="bi-subtitle">Monitoreo de fulfillment, tránsito y entregas efectivas.</p>
              </div>
              <span class="subtle-badge">LOGÍSTICA</span>
            </div>

            <div class="donut-distribution-layout">
              <!-- SVG Donut de Estados -->
              <div class="donut-canvas-box">
                <svg class="donut-slice-svg" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="60" fill="transparent" stroke="#f3f4f6" stroke-width="20" />
                  <!-- Entregados: 65% -> 245.04 -->
                  <circle
                    cx="80" cy="80" r="60"
                    fill="transparent"
                    stroke="#059669"
                    stroke-width="20"
                    stroke-dasharray="245.04 376.99"
                    stroke-dashoffset="0"
                    transform="rotate(-90 80 80)"
                  />
                  <!-- En Tránsito: 20% -> 75.40 -->
                  <circle
                    cx="80" cy="80" r="60"
                    fill="transparent"
                    stroke="#2563eb"
                    stroke-width="20"
                    stroke-dasharray="75.40 376.99"
                    stroke-dashoffset="-245.04"
                    transform="rotate(-90 80 80)"
                  />
                  <!-- En Preparación: 12% -> 45.24 -->
                  <circle
                    cx="80" cy="80" r="60"
                    fill="transparent"
                    stroke="#f59e0b"
                    stroke-width="20"
                    stroke-dasharray="45.24 376.99"
                    stroke-dashoffset="-320.44"
                    transform="rotate(-90 80 80)"
                  />
                  <!-- Devoluciones: 3% -> 11.31 -->
                  <circle
                    cx="80" cy="80" r="60"
                    fill="transparent"
                    stroke="#ef4444"
                    stroke-width="20"
                    stroke-dasharray="11.31 376.99"
                    stroke-dashoffset="-365.68"
                    transform="rotate(-90 80 80)"
                  />
                </svg>
                <div class="donut-center-caption">
                  <span class="donut-center-bold">96.8%</span>
                  <span class="donut-center-sub">Efectividad</span>
                </div>
              </div>

              <!-- Desglose de Estados -->
              <div class="donut-details-list">
                <div *ngFor="let st of orderStatusList()" class="donut-detail-item">
                  <div class="donut-detail-header">
                    <span class="detail-color-pill" [style.background-color]="st.color"></span>
                    <span class="detail-name">{{ st.nombre }}</span>
                  </div>
                  <div class="donut-detail-metrics">
                    <strong class="font-mono">{{ st.porcentaje }}%</strong>
                    <span class="detail-orders">({{ st.cantidad }} despachos)</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Alerta logística -->
            <div class="logistics-sla-alert">
              <span class="sla-dot-green"></span>
              <span><strong>SLA en cumplimiento:</strong> Tiempo medio de preparación en boutique: <strong>18 minutos</strong>.</span>
            </div>
          </article>

          <!-- Mapa Geográfico de Densidad (Hubs de Entrega) -->
          <article class="bi-card">
            <div class="bi-card-header">
              <div>
                <h3 class="bi-title-medium">Mapa de Densidad & Cobertura Geográfica</h3>
                <p class="bi-subtitle">Concentración de órdenes y tiempos de entrega concierge por sucursal.</p>
              </div>
              <span class="subtle-badge">EN TIEMPO REAL</span>
            </div>

            <!-- Visualización de Mapa de Densidad Estilizado -->
            <div class="geographic-map-canvas">
              <div class="map-radar-grid">
                <div class="radar-circle radar-c1"></div>
                <div class="radar-circle radar-c2"></div>
                <div class="radar-circle radar-c3"></div>
              </div>

              <!-- Puntos de Densidad Geográfica -->
              <div class="geo-node-pin pin-palermo">
                <div class="pin-pulse"></div>
                <div class="pin-core"></div>
                <div class="pin-popup">
                  <span class="popup-title">Boutique Palermo Soho</span>
                  <span class="popup-meta">148 pedidos &bull; 35 min avg</span>
                </div>
              </div>

              <div class="geo-node-pin pin-recoleta">
                <div class="pin-pulse"></div>
                <div class="pin-core"></div>
                <div class="pin-popup">
                  <span class="popup-title">Flagship Recoleta Luxury</span>
                  <span class="popup-meta">112 pedidos &bull; 45 min avg</span>
                </div>
              </div>

              <div class="geo-node-pin pin-sanisidro">
                <div class="pin-pulse"></div>
                <div class="pin-core"></div>
                <div class="pin-popup">
                  <span class="popup-title">Hub Atelier San Isidro</span>
                  <span class="popup-meta">82 pedidos &bull; 90 min avg</span>
                </div>
              </div>
            </div>

            <!-- Tabla Resumen de Sedes Logísticas -->
            <div class="hubs-summary-table">
              <div *ngFor="let hub of geographicHubsList()" class="hub-summary-row">
                <div class="hub-id-col">
                  <span class="hub-name">{{ hub.sucursal }}</span>
                  <span class="hub-city">{{ hub.ciudad }}</span>
                </div>
                <div class="hub-stats-col">
                  <span class="hub-time">⏱ {{ hub.tiempo_entrega_promedio }}</span>
                  <span class="hub-revenue font-mono">&dollar;{{ hub.monto | number:'1.0-0' }}</span>
                </div>
              </div>
            </div>
          </article>

        </section>

      </div>
    </div>
  `,
  styles: [`
    /* =========================================================================
       FASHIONSTORE HAUTE COUTURE EXECUTIVE BI DASHBOARD - PURE SCOPED CSS
       ========================================================================= */

    .dashboard-page-wrapper {
      background-color: #f9fafb;
      color: #111111;
      min-height: calc(100vh - 70px);
      padding: 2rem 1.5rem 4rem 1.5rem;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .dashboard-container {
      max-width: 1440px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    /* 1. Header Principal */
    .dashboard-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      gap: 1rem;
    }

    .header-eyebrow {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: #4b5563;
      margin-bottom: 0.25rem;
      text-transform: uppercase;
    }

    .gold-dot {
      color: #d4af37;
      font-size: 1.1rem;
      line-height: 1;
    }

    .header-main-title {
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #000000;
      margin: 0;
      line-height: 1.2;
    }

    .header-subtitle {
      color: #6b7280;
      font-size: 0.88rem;
      margin-top: 0.25rem;
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .period-selector-wrapper {
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 0.35rem 0.65rem;
      border-radius: 2px;
      gap: 0.5rem;
    }

    .period-label {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #6b7280;
    }

    .period-select {
      background: transparent;
      border: none;
      font-size: 0.78rem;
      font-weight: 600;
      color: #111111;
      cursor: pointer;
      outline: none;
    }

    .btn-export-csv {
      background-color: #000000;
      color: #ffffff;
      border: 1px solid #000000;
      padding: 0.45rem 1rem;
      font-size: 0.78rem;
      font-weight: 600;
      border-radius: 2px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-export-csv:hover:not(:disabled) {
      background-color: #d4af37;
      border-color: #d4af37;
      color: #000000;
    }

    .btn-export-csv:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* 2. Barra de Voz IA */
    .voice-ai-bar-section {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .voice-search-bar {
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 2px;
      padding: 0.4rem 0.75rem;
      gap: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .voice-search-bar.listening-active {
      border-color: #d4af37;
      box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2);
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
      box-shadow: 0 2px 5px rgba(212, 175, 55, 0.35);
      padding: 0 !important;
    }

    .voice-mic-trigger:hover {
      background: #b89324 !important;
      color: #ffffff !important;
      transform: scale(1.06);
    }

    .icon-mic {
      width: 20px !important;
      height: 20px !important;
      min-width: 20px !important;
      min-height: 20px !important;
      fill: #ffffff !important;
      color: #ffffff !important;
      display: block !important;
      flex-shrink: 0 !important;
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
      font-size: 0.88rem;
      color: #111111;
      background: transparent;
    }

    .voice-search-input::placeholder {
      color: #9ca3af;
      font-size: 0.84rem;
    }

    .voice-submit-btn {
      background: #111111;
      color: #ffffff;
      border: none;
      padding: 0.45rem 1rem;
      font-size: 0.78rem;
      font-weight: 700;
      border-radius: 2px;
      cursor: pointer;
      transition: background 0.2s ease;
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

    .quick-prompts-subtle {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
      padding-left: 0.5rem;
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
      border-radius: 2px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .prompt-chip:hover {
      border-color: #d4af37;
      color: #000000;
      background: #fafafa;
    }

    /* Diagnóstico IA */
    .voice-result-card {
      background: #ffffff;
      border: 1px solid #d4af37;
      border-radius: 2px;
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
      background: #111111;
      color: #ffffff;
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      padding: 0.25rem 0.55rem;
      border-radius: 2px;
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
      border-radius: 2px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-tts-speak:hover {
      background: #d4af37;
      color: #000000;
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
      letter-spacing: 0.08em;
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
       TARJETAS BI & LAYOUT MODULAR
       ========================================================= */

    .bi-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 2px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .bi-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #f3f4f6;
      padding-bottom: 0.85rem;
    }

    .bi-title {
      font-size: 1.05rem;
      font-weight: 800;
      letter-spacing: -0.01em;
      color: #000000;
      margin: 0;
      text-transform: uppercase;
    }

    .bi-title-medium {
      font-size: 0.95rem;
      font-weight: 800;
      color: #111111;
      margin: 0;
    }

    .bi-subtitle {
      font-size: 0.78rem;
      color: #6b7280;
      margin: 0.2rem 0 0 0;
    }

    .subtle-badge {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      background: #f3f4f6;
      color: #4b5563;
      padding: 0.25rem 0.5rem;
      border-radius: 2px;
    }

    .link-action-header {
      font-size: 0.74rem;
      font-weight: 700;
      color: #111111;
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .link-action-header:hover {
      color: #d4af37;
    }

    .bi-grid-row {
      display: grid;
      gap: 1.5rem;
    }

    .two-columns-equal {
      grid-template-columns: repeat(2, 1fr);
    }

    /* =========================================================
       MÓDULO 1: RENDIMIENTO DE VENTAS (VISIÓN FINANCIERA)
       ========================================================= */

    .granularity-tabs {
      display: flex;
      background: #f3f4f6;
      padding: 3px;
      border-radius: 2px;
      gap: 2px;
    }

    .gran-tab {
      background: transparent;
      border: none;
      padding: 0.35rem 0.9rem;
      font-size: 0.74rem;
      font-weight: 600;
      color: #4b5563;
      cursor: pointer;
      border-radius: 2px;
      transition: all 0.15s ease;
    }

    .gran-tab.active {
      background: #ffffff;
      color: #000000;
      font-weight: 700;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    }

    .financial-main-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 2rem;
      align-items: center;
    }

    .financial-left-col {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      border-right: 1px solid #f3f4f6;
      padding-right: 1.5rem;
    }

    .ring-and-main-value {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .ring-gauge-wrapper {
      position: relative;
      width: 110px;
      height: 110px;
      flex-shrink: 0;
    }

    .concentric-ring-svg {
      width: 100%;
      height: 100%;
    }

    .ring-center-text {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    .ring-pct-number {
      font-size: 1.15rem;
      font-weight: 800;
      color: #111111;
      line-height: 1;
    }

    .ring-pct-label {
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      margin-top: 2px;
    }

    .main-revenue-block {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .revenue-caption {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6b7280;
    }

    .revenue-big-row {
      display: flex;
      align-items: baseline;
      gap: 0.2rem;
    }

    .revenue-currency {
      font-size: 1.15rem;
      font-weight: 700;
      color: #111111;
    }

    .revenue-amount {
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #000000;
    }

    .growth-pill-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: #ecfdf5;
      color: #059669;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 2px;
      margin-top: 0.25rem;
      width: fit-content;
    }

    .pill-arrow {
      font-size: 0.6rem;
    }

    .pill-vs {
      color: #065f46;
      font-weight: 500;
    }

    .mini-kpis-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.65rem;
    }

    .mini-kpi-box {
      background: #f9fafb;
      border: 1px solid #f3f4f6;
      padding: 0.65rem 0.75rem;
      border-radius: 2px;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .mini-kpi-label {
      font-size: 0.68rem;
      color: #6b7280;
      font-weight: 600;
    }

    .mini-kpi-val {
      font-size: 0.95rem;
      font-weight: 800;
      color: #111111;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .financial-right-col {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .comparative-legend-bar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 1.25rem;
    }

    .legend-series {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .legend-chip-color {
      width: 14px;
      height: 3px;
      border-radius: 1px;
    }

    .legend-chip-color.solid-black {
      background-color: #111111;
    }

    .legend-chip-color.dashed-gray {
      background: repeating-linear-gradient(to right, #9ca3af, #9ca3af 3px, transparent 3px, transparent 6px);
    }

    .legend-label {
      font-size: 0.72rem;
      font-weight: 600;
      color: #4b5563;
    }

    .trend-chart-container {
      position: relative;
      height: 200px;
      width: 100%;
    }

    .trend-svg {
      width: 100%;
      height: 175px;
      overflow: visible;
    }

    .interactive-node {
      cursor: pointer;
      transition: r 0.15s ease, stroke-width 0.15s ease;
    }

    .interactive-node:hover {
      r: 6.5;
      stroke-width: 3;
      stroke: #d4af37;
    }

    .trend-hover-tooltip {
      position: absolute;
      top: 15px;
      background: #111111;
      color: #ffffff;
      padding: 0.4rem 0.65rem;
      border-radius: 2px;
      font-size: 0.7rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      pointer-events: none;
      z-index: 10;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .tooltip-title {
      font-weight: 700;
      color: #d4af37;
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      padding-bottom: 2px;
      margin-bottom: 2px;
    }

    .tooltip-row {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .dot-cur { width: 6px; height: 6px; background: #ffffff; border-radius: 50%; }
    .dot-prev { width: 6px; height: 6px; background: #9ca3af; border-radius: 50%; }

    .trend-x-axis {
      display: flex;
      justify-content: space-between;
      padding: 0.4rem 1.25rem 0 1.25rem;
      font-size: 0.68rem;
      font-weight: 600;
      color: #6b7280;
    }

    .achievement-callout-banner {
      background: #fdf8e6;
      border: 1px solid #fef08a;
      border-left: 3px solid #d4af37;
      padding: 0.75rem 1rem;
      border-radius: 2px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.8rem;
      color: #854d0e;
    }

    .achievement-icon {
      font-size: 1.25rem;
      line-height: 1;
    }

    /* =========================================================
       MÓDULO 2: PRODUCTOS E INVENTARIO
       ========================================================= */

    .horizontal-bars-container {
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }

    .hbar-item {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .hbar-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .hbar-info {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .hbar-rank {
      font-size: 0.75rem;
      font-weight: 800;
      color: #9ca3af;
      width: 20px;
    }

    .hbar-thumb {
      width: 32px;
      height: 38px;
      object-fit: cover;
      border-radius: 1px;
      border: 1px solid #e5e7eb;
    }

    .hbar-names {
      display: flex;
      flex-direction: column;
    }

    .hbar-product-name {
      font-size: 0.82rem;
      font-weight: 700;
      color: #111111;
    }

    .hbar-category {
      font-size: 0.7rem;
      color: #6b7280;
    }

    .hbar-amount {
      font-size: 0.85rem;
      font-weight: 800;
      color: #111111;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .hbar-track {
      height: 7px;
      background: #f3f4f6;
      border-radius: 3.5px;
      overflow: hidden;
    }

    .hbar-fill {
      height: 100%;
      background: #111111;
      border-radius: 3.5px;
      transition: width 0.4s ease;
    }

    .hbar-item:first-child .hbar-fill {
      background: #d4af37;
    }

    /* Barras Apiladas */
    .stacked-legend-row {
      display: flex;
      gap: 1.25rem;
      font-size: 0.72rem;
      font-weight: 600;
      color: #4b5563;
    }

    .stacked-legend-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .color-dot {
      width: 8px;
      height: 8px;
      border-radius: 1px;
    }

    .bg-black { background: #111827; }
    .bg-gold { background: #d4af37; }
    .bg-red { background: #ef4444; }

    .stacked-bars-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .stacked-bar-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .stacked-bar-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.76rem;
      font-weight: 700;
      color: #1f2937;
    }

    .cat-total {
      font-weight: 600;
      color: #6b7280;
    }

    .stacked-bar-track {
      height: 10px;
      background: #f3f4f6;
      border-radius: 5px;
      overflow: hidden;
      display: flex;
    }

    .segment {
      height: 100%;
      transition: width 0.3s ease;
    }

    .seg-disponible { background: #111827; }
    .seg-reservado { background: #d4af37; }
    .seg-alerta { background: #ef4444; }

    .stacked-values-breakdown {
      display: flex;
      gap: 1rem;
      font-size: 0.68rem;
      color: #6b7280;
    }

    .text-critico {
      color: #dc2626;
    }

    /* =========================================================
       MÓDULO 3: COMPORTAMIENTO Y CONVERSIÓN
       ========================================================= */

    .funnel-container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .funnel-step-row {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .funnel-step-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.74rem;
    }

    .step-badge {
      font-size: 0.62rem;
      font-weight: 800;
      color: #9ca3af;
      text-transform: uppercase;
      margin-right: 0.4rem;
    }

    .step-title {
      font-weight: 700;
      color: #111111;
      flex: 1;
    }

    .step-count {
      color: #6b7280;
      font-weight: 600;
    }

    .funnel-bar-wrapper {
      height: 16px;
      background: #f3f4f6;
      border-radius: 2px;
      overflow: hidden;
    }

    .funnel-trapezoid-bar {
      height: 100%;
      background: #111827;
      border-radius: 2px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 0.45rem;
      transition: width 0.4s ease;
    }

    .funnel-trapezoid-bar.funnel-step-final {
      background: #d4af37;
    }

    .funnel-pct-text {
      font-size: 0.65rem;
      font-weight: 800;
      color: #ffffff;
      line-height: 1;
    }

    .funnel-trapezoid-bar.funnel-step-final .funnel-pct-text {
      color: #000000;
    }

    .funnel-drop-indicator {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.68rem;
      color: #9ca3af;
      padding-left: 0.5rem;
    }

    .drop-arrow {
      color: #d4af37;
      font-weight: 800;
    }

    .donut-distribution-layout {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .donut-canvas-box {
      position: relative;
      width: 130px;
      height: 130px;
      flex-shrink: 0;
    }

    .donut-slice-svg {
      width: 100%;
      height: 100%;
    }

    .donut-center-caption {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    .donut-center-bold {
      font-size: 1.25rem;
      font-weight: 800;
      color: #111111;
      line-height: 1;
    }

    .donut-center-sub {
      font-size: 0.62rem;
      font-weight: 600;
      color: #6b7280;
      margin-top: 2px;
    }

    .donut-details-list {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      flex: 1;
    }

    .donut-detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.76rem;
      border-bottom: 1px solid #f9fafb;
      padding-bottom: 0.3rem;
    }

    .donut-detail-header {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .detail-color-pill {
      width: 10px;
      height: 10px;
      border-radius: 2px;
    }

    .detail-name {
      font-weight: 600;
      color: #1f2937;
    }

    .donut-detail-metrics {
      display: flex;
      align-items: baseline;
      gap: 0.35rem;
    }

    .detail-orders {
      font-size: 0.68rem;
      color: #6b7280;
    }

    .client-loyalty-tip {
      background: #f9fafb;
      border-left: 2px solid #111111;
      padding: 0.6rem 0.85rem;
      font-size: 0.75rem;
      color: #4b5563;
      line-height: 1.4;
    }

    /* =========================================================
       MÓDULO 4: OPERACIÓN Y LOGÍSTICA
       ========================================================= */

    .logistics-sla-alert {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      background: #ecfdf5;
      color: #065f46;
      padding: 0.6rem 0.85rem;
      border-radius: 2px;
      font-size: 0.75rem;
    }

    .sla-dot-green {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #059669;
    }

    .geographic-map-canvas {
      position: relative;
      height: 160px;
      background: #111827;
      border-radius: 2px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .map-radar-grid {
      position: absolute;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .radar-circle {
      position: absolute;
      border: 1px solid rgba(212, 175, 55, 0.15);
      border-radius: 50%;
    }

    .radar-c1 { width: 70px; height: 70px; }
    .radar-c2 { width: 140px; height: 140px; }
    .radar-c3 { width: 220px; height: 220px; border-style: dashed; }

    .geo-node-pin {
      position: absolute;
      cursor: pointer;
    }

    .pin-palermo { top: 38%; left: 34%; }
    .pin-recoleta { top: 48%; left: 58%; }
    .pin-sanisidro { top: 22%; left: 24%; }

    .pin-core {
      width: 10px;
      height: 10px;
      background: #d4af37;
      border-radius: 50%;
      border: 2px solid #ffffff;
      position: relative;
      z-index: 2;
    }

    .pin-pulse {
      position: absolute;
      top: -5px;
      left: -5px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(212, 175, 55, 0.35);
      animation: pinRadarPulse 2s infinite ease-out;
    }

    @keyframes pinRadarPulse {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(2.2); opacity: 0; }
    }

    .pin-popup {
      position: absolute;
      top: -38px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.85);
      color: #ffffff;
      padding: 0.25rem 0.5rem;
      border-radius: 2px;
      white-space: nowrap;
      display: flex;
      flex-direction: column;
      gap: 1px;
      pointer-events: none;
      z-index: 5;
    }

    .popup-title {
      font-size: 0.65rem;
      font-weight: 700;
      color: #d4af37;
    }

    .popup-meta {
      font-size: 0.58rem;
      color: #d1d5db;
    }

    .hubs-summary-table {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .hub-summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.4rem 0.5rem;
      background: #f9fafb;
      border-radius: 2px;
    }

    .hub-id-col {
      display: flex;
      flex-direction: column;
    }

    .hub-name {
      font-size: 0.76rem;
      font-weight: 700;
      color: #111111;
    }

    .hub-city {
      font-size: 0.65rem;
      color: #6b7280;
    }

    .hub-stats-col {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .hub-time {
      font-size: 0.7rem;
      color: #4b5563;
    }

    .hub-revenue {
      font-size: 0.82rem;
      font-weight: 800;
      color: #111111;
    }

    /* Responsividad */
    @media (max-width: 1024px) {
      .two-columns-equal {
        grid-template-columns: 1fr;
      }
      .financial-main-layout {
        grid-template-columns: 1fr;
      }
      .financial-left-col {
        border-right: none;
        border-bottom: 1px solid #f3f4f6;
        padding-right: 0;
        padding-bottom: 1.5rem;
      }
      .voice-diagnosis-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ReportesDashboardPageComponent implements OnInit, OnDestroy {
  private reportesService = inject(ReportesService);

  // Señales de Estado
  loading = signal<boolean>(true);
  exporting = signal<boolean>(false);
  selectedRango = signal<string>('30D');
  selectedGranularidad = signal<'DIA' | 'SEMANA' | 'MES'>('MES');
  dashboardData = signal<DashboardReporteResponse | null>(null);

  // Señales de Asistente de Voz IA
  isListening = signal<boolean>(false);
  isSpeaking = signal<boolean>(false);
  isProcessingVoice = signal<boolean>(false);
  currentTranscript = signal<string>('');
  voiceAnalysis = signal<AnalisisVozResponse | null>(null);
  textQueryInput = '';

  // Interacción de Hover en la curva comparativa
  hoveredTrendPoint: any = null;

  quickPills = [
    { label: '🏆 ¿Cuál es el producto más vendido?', query: 'Cual es el producto mas vendido?' },
    { label: '📈 ¿Cómo están los ingresos este mes?', query: 'Como estan los ingresos este mes?' },
    { label: '👗 ¿Cuál es la ocupación de probadores?', query: 'Cual es la ocupacion de probadores?' },
    { label: '⚠️ ¿Qué prendas tienen stock crítico?', query: 'Cuales prendas tienen stock critico o bajo?' }
  ];

  // =========================================================================
  // PROYECCIONES COMPUTADAS (SIGNALS)
  // =========================================================================

  financialData = computed<FinancialIndicator>(() => {
    const d = this.dashboardData();
    if (d && d.financial) {
      return d.financial;
    }
    return {
      facturacion_actual: 148245.0,
      facturacion_anterior: 130480.0,
      variacion_pct: 12.4,
      objetivo_mes: 172000.0,
      cumplimiento_pct: 86.2,
      ticket_medio: 320.0,
      pedidos_totales: 342,
      unidades_vendidas: 712,
      descuentos_totales: 4850.0,
      mensaje_insight: 'Estás al 86% del objetivo mensual con un incremento del +12.4% respecto al período anterior.'
    };
  });

  outerRingDashoffset = computed(() => {
    const pct = Math.min(100, Math.max(0, this.financialData().cumplimiento_pct));
    const circumference = 351.85; // 2 * PI * 56
    return circumference * (1 - pct / 100);
  });

  innerRingDashoffset = computed(() => {
    const pct = Math.min(100, Math.max(0, this.financialData().cumplimiento_pct * 0.88));
    const circumference = 263.89; // 2 * PI * 42
    return circumference * (1 - pct / 100);
  });

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

  maxProductRevenue = computed(() => {
    const list = this.topProductsList();
    return Math.max(...list.map(p => p.ingresos_totales), 1);
  });

  inventoryStackedList = computed<InventoryStackedItem[]>(() => {
    const d = this.dashboardData();
    if (d && d.inventory_stacked && d.inventory_stacked.length > 0) {
      return d.inventory_stacked;
    }
    return [
      { categoria: 'Alta Costura', disponible: 185, reservado_probadores: 24, alerta_critica: 5 },
      { categoria: 'Sastrería', disponible: 140, reservado_probadores: 18, alerta_critica: 3 },
      { categoria: 'Gala & Noche', disponible: 95, reservado_probadores: 32, alerta_critica: 8 },
      { categoria: 'Pret-à-Porter', disponible: 230, reservado_probadores: 15, alerta_critica: 2 },
      { categoria: 'Accesorios', disponible: 310, reservado_probadores: 8, alerta_critica: 1 }
    ];
  });

  funnelStepsList = computed<FunnelStepItem[]>(() => {
    const d = this.dashboardData();
    if (d && d.funnel_steps && d.funnel_steps.length > 0) {
      return d.funnel_steps;
    }
    return [
      { etapa: 'Visitas Catálogo', cantidad: 4500, porcentaje: 100.0, conversion_siguiente: 48.0 },
      { etapa: 'Exploración Prendas', cantidad: 2160, porcentaje: 48.0, conversion_siguiente: 22.0 },
      { etapa: 'Probador Virtual / Carrito', cantidad: 475, porcentaje: 10.5, conversion_siguiente: 42.0 },
      { etapa: 'Ventas Concretadas', cantidad: 200, porcentaje: 4.4, conversion_siguiente: 100.0 }
    ];
  });

  channelList = computed<DistributionSlice[]>(() => {
    const d = this.dashboardData();
    if (d && d.channel_distribution && d.channel_distribution.length > 0) {
      return d.channel_distribution;
    }
    return [
      { nombre: 'Boutiques Físicas', porcentaje: 54.5, cantidad: 186, color: '#111827' },
      { nombre: 'E-Commerce Noir', porcentaje: 32.2, cantidad: 110, color: '#d4af37' },
      { nombre: 'Citas Privadas VIP', porcentaje: 13.3, cantidad: 46, color: '#9ca3af' }
    ];
  });

  orderStatusList = computed<DistributionSlice[]>(() => {
    const d = this.dashboardData();
    if (d && d.order_status_donut && d.order_status_donut.length > 0) {
      return d.order_status_donut;
    }
    return [
      { nombre: 'Entregados', porcentaje: 65.0, cantidad: 222, color: '#059669' },
      { nombre: 'En Tránsito', porcentaje: 20.0, cantidad: 68, color: '#2563eb' },
      { nombre: 'En Preparación', porcentaje: 12.0, cantidad: 41, color: '#f59e0b' },
      { nombre: 'Devoluciones / Cambios', porcentaje: 3.0, cantidad: 11, color: '#ef4444' }
    ];
  });

  geographicHubsList = computed<GeographicHub[]>(() => {
    const d = this.dashboardData();
    if (d && d.geographic_hubs && d.geographic_hubs.length > 0) {
      return d.geographic_hubs;
    }
    return [
      { sucursal: 'Boutique Palermo Soho', ciudad: 'Buenos Aires (Palermo)', pedidos: 148, monto: 62260.0, tiempo_entrega_promedio: '35 min (Same-Day)', lat_relativa: -34.588, lng_relativa: -58.430 },
      { sucursal: 'Flagship Recoleta Luxury', ciudad: 'Buenos Aires (Recoleta)', pedidos: 112, monto: 51885.0, tiempo_entrega_promedio: '45 min (Concierge)', lat_relativa: -34.587, lng_relativa: -58.393 },
      { sucursal: 'Hub Atelier San Isidro', ciudad: 'San Isidro (Zona Norte)', pedidos: 82, monto: 34100.0, tiempo_entrega_promedio: '90 min (Express)', lat_relativa: -34.471, lng_relativa: -58.528 }
    ];
  });

  // Coordenadas calculadas para la curva comparativa SVG
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
          { periodo: 'Sep', monto_actual: 15400, monto_anterior: 12900 },
          { periodo: 'Oct', monto_actual: 16800, monto_anterior: 14200 },
          { periodo: 'Nov', monto_actual: 19200, monto_anterior: 15900 },
          { periodo: 'Dic', monto_actual: 21500, monto_anterior: 17200 }
        ];

    const maxVal = Math.max(...points.map(p => Math.max(p.monto_actual, p.monto_anterior)), 1);
    const stepX = 580 / Math.max(points.length - 1, 1);

    return points.map((p, i) => {
      const x = 30 + i * stepX;
      const yAct = 170 - (p.monto_actual / maxVal) * 135;
      const yAnt = 170 - (p.monto_anterior / maxVal) * 135;
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
    return `${line} L${last.x},170 L${first.x},170 Z`;
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

  // =========================================================================
  // CICLO DE VIDA Y ACCIONES
  // =========================================================================

  ngOnInit(): void {
    this.cargarDashboard(this.selectedRango(), this.selectedGranularidad());
  }

  ngOnDestroy(): void {
    this.reportesService.stopListening();
    this.reportesService.stopSpeaking();
  }

  cargarDashboard(rango: string, granularidad: 'DIA' | 'SEMANA' | 'MES'): void {
    this.loading.set(true);
    this.reportesService.getDashboard(rango, granularidad).subscribe({
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

  cambiarGranularidad(gran: 'DIA' | 'SEMANA' | 'MES'): void {
    this.selectedGranularidad.set(gran);
    this.cargarDashboard(this.selectedRango(), gran);
  }

  getStackedPct(item: InventoryStackedItem, type: 'disponible' | 'reservado' | 'alerta'): number {
    const total = item.disponible + item.reservado_probadores + item.alerta_critica;
    if (total === 0) return 0;
    if (type === 'disponible') return Math.round((item.disponible / total) * 100);
    if (type === 'reservado') return Math.round((item.reservado_probadores / total) * 100);
    return Math.round((item.alerta_critica / total) * 100);
  }

  exportarReporte(): void {
    this.exporting.set(true);
    this.reportesService.exportarCSV().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Informe_BI_FashionStore_${this.selectedGranularidad()}_${Date.now()}.csv`;
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
