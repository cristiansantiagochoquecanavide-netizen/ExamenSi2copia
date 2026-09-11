import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VentasService } from '../services/ventas.service';
import { CatalogoService } from '../../catalogo/services/catalogo.service';
import { InventarioService } from '../../inventario/services/inventario.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  VentaResponse, VentaPOSCreate, DetalleVentaCreate, PagoCreate
} from '../models/ventas.models';
import { Prenda, PrendaVariante, InventarioStock } from '../../catalogo/models/catalogo.models';
import { Sucursal } from '../../inventario/models/inventario.models';

interface ItemTicket {
  variante_id: number;
  prenda_nombre: string;
  talla_codigo: string;
  color_nombre: string;
  sku: string;
  precio_unitario: number;
  cantidad: number;
  stock_disponible: number;
  subtotal: number;
}

type TabPOS = 'POS' | 'HISTORIAL';

@Component({
  selector: 'app-ventas-pos-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="pos-container">
      <!-- Top Operational Bar -->
      <header class="pos-topbar">
        <div class="topbar-left">
          <div class="pos-badge">
            <span class="gold-dot">&bull;</span>
            <span>PUNTO DE VENTA (POS) &bull; CASO DE USO #10</span>
          </div>
          <h1 class="pos-title">Terminal de Caja</h1>
        </div>

        <div class="topbar-center">
          <div class="branch-selector-box">
            <label class="branch-lbl">SUCURSAL OPERATIVA:</label>
            <select
              class="branch-select"
              [(ngModel)]="sucursalSeleccionadaId"
              (change)="onSucursalChange()"
            >
              @for (s of sucursales(); track s.id) {
                <option [ngValue]="s.id">{{ s.nombre }} ({{ s.ciudad?.nombre || 'Ciudad' }})</option>
              }
            </select>
          </div>
        </div>

        <div class="topbar-right">
          <div class="cashier-info">
            <span class="cashier-role">{{ authService.currentUser()?.rol?.nombre || 'CAJERO' }}</span>
            <span class="cashier-name">{{ authService.currentUser()?.nombre }} {{ authService.currentUser()?.apellido }}</span>
          </div>
          <div class="nav-tabs-switch">
            <button
              type="button"
              class="tab-switch-btn"
              [class.active]="activeTab() === 'POS'"
              (click)="activeTab.set('POS')"
            >
              TERMINAL POS
            </button>
            <button
              type="button"
              class="tab-switch-btn"
              [class.active]="activeTab() === 'HISTORIAL'"
              (click)="activeTab.set('HISTORIAL'); loadHistorialVentas()"
            >
              VENTAS DEL DÍA ({{ ventasDelDia().length }})
            </button>
          </div>
        </div>
      </header>

      <!-- Feedback Banner -->
      @if (feedbackMsg()) {
        <div class="feedback-banner" [class.error]="feedbackIsError()">
          <span>{{ feedbackMsg() }}</span>
          <button type="button" class="btn-close-banner" (click)="feedbackMsg.set(null)">&times;</button>
        </div>
      }

      <!-- ================= 1. TAB: TERMINAL DE COBRO (POS) ================= -->
      @if (activeTab() === 'POS') {
        <div class="pos-grid">
          <!-- LEFT COLUMN: Catálogo Rápido y Existencias Locales -->
          <div class="pos-catalog-panel">
            <div class="panel-header-search">
              <div class="search-input-wrapper">
                <input
                  type="text"
                  class="search-input"
                  placeholder="Buscar por prenda, modelo o SKU..."
                  [(ngModel)]="busquedaTexto"
                />
                @if (busquedaTexto) {
                  <button type="button" class="btn-clear-search" (click)="busquedaTexto = ''">&times;</button>
                }
              </div>

              <!-- Categories Pill Filter -->
              <div class="category-pills">
                <button
                  type="button"
                  class="cat-pill"
                  [class.active]="categoriaFiltroId === null"
                  (click)="categoriaFiltroId = null"
                >
                  TODAS
                </button>
                @for (cat of categorias(); track cat.id) {
                  <button
                    type="button"
                    class="cat-pill"
                    [class.active]="categoriaFiltroId === cat.id"
                    (click)="categoriaFiltroId = cat.id"
                  >
                    {{ cat.nombre }}
                  </button>
                }
              </div>
            </div>

            <!-- Prenda Cards Grid -->
            <div class="catalog-items-grid">
              @for (p of prendasFiltradas(); track p.id) {
                <div class="prenda-card">
                  <div class="prenda-header">
                    <span class="prenda-sku">{{ p.sku }}</span>
                    <span class="prenda-price"><span class="currency">$</span>{{ p.precio_base | number:'1.2-2' }}</span>
                  </div>
                  <h3 class="prenda-name">{{ p.nombre }}</h3>
                  <span class="prenda-cat">{{ p.categoria?.nombre || 'Colección' }}</span>

                  <!-- Variants with Local Stock -->
                  <div class="variants-row">
                    @for (v of p.variantes; track v.id) {
                      @let stock = getStockVariante(v.id);
                      <button
                        type="button"
                        class="variant-btn"
                        [class.out-of-stock]="stock === 0"
                        [disabled]="stock === 0"
                        (click)="agregarAlTicket(p, v, stock)"
                        [title]="stock > 0 ? 'Click para agregar al ticket' : 'Sin existencias en esta tienda'"
                      >
                        <span class="var-badge">{{ v.talla?.codigo }}</span>
                        <span class="var-color">{{ v.color?.nombre }}</span>
                        <span class="var-stock" [class.zero]="stock === 0">
                          {{ stock > 0 ? stock + ' uds' : 'Agotado' }}
                        </span>
                      </button>
                    }
                  </div>
                </div>
              }
              @if (prendasFiltradas().length === 0) {
                <div class="empty-catalog">
                  <p>No se encontraron prendas con existencias para el criterio de búsqueda.</p>
                </div>
              }
            </div>
          </div>

          <!-- RIGHT COLUMN: Caja Registradora & Ticket -->
          <div class="pos-ticket-panel">
            <div class="ticket-header">
              <span class="ticket-eyebrow">TICKET DE COMPRA</span>
              <h2 class="ticket-title">Orden de Venta</h2>
            </div>

            <!-- Customer Identity Box -->
            <div class="customer-section">
              <div class="customer-quick-row">
                <span class="cust-label">DATOS DEL CLIENTE</span>
                <button type="button" class="btn-quick-consumer" (click)="setConsumidorFinal()">
                  Consumidor Final (NIT 0)
                </button>
              </div>
              <div class="customer-fields">
                <input
                  type="text"
                  class="cust-input"
                  placeholder="Nombre / Razón Social"
                  [(ngModel)]="clienteNombre"
                />
                <input
                  type="text"
                  class="cust-input nit-input"
                  placeholder="NIT / CI"
                  [(ngModel)]="clienteNit"
                />
              </div>
            </div>

            <!-- Items List -->
            <div class="ticket-items-list">
              @if (ticketItems.length === 0) {
                <div class="empty-ticket">
                  <span class="ticket-icon">&bull;</span>
                  <p>Ticket vacío. Seleccione prendas del catálogo para iniciar el cobro.</p>
                </div>
              } @else {
                @for (item of ticketItems; track item.variante_id) {
                  <div class="ticket-item-row">
                    <div class="item-info">
                      <div class="item-name">{{ item.prenda_nombre }}</div>
                      <div class="item-sub">
                        Talla: {{ item.talla_codigo }} &bull; {{ item.color_nombre }} &bull; SKU: {{ item.sku }}
                      </div>
                      <div class="item-unit-cost">
                        <span class="currency">$</span>{{ item.precio_unitario | number:'1.2-2' }} c/u
                      </div>
                    </div>

                    <div class="item-qty-controls">
                      <button type="button" class="btn-qty" (click)="cambiarCantidad(item, -1)">&minus;</button>
                      <span class="qty-display">{{ item.cantidad }}</span>
                      <button
                        type="button"
                        class="btn-qty"
                        [disabled]="item.cantidad >= item.stock_disponible"
                        (click)="cambiarCantidad(item, 1)"
                      >
                        &plus;
                      </button>
                    </div>

                    <div class="item-subtotal-side">
                      <span class="item-subtotal-val"><span class="currency">$</span>{{ item.subtotal | number:'1.2-2' }}</span>
                      <button type="button" class="btn-remove-item" (click)="eliminarItem(item)">&times;</button>
                    </div>
                  </div>
                }
              }
            </div>

            <!-- Payment & Totals Section -->
            <div class="ticket-checkout-section">
              <div class="totals-breakdown">
                <div class="total-line">
                  <span>Subtotal:</span>
                  <span><span class="currency">$</span>{{ subtotalTicket() | number:'1.2-2' }}</span>
                </div>
                <div class="total-line discount-line">
                  <span>Descuento ($):</span>
                  <input
                    type="number"
                    min="0"
                    [max]="subtotalTicket()"
                    class="discount-input"
                    [(ngModel)]="descuentoMonto"
                  />
                </div>
                <div class="total-line grand-total">
                  <span>TOTAL A COBRAR:</span>
                  <span class="grand-total-val"><span class="currency">$</span>{{ totalTicket() | number:'1.2-2' }}</span>
                </div>
              </div>

              <!-- Payment Method Selector -->
              <div class="payment-methods-tabs">
                <button
                  type="button"
                  class="pay-tab"
                  [class.active]="metodoPago === 'EFECTIVO'"
                  (click)="metodoPago = 'EFECTIVO'"
                >
                  EFECTIVO
                </button>
                <button
                  type="button"
                  class="pay-tab"
                  [class.active]="metodoPago === 'TARJETA'"
                  (click)="metodoPago = 'TARJETA'"
                >
                  TARJETA / POS
                </button>
                <button
                  type="button"
                  class="pay-tab"
                  [class.active]="metodoPago === 'QR_SIMPLE'"
                  (click)="metodoPago = 'QR_SIMPLE'"
                >
                  QR SIMPLE
                </button>
              </div>

              <!-- Payment Details Dynamic Panel -->
              @if (metodoPago === 'EFECTIVO') {
                <div class="cash-calc-panel">
                  <div class="cash-input-row">
                    <label class="cash-lbl">IMPORTE RECIBIDO ($):</label>
                    <input
                      type="number"
                      class="cash-input"
                      [(ngModel)]="montoEntregado"
                      [placeholder]="totalTicket().toString()"
                    />
                  </div>

                  <div class="quick-cash-chips">
                    <button type="button" class="cash-chip" (click)="montoEntregado = totalTicket()">
                      Exacto
                    </button>
                    <button type="button" class="cash-chip" (click)="montoEntregado = redondearArriba(totalTicket(), 50)">
                      <span class="currency">$</span>{{ redondearArriba(totalTicket(), 50) }}
                    </button>
                    <button type="button" class="cash-chip" (click)="montoEntregado = redondearArriba(totalTicket(), 100)">
                      <span class="currency">$</span>{{ redondearArriba(totalTicket(), 100) }}
                    </button>
                    <button type="button" class="cash-chip" (click)="montoEntregado = redondearArriba(totalTicket(), 500)">
                      <span class="currency">$</span>{{ redondearArriba(totalTicket(), 500) }}
                    </button>
                  </div>

                  <div class="change-calc-row" [class.negative]="cambioVuelto() < 0">
                    <span>{{ cambioVuelto() >= 0 ? 'CAMBIO / VUELTO:' : 'FALTANTE:' }}</span>
                    <span class="change-val">
                      <span class="currency">$</span>{{ Math.abs(cambioVuelto()) | number:'1.2-2' }}
                    </span>
                  </div>
                </div>
              } @else if (metodoPago === 'TARJETA') {
                <div class="card-ref-panel">
                  <label class="cash-lbl">NRO. DE AUTORIZACIÓN / VOUCHER POS FÍSICO:</label>
                  <input
                    type="text"
                    class="form-input"
                    [(ngModel)]="referenciaExterna"
                    placeholder="Ej. AUT-984210"
                  />
                  <span class="card-hint">Procese la tarjeta en la terminal física del banco y digite el código de aprobación.</span>
                </div>
              } @else {
                <div class="qr-panel">
                  <div class="qr-box">
                    <div class="qr-mock">
                      <span class="qr-code-icon">&bull;&bull;&bull;</span>
                      <span class="qr-text">QR BANCARIO GENERADO</span>
                      <span class="qr-amount"><span class="currency">$</span>{{ totalTicket() | number:'1.2-2' }}</span>
                    </div>
                  </div>
                  <span class="card-hint">Pida al cliente escanear el QR desde su aplicación bancaria móvil.</span>
                </div>
              }

              <!-- Submit Button -->
              <button
                type="button"
                class="btn-checkout"
                [disabled]="isSubmitting() || ticketItems.length === 0 || (metodoPago === 'EFECTIVO' && cambioVuelto() < 0)"
                (click)="cobrarTicket()"
              >
                {{ isSubmitting() ? 'PROCESANDO COBRO...' : 'COBRAR & EMITIR TICKET ($' + (totalTicket() | number:'1.2-2') + ')' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ================= 2. TAB: HISTORIAL DE VENTAS DEL DÍA ================= -->
      @if (activeTab() === 'HISTORIAL') {
        <div class="panel-card">
          <div class="panel-header-history">
            <div>
              <h2 class="panel-title">Historial de Ventas del Turno</h2>
              <span class="panel-hint">Registro diario de transacciones para control y arqueo de caja</span>
            </div>
            <div class="history-metrics">
              <div class="metric-pill">
                <span class="m-lbl">VENTAS REALIZADAS:</span>
                <span class="m-val">{{ ventasDelDia().length }}</span>
              </div>
              <div class="metric-pill gold-pill">
                <span class="m-lbl">TOTAL RECAUDADO:</span>
                <span class="m-val"><span class="currency">$</span>{{ totalRecaudadoDia() | number:'1.2-2' }}</span>
              </div>
            </div>
          </div>

          @if (ventasDelDia().length === 0) {
            <div class="empty-state">
              <p>No se han registrado ventas en esta sucursal durante la jornada actual.</p>
            </div>
          } @else {
            <div class="table-responsive">
              <table class="editorial-table">
                <thead>
                  <tr>
                    <th>NRO. TICKET</th>
                    <th>HORA</th>
                    <th>CLIENTE (NIT / CI)</th>
                    <th>FORMA PAGO</th>
                    <th class="text-center">PRENDAS</th>
                    <th class="text-right">TOTAL</th>
                    <th class="text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  @for (v of ventasDelDia(); track v.id) {
                    <tr>
                      <td class="col-code">
                        <span class="code-badge">{{ v.codigo_venta }}</span>
                      </td>
                      <td class="col-time">{{ v.created_at | date:'HH:mm:ss' }}</td>
                      <td>
                        <strong>{{ v.cliente_nombre }}</strong>
                        <span class="sub-nit">NIT: {{ v.cliente_nit }}</span>
                      </td>
                      <td>
                        <span class="pay-badge">{{ v.pagos.length > 0 ? v.pagos[0].metodo_pago : 'POS' }}</span>
                      </td>
                      <td class="text-center">{{ v.detalles.length }} ítems</td>
                      <td class="text-right col-strong">
                        <span class="currency">$</span>{{ v.total | number:'1.2-2' }}
                      </td>
                      <td class="text-right">
                        <button type="button" class="btn-action-view" (click)="verRecibo(v)">
                          Ver Recibo
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- ================= MODAL: TICKET TÉRMICO IMPRIMIBLE ================= -->
      @if (ticketEmitido()) {
        @let rec = ticketEmitido()!;
        <div class="modal-backdrop" (click)="ticketEmitido.set(null)">
          <div class="receipt-dialog" (click)="$event.stopPropagation()">
            <!-- Printable Receipt Paper -->
            <div class="receipt-paper" id="printable-receipt">
              <div class="receipt-brand">
                <h2 class="receipt-logo">FASHIONSTORE</h2>
                <span class="receipt-atelier">ATELIER NOIR &bull; COUTURE</span>
                <span class="receipt-sub">SUCURSAL: {{ rec.sucursal?.nombre || 'Tienda' }}</span>
                <span class="receipt-addr">{{ rec.sucursal?.direccion || 'Av. Principal' }} &bull; Bolivia</span>
              </div>

              <div class="receipt-divider">================================</div>

              <div class="receipt-meta">
                <div><strong>TICKET:</strong> {{ rec.codigo_venta }}</div>
                <div><strong>FECHA:</strong> {{ rec.created_at | date:'dd/MM/yyyy HH:mm:ss' }}</div>
                <div><strong>CAJERO:</strong> {{ rec.cajero?.nombre }} {{ rec.cajero?.apellido }}</div>
                <div><strong>CLIENTE:</strong> {{ rec.cliente_nombre }}</div>
                <div><strong>NIT/CI:</strong> {{ rec.cliente_nit }}</div>
              </div>

              <div class="receipt-divider">--------------------------------</div>

              <table class="receipt-items-table">
                <thead>
                  <tr>
                    <th align="left">DESCRIPCIÓN</th>
                    <th align="center">CANT</th>
                    <th align="right">SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  @for (d of rec.detalles; track d.id) {
                    <tr>
                      <td>
                        <div>{{ d.variante?.prenda?.nombre || 'Prenda' }}</div>
                        <div class="receipt-item-sub">Talla {{ d.variante?.talla?.codigo }} &bull; {{ d.variante?.color?.nombre }}</div>
                      </td>
                      <td align="center">{{ d.cantidad }}</td>
                      <td align="right"><span class="currency">$</span>{{ d.subtotal | number:'1.2-2' }}</td>
                    </tr>
                  }
                </tbody>
              </table>

              <div class="receipt-divider">--------------------------------</div>

              <div class="receipt-totals">
                <div class="rec-total-row">
                  <span>SUBTOTAL:</span>
                  <span><span class="currency">$</span>{{ rec.subtotal | number:'1.2-2' }}</span>
                </div>
                @if (rec.descuento > 0) {
                  <div class="rec-total-row">
                    <span>DESCUENTO:</span>
                    <span>-<span class="currency">$</span>{{ rec.descuento | number:'1.2-2' }}</span>
                  </div>
                }
                <div class="rec-total-row rec-grand-total">
                  <span>TOTAL FACTURADO:</span>
                  <span><span class="currency">$</span>{{ rec.total | number:'1.2-2' }}</span>
                </div>
                <div class="rec-total-row">
                  <span>MÉTODO DE PAGO:</span>
                  <span>{{ rec.pagos.length > 0 ? rec.pagos[0].metodo_pago : 'EFECTIVO' }}</span>
                </div>
              </div>

              <div class="receipt-divider">================================</div>

              <div class="receipt-footer">
                <p>GRACIAS POR SU PREFERENCIA</p>
                <p class="receipt-legal">Comprobante de venta presencial emitido en mostrador. Válido para cambios dentro de los 30 días con prenda sin uso y etiquetas intactas.</p>
              </div>
            </div>

            <!-- Receipt Actions -->
            <div class="receipt-actions">
              <button type="button" class="btn-print" (click)="imprimirTicket()">
                IMPRIMIR COMPROBANTE
              </button>
              <button type="button" class="btn-new-sale" (click)="nuevaVentaTrasRecibo()">
                NUEVA VENTA
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .pos-container {
      padding: 1.5rem 2rem;
      max-width: 1550px;
      margin: 0 auto;
      color: #ffffff;
      min-height: calc(100vh - 70px);
    }

    /* Top Operational Bar */
    .pos-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
      padding-bottom: 1.25rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid #1f1f1f;
    }

    .pos-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: #d4af37;
      text-transform: uppercase;
      margin-bottom: 0.25rem;
    }

    .gold-dot { color: #d4af37; }

    .pos-title {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.8rem;
      font-weight: 600;
      margin: 0;
      color: #ffffff;
    }

    .branch-selector-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #0f0f0f;
      border: 1px solid #292929;
      padding: 0.5rem 1rem;
    }

    .branch-lbl {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #888888;
    }

    .branch-select {
      background: #141414;
      border: 1px solid #333333;
      color: #d4af37;
      font-weight: 600;
      font-size: 0.85rem;
      padding: 0.35rem 0.75rem;
      outline: none;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .cashier-info {
      text-align: right;
    }

    .cashier-role {
      display: block;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: #ffaa33;
    }

    .cashier-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: #ffffff;
    }

    .nav-tabs-switch {
      display: flex;
      gap: 0.5rem;
      background: #0f0f0f;
      padding: 0.25rem;
      border: 1px solid #222222;
    }

    .tab-switch-btn {
      background: transparent;
      border: none;
      color: #888888;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      padding: 0.5rem 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab-switch-btn.active {
      background: #d4af37;
      color: #000000;
    }

    /* POS Main 2-Column Grid */
    .pos-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 1.5rem;
      align-items: start;
    }

    /* Left Panel: Catalog */
    .pos-catalog-panel {
      background: #080808;
      border: 1px solid #1a1a1a;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .panel-header-search {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .search-input-wrapper {
      position: relative;
    }

    .search-input {
      width: 100%;
      background: #111111;
      border: 1px solid #282828;
      color: #ffffff;
      padding: 0.75rem 1rem;
      font-size: 0.9rem;
      outline: none;
      box-sizing: border-box;
    }

    .search-input:focus {
      border-color: #d4af37;
    }

    .btn-clear-search {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: #888888;
      font-size: 1.25rem;
      cursor: pointer;
    }

    .category-pills {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      padding-bottom: 0.25rem;
    }

    .cat-pill {
      background: #121212;
      border: 1px solid #222222;
      color: #888888;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      padding: 0.35rem 0.75rem;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }

    .cat-pill.active {
      background: #1e190a;
      border-color: #d4af37;
      color: #d4af37;
    }

    .catalog-items-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1rem;
      max-height: calc(100vh - 270px);
      overflow-y: auto;
      padding-right: 0.25rem;
    }

    .prenda-card {
      background: #0f0f0f;
      border: 1px solid #202020;
      padding: 1.15rem;
      display: flex;
      flex-direction: column;
      transition: border-color 0.2s;
    }

    .prenda-card:hover {
      border-color: #333333;
    }

    .prenda-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.4rem;
    }

    .prenda-sku {
      font-size: 0.7rem;
      color: #777777;
      font-family: monospace;
    }

    .prenda-price {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.1rem;
      font-weight: 600;
      color: #d4af37;
    }

    .prenda-name {
      font-size: 0.95rem;
      font-weight: 600;
      margin: 0 0 0.2rem 0;
      color: #ffffff;
      line-height: 1.3;
    }

    .prenda-cat {
      font-size: 0.72rem;
      color: #888888;
      margin-bottom: 0.85rem;
    }

    .variants-row {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      margin-top: auto;
    }

    .variant-btn {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #141414;
      border: 1px solid #262626;
      color: #cccccc;
      padding: 0.45rem 0.75rem;
      font-size: 0.78rem;
      cursor: pointer;
      transition: all 0.15s;
    }

    .variant-btn:hover:not(:disabled) {
      background: #1f1b0a;
      border-color: #d4af37;
      color: #ffffff;
    }

    .variant-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      border-color: #1a1a1a;
    }

    .var-badge {
      font-weight: 700;
      color: #d4af37;
    }

    .var-color {
      font-size: 0.72rem;
      color: #888888;
    }

    .var-stock {
      font-size: 0.7rem;
      font-weight: 700;
      color: #44dd88;
    }

    .var-stock.zero {
      color: #ff5555;
    }

    .empty-catalog {
      grid-column: 1 / -1;
      text-align: center;
      padding: 3rem 1rem;
      color: #666666;
    }

    /* Right Panel: Ticket & Register */
    .pos-ticket-panel {
      background: #0a0a0a;
      border: 1px solid #262626;
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 120px);
    }

    .ticket-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #1a1a1a;
      background: #0e0e0e;
    }

    .ticket-eyebrow {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: #d4af37;
      text-transform: uppercase;
    }

    .ticket-title {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.4rem;
      font-weight: 600;
      margin: 0.2rem 0 0 0;
      color: #ffffff;
    }

    /* Customer Section */
    .customer-section {
      padding: 1rem 1.5rem;
      background: #121212;
      border-bottom: 1px solid #1a1a1a;
    }

    .customer-quick-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .cust-label {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #888888;
    }

    .btn-quick-consumer {
      background: transparent;
      border: 1px solid #333333;
      color: #d4af37;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      cursor: pointer;
    }

    .customer-fields {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 0.5rem;
    }

    .cust-input {
      background: #0a0a0a;
      border: 1px solid #2a2a2a;
      color: #ffffff;
      padding: 0.45rem 0.65rem;
      font-size: 0.8rem;
      outline: none;
    }

    .cust-input:focus {
      border-color: #d4af37;
    }

    /* Ticket Items List */
    .ticket-items-list {
      flex: 1;
      overflow-y: auto;
      padding: 1rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-height: 200px;
    }

    .empty-ticket {
      text-align: center;
      padding: 3rem 1rem;
      color: #555555;
    }

    .ticket-icon {
      font-size: 2rem;
      color: #333333;
    }

    .ticket-item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      background: #101010;
      border: 1px solid #1d1d1d;
      padding: 0.75rem 1rem;
    }

    .item-info {
      flex: 1;
    }

    .item-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: #ffffff;
    }

    .item-sub {
      font-size: 0.72rem;
      color: #777777;
      margin: 0.15rem 0;
    }

    .item-unit-cost {
      font-size: 0.75rem;
      color: #d4af37;
      font-weight: 500;
    }

    .item-qty-controls {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .btn-qty {
      background: #1a1a1a;
      border: 1px solid #333333;
      color: #ffffff;
      width: 26px;
      height: 26px;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-qty:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .qty-display {
      font-weight: 700;
      font-size: 0.85rem;
      width: 24px;
      text-align: center;
    }

    .item-subtotal-side {
      text-align: right;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .item-subtotal-val {
      font-family: 'Bodoni Moda', serif;
      font-size: 1rem;
      font-weight: 600;
      color: #ffffff;
    }

    .btn-remove-item {
      background: transparent;
      border: none;
      color: #ff5555;
      font-size: 1.25rem;
      cursor: pointer;
    }

    /* Checkout & Totals */
    .ticket-checkout-section {
      background: #0d0d0d;
      border-top: 1px solid #1f1f1f;
      padding: 1.25rem 1.5rem;
    }

    .totals-breakdown {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      margin-bottom: 1rem;
    }

    .total-line {
      display: flex;
      justify-content: space-between;
      font-size: 0.82rem;
      color: #aaaaaa;
    }

    .discount-line {
      align-items: center;
    }

    .discount-input {
      width: 80px;
      background: #141414;
      border: 1px solid #333333;
      color: #ffaa33;
      padding: 0.25rem 0.5rem;
      text-align: right;
      font-weight: 700;
      font-size: 0.82rem;
    }

    .grand-total {
      padding-top: 0.5rem;
      border-top: 1px solid #222222;
      font-size: 0.95rem;
      font-weight: 700;
      color: #ffffff;
      align-items: baseline;
    }

    .grand-total-val {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.6rem;
      font-weight: 600;
      color: #d4af37;
    }

    /* Payment Tabs */
    .payment-methods-tabs {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.4rem;
      margin-bottom: 1rem;
    }

    .pay-tab {
      background: #141414;
      border: 1px solid #262626;
      color: #888888;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      padding: 0.6rem 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .pay-tab.active {
      background: #1c1708;
      border-color: #d4af37;
      color: #d4af37;
    }

    .cash-calc-panel {
      background: #121212;
      border: 1px solid #222222;
      padding: 0.85rem;
      margin-bottom: 1rem;
    }

    .cash-input-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.6rem;
    }

    .cash-lbl {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #aaaaaa;
    }

    .cash-input {
      width: 110px;
      background: #080808;
      border: 1px solid #333333;
      color: #44dd88;
      font-family: 'Bodoni Moda', serif;
      font-size: 1.1rem;
      font-weight: 600;
      padding: 0.35rem 0.65rem;
      text-align: right;
    }

    .quick-cash-chips {
      display: flex;
      gap: 0.35rem;
      margin-bottom: 0.6rem;
    }

    .cash-chip {
      background: #1a1a1a;
      border: 1px solid #2d2d2d;
      color: #dcdcdc;
      font-size: 0.68rem;
      padding: 0.3rem 0.5rem;
      cursor: pointer;
    }

    .cash-chip:hover {
      border-color: #d4af37;
      color: #d4af37;
    }

    .change-calc-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.5rem;
      border-top: 1px solid #202020;
      font-size: 0.8rem;
      font-weight: 700;
      color: #44dd88;
    }

    .change-calc-row.negative {
      color: #ff5555;
    }

    .change-val {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.2rem;
    }

    .card-ref-panel {
      background: #121212;
      border: 1px solid #222222;
      padding: 0.85rem;
      margin-bottom: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .form-input {
      background: #080808;
      border: 1px solid #333333;
      color: #ffffff;
      padding: 0.5rem 0.75rem;
      font-size: 0.82rem;
    }

    .card-hint {
      font-size: 0.68rem;
      color: #777777;
    }

    .qr-panel {
      background: #121212;
      border: 1px solid #222222;
      padding: 0.85rem;
      margin-bottom: 1rem;
      text-align: center;
    }

    .qr-box {
      display: flex;
      justify-content: center;
      margin-bottom: 0.5rem;
    }

    .qr-mock {
      width: 140px;
      height: 140px;
      background: #ffffff;
      color: #000000;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 0.5rem;
    }

    .qr-code-icon {
      font-size: 2rem;
      letter-spacing: 0.3em;
    }

    .qr-text {
      font-size: 0.65rem;
      font-weight: 700;
    }

    .qr-amount {
      font-size: 0.85rem;
      font-weight: 700;
      color: #000000;
    }

    .btn-checkout {
      width: 100%;
      background: #d4af37;
      border: 1px solid #d4af37;
      color: #000000;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      padding: 0.95rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-checkout:hover:not(:disabled) {
      background: #f0c742;
      border-color: #f0c742;
    }

    .btn-checkout:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* History Tab */
    .panel-card {
      background: #080808;
      border: 1px solid #1a1a1a;
      padding: 2rem;
    }

    .panel-header-history {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 1.5rem;
    }

    .panel-title {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.5rem;
      margin: 0 0 0.25rem 0;
    }

    .panel-hint {
      font-size: 0.8rem;
      color: #777777;
    }

    .history-metrics {
      display: flex;
      gap: 1rem;
    }

    .metric-pill {
      background: #111111;
      border: 1px solid #222222;
      padding: 0.6rem 1rem;
      display: flex;
      flex-direction: column;
    }

    .gold-pill .m-val {
      color: #d4af37;
    }

    .m-lbl {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #888888;
    }

    .m-val {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.3rem;
      font-weight: 600;
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
      color: #888888;
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #222222;
      background: #0f0f0f;
    }

    .editorial-table td {
      padding: 0.9rem 1rem;
      border-bottom: 1px solid #171717;
      vertical-align: middle;
    }

    .code-badge {
      font-family: monospace;
      font-size: 0.8rem;
      font-weight: 700;
      color: #d4af37;
      background: #1a1608;
      padding: 0.2rem 0.5rem;
      border: 1px solid #3d320e;
    }

    .col-time {
      color: #888888;
      font-size: 0.8rem;
    }

    .sub-nit {
      display: block;
      font-size: 0.72rem;
      color: #777777;
    }

    .pay-badge {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      background: #141414;
      border: 1px solid #2a2a2a;
      color: #ffaa33;
    }

    .btn-action-view {
      background: transparent;
      border: 1px solid #333333;
      color: #dcdcdc;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.35rem 0.65rem;
      cursor: pointer;
    }

    .btn-action-view:hover {
      border-color: #d4af37;
      color: #d4af37;
    }

    /* Modal Backdrop & Receipt Thermal View */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 1.5rem;
    }

    .receipt-dialog {
      background: #141414;
      border: 1px solid #333333;
      padding: 1.5rem;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.9);
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .receipt-paper {
      background: #fbfbfb;
      color: #111111;
      padding: 1.5rem;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.8rem;
      line-height: 1.4;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    }

    .receipt-brand {
      text-align: center;
      margin-bottom: 0.5rem;
    }

    .receipt-logo {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.3rem;
      font-weight: 700;
      margin: 0;
      letter-spacing: 0.05em;
    }

    .receipt-atelier {
      display: block;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.15em;
    }

    .receipt-sub, .receipt-addr {
      display: block;
      font-size: 0.68rem;
      color: #444444;
    }

    .receipt-divider {
      text-align: center;
      margin: 0.4rem 0;
      font-size: 0.75rem;
    }

    .receipt-meta {
      font-size: 0.72rem;
    }

    .receipt-items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.72rem;
      margin: 0.4rem 0;
    }

    .receipt-items-table th {
      border-bottom: 1px dashed #333333;
      padding: 0.2rem 0;
    }

    .receipt-items-table td {
      padding: 0.35rem 0;
      vertical-align: top;
    }

    .receipt-item-sub {
      font-size: 0.65rem;
      color: #666666;
    }

    .receipt-totals {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      font-size: 0.75rem;
    }

    .rec-total-row {
      display: flex;
      justify-content: space-between;
    }

    .rec-grand-total {
      font-weight: 700;
      font-size: 0.95rem;
      border-top: 1px solid #111111;
      border-bottom: 1px solid #111111;
      padding: 0.3rem 0;
      margin: 0.3rem 0;
    }

    .receipt-footer {
      text-align: center;
      font-size: 0.7rem;
      margin-top: 0.5rem;
    }

    .receipt-legal {
      font-size: 0.6rem;
      color: #555555;
      margin: 0;
    }

    .receipt-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-print {
      flex: 1;
      background: #d4af37;
      border: 1px solid #d4af37;
      color: #000000;
      font-weight: 700;
      font-size: 0.75rem;
      padding: 0.65rem;
      cursor: pointer;
    }

    .btn-new-sale {
      flex: 1;
      background: #222222;
      border: 1px solid #444444;
      color: #ffffff;
      font-weight: 700;
      font-size: 0.75rem;
      padding: 0.65rem;
      cursor: pointer;
    }

    .feedback-banner {
      background: #072614;
      border: 1px solid #1aa355;
      color: #7affb0;
      padding: 0.75rem 1.25rem;
      margin-bottom: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
    }

    .feedback-banner.error {
      background: #2b0808;
      border-color: #aa1111;
      color: #ff7a7a;
    }

    .btn-close-banner {
      background: transparent;
      border: none;
      color: inherit;
      font-size: 1.25rem;
      cursor: pointer;
    }

    .empty-state {
      text-align: center;
      padding: 2.5rem;
      color: #666666;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .col-strong { font-weight: 700; color: #ffffff; }
  `]
})
export class VentasPosPageComponent implements OnInit {
  private readonly ventasService = inject(VentasService);
  private readonly catalogoService = inject(CatalogoService);
  private readonly inventarioService = inject(InventarioService);
  readonly authService = inject(AuthService);

  readonly Math = Math;

  // View state
  readonly activeTab = signal<TabPOS>('POS');
  readonly sucursales = signal<Sucursal[]>([]);
  readonly prendas = signal<Prenda[]>([]);
  readonly stockSucursal = signal<InventarioStock[]>([]);
  readonly ventasDelDia = signal<VentaResponse[]>([]);

  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly feedbackMsg = signal<string | null>(null);
  readonly feedbackIsError = signal(false);

  // Filters
  sucursalSeleccionadaId: number = 0;
  busquedaTexto: string = '';
  categoriaFiltroId: number | null = null;

  // POS Ticket & Cart
  ticketItems: ItemTicket[] = [];
  clienteNombre: string = 'Consumidor Final';
  clienteNit: string = '0';
  descuentoMonto: number = 0;

  // Payment
  metodoPago: 'EFECTIVO' | 'TARJETA' | 'QR_SIMPLE' = 'EFECTIVO';
  montoEntregado: number = 0;
  referenciaExterna: string = '';

  // Completed Receipt Modal
  readonly ticketEmitido = signal<VentaResponse | null>(null);

  // Computeds
  readonly categorias = computed(() => {
    const catsMap = new Map<number, { id: number; nombre: string }>();
    for (const p of this.prendas()) {
      if (p.categoria) {
        catsMap.set(p.categoria.id, { id: p.categoria.id, nombre: p.categoria.nombre });
      }
    }
    return Array.from(catsMap.values());
  });

  readonly prendasFiltradas = computed(() => {
    const q = this.busquedaTexto.toLowerCase().trim();
    return this.prendas().filter(p => {
      const matchCat = this.categoriaFiltroId === null || p.categoria_id === this.categoriaFiltroId;
      const matchText = !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.variantes.some(v => v.sku_variante.toLowerCase().includes(q));
      return matchCat && matchText;
    });
  });

  readonly subtotalTicket = computed(() =>
    this.ticketItems.reduce((acc, it) => acc + (it.subtotal || 0), 0)
  );

  readonly totalTicket = computed(() => {
    const sub = this.subtotalTicket();
    const desc = Math.min(this.descuentoMonto || 0, sub);
    return Math.max(0, sub - desc);
  });

  readonly cambioVuelto = computed(() => {
    if (this.metodoPago !== 'EFECTIVO') return 0;
    const pagado = this.montoEntregado || this.totalTicket();
    return pagado - this.totalTicket();
  });

  readonly totalRecaudadoDia = computed(() =>
    this.ventasDelDia().reduce((acc, v) => acc + (v.total || 0), 0)
  );

  ngOnInit(): void {
    this.loadCatalogAndBranches();
  }

  loadCatalogAndBranches(): void {
    this.isLoading.set(true);
    this.inventarioService.getSucursales().subscribe({
      next: (sucs) => {
        this.sucursales.set(sucs);
        // Si el cajero tiene sucursal asignada, usarla
        const userSuc = this.authService.currentUser()?.sucursal_id;
        if (userSuc && sucs.some(s => s.id === userSuc)) {
          this.sucursalSeleccionadaId = userSuc;
        } else if (sucs.length > 0) {
          this.sucursalSeleccionadaId = sucs[0].id;
        }
        this.loadStockActual();
      }
    });

    this.catalogoService.getPrendas().subscribe({
      next: (data) => this.prendas.set(data)
    });
  }

  loadStockActual(): void {
    if (!this.sucursalSeleccionadaId) return;
    this.catalogoService.getStockPorSucursal(this.sucursalSeleccionadaId).subscribe({
      next: (stks) => {
        this.stockSucursal.set(stks);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onSucursalChange(): void {
    this.ticketItems = [];
    this.loadStockActual();
  }

  getStockVariante(varianteId: number): number {
    const item = this.stockSucursal().find(s => s.variante_id === varianteId);
    return item ? item.cantidad_disponible : 0;
  }

  agregarAlTicket(prenda: Prenda, variante: PrendaVariante, stock: number): void {
    if (stock <= 0) {
      this.showFeedback('No hay existencias disponibles en esta sucursal.', true);
      return;
    }

    const existing = this.ticketItems.find(it => it.variante_id === variante.id);
    if (existing) {
      if (existing.cantidad < stock) {
        existing.cantidad++;
        existing.subtotal = existing.cantidad * existing.precio_unitario;
      } else {
        this.showFeedback(`No puede agregar más de las ${stock} unidades disponibles en inventario.`, true);
      }
    } else {
      this.ticketItems.push({
        variante_id: variante.id,
        prenda_nombre: prenda.nombre,
        talla_codigo: variante.talla?.codigo || 'U',
        color_nombre: variante.color?.nombre || 'Único',
        sku: variante.sku_variante,
        precio_unitario: prenda.precio_base,
        cantidad: 1,
        stock_disponible: stock,
        subtotal: prenda.precio_base
      });
    }
    this.montoEntregado = this.totalTicket();
  }

  cambiarCantidad(item: ItemTicket, delta: number): void {
    const nuevaCant = item.cantidad + delta;
    if (nuevaCant <= 0) {
      this.eliminarItem(item);
    } else if (nuevaCant <= item.stock_disponible) {
      item.cantidad = nuevaCant;
      item.subtotal = item.cantidad * item.precio_unitario;
      this.montoEntregado = this.totalTicket();
    } else {
      this.showFeedback(`Cantidad máxima disponible en tienda: ${item.stock_disponible} unidades.`, true);
    }
  }

  eliminarItem(item: ItemTicket): void {
    this.ticketItems = this.ticketItems.filter(it => it.variante_id !== item.variante_id);
    this.montoEntregado = this.totalTicket();
  }

  setConsumidorFinal(): void {
    this.clienteNombre = 'Consumidor Final';
    this.clienteNit = '0';
  }

  redondearArriba(monto: number, multiplo: number): number {
    return Math.ceil(monto / multiplo) * multiplo;
  }

  cobrarTicket(): void {
    if (this.ticketItems.length === 0) {
      this.showFeedback('Agregue al menos una prenda al ticket antes de cobrar.', true);
      return;
    }

    if (this.metodoPago === 'EFECTIVO' && this.cambioVuelto() < 0) {
      this.showFeedback('El importe entregado en efectivo es insuficiente para cubrir la venta.', true);
      return;
    }

    const detallesPayload: DetalleVentaCreate[] = this.ticketItems.map(it => ({
      variante_id: it.variante_id,
      cantidad: it.cantidad,
      precio_unitario: it.precio_unitario
    }));

    const pagoPayload: PagoCreate = {
      metodo_pago: this.metodoPago,
      monto: this.totalTicket(),
      monto_entregado: this.metodoPago === 'EFECTIVO' ? (this.montoEntregado || this.totalTicket()) : undefined,
      transaccion_externa_id: this.metodoPago === 'TARJETA' ? this.referenciaExterna : undefined
    };

    const payload: VentaPOSCreate = {
      sucursal_id: this.sucursalSeleccionadaId,
      cliente_nombre: this.clienteNombre.trim() || 'Consumidor Final',
      cliente_nit: this.clienteNit.trim() || '0',
      descuento: this.descuentoMonto,
      detalles: detallesPayload,
      pago: pagoPayload
    };

    this.isSubmitting.set(true);
    this.ventasService.registrarVentaPOS(payload).subscribe({
      next: (venta) => {
        this.isSubmitting.set(false);
        this.ticketEmitido.set(venta);
        this.showFeedback(`Venta #${venta.codigo_venta} cobrada exitosamente ($${venta.total}). Stock actualizado en Kardex.`);
        // Refrescar stock de la sucursal
        this.loadStockActual();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showFeedback(err.error?.detail || 'Error al procesar la venta en caja.', true);
      }
    });
  }

  nuevaVentaTrasRecibo(): void {
    this.ticketEmitido.set(null);
    this.ticketItems = [];
    this.descuentoMonto = 0;
    this.montoEntregado = 0;
    this.referenciaExterna = '';
    this.setConsumidorFinal();
  }

  imprimirTicket(): void {
    window.print();
  }

  loadHistorialVentas(): void {
    if (!this.sucursalSeleccionadaId) return;
    this.ventasService.getVentas(this.sucursalSeleccionadaId).subscribe({
      next: (data) => this.ventasDelDia.set(data),
      error: () => {}
    });
  }

  verRecibo(v: VentaResponse): void {
    this.ticketEmitido.set(v);
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
