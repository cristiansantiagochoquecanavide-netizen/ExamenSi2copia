// ==============================================================================
// CASOS DE USO:
// - CU18: CONFIGURAR POLÍTICAS Y PLAZOS DE CAMBIO DE PRENDA
// - CU19: REGISTRAR SOLICITUD DE CAMBIO DE PRENDA POR MEDIDA
// - CU20: EMITIR NOTA DE DEVOLUCIÓN Y REINGRESO A INVENTARIO
// ROL: Cliente / Cajero / Admin Tenant
// CAPA MVC: [VISTA & VIEWCONTROLLER ANGULAR]
// ==============================================================================

// ==============================================================================
// CASOS DE USO:
// - CU18: CONFIGURAR POLÍTICAS Y PLAZOS DE CAMBIO DE PRENDA
// - CU19: REGISTRAR SOLICITUD DE CAMBIO DE PRENDA POR MEDIDA
// - CU20: EMITIR NOTA DE DEVOLUCIÓN Y REINGRESO A INVENTARIO
// ROL: Cliente / Cajero / Admin Tenant
// CAPA MVC: [VISTA & VIEWCONTROLLER ANGULAR]
// ==============================================================================

import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VentasService } from '../services/ventas.service';
import { CatalogoService } from '../../catalogo/services/catalogo.service';
import { InventarioService } from '../../inventario/services/inventario.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  VentaParaDevolucionResponse, VentaParaDevolucionItem,
  DevolucionCreate, DetalleDevolucionCreate, DevolucionResponse, VentaResponse,
  ValidarCambioGarantiaResponse, NotaDevolucionFormalCreate, NotaDevolucionFormalResponse,
  ConflictoInventarioResponse, ResolverConflictoRequest
} from '../models/ventas.models';
import { Prenda, PrendaVariante } from '../../catalogo/models/catalogo.models';
import { Sucursal } from '../../inventario/models/inventario.models';

interface ItemDevolucionRow {
  item: VentaParaDevolucionItem;
  cantidadDevolver: number;
  condicion: 'APTO_PARA_VENTA' | 'DEFECTUOSO_MERMA';
  varianteCambioId?: number | null;
  varianteCambioObj?: PrendaVariante | null;
  cantidadCambio: number;
  precioCambio: number;
}

