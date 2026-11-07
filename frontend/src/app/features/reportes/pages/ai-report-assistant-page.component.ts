import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  FashionAiMlService,
  ConsultaIAResponse,
  ReporteIAHistorialItem
} from '../services/fashion-ai-ml.service';

@Component({
  selector: 'app-ai-report-assistant-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="p3-page-shell">
      <div class="p3-container">

        <!-- =============================================================== -->
        <!-- CABECERA EJECUTIVA Y NAVEGACIÓN P3 (CU21 & CU22)                -->
        <!-- =============================================================== -->
        <header class="p3-hero-header">
          <div class="hero-left">
            <div class="eyebrow-row">
              <span class="eyebrow-pill">PRESENTACIÓN 3 &bull; CU21 &amp; CU22</span>
              <span class="gemini-engine-pill">Google Gemini NLQ + SQLSecurityAuditor</span>
            </div>
            <h1 class="hero-title">Asistente Ejecutivo de Reportes IA (Texto / Voz)</h1>
            <p class="hero-subtitle">
              Consultas comerciales en lenguaje natural traducidas a SQL de solo lectura con aislamiento multitenant
              estricto (<code>WHERE empresa_id = :tenant_id</code>) y exportación corporativa a PDF y Excel.
            </p>
          </div>

          <div class="hero-right">
            <div class="nav-switch-group">
              <a routerLink="/dashboard" class="btn-nav-outline">
                &larr; Dashboard BI
              </a>
              <a routerLink="/dashboard/machine-learning" class="btn-nav-gold">
                Laboratorio ML (CU23) &rarr;
              </a>
            </div>

            <!-- Conmutador de Contexto Multitenant para Demostración en Defensa -->
            <div class="tenant-simulator-box">
              <span class="sim-label">CONTEXTO TENANT ACTIVO:</span>
              <div class="sim-pills">
                <button
                  type="button"
                  class="sim-pill"
                  [class.active-elegance]="activeTenantId() === 1"
                  (click)="seleccionarTenantDemo(1)">
                  <span class="dot dot-green"></span>
                  Elegance Boutique (Plan INTERMEDIO &bull; IA Activa)
                </button>
                <button
                  type="button"
                  class="sim-pill"
                  [class.active-urban]="activeTenantId() === 2"
                  (click)="seleccionarTenantDemo(2)">
                  <span class="dot dot-amber"></span>
                  Urban Style Trend (Plan BÁSICO &bull; IA Bloqueada)
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- =============================================================== -->
        <!-- CONSOLA DE CONSULTA NATURAL: TEXTO + WEB SPEECH API (VOZ)       -->
        <!-- =============================================================== -->
        <section class="query-console-card">
          <div class="console-input-bar" [class.is-recording]="isListening()">
            <button
              type="button"
              class="btn-mic-circle"
              [class.recording]="isListening()"
              (click)="toggleDictadoVoz()"
              [title]="isListening() ? 'Detener grabación de voz' : 'Dictar consulta por micrófono (CU21)'">
              @if (!isListening()) {
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                </svg>
              } @else {
                <div class="wave-bars">
                  <span></span><span></span><span></span>
                </div>
              }
            </button>

            <input
              type="text"
              class="nlq-input"
              [(ngModel)]="promptText"
              (keyup.enter)="ejecutarConsulta('TEXTO')"
              [placeholder]="isListening()
                ? (interimTranscript() || 'Escuchando dictado por voz en español...')
                : 'Escriba o dicte su pregunta comercial (ej. ¿Cuál es la prenda más vendida este mes?)...'"
            />

            <span class="channel-indicator" [class.voice]="lastChannel() === 'VOZ'">
              {{ isListening() ? 'CAPTANDO VOZ...' : ('CANAL: ' + lastChannel()) }}
            </span>

            <button
              type="button"
              class="btn-consult-primary"
              [disabled]="isLoading() || !promptText.trim()"
              (click)="ejecutarConsulta('TEXTO')">
              {{ isLoading() ? 'Procesando SQL...' : 'Consultar con Gemini' }}
            </button>
          </div>

          <!-- Chips de consultas rápidas sugeridas + Prueba de Blindaje DDL -->
          <div class="quick-chips-bar">
            <span class="chips-title">Consultas de demostración:</span>
            @for (chip of samplePrompts; track chip.label) {
              <button
                type="button"
                class="query-chip"
                [class.security-chip]="chip.isSecurityTest"
                (click)="usarPromptSugerido(chip.prompt, chip.channel)">
                {{ chip.label }}
              </button>
            }
          </div>
        </section>

        <!-- =============================================================== -->
        <!-- BANNER DE ERROR / BLOQUEO DE SEGURIDAD O SUSCRIPCIÓN (400 / 403)-->
        <!-- =============================================================== -->
        @if (errorBanner()) {
          <section class="security-alert-banner" [class.forbidden]="errorStatus() === 403">
            <div class="alert-badge-col">
              <span class="http-code-pill">HTTP {{ errorStatus() }}</span>
            </div>
            <div class="alert-text-col">
              <h4>
                {{ errorStatus() === 403
                  ? 'Restricción de Plan de Suscripción SaaS / Aislamiento Multitenant'
                  : 'Escudo SQLSecurityAuditor Activado — Operación Bloqueada' }}
              </h4>
              <p>{{ errorBanner() }}</p>
            </div>
            <button type="button" class="btn-dismiss-alert" (click)="errorBanner.set(null)">&times;</button>
          </section>
        }

        <!-- =============================================================== -->
        <!-- GRILLA PRINCIPAL: RESULTADO ACTUAL + HISTORIAL PERSISTIDO       -->
        <!-- =============================================================== -->
        <div class="main-workspace-grid">

          <!-- COLUMNA IZQUIERDA (70%): REPORTE EJECUTIVO Y TABLA DINÁMICA -->
          <div class="report-stage-col">
            @if (currentReport(); as rep) {
              <article class="executive-report-card">
                <!-- Barra Superior con Metadatos y Botones de Exportación CU22 -->
                <div class="report-card-topbar">
                  <div class="report-meta-badges">
                    <span class="badge-id">REPORTE #{{ rep.reporte_id }}</span>
                    <span class="badge-tenant">empresa_id = {{ rep.empresa_id }} ({{ rep.empresa_nombre }})</span>
                    <span class="badge-channel" [class.is-voice]="rep.tipo_entrada === 'VOZ'">
                      ENTRADA: {{ rep.tipo_entrada }}
                    </span>
                    <span class="badge-format">FORMATO: {{ rep.formato_exportacion }}</span>
                  </div>

                  <div class="export-actions-group">
                    <button
                      type="button"
                      class="btn-tts"
                      [class.speaking]="isSpeaking()"
                      (click)="toggleLecturaVoz(rep.respuesta_resumen)">
                      {{ isSpeaking() ? 'Detener Audio' : 'Escuchar Síntesis' }}
                    </button>

                    <button
                      type="button"
                      class="btn-export-pdf"
                      [disabled]="isExporting()"
                      (click)="descargarReporte(rep.reporte_id, 'PDF')"
                      title="Generar documento PDF ejecutivo con ReportLab Platypus (CU22)">
                      <span class="fmt-tag">PDF</span>
                      Exportar PDF
                    </button>

                    <button
                      type="button"
                      class="btn-export-excel"
                      [disabled]="isExporting()"
                      (click)="descargarReporte(rep.reporte_id, 'EXCEL')"
                      title="Generar libro Excel corporativo con fórmulas SUM y autofiltros en OpenPyXL (CU22)">
                      <span class="fmt-tag">XLSX</span>
                      Exportar Excel
                    </button>
                  </div>
                </div>

                <!-- Pregunta Original y Síntesis Ejecutiva de Gemini -->
                <div class="synthesis-box">
                  <div class="prompt-echo-line">
                    <span class="prompt-lbl">CONSULTA:</span>
                    <span class="prompt-val">"{{ rep.prompt_consulta }}"</span>
                  </div>
                  <div class="gemini-summary-block">
                    <div class="summary-title">SÍNTESIS EJECUTIVA IA GENERATIVA</div>
                    <p class="summary-paragraph">{{ rep.respuesta_resumen }}</p>
                  </div>
                </div>

                <!-- Tabla Dinámica Zebra con Resultados Reales de PostgreSQL -->
                <div class="data-section">
                  <div class="section-header-inline">
                    <h3>Resultados Tabulares en Tiempo Real ({{ rep.datos_tabulares.length }} registros)</h3>
                    <span class="engine-note">{{ rep.motor_ia }}</span>
                  </div>

                  @if (rep.datos_tabulares.length > 0) {
                    <div class="table-scroll-box">
                      <table class="p3-zebra-table">
                        <thead>
                          <tr>
                            @for (col of rep.columnas; track col) {
                              <th [class.num-col]="isNumericColumn(col, rep.datos_tabulares)">
                                {{ formatColHeader(col) }}
                              </th>
                            }
                          </tr>
                        </thead>
                        <tbody>
                          @for (row of rep.datos_tabulares; track $index) {
                            <tr>
                              @for (col of rep.columnas; track col) {
                                <td [class.num-col]="isNumericColumn(col, rep.datos_tabulares)">
                                  {{ formatCellValue(row[col], col) }}
                                </td>
                              }
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  } @else {
                    <div class="empty-rows-msg">
                      La consulta SQL ejecutada no devolvió filas para los criterios actuales del tenant.
                    </div>
                  }
                </div>

                <!-- Inspector de Auditoría SQL Multitenant (Read-Only) -->
                <div class="sql-audit-panel">
                  <div class="sql-audit-header">
                    <span class="shield-ok">&#10003; AUDITORÍA SQL MULTITENANT APROBADA (SELECT READ-ONLY)</span>
                    <span class="timeout-tag">statement_timeout = 5000ms</span>
                  </div>
                  <pre class="sql-code-block"><code>{{ rep.sql_generado }}</code></pre>
                </div>
              </article>
            } @else {
              <div class="placeholder-stage-card">
                <div class="placeholder-icon">IA</div>
                <h3>Seleccione o formule una consulta comercial</h3>
                <p>
                  Utilice la barra superior por teclado o micrófono para consultar ventas, sucursales, clientes VIP o inventario
                  con aislamiento automático por empresa en PostgreSQL.
                </p>
              </div>
            }
          </div>

          <!-- COLUMNA DERECHA (30%): BITÁCORA DE REPORTES IA DEL TENANT -->
          <aside class="history-sidebar-col">
            <div class="history-card">
              <div class="history-header">
                <div>
                  <h3>Historial Persistido</h3>
                  <p>Tabla <code>reporte_generativo_ia</code> (Tenant #{{ activeTenantId() }})</p>
                </div>
                <button type="button" class="btn-refresh-mini" (click)="cargarHistorial()">Actualizar</button>
              </div>

              @if (historialList().length > 0) {
                <div class="history-list">
                  @for (item of historialList(); track item.reporte_id) {
                    <div
                      class="history-item"
                      [class.selected]="currentReport()?.reporte_id === item.reporte_id"
                      (click)="cargarReporteExistente(item.reporte_id)">
                      <div class="hist-top-row">
                        <span class="hist-id">#{{ item.reporte_id }}</span>
                        <span class="hist-channel" [class.voice]="item.tipo_entrada === 'VOZ'">
                          {{ item.tipo_entrada }}
                        </span>
                        <span class="hist-fmt">{{ item.formato_exportacion }}</span>
                      </div>
                      <p class="hist-prompt">{{ item.prompt_consulta }}</p>
                      <div class="hist-footer-row" (click)="$event.stopPropagation()">
                        <span class="hist-date">{{ item.fecha_consulta | date:'dd/MM HH:mm' }}</span>
                        <div class="hist-mini-exports">
                          <button type="button" class="mini-exp pdf" (click)="descargarReporte(item.reporte_id, 'PDF')">PDF</button>
                          <button type="button" class="mini-exp xls" (click)="descargarReporte(item.reporte_id, 'EXCEL')">XLSX</button>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-history">
                  No existen reportes registrados para el tenant seleccionado.
                </div>
              }
            </div>
          </aside>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .p3-page-shell {
      background: #f4f6f9;
      min-height: calc(100vh - 70px);
      padding: 1.75rem 2rem 3.5rem;
      color: #0f172a;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .p3-container {
      max-width: 1420px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.35rem;
    }
    .p3-hero-header {
      background: linear-gradient(135deg, #0b1120 0%, #1e293b 100%);
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
    .hero-left {
      max-width: 760px;
    }
    .eyebrow-row {
      display: flex;
      gap: 0.6rem;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 0.65rem;
    }
    .eyebrow-pill {
      background: rgba(197, 168, 128, 0.2);
      color: #eacda3;
      border: 1px solid rgba(197, 168, 128, 0.5);
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      padding: 0.22rem 0.65rem;
      border-radius: 999px;
    }
    .gemini-engine-pill {
      background: rgba(37, 99, 235, 0.25);
      color: #93c5fd;
      border: 1px solid rgba(96, 165, 250, 0.4);
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.22rem 0.65rem;
      border-radius: 999px;
    }
    .hero-title {
      font-size: 1.65rem;
      font-weight: 800;
      margin: 0 0 0.45rem;
      letter-spacing: -0.02em;
    }
    .hero-subtitle {
      margin: 0;
      font-size: 0.88rem;
      color: #cbd5e1;
      line-height: 1.5;
    }
    .hero-subtitle code {
      background: rgba(255, 255, 255, 0.12);
      color: #fde68a;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }
    .hero-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.85rem;
    }
    .nav-switch-group {
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
      transition: all 0.18s ease;
    }
    .btn-nav-outline {
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: rgba(255, 255, 255, 0.06);
    }
    .btn-nav-outline:hover {
      background: rgba(255, 255, 255, 0.14);
    }
    .btn-nav-gold {
      background: #c5a880;
      color: #0f172a;
      border: 1px solid #d4b996;
    }
    .btn-nav-gold:hover {
      background: #d8be98;
    }
    .tenant-simulator-box {
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(148, 163, 184, 0.25);
      padding: 0.55rem 0.75rem;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .sim-label {
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #94a3b8;
    }
    .sim-pills {
      display: flex;
      gap: 0.45rem;
      flex-wrap: wrap;
    }
    .sim-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.32rem 0.65rem;
      border-radius: 6px;
      border: 1px solid rgba(148, 163, 184, 0.3);
      background: rgba(30, 41, 59, 0.7);
      color: #cbd5e1;
      cursor: pointer;
    }
    .sim-pill.active-elegance {
      background: rgba(16, 185, 129, 0.2);
      border-color: #10b981;
      color: #ecfdf5;
    }
    .sim-pill.active-urban {
      background: rgba(245, 158, 11, 0.22);
      border-color: #f59e0b;
      color: #fffbeb;
    }
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }
    .dot-green { background: #10b981; }
    .dot-amber { background: #f59e0b; }

    /* Consola NLQ */
    .query-console-card {
      background: #ffffff;
      border-radius: 12px;
      padding: 1.25rem 1.4rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
    }
    .console-input-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #f8fafc;
      border: 2px solid #cbd5e1;
      border-radius: 10px;
      padding: 0.45rem 0.6rem;
      transition: border-color 0.2s;
    }
    .console-input-bar:focus-within {
      border-color: #1e3a8a;
      background: #ffffff;
    }
    .console-input-bar.is-recording {
      border-color: #dc2626;
      background: #fef2f2;
    }
    .btn-mic-circle {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      border: none;
      background: #0f172a;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: transform 0.15s, background 0.2s;
    }
    .btn-mic-circle.recording {
      background: #dc2626;
      animation: pulseMic 1.2s infinite;
    }
    @keyframes pulseMic {
      0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.45); }
      50% { box-shadow: 0 0 0 9px rgba(220, 38, 38, 0); }
    }
    .wave-bars {
      display: flex;
      gap: 3px;
      align-items: center;
    }
    .wave-bars span {
      width: 3px;
      height: 14px;
      background: #fff;
      border-radius: 2px;
      animation: waveAnim 0.8s infinite ease-in-out;
    }
    .wave-bars span:nth-child(2) { animation-delay: 0.15s; height: 18px; }
    .wave-bars span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes waveAnim {
      0%, 100% { transform: scaleY(0.5); }
      50% { transform: scaleY(1.15); }
    }
    .nlq-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 0.96rem;
      color: #0f172a;
      outline: none;
      min-width: 180px;
    }
    .channel-indicator {
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.25rem 0.55rem;
      border-radius: 6px;
      background: #e2e8f0;
      color: #334155;
      white-space: nowrap;
    }
    .channel-indicator.voice {
      background: #dbeafe;
      color: #1d4ed8;
    }
    .btn-consult-primary {
      background: #1e3a8a;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 0.68rem 1.25rem;
      font-size: 0.86rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.18s;
    }
    .btn-consult-primary:hover:not(:disabled) {
      background: #1d4ed8;
    }
    .btn-consult-primary:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .quick-chips-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.85rem;
    }
    .chips-title {
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748b;
    }
    .query-chip {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #1e293b;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.3rem 0.7rem;
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .query-chip:hover {
      background: #e2e8f0;
      border-color: #94a3b8;
    }
    .query-chip.security-chip {
      background: #fef2f2;
      border-color: #fca5a5;
      color: #b91c1c;
    }
    .query-chip.security-chip:hover {
      background: #fee2e2;
    }

    /* Alert Banner */
    .security-alert-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #fef2f2;
      border: 1px solid #f87171;
      border-left: 6px solid #dc2626;
      border-radius: 10px;
      padding: 1rem 1.25rem;
      color: #7f1d1d;
    }
    .security-alert-banner.forbidden {
      background: #fffbeb;
      border-color: #fbbf24;
      border-left-color: #d97706;
      color: #78350f;
    }
    .http-code-pill {
      display: inline-block;
      font-family: ui-monospace, monospace;
      font-weight: 800;
      font-size: 0.8rem;
      padding: 0.3rem 0.6rem;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.08);
    }
    .alert-text-col {
      flex: 1;
    }
    .alert-text-col h4 {
      margin: 0 0 0.2rem;
      font-size: 0.92rem;
      font-weight: 800;
    }
    .alert-text-col p {
      margin: 0;
      font-size: 0.84rem;
    }
    .btn-dismiss-alert {
      background: transparent;
      border: none;
      font-size: 1.35rem;
      cursor: pointer;
      color: inherit;
    }

    /* Workspace Grid */
    .main-workspace-grid {
      display: grid;
      grid-template-columns: minmax(0, 2.35fr) minmax(300px, 1fr);
      gap: 1.35rem;
      align-items: start;
    }
    @media (max-width: 1080px) {
      .main-workspace-grid {
        grid-template-columns: 1fr;
      }
    }

    .executive-report-card, .history-card, .placeholder-stage-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
    }
    .executive-report-card {
      padding: 1.4rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .report-card-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding-bottom: 0.9rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .report-meta-badges {
      display: flex;
      gap: 0.45rem;
      flex-wrap: wrap;
      align-items: center;
    }
    .badge-id, .badge-tenant, .badge-channel, .badge-format {
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.25rem 0.55rem;
      border-radius: 6px;
    }
    .badge-id { background: #0f172a; color: #fff; }
    .badge-tenant { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .badge-channel { background: #f1f5f9; color: #334155; }
    .badge-channel.is-voice { background: #dbeafe; color: #1e40af; }
    .badge-format { background: #fef3c7; color: #92400e; }

    .export-actions-group {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .btn-tts, .btn-export-pdf, .btn-export-excel {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 0.48rem 0.85rem;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s;
    }
    .btn-tts {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #1e293b;
    }
    .btn-tts.speaking {
      background: #dbeafe;
      border-color: #3b82f6;
      color: #1d4ed8;
    }
    .btn-export-pdf {
      background: #dc2626;
      color: #ffffff;
    }
    .btn-export-pdf:hover:not(:disabled) { background: #b91c1c; }
    .btn-export-excel {
      background: #059669;
      color: #ffffff;
    }
    .btn-export-excel:hover:not(:disabled) { background: #047857; }
    .fmt-tag {
      background: rgba(0, 0, 0, 0.22);
      font-size: 0.65rem;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      font-family: ui-monospace, monospace;
    }

    /* Synthesis Box */
    .synthesis-box {
      background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
      border: 1px solid #bfdbfe;
      border-left: 5px solid #1e3a8a;
      border-radius: 8px;
      padding: 1rem 1.15rem;
    }
    .prompt-echo-line {
      font-size: 0.8rem;
      margin-bottom: 0.55rem;
      color: #475569;
    }
    .prompt-lbl {
      font-weight: 800;
      color: #1e3a8a;
      margin-right: 0.4rem;
    }
    .prompt-val {
      font-style: italic;
      font-weight: 600;
    }
    .summary-title {
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #1d4ed8;
      margin-bottom: 0.3rem;
    }
    .summary-paragraph {
      margin: 0;
      font-size: 0.92rem;
      line-height: 1.55;
      color: #0f172a;
      font-weight: 500;
    }

    /* Zebra Table */
    .section-header-inline {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.65rem;
    }
    .section-header-inline h3 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 800;
      color: #0f172a;
    }
    .engine-note {
      font-size: 0.73rem;
      color: #64748b;
      font-weight: 600;
    }
    .table-scroll-box {
      overflow-x: auto;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
    }
    .p3-zebra-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.83rem;
    }
    .p3-zebra-table thead th {
      background: #1e3a8a;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 0.68rem 0.85rem;
      font-size: 0.74rem;
      letter-spacing: 0.04em;
      white-space: nowrap;
    }
    .p3-zebra-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    .p3-zebra-table tbody tr:hover {
      background: #eff6ff;
    }
    .p3-zebra-table td {
      padding: 0.6rem 0.85rem;
      border-top: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .p3-zebra-table th.num-col,
    .p3-zebra-table td.num-col {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    /* SQL Audit Panel */
    .sql-audit-panel {
      background: #0f172a;
      border-radius: 8px;
      padding: 0.85rem 1rem;
      color: #e2e8f0;
    }
    .sql-audit-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.45rem;
      font-size: 0.7rem;
      font-weight: 800;
    }
    .shield-ok { color: #34d399; }
    .timeout-tag {
      color: #94a3b8;
      font-family: ui-monospace, monospace;
    }
    .sql-code-block {
      margin: 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.78rem;
      color: #93c5fd;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.45;
    }

    /* History Sidebar */
    .history-card {
      padding: 1.15rem;
    }
    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.9rem;
      padding-bottom: 0.65rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .history-header h3 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 800;
    }
    .history-header p {
      margin: 0.15rem 0 0;
      font-size: 0.73rem;
      color: #64748b;
    }
    .btn-refresh-mini {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.28rem 0.55rem;
      cursor: pointer;
    }
    .history-list {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      max-height: 620px;
      overflow-y: auto;
    }
    .history-item {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.7rem 0.8rem;
      cursor: pointer;
      transition: all 0.15s;
      background: #fafafa;
    }
    .history-item:hover {
      border-color: #93c5fd;
      background: #f8fafc;
    }
    .history-item.selected {
      border-color: #1e3a8a;
      background: #eff6ff;
    }
    .hist-top-row {
      display: flex;
      gap: 0.4rem;
      align-items: center;
      margin-bottom: 0.35rem;
      font-size: 0.68rem;
      font-weight: 800;
    }
    .hist-id { color: #0f172a; }
    .hist-channel {
      background: #e2e8f0;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
    }
    .hist-channel.voice { background: #dbeafe; color: #1d4ed8; }
    .hist-fmt {
      margin-left: auto;
      color: #64748b;
    }
    .hist-prompt {
      margin: 0 0 0.45rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: #1e293b;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .hist-footer-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .hist-date {
      font-size: 0.7rem;
      color: #64748b;
    }
    .hist-mini-exports {
      display: flex;
      gap: 0.3rem;
    }
    .mini-exp {
      border: none;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 800;
      padding: 0.18rem 0.42rem;
      cursor: pointer;
      color: #fff;
    }
    .mini-exp.pdf { background: #dc2626; }
    .mini-exp.xls { background: #059669; }
    .placeholder-stage-card {
      padding: 3rem 2rem;
      text-align: center;
      color: #475569;
    }
    .placeholder-icon {
      width: 54px;
      height: 54px;
      border-radius: 12px;
      background: #1e3a8a;
      color: #fff;
      font-weight: 800;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.8rem;
    }
    .empty-history, .empty-rows-msg {
      padding: 1.25rem;
      text-align: center;
      font-size: 0.82rem;
      color: #64748b;
    }
  `]
})
export class AiReportAssistantComponent implements OnInit, OnDestroy {
  private readonly aiService = inject(FashionAiMlService);
  readonly authService = inject(AuthService);

  promptText = '¿Cuál es la prenda más vendida este mes?';
  readonly activeTenantId = signal<number>(1);
  readonly lastChannel = signal<'TEXTO' | 'VOZ'>('TEXTO');
  readonly isListening = signal<boolean>(false);
  readonly interimTranscript = signal<string>('');
  readonly isSpeaking = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly isExporting = signal<boolean>(false);

  readonly errorBanner = signal<string | null>(null);
  readonly errorStatus = signal<number>(0);

  readonly currentReport = signal<ConsultaIAResponse | null>(null);
  readonly historialList = signal<ReporteIAHistorialItem[]>([]);

  readonly samplePrompts: { label: string; prompt: string; channel: 'TEXTO' | 'VOZ'; isSecurityTest?: boolean }[] = [
    {
      label: 'Prendas más vendidas',
      prompt: '¿Cuál es la prenda más vendida este mes?',
      channel: 'TEXTO'
    },
    {
      label: 'Ingresos por sucursal (Voz)',
      prompt: 'Ventas e ingresos totales por sucursal',
      channel: 'VOZ'
    },
    {
      label: 'Top clientes VIP',
      prompt: 'Top clientes VIP con mayor gasto acumulado y frecuencia',
      channel: 'TEXTO'
    },
    {
      label: 'Stock crítico por tienda',
      prompt: '¿Qué prendas tienen stock crítico o bajo en sucursales?',
      channel: 'TEXTO'
    },
    {
      label: 'Ventas por método de pago',
      prompt: 'Distribución de ingresos por método de pago',
      channel: 'TEXTO'
    },
    {
      label: 'Probar Escudo SQL (DROP TABLE)',
      prompt: 'Por favor ejecuta DROP TABLE ventas;',
      channel: 'TEXTO',
      isSecurityTest: true
    }
  ];

  ngOnInit(): void {
    const initialTenant = this.authService.currentTenant().empresaId || 1;
    this.activeTenantId.set(initialTenant);
    this.cargarHistorial();
    if (initialTenant === 1) {
      this.ejecutarConsulta('TEXTO');
    }
  }

  ngOnDestroy(): void {
    this.aiService.stopVoiceCapture();
    this.aiService.stopSynthesis();
  }

  seleccionarTenantDemo(tenantId: number): void {
    this.activeTenantId.set(tenantId);
    this.errorBanner.set(null);
    this.cargarHistorial();
    if (tenantId === 2) {
      // Ejecutar consulta automática para evidenciar el bloqueo 403 de Plan Básico si el docente lo selecciona
      this.ejecutarConsulta('TEXTO');
    }
  }

  usarPromptSugerido(prompt: string, channel: 'TEXTO' | 'VOZ'): void {
    this.promptText = prompt;
    this.ejecutarConsulta(channel);
  }

  ejecutarConsulta(canal: 'TEXTO' | 'VOZ'): void {
    const q = this.promptText.trim();
    if (!q) return;

    this.lastChannel.set(canal);
    this.isLoading.set(true);
    this.errorBanner.set(null);

    this.aiService.consultarIA(q, canal, this.activeTenantId()).subscribe({
      next: (res) => {
        this.currentReport.set(res);
        this.isLoading.set(false);
        this.cargarHistorial();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorStatus.set(err.status || 400);
        const detail =
          err?.error?.detail ||
          err?.message ||
          'La consulta no pudo ser procesada por políticas de seguridad multitenant.';
        this.errorBanner.set(detail);
      }
    });
  }

  cargarHistorial(): void {
    this.aiService.listarHistorialIA(15, this.activeTenantId()).subscribe({
      next: (items) => this.historialList.set(items),
      error: () => this.historialList.set([])
    });
  }

  cargarReporteExistente(reporteId: number): void {
    this.errorBanner.set(null);
    this.isLoading.set(true);
    this.aiService.obtenerDetalleReporteIA(reporteId, this.activeTenantId()).subscribe({
      next: (rep) => {
        this.currentReport.set(rep);
        this.promptText = rep.prompt_consulta;
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorStatus.set(err.status || 403);
        this.errorBanner.set(err?.error?.detail || 'No tiene autorización para consultar este reporte.');
      }
    });
  }

  descargarReporte(reporteId: number, formato: 'PDF' | 'EXCEL'): void {
    this.isExporting.set(true);
    this.errorBanner.set(null);

    const obs =
      formato === 'PDF'
        ? this.aiService.exportarReportePDF(reporteId, this.activeTenantId())
        : this.aiService.exportarReporteExcel(reporteId, this.activeTenantId());

    obs.subscribe({
      next: (blob) => {
        const ext = formato === 'PDF' ? 'pdf' : 'xlsx';
        const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        this.aiService.descargarBlobEnNavegador(blob, `Reporte_IA_${reporteId}_${stamp}.${ext}`);
        this.isExporting.set(false);
        if (this.currentReport()?.reporte_id === reporteId) {
          this.currentReport.update(cur => (cur ? { ...cur, formato_exportacion: formato } : cur));
        }
        this.cargarHistorial();
      },
      error: (err) => {
        this.isExporting.set(false);
        this.errorStatus.set(err.status || 403);
        this.errorBanner.set(
          err?.error?.detail ||
            'Aislamiento Multitenant: No tiene autorización para exportar reportes de otra empresa (403 Forbidden).'
        );
      }
    });
  }

  toggleDictadoVoz(): void {
    if (this.isListening()) {
      this.aiService.stopVoiceCapture();
      this.isListening.set(false);
      return;
    }

    if (!this.aiService.isSpeechRecognitionSupported()) {
      // Modo asistido si el navegador no expone SpeechRecognition
      this.promptText = 'Ventas e ingresos totales por sucursal';
      this.ejecutarConsulta('VOZ');
      return;
    }

    this.isListening.set(true);
    this.interimTranscript.set('');
    this.aiService.startVoiceCapture(
      (interim) => this.interimTranscript.set(interim),
      (finalText) => {
        this.promptText = finalText;
        this.isListening.set(false);
        this.ejecutarConsulta('VOZ');
      },
      () => {
        this.isListening.set(false);
      },
      () => {
        this.isListening.set(false);
      }
    );
  }

  toggleLecturaVoz(texto: string): void {
    if (this.isSpeaking()) {
      this.aiService.stopSynthesis();
      this.isSpeaking.set(false);
      return;
    }
    this.aiService.speakSynthesis(
      texto,
      () => this.isSpeaking.set(true),
      () => this.isSpeaking.set(false)
    );
  }

  formatColHeader(col: string): string {
    return col.replace(/_/g, ' ').toUpperCase();
  }

  isNumericColumn(col: string, rows: Record<string, any>[]): boolean {
    if (!rows.length) return false;
    const sample = rows[0][col];
    return typeof sample === 'number';
  }

  formatCellValue(val: any, col: string): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') {
      const lower = col.toLowerCase();
      if (lower.includes('bs') || lower.includes('monto') || lower.includes('ingreso') || lower.includes('precio') || lower.includes('total_gastado') || lower.includes('ticket')) {
        return `Bs. ${val.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      if (Number.isInteger(val)) {
        return val.toLocaleString('es-BO');
      }
      return val.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return String(val);
  }
}
