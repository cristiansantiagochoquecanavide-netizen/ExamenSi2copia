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
      padding: 2rem 1.5rem 4rem;
      color: #111827;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .header-section {
      padding: 0 0 2rem 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      margin-bottom: 2rem;
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

    .timestamp-cell .date-txt {
      font-family: monospace;
      color: #6b7280;
      font-size: 0.8rem;
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
      max-width: 320px;
      line-height: 1.4;
      color: #4b5563;
    }

    .text-right {
      text-align: right;
    }

    .btn-diff {
      background: #ffffff;
      border: 1px solid #d1d5db;
      color: #111827;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-diff:hover {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
    }

    .no-diff {
      color: #9ca3af;
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