@Component({
  selector: 'app-devoluciones-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="devoluciones-container">
      <!-- HEADER HERO -->
      <div class="hero-header">
        <div class="hero-titles">
          <span class="luxury-badge">ATELIER NOIR &bull; SERVICIO POSVENTA</span>
          <h1 class="page-title">Gestión de Devoluciones y Cambios</h1>
          <p class="subtitle">
            Reintegro automatizado al stock local, cambios de talla/modelo y emisión de comprobantes de ajuste
          </p>
        </div>

        <div class="branch-selector-card">
          <span class="branch-label">SUCURSAL OPERATIVA:</span>
          <select class="select-luxury" [ngModel]="sucursalSeleccionadaId()" (ngModelChange)="onSucursalChange($event)">
            @for (s of sucursales(); track s.id) {
              <option [value]="s.id">{{ s.nombre }} ({{ s.ciudad?.nombre || 'Ciudad' }})</option>
            }
          </select>
        </div>
      </div>

      <!-- TABS NAVEGACIÓN (PRESENTACIÓN 2: CU16-CU20) -->
      <div class="tabs-bar">
        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'nueva'"
          (click)="tabActiva.set('nueva')">
          <span class="tab-dot">&bull;</span> NUEVA NOTA DE DEVOLUCIÓN (CU19 / CU20)
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'historial'"
          (click)="cargarHistorial(); tabActiva.set('historial')">
          <span class="tab-dot">&bull;</span> NOTAS EMITIDAS DEV-YYYY ({{ historialNotas().length }})
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'conflictos'"
          (click)="cargarConflictos(); tabActiva.set('conflictos')">
          <span class="tab-dot">&bull;</span> CONFLICTOS DE INVENTARIO (CU17)
          @if (conflictosPendientesCount() > 0) {
            <span class="conflicts-badge">{{ conflictosPendientesCount() }}</span>
          }
        </button>
      </div>

      <!-- TAB 1: NUEVA OPERACIÓN -->
      @if (tabActiva() === 'nueva') {
        <div class="tab-content-grid">
          <!-- PANEL IZQUIERDO: BÚSQUEDA Y CONFIGURACIÓN -->
          <div class="main-column">
            <!-- CAJA DE BÚSQUEDA DE TICKET -->
            <div class="card-noir search-card">
              <h3 class="card-title">1. Localizar Ticket o Factura Original</h3>
              <p class="card-desc">Ingrese el código de la venta emitido por caja para validar prendas elegibles</p>

              <div class="search-input-group">
                <input
                  type="text"
                  class="input-luxury"
                  placeholder="Ej: VTA-20260911202744-2"
                  [(ngModel)]="codigoBusqueda"
                  (keyup.enter)="buscarTicket()" />
                <button
                  type="button"
                  class="btn-gold"
                  [disabled]="buscando() || !codigoBusqueda.trim()"
                  (click)="buscarTicket()">
                  {{ buscando() ? 'Buscando...' : 'Buscar Ticket' }}
                </button>
              </div>

              <!-- VENTAS RECIENTES PARA ACCESO RÁPIDO -->
              @if (ventasRecientes().length > 0) {
                <div class="quick-fill-zone">
                  <span class="quick-label">Ventas recientes en sucursal:</span>
                  <div class="quick-tags">
                    @for (v of ventasRecientes(); track v.id) {
                      <button
                        type="button"
                        class="btn-tag"
                        (click)="cargarVentaRapida(v.codigo_venta)">
                        {{ v.codigo_venta }} ({{ v.cliente_nombre }})
                      </button>
                    }
                  </div>
                </div>
              }

              @if (errorBusqueda()) {
                <div class="alert-error">
                  <span class="error-icon">&times;</span>
                  <span>{{ errorBusqueda() }}</span>
                </div>
              }
            </div>

            <!-- FICHA DE LA VENTA ENCONTRADA -->
            @if (ventaCargada(); as v) {
              <div class="card-noir ticket-info-card">
                <div class="ticket-header-flex">
                  <div>
                    <span class="ticket-status-badge">{{ v.estado }}</span>
                    <h3 class="ticket-code">{{ v.codigo_venta }}</h3>
                    <p class="ticket-meta">
                      Fecha: <strong>{{ v.fecha | date:'dd/MM/yyyy HH:mm' }}</strong> &bull;
                      Sucursal: <strong>{{ v.sucursal_nombre }}</strong> &bull;
                      Cajero: <strong>{{ v.cajero_nombre }}</strong>
                    </p>
                  </div>
                  <div class="ticket-customer-box">
                    <span class="cust-label">CLIENTE:</span>
                    <span class="cust-name">{{ v.cliente_nombre }}</span>
                    <span class="cust-nit">NIT: {{ v.cliente_nit }}</span>
                  </div>
                </div>

                <!-- CU19: BANNER DE VIGENCIA DE GARANTÍA (RN06) & REGLA RN07 -->
                @if (garantiaInfo(); as g) {
                  <div class="garantia-banner-card" [class.garantia-vencida]="!g.garantia_vigente" [class.garantia-aprobada]="g.garantia_vigente">
                    <div class="garantia-icon">{{ g.garantia_vigente ? '🛡️' : '⚠️' }}</div>
                    <div class="garantia-info">
                      <div class="garantia-header-flex">
                        <span class="garantia-title">
                          {{ g.garantia_vigente ? 'GARANTÍA VIGENTE (CU19 / RN06)' : 'PLAZO DE GARANTÍA EXPIRADO (RN06)' }}
                        </span>
                        <span class="garantia-badge-days">
                          {{ g.dias_transcurridos }} de {{ g.plazo_maximo_dias }} días transcurridos
                        </span>
                      </div>
                      <p class="garantia-text">{{ g.mensaje }}</p>
                      <div class="regla-rn07-tag">
                        <strong>Regla RN07 Inmutable:</strong> Prohibición estricta de reembolso monetario en efectivo. Operación exclusiva de cambio físico de prenda por ajuste de talla o medida anatómica con balance en Bs. 0.00.
                      </div>
                    </div>
                  </div>
                }

                <!-- SELECTOR DE OPERACIÓN CONFORME A RN07 -->
                <div class="operation-type-selector single-op">
                  <div class="op-option selected">
                    <div class="op-radio"><div class="op-radio-dot"></div></div>
                    <div>
                      <strong class="op-title">CAMBIO DE PRENDA POR MEDIDA ANATÓMICA / TALLA (CU20 / RN07 / RN08)</strong>
                      <p class="op-desc">Reingreso atómico al stock vendible, entrega de nueva variante y balance financiero en Bs. 0.00.</p>
                    </div>
                  </div>
                </div>

                <!-- TABLA DE PRENDAS DE LA VENTA -->
                <div class="table-title-zone">
                  <h4 class="section-title">2. Seleccionar Prendas a Procesar</h4>
                  <span class="legend-note">* Solo se pueden devolver hasta el saldo adquirido no devuelto</span>
                </div>

                <div class="table-wrapper">
                  <table class="luxury-table">
                    <thead>
                      <tr>
                        <th>Prenda &amp; SKU</th>
                        <th>Talla/Color</th>
                        <th class="text-right">Precio Pagado</th>
                        <th class="text-center">Comprado</th>
                        <th class="text-center">Disponible</th>
                        <th class="text-center">Cant. a Procesar</th>
                        <th>Condición</th>
                        @if (tipoOperacion() === 'CAMBIO') {
                          <th>Prenda de Cambio</th>
                        }
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of itemsDevolucion(); track row.item.detalle_id) {
                        <tr [class.row-active]="row.cantidadDevolver > 0">
                          <td>
                            <strong>{{ row.item.prenda_nombre }}</strong>
                            <span class="sub-sku">{{ row.item.sku }}</span>
                          </td>
                          <td>
                            <span class="badge-attr">{{ row.item.talla }}</span>
                            <span class="badge-attr">{{ row.item.color }}</span>
                          </td>
                          <td class="text-right col-strong">
                            <span class="currency">$</span>{{ row.item.precio_unitario | number:'1.2-2' }}
                          </td>
                          <td class="text-center">{{ row.item.cantidad_comprada }}</td>
                          <td class="text-center">
                            <span class="badge-disp" [class.zero]="row.item.cantidad_disponible_devolucion === 0">
                              {{ row.item.cantidad_disponible_devolucion }} uds
                            </span>
                          </td>
                          <td class="text-center">
                            <div class="qty-control">
                              <button
                                type="button"
                                class="btn-qty"
                                [disabled]="row.cantidadDevolver <= 0"
                                (click)="modificarCantidad(row, -1)">-</button>
                              <span class="qty-num">{{ row.cantidadDevolver }}</span>
                              <button
                                type="button"
                                class="btn-qty"
                                [disabled]="row.cantidadDevolver >= row.item.cantidad_disponible_devolucion"
                                (click)="modificarCantidad(row, 1)">+</button>
                            </div>
                          </td>
                          <td>
                            @if (row.cantidadDevolver > 0) {
                              <select class="select-mini" [(ngModel)]="row.condicion">
                                <option value="APTO_PARA_VENTA">Apto Reventa (Suma Stock)</option>
                                <option value="DEFECTUOSO_MERMA">Defectuoso / Falla (Merma)</option>
                              </select>
                            } @else {
                              <span class="dash-text">-</span>
                            }
                          </td>
                          @if (tipoOperacion() === 'CAMBIO') {
                            <td>
                              @if (row.cantidadDevolver > 0) {
                                @if (row.varianteCambioObj) {
                                  <div class="selected-cambio-box">
                                    <span class="cambio-name">{{ row.varianteCambioObj.prenda?.nombre }}</span>
                                    <span class="cambio-sku">{{ row.varianteCambioObj.sku_variante }}</span>
                                    <span class="cambio-price">Precio: <span class="currency">$</span>{{ row.precioCambio | number:'1.2-2' }}</span>
                                    <button type="button" class="btn-link-mini" (click)="abrirModalCambio(row)">Cambiar...</button>
                                  </div>
                                } @else {
                                  <button type="button" class="btn-select-cambio" (click)="abrirModalCambio(row)">
                                    + Elegir Prenda Nueva
                                  </button>
                                }
                              } @else {
                                <span class="dash-text">-</span>
                              }
                            </td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }
          </div>

          <!-- PANEL DERECHO: LIQUIDACIÓN Y CONFIRMACIÓN -->
          <div class="side-column">
            <div class="card-noir summary-card">
              <h3 class="card-title">Resumen de Liquidación</h3>

              <div class="motivo-box">
                <label class="field-label">Motivo de la Operación:</label>
                <select class="select-luxury" [(ngModel)]="motivoSeleccionado">
                  <option value="CAMBIO_TALLA">Cambio de Talla / Calce</option>
                  <option value="FALLA_FABRICA">Falla de Fábrica / Confección</option>
                  <option value="DISCONFORMIDAD">Disconformidad de Color / Estilo</option>
                  <option value="OTRO">Otro Motivo</option>
                </select>
              </div>

              <div class="summary-breakdown">
                <div class="breakdown-row">
                  <span class="muted-lbl">Total Prendas Devueltas:</span>
                  <span class="val-txt"><span class="currency">$</span>{{ totalDevuelto() | number:'1.2-2' }}</span>
                </div>

                @if (tipoOperacion() === 'CAMBIO') {
                  <div class="breakdown-row">
                    <span class="muted-lbl">Total Prendas Nuevas:</span>
                    <span class="val-txt"><span class="currency">$</span>{{ totalNuevo() | number:'1.2-2' }}</span>
                  </div>
                }

                <div class="divider-gold"></div>

                <div class="breakdown-row balance-row">
                  <span class="balance-lbl">BALANCE NETO:</span>
                  <span class="balance-val" [class.credit]="diferencia() < 0" [class.charge]="diferencia() > 0">
                    <span *ngIf="diferencia() > 0">+</span><span class="currency">$</span>{{ diferencia() | number:'1.2-2' }}
                  </span>
                </div>

                <div class="balance-badge" [class.badge-credit]="diferencia() < 0" [class.badge-charge]="diferencia() > 0">
                  @if (diferencia() < 0) {
                    &bull; REEMBOLSO A FAVOR DEL CLIENTE
                  } @else if (diferencia() > 0) {
                    &bull; COBRO ADICIONAL AL CLIENTE
                  } @else {
                    &bull; CAMBIO EXACTO SIN DIFERENCIA
                  }
                </div>
              </div>

              <!-- MOTIVO DE CAMBIO Y REGLA RN07 -->
              <div class="tender-section">
                <label class="field-label">Motivo del Desajuste (CU19):</label>
                <select class="select-luxury" [(ngModel)]="motivoSeleccionado">
                  <option value="TALLA_CHICA">Talla Chica (ajuste anatómico ajustado)</option>
                  <option value="TALLA_GRANDE">Talla Grande (holgado)</option>
                  <option value="DESAJUSTE_MEDIDA_ANATOMICA">Desajuste de Medida Anatómica (pecho/cintura/cadera)</option>
                  <option value="DEFECTO_FABRICA">Defecto de Costura o Fabricación</option>
                </select>
              </div>

              <div class="balance-cero-card">
                <div class="balance-cero-icon">⚖️</div>
                <div>
                  <strong>Balance Financiero: $0.00 USD (Bs. 0.00)</strong>
                  <p class="rn07-note">Regla RN07: Prohibido reembolso en efectivo. Solo cambio físico por talla equivalente.</p>
                </div>
              </div>

              <div class="obs-section">
                <label class="field-label">Observaciones:</label>
                <textarea
                  class="textarea-luxury"
                  rows="2"
                  placeholder="Detalles sobre falla física, estado del embalaje o etiquetas..."
                  [(ngModel)]="observaciones"></textarea>
              </div>

              @if (errorOperacion()) {
                <div class="alert-error">
                  <span>{{ errorOperacion() }}</span>
                </div>
              }

              <button
                type="button"
                class="btn-confirm-op"
                [disabled]="procesando() || totalDevuelto() <= 0"
                (click)="confirmarOperacion()">
                {{ procesando() ? 'Procesando en Kardex...' : 'Confirmar y Emitir Nota' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- TAB 2: HISTORIAL DE DEVOLUCIONES Y CAMBIOS -->
      @if (tabActiva() === 'historial') {
        <div class="card-noir history-card">
          <div class="history-header">
            <div>
              <h3 class="card-title">Registro Auditor de Devoluciones y Cambios</h3>
              <p class="card-desc">Histórico de comprobantes y ajustes de existencias en el inventario</p>
            </div>

            <div class="history-filters">
              <select class="select-luxury" [(ngModel)]="filtroTipo" (ngModelChange)="cargarHistorial()">
                <option value="">Todos los Tipos</option>
                <option value="DEVOLUCION">Devoluciones de Dinero</option>
                <option value="CAMBIO">Cambios de Prenda</option>
              </select>
              <button type="button" class="btn-gold" (click)="cargarHistorial()">Refrescar</button>
            </div>
          </div>

          <div class="table-wrapper">
            <table class="luxury-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Fecha/Hora</th>
                  <th>Ticket Origen</th>
                  <th>Tipo</th>
                  <th>Motivo</th>
                  <th>Cajero</th>
                  <th class="text-right">Devuelto</th>
                  <th class="text-right">Entregado</th>
                  <th class="text-right">Balance</th>
                  <th class="text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                @for (d of historial(); track d.id) {
                  <tr>
                    <td><strong class="col-gold">{{ d.codigo }}</strong></td>
                    <td class="col-time">{{ d.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td><span class="sub-ticket">{{ d.venta?.codigo_venta || 'Venta #' + d.venta_id }}</span></td>
                    <td>
                      <span class="type-badge" [class.badge-cambio]="d.tipo === 'CAMBIO'">{{ d.tipo }}</span>
                    </td>
                    <td><span class="badge-attr">{{ d.motivo }}</span></td>
                    <td>{{ d.cajero?.nombre || 'Cajero' }}</td>
                    <td class="text-right"><span class="currency">$</span>{{ d.total_devuelto | number:'1.2-2' }}</td>
                    <td class="text-right"><span class="currency">$</span>{{ d.total_nuevo | number:'1.2-2' }}</td>
                    <td class="text-right col-strong" [class.credit]="d.diferencia < 0" [class.charge]="d.diferencia > 0">
                      <span class="currency">$</span>{{ d.diferencia | number:'1.2-2' }}
                    </td>
                    <td class="text-right">
                      <button type="button" class="btn-action-view" (click)="verRecibo(d)">
                        Ver Nota
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="10" class="empty-msg">No hay devoluciones ni cambios registrados</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- MODAL SELECTOR DE PRENDA DE CAMBIO -->
      @if (mostrarModalCambio()) {
        <div class="modal-overlay" (click)="cerrarModalCambio()">
          <div class="modal-content modal-cambio" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3 class="modal-title">Seleccionar Prenda de Reemplazo</h3>
              <button type="button" class="btn-close" (click)="cerrarModalCambio()">&times;</button>
            </div>

            <div class="modal-body">
              <input
                type="text"
                class="input-luxury modal-search"
                placeholder="Buscar prenda en catálogo por nombre o categoría..."
                [(ngModel)]="busquedaCatalogo" />

              <div class="catalog-cards-grid">
                @for (p of prendasCatalogoFiltradas(); track p.id) {
                  <div class="catalog-card">
                    <strong class="cat-title">{{ p.nombre }}</strong>
                    <span class="cat-price"><span class="currency">$</span>{{ p.precio_base | number:'1.2-2' }}</span>
                    <span class="cat-sec">{{ p.categoria?.nombre }} &bull; {{ p.categoria?.sector || 'UNISEX' }}</span>

                    <div class="variant-select-list">
                      <span class="var-title">Variantes Disponibles:</span>
                      <div class="var-chips">
                        @for (v of p.variantes; track v.id) {
                          <button
                            type="button"
                            class="chip-var"
                            [disabled]="getStockVariante(v.id) <= 0"
                            (click)="seleccionarVarianteCambio(p, v)">
                            <span class="chip-size">{{ v.talla?.codigo }}</span>
                            <span class="chip-color">{{ v.color?.nombre }}</span>
                            <span class="chip-stock">({{ getStockVariante(v.id) }} disp)</span>
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }


      <!-- TAB 3: CONFLICTOS DE CONSISTENCIA DE INVENTARIO (CU17) -->
      @if (tabActiva() === 'conflictos') {
        <div class="card-noir history-card">
          <div class="history-header">
            <div>
              <h3 class="card-title">Arbitraje de Conflictos de Inventario (CU17)</h3>
              <p class="card-desc">Colisiones de stock detectadas en el servidor central durante ventas de contingencia fuera de línea</p>
            </div>
            <button type="button" class="btn-gold" (click)="cargarConflictos()">Actualizar</button>
          </div>

          @if (conflictos().length === 0) {
            <div class="empty-state">
              <span class="empty-icon" style="font-size: 2.5rem;">✅</span>
              <p>No existen discrepancias de inventario pendientes. El stock central es 100% consistente.</p>
            </div>
          } @else {
            <div class="table-wrapper">
              <table class="luxury-table">
                <thead>
                  <tr>
                    <th>ID / Fecha</th>
                    <th>Prenda &amp; Talla</th>
                    <th>Sucursal</th>
                    <th class="text-center">Cant. Solicitada Offline</th>
                    <th class="text-center">Stock Servidor Central</th>
                    <th>Estado</th>
                    <th>Acción Arbitral</th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of conflictos(); track c.id) {
                    <tr>
                      <td>
                        <strong>#{{ c.id }}</strong>
                        <span class="sub-sku">{{ c.fecha_deteccion | date:'dd/MM/yyyy HH:mm' }}</span>
                      </td>
                      <td>
                        <strong>{{ c.prenda_nombre }}</strong>
                        <span class="badge-attr">{{ c.talla }}</span>
                        <span class="badge-attr">{{ c.color }}</span>
                      </td>
                      <td>{{ c.sucursal_nombre }}</td>
                      <td class="text-center col-strong" style="color: #ff6b6b;">{{ c.cantidad_solicitada }} uds</td>
                      <td class="text-center">
                        <span class="badge-disp zero">{{ c.stock_disponible_servidor }} uds</span>
                      </td>
                      <td>
                        <span class="ticket-status-badge" [style.background]="c.estado_resolucion === 'RESUELTO' ? '#15803d' : '#854d0e'">
                          {{ c.estado_resolucion }}
                        </span>
                      </td>
                      <td>
                        @if (c.estado_resolucion === 'RESUELTO') {
                          <span style="color: #4ade80; font-size: 0.85rem; font-weight: 600;">✓ Conciliado</span>
                        } @else {
                          <button type="button" class="btn-tag" (click)="abrirModalResolucion(c)">
                            Resolver Conflicto
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
      }

      <!-- MODAL RESOLUCIÓN DE CONFLICTO (CU17) -->
      @if (mostrarModalResolucion() && conflictoSeleccionado(); as c) {
        <div class="modal-overlay" (click)="cerrarModalResolucion()">
          <div class="modal-content" style="max-width: 520px;" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3 class="modal-title">Arbitraje de Discrepancia #{{ c.id }}</h3>
              <button type="button" class="btn-close-modal" (click)="cerrarModalResolucion()">&times;</button>
            </div>
            <div style="padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem;">
              <p style="font-size: 0.9rem; color: #a3a3a3;">
                Prenda: <strong style="color: #fff;">{{ c.prenda_nombre }} (Talla {{ c.talla }})</strong><br/>
                Vendido Offline: <strong style="color: #ff6b6b;">{{ c.cantidad_solicitada }} uds</strong> | Stock Servidor: <strong style="color: #fbbf24;">{{ c.stock_disponible_servidor }} uds</strong>
              </p>

              <div>
                <label class="field-label">Seleccione la Estrategia de Conciliación:</label>
                <select class="select-luxury" [(ngModel)]="accionResolucion">
                  <option value="TRASPASO_INMEDIATO">1. Solicitar Traspaso Inmediato desde otra Sucursal (CU12)</option>
                  <option value="ADMITIR_SALDO_NEGATIVO">2. Admitir Saldo Negativo Temporal hasta Reposición</option>
                  <option value="ANULAR_VENTA">3. Anular Transacción (si la prenda no fue retirada)</option>
                </select>
              </div>

              <div>
                <label class="field-label">Justificación Formal Obligatoria (Kardex):</label>
                <textarea
                  class="textarea-luxury"
                  rows="2"
                  placeholder="Ingrese el motivo de la conciliación técnica..."
                  [(ngModel)]="observacionResolucion"></textarea>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem;">
                <button type="button" class="btn-tag" (click)="cerrarModalResolucion()">Cancelar</button>
                <button
                  type="button"
                  class="btn-gold"
                  [disabled]="resolviendoConflicto() || !observacionResolucion.trim()"
                  (click)="ejecutarResolucionConflicto()">
                  {{ resolviendoConflicto() ? 'Conciliando...' : 'Aplicar Arbitraje' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- MODAL COMPROBANTE OFICIAL (NOTA DE CRÉDITO / CAMBIO) -->
      @if (comprobanteActivo(); as c) {
        <div class="modal-overlay" (click)="comprobanteActivo.set(null)">
          <div class="modal-content receipt-modal" (click)="$event.stopPropagation()">
            <div class="thermal-receipt">
              <div class="receipt-header">
                <span class="receipt-brand">FASHIONSTORE</span>
                <span class="receipt-subbrand">ATELIER NOIR &bull; SERVICIO POSVENTA</span>
                <div class="receipt-divider">================================</div>
                <h4 class="receipt-type">
                  {{ c.tipo === 'DEVOLUCION' ? 'NOTA DE DEVOLUCIÓN / REEMBOLSO' : 'COMPROBANTE DE CAMBIO DE PRENDA' }}
                </h4>
                <p class="receipt-meta">NÚMERO: <strong>{{ c.codigo }}</strong></p>
                <p class="receipt-meta">TICKET ORIGEN: <strong>{{ c.venta?.codigo_venta }}</strong></p>
                <p class="receipt-meta">FECHA: {{ c.created_at | date:'dd/MM/yyyy HH:mm:ss' }}</p>
                <p class="receipt-meta">SUCURSAL: {{ c.sucursal?.nombre }}</p>
                <p class="receipt-meta">CAJERO: {{ c.cajero?.nombre }} {{ c.cajero?.apellido }}</p>
                <p class="receipt-meta">CLIENTE: {{ c.venta?.cliente_nombre }} (NIT: {{ c.venta?.cliente_nit }})</p>
              </div>

              <div class="receipt-divider">================================</div>

              <div class="receipt-section-label">PRENDAS DEVUELTAS:</div>
              <div class="receipt-items">
                @for (item of c.detalles; track item.id) {
                  <div class="receipt-item-row">
                    <div class="rec-item-info">
                      <strong>{{ item.variante_devuelta?.prenda?.nombre }}</strong>
                      <span>{{ item.cantidad_devuelta }}x &#64; <span class="currency">$</span>{{ item.precio_unitario_devuelto | number:'1.2-2' }}</span>
                      <span class="rec-cond">Condición: {{ item.condicion_prenda }}</span>
                    </div>
                    <div class="rec-item-total">
                      -<span class="currency">$</span>{{ item.subtotal_devuelto | number:'1.2-2' }}
                    </div>
                  </div>

                  @if (item.variante_cambio) {
                    <div class="receipt-item-row row-entrega">
                      <div class="rec-item-info">
                        <strong>(NUEVA) {{ item.variante_cambio.prenda?.nombre }}</strong>
                        <span>{{ item.cantidad_cambio }}x &#64; <span class="currency">$</span>{{ item.precio_unitario_cambio | number:'1.2-2' }}</span>
                        <span class="rec-cond">Talla: {{ item.variante_cambio.talla?.codigo }} | Color: {{ item.variante_cambio.color?.nombre }}</span>
                      </div>
                      <div class="rec-item-total col-gold">
                        +<span class="currency">$</span>{{ item.subtotal_cambio | number:'1.2-2' }}
                      </div>
                    </div>
                  }
                }
              </div>

              <div class="receipt-divider">================================</div>

              <div class="receipt-totals">
                <div class="rec-total-row">
                  <span>TOTAL DEVUELTO:</span>
                  <span><span class="currency">$</span>{{ c.total_devuelto | number:'1.2-2' }}</span>
                </div>
                @if (c.tipo === 'CAMBIO') {
                  <div class="rec-total-row">
                    <span>TOTAL ENTREGADO:</span>
                    <span><span class="currency">$</span>{{ c.total_nuevo | number:'1.2-2' }}</span>
                  </div>
                }
                <div class="rec-total-row rec-grand-total">
                  <span>BALANCE LIQUIDADO:</span>
                  <span><span class="currency">$</span>{{ c.diferencia | number:'1.2-2' }}</span>
                </div>
                <div class="rec-total-row">
                  <span>MODALIDAD:</span>
                  <span>{{ c.metodo_reembolso || 'NO APLICA' }}</span>
                </div>
              </div>

              <div class="receipt-divider">================================</div>

              <div class="receipt-footer">
                <p>MOTIVO: {{ c.motivo }}</p>
                <p *ngIf="c.observaciones">OBS: {{ c.observaciones }}</p>
                <p class="receipt-thanks">AJUSTE DE INVENTARIO Y KARDEX CERTIFICADO</p>
                <p class="receipt-thanks">GRACIAS POR SU PREFERENCIA</p>
              </div>

              <div class="receipt-actions">
                <button type="button" class="btn-print" (click)="imprimirRecibo()">
                  Imprimir Comprobante
                </button>
                <button type="button" class="btn-cancel" (click)="comprobanteActivo.set(null)">
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
    :host {
      display: block;
      color: #111111;
    }
    .devoluciones-container {
      padding: 1.5rem 0 3rem 0;
      max-width: 1400px;
      margin: 0 auto;
    }
    .hero-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      padding-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1.5rem;
    }
    .luxury-badge {
      font-size: 0.7rem;
      letter-spacing: 0.15em;
      color: #4b5563;
      border: 1px solid rgba(0, 0, 0, 0.15);
      padding: 3px 8px;
      display: inline-block;
      margin-bottom: 0.5rem;
      font-weight: 700;
      text-transform: uppercase;
      border-radius: 0;
    }
    .page-title {
      font-size: 2.2rem;
      font-family: 'Inter', sans-serif;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0 0 0.5rem 0;
      color: #000000;
    }
    .subtitle {
      color: #4b5563;
      font-size: 0.95rem;
      margin: 0;
    }
    .branch-selector-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      padding: 1rem 1.25rem;
      min-width: 280px;
      border-radius: 0;
    }
    .branch-label {
      display: block;
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      color: #4b5563;
      font-weight: 700;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
    }
    .tabs-bar {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      margin-bottom: 2rem;
    }
    .tab-btn {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: #4b5563;
      padding: 0.8rem 1.5rem;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s;
      border-radius: 0;
    }
    .tab-btn:hover {
      color: #000000;
    }
    .tab-btn.active {
      color: #000000;
      border-bottom-color: #000000;
      background: #f9fafb;
    }
    .tab-dot {
      font-size: 1.2rem;
      line-height: 1;
    }
    .tab-content-grid {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 2rem;
    }
    @media (max-width: 1024px) {
      .tab-content-grid {
        grid-template-columns: 1fr;
      }
    }
    .card-noir {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      border-radius: 0;
    }
    .card-title {
      font-family: 'Inter', sans-serif;
      font-size: 1.1rem;
      font-weight: 700;
      color: #000000;
      margin: 0 0 0.35rem 0;
      letter-spacing: -0.01em;
    }
    .card-desc {
      color: #4b5563;
      font-size: 0.85rem;
      margin: 0 0 1.25rem 0;
    }
    .search-input-group {
      display: flex;
      gap: 0.75rem;
    }
    .input-luxury {
      flex: 1;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #000000;
      padding: 0.75rem 1rem;
      font-size: 0.95rem;
      outline: none;
      border-radius: 0;
      transition: border-color 0.2s;
    }
    .input-luxury:focus {
      border-color: #000000;
    }
    .select-luxury {
      width: 100%;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #000000;
      padding: 0.65rem 0.75rem;
      font-size: 0.9rem;
      outline: none;
      border-radius: 0;
      transition: border-color 0.2s;
    }
    .select-luxury:focus {
      border-color: #000000;
    }
    .select-mini {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #000000;
      padding: 0.35rem 0.5rem;
      font-size: 0.8rem;
      border-radius: 0;
      outline: none;
    }
    .btn-gold {
      background: #000000;
      color: #ffffff;
      border: 1px solid #000000;
      padding: 0 1.5rem;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      cursor: pointer;
      border-radius: 0;
      transition: background-color 0.2s;
    }
    .btn-gold:hover:not(:disabled) {
      background: #262626;
      border-color: #262626;
    }
    .btn-gold:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .quick-fill-zone {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px dashed rgba(0, 0, 0, 0.15);
    }
    .quick-label {
      font-size: 0.75rem;
      color: #4b5563;
      font-weight: 700;
      display: block;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
    }
    .quick-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .btn-tag {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #000000;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 3px 8px;
      cursor: pointer;
      border-radius: 0;
      transition: all 0.15s;
    }
    .btn-tag:hover {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
    }
    .alert-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 0.75rem 1rem;
      margin-top: 1rem;
      font-size: 0.85rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-radius: 0;
    }
    .ticket-header-flex {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      padding-bottom: 1.25rem;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .ticket-status-badge {
      font-size: 0.65rem;
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
      padding: 2px 6px;
      letter-spacing: 0.1em;
      display: inline-block;
      margin-bottom: 0.25rem;
      font-weight: 700;
      border-radius: 0;
    }
    .ticket-code {
      font-size: 1.4rem;
      font-family: monospace;
      color: #000000;
      font-weight: 700;
      margin: 0 0 0.25rem 0;
    }
    .ticket-meta {
      font-size: 0.8rem;
      color: #4b5563;
      margin: 0;
    }
    .ticket-customer-box {
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 0.75rem 1rem;
      text-align: right;
      border-radius: 0;
    }
    .cust-label {
      display: block;
      font-size: 0.65rem;
      color: #4b5563;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .cust-name {
      display: block;
      font-size: 0.95rem;
      font-weight: 700;
      color: #000000;
    }
    .cust-nit {
      display: block;
      font-size: 0.8rem;
      color: #6b7280;
    }
    .operation-type-selector {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    @media (max-width: 600px) {
      .operation-type-selector {
        grid-template-columns: 1fr;
      }
    }
    .op-option {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      padding: 1rem;
      cursor: pointer;
      display: flex;
      gap: 0.75rem;
      border-radius: 0;
      transition: all 0.2s;
    }
    .op-option:hover {
      border-color: #000000;
    }
    .op-option.selected {
      border-color: #000000;
      background: #f9fafb;
      box-shadow: 0 0 0 1px #000000;
    }
    .op-radio {
      width: 18px;
      height: 18px;
      border: 1px solid #000000;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 2px;
      flex-shrink: 0;
    }
    .op-radio-dot {
      width: 8px;
      height: 8px;
      background: #000000;
      border-radius: 50%;
    }
    .op-title {
      display: block;
      font-size: 0.85rem;
      font-weight: 700;
      color: #000000;
      margin-bottom: 0.25rem;
    }
    .op-desc {
      font-size: 0.75rem;
      color: #4b5563;
      margin: 0;
    }
    .table-title-zone {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 0.75rem;
    }
    .section-title {
      font-family: 'Inter', sans-serif;
      font-size: 0.95rem;
      font-weight: 700;
      color: #000000;
      margin: 0;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .legend-note {
      font-size: 0.75rem;
      color: #6b7280;
    }
    .table-wrapper {
      overflow-x: auto;
    }
    .luxury-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    .luxury-table th {
      background: #f9fafb;
      color: #000000;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 2px solid rgba(0, 0, 0, 0.12);
      text-transform: uppercase;
    }
    .luxury-table td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      vertical-align: middle;
      color: #1f2937;
    }
    .row-active {
      background: #f9fafb;
    }
    .sub-sku {
      display: block;
      font-size: 0.7rem;
      color: #6b7280;
      font-family: monospace;
    }
    .badge-attr {
      background: #f3f4f6;
      border: 1px solid rgba(0, 0, 0, 0.12);
      font-size: 0.75rem;
      font-weight: 600;
      color: #000000;
      padding: 2px 6px;
      margin-right: 4px;
      display: inline-block;
      border-radius: 0;
    }
    .badge-disp {
      font-size: 0.75rem;
      font-weight: 700;
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
      padding: 2px 8px;
      border-radius: 0;
    }
    .badge-disp.zero {
      background: #fef2f2;
      color: #991b1b;
      border-color: #fecaca;
    }
    .qty-control {
      display: inline-flex;
      align-items: center;
      border: 1px solid rgba(0, 0, 0, 0.2);
    }
    .btn-qty {
      background: #ffffff;
      border: none;
      color: #000000;
      width: 26px;
      height: 26px;
      cursor: pointer;
      font-weight: bold;
      transition: background-color 0.2s;
    }
    .btn-qty:hover:not(:disabled) {
      background: #000000;
      color: #ffffff;
    }
    .btn-qty:disabled {
      opacity: 0.2;
      cursor: not-allowed;
    }
    .qty-num {
      padding: 0 8px;
      min-width: 24px;
      text-align: center;
      font-weight: 700;
      color: #000000;
    }
    .selected-cambio-box {
      background: #f9fafb;
      border: 1px dashed rgba(0, 0, 0, 0.3);
      padding: 0.4rem 0.6rem;
      font-size: 0.75rem;
      border-radius: 0;
    }
    .cambio-name {
      display: block;
      font-weight: 700;
      color: #000000;
    }
    .cambio-sku {
      display: block;
      color: #6b7280;
      font-family: monospace;
    }
    .cambio-price {
      display: block;
      color: #000000;
      font-weight: 700;
    }
    .btn-link-mini {
      background: none;
      border: none;
      color: #000000;
      text-decoration: underline;
      cursor: pointer;
      padding: 0;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .btn-select-cambio {
      background: #ffffff;
      border: 1px dashed rgba(0, 0, 0, 0.3);
      color: #000000;
      padding: 0.4rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      border-radius: 0;
      transition: all 0.2s;
    }
    .btn-select-cambio:hover {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
    }
    .dash-text {
      color: #9ca3af;
    }
    .col-strong {
      font-weight: 700;
      color: #000000;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }

    /* PANEL DERECHO */
    .summary-card {
      position: sticky;
      top: 1rem;
    }
    .motivo-box, .tender-section, .obs-section {
      margin-bottom: 1.25rem;
    }
    .field-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #4b5563;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
    }
    .textarea-luxury {
      width: 100%;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #000000;
      padding: 0.65rem;
      font-size: 0.85rem;
      outline: none;
      border-radius: 0;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }
    .textarea-luxury:focus {
      border-color: #000000;
    }
    .summary-breakdown {
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 1.25rem;
      margin-bottom: 1.25rem;
      border-radius: 0;
    }
    .breakdown-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      margin-bottom: 0.65rem;
    }
    .muted-lbl { color: #4b5563; font-weight: 600; }
    .val-txt { font-weight: 700; color: #000000; }
    .divider-gold {
      height: 1px;
      background: rgba(0, 0, 0, 0.1);
      margin: 0.75rem 0;
    }
    .balance-row {
      font-size: 1.1rem;
      margin-bottom: 0.75rem;
    }
    .balance-lbl {
      color: #000000;
      font-weight: 700;
    }
    .balance-val {
      font-weight: 800;
      font-family: 'Inter', sans-serif;
      color: #000000;
    }
    .balance-val.credit { color: #16a34a; }
    .balance-val.charge { color: #000000; }
    .balance-badge {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-align: center;
      padding: 4px;
      border: 1px solid rgba(0, 0, 0, 0.15);
      color: #4b5563;
      border-radius: 0;
    }
    .badge-credit {
      border-color: #bbf7d0;
      color: #166534;
      background: #f0fdf4;
    }
    .badge-charge {
      border-color: rgba(0, 0, 0, 0.2);
      color: #000000;
      background: #f3f4f6;
    }
    .btn-confirm-op {
      width: 100%;
      background: #000000;
      color: #ffffff;
      border: 1px solid #000000;
      padding: 1rem;
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      cursor: pointer;
      border-radius: 0;
      transition: background-color 0.2s;
    }
    .btn-confirm-op:hover:not(:disabled) {
      background: #262626;
      border-color: #262626;
    }
    .btn-confirm-op:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    /* TAB HISTORIAL */
    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .history-filters {
      display: flex;
      gap: 0.75rem;
    }
    .col-gold { color: #000000; font-family: monospace; font-weight: 700; }
    .col-time { font-size: 0.8rem; color: #6b7280; }
    .sub-ticket { font-family: monospace; font-size: 0.8rem; color: #6b7280; }
    .type-badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 6px;
      background: #f3f4f6;
      color: #000000;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 0;
    }
    .type-badge.badge-cambio {
      background: #f9fafb;
      color: #000000;
      border-color: rgba(0, 0, 0, 0.3);
    }
    .btn-action-view {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #000000;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 3px 10px;
      cursor: pointer;
      border-radius: 0;
      transition: all 0.2s;
    }
    .btn-action-view:hover {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
    }
    .empty-msg {
      text-align: center;
      padding: 3rem 0;
      color: #6b7280;
    }

    /* MODAL CAMBIO */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1rem;
    }
    .modal-content {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      max-height: 90vh;
      overflow-y: auto;
      border-radius: 0;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.2);
    }
    .modal-cambio {
      width: 100%;
      max-width: 800px;
      padding: 1.5rem;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      padding-bottom: 0.75rem;
    }
    .modal-title {
      font-family: 'Inter', sans-serif;
      font-size: 1.2rem;
      font-weight: 700;
      color: #000000;
      margin: 0;
    }
    .btn-close {
      background: none;
      border: none;
      color: #6b7280;
      font-size: 1.5rem;
      cursor: pointer;
      transition: color 0.2s;
    }
    .btn-close:hover {
      color: #000000;
    }
    .modal-search {
      margin-bottom: 1.25rem;
    }
    .catalog-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
      gap: 1rem;
      max-height: 55vh;
      overflow-y: auto;
    }
    .catalog-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 1rem;
      border-radius: 0;
    }
    .cat-title {
      display: block;
      font-size: 0.9rem;
      font-weight: 700;
      color: #000000;
      margin-bottom: 0.25rem;
    }
    .cat-price {
      display: block;
      color: #000000;
      font-weight: 800;
      font-size: 0.95rem;
    }
    .cat-sec {
      display: block;
      font-size: 0.75rem;
      color: #6b7280;
      margin-bottom: 0.75rem;
    }
    .var-title {
      display: block;
      font-size: 0.7rem;
      font-weight: 700;
      color: #4b5563;
      margin-bottom: 0.4rem;
      text-transform: uppercase;
    }
    .var-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .chip-var {
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.15);
      color: #000000;
      padding: 3px 6px;
      font-size: 0.7rem;
      font-weight: 600;
      cursor: pointer;
      border-radius: 0;
      transition: all 0.2s;
    }
    .chip-var:hover:not(:disabled) {
      border-color: #000000;
      background: #000000;
      color: #ffffff;
    }
    .chip-var:disabled {
      opacity: 0.25;
      cursor: not-allowed;
    }
    .chip-stock { color: #16a34a; font-size: 0.65rem; font-weight: 700; }

    /* COMPROBANTE TÉRMICO DE LUJO */
    .receipt-modal {
      width: 100%;
      max-width: 440px;
      padding: 1.5rem;
    }
    .thermal-receipt {
      background: #fcfcfc;
      color: #000000;
      font-family: 'Courier New', Courier, monospace;
      padding: 1.5rem;
      font-size: 0.85rem;
      border: 1px dashed rgba(0, 0, 0, 0.2);
    }
    .receipt-header {
      text-align: center;
    }
    .receipt-brand {
      display: block;
      font-family: 'Inter', sans-serif;
      font-size: 1.4rem;
      font-weight: 800;
      letter-spacing: 0.1em;
    }
    .receipt-subbrand {
      display: block;
      font-size: 0.7rem;
      letter-spacing: 0.05em;
      margin-top: 2px;
      color: #4b5563;
    }
    .receipt-type {
      margin: 0.5rem 0;
      font-size: 0.95rem;
      font-weight: bold;
    }
    .receipt-meta {
      margin: 2px 0;
      font-size: 0.75rem;
      text-align: left;
    }
    .receipt-divider {
      margin: 0.5rem 0;
      text-align: center;
      letter-spacing: -1px;
      color: #9ca3af;
    }
    .receipt-section-label {
      font-weight: bold;
      margin-bottom: 0.5rem;
      font-size: 0.8rem;
    }
    .receipt-item-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 0.8rem;
    }
    .row-entrega {
      padding-left: 0.5rem;
      border-left: 2px solid #000000;
    }
    .rec-item-info {
      display: flex;
      flex-direction: column;
    }
    .rec-cond {
      font-size: 0.7rem;
      font-style: italic;
    }
    .rec-item-total {
      font-weight: bold;
    }
    .rec-total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      font-size: 0.8rem;
    }
    .rec-grand-total {
      font-size: 1rem;
      font-weight: bold;
      border-top: 1px dashed #000;
      border-bottom: 1px dashed #000;
      padding: 4px 0;
      margin: 6px 0;
    }
    .receipt-footer {
      text-align: center;
      font-size: 0.75rem;
      margin-top: 0.75rem;
    }
    .receipt-thanks {
      margin-top: 6px;
      font-weight: bold;
    }
    .receipt-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }
    .btn-print {
      flex: 1;
      background: #000000;
      color: #ffffff;
      border: 1px solid #000000;
      padding: 0.75rem;
      font-weight: bold;
      cursor: pointer;
      border-radius: 0;
      transition: background-color 0.2s;
    }
    .btn-print:hover {
      background: #262626;
    }
    .btn-cancel {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #374151;
      padding: 0.75rem 1rem;
      cursor: pointer;
      border-radius: 0;
      font-weight: 600;
      transition: all 0.2s;
    }
    .btn-cancel:hover {
      background: #f3f4f6;
      color: #000000;
    }
  `]
})
export class DevolucionesPageComponent implements OnInit {
  private readonly ventasService = inject(VentasService);
  private readonly catalogoService = inject(CatalogoService);
  private readonly inventarioService = inject(InventarioService);
  private readonly authService = inject(AuthService);

  // Estados reactivos (Presentación 2)
  tabActiva = signal<'nueva' | 'historial' | 'conflictos'>('nueva');
  garantiaInfo = signal<ValidarCambioGarantiaResponse | null>(null);
  notaFormalActiva = signal<NotaDevolucionFormalResponse | null>(null);
  historialNotas = signal<NotaDevolucionFormalResponse[]>([]);
  conflictos = signal<ConflictoInventarioResponse[]>([]);
  conflictoSeleccionado = signal<ConflictoInventarioResponse | null>(null);
  mostrarModalResolucion = signal<boolean>(false);
  resolviendoConflicto = signal<boolean>(false);
  accionResolucion = 'TRASPASO_INMEDIATO';
  observacionResolucion = '';

  conflictosPendientesCount = computed(() => {
    return this.conflictos().filter(c => c.estado_resolucion === 'PENDIENTE_RESOLUCION').length;
  });

  sucursales = signal<Sucursal[]>([]);
  sucursalSeleccionadaId = signal<number>(2);

  // Búsqueda de ticket
  codigoBusqueda = '';
  buscando = signal<boolean>(false);
  errorBusqueda = signal<string | null>(null);
  ventaCargada = signal<VentaParaDevolucionResponse | null>(null);
  ventasRecientes = signal<VentaResponse[]>([]);

  // Configuración de operación
  tipoOperacion = signal<'DEVOLUCION' | 'CAMBIO'>('DEVOLUCION');
  motivoSeleccionado = 'CAMBIO_TALLA';
  metodoReembolso = 'EFECTIVO';
  observaciones = '';
  itemsDevolucion = signal<ItemDevolucionRow[]>([]);
  procesando = signal<boolean>(false);
  errorOperacion = signal<string | null>(null);

  // Modal selector de cambio
  mostrarModalCambio = signal<boolean>(false);
  filaEnEdicion: ItemDevolucionRow | null = null;
  busquedaCatalogo = '';
  prendasCatalogo = signal<Prenda[]>([]);
  stockSucursalMap = signal<Map<number, number>>(new Map());

  // Historial y Comprobante
  historial = signal<DevolucionResponse[]>([]);
  filtroTipo = '';
  comprobanteActivo = signal<DevolucionResponse | null>(null);

  // Totales computados
  totalDevuelto = computed(() => {
    let tot = 0;
    for (const r of this.itemsDevolucion()) {
      tot += r.cantidadDevolver * r.item.precio_unitario;
    }
    return tot;
  });

  totalNuevo = computed(() => {
    if (this.tipoOperacion() !== 'CAMBIO') return 0;
    let tot = 0;
    for (const r of this.itemsDevolucion()) {
      if (r.cantidadDevolver > 0 && r.varianteCambioObj) {
        tot += r.cantidadCambio * r.precioCambio;
      }
    }
    return tot;
  });

  diferencia = computed(() => {
    return this.totalNuevo() - this.totalDevuelto();
  });

  prendasCatalogoFiltradas = computed(() => {
    const q = this.busquedaCatalogo.toLowerCase().trim();
    if (!q) return this.prendasCatalogo();
    return this.prendasCatalogo().filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      (p.categoria?.nombre && p.categoria.nombre.toLowerCase().includes(q))
    );
  });

  ngOnInit(): void {
    this.cargarSucursales();
    this.cargarPrendas();
  }

  cargarSucursales(): void {
    this.inventarioService.getSucursales().subscribe({
      next: (res) => {
        this.sucursales.set(res);
        const user = this.authService.currentUser();
        if (user && user.sucursal_id) {
          this.sucursalSeleccionadaId.set(user.sucursal_id);
        } else if (res.length > 0) {
          this.sucursalSeleccionadaId.set(res[0].id);
        }
        this.cargarStockSucursal();
        this.cargarVentasRecientes();
      },
      error: (err: any) => console.error('Error cargando sucursales', err)
    });
  }

  cargarPrendas(): void {
    this.catalogoService.getPrendas().subscribe({
      next: (res) => this.prendasCatalogo.set(res),
      error: (err: any) => console.error('Error cargando catálogo', err)
    });
  }

  cargarStockSucursal(): void {
    const sucId = this.sucursalSeleccionadaId();
    this.catalogoService.getStockPorSucursal(sucId).subscribe({
      next: (stocks: any[]) => {
        const map = new Map<number, number>();
        for (const s of stocks) {
          map.set(s.variante_id, s.cantidad_disponible);
        }
        this.stockSucursalMap.set(map);
      },
      error: (err: any) => console.error('Error cargando stock sucursal', err)
    });
  }

  getStockVariante(varianteId: number): number {
    return this.stockSucursalMap().get(varianteId) || 0;
  }

  cargarVentasRecientes(): void {
    const sucId = this.sucursalSeleccionadaId();
    this.ventasService.getVentas(sucId).subscribe({
      next: (ventas) => this.ventasRecientes.set(ventas.slice(0, 4)),
      error: (err: any) => console.error('Error cargando ventas recientes', err)
    });
  }

  onSucursalChange(newId: number): void {
    this.sucursalSeleccionadaId.set(Number(newId));
    this.cargarStockSucursal();
    this.cargarVentasRecientes();
    if (this.tabActiva() === 'historial') {
      this.cargarHistorial();
    }
  }

  cargarVentaRapida(codigo: string): void {
    this.codigoBusqueda = codigo;
    this.buscarTicket();
  }

  buscarTicket(): void {
    if (!this.codigoBusqueda.trim()) return;
    this.buscando.set(true);
    this.errorBusqueda.set(null);
    this.ventaCargada.set(null);
    this.garantiaInfo.set(null);

    // CU19: Validar ticket previo y plazos de garantía (RN06)
    this.ventasService.validarSolicitudCambio(this.codigoBusqueda.trim()).subscribe({
      next: (gRes) => {
        this.buscando.set(false);
        this.garantiaInfo.set(gRes);
        this.tipoOperacion.set('CAMBIO');

        const vResponse: VentaParaDevolucionResponse = {
          id: gRes.venta_id,
          codigo_venta: gRes.codigo_venta,
          sucursal_id: gRes.sucursal_id,
          sucursal_nombre: gRes.sucursal_nombre,
          fecha: gRes.fecha_venta,
          cliente_nombre: gRes.cliente_nombre,
          cliente_nit: '0',
          total: 0 as any,
          estado: 'PAGADA',
          cajero_nombre: 'Cajero',
          items: gRes.items
        };
        this.ventaCargada.set(vResponse);

        const rows: ItemDevolucionRow[] = gRes.items.map(item => ({
          item,
          cantidadDevolver: 0,
          condicion: 'APTO_PARA_VENTA',
          varianteCambioId: null,
          varianteCambioObj: null,
          cantidadCambio: 1,
          precioCambio: 0
        }));
        this.itemsDevolucion.set(rows);
      },
      error: (err) => {
        this.buscando.set(false);
        this.errorBusqueda.set(err.error?.detail || 'No se encontró la venta con el código ingresado');
      }
    });
  }

  modificarCantidad(row: ItemDevolucionRow, delta: number): void {
    const nuevaCant = row.cantidadDevolver + delta;
    if (nuevaCant >= 0 && nuevaCant <= row.item.cantidad_disponible_devolucion) {
      row.cantidadDevolver = nuevaCant;
      row.cantidadCambio = nuevaCant;
      this.itemsDevolucion.update(items => [...items]);
    }
  }

  abrirModalCambio(row: ItemDevolucionRow): void {
    this.filaEnEdicion = row;
    this.mostrarModalCambio.set(true);
  }

  cerrarModalCambio(): void {
    this.mostrarModalCambio.set(false);
    this.filaEnEdicion = null;
  }

  seleccionarVarianteCambio(prenda: Prenda, variante: PrendaVariante): void {
    if (!this.filaEnEdicion) return;
    const vCompleta = { ...variante, prenda };
    this.filaEnEdicion.varianteCambioId = variante.id;
    this.filaEnEdicion.varianteCambioObj = vCompleta;
    this.filaEnEdicion.precioCambio = prenda.precio_base;
    this.filaEnEdicion.cantidadCambio = this.filaEnEdicion.cantidadDevolver || 1;
    this.itemsDevolucion.update(items => [...items]);
    this.cerrarModalCambio();
  }

  confirmarOperacion(): void {
    const venta = this.ventaCargada();
    if (!venta) return;

    const itemsAProcesar = this.itemsDevolucion().filter(r => r.cantidadDevolver > 0);
    if (itemsAProcesar.length === 0) {
      this.errorOperacion.set('Debe seleccionar al menos una prenda para procesar');
      return;
    }

    if (this.tipoOperacion() === 'CAMBIO') {
      for (const r of itemsAProcesar) {
        if (!r.varianteCambioId) {
          this.errorOperacion.set(`Seleccione la prenda nueva para el cambio de '${r.item.prenda_nombre}'`);
          return;
        }
      }
    }

    this.procesando.set(true);
    this.errorOperacion.set(null);

    const payload: DevolucionCreate = {
      venta_id: venta.id,
      sucursal_id: this.sucursalSeleccionadaId(),
      tipo: this.tipoOperacion(),
      motivo: this.motivoSeleccionado as any,
      metodo_reembolso: this.diferencia() === 0 ? 'NO_APLICA' : (this.metodoReembolso as any),
      observaciones: this.observaciones || undefined,
      detalles: itemsAProcesar.map(r => ({
        variante_devuelta_id: r.item.variante_id,
        cantidad_devuelta: r.cantidadDevolver,
        condicion_prenda: r.condicion,
        variante_cambio_id: this.tipoOperacion() === 'CAMBIO' ? r.varianteCambioId : null,
        cantidad_cambio: this.tipoOperacion() === 'CAMBIO' ? r.cantidadCambio : null
      }))
    };

    // CU20: Emisión formal de Nota de Devolución con balance atómico Bs. 0.00 (RN07, RN08)
    const payloadFormal: NotaDevolucionFormalCreate = {
      venta_id: venta.id,
      sucursal_id: this.sucursalSeleccionadaId(),
      motivo: this.motivoSeleccionado,
      observaciones: this.observaciones || undefined,
      detalles: itemsAProcesar.map(r => ({
        variante_devuelta_id: r.item.variante_id,
        cantidad_devuelta: r.cantidadDevolver,
        variante_entregada_id: r.varianteCambioId!,
        cantidad_entregada: r.cantidadCambio || 1,
        diferencia_monetaria: 0.0 // RN07
      }))
    };

    this.ventasService.emitirNotaDevolucionFormal(payloadFormal).subscribe({
      next: (resNota) => {
        this.procesando.set(false);
        this.notaFormalActiva.set(resNota);
        // Generar comprobante visual compatible
        const cCompat: any = {
          id: resNota.id,
          codigo: resNota.codigo_devolucion,
          tipo: 'CAMBIO',
          motivo: resNota.motivo,
          estado: resNota.estado,
          total_devuelto: 0,
          total_nuevo: 0,
          diferencia: 0,
          observaciones: resNota.observaciones,
          created_at: resNota.fecha_hora,
          venta: {
            codigo_venta: resNota.codigo_venta,
            cliente_nombre: resNota.cliente_nombre || 'Cliente Presencial'
          },
          detalles: resNota.detalles.map(d => ({
            cantidad_devuelta: d.cantidad_devuelta,
            precio_unitario_devuelto: 0,
            subtotal_devuelto: 0,
            condicion_prenda: 'APTO_PARA_VENTA',
            cantidad_cambio: d.cantidad_entregada,
            precio_unitario_cambio: 0,
            subtotal_cambio: 0,
            diferencia_linea: 0,
            variante_devuelta: {
              sku_variante: `DEV-${d.variante_devuelta_id}`,
              prenda: { nombre: d.prenda_devuelta_nombre || 'Prenda Devuelta' },
              talla: { nombre: d.talla_devuelta || 'Talla' }
            },
            variante_cambio: {
              sku_variante: `ENT-${d.variante_entregada_id}`,
              prenda: { nombre: d.prenda_entregada_nombre || 'Nueva Prenda' },
              talla: { nombre: d.talla_entregada || 'Talla' }
            }
          }))
        };
        this.comprobanteActivo.set(cCompat);
        this.cargarStockSucursal();
        this.cargarHistorial();
        this.buscarTicket();
      },
      error: (err) => {
        this.procesando.set(false);
        this.errorOperacion.set(err.error?.detail || 'Error al emitir la Nota de Devolución');
      }
    });
  }

  cargarHistorial(): void {
    const sucId = this.sucursalSeleccionadaId();
    this.ventasService.getNotasDevolucionFormales(sucId).subscribe({
      next: (notas) => this.historialNotas.set(notas),
      error: (err: any) => console.error('Error cargando notas DEV-YYYY', err)
    });
    this.cargarConflictos();
  }

  cargarConflictos(): void {
    this.ventasService.getConflictosInventario().subscribe({
      next: (res) => this.conflictos.set(res),
      error: (err: any) => console.error('Error cargando conflictos', err)
    });
  }

  abrirModalResolucion(conflicto: ConflictoInventarioResponse): void {
    this.conflictoSeleccionado.set(conflicto);
    this.accionResolucion = 'TRASPASO_INMEDIATO';
    this.observacionResolucion = '';
    this.mostrarModalResolucion.set(true);
  }

  cerrarModalResolucion(): void {
    this.mostrarModalResolucion.set(false);
    this.conflictoSeleccionado.set(null);
  }

  ejecutarResolucionConflicto(): void {
    const c = this.conflictoSeleccionado();
    if (!c || !this.observacionResolucion.trim()) return;

    this.resolviendoConflicto.set(true);
    const payload: ResolverConflictoRequest = {
      accion: this.accionResolucion,
      observaciones: this.observacionResolucion.trim(),
      sucursal_proveedora_id: this.accionResolucion === 'TRASPASO_INMEDIATO' ? 2 : undefined
    };

    this.ventasService.resolverConflicto(c.id, payload).subscribe({
      next: () => {
        this.resolviendoConflicto.set(false);
        this.cerrarModalResolucion();
        this.cargarConflictos();
        this.cargarStockSucursal();
      },
      error: (err) => {
        this.resolviendoConflicto.set(false);
        alert(err.error?.detail || 'Error al dirimir el conflicto de inventario');
      }
    });
  }


  verRecibo(dev: DevolucionResponse): void {
    this.comprobanteActivo.set(dev);
  }

  imprimirRecibo(): void {
    window.print();
  }
}
