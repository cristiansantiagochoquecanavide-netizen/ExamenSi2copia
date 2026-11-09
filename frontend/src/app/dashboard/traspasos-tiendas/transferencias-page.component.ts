import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioService } from '../inventario-stock/inventario.service';
import { CatalogoService } from '../catalogo-prendas/catalogo.service';
import {
  TransferenciaStockResponse, TransferenciaStockCreate, DetalleTransferenciaCreate,
  Sucursal
} from '../inventario-stock/inventario.models';
import { Prenda, InventarioStock } from '../catalogo-prendas/catalogo.models';

interface LineaTransferenciaForm {
  variante_id: number;
  cantidad: number;
  stock_origen_disponible: number;
}

@Component({
  selector: 'app-transferencias-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="cu9-container">
      <!-- Editorial Hero Header -->
      <section class="editorial-hero">
        <div class="eyebrow">
          <span class="gold-dot">&bull;</span>
          <span>LOGÍSTICA &amp; KARDEX</span>
        </div>
        <div class="hero-main-row">
          <div>
            <h1 class="hero-title">Traspasos de Stock Multi-Sucursal (CU12 &amp; CU13)</h1>
            <p class="hero-description">
              Rebalanceo y redistribución de mercadería entre tiendas físicas (Fase 1: Despacho a EN_TRÁNSITO por Encargado Origen; Fase 2: Recepción Conforme por Encargado Destino).
            </p>
          </div>
          <button type="button" class="btn-gold" (click)="openNuevaTransferenciaModal()">
            + NUEVO TRASPASO (CU12)
          </button>
        </div>

        <!-- KPI Metrics Bar -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <span class="kpi-label">TOTAL OPERACIONES</span>
            <span class="kpi-value">{{ transferencias().length }}</span>
            <span class="kpi-sub">Guías generadas</span>
          </div>
          <div class="kpi-card highlight-amber">
            <span class="kpi-label">EN TRÁNSITO</span>
            <span class="kpi-value">{{ enTransitoCount() }}</span>
            <span class="kpi-sub">Pendientes de recepción</span>
          </div>
          <div class="kpi-card highlight-green">
            <span class="kpi-label">COMPLETADAS</span>
            <span class="kpi-value">{{ completadasCount() }}</span>
            <span class="kpi-sub">Existencias recibidas</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">PRENDAS MOVIDAS</span>
            <span class="kpi-value">{{ totalUnidadesRebalanceadas() }}</span>
            <span class="kpi-sub">Unidades rebalanceadas</span>
          </div>
        </div>

        <!-- Filters Bar -->
        <div class="filters-row">
          <div class="filter-tabs">
            <button
              type="button"
              class="filter-tab-btn"
              [class.active]="filtroEstado() === 'TODOS'"
              (click)="filtroEstado.set('TODOS')"
            >
              TODAS ({{ transferencias().length }})
            </button>
            <button
              type="button"
              class="filter-tab-btn"
              [class.active]="filtroEstado() === 'EN_TRANSITO'"
              (click)="filtroEstado.set('EN_TRANSITO')"
            >
              EN TRÁNSITO ({{ enTransitoCount() }})
            </button>
            <button
              type="button"
              class="filter-tab-btn"
              [class.active]="filtroEstado() === 'COMPLETADA'"
              (click)="filtroEstado.set('COMPLETADA')"
            >
              COMPLETADAS ({{ completadasCount() }})
            </button>
            <button
              type="button"
              class="filter-tab-btn"
              [class.active]="filtroEstado() === 'CANCELADA'"
              (click)="filtroEstado.set('CANCELADA')"
            >
              CANCELADAS
            </button>
          </div>

          <div class="filter-select-group">
            <label class="filter-label">SUCURSAL:</label>
            <select class="filter-select" [ngModel]="filtroSucursalId()" (ngModelChange)="filtroSucursalId.set($event)">
              <option [ngValue]="null">Todas las Sucursales</option>
              @for (s of sucursales(); track s.id) {
                <option [ngValue]="s.id">{{ s.nombre }}</option>
              }
            </select>
          </div>
        </div>
      </section>

      <!-- Feedback Banner -->
      @if (feedbackMsg()) {
        <div class="feedback-banner" [class.error]="feedbackIsError()">
          <span>{{ feedbackMsg() }}</span>
          <button type="button" class="btn-close-banner" (click)="feedbackMsg.set(null)">&times;</button>
        </div>
      }

      <!-- Loading Indicator -->
      @if (isLoading()) {
        <div class="loading-state">
          <span class="spinner"></span>
          <span>SINCRONIZANDO CON FASTAPI...</span>
        </div>
      }

      <!-- Table Section -->
      <div class="panel-card">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Registro Histórico de Traslados</h2>
            <span class="panel-hint">Guías de despacho, control de transporte y confirmaciones de recepción</span>
          </div>
        </div>

        @if (!isLoading() && transferenciasFiltradas().length === 0) {
          <div class="empty-state">
            <span class="empty-icon">&bull;</span>
            <p>No se encontraron registros de transferencias bajo los filtros seleccionados.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="editorial-table">
              <thead>
                <tr>
                  <th>CÓDIGO GUÍA</th>
                  <th>FECHA ENVÍO</th>
                  <th>TIENDA ORIGEN</th>
                  <th>TIENDA DESTINO</th>
                  <th class="text-center">UNIDADES</th>
                  <th class="text-center">ESTADO</th>
                  <th class="text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                @for (t of transferenciasFiltradas(); track t.id) {
                  <tr>
                    <td class="col-code">
                      <span class="code-badge">{{ t.codigo }}</span>
                    </td>
                    <td class="col-date">
                      {{ t.fecha_envio | date:'dd/MM/yyyy HH:mm' }}
                    </td>
                    <td class="col-branch">
                      <span class="branch-pill origin">&larr; {{ t.sucursal_origen?.nombre || 'Sucursal #' + t.sucursal_origen_id }}</span>
                    </td>
                    <td class="col-branch">
                      <span class="branch-pill dest">&rarr; {{ t.sucursal_destino?.nombre || 'Sucursal #' + t.sucursal_destino_id }}</span>
                    </td>
                    <td class="text-center col-units">
                      <span class="units-badge">{{ t.total_prendas }} uds.</span>
                    </td>
                    <td class="text-center">
                      @if (t.estado === 'EN_TRANSITO') {
                        <span class="status-badge badge-amber">&bull; EN TRÁNSITO</span>
                      } @else if (t.estado === 'COMPLETADA') {
                        <span class="status-badge badge-green">&bull; COMPLETADA</span>
                      } @else {
                        <span class="status-badge badge-red">&bull; CANCELADA</span>
                      }
                    </td>
                    <td class="text-right col-actions">
                      <button type="button" class="btn-action-view" (click)="verDetalle(t)">
                        Ver Detalle
                      </button>
                      @if (t.estado === 'EN_TRANSITO') {
                        <button type="button" class="btn-action-receive" (click)="recibirTransferencia(t)" title="Confirmar recepción física conforme (CU13)">
                          Recibir Conforme (CU13)
                        </button>
                        <button type="button" class="btn-action-cancel" (click)="cancelarTransferencia(t)">
                          Anular
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- ================= MODAL: NUEVA TRANSFERENCIA ================= -->
      @if (showCreateModal()) {
        <div class="modal-backdrop" (click)="showCreateModal.set(false)">
          <div class="modal-dialog-large" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <span class="modal-eyebrow">REBALANCEO DE INVENTARIO</span>
                <h3 class="modal-title">Registrar Transferencia entre Sucursales</h3>
              </div>
              <button type="button" class="btn-close" (click)="showCreateModal.set(false)">&times;</button>
            </div>

            <form (ngSubmit)="guardarTransferencia()">
              <div class="modal-body">
                <!-- Branches selection grid -->
                <div class="form-grid-2">
                  <div class="form-group">
                    <label class="form-label">SUCURSAL ORIGEN (DESPACHO) *</label>
                    <select
                      class="form-input"
                      [(ngModel)]="nuevaTransferencia.sucursal_origen_id"
                      name="sucursal_origen_id"
                      (change)="onSucursalOrigenChange()"
                      required
                    >
                      @for (s of sucursales(); track s.id) {
                        <option [ngValue]="s.id">{{ s.nombre }} ({{ s.ciudad?.nombre || 'Ciudad' }})</option>
                      }
                    </select>
                    <span class="input-hint">El stock se descontará de esta tienda</span>
                  </div>

                  <div class="form-group">
                    <label class="form-label">SUCURSAL DESTINO (RECEPCIÓN) *</label>
                    <select
                      class="form-input"
                      [(ngModel)]="nuevaTransferencia.sucursal_destino_id"
                      name="sucursal_destino_id"
                      required
                    >
                      @for (s of sucursales(); track s.id) {
                        @if (s.id !== nuevaTransferencia.sucursal_origen_id) {
                          <option [ngValue]="s.id">{{ s.nombre }} ({{ s.ciudad?.nombre || 'Ciudad' }})</option>
                        }
                      }
                    </select>
                    <span class="input-hint">Tienda donde ingresará la mercadería</span>
                  </div>
                </div>

                <!-- Transfer mode and reason -->
                <div class="form-grid-2">
                  <div class="form-group">
                    <label class="form-label">MODALIDAD DE TRASLADO *</label>
                    <div class="radio-mode-group">
                      <label class="radio-card" [class.selected]="!nuevaTransferencia.inmediata">
                        <input
                          type="radio"
                          name="inmediata"
                          [value]="false"
                          [(ngModel)]="nuevaTransferencia.inmediata"
                        />
                        <div>
                          <span class="radio-title">EN TRÁNSITO</span>
                          <span class="radio-sub">Despacha ahora y requiere confirmación física en destino</span>
                        </div>
                      </label>
                      <label class="radio-card" [class.selected]="nuevaTransferencia.inmediata">
                        <input
                          type="radio"
                          name="inmediata"
                          [value]="true"
                          [(ngModel)]="nuevaTransferencia.inmediata"
                        />
                        <div>
                          <span class="radio-title">DIRECTA / INMEDIATA</span>
                          <span class="radio-sub">Ingresa atómicamente a la tienda destino en el mismo paso</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label">MOTIVO DEL TRASLADO</label>
                    <input
                      type="text"
                      class="form-input"
                      [(ngModel)]="nuevaTransferencia.motivo"
                      name="motivo"
                      placeholder="Ej. Rebalanceo por alta demanda fin de semana"
                    />
                    <label class="form-label mt-2">OBSERVACIONES / GUÍA EXTERNA</label>
                    <input
                      type="text"
                      class="form-input"
                      [(ngModel)]="nuevaTransferencia.observaciones"
                      name="observaciones"
                      placeholder="Ej. Chofer Don Carlos - Camioneta Placa 4092-XYZ"
                    />
                  </div>
                </div>

                <!-- Lines Table -->
                <div class="transfer-lines-section">
                  <div class="lines-header">
                    <div>
                      <h4 class="lines-title">Prendas y Variantes a Transferir</h4>
                      <span class="lines-hint">Compruebe las existencias disponibles en la sucursal de origen antes de enviar</span>
                    </div>
                    <button type="button" class="btn-add-line" (click)="agregarLinea()">
                      + AGREGAR PRENDA
                    </button>
                  </div>

                  <div class="table-responsive-modal">
                    <table class="nested-table">
                      <thead>
                        <tr>
                          <th class="col-prenda">PRENDA &amp; VARIANTE (TALLA / COLOR / SKU) *</th>
                          <th class="col-stock text-center">STOCK ORIGEN</th>
                          <th class="col-qty text-center">CANTIDAD A ENVIAR *</th>
                          <th class="col-del text-center"></th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (linea of lineasTransferencia; track $index) {
                          <tr>
                            <td class="col-prenda">
                              <select
                                class="form-input select-variant"
                                [(ngModel)]="linea.variante_id"
                                [name]="'var_' + $index"
                                (change)="onVarianteSeleccionada(linea)"
                                required
                              >
                                <option [ngValue]="0" disabled>-- Seleccione Variante --</option>
                                @for (p of prendas(); track p.id) {
                                  <optgroup [label]="p.nombre">
                                    @for (v of p.variantes; track v.id) {
                                      <option [ngValue]="v.id">
                                        {{ p.nombre }} &bull; Talla {{ v.talla?.codigo }} &bull; {{ v.color?.nombre }} (SKU: {{ v.sku_variante }})
                                      </option>
                                    }
                                  </optgroup>
                                }
                              </select>
                              @if (linea.variante_id && linea.stock_origen_disponible === 0) {
                                <div class="no-stock-alert">
                                  &excl; Sin existencias en esta sucursal de origen (0 disp.)
                                </div>
                              }
                            </td>
                            <td class="col-stock text-center">
                              <span
                                class="stock-avail-badge"
                                [class.low]="linea.stock_origen_disponible < 5 && linea.stock_origen_disponible > 0"
                                [class.zero]="linea.stock_origen_disponible === 0"
                              >
                                {{ linea.stock_origen_disponible }} uds disp.
                              </span>
                            </td>
                            <td class="col-qty text-center">
                              <input
                                type="number"
                                class="form-input qty-input"
                                min="1"
                                [max]="linea.stock_origen_disponible || 9999"
                                [(ngModel)]="linea.cantidad"
                                [name]="'cant_' + $index"
                                placeholder="Cant."
                                required
                              />
                            </td>
                            <td class="col-del text-center">
                              @if (lineasTransferencia.length > 1) {
                                <button type="button" class="btn-remove-line" (click)="quitarLinea($index)">&times;</button>
                              }
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>

                  <!-- Summary Box -->
                  <div class="lines-footer">
                    <span class="total-label">TOTAL UNIDADES A TRANSFERIR:</span>
                    <span class="total-value">{{ totalPrendasNuevaTransferencia() }} unidades</span>
                  </div>
                </div>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-cancel" (click)="showCreateModal.set(false)">
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="btn-submit"
                  [disabled]="isSubmitting() || lineasTransferencia.length === 0"
                >
                  {{ isSubmitting() ? 'DESPACHANDO...' : 'AUTORIZAR Y DESPACHAR TRASPASO (CU12: EN_TRÁNSITO)' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ================= MODAL: DETALLE DE TRANSFERENCIA ================= -->
      @if (selectedTransferencia()) {
        @let t = selectedTransferencia()!;
        <div class="modal-backdrop" (click)="selectedTransferencia.set(null)">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <span class="modal-eyebrow">DETALLE DE GUÍA LOGÍSTICA</span>
                <h3 class="modal-title">Guía {{ t.codigo }}</h3>
              </div>
              <button type="button" class="btn-close" (click)="selectedTransferencia.set(null)">&times;</button>
            </div>

            <div class="modal-body">
              <div class="detail-summary-grid">
                <div class="sum-box">
                  <span class="sum-label">ESTADO ACTUAL:</span>
                  <div class="sum-val">
                    @if (t.estado === 'EN_TRANSITO') {
                      <span class="status-badge badge-amber">&bull; EN TRÁNSITO</span>
                    } @else if (t.estado === 'COMPLETADA') {
                      <span class="status-badge badge-green">&bull; COMPLETADA</span>
                    } @else {
                      <span class="status-badge badge-red">&bull; CANCELADA</span>
                    }
                  </div>
                </div>

                <div class="sum-box">
                  <span class="sum-label">TOTAL PRENDAS:</span>
                  <div class="sum-val gold-val">{{ t.total_prendas }} unidades</div>
                </div>

                <div class="sum-box">
                  <span class="sum-label">SUCURSAL ORIGEN:</span>
                  <div class="sum-val">{{ t.sucursal_origen?.nombre || 'Origen #' + t.sucursal_origen_id }}</div>
                </div>

                <div class="sum-box">
                  <span class="sum-label">SUCURSAL DESTINO:</span>
                  <div class="sum-val">{{ t.sucursal_destino?.nombre || 'Destino #' + t.sucursal_destino_id }}</div>
                </div>
              </div>

              <!-- Route timeline -->
              <div class="timeline-box">
                <div class="timeline-step">
                  <span class="step-dot"></span>
                  <div class="step-info">
                    <strong>Despacho:</strong> {{ t.fecha_envio | date:'dd/MM/yyyy HH:mm' }}
                    <span class="step-sub">Despachado por: {{ t.usuario_envia?.nombre }} {{ t.usuario_envia?.apellido }} ({{ t.usuario_envia?.email }})</span>
                  </div>
                </div>

                <div class="timeline-step" [class.pending]="!t.fecha_recepcion">
                  <span class="step-dot" [class.active]="!!t.fecha_recepcion"></span>
                  <div class="step-info">
                    <strong>Recepción en Destino:</strong>
                    @if (t.fecha_recepcion) {
                      {{ t.fecha_recepcion | date:'dd/MM/yyyy HH:mm' }}
                      <span class="step-sub">Recibido por: {{ t.usuario_recibe?.nombre }} {{ t.usuario_recibe?.apellido }} ({{ t.usuario_recibe?.email }})</span>
                    } @else if (t.estado === 'CANCELADA') {
                      <span class="text-red">Operación Cancelada</span>
                    } @else {
                      <span class="text-amber">En tránsito / Pendiente de ingreso a tienda</span>
                    }
                  </div>
                </div>
              </div>

              @if (t.motivo) {
                <div class="obs-box">
                  <strong>Motivo:</strong> {{ t.motivo }}
                </div>
              }

              @if (t.observaciones) {
                <div class="obs-box mt-2">
                  <strong>Observaciones:</strong> {{ t.observaciones }}
                </div>
              }

              <h4 class="items-title">Prendas Desglosadas en la Guía:</h4>
              <div class="items-mini-list">
                @for (d of t.detalles; track d.id) {
                  <div class="item-mini-card">
                    <div>
                      <div class="item-prenda-name">
                        {{ getNombrePrenda(d.variante_id) || d.variante?.sku_variante || 'Variante #' + d.variante_id }}
                      </div>
                      <div class="item-meta">
                        Talla: {{ d.variante?.talla?.codigo }} &bull; Color: {{ d.variante?.color?.nombre }} &bull; SKU: {{ d.variante?.sku_variante }}
                      </div>
                    </div>
                    <div class="item-units-side">
                      <span class="item-units-val">{{ d.cantidad }}</span>
                      <span class="item-units-lbl">uds.</span>
                    </div>
                  </div>
                }
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-submit" (click)="selectedTransferencia.set(null)">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .cu9-container {
      padding: 2.5rem 3rem;
      max-width: 1400px;
      margin: 0 auto;
      color: #111111;
    }

    .editorial-hero {
      margin-bottom: 2.5rem;
    }

    .eyebrow {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.2em;
      color: #4b5563;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }

    .gold-dot {
      color: #000000;
    }

    .hero-main-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .hero-title {
      font-family: 'Inter', sans-serif;
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0 0 0.5rem 0;
      color: #000000;
    }

    .hero-description {
      font-family: 'Inter', sans-serif;
      font-size: 0.95rem;
      color: #4b5563;
      line-height: 1.6;
      max-width: 800px;
      margin: 0;
    }

    .btn-gold {
      background: #000000;
      color: #ffffff;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      padding: 0.9rem 1.8rem;
      border: 1px solid #000000;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
      border-radius: 0;
    }

    .btn-gold:hover {
      background: #262626;
      border-color: #262626;
      transform: translateY(-1px);
    }

    /* KPI Metrics Bar */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    .kpi-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      border-radius: 0;
    }

    .kpi-label {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: #4b5563;
      text-transform: uppercase;
      margin-bottom: 0.4rem;
    }

    .kpi-value {
      font-family: 'Inter', sans-serif;
      font-size: 2rem;
      font-weight: 800;
      color: #000000;
      line-height: 1.1;
      margin-bottom: 0.25rem;
    }

    .kpi-sub {
      font-size: 0.75rem;
      color: #6b7280;
      font-weight: 500;
    }

    .highlight-amber .kpi-value {
      color: #d97706;
    }

    .highlight-green .kpi-value {
      color: #16a34a;
    }

    /* Filters row */
    .filters-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      padding-bottom: 1rem;
    }

    .filter-tabs {
      display: flex;
      gap: 0.5rem;
    }

    .filter-tab-btn {
      background: transparent;
      border: none;
      color: #4b5563;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      padding: 0.5rem 1rem;
      cursor: pointer;
      transition: all 0.2s;
      border-radius: 0;
    }

    .filter-tab-btn:hover {
      color: #000000;
    }

    .filter-tab-btn.active {
      color: #000000;
      border-bottom: 2px solid #000000;
    }

    .filter-select-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .filter-label {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #4b5563;
      text-transform: uppercase;
    }

    .filter-select {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #000000;
      padding: 0.45rem 0.85rem;
      font-size: 0.8rem;
      border-radius: 0;
      outline: none;
      transition: border-color 0.2s ease;
    }

    .filter-select:focus {
      border-color: #000000;
    }

    /* Table Panel */
    .panel-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 2rem;
      border-radius: 0;
    }

    .panel-header {
      margin-bottom: 1.5rem;
    }

    .panel-title {
      font-family: 'Inter', sans-serif;
      font-size: 1.35rem;
      font-weight: 700;
      margin: 0 0 0.25rem 0;
      color: #000000;
    }

    .panel-hint {
      font-size: 0.82rem;
      color: #4b5563;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .editorial-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }

    .editorial-table th {
      text-align: left;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: #000000;
      padding: 0.85rem 1rem;
      border-bottom: 2px solid rgba(0, 0, 0, 0.12);
      background: #f9fafb;
      text-transform: uppercase;
    }

    .editorial-table td {
      padding: 1rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      vertical-align: middle;
      color: #1f2937;
    }

    .editorial-table tr:hover td {
      background: #f9fafb;
    }

    .code-badge {
      font-family: monospace;
      font-size: 0.82rem;
      font-weight: 700;
      color: #000000;
      background: #f3f4f6;
      padding: 0.25rem 0.6rem;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 0;
    }

    .col-date {
      color: #6b7280;
      font-size: 0.8rem;
    }

    .branch-pill {
      display: inline-block;
      font-size: 0.82rem;
      padding: 0.2rem 0.6rem;
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.15);
      color: #111111;
      font-weight: 600;
      border-radius: 0;
    }

    .branch-pill.origin {
      border-left: 3px solid #f59e0b;
    }

    .branch-pill.dest {
      border-left: 3px solid #10b981;
    }

    .units-badge {
      font-weight: 700;
      color: #000000;
      background: #f3f4f6;
      border: 1px solid rgba(0, 0, 0, 0.12);
      padding: 0.25rem 0.65rem;
      border-radius: 0;
    }

    .status-badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      padding: 0.3rem 0.75rem;
      border-radius: 0;
      text-transform: uppercase;
    }

    .badge-amber {
      background: #fffbeb;
      color: #b45309;
      border: 1px solid #fde68a;
    }

    .badge-green {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }

    .badge-red {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    .col-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .btn-action-view {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #000000;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.4rem 0.75rem;
      cursor: pointer;
      border-radius: 0;
      transition: all 0.2s ease;
    }

    .btn-action-view:hover {
      border-color: #000000;
      background: #000000;
      color: #ffffff;
    }

    .btn-action-receive {
      background: #16a34a;
      border: 1px solid #16a34a;
      color: #ffffff;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.4rem 0.75rem;
      cursor: pointer;
      border-radius: 0;
      transition: all 0.2s ease;
    }

    .btn-action-receive:hover {
      background: #15803d;
      border-color: #15803d;
    }

    .btn-action-cancel {
      background: #ffffff;
      border: 1px solid #dc2626;
      color: #dc2626;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.4rem 0.75rem;
      cursor: pointer;
      border-radius: 0;
      transition: all 0.2s ease;
    }

    .btn-action-cancel:hover {
      background: #dc2626;
      color: #ffffff;
    }

    /* Modal Backdrop & Dialog */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2rem;
    }

    .modal-dialog-large {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      width: 100%;
      max-width: 1040px;
      max-height: 92vh;
      overflow-y: auto;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.2);
      border-radius: 0;
    }

    .modal-dialog {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      width: 100%;
      max-width: 650px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.2);
      border-radius: 0;
    }

    .modal-header {
      padding: 1.5rem 2rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .modal-eyebrow {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: #4b5563;
      text-transform: uppercase;
    }

    .modal-title {
      font-family: 'Inter', sans-serif;
      font-size: 1.4rem;
      font-weight: 700;
      margin: 0.25rem 0 0 0;
      color: #000000;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: #6b7280;
      font-size: 1.5rem;
      cursor: pointer;
      transition: color 0.2s ease;
    }

    .btn-close:hover {
      color: #000000;
    }

    .modal-body {
      padding: 2rem;
    }

    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-label {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #374151;
      margin-bottom: 0.4rem;
      text-transform: uppercase;
    }

    .form-input {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #000000;
      padding: 0.75rem 1rem;
      font-size: 0.85rem;
      outline: none;
      border-radius: 0;
      transition: border-color 0.2s;
    }

    .form-input:focus {
      border-color: #000000;
    }

    .input-hint {
      font-size: 0.72rem;
      color: #6b7280;
      margin-top: 0.35rem;
    }

    .radio-mode-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .radio-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.15);
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: all 0.2s;
      border-radius: 0;
    }

    .radio-card.selected {
      border-color: #000000;
      background: #ffffff;
      box-shadow: 0 0 0 1px #000000;
    }

    .radio-title {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #000000;
    }

    .radio-sub {
      display: block;
      font-size: 0.7rem;
      color: #4b5563;
    }

    /* Transfer Lines Section */
    .transfer-lines-section {
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 1.5rem;
      margin-top: 1.5rem;
      border-radius: 0;
    }

    .lines-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }

    .lines-title {
      font-family: 'Inter', sans-serif;
      font-size: 1.15rem;
      font-weight: 700;
      margin: 0 0 0.2rem 0;
      color: #000000;
    }

    .lines-hint {
      font-size: 0.75rem;
      color: #4b5563;
    }

    .btn-add-line {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.25);
      color: #000000;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      padding: 0.5rem 1rem;
      cursor: pointer;
      border-radius: 0;
      transition: all 0.2s ease;
    }

    .btn-add-line:hover {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
    }

    .table-responsive-modal {
      width: 100%;
      overflow-x: hidden;
    }

    .nested-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .nested-table th {
      background: #f3f4f6;
      color: #000000;
      font-weight: 700;
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      padding: 0.75rem 0.85rem;
      border-bottom: 2px solid rgba(0, 0, 0, 0.1);
      text-transform: uppercase;
    }

    .nested-table td {
      padding: 0.75rem 0.5rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      vertical-align: middle;
    }

    .col-prenda {
      width: auto;
    }

    .col-stock {
      width: 130px;
    }

    .col-qty {
      width: 130px;
    }

    .col-del {
      width: 40px;
    }

    .select-variant {
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      font-size: 0.8rem;
    }

    .qty-input {
      width: 100%;
      box-sizing: border-box;
      text-align: center;
      font-weight: 700;
      font-size: 1rem;
      padding: 0.65rem 0.5rem;
    }

    .no-stock-alert {
      font-size: 0.72rem;
      color: #b91c1c;
      font-weight: 600;
      margin-top: 0.35rem;
    }

    .stock-avail-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.6rem;
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
      border-radius: 0;
    }

    .stock-avail-badge.low {
      background: #fffbeb;
      color: #b45309;
      border-color: #fde68a;
    }

    .stock-avail-badge.zero {
      background: #fef2f2;
      color: #991b1b;
      border-color: #fecaca;
    }

    .btn-remove-line {
      background: transparent;
      border: none;
      color: #dc2626;
      font-size: 1.25rem;
      cursor: pointer;
    }

    .lines-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
      margin-top: 1rem;
    }

    .total-label {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #4b5563;
      text-transform: uppercase;
    }

    .total-value {
      font-family: 'Inter', sans-serif;
      font-size: 1.3rem;
      font-weight: 800;
      color: #000000;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.5rem 2rem;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
      background: #f9fafb;
    }

    .btn-cancel {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #374151;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 0.75rem 1.5rem;
      cursor: pointer;
      border-radius: 0;
      transition: all 0.2s ease;
    }

    .btn-cancel:hover {
      background: #f3f4f6;
      color: #000000;
    }

    .btn-submit {
      background: #000000;
      border: 1px solid #000000;
      color: #ffffff;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      padding: 0.75rem 1.75rem;
      cursor: pointer;
      border-radius: 0;
      transition: all 0.2s ease;
    }

    .btn-submit:hover:not(:disabled) {
      background: #262626;
      border-color: #262626;
    }

    .btn-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Detail Modal Timeline & Grid */
    .detail-summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .sum-box {
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 1rem;
      border-radius: 0;
    }

    .sum-label {
      display: block;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #4b5563;
      margin-bottom: 0.35rem;
      text-transform: uppercase;
    }

    .sum-val {
      font-size: 0.95rem;
      font-weight: 700;
      color: #000000;
    }

    .gold-val {
      font-family: 'Inter', sans-serif;
      font-size: 1.2rem;
      color: #000000;
      font-weight: 800;
    }

    .timeline-box {
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      border-radius: 0;
    }

    .timeline-step {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }

    .step-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #000000;
      margin-top: 5px;
      flex-shrink: 0;
    }

    .timeline-step.pending .step-dot {
      background: #9ca3af;
    }

    .step-info {
      font-size: 0.85rem;
      color: #000000;
      font-weight: 600;
    }

    .step-sub {
      display: block;
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.2rem;
      font-weight: normal;
    }

    .obs-box {
      background: #f9fafb;
      border-left: 3px solid #000000;
      padding: 0.75rem 1rem;
      font-size: 0.82rem;
      color: #374151;
      margin-bottom: 1.5rem;
    }

    .items-title {
      font-family: 'Inter', sans-serif;
      font-size: 1.1rem;
      font-weight: 700;
      margin: 1.5rem 0 0.75rem 0;
      color: #000000;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .items-mini-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 250px;
      overflow-y: auto;
    }

    .item-mini-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 0.75rem 1rem;
      border-radius: 0;
    }

    .item-prenda-name {
      font-weight: 700;
      font-size: 0.88rem;
      color: #000000;
    }

    .item-meta {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.15rem;
      font-family: monospace;
    }

    .item-units-side {
      display: flex;
      align-items: baseline;
      gap: 0.25rem;
    }

    .item-units-val {
      font-family: 'Inter', sans-serif;
      font-size: 1.2rem;
      font-weight: 800;
      color: #000000;
    }

    .item-units-lbl {
      font-size: 0.7rem;
      color: #6b7280;
      font-weight: 600;
    }

    .feedback-banner {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      padding: 0.85rem 1.25rem;
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
    }

    .feedback-banner.error {
      background: #fef2f2;
      border-color: #fecaca;
      color: #991b1b;
    }

    .btn-close-banner {
      background: transparent;
      border: none;
      color: inherit;
      font-size: 1.25rem;
      cursor: pointer;
    }

    .loading-state {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1.5rem;
      font-size: 0.8rem;
      color: #000000;
      letter-spacing: 0.1em;
      font-weight: 600;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(0, 0, 0, 0.15);
      border-top-color: #000000;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #6b7280;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-amber { color: #d97706; }
    .text-red { color: #dc2626; }
    .mt-2 { margin-top: 0.5rem; }
  `]
})
export class TransferenciasPageComponent implements OnInit {
  private readonly inventarioService = inject(InventarioService);
  private readonly catalogoService = inject(CatalogoService);
  readonly authService = inject(AuthService);

  // State Signals
  readonly transferencias = signal<TransferenciaStockResponse[]>([]);
  readonly sucursales = signal<Sucursal[]>([]);
  readonly prendas = signal<Prenda[]>([]);
  readonly stocksOrigen = signal<InventarioStock[]>([]);

  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly feedbackMsg = signal<string | null>(null);
  readonly feedbackIsError = signal(false);

  readonly filtroEstado = signal<'TODOS' | 'EN_TRANSITO' | 'COMPLETADA' | 'CANCELADA'>('TODOS');
  readonly filtroSucursalId = signal<number | null>(null);

  readonly showCreateModal = signal(false);
  readonly selectedTransferencia = signal<TransferenciaStockResponse | null>(null);

  // Form State
  nuevaTransferencia: TransferenciaStockCreate = {
    sucursal_origen_id: 0,
    sucursal_destino_id: 0,
    motivo: '',
    observaciones: '',
    inmediata: false,
    detalles: []
  };

  lineasTransferencia: LineaTransferenciaForm[] = [];

  // Computed Metrics
  readonly enTransitoCount = computed(() =>
    this.transferencias().filter(t => t.estado === 'EN_TRANSITO').length
  );

  readonly completadasCount = computed(() =>
    this.transferencias().filter(t => t.estado === 'COMPLETADA').length
  );

  readonly totalUnidadesRebalanceadas = computed(() =>
    this.transferencias()
      .filter(t => t.estado === 'COMPLETADA')
      .reduce((acc, t) => acc + (t.total_prendas || 0), 0)
  );

  readonly transferenciasFiltradas = computed(() => {
    let list = this.transferencias();
    if (this.filtroEstado() !== 'TODOS') {
      list = list.filter(t => t.estado === this.filtroEstado());
    }
    const sucId = this.filtroSucursalId();
    if (sucId !== null) {
      list = list.filter(t =>
        t.sucursal_origen_id === sucId ||
        t.sucursal_destino_id === sucId
      );
    }
    return list;
  });

  readonly totalPrendasNuevaTransferencia = computed(() =>
    this.lineasTransferencia.reduce((acc, l) => acc + (l.cantidad || 0), 0)
  );

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.inventarioService.getTransferencias().subscribe({
      next: (data) => {
        this.transferencias.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.inventarioService.getSucursales().subscribe({
      next: (data) => {
        this.sucursales.set(data);
        if (data.length >= 2 && !this.nuevaTransferencia.sucursal_origen_id) {
          this.nuevaTransferencia.sucursal_origen_id = data[0].id;
          this.nuevaTransferencia.sucursal_destino_id = data[1].id;
          this.fetchStocksOrigen();
        }
      }
    });

    this.catalogoService.getPrendas().subscribe({
      next: (data) => this.prendas.set(data)
    });
  }

  fetchStocksOrigen(): void {
    if (!this.nuevaTransferencia.sucursal_origen_id) return;
    this.catalogoService.getStockPorSucursal(this.nuevaTransferencia.sucursal_origen_id).subscribe({
      next: (stks: InventarioStock[]) => {
        this.stocksOrigen.set(stks);
        // Actualizar stocks disponibles en líneas existentes
        for (const l of this.lineasTransferencia) {
          this.actualizarStockDisponibleLinea(l);
        }
      }
    });
  }

  onSucursalOrigenChange(): void {
    if (this.nuevaTransferencia.sucursal_origen_id === this.nuevaTransferencia.sucursal_destino_id) {
      const otro = this.sucursales().find(s => s.id !== this.nuevaTransferencia.sucursal_origen_id);
      if (otro) this.nuevaTransferencia.sucursal_destino_id = otro.id;
    }
    this.fetchStocksOrigen();
  }

  openNuevaTransferenciaModal(): void {
    if (this.sucursales().length < 2) {
      this.showFeedback('Se requieren al menos dos sucursales registradas para realizar transferencias.', true);
      return;
    }

    this.nuevaTransferencia = {
      sucursal_origen_id: this.sucursales()[0].id,
      sucursal_destino_id: this.sucursales()[1].id,
      motivo: '',
      observaciones: '',
      inmediata: false,
      detalles: []
    };

    this.lineasTransferencia = [
      { variante_id: 0, cantidad: 1, stock_origen_disponible: 0 }
    ];

    this.fetchStocksOrigen();
    this.showCreateModal.set(true);
  }

  agregarLinea(): void {
    this.lineasTransferencia.push({
      variante_id: 0,
      cantidad: 1,
      stock_origen_disponible: 0
    });
  }

  quitarLinea(index: number): void {
    if (this.lineasTransferencia.length > 1) {
      this.lineasTransferencia.splice(index, 1);
    }
  }

  onVarianteSeleccionada(linea: LineaTransferenciaForm): void {
    this.actualizarStockDisponibleLinea(linea);
  }

  actualizarStockDisponibleLinea(linea: LineaTransferenciaForm): void {
    if (!linea.variante_id) {
      linea.stock_origen_disponible = 0;
      return;
    }
    const found = this.stocksOrigen().find(s => s.variante_id === linea.variante_id);
    linea.stock_origen_disponible = found ? found.cantidad_disponible : 0;
  }

  guardarTransferencia(): void {
    // Validar líneas
    const validLines = this.lineasTransferencia.filter(l => l.variante_id > 0 && l.cantidad > 0);
    if (validLines.length === 0) {
      this.showFeedback('Debe incluir al menos una prenda válida con cantidad mayor a 0.', true);
      return;
    }

    // Validar stock disponible
    for (const l of validLines) {
      if (l.cantidad > l.stock_origen_disponible) {
        this.showFeedback(`La cantidad de ${l.cantidad} supera las ${l.stock_origen_disponible} unidades disponibles en la sucursal de origen.`, true);
        return;
      }
    }

    this.nuevaTransferencia.detalles = validLines.map(l => ({
      variante_id: l.variante_id,
      cantidad: l.cantidad
    }));

    this.isSubmitting.set(true);
    this.inventarioService.createTransferencia(this.nuevaTransferencia).subscribe({
      next: (t) => {
        this.isSubmitting.set(false);
        this.showCreateModal.set(false);
        const accion = t.estado === 'COMPLETADA' ? 'ejecutada y recibida' : 'despachada en tránsito';
        this.showFeedback(`Guía ${t.codigo} ${accion} exitosamente (${t.total_prendas} prendas).`);
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showFeedback(err.error?.detail || 'Error al procesar la transferencia.', true);
      }
    });
  }

  recibirTransferencia(t: TransferenciaStockResponse): void {
    if (!confirm(`¿Confirmar la recepción física de la guía ${t.codigo} (${t.total_prendas} prendas) en destino?`)) {
      return;
    }

    this.isLoading.set(true);
    this.inventarioService.recibirTransferencia(t.id).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.showFeedback(`Guía ${res.codigo} confirmada en destino. Stock ingresado al Kardex.`);
        this.loadData();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showFeedback(err.error?.detail || 'Error al recibir la transferencia.', true);
      }
    });
  }

  cancelarTransferencia(t: TransferenciaStockResponse): void {
    const motivo = prompt(`Ingrese el motivo de cancelación para la guía ${t.codigo}:`, 'Cancelación solicitada por logística');
    if (motivo === null) return;

    this.isLoading.set(true);
    this.inventarioService.cancelarTransferencia(t.id, motivo).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.showFeedback(`Guía ${res.codigo} cancelada. Existencias restituidas a la sucursal de origen.`);
        this.loadData();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showFeedback(err.error?.detail || 'Error al cancelar la transferencia.', true);
      }
    });
  }

  verDetalle(t: TransferenciaStockResponse): void {
    this.selectedTransferencia.set(t);
  }

  getNombrePrenda(varianteId: number): string {
    for (const p of this.prendas()) {
      if (p.variantes && p.variantes.some(v => v.id === varianteId)) {
        return p.nombre;
      }
    }
    return '';
  }

  showFeedback(msg: string, isError = false): void {
    this.feedbackMsg.set(msg);
    this.feedbackIsError.set(isError);
    setTimeout(() => {
      if (this.feedbackMsg() === msg) {
        this.feedbackMsg.set(null);
      }
    }, 4500);
  }
}
