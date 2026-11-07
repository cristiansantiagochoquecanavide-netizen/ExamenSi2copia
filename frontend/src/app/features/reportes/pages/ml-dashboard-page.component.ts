import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  FashionAiMlService,
  MLDemandaTrainResponse,
  MLRFMTrainResponse,
  ModeloMLPersistedItem
} from '../services/fashion-ai-ml.service';

@Component({
  selector: 'app-ml-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="ml-page-shell">
      <div class="ml-container">

        <!-- =============================================================== -->
        <!-- CABECERA EJECUTIVA Y CONTROLES DE HIPERPARÁMETROS (CU23)        -->
        <!-- =============================================================== -->
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
              <a routerLink="/dashboard/ia-reportes" class="btn-nav-gold">Asistente IA &amp; Exportación (CU21/22) &rarr;</a>
            </div>

            <div class="tenant-switch-mini">
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
                Urban Style (#2 - Básico)
              </button>
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
              (click)="entrenarSoloRfm()">
              Entrenar K-Means RFM
            </button>
            <button
              type="button"
              class="btn-train-all"
              [disabled]="isTraining()"
              (click)="entrenarPipelineCompleto()">
              {{ isTraining() ? 'Entrenando Modelos...' : 'Re-entrenar Pipeline Completo' }}
            </button>
          </div>
        </section>

        @if (errorBanner()) {
          <div class="ml-error-banner">
            <strong>Restricción SaaS / ML (HTTP {{ errorStatus() }}):</strong> {{ errorBanner() }}
          </div>
        }

        <!-- =============================================================== -->
        <!-- SECCIÓN 1: APRENDIZAJE SUPERVISADO - PREDICCIÓN DE DEMANDA      -->
        <!-- =============================================================== -->
        @if (demandaModel(); as sup) {
          <section class="paradigm-section">
            <div class="paradigm-header">
              <div>
                <span class="paradigm-tag supervised">APRENDIZAJE SUPERVISADO &bull; REGRESIÓN</span>
                <h2>{{ sup.nombre_modelo }} (Modelo #{{ sup.modelo_id }})</h2>
              </div>
              <span class="target-tag">Variable Objetivo: <code>{{ sup.variable_objetivo }}</code></span>
            </div>

            <!-- 3 Tarjetas de Métricas Matemáticas (R2, MAE, RMSE) -->
            <div class="metrics-trio-grid">
              <article class="metric-card highlight-r2">
                <div class="m-top">
                  <span class="m-name">COEFICIENTE DE DETERMINACIÓN (R&sup2;)</span>
                  <span class="m-status-pill" [class.ok]="sup.precision_r2 >= 0.70">
                    {{ sup.precision_r2 >= 0.70 ? 'META >= 0.70 CUMPLIDA' : 'BAJO UMBRAL' }}
                  </span>
                </div>
                <div class="m-value">{{ sup.precision_r2 | number:'1.4-4' }}</div>
                <div class="m-foot">Varianza explicada sobre partición Test (20%)</div>
              </article>

              <article class="metric-card">
                <div class="m-top">
                  <span class="m-name">ERROR ABSOLUTO MEDIO (MAE)</span>
                  <span class="m-unit">prendas/día</span>
                </div>
                <div class="m-value">{{ sup.mae | number:'1.2-2' }}</div>
                <div class="m-foot">Desviación lineal promedio de pronóstico</div>
              </article>

              <article class="metric-card">
                <div class="m-top">
                  <span class="m-name">RAÍZ DEL ERROR CUADRÁTICO MEDIO (RMSE)</span>
                  <span class="m-unit">prendas/día</span>
                </div>
                <div class="m-value">{{ sup.rmse | number:'1.2-2' }}</div>
                <div class="m-foot">Penalización cuadrática ante picos de fin de semana</div>
              </article>
            </div>

            <!-- Grilla Media Supervisado: Curva Real vs Predicho + Importancia de Variables -->
            <div class="sup-visuals-grid">
              <article class="chart-card">
                <div class="chart-card-head">
                  <h3>Validación Cruzada: Demanda Real vs. Predicción del Modelo</h3>
                  <div class="legend-inline">
                    <span><i class="lg-dot real"></i> Demanda Real</span>
                    <span><i class="lg-dot pred"></i> Demanda Predicha</span>
                  </div>
                </div>

                <svg class="svg-chart" viewBox="0 0 640 220">
                  <line x1="45" y1="25" x2="620" y2="25" stroke="#f1f5f9" stroke-width="1" />
                  <line x1="45" y1="105" x2="620" y2="105" stroke="#f1f5f9" stroke-width="1" />
                  <line x1="45" y1="185" x2="620" y2="185" stroke="#cbd5e1" stroke-width="1.4" />

                  <polyline
                    [attr.points]="demandaRealPolyline()"
                    fill="none"
                    stroke="#0f172a"
                    stroke-width="2.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <polyline
                    [attr.points]="demandaPredPolyline()"
                    fill="none"
                    stroke="#2563eb"
                    stroke-width="2.6"
                    stroke-dasharray="5,3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />

                  @for (pt of demandaCoords(); track pt.indice) {
                    <circle [attr.cx]="pt.x" [attr.cy]="pt.yReal" r="3.8" fill="#0f172a" />
                    <circle [attr.cx]="pt.x" [attr.cy]="pt.yPred" r="3.8" fill="#2563eb" />
                    <text [attr.x]="pt.x" y="204" text-anchor="middle" font-size="9" fill="#64748b">
                      {{ pt.etiqueta }}
                    </text>
                  }
                </svg>
              </article>

              <article class="chart-card">
                <div class="chart-card-head">
                  <h3>Importancia de Variables Predictoras</h3>
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

            <!-- Proyección Operativa de Stock a 7 Días por SKU -->
            <article class="projection-table-card">
              <div class="chart-card-head">
                <h3>Pronóstico de Demanda a 7 Días y Alerta Preventiva de Quiebre de Stock</h3>
                <span class="sub-note">Inferencia directa sobre catálogo e inventario actual del tenant</span>
              </div>
              <div class="table-wrap">
                <table class="ml-table">
                  <thead>
                    <tr>
                      <th>PRENDA / SKU</th>
                      <th>TALLA</th>
                      <th>SUCURSAL</th>
                      <th class="num">STOCK ACTUAL</th>
                      <th class="num">DEMANDA PROYECTADA (7D)</th>
                      <th>RIESGO DE QUIEBRE</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of sup.proyecciones_stock; track $index) {
                      <tr>
                        <td class="bold">{{ item.prenda }}</td>
                        <td><span class="size-badge">{{ item.talla }}</span></td>
                        <td>{{ item.sucursal }}</td>
                        <td class="num">{{ item.stock_actual }} uds.</td>
                        <td class="num highlight-val">{{ item.demanda_proyectada_7d }} uds.</td>
                        <td>
                          <span class="risk-pill" [ngClass]="getRiskClass(item.riesgo_quiebre)">
                            {{ item.riesgo_quiebre }}
                          </span>
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
        <!-- SECCIÓN 2: APRENDIZAJE NO SUPERVISADO - SEGMENTACIÓN RFM K-MEANS-->
        <!-- =============================================================== -->
        @if (rfmModel(); as rfm) {
          <section class="paradigm-section">
            <div class="paradigm-header">
              <div>
                <span class="paradigm-tag unsupervised">APRENDIZAJE NO SUPERVISADO &bull; CLUSTERING K-MEANS++</span>
                <h2>{{ rfm.nombre_modelo }} (Modelo #{{ rfm.modelo_id }})</h2>
              </div>
              <span class="target-tag">Normalización: <code>StandardScaler (Z-Score R, F, M)</code></span>
            </div>

            <!-- 3 Tarjetas de Métricas No Supervisadas -->
            <div class="metrics-trio-grid">
              <article class="metric-card highlight-sil">
                <div class="m-top">
                  <span class="m-name">COEFICIENTE DE SILUETA (SILHOUETTE SCORE)</span>
                  <span class="m-status-pill" [class.ok]="rfm.silhouette_score > 0.25">
                    {{ rfm.silhouette_score > 0.25 ? 'SEPARACIÓN ÓPTIMA (> 0.25)' : 'SOLAPADO' }}
                  </span>
                </div>
                <div class="m-value">{{ rfm.silhouette_score | number:'1.4-4' }}</div>
                <div class="m-foot">Cohesión intra-cluster vs. separación inter-cluster [-1, +1]</div>
              </article>

              <article class="metric-card">
                <div class="m-top">
                  <span class="m-name">INERCIA INTRA-CLUSTER (WCSS)</span>
                  <span class="m-unit">k = {{ rfm.num_clusters }}</span>
                </div>
                <div class="m-value">{{ rfm.inercia_wcss | number:'1.2-2' }}</div>
                <div class="m-foot">Suma de distancias cuadráticas al centroide más cercano</div>
              </article>

              <article class="metric-card">
                <div class="m-top">
                  <span class="m-name">UNIVERSO RFM SEGMENTADO</span>
                  <span class="m-unit">Tenant #{{ rfm.empresa_id }}</span>
                </div>
                <div class="m-value">{{ rfm.total_clientes_analizados }}</div>
                <div class="m-foot">Clientes únicos con historial de compras pagadas</div>
              </article>
            </div>

            <!-- Gráficos SVG No Supervisados: Scatter Plot RFM + Curva del Codo (Elbow) -->
            <div class="sup-visuals-grid">
              <article class="chart-card">
                <div class="chart-card-head">
                  <h3>Mapa de Dispersión RFM (Frecuencia vs. Gasto Acumulado Bs.)</h3>
                  <span class="sub-note">Coloreado según asignación de centroide K-Means</span>
                </div>
                <svg class="svg-chart" viewBox="0 0 640 230">
                  <line x1="55" y1="20" x2="55" y2="195" stroke="#cbd5e1" stroke-width="1.4" />
                  <line x1="55" y1="195" x2="615" y2="195" stroke="#cbd5e1" stroke-width="1.4" />
                  <text x="335" y="220" text-anchor="middle" font-size="10" font-weight="700" fill="#475569">
                    Frecuencia de Compras (N° Transacciones) &rarr;
                  </text>
                  <text x="16" y="110" text-anchor="middle" font-size="10" font-weight="700" fill="#475569" transform="rotate(-90, 16, 110)">
                    Valor Monetario (Bs.) &rarr;
                  </text>

                  @for (pt of rfmScatterCoords(); track $index) {
                    <circle
                      [attr.cx]="pt.cx"
                      [attr.cy]="pt.cy"
                      r="5.2"
                      [attr.fill]="pt.color"
                      fill-opacity="0.82"
                      stroke="#ffffff"
                      stroke-width="1.2">
                      <title>{{ pt.cliente }} — {{ pt.segmento }} (F={{ pt.frecuencia_compras }}, Bs. {{ pt.monto_total_bs }})</title>
                    </circle>
                  }
                </svg>
              </article>

              <article class="chart-card">
                <div class="chart-card-head">
                  <h3>Método del Codo (Elbow Curve WCSS)</h3>
                  <span class="sub-note">Evaluación k = 2..6</span>
                </div>
                <svg class="svg-chart" viewBox="0 0 360 220">
                  <line x1="45" y1="25" x2="45" y2="185" stroke="#cbd5e1" stroke-width="1.4" />
                  <line x1="45" y1="185" x2="335" y2="185" stroke="#cbd5e1" stroke-width="1.4" />

                  <polyline
                    [attr.points]="elbowPolyline()"
                    fill="none"
                    stroke="#7c3aed"
                    stroke-width="2.6"
                    stroke-linecap="round"
                  />

                  @for (ek of elbowCoords(); track ek.k) {
                    <circle
                      [attr.cx]="ek.x"
                      [attr.cy]="ek.y"
                      [attr.r]="ek.k === rfm.num_clusters ? 6.5 : 4"
                      [attr.fill]="ek.k === rfm.num_clusters ? '#dc2626' : '#7c3aed'"
                      stroke="#ffffff"
                      stroke-width="1.5"
                    />
                    <text [attr.x]="ek.x" y="203" text-anchor="middle" font-size="10" font-weight="700" fill="#334155">
                      k={{ ek.k }}
                    </text>
                    <text [attr.x]="ek.x" [attr.y]="ek.y - 10" text-anchor="middle" font-size="9" fill="#64748b">
                      {{ ek.wcss | number:'1.0-0' }}
                    </text>
                  }
                </svg>
              </article>
            </div>

            <!-- Tarjetas Semánticas de Segmentos de Clientes -->
            <div class="clusters-cards-grid">
              @for (cl of rfm.perfiles_clusters; track cl.cluster) {
                <article class="cluster-profile-card" [style.border-top-color]="cl.color_hex">
                  <div class="cl-head">
                    <span class="cl-dot" [style.background]="cl.color_hex"></span>
                    <span class="cl-title">{{ cl.nombre }}</span>
                    <span class="cl-count">{{ cl.cantidad_clientes }} clientes</span>
                  </div>
                  <div class="cl-kpis">
                    <div>
                      <span class="k-lbl">Recencia Media</span>
                      <span class="k-val">{{ cl.recencia_dias | number:'1.1-1' }} días</span>
                    </div>
                    <div>
                      <span class="k-lbl">Frecuencia</span>
                      <span class="k-val">{{ cl.frecuencia_compras | number:'1.1-1' }} compras</span>
                    </div>
                    <div>
                      <span class="k-lbl">Ticket Acumulado</span>
                      <span class="k-val">Bs. {{ cl.gasto_medio_bs | number:'1.0-0' }}</span>
                    </div>
                  </div>
                  <p class="cl-action">
                    <strong>Estrategia Comercial:</strong> {{ cl.accion_sugerida }}
                  </p>
                </article>
              }
            </div>
          </section>
        }

        <!-- =============================================================== -->
        <!-- BITÁCORA DE MODELOS PERSISTIDOS EN POSTGRESQL                   -->
        <!-- =============================================================== -->
        <section class="projection-table-card">
          <div class="chart-card-head">
            <h3>Registro de Auditoría en Base de Datos (Tabla <code>modelo_analitico_ml</code>)</h3>
            <span class="sub-note">{{ persistedModels().length }} ejecuciones registradas para Tenant #{{ activeTenantId() }}</span>
          </div>
          <div class="table-wrap">
            <table class="ml-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>NOMBRE DEL MODELO</th>
                  <th>PARADIGMA</th>
                  <th>VARIABLE OBJETIVO</th>
                  <th class="num">MÉTRICA PRINCIPAL</th>
                  <th>FECHA ENTRENAMIENTO</th>
                  <th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                @for (m of persistedModels(); track m.id) {
                  <tr>
                    <td class="bold">#{{ m.id }}</td>
                    <td>{{ m.nombre_modelo }}</td>
                    <td>
                      <span class="paradigm-mini" [class.sup]="m.tipo_aprendizaje === 'SUPERVISADO'">
                        {{ m.tipo_aprendizaje }}
                      </span>
                    </td>
                    <td><code>{{ m.variable_objetivo || 'Cluster RFM' }}</code></td>
                    <td class="num bold">{{ m.precision_metrica | number:'1.4-4' }}</td>
                    <td>{{ m.fecha_entrenamiento | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td><span class="active-dot-pill">{{ m.activo ? 'ACTIVO' : 'HISTÓRICO' }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  `,
  styles: [`
    .ml-page-shell {
      background: #f4f6f9;
      min-height: calc(100vh - 70px);
      padding: 1.75rem 2rem 3.5rem;
      color: #0f172a;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .ml-container {
      max-width: 1420px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.4rem;
    }
    .ml-hero-header {
      background: linear-gradient(135deg, #090d16 0%, #1e1b4b 100%);
      color: #ffffff;
      border-radius: 12px;
      padding: 1.6rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.5rem;
      flex-wrap: wrap;
      border: 1px solid rgba(197, 168, 128, 0.35);
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
    }
    .hero-left { max-width: 780px; }
    .eyebrow-row {
      display: flex;
      gap: 0.6rem;
      align-items: center;
      margin-bottom: 0.65rem;
      flex-wrap: wrap;
    }
    .eyebrow-pill {
      background: rgba(197, 168, 128, 0.22);
      color: #fde68a;
      border: 1px solid rgba(197, 168, 128, 0.5);
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.22rem 0.65rem;
      border-radius: 999px;
    }
    .sklearn-pill {
      background: rgba(124, 58, 237, 0.3);
      color: #ddd6fe;
      border: 1px solid rgba(167, 139, 250, 0.45);
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.22rem 0.65rem;
      border-radius: 999px;
    }
    .hero-title {
      font-size: 1.65rem;
      font-weight: 800;
      margin: 0 0 0.45rem;
    }
    .hero-subtitle {
      margin: 0;
      font-size: 0.88rem;
      color: #cbd5e1;
      line-height: 1.5;
    }
    .hero-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.8rem;
    }
    .nav-links-bar {
      display: flex;
      gap: 0.6rem;
      flex-wrap: wrap;
    }
    .btn-nav-outline, .btn-nav-gold {
      text-decoration: none;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.5rem 0.95rem;
      border-radius: 8px;
    }
    .btn-nav-outline {
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: rgba(255, 255, 255, 0.06);
    }
    .btn-nav-gold {
      background: #c5a880;
      color: #0f172a;
    }
    .tenant-switch-mini {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: rgba(15, 23, 42, 0.6);
      padding: 0.4rem 0.65rem;
      border-radius: 8px;
      border: 1px solid rgba(148, 163, 184, 0.25);
    }
    .tenant-switch-mini .lbl {
      font-size: 0.68rem;
      font-weight: 800;
      color: #94a3b8;
    }
    .t-btn {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.28rem 0.6rem;
      border-radius: 6px;
      border: 1px solid rgba(148, 163, 184, 0.3);
      background: transparent;
      color: #cbd5e1;
      cursor: pointer;
    }
    .t-btn.active {
      background: #10b981;
      border-color: #10b981;
      color: #052e16;
    }
    .t-btn.urban.active {
      background: #f59e0b;
      border-color: #f59e0b;
      color: #451a03;
    }

    /* Hyperparameters bar */
    .hyperparams-bar {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1rem 1.35rem;
      display: flex;
      align-items: flex-end;
      gap: 1rem;
      flex-wrap: wrap;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
    }
    .param-group {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .param-group label {
      font-size: 0.72rem;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .param-select {
      padding: 0.52rem 0.8rem;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      font-size: 0.84rem;
      font-weight: 600;
      color: #0f172a;
      background: #f8fafc;
    }
    .train-buttons-group {
      margin-left: auto;
      display: flex;
      gap: 0.55rem;
      flex-wrap: wrap;
    }
    .btn-train-secondary, .btn-train-all {
      padding: 0.58rem 1rem;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid transparent;
    }
    .btn-train-secondary {
      background: #f1f5f9;
      border-color: #cbd5e1;
      color: #1e293b;
    }
    .btn-train-secondary:hover:not(:disabled) { background: #e2e8f0; }
    .btn-train-all {
      background: #1e3a8a;
      color: #ffffff;
    }
    .btn-train-all:hover:not(:disabled) { background: #1d4ed8; }
    .btn-train-all:disabled, .btn-train-secondary:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .ml-error-banner {
      background: #fffbeb;
      border: 1px solid #f59e0b;
      border-left: 6px solid #d97706;
      color: #78350f;
      padding: 0.95rem 1.2rem;
      border-radius: 10px;
      font-size: 0.86rem;
    }

    /* Paradigm Sections */
    .paradigm-section {
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.4rem;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
    }
    .paradigm-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding-bottom: 0.8rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .paradigm-header h2 {
      margin: 0.3rem 0 0;
      font-size: 1.2rem;
      font-weight: 800;
    }
    .paradigm-tag {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 800;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      letter-spacing: 0.06em;
    }
    .paradigm-tag.supervised { background: #dbeafe; color: #1e40af; }
    .paradigm-tag.unsupervised { background: #ede9fe; color: #5b21b6; }
    .target-tag {
      font-size: 0.8rem;
      color: #475569;
    }
    .target-tag code {
      background: #f1f5f9;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      font-weight: 700;
      color: #0f172a;
    }

    /* Metrics Trio */
    .metrics-trio-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
    }
    @media (max-width: 900px) {
      .metrics-trio-grid { grid-template-columns: 1fr; }
    }
    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1rem 1.15rem;
    }
    .metric-card.highlight-r2 {
      background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
      border-color: #93c5fd;
    }
    .metric-card.highlight-sil {
      background: linear-gradient(135deg, #f5f3ff 0%, #f8fafc 100%);
      border-color: #c4b5fd;
    }
    .m-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.45rem;
    }
    .m-name {
      font-size: 0.7rem;
      font-weight: 800;
      color: #475569;
      letter-spacing: 0.04em;
    }
    .m-status-pill {
      font-size: 0.65rem;
      font-weight: 800;
      padding: 0.16rem 0.5rem;
      border-radius: 999px;
      background: #fee2e2;
      color: #991b1b;
    }
    .m-status-pill.ok {
      background: #dcfce7;
      color: #166534;
    }
    .m-unit {
      font-size: 0.72rem;
      font-weight: 700;
      color: #64748b;
    }
    .m-value {
      font-size: 1.85rem;
      font-weight: 800;
      color: #0f172a;
      font-variant-numeric: tabular-nums;
    }
    .m-foot {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.25rem;
    }

    /* Visuals Grid */
    .sup-visuals-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.8fr) minmax(280px, 1fr);
      gap: 1rem;
    }
    @media (max-width: 980px) {
      .sup-visuals-grid { grid-template-columns: 1fr; }
    }
    .chart-card, .projection-table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1rem 1.15rem;
    }
    .chart-card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .chart-card-head h3 {
      margin: 0;
      font-size: 0.92rem;
      font-weight: 800;
      color: #0f172a;
    }
    .sub-note {
      font-size: 0.74rem;
      color: #64748b;
    }
    .legend-inline {
      display: flex;
      gap: 0.85rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: #334155;
    }
    .lg-dot {
      display: inline-block;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      margin-right: 4px;
    }
    .lg-dot.real { background: #0f172a; }
    .lg-dot.pred { background: #2563eb; }
    .svg-chart {
      width: 100%;
      height: auto;
      display: block;
    }

    /* Feature Importance */
    .feature-bars {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }
    .feat-lbl-line {
      display: flex;
      justify-content: space-between;
      font-size: 0.78rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }
    .feat-track {
      height: 9px;
      background: #f1f5f9;
      border-radius: 999px;
      overflow: hidden;
    }
    .feat-fill {
      height: 100%;
      background: linear-gradient(90deg, #1e3a8a, #3b82f6);
      border-radius: 999px;
    }

    /* Clusters Cards */
    .clusters-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }
    .cluster-profile-card {
      background: #fafafa;
      border: 1px solid #e2e8f0;
      border-top-width: 4px;
      border-radius: 10px;
      padding: 1rem 1.1rem;
    }
    .cl-head {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      margin-bottom: 0.75rem;
    }
    .cl-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .cl-title {
      font-weight: 800;
      font-size: 0.9rem;
      color: #0f172a;
    }
    .cl-count {
      margin-left: auto;
      font-size: 0.72rem;
      font-weight: 800;
      background: #e2e8f0;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
    }
    .cl-kpis {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.6rem;
      margin-bottom: 0.75rem;
    }
    .k-lbl {
      display: block;
      font-size: 0.66rem;
      color: #64748b;
      font-weight: 700;
    }
    .k-val {
      font-size: 0.82rem;
      font-weight: 800;
      color: #0f172a;
    }
    .cl-action {
      margin: 0;
      font-size: 0.79rem;
      color: #334155;
      line-height: 1.45;
    }

    /* Tables */
    .table-wrap {
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .ml-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
    }
    .ml-table thead th {
      background: #0f172a;
      color: #ffffff;
      padding: 0.65rem 0.85rem;
      text-align: left;
      font-size: 0.72rem;
      letter-spacing: 0.04em;
    }
    .ml-table tbody tr:nth-child(even) { background: #f8fafc; }
    .ml-table td {
      padding: 0.6rem 0.85rem;
      border-top: 1px solid #e2e8f0;
    }
    .ml-table th.num, .ml-table td.num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .bold { font-weight: 700; }
    .highlight-val { font-weight: 800; color: #1d4ed8; }
    .size-badge {
      background: #e2e8f0;
      padding: 0.12rem 0.45rem;
      border-radius: 4px;
      font-weight: 800;
      font-size: 0.72rem;
    }
    .risk-pill {
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
    }
    .risk-high { background: #fee2e2; color: #991b1b; }
    .risk-med { background: #fef3c7; color: #92400e; }
    .risk-low { background: #dcfce7; color: #166534; }
    .paradigm-mini {
      font-size: 0.68rem;
      font-weight: 800;
      padding: 0.16rem 0.48rem;
      border-radius: 4px;
      background: #ede9fe;
      color: #5b21b6;
    }
    .paradigm-mini.sup {
      background: #dbeafe;
      color: #1e40af;
    }
    .active-dot-pill {
      font-size: 0.7rem;
      font-weight: 800;
      color: #059669;
    }
  `]
})
export class MlDashboardComponent implements OnInit {
  private readonly mlService = inject(FashionAiMlService);
  private readonly authService = inject(AuthService);

  readonly activeTenantId = signal<number>(1);
  algoritmoDemanda = 'RandomForestRegressor';
  diasHistorico = 90;
  numClustersRfm = 3;

  readonly isTraining = signal<boolean>(false);
  readonly errorBanner = signal<string | null>(null);
  readonly errorStatus = signal<number>(0);

  readonly demandaModel = signal<MLDemandaTrainResponse | null>(null);
  readonly rfmModel = signal<MLRFMTrainResponse | null>(null);
  readonly persistedModels = signal<ModeloMLPersistedItem[]>([]);

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
    const top = 28;
    const bottom = 182;
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
      color: colorMap.get(p.cluster) || '#2563eb'
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

  ngOnInit(): void {
    const tId = this.authService.currentTenant().empresaId || 1;
    this.activeTenantId.set(tId);
    this.cargarModelosPersistidos();
    if (tId === 1) {
      this.entrenarPipelineCompleto();
    }
  }

  cambiarTenant(tenantId: number): void {
    this.activeTenantId.set(tenantId);
    this.errorBanner.set(null);
    this.cargarModelosPersistidos();
    this.entrenarPipelineCompleto();
  }

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
    this.errorBanner.set(
      err?.error?.detail ||
      'Su plan de suscripción actual no habilita entrenamiento analítico de Machine Learning.'
    );
  }

  getRiskClass(riesgo: string): string {
    const upper = (riesgo || '').toUpperCase();
    if (upper.includes('ALTO') || upper.includes('CRIT')) return 'risk-high';
    if (upper.includes('MOD') || upper.includes('MED')) return 'risk-med';
    return 'risk-low';
  }
}
