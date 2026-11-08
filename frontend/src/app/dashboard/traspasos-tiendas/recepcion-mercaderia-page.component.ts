import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioService } from '../inventario-stock/inventario.service';
import { CatalogoService } from '../catalogo-prendas/catalogo.service';
import {
  Proveedor, ProveedorCreate, ProveedorUpdate,
  RecepcionMercaderiaResponse, RecepcionMercaderiaCreate, DetalleRecepcionCreate,
  Sucursal
} from '../inventario-stock/inventario.models';
import { Prenda } from '../catalogo-prendas/catalogo.models';

type TabType = 'PROVEEDORES' | 'RECEPCIONES';

interface LineaRecepcionForm {
  variante_id: number;
  cantidad: number;
  costo_unitario: number;
  subtotal: number;
}

@Component({
  selector: 'app-recepcion-mercaderia-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="cu8-container">
      <!-- Editorial Header -->
      <section class="editorial-hero">
        <div class="eyebrow">
          <span class="gold-dot">&bull;</span>
          <span>ABASTECIMIENTO &amp; KARDEX</span>
        </div>
        <h1 class="hero-title">Proveedores y Recepción</h1>
        <p class="hero-description">
          Gestión de suministradores textiles, ingreso formal de lotes de mercadería con comprobante fiscal e incremento atómico del inventario físico en Kardex.
        </p>

        <!-- Navigation Tabs & Actions -->
        <div class="tabs-bar">
          <div class="tabs-group">
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'PROVEEDORES'"
              (click)="activeTab.set('PROVEEDORES')"
            >
              PROVEEDORES ({{ proveedores().length }})
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'RECEPCIONES'"
              (click)="activeTab.set('RECEPCIONES')"
            >
              RECEPCIÓN DE MERCADERÍA / LOTES ({{ recepciones().length }})
            </button>
          </div>

          <div class="tab-action">
            @if (activeTab() === 'PROVEEDORES') {
              <button type="button" class="btn-gold" (click)="openProveedorModal()">
                + REGISTRAR PROVEEDOR
              </button>
            } @else {
              <button type="button" class="btn-gold" (click)="openNuevaRecepcionModal()">
                + REGISTRAR RECEPCIÓN (LOTE)
              </button>
            }
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

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="loading-state">
          <span class="spinner"></span>
          <span>SINCRONIZANDO CON FASTAPI...</span>
        </div>
      }

      <!-- ================= 1. PESTAÑA PROVEEDORES ================= -->
      @if (activeTab() === 'PROVEEDORES') {
        <div class="panel-card">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Directorio de Proveedores Textiles</h2>
              <span class="panel-hint">Empresas fabricantes, talleres de corte y distribuidores autorizados</span>
            </div>
            <div class="search-box">
              <input
                type="text"
                [ngModel]="searchProveedorQuery()"
                (ngModelChange)="searchProveedorQuery.set($event)"
                (keyup.escape)="searchProveedorQuery.set('')"
                placeholder="Buscar por razón social, NIT o contacto..."
                class="search-input"
              />
              @if (searchProveedorQuery()) {
                <button type="button" class="btn-clear-search-mini" (click)="searchProveedorQuery.set('')" title="Limpiar búsqueda">&times;</button>
              }
            </div>
          </div>

          <div class="table-wrap">
            <table class="noir-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>RAZÓN SOCIAL</th>
                  <th>NIT</th>
                  <th>CONTACTO</th>
                  <th>TELÉFONO / EMAIL</th>
                  <th>DIRECCIÓN</th>
                  <th>ESTADO</th>
                  <th class="text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                @for (p of filteredProveedores(); track p.id) {
                  <tr>
                    <td class="col-id">#{{ p.id }}</td>
                    <td class="col-strong">{{ p.razon_social }}</td>
                    <td><span class="nit-pill">{{ p.nit }}</span></td>
                    <td>{{ p.contacto_nombre || 'N/A' }}</td>
                    <td class="col-contact">
                      <div>{{ p.telefono || 'Sin teléfono' }}</div>
                      <div class="col-email">{{ p.email || 'Sin email' }}</div>
                    </td>
                    <td class="col-muted">{{ p.direccion || 'Sin dirección' }}</td>
                    <td>
                      <span class="status-dot" [class.active]="p.activo"></span>
                      <span class="status-text">{{ p.activo ? 'ACTIVO' : 'INACTIVO' }}</span>
                    </td>
                    <td class="text-right">
                      <div class="action-btn-group">
                        <button type="button" class="btn-action-ghost" (click)="openEditProveedorModal(p)">
                          Editar
                        </button>
                        <button type="button" class="btn-action-ghost" (click)="toggleProveedorActivo(p)">
                          {{ p.activo ? 'Desactivar' : 'Activar' }}
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" class="empty-msg">No se encontraron proveedores registrados.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- ================= 2. PESTAÑA RECEPCIONES DE MERCADERÍA ================= -->
      @if (activeTab() === 'RECEPCIONES') {
        <div class="panel-card">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Historial de Recepción de Mercadería</h2>
              <span class="panel-hint">Comprobantes de entrega, lotes procesados e incremento directo al inventario por sucursal</span>
            </div>
            <button type="button" class="btn-refresh" (click)="loadRecepciones()">
              &#x21bb; Actualizar
            </button>
          </div>

          <div class="table-wrap">
            <table class="noir-table">
              <thead>
                <tr>
                  <th>LOTE #</th>
                  <th>N° COMPROBANTE</th>
                  <th>PROVEEDOR</th>
                  <th>SUCURSAL DESTINO</th>
                  <th>FECHA RECEPCIÓN</th>
                  <th>ÍTEMS / PIEZAS</th>
                  <th>COSTO TOTAL</th>
                  <th class="text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                @for (r of recepciones(); track r.id) {
                  <tr>
                    <td class="col-id">#{{ r.id }}</td>
                    <td><span class="doc-badge">{{ r.numero_documento }}</span></td>
                    <td class="col-strong">{{ r.proveedor?.razon_social || 'Proveedor #' + r.proveedor_id }}</td>
                    <td>{{ r.sucursal?.nombre || 'Sucursal #' + r.sucursal_id }}</td>
                    <td class="col-muted">{{ r.fecha_recepcion }}</td>
                    <td>
                      <span class="items-count">{{ r.detalles.length }} variantes</span>
                    </td>
                    <td class="col-price">
                      <span class="currency">$</span>{{ r.costo_total | number:'1.2-2' }}
                    </td>
                    <td class="text-right">
                      <button type="button" class="btn-action-ghost" (click)="verDetalleRecepcion(r)">
                        Ver Lote &rarr;
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" class="empty-msg">No se registran recepciones de mercadería en el sistema.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- ================= MODAL REGISTRAR PROVEEDOR ================= -->
      @if (showProveedorModal()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3 class="modal-title">{{ editandoProveedorId ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor' }}</h3>
              <button type="button" class="btn-close" (click)="closeModals()">&times;</button>
            </div>
            <form (ngSubmit)="saveProveedor()" class="modal-body">
              <div class="form-group">
                <label>Razón Social Legal *</label>
                <input type="text" [(ngModel)]="proveedorForm.razon_social" name="razon_social" placeholder="Ej. Hilandería Andina S.A." required />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>NIT / RUC *</label>
                  <input type="text" [(ngModel)]="proveedorForm.nit" name="nit" placeholder="Ej. 1029384756" required />
                </div>
                <div class="form-group">
                  <label>Contacto Comercial</label>
                  <input type="text" [(ngModel)]="proveedorForm.contacto_nombre" name="contacto_nombre" placeholder="Ej. Lic. Carlos Vaca" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Teléfono</label>
                  <input type="text" [(ngModel)]="proveedorForm.telefono" name="telefono" placeholder="+591 3 3456789" />
                </div>
                <div class="form-group">
                  <label>Email de Cotizaciones</label>
                  <input type="email" [(ngModel)]="proveedorForm.email" name="email" placeholder="ventas@proveedor.com" />
                </div>
              </div>
              <div class="form-group">
                <label>Dirección de Fábrica / Almacén</label>
                <input type="text" [(ngModel)]="proveedorForm.direccion" name="direccion" placeholder="Parque Industrial Mz. 10" />
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-cancel" (click)="closeModals()">Cancelar</button>
                <button type="submit" class="btn-submit" [disabled]="!proveedorForm.razon_social || !proveedorForm.nit">
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ================= MODAL REGISTRAR RECEPCIÓN DE LOTE ================= -->
      @if (showRecepcionModal()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal-dialog-large" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-group">
                <span class="modal-eyebrow">INGRESO AL KARDEX DE SUCURSAL</span>
                <h3 class="modal-title">Recepción de Mercadería / Lote</h3>
              </div>
              <button type="button" class="btn-close" (click)="closeModals()">&times;</button>
            </div>
            <form (ngSubmit)="saveRecepcion()" class="modal-body-large">
              <!-- Datos de Cabecera -->
              <div class="form-row-3">
                <div class="form-group">
                  <label>Proveedor *</label>
                  <select [(ngModel)]="nuevaRecepcion.proveedor_id" name="proveedor_id" required>
                    @for (p of proveedores(); track p.id) {
                      <option [value]="p.id">{{ p.razon_social }} (NIT: {{ p.nit }})</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label>Sucursal Destino *</label>
                  <select [(ngModel)]="nuevaRecepcion.sucursal_id" name="sucursal_id" required>
                    @for (s of sucursales(); track s.id) {
                      <option [value]="s.id">{{ s.nombre }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label>N° Factura / Remisión *</label>
                  <input type="text" [(ngModel)]="nuevaRecepcion.numero_documento" name="numero_documento" placeholder="Ej. REM-2026-889" required />
                </div>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label>Fecha de Recepción</label>
                  <input type="date" [(ngModel)]="nuevaRecepcion.fecha_recepcion" name="fecha_recepcion" />
                </div>
                <div class="form-group">
                  <label>Observaciones / Nota de Entrega</label>
                  <input type="text" [(ngModel)]="nuevaRecepcion.observaciones" name="observaciones" placeholder="Lote verificado en muelle de descarga..." />
                </div>
              </div>

              <!-- Detalle de Líneas de Mercadería -->
              <div class="items-section">
                <div class="items-section-header">
                  <span class="section-badge">DESGLOSE DE PRENDAS DEL LOTE</span>
                  <button type="button" class="btn-add-line" (click)="agregarLinea()">
                    + Agregar Prenda
                  </button>
                </div>

                <div class="items-table-wrap">
                  <table class="items-table">
                    <thead>
                      <tr>
                        <th>PRENDA / VARIANTE *</th>
                        <th width="120">CANTIDAD *</th>
                        <th width="140">COSTO UNIT. ($) *</th>
                        <th width="120" class="text-right">SUBTOTAL</th>
                        <th width="60"></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (linea of lineasRecepcion; track $index) {
                        <tr>
                          <td>
                            <select [(ngModel)]="linea.variante_id" [name]="'variante_' + $index" (change)="calcularSubtotales()" required>
                              @for (p of prendas(); track p.id) {
                                <optgroup [label]="p.nombre">
                                  @for (v of p.variantes; track v.id) {
                                    <option [value]="v.id">
                                      {{ p.nombre }} &bull; Talla {{ v.talla?.codigo }} / {{ v.color?.nombre }} (SKU: {{ v.sku_variante }})
                                    </option>
                                  }
                                </optgroup>
                              }
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              [(ngModel)]="linea.cantidad"
                              [name]="'cantidad_' + $index"
                              (input)="calcularSubtotales()"
                              required
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              [(ngModel)]="linea.costo_unitario"
                              [name]="'costo_' + $index"
                              (input)="calcularSubtotales()"
                              required
                            />
                          </td>
                          <td class="text-right col-strong">
                            <span class="currency">$</span>{{ linea.subtotal | number:'1.2-2' }}
                          </td>
                          <td class="text-center">
                            @if (lineasRecepcion.length > 1) {
                              <button type="button" class="btn-remove-line" (click)="quitarLinea($index)">&times;</button>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <div class="lote-total-card">
                  <span class="total-label">COSTO TOTAL DEL LOTE:</span>
                  <span class="total-value"><span class="currency">$</span>{{ totalLote() | number:'1.2-2' }}</span>
                </div>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-cancel" (click)="closeModals()">Cancelar</button>
                <button type="submit" class="btn-submit" [disabled]="!nuevaRecepcion.numero_documento || lineasRecepcion.length === 0">
                  Confirmar Ingreso a Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ================= MODAL VER DETALLE DE RECEPCIÓN ================= -->
      @if (selectedRecepcion(); as rec) {
        <div class="modal-backdrop" (click)="selectedRecepcion.set(null)">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-group">
                <span class="modal-eyebrow">COMPROBANTE: {{ rec.numero_documento }}</span>
                <h3 class="modal-title">Detalle de Recepción #{{ rec.id }}</h3>
              </div>
              <button type="button" class="btn-close" (click)="selectedRecepcion.set(null)">&times;</button>
            </div>
            <div class="modal-body">
              <div class="detail-summary-grid">
                <div>
                  <span class="sum-label">PROVEEDOR:</span>
                  <div class="sum-val">{{ rec.proveedor?.razon_social }}</div>
                </div>
                <div>
                  <span class="sum-label">SUCURSAL DESTINO:</span>
                  <div class="sum-val">{{ rec.sucursal?.nombre }}</div>
                </div>
                <div>
                  <span class="sum-label">FECHA DE INGRESO:</span>
                  <div class="sum-val">{{ rec.fecha_recepcion }}</div>
                </div>
                <div>
                  <span class="sum-label">COSTO TOTAL:</span>
                  <div class="sum-val gold-val"><span class="currency">$</span>{{ rec.costo_total | number:'1.2-2' }}</div>
                </div>
              </div>

              @if (rec.observaciones) {
                <div class="obs-box">
                  <strong>Observaciones:</strong> {{ rec.observaciones }}
                </div>
              }

              <h4 class="items-title">Prendas Ingresadas al Kardex:</h4>
              <div class="items-mini-list">
                @for (d of rec.detalles; track d.id) {
                  <div class="item-mini-card">
                    <div>
                      <div class="item-prenda-name">
                        {{ getNombrePrenda(d.variante_id) || d.variante?.prenda?.nombre || 'Variante #' + d.variante_id }}
                      </div>
                      <div class="item-meta">
                        Talla: {{ d.variante?.talla?.codigo }} &bull; Color: {{ d.variante?.color?.nombre }} &bull; SKU: {{ d.variante?.sku_variante }}
                      </div>
                    </div>
                    <div class="item-price-side">
                      <span class="item-units">{{ d.cantidad }} uds.</span>
                      <span class="item-cost">&#64; <span class="currency">$</span>{{ d.costo_unitario | number:'1.2-2' }} = <span class="currency">$</span>{{ d.subtotal | number:'1.2-2' }}</span>
                    </div>
                  </div>
                }
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-submit" (click)="selectedRecepcion.set(null)">
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
    .cu8-container {
      padding: 2.5rem 3rem 4rem 3rem;
      max-width: 1440px;
      margin: 0 auto;
      color: #111111;
    }

    .editorial-hero {
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      padding-bottom: 2rem;
      margin-bottom: 2rem;
    }

    .eyebrow {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.72rem;
      letter-spacing: 0.25em;
      color: #4b5563;
      text-transform: uppercase;
      margin-bottom: 0.75rem;
      font-weight: 700;
    }

    .gold-dot {
      color: #000000;
    }

    .hero-title {
      font-family: 'Inter', sans-serif;
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0 0 0.75rem 0;
      color: #000000;
    }

    .hero-description {
      font-family: 'Inter', sans-serif;
      font-size: 0.95rem;
      color: #4b5563;
      max-width: 820px;
      line-height: 1.6;
      margin-bottom: 2rem;
    }

    .tabs-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .tabs-group {
      display: flex;
      gap: 0.5rem;
    }

    .tab-btn {
      background: transparent;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 0;
      color: #4b5563;
      padding: 0.75rem 1.25rem;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab-btn:hover {
      border-color: #000000;
      color: #000000;
    }

    .tab-btn.active {
      background: #000000;
      border-color: #000000;
      color: #ffffff;
    }

    .btn-gold {
      background: #000000;
      color: #ffffff;
      border: 1px solid #000000;
      border-radius: 0;
      padding: 0.75rem 1.5rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-gold:hover {
      background: #262626;
      border-color: #262626;
    }

    .btn-refresh {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #374151;
      padding: 0.45rem 0.85rem;
      font-size: 0.75rem;
      cursor: pointer;
      border-radius: 0;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    .btn-refresh:hover {
      border-color: #000000;
      color: #000000;
    }

    .feedback-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      padding: 0.85rem 1.25rem;
      margin-bottom: 1.5rem;
      font-size: 0.85rem;
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
      font-size: 1.2rem;
      cursor: pointer;
    }

    .loading-state {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1.5rem;
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.1);
      font-size: 0.8rem;
      letter-spacing: 0.15em;
      color: #000000;
      margin-bottom: 1.5rem;
      font-weight: 600;
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(0, 0, 0, 0.15);
      border-top-color: #000000;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .panel-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 1.75rem;
      border-radius: 0;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .panel-title {
      font-family: 'Inter', sans-serif;
      font-size: 1.35rem;
      font-weight: 700;
      margin: 0 0 0.35rem 0;
      color: #000000;
    }

    .panel-hint {
      font-size: 0.82rem;
      color: #4b5563;
    }

    .search-box {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    .search-box input {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #000000;
      padding: 0.5rem 2rem 0.5rem 0.85rem;
      font-size: 0.8rem;
      outline: none;
      min-width: 280px;
      border-radius: 0;
      transition: border-color 0.2s ease;
    }

    .search-box input:focus {
      border-color: #000000;
    }

    .btn-clear-search-mini {
      position: absolute;
      right: 0.5rem;
      background: none;
      border: none;
      color: #9ca3af;
      font-size: 1.15rem;
      cursor: pointer;
      line-height: 1;
      padding: 0;
    }

    .btn-clear-search-mini:hover {
      color: #111111;
    }

    .table-wrap {
      overflow-x: auto;
    }

    .noir-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      text-align: left;
    }

    .noir-table th {
      border-bottom: 2px solid rgba(0, 0, 0, 0.12);
      background: #f9fafb;
      padding: 0.85rem 1rem;
      font-size: 0.72rem;
      letter-spacing: 0.12em;
      color: #000000;
      font-weight: 700;
      text-transform: uppercase;
    }

    .noir-table td {
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      padding: 1rem;
      vertical-align: middle;
      color: #1f2937;
    }

    .noir-table tr:hover td {
      background: #f9fafb;
    }

    .col-id {
      color: #4b5563;
      font-family: monospace;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .col-strong {
      font-weight: 700;
      color: #000000;
    }

    .col-muted {
      color: #6b7280;
      font-size: 0.82rem;
    }

    .col-contact {
      font-size: 0.82rem;
      color: #111111;
    }

    .col-email {
      color: #6b7280;
      font-size: 0.75rem;
    }

    .col-price {
      font-weight: 700;
      color: #000000;
      font-size: 0.95rem;
    }

    .currency {
      color: #000000;
      margin-right: 2px;
      font-weight: 700;
    }

    .nit-pill {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      background: #f3f4f6;
      border: 1px solid rgba(0, 0, 0, 0.15);
      font-family: monospace;
      font-size: 0.78rem;
      color: #000000;
      font-weight: 700;
      border-radius: 0;
    }

    .doc-badge {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      background: #f3f4f6;
      border: 1px solid rgba(0, 0, 0, 0.15);
      color: #000000;
      font-weight: 700;
      font-size: 0.78rem;
      border-radius: 0;
    }

    .items-count {
      font-size: 0.75rem;
      color: #374151;
      background: #f3f4f6;
      padding: 0.2rem 0.5rem;
      border: 1px solid rgba(0, 0, 0, 0.12);
      font-weight: 600;
      border-radius: 0;
    }

    .status-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #9ca3af;
      margin-right: 0.45rem;
    }

    .status-dot.active {
      background: #16a34a;
      box-shadow: 0 0 6px rgba(22, 163, 74, 0.4);
    }

    .status-text {
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      color: #374151;
      font-weight: 600;
    }

    .action-btn-group {
      display: flex;
      gap: 0.4rem;
      justify-content: flex-end;
    }

    .btn-action-ghost {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #000000;
      padding: 0.4rem 0.75rem;
      font-size: 0.72rem;
      cursor: pointer;
      border-radius: 0;
      font-weight: 700;
      letter-spacing: 0.05em;
      transition: all 0.2s ease;
    }

    .btn-action-ghost:hover {
      border-color: #000000;
      background: #000000;
      color: #ffffff;
    }

    .text-right {
      text-align: right;
    }

    .text-center {
      text-align: center;
    }

    .empty-msg {
      text-align: center;
      padding: 2.5rem;
      color: #6b7280;
      font-size: 0.85rem;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-dialog {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 0;
      width: 90%;
      max-width: 560px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.2);
    }

    .modal-dialog-large {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 0;
      width: 92%;
      max-width: 900px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.2);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.75rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }

    .modal-eyebrow {
      font-size: 0.7rem;
      letter-spacing: 0.15em;
      color: #4b5563;
      display: block;
      margin-bottom: 0.25rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .modal-title {
      font-family: 'Inter', sans-serif;
      font-size: 1.35rem;
      font-weight: 700;
      margin: 0;
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

    .modal-body, .modal-body-large {
      padding: 1.75rem;
    }

    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-group label {
      display: block;
      font-size: 0.72rem;
      letter-spacing: 0.1em;
      color: #374151;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 0.45rem;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: 0;
      color: #000000;
      padding: 0.75rem;
      font-size: 0.85rem;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      border-color: #000000;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-row-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1rem;
    }

    /* Items section inside modal */
    .items-section {
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      border-radius: 0;
    }

    .items-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .section-badge {
      font-size: 0.72rem;
      letter-spacing: 0.15em;
      color: #000000;
      font-weight: 700;
      text-transform: uppercase;
    }

    .btn-add-line {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.25);
      color: #000000;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.35rem 0.75rem;
      cursor: pointer;
      border-radius: 0;
      transition: all 0.2s ease;
    }

    .btn-add-line:hover {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
    }

    .items-table-wrap {
      overflow-x: auto;
      margin-bottom: 1rem;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
    }

    .items-table th {
      color: #000000;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.5rem;
      text-align: left;
      border-bottom: 1px solid rgba(0, 0, 0, 0.15);
    }

    .items-table td {
      padding: 0.5rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      vertical-align: middle;
      color: #1f2937;
    }

    .items-table select,
    .items-table input {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #000000;
      padding: 0.45rem;
      font-size: 0.8rem;
      width: 100%;
      box-sizing: border-box;
      outline: none;
      border-radius: 0;
      transition: border-color 0.2s ease;
    }

    .items-table select:focus,
    .items-table input:focus {
      border-color: #000000;
    }

    .btn-remove-line {
      background: transparent;
      border: none;
      color: #dc2626;
      font-size: 1.2rem;
      cursor: pointer;
    }

    .lote-total-card {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
    }

    .total-label {
      font-size: 0.75rem;
      letter-spacing: 0.15em;
      color: #4b5563;
      font-weight: 700;
      text-transform: uppercase;
    }

    .total-value {
      font-size: 1.3rem;
      font-weight: 800;
      color: #000000;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .btn-cancel {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #374151;
      padding: 0.75rem 1.25rem;
      font-size: 0.75rem;
      font-weight: 700;
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
      padding: 0.75rem 1.5rem;
      font-weight: 700;
      font-size: 0.75rem;
      letter-spacing: 0.1em;
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

    /* Detail Modal Styles */
    .detail-summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
      background: #f9fafb;
      padding: 1.25rem;
      border: 1px solid rgba(0, 0, 0, 0.1);
      margin-bottom: 1.25rem;
    }

    .sum-label {
      font-size: 0.68rem;
      letter-spacing: 0.12em;
      color: #4b5563;
      display: block;
      margin-bottom: 0.2rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .sum-val {
      font-size: 0.95rem;
      color: #000000;
      font-weight: 700;
    }

    .gold-val {
      color: #000000;
      font-size: 1.2rem;
      font-weight: 800;
    }

    .obs-box {
      background: #f9fafb;
      border-left: 3px solid #000000;
      padding: 0.75rem 1rem;
      font-size: 0.8rem;
      color: #374151;
      margin-bottom: 1.25rem;
    }

    .items-title {
      font-size: 0.78rem;
      letter-spacing: 0.15em;
      color: #000000;
      margin: 0 0 0.75rem 0;
      font-weight: 700;
      text-transform: uppercase;
    }

    .items-mini-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 250px;
      overflow-y: auto;
      margin-bottom: 1.5rem;
    }

    .item-mini-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 0.75rem 1rem;
    }

    .item-prenda-name {
      font-weight: 700;
      font-size: 0.85rem;
      color: #000000;
    }

    .item-meta {
      font-size: 0.75rem;
      color: #6b7280;
      font-family: monospace;
      margin-top: 0.2rem;
    }

    .item-price-side {
      text-align: right;
    }

    .item-units {
      display: block;
      font-weight: 700;
      font-size: 0.85rem;
      color: #000000;
    }

    .item-cost {
      font-size: 0.75rem;
      color: #4b5563;
      font-weight: 600;
    }
  `]
})
export class RecepcionMercaderiaPageComponent implements OnInit {
  private readonly inventarioService = inject(InventarioService);
  private readonly catalogoService = inject(CatalogoService);

  activeTab = signal<TabType>('PROVEEDORES');
  isLoading = signal<boolean>(false);
  feedbackMsg = signal<string | null>(null);
  feedbackIsError = signal<boolean>(false);

  // Collections
  proveedores = signal<Proveedor[]>([]);
  recepciones = signal<RecepcionMercaderiaResponse[]>([]);
  sucursales = signal<Sucursal[]>([]);
  prendas = signal<Prenda[]>([]);

  // Search & Filter
  searchProveedorQuery = signal<string>('');
  filteredProveedores = computed(() => {
    const q = this.searchProveedorQuery().trim().toLowerCase();
    if (!q) return this.proveedores();
    return this.proveedores().filter(p => {
      const razon = (p.razon_social || '').toLowerCase();
      const nit = (p.nit || '').toLowerCase();
      const contacto = (p.contacto_nombre || '').toLowerCase();
      const tel = (p.telefono || '').toLowerCase();
      const email = (p.email || '').toLowerCase();
      const dir = (p.direccion || '').toLowerCase();
      const idStr = String(p.id);

      return (
        razon.includes(q) ||
        nit.includes(q) ||
        contacto.includes(q) ||
        tel.includes(q) ||
        email.includes(q) ||
        dir.includes(q) ||
        idStr === q ||
        `#${idStr}` === q
      );
    });
  });

  // Modals Visibility
  showProveedorModal = signal<boolean>(false);
  showRecepcionModal = signal<boolean>(false);
  selectedRecepcion = signal<RecepcionMercaderiaResponse | null>(null);

  // Proveedor Form
  editandoProveedorId: number | null = null;
  proveedorForm: ProveedorCreate = {
    razon_social: '',
    nit: '',
    contacto_nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    activo: true
  };

  // Recepción Form
  nuevaRecepcion: RecepcionMercaderiaCreate = {
    numero_documento: '',
    proveedor_id: 1,
    sucursal_id: 1,
    fecha_recepcion: new Date().toISOString().split('T')[0],
    observaciones: '',
    detalles: []
  };
  lineasRecepcion: LineaRecepcionForm[] = [];

  totalLote = computed(() => {
    return this.lineasRecepcion.reduce((acc, curr) => acc + curr.subtotal, 0);
  });

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loadProveedores();
    this.loadRecepciones();
    this.loadMetadata();
  }

  loadProveedores(): void {
    this.isLoading.set(true);
    this.inventarioService.getProveedores().subscribe({
      next: (data) => {
        this.proveedores.set(data);
        if (data.length > 0 && !this.nuevaRecepcion.proveedor_id) {
          this.nuevaRecepcion.proveedor_id = data[0].id;
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadRecepciones(): void {
    this.inventarioService.getRecepciones().subscribe({
      next: (data) => this.recepciones.set(data),
      error: () => {}
    });
  }

  loadMetadata(): void {
    this.inventarioService.getSucursales().subscribe({
      next: (data) => {
        this.sucursales.set(data);
        if (data.length > 0) this.nuevaRecepcion.sucursal_id = data[0].id;
      }
    });

    this.catalogoService.getPrendas().subscribe({
      next: (data) => {
        this.prendas.set(data);
      }
    });
  }

  // --- Proveedor Actions ---
  openProveedorModal(): void {
    this.editandoProveedorId = null;
    this.proveedorForm = {
      razon_social: '',
      nit: '',
      contacto_nombre: '',
      telefono: '',
      email: '',
      direccion: '',
      activo: true
    };
    this.showProveedorModal.set(true);
  }

  openEditProveedorModal(p: Proveedor): void {
    this.editandoProveedorId = p.id;
    this.proveedorForm = {
      razon_social: p.razon_social,
      nit: p.nit,
      contacto_nombre: p.contacto_nombre || '',
      telefono: p.telefono || '',
      email: p.email || '',
      direccion: p.direccion || '',
      activo: p.activo
    };
    this.showProveedorModal.set(true);
  }

  saveProveedor(): void {
    this.isLoading.set(true);
    if (this.editandoProveedorId) {
      this.inventarioService.updateProveedor(this.editandoProveedorId, this.proveedorForm).subscribe({
        next: (res) => {
          this.closeModals();
          this.showFeedback(`Proveedor '${res.razon_social}' actualizado correctamente.`);
          this.loadProveedores();
        },
        error: (err) => {
          this.isLoading.set(false);
          this.showFeedback(err.error?.detail || 'Error al actualizar proveedor.', true);
        }
      });
    } else {
      this.inventarioService.createProveedor(this.proveedorForm).subscribe({
        next: (res) => {
          this.closeModals();
          this.showFeedback(`Proveedor '${res.razon_social}' registrado en el sistema.`);
          this.loadProveedores();
        },
        error: (err) => {
          this.isLoading.set(false);
          this.showFeedback(err.error?.detail || 'Error al crear proveedor.', true);
        }
      });
    }
  }

  toggleProveedorActivo(p: Proveedor): void {
    this.inventarioService.updateProveedor(p.id, { activo: !p.activo }).subscribe({
      next: () => {
        this.showFeedback(`Estado del proveedor '${p.razon_social}' actualizado.`);
        this.loadProveedores();
      },
      error: (err) => this.showFeedback(err.error?.detail || 'Error al modificar estado.', true)
    });
  }

  // --- Recepción Actions ---
  openNuevaRecepcionModal(): void {
    const firstPrenda = this.prendas()[0];
    const firstVarId = firstPrenda?.variantes?.[0]?.id || 1;

    this.nuevaRecepcion = {
      numero_documento: `FAC-${Date.now().toString().slice(-4)}`,
      proveedor_id: this.proveedores()[0]?.id || 1,
      sucursal_id: this.sucursales()[0]?.id || 1,
      fecha_recepcion: new Date().toISOString().split('T')[0],
      observaciones: '',
      detalles: []
    };

    this.lineasRecepcion = [
      {
        variante_id: firstVarId,
        cantidad: 20,
        costo_unitario: 120.00,
        subtotal: 2400.00
      }
    ];

    this.showRecepcionModal.set(true);
  }

  agregarLinea(): void {
    const firstPrenda = this.prendas()[0];
    const firstVarId = firstPrenda?.variantes?.[0]?.id || 1;
    this.lineasRecepcion.push({
      variante_id: firstVarId,
      cantidad: 10,
      costo_unitario: 100.00,
      subtotal: 1000.00
    });
    this.calcularSubtotales();
  }

  quitarLinea(index: number): void {
    if (this.lineasRecepcion.length > 1) {
      this.lineasRecepcion.splice(index, 1);
      this.calcularSubtotales();
    }
  }

  calcularSubtotales(): void {
    for (const linea of this.lineasRecepcion) {
      linea.subtotal = (Number(linea.cantidad) || 0) * (Number(linea.costo_unitario) || 0);
    }
  }

  saveRecepcion(): void {
    if (this.lineasRecepcion.length === 0) return;

    this.isLoading.set(true);
    const payload: RecepcionMercaderiaCreate = {
      ...this.nuevaRecepcion,
      proveedor_id: Number(this.nuevaRecepcion.proveedor_id),
      sucursal_id: Number(this.nuevaRecepcion.sucursal_id),
      detalles: this.lineasRecepcion.map(l => ({
        variante_id: Number(l.variante_id),
        cantidad: Number(l.cantidad),
        costo_unitario: Number(l.costo_unitario)
      }))
    };

    this.inventarioService.createRecepcion(payload).subscribe({
      next: (rec) => {
        this.closeModals();
        this.showFeedback(`Lote #${rec.numero_documento} recibido con éxito. Stock de sucursal incrementado en Kardex.`);
        this.loadRecepciones();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showFeedback(err.error?.detail || 'Error al procesar la recepción de mercadería.', true);
      }
    });
  }

  getNombrePrenda(varianteId: number): string {
    for (const p of this.prendas()) {
      if (p.variantes && p.variantes.some(v => v.id === varianteId)) {
        return p.nombre;
      }
    }
    return '';
  }

  verDetalleRecepcion(r: RecepcionMercaderiaResponse): void {
    this.selectedRecepcion.set(r);
  }

  closeModals(): void {
    this.showProveedorModal.set(false);
    this.showRecepcionModal.set(false);
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
