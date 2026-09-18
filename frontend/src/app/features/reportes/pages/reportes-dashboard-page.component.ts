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
    <div class="dashboard-page-wrapper">
      <div class="dashboard-container">

        <!-- ========================================== -->
        <!-- 1. CABECERA EJECUTIVA LIMPIA (SIN 'SI2')   -->
        <!-- ========================================== -->
        <header class="dashboard-header">
          <div class="header-titles">
            <div class="header-eyebrow">
              <span class="gold-dot">&bull;</span>
              <span>INTELIGENCIA DE NEGOCIOS &bull; ATELIER NOIR</span>
            </div>
            <h1 class="header-main-title">Dashboard de Rendimiento Ejecutivo</h1>
            <p class="header-subtitle">
              Métricas consolidadas de facturación, probadores VIP, inventario crítico y canales de venta.
            </p>
          </div>

          <div class="header-controls">
            <!-- Selector de Rango Temporal -->
            <div class="period-selector-wrapper">
              <label class="period-label">PERÍODO:</label>
              <select class="period-select" [ngModel]="selectedRango()" (ngModelChange)="cambiarRango($event)">
                <option value="24H">Últimas 24 Horas</option>
                <option value="7D">Últimos 7 Días</option>
                <option value="30D">Últimos 30 Días</option>
                <option value="MES">Mes Actual en Curso</option>
              </select>
            </div>

            <!-- Botón Exportar CSV -->
            <button
              type="button"
              class="btn-export-csv"
              (click)="exportarReporte()"
              [disabled]="exporting()">
              <span *ngIf="!exporting()">↓ Exportar Reporte</span>
              <span *ngIf="exporting()">Generando CSV...</span>
            </button>
          </div>
        </header>

        <!-- ============================================================== -->
        <!-- 2. BARRA UNIFICADA DE ASISTENTE DE VOZ IA (ZERO BUTTON CLUTTER) -->
        <!-- ============================================================== -->
        <section class="voice-ai-unified-section">
          <div class="voice-search-bar" [class.listening-active]="isListening()">
            <!-- Botón de Micrófono Integrado -->
            <button
              type="button"
              class="voice-mic-trigger"
              (click)="toggleVoiceRecording()"
              [title]="isListening() ? 'Detener escucha' : 'Hablar al Asistente IA'">
              <svg *ngIf="!isListening()" class="icon-mic" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>

              <!-- Ondas de Audio Animadas al Escuchar -->
              <div *ngIf="isListening()" class="audio-wave-bars">
                <span class="bar bar-1"></span>
                <span class="bar bar-2"></span>
                <span class="bar bar-3"></span>
                <span class="bar bar-4"></span>
              </div>
            </button>

            <!-- Campo de Texto / Transcripción -->
            <input
              type="text"
              class="voice-search-input"
              [(ngModel)]="textQueryInput"
              (keyup.enter)="ejecutarConsultaTexto()"
              [placeholder]="isListening() ? (currentTranscript() || 'Escuchando tu voz...') : 'Preguntá a la IA sobre ventas, stock o probadores (escribe o pulsa el micrófono)...'"
            />

            <!-- Botón de Envío -->
            <button
              type="button"
              class="voice-submit-btn"
              (click)="ejecutarConsultaTexto()"
              [disabled]="!textQueryInput.trim() || isProcessingVoice()">
              {{ isProcessingVoice() ? 'Analizando...' : 'Consultar' }}
            </button>
          </div>

          <!-- Sugerencias Rápidas Desplegables Sutiles -->
          <div class="quick-prompts-subtle">
            <span class="prompt-hint">Consultas frecuentes:</span>
            <button
              *ngFor="let p of quickPills"
              type="button"
              class="prompt-chip"
              (click)="consultarPorPill(p.query)">
              {{ p.label }}
            </button>
          </div>

          <!-- Tarjeta Desplegable de Diagnóstico Gerencial IA (Cuando hay respuesta) -->
          <div *ngIf="voiceAnalysis() && !isProcessingVoice()" class="voice-result-card">
            <div class="voice-result-header">
              <div class="intent-zone">
                <span class="intent-badge">{{ voiceAnalysis()?.intencion_detectada }}</span>
                <span class="query-echo">"{{ voiceAnalysis()?.pregunta }}"</span>
              </div>

              <div class="voice-result-actions">
                <!-- Botón Text-to-Speech -->
                <button
                  type="button"
                  class="btn-tts-speak"
                  [class.speaking]="isSpeaking()"
                  (click)="toggleTTSPlayback()">
                  <span>{{ isSpeaking() ? '⏹ Detener Voz' : '🔊 Escuchar Voz IA' }}</span>
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
                <h4 class="diag-title">RECOMENDACIONES DE GERENCIA</h4>
                <ul class="diag-list">
                  <li *ngFor="let rec of voiceAnalysis()?.recomendaciones_estrategicas">
                    &bull; {{ rec }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <!-- ========================================== -->
        <!-- 3. FILA DE 5 TARJETAS KPI PRINCIPALES     -->
        <!-- ========================================== -->
        <section class="kpi-five-grid">
          <!-- KPI 1: Ventas Totales con Sparkline -->
          <article class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">VENTAS TOTALES</span>
              <span class="kpi-badge positive">+14%</span>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-number">&dollar;{{ (dashboardData()?.kpis?.total_revenue || 148245) | number:'1.2-2' }}</span>
            </div>
            <div class="kpi-footer-row">
              <!-- Mini SVG Sparkline -->
              <svg class="mini-sparkline" viewBox="0 0 100 24" preserveAspectRatio="none">
                <path d="M0,18 Q20,15 40,10 T70,14 T100,4" fill="none" stroke="#d4af37" stroke-width="2" />
              </svg>
              <span class="kpi-reference">vs mes anterior</span>
            </div>
          </article>

          <!-- KPI 2: Pedidos Totales -->
          <article class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">PEDIDOS TOTALES</span>
              <span class="kpi-badge positive">+8%</span>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-number">{{ dashboardData()?.kpis?.active_orders || 412 }}</span>
            </div>
            <div class="kpi-footer-row">
              <span class="status-dot"></span>
              <span class="kpi-reference">{{ dashboardData()?.kpis?.in_progress_fulfillment || 6 }} en empaque</span>
            </div>
          </article>

          <!-- KPI 3: Ticket Promedio -->
          <article class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">VALOR PROMEDIO</span>
              <span class="kpi-badge positive">+5%</span>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-number">&dollar;{{ (dashboardData()?.kpis?.avg_order_value || 320) | number:'1.2-2' }}</span>
            </div>
            <div class="kpi-footer-row">
              <span class="kpi-reference">Por compra registrada</span>
            </div>
          </article>

          <!-- KPI 4: Tasa de Conversión -->
          <article class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">CONVERSIÓN GLOBAL</span>
              <span class="kpi-badge positive">+0.6 pp</span>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-number">{{ dashboardData()?.kpis?.conversion_rate || 9.9 }}%</span>
            </div>
            <div class="kpi-footer-row">
              <span class="kpi-reference">Probador a venta POS</span>
            </div>
          </article>

          <!-- KPI 5: Ocupación Probadores -->
          <article class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">PROBADORES VIP</span>
              <span class="kpi-badge positive">+12 pp</span>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-number">{{ dashboardData()?.kpis?.tasa_ocupacion_probadores || 78.5 }}%</span>
            </div>
            <div class="kpi-footer-row">
              <span class="kpi-reference">{{ dashboardData()?.kpis?.total_probadores || 5 }} cabinas activas</span>
            </div>
          </article>
        </section>

        <!-- ======================================================== -->
        <!-- 4. FILA MEDIA: GRÁFICA DE INGRESOS + VENTAS POR CANAL   -->
        <!-- ======================================================== -->
        <section class="charts-middle-row">
          <!-- Gráfico de Tendencia Dual: Mes Actual vs Mes Anterior -->
          <article class="chart-box main-trend-box">
            <div class="chart-header">
              <div>
                <h3 class="chart-title">Tendencia de Ingresos: Mes Actual vs Mes Anterior</h3>
                <p class="chart-subtitle">Evolución semanal acumulada y volumen de facturación</p>
              </div>

              <!-- Leyenda Gráfica -->
              <div class="chart-legend">
                <span class="legend-item"><span class="leg-solid"></span> Mes Actual</span>
                <span class="legend-item"><span class="leg-dashed"></span> Mes Anterior</span>
              </div>
            </div>

            <!-- SVG Line Chart Dual -->
            <div class="svg-chart-container">
              <svg class="svg-trend-chart" viewBox="0 0 800 200" preserveAspectRatio="none">
                <!-- Grid Lines -->
                <line x1="0" y1="40" x2="800" y2="40" stroke="#f0f0f0" stroke-width="1" />
                <line x1="0" y1="90" x2="800" y2="90" stroke="#f0f0f0" stroke-width="1" />
                <line x1="0" y1="140" x2="800" y2="140" stroke="#f0f0f0" stroke-width="1" />
                <line x1="0" y1="190" x2="800" y2="190" stroke="#e5e7eb" stroke-width="1" />

                <!-- Gradiente de área mes actual -->
                <defs>
                  <linearGradient id="areaGradActual" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#111111" stop-opacity="0.12" />
                    <stop offset="100%" stop-color="#111111" stop-opacity="0.00" />
                  </linearGradient>
                </defs>

                <!-- Relleno y Curva Mes Anterior (Dashed) -->
                <path d="M50,170 Q160,140 280,120 T520,110 T750,70" fill="none" stroke="#9ca3af" stroke-width="2" stroke-dasharray="5,5" />

                <!-- Área y Curva Mes Actual (Solid) -->
                <path [attr.d]="svgAreaPath()" fill="url(#areaGradActual)" />
                <path [attr.d]="svgLinePath()" fill="none" stroke="#111111" stroke-width="2.5" />

                <!-- Nodos Interactivos -->
                <g *ngFor="let pt of chartCoordinates()">
                  <circle
                    [attr.cx]="pt.x"
                    [attr.cy]="pt.y"
                    r="4.5"
                    fill="#ffffff"
                    stroke="#111111"
                    stroke-width="2.5"
                    (mouseenter)="activePoint = pt"
                    class="chart-node"
                  />
                </g>
              </svg>

              <!-- Tooltip Flotante de Punto Activo -->
              <div *ngIf="activePoint" class="chart-active-tooltip">
                <strong>{{ activePoint.label }}: &dollar;{{ activePoint.monto | number:'1.2-2' }} USD</strong>
                <span>{{ activePoint.transacciones }} pedidos registrados</span>
              </div>
            </div>

            <!-- Eje X -->
            <div class="chart-x-axis">
              <span *ngFor="let pt of chartCoordinates()">{{ pt.label }}</span>
            </div>
          </article>

          <!-- Gráfico de Barras: Ventas por Canal -->
          <article class="chart-box channel-sales-box">
            <div class="chart-header">
              <div>
                <h3 class="chart-title">Ventas por Canal de Venta</h3>
                <p class="chart-subtitle">Desglose físico vs digital vs probador</p>
              </div>
            </div>

            <div class="channel-bars-wrapper">
              <div class="channel-bar-row">
                <div class="bar-info">
                  <span class="bar-channel-name">Boutique POS (Tienda Física)</span>
                  <span class="bar-channel-val">&dollar;72,400.00 &bull; 49%</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill fill-pos" style="width: 49%;"></div>
                </div>
              </div>

              <div class="channel-bar-row">
                <div class="bar-info">
                  <span class="bar-channel-name">Online Web (E-Commerce)</span>
                  <span class="bar-channel-val">&dollar;48,600.00 &bull; 33%</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill fill-web" style="width: 33%;"></div>
                </div>
              </div>

              <div class="channel-bar-row">
                <div class="bar-info">
                  <span class="bar-channel-name">Probadores VIP (Conversión)</span>
                  <span class="bar-channel-val">&dollar;27,245.00 &bull; 18%</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill fill-fitting" style="width: 18%;"></div>
                </div>
              </div>
            </div>

            <div class="channel-summary-note">
              La sinergia omnicanal impulsa un <strong>68% de conversión</strong> en clientes que asisten a citas presenciales de probador.
            </div>
          </article>
        </section>

        <!-- ======================================================== -->
        <!-- 5. FILA INFERIOR (3 COLUMNAS): TOP PRENDAS, STOCK, DONUT-->
        <!-- ======================================================== -->
        <section class="bottom-three-columns">
          <!-- Columna 1: Top Productos Más Vendidos -->
          <article class="panel-box col-top-products">
            <div class="panel-header">
              <h3 class="panel-title">Productos Más Vendidos</h3>
              <span class="panel-tag">RANKING ATELIER</span>
            </div>

            <table class="luxury-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Prenda</th>
                  <th>SKU</th>
                  <th class="text-right">Ventas</th>
                  <th class="text-center">Trend</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of dashboardData()?.top_products; let i = index">
                  <td class="col-rank">#{{ i + 1 }}</td>
                  <td class="col-prenda-cell">
                    <img
                      [src]="p.imagen_url || 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=120&q=80'"
                      class="prenda-mini-thumb"
                      [alt]="p.nombre"
                    />
                    <div class="prenda-meta">
                      <span class="p-name">{{ p.nombre }}</span>
                      <span class="p-sub">{{ p.unidades_vendidas }} unidades vendidas</span>
                    </div>
                  </td>
                  <td class="col-sku font-mono">SKU-{{ p.prenda_id }}02</td>
                  <td class="col-revenue text-right font-mono">&dollar;{{ p.ingresos_totales | number:'1.0-0' }}</td>
                  <td class="col-trend text-center">
                    <svg class="mini-trend-icon" viewBox="0 0 32 12">
                      <path d="M0,10 Q10,2 20,6 T32,1" fill="none" stroke="#d4af37" stroke-width="1.8" />
                    </svg>
                  </td>
                </tr>
              </tbody>
            </table>
          </article>

          <!-- Columna 2: Alertas Críticas de Inventario -->
          <article class="panel-box col-inventory-alerts">
            <div class="panel-header">
              <h3 class="panel-title">Alertas Críticas de Inventario</h3>
              <span class="panel-tag tag-warning">{{ dashboardData()?.inventory_alerts?.length || 3 }} RIESGOS</span>
            </div>

            <div class="inventory-alerts-list">
              <div *ngFor="let al of dashboardData()?.inventory_alerts" class="alert-item-card">
                <img
                  [src]="al.imagen_url || 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=120&q=80'"
                  class="alert-thumb"
                  [alt]="al.nombre"
                />
                <div class="alert-info">
                  <span class="alert-item-name">{{ al.nombre }}</span>
                  <span class="alert-item-sub">{{ al.sucursal }} &bull; <strong>{{ al.stock_actual }} u.</strong> restantes</span>
                </div>
                <span class="alert-level-badge" [class.badge-critico]="al.nivel_alerta === 'CRITICO'">
                  {{ al.nivel_alerta }}
                </span>
              </div>
            </div>

            <a routerLink="/inventario" class="btn-manage-inventory-link">
              Gestionar Transferencias de Inventario &rarr;
            </a>
          </article>

          <!-- Columna 3: Estado de Pedidos & Gauge Probador -->
          <article class="panel-box col-status-gauges">
            <div class="panel-header">
              <h3 class="panel-title">Estado de Pedidos</h3>
              <span class="panel-tag">DISTRIBUCIÓN</span>
            </div>

            <!-- Mini Donut SVG -->
            <div class="donut-chart-box">
              <svg class="donut-svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f3f4f6" stroke-width="12" />
                <circle
                  cx="50" cy="50" r="38"
                  fill="transparent"
                  stroke="#111111"
                  stroke-width="12"
                  stroke-dasharray="167 238"
                  stroke-dashoffset="0"
                />
                <circle
                  cx="50" cy="50" r="38"
                  fill="transparent"
                  stroke="#d4af37"
                  stroke-width="12"
                  stroke-dasharray="45 238"
                  stroke-dashoffset="-167"
                />
                <circle
                  cx="50" cy="50" r="38"
                  fill="transparent"
                  stroke="#9ca3af"
                  stroke-width="12"
                  stroke-dasharray="26 238"
                  stroke-dashoffset="-212"
                />
              </svg>

              <div class="donut-legend">
                <div class="leg-row"><span class="sq-dot black"></span> 70% Entregado</div>
                <div class="leg-row"><span class="sq-dot gold"></span> 19% En Tránsito</div>
                <div class="leg-row"><span class="sq-dot gray"></span> 11% En Empaque</div>
              </div>
            </div>

            <div class="divider-line"></div>

            <!-- Semi-circle Gauge: Conversión de Probadores -->
            <div class="gauge-box">
              <div class="gauge-header-row">
                <span class="gauge-title">CONVERSIÓN PROBADORES</span>
                <span class="gauge-val font-mono">68%</span>
              </div>
              <div class="gauge-track-bar">
                <div class="gauge-fill-bar" style="width: 68%;"></div>
              </div>
              <div class="gauge-meta-row">
                <span>Objetivo mensual: 75%</span>
                <span class="positive-text">Óptimo (+4%)</span>
              </div>
            </div>
          </article>
        </section>

      </div>
    </div>
  `,
  styles: [`
    /* =========================================================
       FASHIONSTORE HAUTE COUTURE EXECUTIVE DASHBOARD STYLES
       ========================================================= */

    .dashboard-page-wrapper {
      background-color: #ffffff;
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
      gap: 1.75rem;
    }

    /* 1. Cabecera */
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
      font-size: 1.85rem;
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
      background: #f9fafb;
      border: 1px solid #e5e7eb;
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
      padding: 0.55rem 1.1rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
      border-radius: 2px;
      transition: all 0.2s ease;
    }

    .btn-export-csv:hover:not(:disabled) {
      background-color: #d4af37;
      color: #000000;
      border-color: #d4af37;
    }

    .btn-export-csv:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* 2. Barra Unificada de Voz IA */
    .voice-ai-unified-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .voice-search-bar {
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 40px;
      padding: 0.35rem 0.5rem 0.35rem 0.65rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      transition: all 0.2s ease;
    }

    .voice-search-bar:focus-within,
    .voice-search-bar.listening-active {
      border-color: #d4af37;
      box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.18);
    }

    .voice-mic-trigger {
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #111111;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .voice-mic-trigger:hover {
      background: #d4af37;
      color: #000000;
      border-color: #d4af37;
    }

    .icon-mic {
      width: 18px;
      height: 18px;
    }

    .audio-wave-bars {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .audio-wave-bars .bar {
      width: 2.5px;
      height: 12px;
      background: #dc2626;
      border-radius: 2px;
      animation: wavePulse 0.8s infinite ease-in-out alternate;
    }

    .audio-wave-bars .bar-2 { animation-delay: 0.2s; height: 16px; }
    .audio-wave-bars .bar-3 { animation-delay: 0.4s; height: 10px; }
    .audio-wave-bars .bar-4 { animation-delay: 0.15s; height: 14px; }

    @keyframes wavePulse {
      0% { transform: scaleY(0.4); }
      100% { transform: scaleY(1.2); }
    }

    .voice-search-input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 0.88rem;
      padding: 0 1rem;
      color: #111111;
      background: transparent;
    }

    .voice-submit-btn {
      background: #111111;
      color: #ffffff;
      border: none;
      padding: 0.5rem 1.1rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .voice-submit-btn:hover:not(:disabled) {
      background: #d4af37;
      color: #000000;
    }

    .voice-submit-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .quick-prompts-subtle {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.4rem;
      padding-left: 0.75rem;
    }

    .prompt-hint {
      font-size: 0.72rem;
      color: #6b7280;
      font-weight: 600;
      margin-right: 0.25rem;
    }

    .prompt-chip {
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      color: #374151;
      font-size: 0.72rem;
      padding: 0.25rem 0.65rem;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .prompt-chip:hover {
      background: #111111;
      color: #ffffff;
      border-color: #111111;
    }

    /* Tarjeta de Diagnóstico IA */
    .voice-result-card {
      background: #ffffff;
      border: 1px solid #d4af37;
      border-radius: 4px;
      padding: 1.25rem;
      box-shadow: 0 4px 14px rgba(212, 175, 55, 0.12);
      display: flex;
      flex-direction: column;
      gap: 1rem;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .voice-result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #f3f4f6;
      padding-bottom: 0.75rem;
    }

    .intent-zone {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .intent-badge {
      background: #d4af37;
      color: #000000;
      font-size: 0.65rem;
      font-weight: 800;
      padding: 0.2rem 0.5rem;
      border-radius: 2px;
      letter-spacing: 0.08em;
    }

    .query-echo {
      font-size: 0.85rem;
      font-style: italic;
      color: #111111;
    }

    .voice-result-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-tts-speak {
      background: #f9fafb;
      border: 1px solid #d1d5db;
      color: #111111;
      padding: 0.35rem 0.75rem;
      font-size: 0.72rem;
      font-weight: 700;
      border-radius: 2px;
      cursor: pointer;
    }

    .btn-tts-speak.speaking {
      background: #111111;
      color: #ffffff;
      border-color: #111111;
    }

    .btn-close-analysis {
      background: transparent;
      border: none;
      font-size: 1.4rem;
      color: #9ca3af;
      cursor: pointer;
      line-height: 1;
    }

    .voice-diagnosis-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
    }

    .diag-title {
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      color: #d4af37;
      margin: 0 0 0.35rem 0;
    }

    .diag-body {
      font-size: 0.8rem;
      line-height: 1.5;
      color: #374151;
      margin: 0;
    }

    .diag-list {
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 0.78rem;
      line-height: 1.5;
      color: #374151;
    }

    /* 3. Cuadrícula de 5 KPIs */
    .kpi-five-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 1rem;
    }

    .kpi-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 2px;
      padding: 1.1rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .kpi-card:hover {
      border-color: #111111;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    }

    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .kpi-title {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #6b7280;
    }

    .kpi-badge {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.15rem 0.4rem;
      border-radius: 2px;
    }

    .kpi-badge.positive {
      background: #ecfdf5;
      color: #059669;
    }

    .kpi-value-row {
      margin-bottom: 0.4rem;
    }

    .kpi-number {
      font-size: 1.45rem;
      font-weight: 800;
      color: #000000;
      letter-spacing: -0.02em;
    }

    .kpi-footer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.7rem;
      color: #9ca3af;
    }

    .mini-sparkline {
      width: 50px;
      height: 16px;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      background-color: #d4af37;
      border-radius: 50%;
      display: inline-block;
      margin-right: 0.25rem;
    }

    /* 4. Fila Media: Gráficos */
    .charts-middle-row {
      display: grid;
      grid-template-columns: 7fr 5fr;
      gap: 1.25rem;
    }

    .chart-box {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 2px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .chart-title {
      font-size: 0.95rem;
      font-weight: 800;
      color: #111111;
      margin: 0;
    }

    .chart-subtitle {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.2rem;
    }

    .chart-legend {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.72rem;
      color: #4b5563;
      font-weight: 600;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }

    .leg-solid {
      width: 14px;
      height: 3px;
      background: #111111;
      display: inline-block;
    }

    .leg-dashed {
      width: 14px;
      height: 0;
      border-top: 2px dashed #9ca3af;
      display: inline-block;
    }

    .svg-chart-container {
      position: relative;
      width: 100%;
      height: 180px;
    }

    .svg-trend-chart {
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .chart-node {
      cursor: pointer;
      transition: r 0.15s ease;
    }

    .chart-node:hover {
      r: 6;
      stroke: #d4af37;
    }

    .chart-active-tooltip {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: #111111;
      color: #ffffff;
      padding: 0.35rem 0.75rem;
      border-radius: 2px;
      font-size: 0.72rem;
      display: flex;
      gap: 0.5rem;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
      pointer-events: none;
    }

    .chart-x-axis {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #f3f4f6;
      padding-top: 0.5rem;
      margin-top: 0.5rem;
      font-size: 0.7rem;
      color: #9ca3af;
      font-weight: 600;
    }

    /* Canales de Venta */
    .channel-bars-wrapper {
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
      margin-top: 0.5rem;
    }

    .channel-bar-row {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .bar-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
    }

    .bar-channel-name {
      font-weight: 700;
      color: #111111;
    }

    .bar-channel-val {
      color: #6b7280;
      font-family: monospace;
      font-weight: 600;
    }

    .bar-track {
      height: 10px;
      background: #f3f4f6;
      border-radius: 2px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.4s ease;
    }

    .fill-pos { background-color: #111111; }
    .fill-web { background-color: #d4af37; }
    .fill-fitting { background-color: #6b7280; }

    .channel-summary-note {
      margin-top: 1.25rem;
      padding: 0.75rem;
      background: #f9fafb;
      border-left: 3px solid #d4af37;
      font-size: 0.75rem;
      color: #4b5563;
      line-height: 1.4;
    }

    /* 5. Fila Inferior (3 Columnas) */
    .bottom-three-columns {
      display: grid;
      grid-template-columns: 5fr 4fr 3fr;
      gap: 1.25rem;
    }

    .panel-box {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 2px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.85rem;
      border-bottom: 1px solid #f3f4f6;
      padding-bottom: 0.5rem;
    }

    .panel-title {
      font-size: 0.88rem;
      font-weight: 800;
      color: #111111;
      margin: 0;
    }

    .panel-tag {
      font-size: 0.65rem;
      font-weight: 800;
      color: #6b7280;
      letter-spacing: 0.08em;
    }

    .panel-tag.tag-warning {
      color: #dc2626;
      background: #fee2e2;
      padding: 0.15rem 0.4rem;
      border-radius: 2px;
    }

    /* Tabla de Top Productos */
    .luxury-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.76rem;
    }

    .luxury-table th {
      text-align: left;
      color: #9ca3af;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.4rem 0.3rem;
      border-bottom: 1px solid #f3f4f6;
    }

    .luxury-table td {
      padding: 0.55rem 0.3rem;
      border-bottom: 1px solid #f9fafb;
    }

    .col-rank {
      font-weight: 800;
      color: #d4af37;
      width: 24px;
    }

    .col-prenda-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .prenda-mini-thumb {
      width: 32px;
      height: 32px;
      object-fit: cover;
      border-radius: 2px;
      background: #f3f4f6;
    }

    .prenda-meta {
      display: flex;
      flex-direction: column;
    }

    .p-name {
      font-weight: 700;
      color: #111111;
      line-height: 1.2;
    }

    .p-sub {
      font-size: 0.68rem;
      color: #6b7280;
    }

    .col-sku {
      color: #6b7280;
      font-size: 0.72rem;
    }

    .col-revenue {
      font-weight: 700;
      color: #111111;
    }

    .mini-trend-icon {
      width: 32px;
      height: 12px;
    }

    /* Alertas de Stock */
    .inventory-alerts-list {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      flex: 1;
    }

    .alert-item-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.65rem;
      background: #f9fafb;
      border: 1px solid #f3f4f6;
      border-radius: 2px;
      gap: 0.5rem;
    }

    .alert-thumb {
      width: 34px;
      height: 34px;
      object-fit: cover;
      border-radius: 2px;
      background: #e5e7eb;
    }

    .alert-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .alert-item-name {
      font-size: 0.74rem;
      font-weight: 700;
      color: #111111;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .alert-item-sub {
      font-size: 0.68rem;
      color: #6b7280;
    }

    .alert-level-badge {
      font-size: 0.62rem;
      font-weight: 800;
      padding: 0.15rem 0.4rem;
      border-radius: 2px;
      background: #fef3c7;
      color: #b45309;
    }

    .alert-level-badge.badge-critico {
      background: #fee2e2;
      color: #dc2626;
    }

    .btn-manage-inventory-link {
      margin-top: 0.75rem;
      font-size: 0.72rem;
      font-weight: 700;
      color: #111111;
      text-decoration: none;
      display: block;
      text-align: right;
    }

    .btn-manage-inventory-link:hover {
      color: #d4af37;
    }

    /* Donut & Gauges */
    .donut-chart-box {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin: 0.5rem 0;
    }

    .donut-svg {
      width: 80px;
      height: 80px;
      transform: rotate(-90deg);
      flex-shrink: 0;
    }

    .donut-legend {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.72rem;
      color: #4b5563;
      font-weight: 600;
    }

    .leg-row {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .sq-dot {
      width: 8px;
      height: 8px;
      border-radius: 1px;
    }

    .sq-dot.black { background: #111111; }
    .sq-dot.gold { background: #d4af37; }
    .sq-dot.gray { background: #9ca3af; }

    .divider-line {
      height: 1px;
      background: #f3f4f6;
      margin: 0.85rem 0;
    }

    .gauge-box {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .gauge-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.7rem;
      font-weight: 700;
      color: #6b7280;
    }

    .gauge-val {
      font-size: 0.85rem;
      font-weight: 800;
      color: #111111;
    }

    .gauge-track-bar {
      height: 8px;
      background: #f3f4f6;
      border-radius: 4px;
      overflow: hidden;
    }

    .gauge-fill-bar {
      height: 100%;
      background: #d4af37;
      border-radius: 4px;
    }

    .gauge-meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.68rem;
      color: #9ca3af;
    }

    .positive-text {
      color: #059669;
      font-weight: 700;
    }

    /* Responsividad */
    @media (max-width: 1024px) {
      .kpi-five-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .charts-middle-row {
        grid-template-columns: 1fr;
      }
      .bottom-three-columns {
        grid-template-columns: 1fr;
      }
      .voice-diagnosis-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ReportesDashboardPageComponent implements OnInit, OnDestroy {
  private reportesService = inject(ReportesService);

  // Estados
  loading = signal<boolean>(true);
  exporting = signal<boolean>(false);
  selectedRango = signal<string>('30D');
  dashboardData = signal<DashboardReporteResponse | null>(null);

  // Estados de Voz
  isListening = signal<boolean>(false);
  isSpeaking = signal<boolean>(false);
  isProcessingVoice = signal<boolean>(false);
  currentTranscript = signal<string>('');
  voiceAnalysis = signal<AnalisisVozResponse | null>(null);
  textQueryInput = '';
  activePoint: any = null;

  quickPills = [
    { label: '🏆 ¿Cuál es el producto más vendido?', query: 'Cual es el producto mas vendido?' },
    { label: '📈 ¿Cómo están los ingresos este mes?', query: 'Como estan los ingresos este mes?' },
    { label: '👗 ¿Cuál es la ocupación de probadores?', query: 'Cual es la ocupacion de probadores?' },
    { label: '⚠️ ¿Qué prendas tienen stock crítico?', query: 'Cuales prendas tienen stock critico o bajo?' }
  ];

  // Proyección de Gráfico de Ventas (SVG)
  chartCoordinates = computed(() => {
    const data = this.dashboardData();
    if (!data || !data.sales_trend || data.sales_trend.length === 0) {
      return [
        { x: 50, y: 160, label: 'Sem 1', monto: 21347, transacciones: 76 },
        { x: 225, y: 120, label: 'Sem 2', monto: 32910, transacciones: 117 },
        { x: 400, y: 70, label: 'Sem 3', monto: 42694, transacciones: 152 },
        { x: 575, y: 35, label: 'Sem 4', monto: 55147, transacciones: 196 },
        { x: 750, y: 55, label: 'Cierre', monto: 48920, transacciones: 174 }
      ];
    }

    const points = data.sales_trend;
    const maxMonto = Math.max(...points.map(p => p.monto), 1);
    const stepX = 700 / Math.max(points.length - 1, 1);

    return points.map((p, i) => {
      const x = 50 + i * stepX;
      const y = 175 - (p.monto / maxMonto) * 140;
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
    return `${line} L${last.x},190 L${first.x},190 Z`;
  });

  ngOnInit(): void {
    this.cargarDashboard(this.selectedRango());
  }

  ngOnDestroy(): void {
    this.reportesService.stopListening();
    this.reportesService.stopSpeaking();
  }

  cargarDashboard(rango: string): void {
    this.loading.set(true);
    this.reportesService.getDashboard(rango).subscribe({
      next: (res) => {
        this.dashboardData.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar dashboard:', err);
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
        a.download = `Reporte_Ejecutivo_FashionStore_${this.selectedRango()}_${Date.now()}.csv`;
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
        console.error('Error al analizar consulta de voz:', err);
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
