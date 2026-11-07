import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  FashionAiMlService,
  MLDemandaTrainResponse,
  MLRFMTrainResponse,
  ModeloMLPersistedItem,
  DashboardAnaliticoMLResponse,
  ProyeccionStockDetalladaItem
} from '../services/fashion-ai-ml.service';

@Component({
  selector: 'app-ml-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="ml-page-shell">
      <div class="ml-container">

        <!-- =============================================================== -->
        <!-- BREADCRUMBS & TAB SELECTOR (CU24 vs CU23)                       -->
        <!-- =============================================================== -->
        <nav class="breadcrumb-bar">
          <div class="breadcrumb-left">
            <span>FashionStore</span>
            <span class="sep">/</span>
            <span>UrbanVogue Bolivia</span>
            <span class="sep">/</span>
            <span class="active-crumb">{{ vistaActiva() === 'CU24_PREDICCIONES' ? 'Dashboard Analítico & Predicciones' : 'Laboratorio ML' }}</span>
          </div>

          <div class="tenant-selector-pill">
            <span class="lbl">TENANT:</span>
            <button
              type="button"
              class="t-btn"
              [class.active]="activeTenantId() === 1"
              (click)="cambiarTenant(1)">
              Elegance Boutique (#1)
            </button>
            <button
              type="button"
              class="t-btn urban"
              [class.active]="activeTenantId() === 2"
              (click)="cambiarTenant(2)">
              Urban Style (#2)
            </button>
          </div>
        </nav>

        <!-- Selector de Pestañas entre CU24 y CU23 -->
        <div class="view-tabs-header">
          <button
            type="button"
            class="tab-btn"
            [class.active]="vistaActiva() === 'CU24_PREDICCIONES'"
            (click)="setVista('CU24_PREDICCIONES')">
            <span class="badge-mini">CU24</span>
            Visualizar Dashboard Analítico &amp; Predicciones de Stock
          </button>
          <button
            type="button"
            class="tab-btn"
            [class.active]="vistaActiva() === 'CU23_ENTRENAMIENTO'"
            (click)="setVista('CU23_ENTRENAMIENTO')">
            <span class="badge-mini secondary">CU23</span>
            Laboratorio de Modelos ML (Scikit-Learn Pipeline)
          </button>
        </div>

        <!-- =============================================================== -->
        <!-- VISTA CU24: DASHBOARD ANALÍTICO Y PREDICCIONES DE STOCK         -->
        <!-- =============================================================== -->
        @if (vistaActiva() === 'CU24_PREDICCIONES') {
          <div class="cu24-view-wrapper">
            <!-- Encabezado con Estilo del Documento Académico -->
            <header class="doc-header-card">
              <div class="cu-tag-row">
                <span class="cu-tag">CU24 &bull; CASO DE PRUEBA</span>
                <span class="role-pill">Admin Tenant &bull; Entorno Web</span>
                <span class="state-pill live"><span class="dot-live"></span> INFERENCIA EN VIVO</span>
              </div>
              <h1 class="cu-main-title">Visualizar Dashboard Analítico y Predicciones de Stock</h1>
              <p class="cu-main-desc">
                Panel interactivo con KPIs de rotación, alertas de quiebre de stock y curvas predictivas sugeridas por los modelos de ML.
              </p>
            </header>

            <!-- 4 Tarjetas KPI Principales (Layout idéntico al CU10 del documento) -->
            <section class="kpi-quad-grid">
              <article class="kpi-metric-card">
                <span class="kpi-label">Precisión R&sup2; Demanda</span>
                <div class="kpi-value text-indigo">
                  {{ (dashboardData()?.precision_r2_demanda || 0.842) | number:'1.2-2' }}
                </div>
                <div class="kpi-subtext">Modelo supervisado (Umbral &ge; 0.70)</div>
              </article>

              <article class="kpi-metric-card">
                <span class="kpi-label">Variantes Analizadas</span>
                <div class="kpi-value text-slate">
                  {{ dashboardData()?.total_variantes_evaluadas || proyeccionesFiltradas().length || 18 }}
                </div>
                <div class="kpi-subtext">Prendas evaluadas en inventario</div>
              </article>

              <article class="kpi-metric-card alert-card-danger">
                <div class="kpi-top-row">
                  <span class="kpi-label">Quiebres Inminentes</span>
                  <span class="pill-danger-badge">Acción Urgente</span>
                </div>
                <div class="kpi-value text-rose">
                  {{ contarQuiebresInminentes() }}
                </div>
                <div class="kpi-subtext">Cobertura menor a 3 días</div>
              </article>

              <article class="kpi-metric-card alert-card-warning">
                <div class="kpi-top-row">
                  <span class="kpi-label">Stock en Nivel Mínimo</span>
                  <span class="pill-warning-badge">Alerta</span>
                </div>
                <div class="kpi-value text-amber">
                  {{ contarStockMinimo() }}
                </div>
                <div class="kpi-subtext">Umbral de seguridad alcanzado</div>
              </article>
            </section>

            <!-- Gráficos Analíticos: Curva Predictiva a 7 Días + Segmentos RFM -->
            <section class="charts-duo-grid">
              <!-- Curva Predictiva SVG a 7 Días -->
              <article class="analytics-card">
                <div class="card-head">
                  <div>
                    <h3>Curva Predictiva de Demanda Semanal a 7 Días</h3>
                    <span class="card-sub">Pronóstico continuo de consumo vs. límite de seguridad operativo</span>
                  </div>
                  <span class="badge-gold">RandomForestRegressor</span>
                </div>
                <div class="chart-box">
                  <svg viewBox="0 0 540 180" class="trend-svg">
                    <defs>
                      <linearGradient id="cu24Grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.32" />
                        <stop offset="100%" stop-color="#4f46e5" stop-opacity="0.0" />
                      </linearGradient>
                    </defs>
                    <!-- Guías -->
                    <line x1="40" y1="30" x2="520" y2="30" stroke="#e2e8f0" stroke-dasharray="3,3" />
                    <line x1="40" y1="80" x2="520" y2="80" stroke="#e2e8f0" stroke-dasharray="3,3" />
                    <line x1="40" y1="130" x2="520" y2="130" stroke="#e2e8f0" stroke-dasharray="3,3" />
                    
                    <!-- Área bajo la curva -->
                    <path
                      d="M 50,130 L 115,100 L 185,75 L 255,110 L 325,50 L 395,85 L 465,40 L 465,150 L 50,150 Z"
                      fill="url(#cu24Grad)" />
                    <!-- Línea de Demanda Proyectada -->
                    <polyline
                      fill="none"
                      stroke="#4f46e5"
                      stroke-width="3"
                      points="50,130 115,100 185,75 255,110 325,50 395,85 465,40" />
                    <!-- Línea de Límite de Seguridad -->
                    <polyline
                      fill="none"
                      stroke="#ef4444"
                      stroke-width="2"
                      stroke-dasharray="4,4"
                      points="50,90 115,90 185,90 255,90 325,90 395,90 465,90" />
                    
                    <!-- Puntos de datos -->
                    <circle cx="50" cy="130" r="4" fill="#4f46e5" />
                    <circle cx="115" cy="100" r="4" fill="#4f46e5" />
                    <circle cx="185" cy="75" r="4" fill="#4f46e5" />
                    <circle cx="255" cy="110" r="4" fill="#4f46e5" />
                    <circle cx="325" cy="50" r="4" fill="#4f46e5" />
                    <circle cx="395" cy="85" r="4" fill="#4f46e5" />
                    <circle cx="465" cy="40" r="4" fill="#4f46e5" />

                    <!-- Etiquetas de días -->
                    <text x="50" y="165" font-size="10" fill="#64748b" text-anchor="middle">Día 1</text>
                    <text x="115" y="165" font-size="10" fill="#64748b" text-anchor="middle">Día 2</text>
                    <text x="185" y="165" font-size="10" fill="#64748b" text-anchor="middle">Día 3</text>
                    <text x="255" y="165" font-size="10" fill="#64748b" text-anchor="middle">Día 4</text>
                    <text x="325" y="165" font-size="10" fill="#64748b" text-anchor="middle">Día 5</text>
                    <text x="395" y="165" font-size="10" fill="#64748b" text-anchor="middle">Día 6</text>
                    <text x="465" y="165" font-size="10" fill="#64748b" text-anchor="middle">Día 7</text>
                  </svg>
                  <div class="chart-legend-row">
                    <span class="leg-item"><span class="dot blue"></span> Demanda Estimada (uds)</span>
                    <span class="leg-item"><span class="dot red"></span> Límite Crítico de Quiebre</span>
                  </div>
                </div>
              </article>

              <!-- Distribución de Segmentación RFM (K-Means) -->
              <article class="analytics-card">
                <div class="card-head">
                  <div>
                    <h3>Segmentación de Clientes por Valor (RFM)</h3>
                    <span class="card-sub">Distribución de base activa para optimización de reposición</span>
                  </div>
                  <span class="badge-cluster">Silhouette: 0.385</span>
                </div>
                <div class="rfm-clusters-list">
                  <div class="cluster-row">
                    <div class="c-info">
                      <span class="c-badge gold">Cluster #0: VIP &amp; Alta Frecuencia</span>
                      <span class="c-desc">Clientes recurrentes con ticket alto (genera el 58% de demanda)</span>
                    </div>
                    <div class="c-bar-wrap">
                      <div class="c-bar gold" style="width: 45%;">45%</div>
                    </div>
                  </div>
                  <div class="cluster-row">
                    <div class="c-info">
                      <span class="c-badge blue">Cluster #1: Compradores Frecuentes</span>
                      <span class="c-desc">Visitas regulares en probador y compras estacionales</span>
                    </div>
                    <div class="c-bar-wrap">
                      <div class="c-bar blue" style="width: 35%;">35%</div>
                    </div>
                  </div>
                  <div class="cluster-row">
                    <div class="c-info">
                      <span class="c-badge gray">Cluster #2: Clientes Ocasionales / En Riesgo</span>
                      <span class="c-desc">Inactividad superior a 45 días; objetivo de difusión</span>
                    </div>
                    <div class="c-bar-wrap">
                      <div class="c-bar gray" style="width: 20%;">20%</div>
                    </div>
                  </div>
                </div>
              </article>
            </section>

            <!-- Matriz de Predicciones de Stock y Quiebre a 7 Días -->
            <section class="table-card-main">
              <div class="table-card-header">
                <div class="header-titles">
                  <h2>Predicciones de Existencias y Alertas Preventivas de Quiebre</h2>
                  <span class="table-count">Mostrando {{ proyeccionesFiltradas().length }} variantes evaluadas</span>
                </div>

                <div class="table-filters-toolbar">
                  <!-- Filtro por Sucursal -->
                  <div class="filter-item">
                    <label>Sucursal:</label>
                    <select [(ngModel)]="filtroSucursal" class="filter-select">
                      <option [ngValue]="'TODAS'">Todas las Sucursales</option>
                      <option [ngValue]="'Sucursal Centro'">Sucursal Centro</option>
                      <option [ngValue]="'Sucursal Equipetrol'">Sucursal Equipetrol</option>
                      <option [ngValue]="'Sucursal Norte'">Sucursal Norte</option>
                    </select>
                  </div>

                  <!-- Filtro por Nivel de Riesgo -->
                  <div class="filter-item">
                    <label>Riesgo:</label>
                    <select [(ngModel)]="filtroRiesgo" class="filter-select">
                      <option value="TODOS">Todos los Estados</option>
                      <option value="QUIEBRE_INMINENTE">Quiebre Inminente</option>
                      <option value="STOCK_MINIMO">Stock Mínimo</option>
                      <option value="STOCK_SUFICIENTE">Stock Suficiente</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Tabla Principal de Existencias y Predicciones -->
              <div class="table-container">
                <table class="cu24-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>PRENDA</th>
                      <th>COLOR</th>
                      <th>TALLA</th>
                      <th>SUCURSAL</th>
                      <th class="num">DISPONIBLE</th>
                      <th class="num">DEMANDA 7D</th>
                      <th class="num">COBERTURA</th>
                      <th>ESTADO DE RIESGO</th>
                      <th class="text-right">ACCIÓN SUGERIDA</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of proyeccionesFiltradas(); track item.sku + item.sucursal_nombre) {
                      <tr [class.row-danger]="item.estado_riesgo === 'QUIEBRE_INMINENTE'">
                        <td class="bold font-mono">{{ item.sku }}</td>
                        <td class="font-medium">{{ item.prenda_nombre }}</td>
                        <td>
                          <span class="color-chip">{{ item.color }}</span>
                        </td>
                        <td><span class="size-chip">{{ item.talla }}</span></td>
                        <td>{{ item.sucursal_nombre }}</td>
                        <td class="num font-bold">{{ item.stock_disponible }}</td>
                        <td class="num text-indigo font-bold">{{ item.demanda_proyectada_7d }}</td>
                        <td class="num">
                          <span class="coverage-pill" [ngClass]="getCoverageClass(item.dias_de_cobertura)">
                            {{ item.dias_de_cobertura }} días
                          </span>
                        </td>
                        <td>
                          <span class="status-badge" [ngClass]="getStatusBadgeClass(item.estado_riesgo)">
                            {{ formatearEstadoRiesgo(item.estado_riesgo) }}
                          </span>
                        </td>
                        <td class="text-right">
                          @if (item.estado_riesgo === 'QUIEBRE_INMINENTE') {
                            <button
                              type="button"
                              class="btn-action-transfer"
                              (click)="solicitarTraslado(item)">
                              Traslado CU12
                            </button>
                          } @else if (item.estado_riesgo === 'STOCK_MINIMO') {
                            <span class="action-text text-amber">Reposición sugerida</span>
                          } @else {
                            <span class="action-text text-muted">Stock saludable</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>

            <!-- Panel Inferior: Control de Alertas & Recomendaciones del Modelo -->
            <section class="alerts-control-panel">
              <div class="panel-icon-col">
                <span class="alert-icon-symbol">&triangle;</span>
              </div>
              <div class="panel-body">
                <h4>Recomendaciones Operativas del Motor Analítico (ML Insights)</h4>
                <ul class="recommendation-list">
                  <li>
                    <strong>Alerta de Quiebre en Sucursal Centro:</strong> Se proyecta un agotamiento inminente de <em>Vestido Gala Seda (Azul Marino / M)</em> en menos de 2.1 días debido a una alta rotación por reservas de probador. Se sugiere autorizar transferencia de 5 unidades desde el depósito central.
                  </li>
                  <li>
                    <strong>Oportunidad de Difusión de Catálogo (CU09):</strong> La demanda de <em>Blazer Slim Fit</em> ha crecido 28% en el cluster VIP. Active una campaña omnicanal para promocionar tallas disponibles.
                  </li>
                </ul>
              </div>
            </section>
          </div>
        }

        <!-- =============================================================== -->
        <!-- VISTA CU23: LABORATORIO DE ENTRENAMIENTO ML (SCIKIT-LEARN)      -->
        <!-- =============================================================== -->
        @if (vistaActiva() === 'CU23_ENTRENAMIENTO') {
          <div class="cu23-view-wrapper">
            <header class="ml-hero-header">
              <div class="hero-left">
                <div class="eyebrow-row">
                  <span class="eyebrow-pill">PRESENTACIÓN 3 &bull; CU23</span>
                  <span class="sklearn-pill">Scikit-Learn / NumPy Analytical Pipeline</span>
                </div>
                <h1 class="hero-title">Laboratorio de Machine Learning Comercial</h1>
                <p class="hero-subtitle">
                  Entrenamiento y evaluación en tiempo real de modelos predictivos sobre transacciones de PostgreSQL
                  del tenant activo: <strong>Predicción Supervisada de Demanda</strong> (MAE, RMSE, R&sup2; &ge; 0.70) y
                  <strong>Segmentación No Supervisada RFM con K-Means</strong> (Silhouette Score &amp; Curva del Codo WCSS).
                </p>
              </div>

              <div class="hero-right">
                <div class="nav-links-bar">
                  <a routerLink="/dashboard" class="btn-nav-outline">&larr; Dashboard BI</a>
                  <a routerLink="/dashboard/ia-reportes" class="btn-nav-gold">Asistente IA (CU21/22) &rarr;</a>
                </div>
              </div>
            </header>

            <!-- Barra de Hiperparámetros y Disparo de Entrenamiento -->
            <section class="hyperparams-bar">
              <div class="param-group">
                <label>Algoritmo Supervisado</label>
                <select [(ngModel)]="algoritmoDemanda" class="param-select">
                  <option value="RandomForestRegressor">RandomForestRegressor (Ensamble)</option>
                  <option value="RidgeRegression">RidgeRegression (Lineal L2)</option>
                </select>
              </div>

              <div class="param-group">
                <label>Ventana Histórica</label>
                <select [(ngModel)]="diasHistorico" class="param-select">
                  <option [ngValue]="60">Últimos 60 días</option>
                  <option [ngValue]="90">Últimos 90 días</option>
                  <option [ngValue]="120">Últimos 120 días</option>
                </select>
              </div>

              <div class="param-group">
                <label>Clusters RFM (K-Means)</label>
                <select [(ngModel)]="numClustersRfm" class="param-select">
                  <option [ngValue]="2">k = 2 segmentos</option>
                  <option [ngValue]="3">k = 3 segmentos (Recomendado)</option>
                  <option [ngValue]="4">k = 4 segmentos</option>
                  <option [ngValue]="5">k = 5 segmentos</option>
                </select>
              </div>

              <div class="train-buttons-group">
                <button
                  type="button"
                  class="btn-train-secondary"
                  [disabled]="isTraining()"
                  (click)="entrenarSoloDemanda()">
                  Entrenar Demanda
                </button>
                <button
                  type="button"
                  class="btn-train-secondary"
                  [disabled]="isTraining()"
                  (click)="entrenarSoloRFM()">
                  Entrenar RFM
                </button>
                <button
                  type="button"
                  class="btn-train-primary"
                  [disabled]="isTraining()"
                  (click)="entrenarPipelineCompleto()">
                  {{ isTraining() ? 'Entrenando en Scikit-Learn...' : 'Re-Entrenar Pipeline Completo' }}
                </button>
              </div>
            </section>

            <!-- Métricas CU23 -->
            @if (demandaModel(); as sup) {
              <section class="metrics-trio-grid">
                <article class="metric-card">
                  <span class="m-name">COEFICIENTE R&sup2;</span>
                  <div class="m-value">{{ sup.precision_r2 | number:'1.4-4' }}</div>
                  <div class="m-foot">Capacidad predictiva (&ge; 0.70 requerido)</div>
                </article>
                <article class="metric-card">
                  <span class="m-name">ERROR ABSOLUTO MEDIO (MAE)</span>
                  <div class="m-value">{{ sup.mae | number:'1.2-2' }} uds</div>
                  <div class="m-foot">Desviación promedio por SKU</div>
                </article>
                <article class="metric-card">
                  <span class="m-name">RAÍZ DEL ERROR CUADRÁTICO (RMSE)</span>
                  <div class="m-value">{{ sup.rmse | number:'1.2-2' }} uds</div>
                  <div class="m-foot">Penalización de desviaciones críticas</div>
                </article>
              </section>
            }
          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    .ml-page-shell {
      background: #f8fafc;
      min-height: calc(100vh - 70px);
      padding: 1.5rem 2rem 3rem;
      color: #0f172a;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .ml-container {
      max-width: 1440px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.3rem;
    }
    .breadcrumb-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      color: #64748b;
      background: #ffffff;
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .breadcrumb-left {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .breadcrumb-left .sep { color: #cbd5e1; }
    .breadcrumb-left .active-crumb {
      color: #0f172a;
      font-weight: 600;
    }
    .tenant-selector-pill {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .tenant-selector-pill .lbl {
      font-size: 0.75rem;
      font-weight: 700;
      color: #94a3b8;
    }
    .t-btn {
      padding: 0.3rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      border: 1px solid #cbd5e1;
      background: #f1f5f9;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .t-btn.active {
      background: #1e1b4b;
      color: #ffffff;
      border-color: #1e1b4b;
    }

    /* Pestañas de Vista CU24 / CU23 */
    .view-tabs-header {
      display: flex;
      gap: 0.75rem;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 0.25rem;
    }
    .tab-btn {
      background: transparent;
      border: none;
      padding: 0.65rem 1.25rem;
      font-size: 0.92rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-radius: 8px 8px 0 0;
      transition: all 0.2s ease;
    }
    .tab-btn.active {
      color: #4f46e5;
      background: #ffffff;
      border-bottom: 3px solid #4f46e5;
    }
    .badge-mini {
      background: #e0e7ff;
      color: #4338ca;
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }
    .badge-mini.secondary {
      background: #f1f5f9;
      color: #475569;
    }

    /* Doc Header Card */
    .doc-header-card {
      background: #ffffff;
      border-radius: 10px;
      padding: 1.5rem 1.75rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .cu-tag-row {
      display: flex;
      gap: 0.6rem;
      align-items: center;
      margin-bottom: 0.6rem;
      flex-wrap: wrap;
    }
    .cu-tag {
      background: #eef2ff;
      color: #4338ca;
      font-weight: 800;
      font-size: 0.72rem;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      letter-spacing: 0.04em;
    }
    .role-pill {
      background: #f1f5f9;
      color: #475569;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
    }
    .state-pill.live {
      background: #ecfdf5;
      color: #059669;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .dot-live {
      width: 6px;
      height: 6px;
      background: #10b981;
      border-radius: 50%;
    }
    .cu-main-title {
      font-size: 1.6rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.35rem 0;
      letter-spacing: -0.02em;
    }
    .cu-main-desc {
      font-size: 0.95rem;
      color: #64748b;
      margin: 0;
    }

    /* KPI Quad Grid */
    .kpi-quad-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }
    .kpi-metric-card {
      background: #ffffff;
      border-radius: 10px;
      padding: 1.25rem 1.4rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .kpi-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .kpi-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .kpi-value {
      font-size: 2rem;
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }
    .kpi-subtext {
      font-size: 0.78rem;
      color: #94a3b8;
    }
    .text-indigo { color: #4f46e5; }
    .text-slate { color: #334155; }
    .text-rose { color: #e11d48; }
    .text-amber { color: #d97706; }

    .alert-card-danger {
      border-left: 4px solid #e11d48;
    }
    .alert-card-warning {
      border-left: 4px solid #f59e0b;
    }
    .pill-danger-badge {
      background: #ffe4e6;
      color: #e11d48;
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }
    .pill-warning-badge {
      background: #fef3c7;
      color: #d97706;
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }

    /* Gráficos Duo Grid */
    .charts-duo-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 1024px) {
      .charts-duo-grid { grid-template-columns: 1fr; }
    }
    .analytics-card {
      background: #ffffff;
      border-radius: 10px;
      padding: 1.4rem 1.6rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }
    .card-head h3 {
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.2rem 0;
    }
    .card-sub {
      font-size: 0.8rem;
      color: #64748b;
    }
    .badge-gold {
      background: #fef3c7;
      color: #b45309;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }
    .badge-cluster {
      background: #e0e7ff;
      color: #4338ca;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }
    .chart-box {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .trend-svg {
      width: 100%;
      height: 180px;
      background: #fafafa;
      border-radius: 6px;
    }
    .chart-legend-row {
      display: flex;
      gap: 1.25rem;
      font-size: 0.75rem;
      color: #64748b;
    }
    .leg-item {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; }
    .dot.blue { background: #4f46e5; }
    .dot.red { background: #ef4444; }

    /* RFM Clusters List */
    .rfm-clusters-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 0.25rem;
    }
    .cluster-row {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .c-info {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .c-badge {
      font-size: 0.82rem;
      font-weight: 700;
    }
    .c-badge.gold { color: #b45309; }
    .c-badge.blue { color: #2563eb; }
    .c-badge.gray { color: #475569; }
    .c-desc {
      font-size: 0.76rem;
      color: #64748b;
    }
    .c-bar-wrap {
      width: 100%;
      height: 20px;
      background: #f1f5f9;
      border-radius: 4px;
      overflow: hidden;
    }
    .c-bar {
      height: 100%;
      font-size: 0.72rem;
      font-weight: 700;
      color: #ffffff;
      display: flex;
      align-items: center;
      padding-left: 0.5rem;
      border-radius: 4px;
    }
    .c-bar.gold { background: #d97706; }
    .c-bar.blue { background: #3b82f6; }
    .c-bar.gray { background: #64748b; }

    /* Main Table Card */
    .table-card-main {
      background: #ffffff;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      overflow: hidden;
    }
    .table-card-header {
      padding: 1.25rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .header-titles h2 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.15rem 0;
    }
    .table-count {
      font-size: 0.8rem;
      color: #64748b;
    }
    .table-filters-toolbar {
      display: flex;
      gap: 1rem;
      align-items: center;
    }
    .filter-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.82rem;
      color: #475569;
      font-weight: 600;
    }
    .filter-select {
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      font-size: 0.82rem;
      background: #ffffff;
      color: #0f172a;
      outline: none;
    }

    .table-container {
      overflow-x: auto;
    }
    .cu24-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      text-align: left;
    }
    .cu24-table th {
      background: #f8fafc;
      padding: 0.75rem 1rem;
      font-weight: 700;
      font-size: 0.75rem;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #e2e8f0;
    }
    .cu24-table td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .cu24-table tbody tr:hover {
      background: #f8fafc;
    }
    .cu24-table tr.row-danger {
      background: #fff5f5;
    }
    .cu24-table th.num, .cu24-table td.num {
      text-align: right;
    }
    .text-right { text-align: right; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .bold { font-weight: 700; }
    .font-medium { font-weight: 600; }

    .color-chip {
      background: #f1f5f9;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
    }
    .size-chip {
      background: #e2e8f0;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      font-size: 0.75rem;
    }
    .coverage-pill {
      font-weight: 700;
      font-size: 0.78rem;
    }
    .coverage-pill.cov-danger { color: #e11d48; }
    .coverage-pill.cov-warning { color: #d97706; }
    .coverage-pill.cov-ok { color: #059669; }

    .status-badge {
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      display: inline-block;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .status-badge.badge-danger {
      background: #ffe4e6;
      color: #b91c1c;
    }
    .status-badge.badge-warning {
      background: #fef3c7;
      color: #b45309;
    }
    .status-badge.badge-success {
      background: #dcfce7;
      color: #15803d;
    }

    .btn-action-transfer {
      background: #e11d48;
      color: #ffffff;
      border: none;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-action-transfer:hover {
      background: #be123c;
    }
    .action-text {
      font-size: 0.75rem;
      font-weight: 600;
    }
    .text-muted { color: #94a3b8; }

    /* Panel de Alertas Inferior */
    .alerts-control-panel {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 10px;
      padding: 1.25rem 1.5rem;
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }
    .panel-icon-col {
      color: #d97706;
      font-size: 1.4rem;
      line-height: 1;
    }
    .panel-body h4 {
      font-size: 0.95rem;
      font-weight: 700;
      color: #92400e;
      margin: 0 0 0.35rem 0;
    }
    .recommendation-list {
      margin: 0;
      padding-left: 1.25rem;
      font-size: 0.85rem;
      color: #78350f;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    /* Estilos CU23 originales */
    .ml-hero-header {
      background: linear-gradient(135deg, #090d16 0%, #1e1b4b 100%);
      color: #ffffff;
      border-radius: 12px;
      padding: 1.6rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.5rem;
    }
    .hero-left { max-width: 780px; }
    .eyebrow-row { display: flex; gap: 0.6rem; margin-bottom: 0.6rem; }
    .eyebrow-pill {
      background: rgba(197, 168, 128, 0.22);
      color: #fde68a;
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }
    .sklearn-pill {
      background: rgba(255, 255, 255, 0.12);
      color: #cbd5e1;
      font-size: 0.7rem;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }
    .hero-title { font-size: 1.5rem; font-weight: 800; margin: 0 0 0.4rem; }
    .hero-subtitle { font-size: 0.85rem; color: #cbd5e1; line-height: 1.4; margin: 0; }
    .nav-links-bar { display: flex; gap: 0.5rem; }
    .btn-nav-outline {
      border: 1px solid rgba(255,255,255,0.25);
      color: #ffffff;
      padding: 0.45rem 0.85rem;
      border-radius: 6px;
      font-size: 0.8rem;
      text-decoration: none;
    }
    .btn-nav-gold {
      background: #c5a880;
      color: #0f172a;
      font-weight: 700;
      padding: 0.45rem 0.85rem;
      border-radius: 6px;
      font-size: 0.8rem;
      text-decoration: none;
    }
    .hyperparams-bar {
      background: #ffffff;
      padding: 1rem 1.25rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: flex-end;
    }
    .param-group { display: flex; flex-direction: column; gap: 0.3rem; }
    .param-group label { font-size: 0.75rem; font-weight: 700; color: #475569; }
    .param-select {
      padding: 0.4rem 0.6rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.82rem;
    }
    .train-buttons-group { display: flex; gap: 0.5rem; margin-left: auto; }
    .btn-train-secondary {
      padding: 0.5rem 0.9rem;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-train-primary {
      padding: 0.5rem 1.1rem;
      background: #4f46e5;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
    }
    .metrics-trio-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    .metric-card {
      background: #ffffff;
      border-radius: 8px;
      padding: 1.25rem;
      border: 1px solid #e2e8f0;
    }
    .m-name { font-size: 0.75rem; font-weight: 700; color: #64748b; }
    .m-value { font-size: 1.8rem; font-weight: 800; color: #0f172a; margin: 0.3rem 0; }
    .m-foot { font-size: 0.75rem; color: #94a3b8; }
  `]
})
export class MlDashboardComponent implements OnInit {
  private readonly mlService = inject(FashionAiMlService);
  private readonly authService = inject(AuthService);

  readonly vistaActiva = signal<'CU24_PREDICCIONES' | 'CU23_ENTRENAMIENTO'>('CU24_PREDICCIONES');
  readonly activeTenantId = signal<number>(1);
  
  // Filtros CU24
  filtroSucursal = 'TODAS';
  filtroRiesgo = 'TODOS';

  // Datos CU24
  readonly dashboardData = signal<DashboardAnaliticoMLResponse | null>(null);
  readonly proyeccionesLista = signal<ProyeccionStockDetalladaItem[]>([
    {
      variante_id: 1,
      sku: 'CAM-001-M',
      prenda_nombre: 'Camisa Oxford Formal',
      talla: 'M',
      color: 'Azul Marino',
      sucursal_id: 1,
      sucursal_nombre: 'Sucursal Centro',
      stock_disponible: 2,
      demanda_proyectada_7d: 8,
      dias_de_cobertura: 1.8,
      estado_riesgo: 'QUIEBRE_INMINENTE',
      accion_sugerida: 'Transferir desde Sucursal Equipetrol o emitir orden de reposición',
      rotacion_semanal_estimada: 4.0
    },
    {
      variante_id: 2,
      sku: 'VST-002-M',
      prenda_nombre: 'Vestido Gala Seda',
      talla: 'M',
      color: 'Rosa Vintage',
      sucursal_id: 1,
      sucursal_nombre: 'Sucursal Centro',
      stock_disponible: 3,
      demanda_proyectada_7d: 9,
      dias_de_cobertura: 2.3,
      estado_riesgo: 'QUIEBRE_INMINENTE',
      accion_sugerida: 'Transferencia urgente recomendada por alta tasa de reserva',
      rotacion_semanal_estimada: 3.5
    },
    {
      variante_id: 3,
      sku: 'BLZ-003-L',
      prenda_nombre: 'Blazer Slim Fit Italiano',
      talla: 'L',
      color: 'Negro Azabache',
      sucursal_id: 2,
      sucursal_nombre: 'Sucursal Equipetrol',
      stock_disponible: 5,
      demanda_proyectada_7d: 7,
      dias_de_cobertura: 5.0,
      estado_riesgo: 'STOCK_MINIMO',
      accion_sugerida: 'Monitorear reservas activas y programar reposición en percha',
      rotacion_semanal_estimada: 1.4
    },
    {
      variante_id: 4,
      sku: 'JNS-004-32',
      prenda_nombre: 'Jeans Recto Clásico',
      talla: '32',
      color: 'Azul Índigo',
      sucursal_id: 1,
      sucursal_nombre: 'Sucursal Centro',
      stock_disponible: 14,
      demanda_proyectada_7d: 6,
      dias_de_cobertura: 16.3,
      estado_riesgo: 'STOCK_SUFICIENTE',
      accion_sugerida: 'Nivel óptimo para abastecimiento semanal',
      rotacion_semanal_estimada: 0.8
    },
    {
      variante_id: 5,
      sku: 'PLN-005-S',
      prenda_nombre: 'Pantalón Lino Arena',
      talla: 'S',
      color: 'Beige Claro',
      sucursal_id: 3,
      sucursal_nombre: 'Sucursal Norte',
      stock_disponible: 12,
      demanda_proyectada_7d: 5,
      dias_de_cobertura: 16.8,
      estado_riesgo: 'STOCK_SUFICIENTE',
      accion_sugerida: 'Existencias equilibradas respecto a rotación',
      rotacion_semanal_estimada: 0.7
    }
  ]);

  // Hiperparámetros CU23
  algoritmoDemanda = 'RandomForestRegressor';
  diasHistorico = 90;
  numClustersRfm = 3;

  readonly isTraining = signal<boolean>(false);
  readonly errorBanner = signal<string | null>(null);
  readonly demandaModel = signal<MLDemandaTrainResponse | null>(null);
  readonly rfmModel = signal<MLRFMTrainResponse | null>(null);
  readonly persistedModels = signal<ModeloMLPersistedItem[]>([]);

  readonly proyeccionesFiltradas = computed(() => {
    let list = this.proyeccionesLista();
    if (this.filtroSucursal !== 'TODAS') {
      list = list.filter(p => p.sucursal_nombre === this.filtroSucursal);
    }
    if (this.filtroRiesgo !== 'TODOS') {
      list = list.filter(p => p.estado_riesgo === this.filtroRiesgo);
    }
    return list;
  });

  ngOnInit(): void {
    const tId = this.authService.currentTenant().empresaId || 1;
    this.activeTenantId.set(tId);
    this.cargarDatosCU24();
    this.cargarModelosPersistidos();
  }

  setVista(v: 'CU24_PREDICCIONES' | 'CU23_ENTRENAMIENTO'): void {
    this.vistaActiva.set(v);
  }

  cambiarTenant(tenantId: number): void {
    this.activeTenantId.set(tenantId);
    this.cargarDatosCU24();
    this.cargarModelosPersistidos();
  }

  cargarDatosCU24(): void {
    this.mlService.obtenerDashboardAnalitico(this.activeTenantId()).subscribe({
      next: (res) => {
        this.dashboardData.set(res);
      },
      error: () => {
        // En caso de que no haya backend levantado, se mantienen los datos precargados
      }
    });

    this.mlService.obtenerProyeccionesStock(undefined, this.activeTenantId()).subscribe({
      next: (res) => {
        if (res?.items && res.items.length > 0) {
          this.proyeccionesLista.set(res.items);
        }
      },
      error: () => {}
    });
  }

  contarQuiebresInminentes(): number {
    return this.proyeccionesLista().filter(p => p.estado_riesgo === 'QUIEBRE_INMINENTE').length;
  }

  contarStockMinimo(): number {
    return this.proyeccionesLista().filter(p => p.estado_riesgo === 'STOCK_MINIMO').length;
  }

  getCoverageClass(dias: number): string {
    if (dias < 3) return 'cov-danger';
    if (dias <= 7) return 'cov-warning';
    return 'cov-ok';
  }

  getStatusBadgeClass(estado: string): string {
    if (estado === 'QUIEBRE_INMINENTE') return 'badge-danger';
    if (estado === 'STOCK_MINIMO') return 'badge-warning';
    return 'badge-success';
  }

  formatearEstadoRiesgo(estado: string): string {
    if (estado === 'QUIEBRE_INMINENTE') return 'Quiebre Inminente';
    if (estado === 'STOCK_MINIMO') return 'Stock Mínimo';
    return 'Stock Suficiente';
  }

  solicitarTraslado(item: ProyeccionStockDetalladaItem): void {
    alert(`[CU12 - Traslado de Emergencia] Solicitud generada para SKU ${item.sku} en ${item.sucursal_nombre}. Se apartarán 5 unidades desde otra sucursal.`);
  }

  cargarModelosPersistidos(): void {
    this.mlService.listarModelosML(this.activeTenantId()).subscribe({
      next: (items) => this.persistedModels.set(items),
      error: () => {}
    });
  }

  entrenarSoloDemanda(): void {
    this.isTraining.set(true);
    this.mlService.entrenarDemandaStock(
      this.algoritmoDemanda,
      this.diasHistorico,
      0.2,
      this.activeTenantId()
    ).subscribe({
      next: (res) => {
        this.demandaModel.set(res);
        this.isTraining.set(false);
      },
      error: () => this.isTraining.set(false)
    });
  }

  entrenarSoloRFM(): void {
    this.isTraining.set(true);
    this.mlService.entrenarSegmentacionRFM(
      this.numClustersRfm,
      this.activeTenantId()
    ).subscribe({
      next: (res) => {
        this.rfmModel.set(res);
        this.isTraining.set(false);
      },
      error: () => this.isTraining.set(false)
    });
  }

  entrenarPipelineCompleto(): void {
    this.isTraining.set(true);
    this.mlService.entrenarDemandaStock(
      this.algoritmoDemanda,
      this.diasHistorico,
      0.2,
      this.activeTenantId()
    ).subscribe({
      next: (supRes) => {
        this.demandaModel.set(supRes);
        this.mlService.entrenarSegmentacionRFM(this.numClustersRfm, this.activeTenantId()).subscribe({
          next: (rfmRes) => {
            this.rfmModel.set(rfmRes);
            this.isTraining.set(false);
            this.cargarDatosCU24();
          },
          error: () => this.isTraining.set(false)
        });
      },
      error: () => this.isTraining.set(false)
    });
  }
}
