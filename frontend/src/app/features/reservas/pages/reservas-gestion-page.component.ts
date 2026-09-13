import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ReservasService } from '../services/reservas.service';
import { InventarioService } from '../../inventario/services/inventario.service';
import { Reserva, AsignarProbadorRequest, FinalizarPruebaRequest, ResultadoDetalleInput } from '../models/reservas.models';
import { Sucursal } from '../../inventario/models/inventario.models';

interface ItemChecklist {
  detalle_id: number;
  nombre: string;
  sku: string;
  talla: string;
  color: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
  probada: boolean;
  comprada: boolean;
}

@Component({
  selector: 'app-reservas-gestion-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="gestion-reservas-container">
      <!-- HEADER PRINCIPAL -->
      <header class="gestion-header">
        <div class="header-titles">
          <div class="luxury-badge">ATELIER NOIR &bull; ATENCIÓN EN TIENDA</div>
          <h1>Gestión de Probadores &amp; Atención en Tienda</h1>
          <p class="subtitle">
            Control de citas presenciales, asignación de vestidores físicos, chequeo post-prueba y derivación directa a Caja POS.
          </p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn-refresh" (click)="cargarReservas()" [disabled]="loading">
            <span class="icon">&#8635;</span> Actualizar Citas
          </button>
        </div>
      </header>

      <!-- METRICAS RAPIDAS -->
      <section class="metrics-bar">
        <div class="metric-card" (click)="filtrarPorEstado('ALL')" [class.active]="estadoFiltro === 'ALL'">
          <div class="metric-val">{{ reservas.length }}</div>
          <div class="metric-label">Total Reservas</div>
        </div>
        <div class="metric-card gold" (click)="filtrarPorEstado('CONFIRMADA')" [class.active]="estadoFiltro === 'CONFIRMADA'">
          <div class="metric-val">{{ contarPorEstado('CONFIRMADA') }}</div>
          <div class="metric-label">Por Llegar (Confirmadas)</div>
        </div>
        <div class="metric-card purple" (click)="filtrarPorEstado('EN_PROBADOR')" [class.active]="estadoFiltro === 'EN_PROBADOR'">
          <div class="metric-val">{{ contarPorEstado('EN_PROBADOR') }}</div>
          <div class="metric-label">En Vestidor (Probándose)</div>
        </div>
        <div class="metric-card emerald" (click)="filtrarPorEstado('COMPLETADA')" [class.active]="estadoFiltro === 'COMPLETADA'">
          <div class="metric-val">{{ contarPorEstado('COMPLETADA') }}</div>
          <div class="metric-label">Finalizadas / Compradas</div>
        </div>
        <div class="metric-card rose" (click)="filtrarPorEstado('EXPIRADA')" [class.active]="estadoFiltro === 'EXPIRADA'">
          <div class="metric-val">{{ contarPorEstado('EXPIRADA') }}</div>
          <div class="metric-label">No-Show / Expiradas</div>
        </div>
      </section>

      <!-- MENSAJES TOAST -->
      <div *ngIf="mensajeExito" class="toast-alert success">
        <span class="toast-icon">&#10003;</span>
        <div class="toast-body">
          <strong>Operación Exitosa</strong>
          <span>{{ mensajeExito }}</span>
        </div>
        <button type="button" class="toast-close" (click)="mensajeExito = null">&times;</button>
      </div>

      <div *ngIf="mensajeError" class="toast-alert error">
        <span class="toast-icon">&#9888;</span>
        <div class="toast-body">
          <strong>Atención</strong>
          <span>{{ mensajeError }}</span>
        </div>
        <button type="button" class="toast-close" (click)="mensajeError = null">&times;</button>
      </div>

      <!-- PANEL DE CONTROL & ESCÁNER QR -->
      <div class="control-card">
        <div class="search-scanner-bar">
          <div class="scanner-input-wrap">
            <span class="scanner-icon">&#9783;</span>
            <input
              type="text"
              class="input-scanner"
              [(ngModel)]="codigoBusqueda"
              placeholder="Escanear Pase QR o ingresar código de reserva (ej: RSV-2026...)"
              (keyup.enter)="buscarPorCodigo()"
            />
          </div>
          <button type="button" class="btn-search" (click)="buscarPorCodigo()" [disabled]="!codigoBusqueda || loading">
            Escanear / Buscar
          </button>
          <button *ngIf="busquedaActiva" type="button" class="btn-clear-search" (click)="limpiarBusqueda()">
            Ver Todas
          </button>
        </div>

        <div class="filters-row">
          <div class="filter-group">
            <label>Filtrar por Sucursal:</label>
            <select class="custom-select" [(ngModel)]="sucursalFiltro" (change)="cargarReservas()">
              <option [ngValue]="null">Todas las Boutiques</option>
              <option *ngFor="let s of sucursales" [ngValue]="s.id">{{ s.nombre }}</option>
            </select>
          </div>

          <div class="filter-pills">
            <button
              type="button"
              class="pill-btn"
              [class.active]="estadoFiltro === 'ALL'"
              (click)="filtrarPorEstado('ALL')">
              Todas
            </button>
            <button
              type="button"
              class="pill-btn"
              [class.active]="estadoFiltro === 'CONFIRMADA'"
              (click)="filtrarPorEstado('CONFIRMADA')">
              Confirmadas
            </button>
            <button
              type="button"
              class="pill-btn"
              [class.active]="estadoFiltro === 'EN_PROBADOR'"
              (click)="filtrarPorEstado('EN_PROBADOR')">
              En Vestidor
            </button>
            <button
              type="button"
              class="pill-btn"
              [class.active]="estadoFiltro === 'COMPLETADA'"
              (click)="filtrarPorEstado('COMPLETADA')">
              Completadas
            </button>
            <button
              type="button"
              class="pill-btn"
              [class.active]="estadoFiltro === 'EXPIRADA'"
              (click)="filtrarPorEstado('EXPIRADA')">
              Expiradas
            </button>
          </div>
        </div>
      </div>

      <!-- ESTADO DE CARGA -->
      <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Sincronizando agenda de probadores en tienda...</p>
      </div>

      <!-- LISTADO / TABLERO DE CITAS -->
      <div *ngIf="!loading && reservasFiltradas.length === 0" class="empty-state">
        <div class="empty-icon">&#128087;</div>
        <h3>No hay reservas para los filtros seleccionados</h3>
        <p>Cuando un cliente agende una cita o escanees su pase QR, aparecerá aquí para su atención inmediata.</p>
      </div>

      <div *ngIf="!loading && reservasFiltradas.length > 0" class="reservas-grid">
        <div *ngFor="let r of reservasFiltradas" class="reserva-card" [class.en-probador]="r.estado === 'EN_PROBADOR'">
          <!-- CABECERA DE TARJETA -->
          <div class="card-head">
            <div class="code-wrap">
              <span class="badge-code">{{ r.codigo_reserva }}</span>
              <span class="appointment-time">&#128338; {{ r.hora_estimada }} | {{ r.fecha_reserva }}</span>
            </div>
            <span class="status-pill" [ngClass]="getEstadoBadgeClass(r.estado)">
              {{ r.estado }}
            </span>
          </div>

          <!-- INFO CLIENTE & BOUTIQUE -->
          <div class="card-body">
            <div class="client-info">
              <div class="avatar-circle">
                {{ (r.cliente?.nombre || 'C').charAt(0) }}
              </div>
              <div class="client-meta">
                <h4>{{ r.cliente?.nombre }} {{ r.cliente?.apellido || '' }}</h4>
                <span class="email">{{ r.cliente?.email }}</span>
                <span class="store-name">&#127970; {{ r.sucursal?.nombre || 'Boutique Atelier' }}</span>
              </div>
            </div>

            <!-- PROBADOR ASIGNADO / ATENDIDO POR -->
            <div class="booth-status-box" *ngIf="r.probador_asignado || r.atendido_por">
              <div *ngIf="r.probador_asignado" class="booth-tag">
                <span class="icon">&#128682;</span>
                <span><strong>Cabina:</strong> {{ r.probador_asignado }}</span>
              </div>
              <div *ngIf="r.atendido_por" class="staff-tag">
                <span class="icon">&#129489;&#8205;&#9877;&#65039;</span>
                <span><strong>Atendido por:</strong> {{ r.atendido_por.nombre }}</span>
              </div>
            </div>

            <!-- RESUMEN PRENDAS -->
            <div class="garments-summary">
              <div class="garments-head">
                <span>Prendas en Reserva ({{ r.detalles.length }})</span>
                <span *ngIf="r.monto_anticipo > 0" class="anticipo-tag">
                  Anticipo: <span class="currency">$</span>{{ r.monto_anticipo }} {{ r.moneda }}
                </span>
              </div>

              <div class="garments-mini-list">
                <div *ngFor="let det of r.detalles" class="garment-mini-item">
                  <div class="garment-indicator" [class.bought]="det.comprada" [class.tried]="det.probada">
                    {{ det.comprada ? '&#10003; Comprada' : (det.probada ? 'Probada' : 'Reservada') }}
                  </div>
                  <div class="garment-desc">
                    <span class="p-name">{{ det.variante?.prenda?.nombre || 'Prenda de Colección' }}</span>
                    <span class="p-sku">Talla: {{ det.variante?.talla?.codigo || 'U' }} | Color: {{ det.variante?.color?.nombre || 'Std' }}</span>
                  </div>
                  <div class="garment-price">
                    <span class="currency">$</span>{{ det.precio_unitario }}
                  </div>
                </div>
              </div>
            </div>

            <div *ngIf="r.observaciones" class="notes-snippet">
              <span class="note-label">Nota:</span> {{ r.observaciones }}
            </div>
          </div>

          <!-- ACCIONES DE TARJETA -->
          <div class="card-foot">
            <!-- ACCIONES PARA ESTADO CONFIRMADA -->
            <ng-container *ngIf="r.estado === 'CONFIRMADA'">
              <button type="button" class="btn-action primary" (click)="abrirModalAsignar(r)">
                &#128682; Asignar Cabina &amp; Recibir
              </button>
              <button type="button" class="btn-action danger-outline" (click)="abrirModalExpirar(r)">
                No-Show
              </button>
            </ng-container>

            <!-- ACCIONES PARA ESTADO EN_PROBADOR -->
            <ng-container *ngIf="r.estado === 'EN_PROBADOR'">
              <button type="button" class="btn-action success" (click)="abrirModalFinalizar(r)">
                &#10003; Finalizar Prueba &amp; POS
              </button>
              <button type="button" class="btn-action secondary-outline" (click)="abrirModalAsignar(r)">
                Cambiar Cabina
              </button>
            </ng-container>

            <!-- ACCIONES PARA COMPLETADA / EXPIRADA -->
            <button type="button" class="btn-action outline-full" (click)="verDetalle(r)">
              Ver Ficha Detallada
            </button>
          </div>
        </div>
      </div>

      <!-- ================= MODAL: ASIGNAR PROBADOR ================= -->
      <div *ngIf="modalAsignarVisible && reservaParaAsignar" class="modal-backdrop">
        <div class="modal-card">
          <div class="modal-head">
            <h3>Asignar Vestidor Físico</h3>
            <button type="button" class="modal-close" (click)="cerrarModales()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="dialog-client-bar">
              <strong>Titular:</strong> {{ reservaParaAsignar.cliente?.nombre }} {{ reservaParaAsignar.cliente?.apellido || '' }}
              &bull; <strong>Cita:</strong> {{ reservaParaAsignar.hora_estimada }}
            </div>

            <div class="form-group">
              <label>Seleccionar Cabina de Probador:</label>
              <div class="cabin-chips">
                <button
                  type="button"
                  *ngFor="let c of cabinasDisponibles"
                  class="cabin-chip"
                  [class.selected]="probadorSeleccionado === c"
                  (click)="probadorSeleccionado = c">
                  {{ c }}
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>O ingresar nombre personalizado:</label>
              <input type="text" class="custom-input" [(ngModel)]="probadorSeleccionado" placeholder="ej: Probador #4, Suite Alta Costura" />
            </div>

            <div class="form-group">
              <label>Observaciones de Recepción (Opcional):</label>
              <textarea class="custom-textarea" [(ngModel)]="observacionAsignar" rows="2" placeholder="ej: Se le ofreció café, cliente solicita prendas adicionales"></textarea>
            </div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn-cancel" (click)="cerrarModales()">Cancelar</button>
            <button type="button" class="btn-submit gold" (click)="confirmarAsignarProbador()" [disabled]="!probadorSeleccionado || loading">
              Confirmar Recepción &amp; Ingreso
            </button>
          </div>
        </div>
      </div>

      <!-- ================= MODAL: FINALIZAR PRUEBA & DERIVAR A POS ================= -->
      <div *ngIf="modalFinalizarVisible && reservaParaFinalizar" class="modal-backdrop">
        <div class="modal-card modal-lg">
          <div class="modal-head">
            <div>
              <div class="luxury-badge">MESA DE CHEQUEO &bull; ATELIER</div>
              <h3>Finalizar Prueba &amp; Liquidación</h3>
            </div>
            <button type="button" class="modal-close" (click)="cerrarModales()">&times;</button>
          </div>

          <div class="modal-body">
            <p class="section-hint">
              Marcá las prendas que el cliente <strong>comprará</strong> y las que serán <strong>devueltas al perchero</strong>.
              El stock no adquirido se reintegrará automáticamente al inventario disponible.
            </p>

            <div class="checklist-table-wrap">
              <table class="checklist-table">
                <thead>
                  <tr>
                    <th>Prenda &amp; Look</th>
                    <th>Talla / Color</th>
                    <th>Precio</th>
                    <th class="text-center">¿Probada?</th>
                    <th class="text-center">Decisión del Cliente</th>
                    <th class="text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of resultadosChecklist" [class.bought-row]="item.comprada">
                    <td>
                      <strong>{{ item.nombre }}</strong>
                      <div class="sku-sub">{{ item.sku }}</div>
                    </td>
                    <td>
                      <span class="tag-meta">{{ item.talla }}</span>
                      <span class="tag-meta">{{ item.color }}</span>
                    </td>
                    <td><span class="currency">$</span>{{ item.precio_unitario }}</td>
                    <td class="text-center">
                      <input type="checkbox" [(ngModel)]="item.probada" class="custom-chk" />
                    </td>
                    <td class="text-center">
                      <div class="toggle-decision">
                        <button
                          type="button"
                          class="dec-btn buy"
                          [class.active]="item.comprada"
                          (click)="item.comprada = true">
                          &#10003; Llevar
                        </button>
                        <button
                          type="button"
                          class="dec-btn return"
                          [class.active]="!item.comprada"
                          (click)="item.comprada = false">
                          &#8634; Devolver
                        </button>
                      </div>
                    </td>
                    <td class="text-right font-mono">
                      {{ item.comprada ? ('$' + item.subtotal) : '$0.00' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- RESUMEN FINANCIERO & DERIVACIÓN A POS -->
            <div class="settlement-summary">
              <div class="settlement-col">
                <div class="derivar-check">
                  <label class="custom-checkbox-label">
                    <input type="checkbox" [(ngModel)]="derivarAPos" class="custom-chk" />
                    <span><strong>Derivar automáticamente a Caja POS</strong> (Generar ticket oficial de venta con canal FISICA_RESERVA)</span>
                  </label>
                </div>

                <div class="form-group" style="margin-top: 1rem;">
                  <label>Notas finales de atención:</label>
                  <input type="text" class="custom-input" [(ngModel)]="observacionFinalizar" placeholder="ej: Cliente satisfecho con la talla, solicita aviso de nueva colección" />
                </div>
              </div>

              <div class="settlement-col totals-box">
                <div class="tot-row">
                  <span>Subtotal Prendas Compradas:</span>
                  <strong><span class="currency">$</span>{{ calcularTotalComprado() | number:'1.2-2' }}</strong>
                </div>
                <div class="tot-row anticipo" *ngIf="reservaParaFinalizar.monto_anticipo > 0">
                  <span>Anticipo Pagado a Favor:</span>
                  <strong>- <span class="currency">$</span>{{ calcularAnticipoAplicado() | number:'1.2-2' }}</strong>
                </div>
                <div class="tot-divider"></div>
                <div class="tot-row grand-total">
                  <span>Saldo a Cobrar en Caja:</span>
                  <span class="gold-amount"><span class="currency">$</span>{{ calcularSaldoRestante() | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-foot">
            <button type="button" class="btn-cancel" (click)="cerrarModales()">Volver</button>
            <button type="button" class="btn-submit emerald" (click)="confirmarFinalizarPrueba()" [disabled]="loading">
              Completar Prueba &amp; Liquidar Inventario
            </button>
          </div>
        </div>
      </div>

      <!-- ================= MODAL: MARCAR EXPIRADA / NO-SHOW ================= -->
      <div *ngIf="modalExpirarVisible && reservaParaExpirar" class="modal-backdrop">
        <div class="modal-card">
          <div class="modal-head">
            <h3>Declarar No-Show / Expiración</h3>
            <button type="button" class="modal-close" (click)="cerrarModales()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="warning-box">
              <span class="warn-icon">&#9888;</span>
              <div>
                <strong>Reincorporación Inmediata de Stock</strong>
                <p>Al marcar la reserva <strong>#{{ reservaParaExpirar.codigo_reserva }}</strong> como expirada, el 100% de las prendas reservadas regresará al perchero general disponible para otros clientes.</p>
              </div>
            </div>

            <div class="form-group">
              <label>Motivo de Expiración:</label>
              <select class="custom-select" [(ngModel)]="motivoExpirar">
                <option value="Cliente no se presentó a su turno en probador">Cliente no se presentó (No-Show)</option>
                <option value="Tiempo de tolerancia superado (más de 30 min)">Tiempo de tolerancia superado</option>
                <option value="Cliente notificó imposibilidad de acudir">Cliente notificó imposibilidad de acudir</option>
              </select>
            </div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn-cancel" (click)="cerrarModales()">Cancelar</button>
            <button type="button" class="btn-submit danger" (click)="confirmarExpirar()" [disabled]="loading">
              Confirmar Expiración &amp; Liberar Prendas
            </button>
          </div>
        </div>
      </div>

      <!-- ================= MODAL: FICHA DETALLADA ================= -->
      <div *ngIf="modalDetalleVisible && reservaParaDetalle" class="modal-backdrop">
        <div class="modal-card">
          <div class="modal-head">
            <h3>Ficha de Cita &bull; {{ reservaParaDetalle.codigo_reserva }}</h3>
            <button type="button" class="modal-close" (click)="cerrarModales()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="detail-grid">
              <div><strong>Estado:</strong> {{ reservaParaDetalle.estado }}</div>
              <div><strong>Fecha / Hora:</strong> {{ reservaParaDetalle.fecha_reserva }} &bull; {{ reservaParaDetalle.hora_estimada }}</div>
              <div><strong>Titular:</strong> {{ reservaParaDetalle.cliente?.nombre }} {{ reservaParaDetalle.cliente?.apellido || '' }}</div>
              <div><strong>Email:</strong> {{ reservaParaDetalle.cliente?.email }}</div>
              <div><strong>Boutique:</strong> {{ reservaParaDetalle.sucursal?.nombre }}</div>
              <div><strong>Cabina:</strong> {{ reservaParaDetalle.probador_asignado || 'No asignada' }}</div>
              <div><strong>Atendido por:</strong> {{ reservaParaDetalle.atendido_por?.nombre || 'Pendiente' }}</div>
              <div><strong>Anticipo:</strong> <span class="currency">$</span>{{ reservaParaDetalle.monto_anticipo }} {{ reservaParaDetalle.moneda }}</div>
            </div>

            <div *ngIf="qrSvgSafe" class="qr-preview-box">
              <div [innerHTML]="qrSvgSafe"></div>
              <span class="qr-token-label">{{ reservaParaDetalle.codigo_reserva }}</span>
            </div>

            <h4 style="margin: 1rem 0 0.5rem; color: #d4af37;">Prendas Asignadas:</h4>
            <ul class="detail-items-list">
              <li *ngFor="let det of reservaParaDetalle.detalles">
                <span>{{ det.variante?.prenda?.nombre }} (Talla: {{ det.variante?.talla?.codigo }}, Color: {{ det.variante?.color?.nombre }}) x{{ det.cantidad }}</span>
                <strong><span class="currency">$</span>{{ det.subtotal }}</strong>
              </li>
            </ul>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn-cancel" (click)="cerrarModales()">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gestion-reservas-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem 1.5rem 4rem;
      color: #111827;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* HEADER */
    .gestion-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      padding-bottom: 1.5rem;
    }
    .luxury-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      color: #6b7280;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
    }
    .gestion-header h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #000000;
      margin: 0 0 0.5rem 0;
      letter-spacing: -0.02em;
    }
    .subtitle {
      color: #6b7280;
      font-size: 0.95rem;
      max-width: 700px;
      margin: 0;
      line-height: 1.5;
    }
    .btn-refresh {
      background: #ffffff;
      color: #374151;
      border: 1px solid #d1d5db;
      padding: 0.6rem 1.1rem;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s;
    }
    .btn-refresh:hover {
      background: #f9fafb;
      color: #000000;
      border-color: #9ca3af;
    }

    /* METRICAS */
    .metrics-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .metric-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      padding: 1.25rem;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .metric-card:hover, .metric-card.active {
      transform: translateY(-2px);
      border-color: #000000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    .metric-val {
      font-size: 2.2rem;
      font-weight: 700;
      color: #111827;
      line-height: 1;
      margin-bottom: 0.4rem;
    }
    .metric-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .metric-card.gold .metric-val { color: #111827; }
    .metric-card.purple .metric-val { color: #7c3aed; }
    .metric-card.emerald .metric-val { color: #059669; }
    .metric-card.rose .metric-val { color: #e11d48; }

    /* TOAST ALERTS */
    .toast-alert {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
    }
    .toast-alert.success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    }
    .toast-alert.error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }
    .toast-icon { font-size: 1.3rem; }
    .toast-body { flex: 1; display: flex; flex-direction: column; font-size: 0.9rem; }
    .toast-body strong { color: #111827; }
    .toast-close {
      background: none;
      border: none;
      font-size: 1.4rem;
      color: inherit;
      cursor: pointer;
      opacity: 0.7;
    }
    .toast-close:hover { opacity: 1; }

    /* PANEL CONTROL & SCANNER */
    .control-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 10px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .search-scanner-bar {
      display: flex;
      gap: 0.8rem;
      margin-bottom: 1.5rem;
    }
    .scanner-input-wrap {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
    }
    .scanner-icon {
      position: absolute;
      left: 1rem;
      font-size: 1.2rem;
      color: #6b7280;
    }
    .input-scanner {
      width: 100%;
      background: #ffffff;
      border: 1px solid #d1d5db;
      color: #111827;
      padding: 0.85rem 1rem 0.85rem 2.8rem;
      border-radius: 8px;
      font-size: 1rem;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .input-scanner:focus {
      border-color: #000000;
      box-shadow: 0 0 0 1px #000000;
    }
    .btn-search {
      background: #000000;
      color: #ffffff;
      border: none;
      padding: 0 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-search:hover:not(:disabled) { background: #1f2937; }
    .btn-search:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-clear-search {
      background: #ffffff;
      color: #4b5563;
      border: 1px solid #d1d5db;
      padding: 0 1.2rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
    }
    .btn-clear-search:hover {
      background: #f3f4f6;
      color: #111827;
    }

    .filters-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .filter-group {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.9rem;
      color: #6b7280;
    }
    .custom-select {
      background: #ffffff;
      border: 1px solid #d1d5db;
      color: #111827;
      padding: 0.5rem 0.8rem;
      border-radius: 6px;
      outline: none;
    }
    .custom-select:focus {
      border-color: #000000;
    }
    .filter-pills {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .pill-btn {
      background: #ffffff;
      color: #6b7280;
      border: 1px solid #e5e7eb;
      padding: 0.4rem 0.8rem;
      border-radius: 20px;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pill-btn:hover { color: #111827; border-color: #d1d5db; }
    .pill-btn.active {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
      font-weight: 600;
    }

    /* ESTADOS VACÍO Y CARGA */
    .loading-state, .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: #ffffff;
      border: 1px dashed #d1d5db;
      border-radius: 10px;
      color: #6b7280;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(0, 0, 0, 0.1);
      border-top-color: #000000;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; color: #9ca3af; }

    /* GRID DE TARJETAS */
    .reservas-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: 1.5rem;
    }
    .reserva-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: border-color 0.2s, box-shadow 0.2s;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .reserva-card:hover {
      border-color: #d1d5db;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
    }
    .reserva-card.en-probador {
      border-color: #c4b5fd;
      background: #faf5ff;
    }

    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.2rem 1.25rem 0.8rem;
      border-bottom: 1px solid #f3f4f6;
    }
    .badge-code {
      font-family: monospace;
      font-size: 0.95rem;
      font-weight: 700;
      color: #111827;
      letter-spacing: 0.05em;
    }
    .appointment-time {
      display: block;
      font-size: 0.8rem;
      color: #6b7280;
      margin-top: 0.2rem;
      font-weight: 500;
    }
    .status-pill {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .status-confirmada { background: #fef9c3; color: #854d0e; border: 1px solid #fde047; }
    .status-en-probador { background: #f3e8ff; color: #6b21a8; border: 1px solid #d8b4fe; }
    .status-completada { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .status-expirada { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .status-cancelada { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .status-default { background: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb; }

    .card-body {
      padding: 1.25rem;
      flex: 1;
    }
    .client-info {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      margin-bottom: 1rem;
    }
    .avatar-circle {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #000000;
      color: #ffffff;
      font-weight: 700;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .client-meta h4 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 600;
      color: #111827;
    }
    .client-meta .email {
      display: block;
      font-size: 0.8rem;
      color: #6b7280;
    }
    .client-meta .store-name {
      display: block;
      font-size: 0.8rem;
      color: #4b5563;
      margin-top: 0.2rem;
    }

    .booth-status-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 0.6rem 0.8rem;
      margin-bottom: 1rem;
      font-size: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .booth-tag strong, .staff-tag strong { color: #111827; }
    .booth-tag .icon { color: #7c3aed; margin-right: 0.4rem; }
    .staff-tag .icon { color: #0284c7; margin-right: 0.4rem; }

    .garments-summary {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 0.8rem;
      margin-bottom: 0.8rem;
    }
    .garments-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      font-weight: 600;
      color: #4b5563;
      margin-bottom: 0.6rem;
      padding-bottom: 0.4rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .anticipo-tag {
      color: #059669;
      font-weight: 600;
      font-size: 0.8rem;
    }
    .garments-mini-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .garment-mini-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.85rem;
      gap: 0.6rem;
    }
    .garment-indicator {
      font-size: 0.7rem;
      padding: 0.15rem 0.4rem;
      border-radius: 3px;
      background: #e5e7eb;
      color: #374151;
      white-space: nowrap;
    }
    .garment-indicator.bought { background: #dcfce7; color: #166534; }
    .garment-indicator.tried { background: #f3e8ff; color: #6b21a8; }
    .garment-desc {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .garment-desc .p-name {
      color: #111827;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .garment-desc .p-sku {
      font-size: 0.75rem;
      color: #6b7280;
    }
    .garment-price {
      font-family: monospace;
      font-weight: 600;
      color: #111827;
    }

    .notes-snippet {
      font-size: 0.8rem;
      color: #713f12;
      font-style: italic;
      background: #fefce8;
      border-left: 2px solid #eab308;
      padding: 0.3rem 0.6rem;
      border-radius: 0 4px 4px 0;
    }
    .notes-snippet .note-label { font-weight: 600; color: #854d0e; }

    .card-foot {
      padding: 0.8rem 1.25rem 1.2rem;
      background: #fafafa;
      border-top: 1px solid #f3f4f6;
      display: flex;
      gap: 0.6rem;
    }
    .btn-action {
      flex: 1;
      padding: 0.65rem 0.8rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s;
      border: none;
    }
    .btn-action.primary { background: #000000; color: #ffffff; }
    .btn-action.primary:hover { background: #1f2937; }
    .btn-action.success { background: #059669; color: #ffffff; }
    .btn-action.success:hover { background: #047857; }
    .btn-action.danger-outline {
      background: transparent;
      border: 1px solid #fecaca;
      color: #dc2626;
      flex: 0 0 auto;
      padding: 0.65rem 1rem;
    }
    .btn-action.danger-outline:hover { background: #fef2f2; }
    .btn-action.secondary-outline {
      background: #ffffff;
      border: 1px solid #d1d5db;
      color: #374151;
      flex: 0 0 auto;
    }
    .btn-action.secondary-outline:hover { background: #f3f4f6; color: #111827; }
    .btn-action.outline-full {
      background: #ffffff;
      color: #374151;
      border: 1px solid #d1d5db;
    }
    .btn-action.outline-full:hover { background: #f3f4f6; color: #111827; }

    /* MODALES BACKDROP & CARDS */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }
    .modal-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      width: 100%;
      max-width: 540px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      max-height: 90vh;
    }
    .modal-card.modal-lg { max-width: 900px; }
    .modal-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f3f4f6;
    }
    .modal-head h3 { margin: 0; font-size: 1.25rem; font-weight: 600; color: #111827; }
    .modal-close {
      background: none;
      border: none;
      font-size: 1.6rem;
      color: #6b7280;
      cursor: pointer;
    }
    .modal-close:hover { color: #111827; }
    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }
    .modal-foot {
      padding: 1rem 1.5rem;
      border-top: 1px solid #f3f4f6;
      background: #fafafa;
      display: flex;
      justify-content: flex-end;
      gap: 0.8rem;
    }
    .btn-cancel {
      background: #ffffff;
      color: #4b5563;
      border: 1px solid #d1d5db;
      padding: 0.65rem 1.2rem;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
    }
    .btn-cancel:hover { background: #f3f4f6; color: #111827; }
    .btn-submit {
      border: none;
      padding: 0.65rem 1.5rem;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-submit.gold { background: #000000; color: #ffffff; }
    .btn-submit.gold:hover:not(:disabled) { background: #1f2937; }
    .btn-submit.emerald { background: #059669; color: #ffffff; }
    .btn-submit.emerald:hover:not(:disabled) { background: #047857; }
    .btn-submit.danger { background: #dc2626; color: #ffffff; }
    .btn-submit.danger:hover:not(:disabled) { background: #b91c1c; }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

    .dialog-client-bar {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 0.75rem 1rem;
      margin-bottom: 1.25rem;
      font-size: 0.9rem;
      color: #374151;
    }
    .cabin-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
      margin-top: 0.5rem;
      margin-bottom: 1rem;
    }
    .cabin-chip {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #e5e7eb;
      padding: 0.5rem 0.9rem;
      border-radius: 20px;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .cabin-chip:hover { border-color: #9ca3af; color: #000000; }
    .cabin-chip.selected {
      background: #000000;
      border-color: #000000;
      color: #ffffff;
      font-weight: 600;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-group label {
      display: block;
      font-size: 0.85rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 0.4rem;
    }
    .custom-input, .custom-textarea {
      width: 100%;
      background: #ffffff;
      border: 1px solid #d1d5db;
      color: #111827;
      padding: 0.65rem 0.8rem;
      border-radius: 6px;
      outline: none;
      font-size: 0.9rem;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }
    .custom-input:focus, .custom-textarea:focus { border-color: #000000; }

    /* CHECKLIST TABLE */
    .section-hint {
      color: #6b7280;
      font-size: 0.9rem;
      margin-bottom: 1.2rem;
      line-height: 1.5;
    }
    .checklist-table-wrap {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 1.5rem;
    }
    .checklist-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.9rem;
    }
    .checklist-table th {
      background: #f9fafb;
      color: #4b5563;
      padding: 0.8rem 1rem;
      font-weight: 600;
      border-bottom: 1px solid #e5e7eb;
    }
    .checklist-table td {
      padding: 0.8rem 1rem;
      border-bottom: 1px solid #f3f4f6;
      color: #111827;
    }
    .checklist-table tr.bought-row {
      background: #f0fdf4;
    }
    .sku-sub { font-size: 0.75rem; color: #6b7280; }
    .tag-meta {
      background: #f3f4f6;
      color: #374151;
      font-size: 0.75rem;
      padding: 0.2rem 0.45rem;
      border-radius: 4px;
      margin-right: 0.3rem;
    }
    .toggle-decision {
      display: inline-flex;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
    }
    .dec-btn {
      border: none;
      background: transparent;
      color: #6b7280;
      padding: 0.35rem 0.7rem;
      font-size: 0.8rem;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }
    .dec-btn.buy.active {
      background: #059669;
      color: #ffffff;
    }
    .dec-btn.return.active {
      background: #4b5563;
      color: #ffffff;
    }
    .custom-chk {
      width: 18px;
      height: 18px;
      accent-color: #000000;
      cursor: pointer;
    }

    /* SETTLEMENT SUMMARY */
    .settlement-summary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1.25rem;
    }
    .custom-checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      cursor: pointer;
      font-size: 0.9rem;
      color: #111827;
    }
    .totals-box {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      justify-content: center;
      padding-left: 1.5rem;
      border-left: 1px solid #e5e7eb;
    }
    .tot-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.95rem;
      color: #4b5563;
    }
    .tot-row.anticipo { color: #059669; font-weight: 600; }
    .tot-divider {
      height: 1px;
      background: #e5e7eb;
      margin: 0.3rem 0;
    }
    .tot-row.grand-total {
      font-size: 1.15rem;
      font-weight: 700;
      color: #111827;
    }
    .gold-amount {
      color: #000000;
      font-size: 1.3rem;
      font-weight: 700;
      font-family: monospace;
    }

    /* WARNING BOX NO-SHOW */
    .warning-box {
      display: flex;
      gap: 1rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.25rem;
      color: #991b1b;
    }
    .warn-icon { font-size: 1.8rem; }
    .warning-box p { margin: 0.3rem 0 0; font-size: 0.85rem; color: #4b5563; }

    /* FICHA DETALLADA */
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.7rem;
      font-size: 0.9rem;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.2rem;
      color: #111827;
    }
    .qr-preview-box {
      text-align: center;
      padding: 1rem;
      background: #ffffff;
      border: 1px dashed #d1d5db;
      border-radius: 8px;
      display: inline-block;
      width: 100%;
      box-sizing: border-box;
      margin-bottom: 1rem;
    }
    .qr-token-label {
      display: block;
      color: #111827;
      font-family: monospace;
      font-weight: 700;
      margin-top: 0.5rem;
      font-size: 0.9rem;
    }
    .detail-items-list {
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 0.9rem;
    }
    .detail-items-list li {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f3f4f6;
      color: #111827;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: monospace; }
  `]
})
export class ReservasGestionPageComponent implements OnInit {
  private readonly reservasService = inject(ReservasService);
  private readonly inventarioService = inject(InventarioService);
  private readonly sanitizer = inject(DomSanitizer);

  reservas: Reserva[] = [];
  sucursales: Sucursal[] = [];

  sucursalFiltro: number | null = null;
  estadoFiltro: string = 'ALL';
  codigoBusqueda: string = '';
  busquedaActiva: boolean = false;
  loading: boolean = false;

  mensajeExito: string | null = null;
  mensajeError: string | null = null;

  // Modal Asignar Probador
  modalAsignarVisible: boolean = false;
  reservaParaAsignar: Reserva | null = null;
  probadorSeleccionado: string = 'Probador #1';
  observacionAsignar: string = '';
  cabinasDisponibles: string[] = [
    'Probador #1',
    'Probador #2',
    'Probador #3',
    'Cabina VIP Atelier',
    'Suite Presidencial & Novias'
  ];

  // Modal Finalizar Prueba
  modalFinalizarVisible: boolean = false;
  reservaParaFinalizar: Reserva | null = null;
  resultadosChecklist: ItemChecklist[] = [];
  derivarAPos: boolean = true;
  observacionFinalizar: string = '';

  // Modal Expirar
  modalExpirarVisible: boolean = false;
  reservaParaExpirar: Reserva | null = null;
  motivoExpirar: string = 'Cliente no se presentó a su turno en probador';

  // Modal Detalle
  modalDetalleVisible: boolean = false;
  reservaParaDetalle: Reserva | null = null;
  qrSvgSafe: SafeHtml | null = null;

  ngOnInit(): void {
    this.cargarSucursales();
    this.cargarReservas();
  }

  cargarSucursales(): void {
    this.inventarioService.getSucursales().subscribe({
      next: (data) => this.sucursales = data,
      error: (err) => console.error('Error cargando sucursales:', err)
    });
  }

  cargarReservas(): void {
    this.loading = true;
    this.mensajeError = null;
    const est = this.estadoFiltro === 'ALL' ? undefined : this.estadoFiltro;
    const suc = this.sucursalFiltro || undefined;

    this.reservasService.getReservas(suc, est).subscribe({
      next: (data) => {
        this.reservas = data;
        this.loading = false;
        this.busquedaActiva = false;
      },
      error: (err) => {
        this.loading = false;
        this.mensajeError = err.error?.detail || 'Error al consultar las reservas en tienda.';
      }
    });
  }

  buscarPorCodigo(): void {
    if (!this.codigoBusqueda.trim()) return;
    this.loading = true;
    this.mensajeError = null;
    this.reservasService.buscarReservaPorCodigo(this.codigoBusqueda.trim()).subscribe({
      next: (reserva) => {
        this.reservas = [reserva];
        this.loading = false;
        this.busquedaActiva = true;
        this.mensajeExito = 'Pase escaneado correctamente: Reserva encontrada.';
      },
      error: (err) => {
        this.loading = false;
        this.mensajeError = err.error?.detail || `No se encontró ninguna reserva para el código '${this.codigoBusqueda}'.`;
      }
    });
  }

  limpiarBusqueda(): void {
    this.codigoBusqueda = '';
    this.busquedaActiva = false;
    this.cargarReservas();
  }

  filtrarPorEstado(estado: string): void {
    this.estadoFiltro = estado;
    this.cargarReservas();
  }

  get reservasFiltradas(): Reserva[] {
    return this.reservas;
  }

  contarPorEstado(estado: string): number {
    return this.reservas.filter(r => r.estado === estado).length;
  }

  getEstadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'CONFIRMADA': return 'status-confirmada';
      case 'EN_PROBADOR': return 'status-en-probador';
      case 'COMPLETADA': return 'status-completada';
      case 'EXPIRADA': return 'status-expirada';
      case 'CANCELADA': return 'status-cancelada';
      default: return 'status-default';
    }
  }

  // --- ACCIONES MODAL ASIGNAR ---
  abrirModalAsignar(r: Reserva): void {
    this.reservaParaAsignar = r;
    this.probadorSeleccionado = r.probador_asignado || 'Probador #1';
    this.observacionAsignar = '';
    this.modalAsignarVisible = true;
  }

  confirmarAsignarProbador(): void {
    if (!this.reservaParaAsignar || !this.probadorSeleccionado) return;
    this.loading = true;
    const req: AsignarProbadorRequest = {
      probador: this.probadorSeleccionado,
      observaciones: this.observacionAsignar.trim() || undefined
    };

    this.reservasService.asignarProbador(this.reservaParaAsignar.id, req).subscribe({
      next: (updated) => {
        this.loading = false;
        this.mensajeExito = `Cliente ingresó a '${updated.probador_asignado}'. Reserva #${updated.codigo_reserva} en curso.`;
        this.cerrarModales();
        this.cargarReservas();
      },
      error: (err) => {
        this.loading = false;
        this.mensajeError = err.error?.detail || 'Error asignando vestidor físico.';
      }
    });
  }

  // --- ACCIONES MODAL FINALIZAR ---
  abrirModalFinalizar(r: Reserva): void {
    this.reservaParaFinalizar = r;
    this.derivarAPos = true;
    this.observacionFinalizar = '';
    this.resultadosChecklist = r.detalles.map(d => ({
      detalle_id: d.id,
      nombre: d.variante?.prenda?.nombre || 'Prenda de Colección',
      sku: d.variante?.sku_variante || 'SKU-STD',
      talla: d.variante?.talla?.codigo || 'U',
      color: d.variante?.color?.nombre || 'Estándar',
      precio_unitario: Number(d.precio_unitario),
      cantidad: d.cantidad,
      subtotal: Number(d.subtotal),
      probada: true,
      comprada: true
    }));
    this.modalFinalizarVisible = true;
  }

  calcularTotalComprado(): number {
    return this.resultadosChecklist
      .filter(i => i.comprada)
      .reduce((sum, i) => sum + i.subtotal, 0);
  }

  calcularAnticipoAplicado(): number {
    if (!this.reservaParaFinalizar) return 0;
    const total = this.calcularTotalComprado();
    return Math.min(total, Number(this.reservaParaFinalizar.monto_anticipo || 0));
  }

  calcularSaldoRestante(): number {
    const total = this.calcularTotalComprado();
    const anticipo = this.calcularAnticipoAplicado();
    return Math.max(0, total - anticipo);
  }

  confirmarFinalizarPrueba(): void {
    if (!this.reservaParaFinalizar) return;
    this.loading = true;

    const req: FinalizarPruebaRequest = {
      resultados: this.resultadosChecklist.map(item => ({
        detalle_id: item.detalle_id,
        probada: item.probada,
        comprada: item.comprada
      })),
      derivar_a_pos: this.derivarAPos,
      observaciones: this.observacionFinalizar.trim() || undefined
    };

    this.reservasService.finalizarPrueba(this.reservaParaFinalizar.id, req).subscribe({
      next: (updated) => {
        this.loading = false;
        const compradas = this.resultadosChecklist.filter(i => i.comprada).length;
        const devueltas = this.resultadosChecklist.length - compradas;
        this.mensajeExito = `Prueba finalizada para #${updated.codigo_reserva}. ${compradas} prendas adquiridas y ${devueltas} reincorporadas al rack general.`;
        this.cerrarModales();
        this.cargarReservas();
      },
      error: (err) => {
        this.loading = false;
        this.mensajeError = err.error?.detail || 'Error al finalizar la prueba de vestidor.';
      }
    });
  }

  // --- ACCIONES MODAL EXPIRAR ---
  abrirModalExpirar(r: Reserva): void {
    this.reservaParaExpirar = r;
    this.motivoExpirar = 'Cliente no se presentó a su turno en probador';
    this.modalExpirarVisible = true;
  }

  confirmarExpirar(): void {
    if (!this.reservaParaExpirar) return;
    this.loading = true;
    this.reservasService.marcarExpirada(this.reservaParaExpirar.id, this.motivoExpirar).subscribe({
      next: (updated) => {
        this.loading = false;
        this.mensajeExito = `Reserva #${updated.codigo_reserva} marcada como EXPIRADA. Stock 100% liberado al perchero general.`;
        this.cerrarModales();
        this.cargarReservas();
      },
      error: (err) => {
        this.loading = false;
        this.mensajeError = err.error?.detail || 'Error al expirar la reserva.';
      }
    });
  }

  // --- ACCIONES MODAL DETALLE ---
  verDetalle(r: Reserva): void {
    this.reservaParaDetalle = r;
    this.qrSvgSafe = r.qr_svg ? this.sanitizer.bypassSecurityTrustHtml(r.qr_svg) : null;
    this.modalDetalleVisible = true;
  }

  cerrarModales(): void {
    this.modalAsignarVisible = false;
    this.modalFinalizarVisible = false;
    this.modalExpirarVisible = false;
    this.modalDetalleVisible = false;
    this.reservaParaAsignar = null;
    this.reservaParaFinalizar = null;
    this.reservaParaExpirar = null;
    this.reservaParaDetalle = null;
  }
}
