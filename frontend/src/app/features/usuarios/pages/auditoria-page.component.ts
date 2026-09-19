import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditoriaService } from '../services/auditoria.service';
import { BitacoraAuditoriaResponse } from '../models/usuarios.models';

@Component({
  selector: 'app-auditoria-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auditoria-container">
      <!-- Header Editorial -->
      <div class="header-section">
        <div class="header-top-bar">
          <div class="header-titles">
            <div class="eyebrow">
              <span class="gold-dot">&bull;</span>
              <span>SEGURIDAD, TRAZABILIDAD Y LOGS</span>
            </div>
            <h1 class="page-title">Bitácora de Auditoría</h1>
            <p class="subtitle">
              Registro inmutable de transacciones, mutaciones de estado y eventos críticos del sistema.
            </p>
          </div>

          <!-- Reloj Digital en Tiempo Real -->
          <div class="system-clock-widget">
            <div class="clock-badge">
              <span class="pulse-dot"></span>
              <span>HORA DEL SISTEMA (EN VIVO)</span>
            </div>
            <div class="clock-digits">
              <span class="clock-icon">&#9200;</span>
              <span class="clock-time">{{ currentTime() }}</span>
            </div>
            <div class="clock-meta">
              <span>{{ currentDate() }}</span>
              <span class="clock-tz">&bull; BOT (UTC-4)</span>
            </div>
          </div>
        </div>

        <!-- Filters Bar -->
        <div class="filters-bar">
          <div class="filter-group">
            <label class="filter-label">MÓDULO:</label>
            <select [(ngModel)]="filtroModulo" (change)="loadLogs()" class="filter-select">
              <option value="">Todos los módulos</option>
              <option value="usuarios">Usuarios &amp; Auth</option>
              <option value="inventario">Inventario &amp; Sucursales</option>
              <option value="catalogo">Catálogo &amp; Moda</option>
              <option value="sistema">Sistema &amp; Core</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label">ACCIÓN:</label>
            <input
              type="text"
              [(ngModel)]="filtroAccion"
              (keyup.enter)="loadLogs()"
              placeholder="Ej. LOGIN, CREAR_ROL..."
              class="filter-input"
            />
          </div>

          <button type="button" class="btn-refresh" (click)="loadLogs()" [disabled]="isLoading()">
            &#x21bb; ACTUALIZAR REGISTROS
          </button>
        </div>
      </div>

      <!-- Feedback -->
      @if (errorMessage()) {
        <div class="alert-error">
          <span>&excl; {{ errorMessage() }}</span>
        </div>
      }

      <!-- Loading -->
      @if (isLoading()) {
        <div class="loading-box">
          <span class="spinner"></span>
          <span>CONSULTANDO BITÁCORA EN POSTGRESQL...</span>
        </div>
      }

      <!-- Logs Timeline / Table -->
      @if (!isLoading()) {
        @if (logs().length === 0) {
          <div class="empty-state">
            <h3 class="empty-title">NO SE ENCONTRARON EVENTOS</h3>
            <p class="empty-desc">No hay registros de auditoría que coincidan con los filtros.</p>
          </div>
        } @else {
          <div class="timeline-wrapper">
            <table class="audit-table">
              <thead>
                <tr>
                  <th style="width: 105px;">FECHA</th>
                  <th style="width: 125px;">HORA / TIEMPO</th>
                  <th style="width: 110px;">MÓDULO</th>
                  <th style="width: 160px;">ACCIÓN</th>
                  <th style="width: 180px;">USUARIO</th>
                  <th style="width: 115px;">DIRECCIÓN IP</th>
                  <th>DETALLE DE LA OPERACIÓN</th>
                </tr>
              </thead>
              <tbody>
                @for (log of logs(); track log.id) {
                  <tr class="audit-row">
                    <td class="date-cell">
                      <span class="date-txt">{{ log.timestamp | date:'dd/MM/yyyy' }}</span>
                    </td>
                    <td class="time-cell">
                      <span class="time-badge">&#9201; {{ log.timestamp | date:'HH:mm:ss' }}</span>
                    </td>
                    <td>
                      <span class="modulo-badge" [attr.data-mod]="log.modulo">
                        {{ log.modulo | uppercase }}
                      </span>
                    </td>
                    <td>
                      <span class="accion-tag">{{ log.accion }}</span>
                    </td>
                    <td class="user-cell">
                      <span class="user-email">{{ log.usuario_email || 'Sistema / Anónimo' }}</span>
                    </td>
                    <td class="ip-cell">
                      <code>{{ log.ip_address || '127.0.0.1' }}</code>
                    </td>
                    <td class="detail-cell">
                      <div class="detail-content-wrap">
                        <span class="detail-text">{{ log.detalle }}</span>
                        @if (log.valores_anteriores || log.valores_nuevos) {
                          <button type="button" class="btn-diff-pill" (click)="openDiffModal(log)" title="Inspeccionar cambios técnicos JSON">
                            &#128269; Ver JSON
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }

      <!-- Modal Diff JSON -->
      @if (selectedLog(); as item) {
        <div class="modal-backdrop" (click)="closeDiffModal()">
          <div class="modal-container" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <span class="modal-eyebrow">DIFF DE MUTACIÓN &bull; LOG #{{ item.id }}</span>
                <h2 class="modal-title">{{ item.accion }}</h2>
                <span class="modal-meta">{{ item.timestamp | date:'medium' }} &bull; {{ item.usuario_email }}</span>
              </div>
              <button type="button" class="btn-close" (click)="closeDiffModal()">&times;</button>
            </div>

            <div class="modal-body">
              <div class="diff-grid">
                <div class="diff-pane">
                  <span class="pane-title">VALORES ANTERIORES (BEFORE)</span>
                  <pre class="json-viewer">{{ item.valores_anteriores || 'null (Creación inicial)' }}</pre>
                </div>
                <div class="diff-pane">
                  <span class="pane-title">VALORES NUEVOS (AFTER)</span>
                  <pre class="json-viewer highlight">{{ item.valores_nuevos || 'null (Eliminación)' }}</pre>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-close-modal" (click)="closeDiffModal()">CERRAR VISOR</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .auditoria-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem 1.5rem 4rem;
      color: #111827;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .header-section {
      padding: 0 0 2rem 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      margin-bottom: 2rem;
    }

    .header-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .header-titles {
      flex: 1;
      min-width: 300px;
    }

    .system-clock-widget {
      background: #0b0f19;
      color: #ffffff;
      border-radius: 10px;
      padding: 0.85rem 1.35rem;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.12);
      min-width: 230px;
    }

    .clock-badge {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #9ca3af;
      margin-bottom: 0.35rem;
    }

    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      animation: pulseLive 1.5s infinite;
    }

    @keyframes pulseLive {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    .clock-digits {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .clock-icon {
      font-size: 1.1rem;
      opacity: 0.85;
    }

    .clock-time {
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      font-size: 1.85rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      color: #ffffff;
      line-height: 1;
    }

    .clock-meta {
      display: flex;
      gap: 0.5rem;
      font-size: 0.72rem;
      color: #9ca3af;
      margin-top: 0.4rem;
      font-weight: 500;
    }

    .clock-tz {
      color: #e5e7eb;
      font-weight: 600;
    }

    .eyebrow {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.15em;
      color: #6b7280;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
    }

    .gold-dot {
      color: #111827;
      font-size: 1rem;
    }

    .page-title {
      font-size: 2.25rem;
      font-weight: 700;
      color: #000000;
      margin-bottom: 0.5rem;
      letter-spacing: -0.02em;
    }

    .subtitle {
      color: #6b7280;
      font-size: 0.95rem;
      line-height: 1.5;
      max-width: 700px;
    }

    .filters-bar {
      display: flex;
      align-items: flex-end;
      gap: 1.5rem;
      margin-top: 2rem;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .filter-label {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      color: #374151;
    }

    .filter-select, .filter-input {
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      color: #111827;
      padding: 0.65rem 1rem;
      font-size: 0.85rem;
      outline: none;
      transition: border-color 0.2s;
    }

    .filter-select:focus, .filter-input:focus {
      border-color: #000000;
    }

    .btn-refresh {
      background: #ffffff;
      border: 1px solid #111827;
      color: #111827;
      padding: 0.65rem 1.25rem;
      font-size: 0.8rem;
      font-weight: 600;
      border-radius: 6px;
      letter-spacing: 0.05em;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-refresh:hover {
      background: #000000;
      color: #ffffff;
    }

    .alert-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 0.85rem 1.2rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      font-size: 0.85rem;
    }

    .loading-box {
      text-align: center;
      padding: 4rem;
      color: #6b7280;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .timeline-wrapper {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 12px;
      overflow-x: auto;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .audit-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }

    .audit-table th {
      background: #f9fafb;
      color: #4b5563;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      padding: 0.85rem 1.2rem;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
      text-transform: uppercase;
    }

    .audit-row {
      border-bottom: 1px solid #f3f4f6;
      transition: background-color 0.15s ease;
    }

    .audit-row:hover {
      background: #fafafa;
    }

    .audit-table td {
      padding: 0.9rem 1.2rem;
      color: #374151;
    }

    .date-cell .date-txt {
      font-family: monospace;
      color: #4b5563;
      font-size: 0.82rem;
      white-space: nowrap;
    }

    .time-cell .time-badge {
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      color: #111827;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 0.8rem;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }

    .modulo-badge {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
      background: #f3f4f6;
      color: #374151;
      text-transform: uppercase;
    }

    .modulo-badge[data-mod="usuarios"] {
      border-color: #bfdbfe;
      background: #eff6ff;
      color: #1d4ed8;
    }

    .modulo-badge[data-mod="inventario"] {
      border-color: #bbf7d0;
      background: #f0fdf4;
      color: #15803d;
    }

    .modulo-badge[data-mod="catalogo"] {
      border-color: #fed7aa;
      background: #fff7ed;
      color: #c2410c;
    }

    .accion-tag {
      font-family: monospace;
      color: #111827;
      font-weight: 600;
      font-size: 0.8rem;
    }

    .user-email {
      color: #111827;
      font-family: monospace;
      font-size: 0.8rem;
    }

    .ip-cell code {
      font-size: 0.8rem;
      color: #6b7280;
    }

    .detail-cell {
      line-height: 1.5;
      color: #374151;
      width: auto;
    }

    .detail-content-wrap {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.25rem;
    }

    .detail-text {
      flex: 1;
      font-size: 0.84rem;
      color: #1f2937;
      word-break: break-word;
    }

    .btn-diff-pill {
      background: #f9fafb;
      border: 1px solid #d1d5db;
      color: #4b5563;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      white-space: nowrap;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .btn-diff-pill:hover {
      background: #111827;
      color: #ffffff;
      border-color: #111827;
    }

    /* Modal Diff */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .modal-container {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      max-width: 900px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      overflow: hidden;
    }

    .modal-header {
      padding: 1.25rem 1.75rem;
      border-bottom: 1px solid #f3f4f6;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .modal-eyebrow {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      color: #6b7280;
      text-transform: uppercase;
    }

    .modal-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #000000;
      margin: 4px 0;
      letter-spacing: -0.01em;
    }

    .modal-meta {
      font-size: 0.8rem;
      color: #6b7280;
      font-family: monospace;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: #6b7280;
      font-size: 1.8rem;
      cursor: pointer;
    }

    .btn-close:hover {
      color: #111827;
    }

    .modal-body {
      padding: 1.75rem;
      overflow-y: auto;
    }

    .diff-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .diff-pane {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .pane-title {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: #4b5563;
      text-transform: uppercase;
    }

    .json-viewer {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1rem;
      font-family: monospace;
      font-size: 0.75rem;
      color: #111827;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 350px;
      overflow-y: auto;
    }

    .json-viewer.highlight {
      border-color: #000000;
      background: #fafafa;
    }

    .modal-footer {
      padding: 1rem 1.75rem;
      border-top: 1px solid #f3f4f6;
      background: #fafafa;
      display: flex;
      justify-content: flex-end;
    }

    .btn-close-modal {
      background: #000000;
      color: #ffffff;
      border: 1px solid #000000;
      padding: 0.65rem 1.5rem;
      font-size: 0.8rem;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-close-modal:hover {
      background: #1f2937;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      border: 1px dashed #d1d5db;
      border-radius: 10px;
      background: #ffffff;
    }

    .empty-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #111827;
      margin-bottom: 0.5rem;
    }

    .empty-desc {
      color: #6b7280;
    }
  `]
})
export class AuditoriaPageComponent implements OnInit, OnDestroy {
  private readonly auditoriaService = inject(AuditoriaService);

  readonly logs = signal<BitacoraAuditoriaResponse[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  filtroModulo = '';
  filtroAccion = '';

  readonly selectedLog = signal<BitacoraAuditoriaResponse | null>(null);

  // Reloj digital en tiempo real (horas a segundos)
  readonly currentTime = signal<string>('00:00:00');
  readonly currentDate = signal<string>('');
  private clockInterval: any = null;

  ngOnInit(): void {
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
    this.loadLogs();
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  private updateClock(): void {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    this.currentTime.set(`${h}:${m}:${s}`);

    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    };
    this.currentDate.set(now.toLocaleDateString('es-BO', options).toUpperCase());
  }

  loadLogs(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.auditoriaService.consultar({
      modulo: this.filtroModulo || undefined,
      accion: this.filtroAccion || undefined,
      limit: 100
    }).subscribe({
      next: (res) => {
        this.logs.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || 'Error al consultar registros de auditoría.');
      }
    });
  }

  openDiffModal(log: BitacoraAuditoriaResponse): void {
    this.selectedLog.set(log);
  }

  closeDiffModal(): void {
    this.selectedLog.set(null);
  }
}
