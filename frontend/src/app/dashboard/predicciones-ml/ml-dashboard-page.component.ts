// ==============================================================================
// CASOS DE USO:
// - CU23: ENTRENAR Y EVALUAR MODELOS DE MACHINE LEARNING (SCIKIT-LEARN)
// - CU24: VISUALIZAR DASHBOARD ANALÍTICO Y PREDICCIONES DE STOCK A 7 DÍAS
// ROL: Superadmin Tenant / Admin Tenant
// CAPA MVC: [VISTA & VIEWCONTROLLER ANGULAR]
// ==============================================================================

// ==============================================================================
// CASOS DE USO:
// - CU23: ENTRENAR Y EVALUAR MODELOS DE MACHINE LEARNING (SCIKIT-LEARN)
// - CU24: VISUALIZAR DASHBOARD ANALÍTICO Y PREDICCIONES DE STOCK A 7 DÍAS
// ROL: Superadmin Tenant / Admin Tenant
// CAPA MVC: [VISTA & VIEWCONTROLLER ANGULAR]
// ==============================================================================

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import {
  FashionAiMlService,
  MLDemandaTrainResponse,
  MLRFMTrainResponse,
  ModeloMLPersistedItem,
  ProyeccionStockItem,
  DashboardAnaliticoMLResponse,
  ProyeccionStockDetalladaItem
} from './fashion-ai-ml.service';


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

        <!-- =============================================================== -->
        <!-- VISTA CU24: DASHBOARD ANALÍTICO Y PREDICCIONES A 7 DÍAS         -->
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
                  {{ dashboardData()?.total_variantes_evaluadas || proyeccionesCU24Filtradas().length || 18 }}
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
                  <span class="table-count">Mostrando {{ proyeccionesCU24Filtradas().length }} variantes evaluadas</span>
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
                    <select [(ngModel)]="filtroRiesgoCU24" class="filter-select">
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
                    @for (item of proyeccionesCU24Filtradas(); track item.sku + item.sucursal_nombre) {
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

        <!-- =============================================================== -->
        <!-- VISTA CU23: LABORATORIO DE MACHINE LEARNING (SCIKIT-LEARN)      -->
        <!-- =============================================================== -->
        @if (vistaActiva() === 'CU23_ENTRENAMIENTO') {
          <div class="cu23-view-wrapper">
            <!-- =============================================================== -->
        <!-- ENCABEZADO EJECUTIVO ELEGANTE Y COMPACTO                        -->
        <!-- =============================================================== -->
        <header class="ml-hero-header">
          <div class="hero-main">
            <div class="header-icon-badge">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <div class="header-titles">
              <h1 class="header-title">Laboratorio de Machine Learning</h1>
              <p class="header-subtitle">Modelos predictivos de demanda y segmentación inteligente de clientes para tu boutique.</p>
            </div>
          </div>

          <div class="header-controls">
            <!-- Indicador discreto de Tienda y Plan Activo -->
            <div class="tenant-status-pill" [title]="'Empresa: ' + authService.currentTenant().nombreEmpresa">
              <span class="tenant-dot"></span>
              <span class="tenant-name">{{ authService.currentTenant().nombreEmpresa }}</span>
              <span class="tenant-plan-tag" [class.vip]="authService.currentTenant().planCodigo === 'VIP'">
                {{ authService.currentTenant().planCodigo }}
              </span>
            </div>

            <!-- Botones de Navegación del Módulo -->
            <div class="header-nav-group">
              <a routerLink="/dashboard" class="btn-nav-subtle">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="9"/>
                  <rect x="14" y="3" width="7" height="5"/>
                  <rect x="14" y="12" width="7" height="9"/>
                  <rect x="3" y="16" width="7" height="5"/>
                </svg>
                <span>Dashboard BI</span>
              </a>
              <a routerLink="/dashboard/ia-reportes" class="btn-nav-accent">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                <span>Asistente de Reportes IA</span>
              </a>
            </div>
          </div>
        </header>

        <!-- =============================================================== -->
        <!-- CONSOLA DE HIPERPARÁMETROS Y ENTRENAMIENTO                      -->
        <!-- =============================================================== -->
        <section class="hyperparams-bar">
          <div class="params-inputs-row">
            <div class="param-group">
              <label>Algoritmo Predictivo</label>
              <select [(ngModel)]="algoritmoDemanda" class="param-select">
                <option value="RandomForestRegressor">Random Forest (Ensamble)</option>
                <option value="RidgeRegression">Ridge Regression (Lineal L2)</option>
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
              <label>Grupos Clientes (K-Means)</label>
              <select [(ngModel)]="numClustersRfm" class="param-select">
                <option [ngValue]="2">2 segmentos comerciales</option>
                <option [ngValue]="3">3 segmentos (Recomendado)</option>
                <option [ngValue]="4">4 segmentos comerciales</option>
                <option [ngValue]="5">5 segmentos comerciales</option>
              </select>
            </div>
          </div>

          <div class="train-buttons-group">
            <button
              type="button"
              class="btn-train-subtle"
              [disabled]="isTraining()"
              (click)="entrenarSoloDemanda()">
              <span>Entrenar Demanda</span>
            </button>
            <button
              type="button"
              class="btn-train-subtle"
              [disabled]="isTraining()"
              (click)="entrenarSoloRfm()">
              <span>Entrenar Clientes</span>
            </button>
            <button
              type="button"
              class="btn-train-primary"
              [disabled]="isTraining()"
              (click)="entrenarPipelineCompleto()">
              @if (isTraining()) {
                <span class="spinner-sm"></span>
                <span>Entrenando Modelos...</span>
              } @else {
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                <span>Re-entrenar Modelos</span>
              }
            </button>
          </div>
        </section>

        <!-- Banner de Restricción o Error -->
        @if (errorBanner()) {
          <section class="ml-error-banner">
            <div class="error-icon-box">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div class="error-text">
              <strong class="error-heading">{{ errorStatus() === 403 ? 'Acceso no disponible en el plan actual:' : 'No se pudo completar la operación de Machine Learning:' }}</strong>
              <p class="error-msg">{{ errorBanner() }}</p>
            </div>
          </section>
        }

        <!-- =============================================================== -->
        <!-- SECCIÓN 1: PREDICCIÓN DE DEMANDA DE STOCK                       -->
        <!-- =============================================================== -->
        @if (demandaModel(); as sup) {
          <section class="paradigm-section">
            <div class="paradigm-header">
              <div class="paradigm-title-block">
                <span class="paradigm-tag supervised">PREDICCIÓN DE DEMANDA</span>
                <h2 class="paradigm-name">{{ sup.nombre_modelo }} <span class="model-id">#{{ sup.modelo_id }}</span></h2>
              </div>
              <div class="target-indicator">
                <span class="target-lbl">Variable Objetivo:</span>
                <span class="target-pill">{{ sup.variable_objetivo }}</span>
              </div>
            </div>

            <!-- Tarjetas de Métricas de Calidad del Modelo -->
            <div class="metrics-trio-grid">
              <article class="metric-card">
                <div class="m-top">
                  <span class="m-name">PRECISIÓN DEL MODELO (R²)</span>
                  <span class="m-status-pill" [class.ok]="sup.precision_r2 >= 0.70">
                    {{ sup.precision_r2 >= 0.70 ? 'Excelente (≥ 70%)' : 'Aceptable' }}
                  </span>
                </div>
                <div class="m-value">{{ (sup.precision_r2 * 100) | number:'1.1-1' }}%</div>
                <div class="m-foot">Porcentaje de variabilidad de ventas explicada</div>
              </article>

              <article class="metric-card">
                <div class="m-top">
                  <span class="m-name">ERROR ABSOLUTO MEDIO (MAE)</span>
                  <span class="m-unit">prendas/día</span>
                </div>
                <div class="m-value">{{ sup.mae | number:'1.2-2' }}</div>
                <div class="m-foot">Desviación promedio en unidades por prenda</div>
              </article>

              <article class="metric-card">
                <div class="m-top">
                  <span class="m-name">ERROR CUADRÁTICO (RMSE)</span>
                  <span class="m-unit">prendas/día</span>
                </div>
                <div class="m-value">{{ sup.rmse | number:'1.2-2' }}</div>
                <div class="m-foot">Sensibilidad ante picos de demanda estacionales</div>
              </article>
            </div>

            <!-- Gráfico Comparativo + Importancia de Variables -->
            <div class="sup-visuals-grid">
              <article class="chart-card">
                <div class="chart-card-head">
                  <div class="chart-title-wrap">
                    <h3 class="card-title">Comparativa: Demanda Real vs. Predicción</h3>
                    @if (hoveredDemanda(); as h) {
                      <div class="hover-demanda-tooltip">
                        <span class="h-sample">Muestra #{{ h.indice }}:</span>
                        <span class="h-real">Real <b>{{ h.demanda_real }} uds</b></span>
                        <span class="h-sep">&bull;</span>
                        <span class="h-pred">Pred <b>{{ h.demanda_predicha }} uds</b></span>
                        <span class="h-diff" [class.diff-up]="h.demanda_predicha >= h.demanda_real" [class.diff-down]="h.demanda_predicha < h.demanda_real">
                          ({{ h.demanda_predicha >= h.demanda_real ? '+' : '' }}{{ (h.demanda_predicha - h.demanda_real) | number:'1.1-1' }})
                        </span>
                      </div>
                    }
                  </div>
                  <div class="legend-inline">
                    <span><i class="lg-dot real"></i> Real</span>
                    <span><i class="lg-dot pred"></i> Predicha</span>
                  </div>
                </div>

                <div class="chart-svg-container">
                  <svg class="svg-chart" viewBox="0 0 640 232">
                    <!-- Cuadrícula horizontal y coordenadas del Eje Y -->
                    <text x="45" y="14" text-anchor="end" font-size="8" font-weight="700" fill="#94A3B8">UDS</text>
                    <text x="45" y="29" text-anchor="end" font-size="9" font-weight="600" fill="#64748B">{{ demandaMaxVal() }}</text>
                    <line x1="50" y1="25" x2="620" y2="25" stroke="#E5E9F0" stroke-width="1" stroke-dasharray="4,4" />

                    <text x="45" y="109" text-anchor="end" font-size="9" font-weight="600" fill="#64748B">{{ demandaMidVal() }}</text>
                    <line x1="50" y1="105" x2="620" y2="105" stroke="#E5E9F0" stroke-width="1" stroke-dasharray="4,4" />

                    <text x="45" y="189" text-anchor="end" font-size="9" font-weight="600" fill="#64748B">0</text>
                    <line x1="50" y1="185" x2="620" y2="185" stroke="#CBD5E1" stroke-width="1.4" />

                    <!-- Línea de Demanda Real (Azul Noche) -->
                    <polyline
                      [attr.points]="demandaRealPolyline()"
                      fill="none"
                      stroke="#17243A"
                      stroke-width="2.6"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />

                    <!-- Línea de Demanda Predicha (Dorado Champán Punteado) -->
                    <polyline
                      [attr.points]="demandaPredPolyline()"
                      fill="none"
                      stroke="#C6A56B"
                      stroke-width="2.6"
                      stroke-dasharray="6,4"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />

                    <!-- Marcas y Coordenadas del Eje X -->
                    @for (pt of demandaCoords(); track pt.indice) {
                      <!-- Guía vertical interactiva al hacer hover -->
                      @if (hoveredDemanda()?.indice === pt.indice) {
                        <line [attr.x1]="pt.x" y1="25" [attr.x2]="pt.x" y2="185" stroke="#C6A56B" stroke-width="1.2" stroke-dasharray="3,3" />
                      }

                      <!-- Tick del eje X -->
                      <line [attr.x1]="pt.x" y1="185" [attr.x2]="pt.x" y2="190" stroke="#CBD5E1" stroke-width="1.2" />

                      <!-- Coordenada limpia del punto: #1, #2, #3... sin superposición -->
                      <text
                        [attr.x]="pt.x"
                        y="202"
                        text-anchor="middle"
                        font-size="9"
                        [attr.font-weight]="hoveredDemanda()?.indice === pt.indice ? '800' : '600'"
                        [attr.fill]="hoveredDemanda()?.indice === pt.indice ? '#17243A' : '#64748B'"
                        style="cursor: pointer;"
                        (mouseenter)="hoveredDemanda.set(pt)"
                        (mouseleave)="hoveredDemanda.set(null)">
                        #{{ pt.indice }}
                      </text>

                      <!-- Puntos interactivos con tooltip y borde blanco para evitar mezcla -->
                      <circle
                        class="chart-point"
                        [attr.cx]="pt.x"
                        [attr.cy]="pt.yReal"
                        [attr.r]="hoveredDemanda()?.indice === pt.indice ? 6 : 4.5"
                        fill="#17243A"
                        stroke="#FFFFFF"
                        stroke-width="1.5"
                        (mouseenter)="hoveredDemanda.set(pt)"
                        (mouseleave)="hoveredDemanda.set(null)">
                        <title>Muestra #{{ pt.indice }} — Demanda Real: {{ pt.demanda_real }} unidades</title>
                      </circle>

                      <circle
                        class="chart-point"
                        [attr.cx]="pt.x"
                        [attr.cy]="pt.yPred"
                        [attr.r]="hoveredDemanda()?.indice === pt.indice ? 6 : 4.5"
                        fill="#C6A56B"
                        stroke="#FFFFFF"
                        stroke-width="1.5"
                        (mouseenter)="hoveredDemanda.set(pt)"
                        (mouseleave)="hoveredDemanda.set(null)">
                        <title>Muestra #{{ pt.indice }} — Demanda Predicha: {{ pt.demanda_predicha }} unidades</title>
                      </circle>
                    }

                    <!-- Título del Eje X -->
                    <text x="335" y="222" text-anchor="middle" font-size="9.5" font-weight="600" fill="#64748B">
                      Muestras del Conjunto de Prueba (#1 al #{{ demandaCoords().length }})
                    </text>
                  </svg>
                </div>
              </article>

              <article class="chart-card">
                <div class="chart-card-head">
                  <h3 class="card-title">Factores Clave de Demanda</h3>
                </div>
                <div class="feature-bars">
                  @for (feat of sup.importancia_variables; track feat.variable) {
                    <div class="feat-row">
                      <div class="feat-lbl-line">
                        <span class="feat-name">{{ feat.variable }}</span>
                        <span class="feat-pct">{{ feat.importancia_pct | number:'1.1-1' }}%</span>
                      </div>
                      <div class="feat-track">
                        <div class="feat-fill" [style.width.%]="feat.importancia_pct"></div>
                      </div>
                    </div>
                  }
                </div>
              </article>
            </div>

            <!-- =========================================================== -->
            <!-- TABLA INTERACTIVA DE PROYECCIÓN DE STOCK (COLOR PIEL / NUDE) -->
            <!-- =========================================================== -->
            <article class="projection-table-card">
              <div class="table-interactive-toolbar">
                <div class="toolbar-title-block">
                  <h3 class="card-title">Pronóstico de Stock a 7 Días y Alerta de Quiebre</h3>
                  <span class="sub-note">Cálculo predictivo sobre inventario y rotación por SKU</span>
                </div>

                <!-- Controles Interactivos: Filtros de Riesgo y Buscador -->
                <div class="toolbar-actions-block">
                  <div class="filter-pills-row">
                    <button
                      type="button"
                      class="filter-pill"
                      [class.is-active]="filtroRiesgo() === 'TODOS'"
                      (click)="filtroRiesgo.set('TODOS')">
                      Todos ({{ sup.proyecciones_stock.length }})
                    </button>
                    <button
                      type="button"
                      class="filter-pill pill-risk"
                      [class.is-active]="filtroRiesgo() === 'RIESGO'"
                      (click)="filtroRiesgo.set('RIESGO')">
                      Alto Riesgo
                    </button>
                    <button
                      type="button"
                      class="filter-pill pill-safe"
                      [class.is-active]="filtroRiesgo() === 'OPTIMO'"
                      (click)="filtroRiesgo.set('OPTIMO')">
                      Stock Óptimo
                    </button>
                  </div>

                  <div class="search-mini-box">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="11" cy="11" r="8"/>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      type="text"
                      [ngModel]="busquedaPrenda()"
                      (ngModelChange)="busquedaPrenda.set($event)"
                      placeholder="Buscar prenda o tienda..."
                    />
                  </div>
                </div>
              </div>

              <!-- Contenedor Responsive con Cabecera "Color Piel" Elegante -->
              <div class="table-responsive-wrapper">
                <table class="saas-table skin-tone-table">
                  <thead>
                    <tr>
                      <th>PRENDA / SKU</th>
                      <th class="col-center">TALLA</th>
                      <th>SUCURSAL</th>
                      <th class="cell-right">STOCK ACTUAL</th>
                      <th class="cell-right">DEMANDA PROYECTADA (7D)</th>
                      <th class="col-center">ESTADO DE QUIEBRE</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of proyeccionesFiltradas(); track $index) {
                      <tr class="interactive-row">
                        <td class="cell-bold">{{ item.prenda }}</td>
                        <td class="col-center">
                          <span class="size-badge">{{ item.talla }}</span>
                        </td>
                        <td>{{ item.sucursal }}</td>
                        <td class="cell-right font-numeric" [class.negative-stock]="item.stock_actual <= 0">
                          {{ formatStockQty(item.stock_actual) }}
                        </td>
                        <td class="cell-right font-numeric font-highlight">
                          {{ item.demanda_proyectada_7d }} uds.
                        </td>
                        <td class="col-center">
                          <span class="risk-badge" [ngClass]="getRiskClass(item.riesgo_quiebre)">
                            {{ formatRiskLabel(item.riesgo_quiebre) }}
                          </span>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6" class="empty-table-cell">
                          No se encontraron prendas que coincidan con el filtro aplicado.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        }

        <!-- =============================================================== -->
        <!-- SECCIÓN 2: SEGMENTACIÓN DE CLIENTES (RFM K-MEANS)               -->
        <!-- =============================================================== -->
        @if (rfmModel(); as rfm) {
          <section class="paradigm-section">
            <div class="paradigm-header">
              <div class="paradigm-title-block">
                <span class="paradigm-tag unsupervised">SEGMENTACIÓN DE CLIENTES</span>
                <h2 class="paradigm-name">{{ rfm.nombre_modelo }} <span class="model-id">#{{ rfm.modelo_id }}</span></h2>
              </div>
              <div class="target-indicator">
                <span class="target-lbl">Estrategia:</span>
                <span class="target-pill">Clustering K-Means (RFM)</span>
              </div>
            </div>

            <!-- Métricas de Clustering -->
            <div class="metrics-trio-grid">
              <article class="metric-card">
                <div class="m-top">
                  <span class="m-name">COEFICIENTE DE SILUETA</span>
                  <span class="m-status-pill" [class.ok]="rfm.silhouette_score > 0.25">
                    {{ rfm.silhouette_score > 0.25 ? 'Separación Óptima' : 'Solapado' }}
                  </span>
                </div>
                <div class="m-value">{{ rfm.silhouette_score | number:'1.3-3' }}</div>
                <div class="m-foot">Calidad de separación entre perfiles de compra</div>
              </article>

              <article class="metric-card">
                <div class="m-top">
                  <span class="m-name">INERCIA INTRA-CLUSTER (WCSS)</span>
                  <span class="m-unit">{{ rfm.num_clusters }} grupos</span>
                </div>
                <div class="m-value">{{ rfm.inercia_wcss | number:'1.0-0' }}</div>
                <div class="m-foot">Compacidad y coherencia interna del segmento</div>
              </article>

              <article class="metric-card">
                <div class="m-top">
                  <span class="m-name">CLIENTES ANALIZADOS</span>
                  <span class="m-unit">Activos</span>
                </div>
                <div class="m-value">{{ rfm.total_clientes_analizados }}</div>
                <div class="m-foot">Clientes únicos con historial de compras</div>
              </article>
            </div>

            <!-- Gráficos de Segmentos: Dispersión RFM + Método del Codo -->
            <div class="sup-visuals-grid">
              <article class="chart-card">
                <div class="chart-card-head">
                  <h3 class="card-title">Mapa de Clientes: Frecuencia vs. Gasto (Bs.)</h3>
                  <span class="sub-note">Puntos coloreados por segmento de valor</span>
                </div>
                <div class="chart-svg-container">
                  <svg class="svg-chart" viewBox="0 0 640 230">
                    <line x1="55" y1="20" x2="55" y2="195" stroke="#CBD5E1" stroke-width="1.4" />
                    <line x1="55" y1="195" x2="615" y2="195" stroke="#CBD5E1" stroke-width="1.4" />
                    <text x="335" y="220" text-anchor="middle" font-size="10" font-weight="700" fill="#475569">
                      Frecuencia de Compras (Transacciones) &rarr;
                    </text>
                    <text x="16" y="110" text-anchor="middle" font-size="10" font-weight="700" fill="#475569" transform="rotate(-90, 16, 110)">
                      Gasto Acumulado (Bs.) &rarr;
                    </text>

                    @for (pt of rfmScatterCoords(); track $index) {
                      <circle
                        [attr.cx]="pt.cx"
                        [attr.cy]="pt.cy"
                        r="5.5"
                        [attr.fill]="pt.color"
                        fill-opacity="0.85"
                        stroke="#FFFFFF"
                        stroke-width="1.2">
                        <title>{{ pt.cliente }} — {{ pt.segmento }} ({{ pt.frecuencia_compras }} compras, Bs. {{ pt.monto_total_bs }})</title>
                      </circle>
                    }
                  </svg>
                </div>
              </article>

              <article class="chart-card">
                <div class="chart-card-head">
                  <h3 class="card-title">Curva de Optimización (Método del Codo)</h3>
                  <span class="sub-note">Evaluación de k = 2..6 clusters</span>
                </div>
                <div class="chart-svg-container">
                  <svg class="svg-chart" viewBox="0 0 360 220">
                    <line x1="45" y1="25" x2="45" y2="185" stroke="#CBD5E1" stroke-width="1.4" />
                    <line x1="45" y1="185" x2="335" y2="185" stroke="#CBD5E1" stroke-width="1.4" />

                    <polyline
                      [attr.points]="elbowPolyline()"
                      fill="none"
                      stroke="#C6A56B"
                      stroke-width="2.6"
                      stroke-linecap="round"
                    />

                    @for (ek of elbowCoords(); track ek.k) {
                      <circle
                        [attr.cx]="ek.x"
                        [attr.cy]="ek.y"
                        [attr.r]="ek.k === rfm.num_clusters ? 6.5 : 4"
                        [attr.fill]="ek.k === rfm.num_clusters ? '#087F6D' : '#C6A56B'"
                        stroke="#FFFFFF"
                        stroke-width="1.5"
                      />
                      <text [attr.x]="ek.x" y="203" text-anchor="middle" font-size="10" font-weight="700" fill="#202938">
                        k={{ ek.k }}
                      </text>
                      <text [attr.x]="ek.x" [attr.y]="ek.y - 10" text-anchor="middle" font-size="9" font-weight="600" fill="#64748B">
                        {{ ek.wcss | number:'1.0-0' }}
                      </text>
                    }
                  </svg>
                </div>
              </article>
            </div>

            <!-- Tarjetas de Perfiles de Clientes -->
            <div class="clusters-cards-grid">
              @for (cl of rfm.perfiles_clusters; track cl.cluster) {
                <article class="cluster-profile-card" [style.border-top-color]="cl.color_hex">
                  <div class="cl-head">
                    <span class="cl-dot" [style.background]="cl.color_hex"></span>
                    <span class="cl-title">{{ cl.nombre }}</span>
                    <span class="cl-count">{{ cl.cantidad_clientes }} clientes</span>
                  </div>
                  <div class="cl-kpis">
                    <div class="kpi-mini">
                      <span class="k-lbl">Recencia Media</span>
                      <span class="k-val">{{ cl.recencia_dias | number:'1.1-1' }} días</span>
                    </div>
                    <div class="kpi-mini">
                      <span class="k-lbl">Frecuencia</span>
                      <span class="k-val">{{ cl.frecuencia_compras | number:'1.1-1' }} pedidos</span>
                    </div>
                    <div class="kpi-mini">
                      <span class="k-lbl">Gasto Medio</span>
                      <span class="k-val">Bs. {{ cl.gasto_medio_bs | number:'1.0-0' }}</span>
                    </div>
                  </div>
                  <div class="cl-action-box">
                    <strong class="action-tag">Estrategia recomendada:</strong>
                    <p class="action-body">{{ cl.accion_sugerida }}</p>
                  </div>
                </article>
              }
            </div>
          </section>
        }

        <!-- =============================================================== -->
        <!-- HISTORIAL DE MODELOS PERSISTIDOS (COLOR PIEL / NUDE)            -->
        <!-- =============================================================== -->
        <section class="projection-table-card">
          <div class="table-interactive-toolbar">
            <div class="toolbar-title-block">
              <h3 class="card-title">Historial de Modelos Entrenados</h3>
              <span class="sub-note">{{ persistedModels().length }} ejecuciones registradas para esta empresa</span>
            </div>
          </div>

          <div class="table-responsive-wrapper">
            <table class="saas-table skin-tone-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>MODELO</th>
                  <th>TIPO</th>
                  <th>OBJETIVO</th>
                  <th class="cell-right">MÉTRICA</th>
                  <th>FECHA</th>
                  <th class="col-center">ESTADO</th>
                </tr>
              </thead>
              <tbody>
                @for (m of persistedModels(); track m.id) {
                  <tr>
                    <td class="cell-bold">#{{ m.id }}</td>
                    <td class="cell-bold">{{ m.nombre_modelo }}</td>
                    <td>
                      <span class="paradigm-mini" [class.sup]="m.tipo_aprendizaje === 'SUPERVISADO'">
                        {{ m.tipo_aprendizaje === 'SUPERVISADO' ? 'Supervisado' : 'Clustering' }}
                      </span>
                    </td>
                    <td><code>{{ m.variable_objetivo || 'Cluster RFM' }}</code></td>
                    <td class="cell-right font-numeric font-highlight">
                      {{ m.precision_metrica !== null && m.precision_metrica !== undefined ? (m.precision_metrica | number:'1.4-4') : '—' }}
                    </td>
                    <td>{{ m.fecha_entrenamiento | date:'dd MMM yyyy, HH:mm' }}</td>
                    <td class="col-center">
                      <span class="active-dot-pill">
                        <i class="dot-online"></i> Activo
                      </span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="empty-table-cell">
                      Aún no hay modelos entrenados registrados en la base de datos.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
          </div>
        }

      </div>
    </div>
  `,
  styles: [`

    /* ==========================================================================
       SISTEMA DE DISEÑO FASHIONSTORE: LABORATORIO DE MACHINE LEARNING
       Paleta: #F8F9FC (Fondo) | #17243A (Primario) | #202938 (Texto)
               #C6A56B (Dorado Champán) | #F4EBE1 (Color Piel / Nude Elegante)
       ========================================================================== */

    :host {
      display: block;
      width: 100%;
      box-sizing: border-box;
      background: #F8F9FC;
    }

    .ml-page-shell {
      background: #F8F9FC;
      min-height: calc(100vh - 70px);
      padding: 1.5rem 1.75rem 3rem;
      color: #202938;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-sizing: border-box;
      overflow-x: hidden;
    }

    .ml-container {
      max-width: 1380px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      width: 100%;
      box-sizing: border-box;
    }

    /* --------------------------------------------------------------------------
       1. ENCABEZADO MODERNO Y ELEGANTE (FONDO CLARO CON ALTO CONTRASTE)
       -------------------------------------------------------------------------- */
    .ml-hero-header {
      background: #FFFFFF;
      border: 1px solid #E5E9F0;
      border-radius: 14px;
      padding: 1.25rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.25rem;
      box-shadow: 0 2px 8px rgba(23, 36, 58, 0.03);
      flex-wrap: wrap;
    }

    .hero-main {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      min-width: 280px;
    }

    .header-icon-badge {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #17243A;
      color: #C6A56B;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 3px 8px rgba(23, 36, 58, 0.15);
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .header-title {
      margin: 0;
      font-size: 1.35rem;
      font-weight: 700;
      color: #17243A;
      letter-spacing: -0.02em;
      line-height: 1.25;
    }

    .header-subtitle {
      margin: 0;
      font-size: 0.85rem;
      color: #64748B;
      line-height: 1.35;
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      flex-wrap: wrap;
    }

    .tenant-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #F8F9FC;
      border: 1px solid #E5E9F0;
      padding: 0.4rem 0.75rem;
      border-radius: 999px;
      font-size: 0.78rem;
      color: #202938;
      max-width: 280px;
    }

    .tenant-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #087F6D;
      flex-shrink: 0;
    }

    .tenant-name {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 150px;
    }

    .tenant-plan-tag {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: #E5E9F0;
      color: #17243A;
      letter-spacing: 0.04em;
    }

    .tenant-plan-tag.vip {
      background: #FBF7F0;
      color: #9A7738;
      border: 1px solid #E8DAC2;
    }

    .header-nav-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-nav-subtle {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.85rem;
      background: #FFFFFF;
      border: 1px solid #E5E9F0;
      border-radius: 8px;
      color: #202938;
      font-size: 0.8rem;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .btn-nav-subtle:hover {
      background: #F8F9FC;
      border-color: #CBD5E1;
      color: #17243A;
    }

    .btn-nav-accent {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.85rem;
      background: #17243A;
      border: 1px solid #17243A;
      border-radius: 8px;
      color: #FFFFFF;
      font-size: 0.8rem;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .btn-nav-accent:hover {
      background: #0F1826;
      border-color: #0F1826;
      box-shadow: 0 2px 6px rgba(23, 36, 58, 0.15);
    }

    /* --------------------------------------------------------------------------
       2. BARRA DE HIPERPARÁMETROS Y ENTRENAMIENTO
       -------------------------------------------------------------------------- */
    .hyperparams-bar {
      background: #FFFFFF;
      border: 1px solid #E5E9F0;
      border-radius: 14px;
      padding: 1.15rem 1.35rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 1.25rem;
      flex-wrap: wrap;
      box-shadow: 0 2px 10px rgba(23, 36, 58, 0.03);
    }

    .params-inputs-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .param-group {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .param-group label {
      font-size: 0.72rem;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .param-select {
      padding: 0.45rem 0.75rem;
      border-radius: 8px;
      border: 1px solid #E5E9F0;
      font-size: 0.82rem;
      font-weight: 600;
      color: #202938;
      background: #F8F9FC;
      outline: none;
      transition: all 0.15s ease;
      cursor: pointer;
    }

    .param-select:focus {
      border-color: #C6A56B;
      background: #FFFFFF;
      box-shadow: 0 0 0 3px rgba(198, 165, 107, 0.15);
    }

    .train-buttons-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .btn-train-subtle {
      padding: 0.5rem 0.85rem;
      border-radius: 8px;
      border: 1px solid #E5E9F0;
      background: #FFFFFF;
      color: #202938;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-train-subtle:hover:not(:disabled) {
      background: #F8F9FC;
      border-color: #CBD5E1;
      color: #17243A;
    }

    .btn-train-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.55rem 1.15rem;
      border-radius: 8px;
      border: none;
      background: #17243A;
      color: #FFFFFF;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-train-primary:hover:not(:disabled) {
      background: #0F1826;
      box-shadow: 0 3px 8px rgba(23, 36, 58, 0.18);
    }

    .btn-train-primary:disabled, .btn-train-subtle:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .spinner-sm {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #FFFFFF;
      border-radius: 50%;
      animation: spin 0.7s infinite linear;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* --------------------------------------------------------------------------
       3. ALERTAS DE ERROR O PLAN
       -------------------------------------------------------------------------- */
    .ml-error-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      border-radius: 10px;
      padding: 0.85rem 1.15rem;
      color: #92400E;
    }

    .error-icon-box {
      margin-top: 2px;
      flex-shrink: 0;
    }

    .error-heading {
      font-size: 0.85rem;
      font-weight: 700;
    }

    .error-msg {
      margin: 0.15rem 0 0;
      font-size: 0.8rem;
      line-height: 1.4;
    }

    /* --------------------------------------------------------------------------
       4. SECCIONES DE PARADIGMAS (SUPERVISADO / NO SUPERVISADO)
       -------------------------------------------------------------------------- */
    .paradigm-section {
      background: #FFFFFF;
      border: 1px solid #E5E9F0;
      border-radius: 14px;
      padding: 1.35rem 1.5rem;
      box-shadow: 0 2px 10px rgba(23, 36, 58, 0.03);
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .paradigm-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding-bottom: 0.9rem;
      border-bottom: 1px solid #F1F5F9;
    }

    .paradigm-title-block {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .paradigm-tag {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 4px;
      width: fit-content;
    }

    .paradigm-tag.supervised {
      background: #F4EBE1;
      color: #8C6D48;
    }

    .paradigm-tag.unsupervised {
      background: #EBF3F5;
      color: #2B6E7F;
    }

    .paradigm-name {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #17243A;
    }

    .model-id {
      font-size: 0.8rem;
      color: #94A3B8;
      font-weight: 500;
    }

    .target-indicator {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.78rem;
      color: #64748B;
    }

    .target-lbl {
      font-weight: 600;
    }

    .target-pill {
      background: #F8F9FC;
      border: 1px solid #E5E9F0;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 700;
      color: #17243A;
      font-size: 0.75rem;
    }

    /* --------------------------------------------------------------------------
       5. TARJETAS DE MÉTRICAS (R², MAE, RMSE / SILHOUETTE, WCSS, CLIENTES)
       -------------------------------------------------------------------------- */
    .metrics-trio-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
    }

    @media (max-width: 900px) {
      .metrics-trio-grid { grid-template-columns: 1fr; }
    }

    .metric-card {
      background: #FFFFFF;
      border: 1px solid #E5E9F0;
      border-radius: 10px;
      padding: 1.05rem 1.15rem;
      box-shadow: 0 1px 4px rgba(23, 36, 58, 0.02);
      transition: all 0.15s ease;
    }

    .metric-card:hover {
      border-color: #C6A56B;
      transform: translateY(-1px);
    }

    .m-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 0.4rem;
    }

    .m-name {
      font-size: 0.68rem;
      font-weight: 700;
      color: #64748B;
      letter-spacing: 0.04em;
    }

    .m-status-pill {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: #FEF3C7;
      color: #92400E;
    }

    .m-status-pill.ok {
      background: #E6F5F2;
      color: #087F6D;
    }

    .m-unit {
      font-size: 0.68rem;
      font-weight: 600;
      color: #94A3B8;
    }

    .m-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: #17243A;
      font-variant-numeric: tabular-nums;
      line-height: 1.15;
    }

    .m-foot {
      font-size: 0.74rem;
      color: #94A3B8;
      margin-top: 0.35rem;
      line-height: 1.35;
    }

    /* --------------------------------------------------------------------------
       6. GRÁFICOS Y VISUALIZACIONES
       -------------------------------------------------------------------------- */
    .sup-visuals-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.8fr) minmax(280px, 1fr);
      gap: 1rem;
    }

    @media (max-width: 980px) {
      .sup-visuals-grid { grid-template-columns: 1fr; }
    }

    .chart-card {
      background: #FFFFFF;
      border: 1px solid #E5E9F0;
      border-radius: 10px;
      padding: 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .chart-card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .chart-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .hover-demanda-tooltip {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #F4EBE1;
      border: 1px solid #E6D8C8;
      border-radius: 6px;
      padding: 3px 9px;
      font-size: 0.74rem;
      color: #17243A;
      animation: fadeInTooltip 0.15s ease-out;
    }

    @keyframes fadeInTooltip {
      from { opacity: 0; transform: translateY(-2px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .hover-demanda-tooltip .h-sample {
      font-weight: 700;
      color: #8C6D48;
    }

    .hover-demanda-tooltip .h-real {
      color: #17243A;
    }

    .hover-demanda-tooltip .h-pred {
      color: #8C6D48;
    }

    .hover-demanda-tooltip .h-sep {
      color: #CBD5E1;
    }

    .hover-demanda-tooltip .h-diff {
      font-weight: 700;
      font-size: 0.7rem;
      padding: 1px 5px;
      border-radius: 4px;
    }

    .hover-demanda-tooltip .h-diff.diff-up {
      background: #DCFCE7;
      color: #166534;
    }

    .hover-demanda-tooltip .h-diff.diff-down {
      background: #FEE2E2;
      color: #991B1B;
    }

    .chart-point {
      cursor: pointer;
      transition: r 0.15s ease, filter 0.15s ease;
    }

    .chart-point:hover {
      filter: drop-shadow(0 2px 4px rgba(23, 36, 58, 0.25));
    }

    .card-title {
      margin: 0;
      font-size: 0.92rem;
      font-weight: 700;
      color: #17243A;
    }

    .sub-note {
      font-size: 0.74rem;
      color: #94A3B8;
    }

    .legend-inline {
      display: flex;
      gap: 0.75rem;
      font-size: 0.74rem;
      font-weight: 600;
      color: #475569;
    }

    .lg-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 3px;
    }

    .lg-dot.real { background: #17243A; }
    .lg-dot.pred { background: #C6A56B; }

    .chart-svg-container {
      width: 100%;
      overflow-x: auto;
    }

    .svg-chart {
      width: 100%;
      height: auto;
      display: block;
      min-width: 280px;
    }

    /* Feature bars */
    .feature-bars {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .feat-lbl-line {
      display: flex;
      justify-content: space-between;
      font-size: 0.76rem;
      font-weight: 600;
      color: #202938;
      margin-bottom: 0.25rem;
    }

    .feat-pct {
      color: #C6A56B;
      font-weight: 700;
    }

    .feat-track {
      height: 7px;
      background: #F1F5F9;
      border-radius: 999px;
      overflow: hidden;
    }

    .feat-fill {
      height: 100%;
      background: #17243A;
      border-radius: 999px;
      transition: width 0.4s ease;
    }

    /* --------------------------------------------------------------------------
       7. TABLAS CON ENCABEZADOS EN COLOR PIEL / NUDE (ALTA LEGIBILIDAD)
       -------------------------------------------------------------------------- */
    .projection-table-card {
      background: #FFFFFF;
      border: 1px solid #E5E9F0;
      border-radius: 12px;
      padding: 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .table-interactive-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.85rem;
    }

    .toolbar-title-block {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .toolbar-actions-block {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }

    /* Filtros tipo píldora */
    .filter-pills-row {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      background: #F8F9FC;
      padding: 3px;
      border-radius: 8px;
      border: 1px solid #E5E9F0;
    }

    .filter-pill {
      background: transparent;
      border: none;
      font-size: 0.72rem;
      font-weight: 600;
      color: #64748B;
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .filter-pill:hover {
      color: #17243A;
    }

    .filter-pill.is-active {
      background: #FFFFFF;
      color: #17243A;
      font-weight: 700;
      box-shadow: 0 1px 3px rgba(23, 36, 58, 0.08);
    }

    .filter-pill.pill-risk.is-active {
      color: #B91C1C;
    }

    .filter-pill.pill-safe.is-active {
      color: #087F6D;
    }

    /* Buscador compacto */
    .search-mini-box {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: #F8F9FC;
      border: 1px solid #E5E9F0;
      border-radius: 8px;
      padding: 0.35rem 0.65rem;
      color: #64748B;
    }

    .search-mini-box input {
      border: none;
      background: transparent;
      outline: none;
      font-size: 0.78rem;
      color: #202938;
      width: 140px;
    }

    .search-mini-box input::placeholder {
      color: #94A3B8;
    }

    .table-responsive-wrapper {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      border: 1px solid #E5E9F0;
      border-radius: 8px;
      background: #FFFFFF;
    }

    .saas-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
      text-align: left;
    }

    /* ENCABEZADOS EN COLOR PIEL / NUDE ELEGANTE (CONTRASTE MÁXIMO) */
    .skin-tone-table thead th {
      background: #F4EBE1;          /* Color piel / nude cálido */
      color: #17243A;               /* Azul noche oscuro, contraste óptimo */
      font-size: 0.73rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 0.75rem 1rem;
      border-bottom: 2px solid #E2D3C2;
      white-space: nowrap;
    }

    .saas-table tbody td {
      padding: 0.7rem 1rem;
      color: #202938;
      border-bottom: 1px solid #F1F5F9;
      white-space: nowrap;
    }

    .saas-table tbody tr:nth-child(even) {
      background: #FAFBFC;
    }

    .interactive-row {
      transition: background 0.15s ease;
    }

    .interactive-row:hover {
      background: #FAF5EE !important; /* Toque suave de color piel en hover */
    }

    .saas-table tbody tr:last-child td {
      border-bottom: none;
    }

    .cell-bold {
      font-weight: 600;
      color: #17243A;
    }

    .col-center {
      text-align: center !important;
    }

    .cell-right {
      text-align: right !important;
    }

    .font-numeric {
      font-variant-numeric: tabular-nums;
    }

    .font-highlight {
      font-weight: 700;
      color: #17243A;
    }

    .negative-stock {
      color: #DC2626;
      font-weight: 700;
    }

    .size-badge {
      background: #F1F5F9;
      color: #17243A;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid #E2E8F0;
    }

    .risk-badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 999px;
      letter-spacing: 0.02em;
    }

    .risk-high {
      background: #FEE2E2;
      color: #991B1B;
    }

    .risk-med {
      background: #FEF3C7;
      color: #92400E;
    }

    .risk-low {
      background: #DCFCE7;
      color: #166534;
    }

    .empty-table-cell {
      text-align: center;
      padding: 2rem 1rem;
      color: #94A3B8;
      font-size: 0.82rem;
    }

    /* --------------------------------------------------------------------------
       8. PERFILES DE CLUSTERS RFM
       -------------------------------------------------------------------------- */
    .clusters-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }

    .cluster-profile-card {
      background: #FFFFFF;
      border: 1px solid #E5E9F0;
      border-top-width: 4px;
      border-radius: 10px;
      padding: 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      box-shadow: 0 1px 4px rgba(23, 36, 58, 0.02);
    }

    .cl-head {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .cl-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .cl-title {
      font-weight: 700;
      font-size: 0.92rem;
      color: #17243A;
    }

    .cl-count {
      margin-left: auto;
      font-size: 0.72rem;
      font-weight: 700;
      background: #F8F9FC;
      border: 1px solid #E5E9F0;
      color: #64748B;
      padding: 2px 7px;
      border-radius: 999px;
    }

    .cl-kpis {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.4rem;
      background: #F8F9FC;
      border: 1px solid #E5E9F0;
      border-radius: 8px;
      padding: 0.6rem 0.5rem;
    }

    .kpi-mini {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      text-align: center;
    }

    .k-lbl {
      font-size: 0.65rem;
      color: #64748B;
      font-weight: 600;
    }

    .k-val {
      font-size: 0.78rem;
      font-weight: 700;
      color: #17243A;
    }

    .cl-action-box {
      font-size: 0.78rem;
      color: #475569;
      line-height: 1.45;
      background: #FAF8F5;
      border: 1px solid #F0E6D8;
      border-radius: 6px;
      padding: 0.6rem 0.75rem;
    }

    .action-tag {
      color: #8C6D48;
      display: block;
      margin-bottom: 0.2rem;
    }

    .action-body {
      margin: 0;
    }

    /* Modelos persistidos badges */
    .paradigm-mini {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: #EBF3F5;
      color: #2B6E7F;
    }

    .paradigm-mini.sup {
      background: #F4EBE1;
      color: #8C6D48;
    }

    .active-dot-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.72rem;
      font-weight: 600;
      color: #087F6D;
      background: #E6F5F2;
      padding: 2px 7px;
      border-radius: 999px;
    }

    .dot-online {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #087F6D;
    }

    /* --------------------------------------------------------------------------
       9. RESPONSIVE BREAKPOINTS
       -------------------------------------------------------------------------- */
    @media (max-width: 767px) {
      .ml-page-shell {
        padding: 0.75rem 0.75rem 2rem;
      }
      .ml-hero-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.85rem;
        padding: 1rem;
      }
      .header-controls {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }
      .tenant-status-pill {
        width: 100%;
        max-width: 100%;
        justify-content: space-between;
      }
      .header-nav-group {
        width: 100%;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.4rem;
      }
      .btn-nav-subtle, .btn-nav-accent {
        justify-content: center;
      }
      .params-inputs-row {
        width: 100%;
        flex-direction: column;
        align-items: stretch;
      }
      .train-buttons-group {
        width: 100%;
        flex-direction: column;
        align-items: stretch;
      }
      .btn-train-primary, .btn-train-subtle {
        justify-content: center;
      }
      .toolbar-actions-block {
        width: 100%;
        flex-direction: column;
        align-items: stretch;
      }
      .search-mini-box input {
        width: 100%;
      }
    }

    /* ========================================================================= */
    /* ESTILOS DE INTEGRACIÓN: TABS SELECTOR Y VISTA CU24                        */
    /* ========================================================================= */
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
  `]
})
export class MlDashboardComponent implements OnInit {
  private readonly mlService = inject(FashionAiMlService);
  readonly authService = inject(AuthService);
  readonly toast = inject(ToastService);

  readonly vistaActiva = signal<'CU24_PREDICCIONES' | 'CU23_ENTRENAMIENTO'>('CU24_PREDICCIONES');
  readonly activeTenantId = signal<number>(1);

  // =========================================================================
  // CU24: ESTADO, FILTROS Y DATOS DE PREDICCIONES DE STOCK
  // =========================================================================
  filtroSucursal = 'TODAS';
  filtroRiesgoCU24 = 'TODOS';

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

  readonly proyeccionesCU24Filtradas = computed(() => {
    let list = this.proyeccionesLista();
    if (this.filtroSucursal !== 'TODAS') {
      list = list.filter(p => p.sucursal_nombre === this.filtroSucursal);
    }
    if (this.filtroRiesgoCU24 !== 'TODOS') {
      list = list.filter(p => p.estado_riesgo === this.filtroRiesgoCU24);
    }
    return list;
  });

  // =========================================================================
  // CU23: HIPERPARÁMETROS, ENTRENAMIENTO Y VISUALIZACIÓN SCIKIT-LEARN
  // =========================================================================
  algoritmoDemanda = 'RandomForestRegressor';
  diasHistorico = 90;
  numClustersRfm = 3;

  readonly isTraining = signal<boolean>(false);
  readonly errorBanner = signal<string | null>(null);
  readonly errorStatus = signal<number>(0);

  readonly demandaModel = signal<MLDemandaTrainResponse | null>(null);
  readonly rfmModel = signal<MLRFMTrainResponse | null>(null);
  readonly persistedModels = signal<ModeloMLPersistedItem[]>([]);

  // Estado hover para gráfico interactivo de Demanda Real vs Predicción
  readonly hoveredDemanda = signal<any | null>(null);

  // Escala y coordenadas del Eje Y
  readonly demandaMaxVal = computed(() => {
    const serie = this.demandaModel()?.serie_comparativa || [];
    if (!serie.length) return 20;
    return Math.max(
      ...serie.map(s => Math.max(s.demanda_real, s.demanda_predicha)),
      10
    );
  });

  readonly demandaMidVal = computed(() => {
    return Math.round(this.demandaMaxVal() / 2);
  });

  // Filtros interactivos para la tabla de pronóstico de stock CU23
  readonly filtroRiesgo = signal<'TODOS' | 'RIESGO' | 'OPTIMO'>('TODOS');
  readonly busquedaPrenda = signal<string>('');

  readonly proyeccionesFiltradas = computed(() => {
    const list = this.demandaModel()?.proyecciones_stock || [];
    const filtro = this.filtroRiesgo();
    const query = this.busquedaPrenda().toLowerCase().trim();

    return list.filter(item => {
      const matchQuery = !query ||
        item.prenda.toLowerCase().includes(query) ||
        item.sucursal.toLowerCase().includes(query) ||
        item.talla.toLowerCase().includes(query);

      if (!matchQuery) return false;

      if (filtro === 'RIESGO') {
        const r = (item.riesgo_quiebre || '').toUpperCase();
        return r.includes('ALTO') || r.includes('CRIT') || item.stock_actual <= 0;
      }
      if (filtro === 'OPTIMO') {
        const r = (item.riesgo_quiebre || '').toUpperCase();
        return r.includes('OPTIMO') || r.includes('BAJO_RIESGO');
      }
      return true;
    });
  });

  // Coordenadas SVG para serie Real vs Predicho
  readonly demandaCoords = computed(() => {
    const serie = this.demandaModel()?.serie_comparativa || [];
    if (!serie.length) return [];
    const maxVal = Math.max(
      ...serie.map(s => Math.max(s.demanda_real, s.demanda_predicha)),
      10
    );
    const left = 55;
    const right = 610;
    const top = 25;
    const bottom = 185;
    const step = serie.length > 1 ? (right - left) / (serie.length - 1) : 0;

    return serie.map((pt, idx) => ({
      ...pt,
      x: Math.round(left + idx * step),
      yReal: Math.round(bottom - (pt.demanda_real / maxVal) * (bottom - top)),
      yPred: Math.round(bottom - (pt.demanda_predicha / maxVal) * (bottom - top))
    }));
  });

  readonly demandaRealPolyline = computed(() =>
    this.demandaCoords().map(p => `${p.x},${p.yReal}`).join(' ')
  );

  readonly demandaPredPolyline = computed(() =>
    this.demandaCoords().map(p => `${p.x},${p.yPred}`).join(' ')
  );

  // Coordenadas SVG para Scatter RFM
  readonly rfmScatterCoords = computed(() => {
    const rfm = this.rfmModel();
    if (!rfm || !rfm.puntos_clientes.length) return [];
    const pts = rfm.puntos_clientes;
    const maxF = Math.max(...pts.map(p => p.frecuencia_compras), 5);
    const maxM = Math.max(...pts.map(p => p.monto_total_bs), 500);
    const colorMap = new Map<number, string>();
    rfm.perfiles_clusters.forEach(c => colorMap.set(c.cluster, c.color_hex));

    return pts.map(p => ({
      ...p,
      cx: Math.round(68 + (p.frecuencia_compras / (maxF * 1.08)) * 530),
      cy: Math.round(188 - (p.monto_total_bs / (maxM * 1.08)) * 160),
      color: colorMap.get(p.cluster) || '#C6A56B'
    }));
  });

  // Coordenadas SVG para Curva del Codo (WCSS)
  readonly elbowCoords = computed(() => {
    const codo = this.rfmModel()?.curva_codo || [];
    if (!codo.length) return [];
    const maxW = Math.max(...codo.map(c => c.wcss), 1);
    const minW = Math.min(...codo.map(c => c.wcss), 0);
    const span = Math.max(maxW - minW, 1);
    const left = 65;
    const right = 315;
    const step = codo.length > 1 ? (right - left) / (codo.length - 1) : 0;

    return codo.map((c, idx) => ({
      ...c,
      x: Math.round(left + idx * step),
      y: Math.round(175 - ((c.wcss - minW) / span) * 135)
    }));
  });

  readonly elbowPolyline = computed(() =>
    this.elbowCoords().map(e => `${e.x},${e.y}`).join(' ')
  );

  // =========================================================================
  // LIFECYCLE & TENANT SWITCH
  // =========================================================================
  ngOnInit(): void {
    const tId = this.authService.currentTenant().empresaId || 1;
    this.activeTenantId.set(tId);
    this.cargarDatosCU24();
    this.cargarModelosPersistidos();
    if (this.authService.currentTenant().permiteIa !== false) {
      this.entrenarPipelineCompleto();
    }
  }

  setVista(v: 'CU24_PREDICCIONES' | 'CU23_ENTRENAMIENTO'): void {
    this.vistaActiva.set(v);
  }

  cambiarTenant(tenantId: number): void {
    this.activeTenantId.set(tenantId);
    this.errorBanner.set(null);
    this.cargarDatosCU24();
    this.cargarModelosPersistidos();
    this.entrenarPipelineCompleto();
  }

  // =========================================================================
  // MÉTODOS CU24: DASHBOARD ANALÍTICO & PREDICCIONES
  // =========================================================================
  cargarDatosCU24(): void {
    this.mlService.obtenerDashboardAnalitico(this.activeTenantId()).subscribe({
      next: (res) => {
        this.dashboardData.set(res);
      },
      error: () => {}
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
    this.toast.info(`Solicitud generada para SKU ${item.sku} en ${item.sucursal_nombre}. Se apartarán 5 unidades desde otra sucursal.`, 'Traslado de Emergencia CU12');
  }

  // =========================================================================
  // MÉTODOS CU23: ENTRENAMIENTO & GESTIÓN DE MODELOS
  // =========================================================================
  entrenarPipelineCompleto(): void {
    this.isTraining.set(true);
    this.errorBanner.set(null);

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
            this.cargarModelosPersistidos();
          },
          error: (err) => this.manejarError(err)
        });
      },
      error: (err) => this.manejarError(err)
    });
  }

  entrenarSoloDemanda(): void {
    this.isTraining.set(true);
    this.errorBanner.set(null);
    this.mlService.entrenarDemandaStock(
      this.algoritmoDemanda,
      this.diasHistorico,
      0.2,
      this.activeTenantId()
    ).subscribe({
      next: (res) => {
        this.demandaModel.set(res);
        this.isTraining.set(false);
        this.cargarModelosPersistidos();
      },
      error: (err) => this.manejarError(err)
    });
  }

  entrenarSoloRfm(): void {
    this.isTraining.set(true);
    this.errorBanner.set(null);
    this.mlService.entrenarSegmentacionRFM(this.numClustersRfm, this.activeTenantId()).subscribe({
      next: (res) => {
        this.rfmModel.set(res);
        this.isTraining.set(false);
        this.cargarModelosPersistidos();
      },
      error: (err) => this.manejarError(err)
    });
  }

  cargarModelosPersistidos(): void {
    this.mlService.listarModelosML(this.activeTenantId()).subscribe({
      next: (items) => this.persistedModels.set(items),
      error: () => this.persistedModels.set([])
    });
  }

  private manejarError(err: any): void {
    this.isTraining.set(false);
    this.errorStatus.set(err.status || 403);
    if (err?.status === 404) {
      this.errorBanner.set('El backend desplegado no encontró la ruta de Machine Learning. Verifica que el último despliegue del backend haya finalizado.');
      return;
    }
    this.errorBanner.set(err?.error?.detail ||
      (err?.status === 403
        ? 'Su plan actual no habilita entrenamiento analítico de Machine Learning.'
        : 'Ocurrió un error al entrenar o consultar los modelos de Machine Learning.'));
  }

  getRiskClass(riesgo: string): string {
    const upper = (riesgo || '').toUpperCase();
    if (upper.includes('ALTO') || upper.includes('CRIT')) return 'risk-high';
    if (upper.includes('MOD') || upper.includes('MED')) return 'risk-med';
    return 'risk-low';
  }

  formatRiskLabel(riesgo: string): string {
    const upper = (riesgo || '').toUpperCase();
    if (upper.includes('ALTO') || upper.includes('CRIT')) return 'Alto Riesgo';
    if (upper.includes('MOD') || upper.includes('MED')) return 'Riesgo Moderado';
    return 'Stock Óptimo';
  }

  formatStockQty(qty: number): string {
    if (qty <= 0) return '0 uds. (Agotado)';
    return `${qty} uds.`;
  }
}

