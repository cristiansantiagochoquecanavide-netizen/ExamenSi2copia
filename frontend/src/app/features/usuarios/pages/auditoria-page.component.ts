import { Component, OnInit, inject, signal, computed } from '@angular/core';
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
        <div class="eyebrow">
          <span class="gold-dot">&bull;</span>
          <span>SEGURIDAD, TRAZABILIDAD Y LOGS &bull; CASO DE USO #7</span>
        </div>
        <h1 class="page-title">Bitácora de Auditoría</h1>
        <p class="subtitle">
          Registro inmutable de transacciones, mutaciones de estado y eventos críticos del sistema.
        </p>

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
                  <th>TIMESTAMP (UTC)</th>
                  <th>MÓDULO</th>
                  <th>ACCIÓN</th>
                  <th>USUARIO</th>
                  <th>DIRECCIÓN IP</th>
                  <th>DETALLE DE LA OPERACIÓN</th>
                  <th class="text-right">VALORES</th>
                </tr>
              </thead>
              <tbody>
                @for (log of logs(); track log.id) {
                  <tr class="audit-row">
                    <td class="timestamp-cell">
                      <span class="date-txt">{{ log.timestamp | date:'dd/MM/yyyy HH:mm:ss' }}</span>
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
                      {{ log.detalle }}
                    </td>
                    <td class="text-right">
                      @if (log.valores_anteriores || log.valores_nuevos) {
                        <button type="button" class="btn-diff" (click)="openDiffModal(log)">
                          VER DIFF
                        </button>
                      } @else {
                        <span class="no-diff">-</span>
                      }
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
      padding-bottom: 4rem;
    }

    .header-section {
      padding: 1.5rem 0 2rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      margin-bottom: 2rem;
    }

    .eyebrow {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      letter-spacing: 0.2em;
      color: var(--color-gold);
      margin-bottom: 0.5rem;
    }

    .gold-dot {
      color: var(--color-gold);
      font-size: 1.2rem;
    }

    .page-title {
      font-family: var(--font-serif);
      font-size: 3rem;
      text-transform: uppercase;
      color: var(--color-primary);
      margin-bottom: 0.5rem;
    }

    .subtitle {
      color: var(--color-on-surface-muted);
      font-size: 0.95rem;
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
      font-size: 0.65rem;
      letter-spacing: 0.15em;
      color: var(--color-gold);
    }

    .filter-select, .filter-input {
      background: #111111;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      padding: 0.6rem 1rem;
      font-size: 0.8rem;
    }

    .filter-select:focus, .filter-input:focus {
      outline: none;
      border-color: var(--color-gold);
    }

    .btn-refresh {
      background: transparent;
      border: 1px solid var(--color-gold);
      color: var(--color-gold);
      padding: 0.6rem 1.2rem;
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-refresh:hover {
      background: var(--color-gold);
      color: #000000;
    }

    .alert-error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid #ef4444;
      color: #f87171;
      padding: 0.8rem 1.2rem;
      margin-bottom: 1.5rem;
      font-size: 0.85rem;
    }

    .loading-box {
      text-align: center;
      padding: 4rem;
      color: var(--color-gold);
      letter-spacing: 0.15em;
      font-size: 0.85rem;
    }

    .timeline-wrapper {
      background: #111111;
      border: 1px solid rgba(255, 255, 255, 0.1);
      overflow-x: auto;
    }

    .audit-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
    }

    .audit-table th {
      background: #0d0d0d;
      color: var(--color-on-surface-muted);
      font-size: 0.65rem;
      letter-spacing: 0.15em;
      padding: 1rem 1.2rem;
      text-align: left;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .audit-row {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      transition: background-color 0.15s ease;
    }

    .audit-row:hover {
      background: #171717;
    }

    .audit-table td {
      padding: 0.9rem 1.2rem;
      color: #cccccc;
    }

    .timestamp-cell .date-txt {
      font-family: monospace;
      color: #888888;
      font-size: 0.75rem;
    }

    .modulo-badge {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      padding: 2px 6px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: #1c1c1c;
      color: #ffffff;
    }

    .modulo-badge[data-mod="usuarios"] {
      border-color: #60a5fa;
      color: #60a5fa;
    }

    .modulo-badge[data-mod="inventario"] {
      border-color: #34d399;
      color: #34d399;
    }

    .modulo-badge[data-mod="catalogo"] {
      border-color: var(--color-gold);
      color: var(--color-gold);
    }

    .accion-tag {
      font-family: monospace;
      color: #ffffff;
      font-weight: 600;
    }

    .user-email {
      color: #e5e5e5;
      font-family: monospace;
      font-size: 0.75rem;
    }

    .ip-cell code {
      font-size: 0.75rem;
      color: #888888;
    }

    .detail-cell {
      max-width: 320px;
      line-height: 1.4;
      color: #aaaaaa;
    }

    .text-right {
      text-align: right;
    }

    .btn-diff {
      background: transparent;
      border: 1px solid var(--color-gold);
      color: var(--color-gold);
      font-size: 0.65rem;
      letter-spacing: 0.1em;
      padding: 3px 8px;
      cursor: pointer;
    }

    .btn-diff:hover {
      background: var(--color-gold);
      color: #000000;
    }

    .no-diff {
      color: #444444;
    }

    /* Modal Diff */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.88);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .modal-container {
      background: #111111;
      border: 1px solid var(--color-gold);
      max-width: 900px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      padding: 1.5rem 2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .modal-eyebrow {
      font-size: 0.65rem;
      letter-spacing: 0.2em;
      color: var(--color-gold);
    }

    .modal-title {
      font-family: var(--font-serif);
      font-size: 1.8rem;
      color: #ffffff;
      margin: 4px 0;
    }

    .modal-meta {
      font-size: 0.75rem;
      color: #888888;
      font-family: monospace;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: #888888;
      font-size: 2rem;
      cursor: pointer;
    }

    .modal-body {
      padding: 2rem;
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
      font-size: 0.7rem;
      letter-spacing: 0.15em;
      color: var(--color-on-surface-muted);
    }

    .json-viewer {
      background: #050505;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 1rem;
      font-family: monospace;
      font-size: 0.75rem;
      color: #cccccc;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 350px;
      overflow-y: auto;
    }

    .json-viewer.highlight {
      border-color: rgba(212, 175, 55, 0.4);
      color: var(--color-gold);
    }

    .modal-footer {
      padding: 1rem 2rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: flex-end;
    }

    .btn-close-modal {
      background: var(--color-gold);
      color: #000000;
      border: none;
      padding: 0.7rem 1.5rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      cursor: pointer;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      border: 1px dashed rgba(255, 255, 255, 0.15);
    }

    .empty-title {
      font-family: var(--font-serif);
      font-size: 1.8rem;
      color: #ffffff;
      margin-bottom: 0.5rem;
    }

    .empty-desc {
      color: var(--color-on-surface-muted);
    }
  `]
})
export class AuditoriaPageComponent implements OnInit {
  private readonly auditoriaService = inject(AuditoriaService);

  readonly logs = signal<BitacoraAuditoriaResponse[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  filtroModulo = '';
  filtroAccion = '';

  readonly selectedLog = signal<BitacoraAuditoriaResponse | null>(null);

  ngOnInit(): void {
    this.loadLogs();
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
