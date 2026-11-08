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
    <div class="ai-report-page">
      <div class="ai-report-container">

        <!-- =============================================================== -->
        <!-- ENCABEZADO COMPACTO Y ELEGANTE                                  -->
        <!-- =============================================================== -->
        <header class="assistant-header">
          <div class="header-main">
            <div class="header-icon-badge">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            </div>
            <div class="header-titles">
              <h1 class="header-title">Asistente de Reportes IA</h1>
              <p class="header-desc">Consulta tus ventas, inventario y clientes de forma rápida e inteligente.</p>
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
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="9"/>
                  <rect x="14" y="3" width="7" height="5"/>
                  <rect x="14" y="12" width="7" height="9"/>
                  <rect x="3" y="16" width="7" height="5"/>
                </svg>
                <span>Dashboard BI</span>
              </a>
              <a routerLink="/dashboard/machine-learning" class="btn-nav-accent">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
                <span>Laboratorio ML</span>
              </a>
            </div>
          </div>
        </header>

        <!-- =============================================================== -->
        <!-- ÁREA DE CONSULTA MODERNA (TEXTO / VOZ)                         -->
        <!-- =============================================================== -->
        <section class="query-card">
          <div class="query-input-bar" [class.is-recording]="isListening()" [class.is-loading]="isLoading()">
            <button
              type="button"
              class="btn-mic"
              [class.active-mic]="isListening()"
              (click)="toggleDictadoVoz()"
              [title]="isListening() ? 'Detener captura de voz' : 'Dictar consulta por voz'">
              @if (!isListening()) {
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              } @else {
                <div class="mic-wave">
                  <span></span><span></span><span></span>
                </div>
              }
            </button>

            <input
              type="text"
              class="query-text-input"
              [(ngModel)]="promptText"
              (keyup.enter)="ejecutarConsulta('TEXTO')"
              [disabled]="isLoading()"
              [placeholder]="isListening()
                ? (interimTranscript() || 'Escuchando dictado...')
                : 'Haz una pregunta sobre tus ventas, stock o clientes...'"
            />

            @if (isListening()) {
              <span class="listening-tag">ESCUCHANDO...</span>
            }

            <button
              type="button"
              class="btn-primary-query"
              [disabled]="isLoading() || !promptText.trim()"
              (click)="ejecutarConsulta('TEXTO')">
              @if (isLoading()) {
                <span class="spinner-sm"></span>
                <span>Consultando...</span>
              } @else {
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <span>Consultar</span>
              }
            </button>
          </div>

          <!-- Sugerencias rápidas de consulta -->
          <div class="suggested-queries-row">
            <span class="suggestions-label">Sugerencias:</span>
            <div class="chips-container">
              @for (chip of samplePrompts; track chip.label) {
                <button
                  type="button"
                  class="suggestion-chip"
                  (click)="usarPromptSugerido(chip.prompt, chip.channel)">
                  {{ chip.label }}
                </button>
              }
            </div>
          </div>
        </section>

        <!-- =============================================================== -->
        <!-- BANNER DE RESTRICCIÓN O ERROR                                   -->
        <!-- =============================================================== -->
        @if (errorBanner()) {
          <section class="alert-banner" [class.alert-plan]="errorStatus() === 403">
            <div class="alert-content">
              <div class="alert-icon-box">
                @if (errorStatus() === 403) {
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                } @else {
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                }
              </div>
              <div class="alert-text">
                <h4 class="alert-heading">
                  {{ errorStatus() === 403 ? 'Función no disponible en el Plan Actual' : 'No se pudo completar la consulta' }}
                </h4>
                <p class="alert-msg">{{ errorBanner() }}</p>
              </div>
            </div>
            <button type="button" class="btn-close-alert" (click)="errorBanner.set(null)" aria-label="Cerrar">&times;</button>
          </section>
        }

        <!-- =============================================================== -->
        <!-- CUERPO PRINCIPAL: RESULTADOS + HISTORIAL                       -->
        <!-- =============================================================== -->
        <main class="main-layout-grid">

          <!-- COLUMNA PRINCIPAL: RESULTADOS Y SÍNTESIS -->
          <div class="results-column">
            @if (currentReport(); as rep) {
              <article class="report-result-card">

                <!-- Barra Superior del Reporte -->
                <div class="report-header-bar">
                  <div class="report-meta">
                    <span class="report-number">Reporte #{{ rep.reporte_id }}</span>
                    <span class="report-channel-badge" [class.is-voice]="rep.tipo_entrada === 'VOZ'">
                      {{ rep.tipo_entrada === 'VOZ' ? 'Voz' : 'Texto' }}
                    </span>
                    <span class="report-date">{{ rep.fecha_consulta | date:'dd MMM yyyy, HH:mm' }}</span>
                  </div>

                  <div class="report-actions">
                    <button
                      type="button"
                      class="btn-action-subtle"
                      [class.is-active]="isSpeaking()"
                      (click)="toggleLecturaVoz(rep.respuesta_resumen)"
                      title="Escuchar síntesis en audio">
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                      </svg>
                      <span>{{ isSpeaking() ? 'Detener voz' : 'Escuchar' }}</span>
                    </button>

                    <button
                      type="button"
                      class="btn-export-item btn-pdf"
                      [disabled]="isExporting()"
                      (click)="descargarReporte(rep.reporte_id, 'PDF')"
                      title="Descargar reporte en formato PDF">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span>PDF</span>
                    </button>

                    <button
                      type="button"
                      class="btn-export-item btn-excel"
                      [disabled]="isExporting()"
                      (click)="descargarReporte(rep.reporte_id, 'EXCEL')"
                      title="Descargar reporte en formato Excel">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="8" y1="13" x2="16" y2="13"/>
                        <line x1="8" y1="17" x2="16" y2="17"/>
                      </svg>
                      <span>Excel</span>
                    </button>
                  </div>
                </div>

                <!-- Pregunta formulada -->
                <div class="question-callout">
                  <span class="question-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </span>
                  <span class="question-text">"{{ rep.prompt_consulta }}"</span>
                </div>

                <!-- Síntesis Ejecutiva -->
                @if (rep.respuesta_resumen) {
                  <div class="synthesis-card">
                    <div class="synthesis-header">
                      <span class="synthesis-tag">SÍNTESIS EJECUTIVA</span>
                    </div>
                    <p class="synthesis-body">{{ rep.respuesta_resumen }}</p>
                  </div>
                }

                <!-- Tabla de Resultados Rediseñada -->
                <div class="table-section">
                  <div class="table-section-header">
                    <h3 class="table-section-title">Resultados detallados</h3>
                    <span class="table-count-badge">{{ rep.datos_tabulares.length }} registros</span>
                  </div>

                  @if (rep.datos_tabulares.length > 0) {
                    <div class="table-responsive-wrapper">
                      <table class="saas-table">
                        <thead>
                          <tr>
                            @for (col of rep.columnas; track col) {
                              <th [class.cell-right]="isNumericColumn(col, rep.datos_tabulares)">
                                {{ formatColHeader(col) }}
                              </th>
                            }
                          </tr>
                        </thead>
                        <tbody>
                          @for (row of rep.datos_tabulares; track $index) {
                            <tr>
                              @for (col of rep.columnas; track col) {
                                <td [class.cell-right]="isNumericColumn(col, rep.datos_tabulares)"
                                    [class.cell-currency]="isCurrencyCol(col)">
                                  {{ formatCellValue(row[col], col) }}
                                </td>
                              }
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  } @else {
                    <div class="empty-results-box">
                      <p>No se encontraron registros para los criterios de esta consulta.</p>
                    </div>
                  }
                </div>

              </article>
            } @else {
              <!-- Estado inicial cuando no hay reporte activo -->
              <div class="empty-state-card">
                <div class="empty-icon-circle">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <h3 class="empty-state-title">Haz tu primera consulta</h3>
                <p class="empty-state-desc">
                  Escribe en el campo superior o utiliza el micrófono para consultar el estado de tu negocio.
                  También puedes hacer clic en cualquiera de las sugerencias rápidas.
                </p>
              </div>
            }
          </div>

          <!-- COLUMNA LATERAL: HISTORIAL DE CONSULTAS -->
          <aside class="history-column">
            <div class="history-panel">
              <div class="history-panel-header">
                <div>
                  <h3 class="history-title">Historial de Consultas</h3>
                  <p class="history-subtitle">Informes generados recientemente</p>
                </div>
                <button
                  type="button"
                  class="btn-refresh-history"
                  (click)="cargarHistorial()"
                  title="Actualizar historial">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                </button>
              </div>

              @if (historialList().length > 0) {
                <div class="history-items-list">
                  @for (item of historialList(); track item.reporte_id) {
                    <div
                      class="history-card-item"
                      [class.is-selected]="currentReport()?.reporte_id === item.reporte_id"
                      (click)="cargarReporteExistente(item.reporte_id)">
                      <div class="history-item-top">
                        <span class="history-item-num">#{{ item.reporte_id }}</span>
                        <span class="history-type-pill" [class.type-voice]="item.tipo_entrada === 'VOZ'">
                          {{ item.tipo_entrada === 'VOZ' ? 'Voz' : 'Texto' }}
                        </span>
                        <span class="history-item-time">{{ item.fecha_consulta | date:'dd MMM, HH:mm' }}</span>
                      </div>

                      <p class="history-item-prompt">{{ item.prompt_consulta }}</p>

                      <div class="history-item-actions" (click)="$event.stopPropagation()">
                        <button
                          type="button"
                          class="btn-hist-export pdf"
                          (click)="descargarReporte(item.reporte_id, 'PDF')"
                          title="Descargar PDF">
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                          <span>PDF</span>
                        </button>
                        <button
                          type="button"
                          class="btn-hist-export excel"
                          (click)="descargarReporte(item.reporte_id, 'EXCEL')"
                          title="Descargar Excel">
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                          <span>Excel</span>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-history-box">
                  <p>Aún no hay consultas en el historial de este tenant.</p>
                </div>
              }
            </div>
          </aside>

        </main>
      </div>
    </div>
  `,
  styles: [`
    /* ==========================================================================
       SISTEMA DE DISEÑO FASHIONSTORE: ASISTENTE DE REPORTES IA
       Paleta: #F8F9FC (Fondo) | #17243A (Primario) | #202938 (Texto)
               #C6A56B (Dorado Champán) | #087F6D (Esmeralda) | #E5E9F0 (Borde)
       ========================================================================== */

    :host {
      display: block;
      width: 100%;
      box-sizing: border-box;
      background: #F8F9FC;
    }

    .ai-report-page {
      background: #F8F9FC;
      min-height: calc(100vh - 70px);
      padding: 1.5rem 1.75rem 3rem;
      color: #202938;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-sizing: border-box;
      overflow-x: hidden;
    }

    .ai-report-container {
      max-width: 1380px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      box-sizing: border-box;
      width: 100%;
    }

    /* --------------------------------------------------------------------------
       1. ENCABEZADO ELEGANTE Y COMPACTO
       -------------------------------------------------------------------------- */
    .assistant-header {
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

    .header-main {
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

    .header-desc {
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
       2. ÁREA DE CONSULTAS
       -------------------------------------------------------------------------- */
    .query-card {
      background: #FFFFFF;
      border: 1px solid #E5E9F0;
      border-radius: 14px;
      padding: 1.15rem 1.35rem;
      box-shadow: 0 2px 10px rgba(23, 36, 58, 0.03);
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }

    .query-input-bar {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: #F8F9FC;
      border: 1px solid #E5E9F0;
      border-radius: 10px;
      padding: 0.35rem 0.5rem 0.35rem 0.75rem;
      transition: all 0.2s ease;
    }

    .query-input-bar:focus-within {
      background: #FFFFFF;
      border-color: #C6A56B;
      box-shadow: 0 0 0 3px rgba(198, 165, 107, 0.15);
    }

    .query-input-bar.is-recording {
      border-color: #DC2626;
      background: #FEF2F2;
      box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
    }

    .btn-mic {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: 1px solid #E5E9F0;
      background: #FFFFFF;
      color: #17243A;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }

    .btn-mic:hover {
      background: #F1F5F9;
      border-color: #CBD5E1;
    }

    .btn-mic.active-mic {
      background: #DC2626;
      border-color: #DC2626;
      color: #FFFFFF;
      box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.2);
    }

    .mic-wave {
      display: flex;
      align-items: center;
      gap: 2px;
      height: 14px;
    }

    .mic-wave span {
      width: 3px;
      height: 100%;
      background: #FFFFFF;
      border-radius: 2px;
      animation: wavePulse 0.8s infinite ease-in-out;
    }

    .mic-wave span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .mic-wave span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes wavePulse {
      0%, 100% { transform: scaleY(0.4); }
      50% { transform: scaleY(1); }
    }

    .query-text-input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: 0.92rem;
      color: #202938;
      font-family: inherit;
      padding: 0.4rem 0.2rem;
    }

    .query-text-input::placeholder {
      color: #94A3B8;
    }

    .listening-tag {
      font-size: 0.72rem;
      font-weight: 700;
      color: #DC2626;
      letter-spacing: 0.05em;
      padding: 2px 6px;
      background: rgba(220, 38, 38, 0.08);
      border-radius: 4px;
    }

    .btn-primary-query {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.6rem 1.15rem;
      background: #17243A;
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      font-size: 0.84rem;
      font-weight: 600;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.15s ease;
    }

    .btn-primary-query:hover:not(:disabled) {
      background: #0F1826;
      box-shadow: 0 3px 8px rgba(23, 36, 58, 0.18);
    }

    .btn-primary-query:disabled {
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

    .suggested-queries-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }

    .suggestions-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: #64748B;
    }

    .chips-container {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      flex-wrap: wrap;
    }

    .suggestion-chip {
      background: #FFFFFF;
      border: 1px solid #E5E9F0;
      border-radius: 6px;
      padding: 0.3rem 0.65rem;
      font-size: 0.76rem;
      font-weight: 500;
      color: #202938;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .suggestion-chip:hover {
      background: #FBF7F0;
      border-color: #C6A56B;
      color: #17243A;
    }

    /* --------------------------------------------------------------------------
       3. ALERTAS DE ERROR O PLAN
       -------------------------------------------------------------------------- */
    .alert-banner {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      background: #FEF2F2;
      border: 1px solid #FECACA;
      border-radius: 10px;
      padding: 0.85rem 1rem;
      color: #991B1B;
      animation: slideDown 0.2s ease;
    }

    .alert-banner.alert-plan {
      background: #FFFBEB;
      border-color: #FDE68A;
      color: #92400E;
    }

    .alert-content {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
    }

    .alert-icon-box {
      margin-top: 1px;
      flex-shrink: 0;
    }

    .alert-heading {
      margin: 0;
      font-size: 0.88rem;
      font-weight: 700;
    }

    .alert-msg {
      margin: 0.2rem 0 0;
      font-size: 0.82rem;
      line-height: 1.4;
    }

    .btn-close-alert {
      background: transparent;
      border: none;
      color: inherit;
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
      padding: 0 4px;
      opacity: 0.7;
    }

    .btn-close-alert:hover {
      opacity: 1;
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* --------------------------------------------------------------------------
       4. DISTRIBUCIÓN RESPONSIVE (GRILLA PRINCIPAL)
       -------------------------------------------------------------------------- */
    .main-layout-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 370px;
      gap: 1.25rem;
      align-items: start;
      width: 100%;
    }

    .results-column {
      min-width: 0;
      width: 100%;
    }

    .history-column {
      min-width: 0;
      width: 100%;
    }

    /* --------------------------------------------------------------------------
       5. TARJETA DE REPORTE Y RESULTADOS
       -------------------------------------------------------------------------- */
    .report-result-card {
      background: #FFFFFF;
      border: 1px solid #E5E9F0;
      border-radius: 14px;
      padding: 1.35rem 1.5rem;
      box-shadow: 0 2px 10px rgba(23, 36, 58, 0.03);
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }

    .report-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      padding-bottom: 0.9rem;
      border-bottom: 1px solid #F1F5F9;
    }

    .report-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .report-number {
      font-size: 0.82rem;
      font-weight: 700;
      color: #17243A;
      background: #F1F5F9;
      padding: 3px 8px;
      border-radius: 4px;
    }

    .report-channel-badge {
      font-size: 0.74rem;
      font-weight: 600;
      color: #64748B;
      background: #F8F9FC;
      border: 1px solid #E5E9F0;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .report-channel-badge.is-voice {
      color: #087F6D;
      background: #E6F5F2;
      border-color: #C2EAE2;
    }

    .report-date {
      font-size: 0.78rem;
      color: #94A3B8;
    }

    .report-actions {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .btn-action-subtle {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.75rem;
      background: #FFFFFF;
      border: 1px solid #E5E9F0;
      border-radius: 6px;
      font-size: 0.76rem;
      font-weight: 500;
      color: #202938;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-action-subtle:hover {
      background: #F8F9FC;
      border-color: #CBD5E1;
    }

    .btn-action-subtle.is-active {
      background: #FBF7F0;
      border-color: #C6A56B;
      color: #9A7738;
    }

    .btn-export-item {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.75rem;
      border-radius: 6px;
      font-size: 0.76rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-export-item.btn-pdf {
      background: #FEF2F2;
      border: 1px solid #FEE2E2;
      color: #B91C1C;
    }

    .btn-export-item.btn-pdf:hover:not(:disabled) {
      background: #FEE2E2;
      border-color: #FECACA;
    }

    .btn-export-item.btn-excel {
      background: #E6F5F2;
      border: 1px solid #C2EAE2;
      color: #087F6D;
    }

    .btn-export-item.btn-excel:hover:not(:disabled) {
      background: #D1EFE9;
      border-color: #A3DFD4;
    }

    .btn-export-item:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Pregunta echo */
    .question-callout {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.25rem 0;
    }

    .question-icon {
      color: #C6A56B;
      margin-top: 2px;
      flex-shrink: 0;
    }

    .question-text {
      font-size: 1.05rem;
      font-weight: 600;
      color: #17243A;
      line-height: 1.35;
    }

    /* Síntesis Ejecutiva */
    .synthesis-card {
      background: #FBFBFD;
      border: 1px solid #E5E9F0;
      border-left: 3px solid #C6A56B;
      border-radius: 0 10px 10px 0;
      padding: 0.95rem 1.15rem;
    }

    .synthesis-header {
      margin-bottom: 0.35rem;
    }

    .synthesis-tag {
      font-size: 0.7rem;
      font-weight: 700;
      color: #C6A56B;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .synthesis-body {
      margin: 0;
      font-size: 0.88rem;
      line-height: 1.55;
      color: #202938;
    }

    /* --------------------------------------------------------------------------
       6. TABLA REDISEÑADA Y REFINADA
       -------------------------------------------------------------------------- */
    .table-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .table-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .table-section-title {
      margin: 0;
      font-size: 0.92rem;
      font-weight: 700;
      color: #17243A;
    }

    .table-count-badge {
      font-size: 0.74rem;
      font-weight: 600;
      color: #64748B;
      background: #F1F5F9;
      padding: 2px 7px;
      border-radius: 4px;
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
      font-size: 0.84rem;
      text-align: left;
    }

    .saas-table thead th {
      background: #F8F9FC;
      color: #475569;
      font-size: 0.73rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #E5E9F0;
      white-space: nowrap;
    }

    .saas-table tbody td {
      padding: 0.75rem 1rem;
      color: #202938;
      border-bottom: 1px solid #F1F5F9;
      white-space: nowrap;
    }

    .saas-table tbody tr:nth-child(even) {
      background: #FAFBFC;
    }

    .saas-table tbody tr:hover {
      background: #F1F5F9;
    }

    .saas-table tbody tr:last-child td {
      border-bottom: none;
    }

    .cell-right {
      text-align: right !important;
      font-variant-numeric: tabular-nums;
    }

    .cell-currency {
      color: #17243A;
      font-weight: 600;
    }

    .empty-results-box {
      padding: 1.5rem;
      text-align: center;
      background: #F8F9FC;
      border-radius: 8px;
      color: #64748B;
      font-size: 0.85rem;
    }

    /* Estado vacío */
    .empty-state-card {
      background: #FFFFFF;
      border: 1px solid #E5E9F0;
      border-radius: 14px;
      padding: 3rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      box-shadow: 0 2px 10px rgba(23, 36, 58, 0.03);
    }

    .empty-icon-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #F8F9FC;
      border: 1px solid #E5E9F0;
      color: #C6A56B;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-state-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: #17243A;
    }

    .empty-state-desc {
      margin: 0;
      max-width: 420px;
      font-size: 0.85rem;
      color: #64748B;
      line-height: 1.5;
    }

    /* --------------------------------------------------------------------------
       7. HISTORIAL DE CONSULTAS (BARRA LATERAL / COLUMNA)
       -------------------------------------------------------------------------- */
    .history-panel {
      background: #FFFFFF;
      border: 1px solid #E5E9F0;
      border-radius: 14px;
      padding: 1.15rem;
      box-shadow: 0 2px 10px rgba(23, 36, 58, 0.03);
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .history-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid #F1F5F9;
    }

    .history-title {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: #17243A;
    }

    .history-subtitle {
      margin: 0.15rem 0 0;
      font-size: 0.75rem;
      color: #94A3B8;
    }

    .btn-refresh-history {
      background: transparent;
      border: 1px solid #E5E9F0;
      border-radius: 6px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748B;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-refresh-history:hover {
      background: #F8F9FC;
      color: #17243A;
      border-color: #CBD5E1;
    }

    .history-items-list {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      max-height: 640px;
      overflow-y: auto;
      padding-right: 2px;
    }

    .history-card-item {
      background: #FFFFFF;
      border: 1px solid #E5E9F0;
      border-radius: 8px;
      padding: 0.75rem 0.85rem;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .history-card-item:hover {
      border-color: #C6A56B;
      background: #FBFBFD;
    }

    .history-card-item.is-selected {
      border-color: #17243A;
      background: #F8F9FC;
      box-shadow: 0 0 0 1px #17243A;
    }

    .history-item-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.4rem;
    }

    .history-item-num {
      font-size: 0.74rem;
      font-weight: 700;
      color: #17243A;
    }

    .history-type-pill {
      font-size: 0.68rem;
      font-weight: 600;
      color: #64748B;
      background: #F1F5F9;
      padding: 1px 5px;
      border-radius: 4px;
    }

    .history-type-pill.type-voice {
      color: #087F6D;
      background: #E6F5F2;
    }

    .history-item-time {
      font-size: 0.7rem;
      color: #94A3B8;
      margin-left: auto;
    }

    .history-item-prompt {
      margin: 0;
      font-size: 0.82rem;
      font-weight: 600;
      color: #202938;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .history-item-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.35rem;
      padding-top: 0.25rem;
    }

    .btn-hist-export {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.68rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-hist-export.pdf {
      background: #FEF2F2;
      border: 1px solid #FEE2E2;
      color: #B91C1C;
    }

    .btn-hist-export.pdf:hover {
      background: #FEE2E2;
    }

    .btn-hist-export.excel {
      background: #E6F5F2;
      border: 1px solid #C2EAE2;
      color: #087F6D;
    }

    .btn-hist-export.excel:hover {
      background: #D1EFE9;
    }

    .empty-history-box {
      padding: 1.25rem 0.5rem;
      text-align: center;
      color: #94A3B8;
      font-size: 0.8rem;
    }

    /* --------------------------------------------------------------------------
       8. RESPONSIVE BREAKPOINTS (375px, 430px, 768px, 1024px, 1366px, 1920px)
       -------------------------------------------------------------------------- */

    /* Pantallas grandes y estándar (1200px o más): 2 columnas balanceadas */
    @media (min-width: 1200px) {
      .main-layout-grid {
        grid-template-columns: minmax(0, 1fr) 370px;
        gap: 1.25rem;
      }
    }

    /* Tablets horizontales y laptops pequeñas (992px a 1199px) */
    @media (min-width: 992px) and (max-width: 1199px) {
      .ai-report-page {
        padding: 1.25rem 1.25rem 2.5rem;
      }
      .main-layout-grid {
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 1rem;
      }
    }

    /* Tablets verticales (768px a 991px) */
    @media (min-width: 768px) and (max-width: 991px) {
      .ai-report-page {
        padding: 1rem 1rem 2rem;
      }
      .assistant-header {
        padding: 1rem 1.15rem;
        gap: 0.85rem;
      }
      .main-layout-grid {
        grid-template-columns: minmax(0, 1fr) 280px;
        gap: 0.85rem;
      }
      .report-header-bar {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.65rem;
      }
      .report-actions {
        width: 100%;
        justify-content: flex-start;
      }
    }

    /* Dispositivos móviles (< 768px: 375px, 430px) */
    @media (max-width: 767px) {
      .ai-report-page {
        padding: 0.75rem 0.75rem 2rem;
      }
      .assistant-header {
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
        max-width: 100%;
        width: 100%;
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
      .main-layout-grid {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .results-column, .history-column {
        width: 100%;
      }
      .query-input-bar {
        flex-wrap: wrap;
        padding: 0.45rem;
        gap: 0.45rem;
      }
      .btn-mic {
        order: 1;
      }
      .query-text-input {
        order: 2;
        flex: 1 1 calc(100% - 50px);
        min-width: 140px;
        font-size: 0.86rem;
      }
      .listening-tag {
        order: 3;
        width: 100%;
        text-align: center;
      }
      .btn-primary-query {
        width: 100%;
        order: 4;
        justify-content: center;
        padding: 0.65rem 1rem;
      }
      .suggested-queries-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.4rem;
      }
      .report-header-bar {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.65rem;
      }
      .report-actions {
        width: 100%;
        justify-content: flex-start;
        flex-wrap: wrap;
      }
      .report-result-card {
        padding: 1rem;
      }
      .history-panel {
        padding: 1rem;
      }
    }

    /* Pantallas compactas (< 430px / 375px) */
    @media (max-width: 430px) {
      .header-main {
        gap: 0.65rem;
      }
      .header-icon-badge {
        width: 38px;
        height: 38px;
      }
      .header-title {
        font-size: 1.15rem;
      }
      .header-desc {
        font-size: 0.78rem;
      }
      .tenant-name {
        max-width: 150px;
      }
      .suggestion-chip {
        font-size: 0.72rem;
        padding: 0.25rem 0.5rem;
      }
    }
  `]
})
export class AiReportAssistantComponent implements OnInit, OnDestroy {
  private readonly aiService = inject(FashionAiMlService);
  readonly authService = inject(AuthService);

  readonly currentReport = signal<ConsultaIAResponse | null>(null);
  readonly historialList = signal<ReporteIAHistorialItem[]>([]);
  readonly activeTenantId = signal<number>(1);
  readonly isLoading = signal<boolean>(false);
  readonly isListening = signal<boolean>(false);
  readonly isSpeaking = signal<boolean>(false);
  readonly isExporting = signal<boolean>(false);
  readonly lastChannel = signal<'TEXTO' | 'VOZ'>('TEXTO');
  readonly interimTranscript = signal<string>('');
  readonly errorBanner = signal<string | null>(null);
  readonly errorStatus = signal<number>(400);

  promptText = '';

  readonly samplePrompts = [
    {
      label: 'Prendas más vendidas',
      prompt: '¿Cuál es la prenda más vendida este mes?',
      channel: 'TEXTO' as const
    },
    {
      label: 'Ingresos por sucursal',
      prompt: 'Ventas e ingresos totales por sucursal',
      channel: 'VOZ' as const
    },
    {
      label: 'Top clientes VIP',
      prompt: 'Top clientes VIP con mayor gasto acumulado y frecuencia',
      channel: 'TEXTO' as const
    },
    {
      label: 'Stock crítico por tienda',
      prompt: '¿Qué prendas tienen stock crítico o bajo en sucursales?',
      channel: 'TEXTO' as const
    },
    {
      label: 'Ventas por método de pago',
      prompt: 'Distribución de ingresos por método de pago',
      channel: 'TEXTO' as const
    }
  ];

  ngOnInit(): void {
    const initialTenant = this.authService.currentTenant().empresaId || 1;
    this.activeTenantId.set(initialTenant);
    this.cargarHistorial();
    // Ejecutar consulta inicial si tiene plan que permite IA
    if (this.authService.currentTenant().permiteIa !== false) {
      this.promptText = '¿Cuál es la prenda más vendida este mes?';
      this.ejecutarConsulta('TEXTO');
    }
  }

  ngOnDestroy(): void {
    this.aiService.stopVoiceCapture();
    this.aiService.stopSynthesis();
  }

  usarPromptSugerido(prompt: string, channel: 'TEXTO' | 'VOZ'): void {
    this.promptText = prompt;
    this.ejecutarConsulta(channel);
  }

  ejecutarConsulta(canal: 'TEXTO' | 'VOZ'): void {
    const q = this.promptText.trim();
    if (!q) return;

    // Verificar si el tenant activo tiene plan con IA
    const currentTenant = this.authService.currentTenant();
    this.activeTenantId.set(currentTenant.empresaId || 1);

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
          'La consulta no pudo ser procesada por políticas de seguridad o plan.';
        this.errorBanner.set(detail);
      }
    });
  }

  cargarHistorial(): void {
    const tenantId = this.authService.currentTenant().empresaId || this.activeTenantId();
    this.aiService.listarHistorialIA(15, tenantId).subscribe({
      next: (items) => this.historialList.set(items),
      error: () => this.historialList.set([])
    });
  }

  cargarReporteExistente(reporteId: number): void {
    this.errorBanner.set(null);
    this.isLoading.set(true);
    const tenantId = this.authService.currentTenant().empresaId || this.activeTenantId();
    this.aiService.obtenerDetalleReporteIA(reporteId, tenantId).subscribe({
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
    const tenantId = this.authService.currentTenant().empresaId || this.activeTenantId();

    const obs =
      formato === 'PDF'
        ? this.aiService.exportarReportePDF(reporteId, tenantId)
        : this.aiService.exportarReporteExcel(reporteId, tenantId);

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
            'No tiene autorización para exportar este reporte (403 Forbidden).'
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

  isCurrencyCol(col: string): boolean {
    const lower = col.toLowerCase();
    return lower.includes('bs') || lower.includes('monto') || lower.includes('ingreso') ||
           lower.includes('precio') || lower.includes('total_gastado') || lower.includes('ticket');
  }

  formatCellValue(val: any, col: string): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') {
      if (this.isCurrencyCol(col)) {
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

export { AiReportAssistantComponent as AiReportAssistantPageComponent };
