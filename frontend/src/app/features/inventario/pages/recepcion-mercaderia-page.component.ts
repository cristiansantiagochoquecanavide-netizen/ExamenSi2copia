import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioService } from '../services/inventario.service';
import { CatalogoService } from '../../catalogo/services/catalogo.service';
import {
  Proveedor, ProveedorCreate, ProveedorUpdate,
  RecepcionMercaderiaResponse, RecepcionMercaderiaCreate, DetalleRecepcionCreate,
  Sucursal
} from '../models/inventario.models';
import { Prenda } from '../../catalogo/models/catalogo.models';

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
          <span>ABASTECIMIENTO &amp; KARDEX &bull; CASO DE USO #8</span>
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
                [(ngModel)]="searchProveedorQuery"
                placeholder="Buscar por razón social, NIT o contacto..."
                class="search-input"
              />
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
                <span class="modal-eyebrow">INGRESO AL KARDEX DE SUCURSAL &bull; CU8</span>
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
      color: #ffffff;
    }

    .editorial-hero {
      border-bottom: 1px solid #222222;
      padding-bottom: 2rem;
      margin-bottom: 2rem;
    }

    .eyebrow {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.72rem;
      letter-spacing: 0.25em;
      color: #d4af37;
      text-transform: uppercase;
      margin-bottom: 0.75rem;
    }

    .gold-dot {
      color: #d4af37;
    }

    .hero-title {
      font-family: 'Bodoni Moda', serif;
      font-size: 2.75rem;
      font-weight: 400;
      letter-spacing: 0.05em;
      margin: 0 0 0.75rem 0;
    }

    .hero-description {
      font-family: 'Inter', sans-serif;
      font-size: 0.95rem;
      color: #888888;
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
      border: 1px solid #2a2a2a;
      border-radius: 0;
      color: #777777;
      padding: 0.75rem 1.25rem;
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.15em;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab-btn:hover {
      border-color: #555555;
      color: #cccccc;
    }

    .tab-btn.active {
      background: #111111;
      border-color: #d4af37;
      color: #d4af37;
    }

    .btn-gold {
      background: #d4af37;
      color: #000000;
      border: 1px solid #d4af37;
      border-radius: 0;
      padding: 0.75rem 1.5rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-gold:hover {
      background: #b89628;
    }

    .btn-refresh {
      background: transparent;
      border: 1px solid #333333;
      color: #888888;
      padding: 0.45rem 0.85rem;
      font-size: 0.75rem;
      cursor: pointer;
      border-radius: 0;
    }

    .btn-refresh:hover {
      border-color: #d4af37;
      color: #ffffff;
    }

    .feedback-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #002b11;
      border: 1px solid #00aa44;
      color: #7affaa;
      padding: 0.85rem 1.25rem;
      margin-bottom: 1.5rem;
      font-size: 0.85rem;
    }

    .feedback-banner.error {
      background: #2b0000;
      border-color: #aa0000;
      color: #ff7a7a;
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
      background: #0d0d0d;
      border: 1px solid #222222;
      font-size: 0.8rem;
      letter-spacing: 0.15em;
      color: #d4af37;
      margin-bottom: 1.5rem;
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid #222222;
      border-top-color: #d4af37;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .panel-card {
      background: #0a0a0a;
      border: 1px solid #1a1a1a;
      padding: 1.75rem;
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
      font-family: 'Bodoni Moda', serif;
      font-size: 1.4rem;
      font-weight: 400;
      margin: 0 0 0.35rem 0;
      color: #ffffff;
    }

    .panel-hint {
      font-size: 0.82rem;
      color: #777777;
    }

    .search-box input {
      background: #111111;
      border: 1px solid #282828;
      color: #ffffff;
      padding: 0.5rem 0.85rem;
      font-size: 0.8rem;
      outline: none;
      min-width: 280px;
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
      border-bottom: 1px solid #222222;
      padding: 0.85rem 1rem;
      font-size: 0.72rem;
      letter-spacing: 0.12em;
      color: #666666;
      font-weight: 600;
    }

    .noir-table td {
      border-bottom: 1px solid #161616;
      padding: 1rem;
      vertical-align: middle;
    }

    .col-id {
      color: #666666;
      font-family: monospace;
      font-size: 0.8rem;
    }

    .col-strong {
      font-weight: 600;
      color: #ffffff;
    }

    .col-muted {
      color: #888888;
      font-size: 0.82rem;
    }

    .col-contact {
      font-size: 0.82rem;
    }

    .col-email {
      color: #888888;
      font-size: 0.75rem;
    }

    .col-price {
      font-weight: 700;
      color: #ffffff;
      font-size: 0.95rem;
    }

    .currency {
      color: #d4af37;
      margin-right: 2px;
    }

    .nit-pill {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      background: #141414;
      border: 1px solid #333333;
      font-family: monospace;
      font-size: 0.78rem;
      color: #d4af37;
    }

    .doc-badge {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      background: #141005;
      border: 1px solid #6b5515;
      color: #f3e5ab;
      font-weight: 700;
      font-size: 0.78rem;
    }

    .items-count {
      font-size: 0.75rem;
      color: #aaaaaa;
      background: #181818;
      padding: 0.2rem 0.5rem;
      border: 1px solid #282828;
    }

    .status-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #444444;
      margin-right: 0.45rem;
    }

    .status-dot.active {
      background: #00cc66;
      box-shadow: 0 0 6px rgba(0, 204, 102, 0.4);
    }

    .status-text {
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      color: #aaaaaa;
    }

    .action-btn-group {
      display: flex;
      gap: 0.4rem;
      justify-content: flex-end;
    }

    .btn-action-ghost {
      background: transparent;
      border: 1px solid #333333;
      color: #999999;
      padding: 0.4rem 0.75rem;
      font-size: 0.72rem;
      cursor: pointer;
      border-radius: 0;
      transition: all 0.2s ease;
    }

    .btn-action-ghost:hover {
      border-color: #d4af37;
      color: #d4af37;
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
      color: #666666;
      font-size: 0.85rem;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-dialog {
      background: #0e0e0e;
      border: 1px solid #d4af37;
      border-radius: 0;
      width: 90%;
      max-width: 560px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.9);
    }

    .modal-dialog-large {
      background: #0e0e0e;
      border: 1px solid #d4af37;
      border-radius: 0;
      width: 92%;
      max-width: 900px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.9);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.75rem;
      border-bottom: 1px solid #222222;
    }

    .modal-eyebrow {
      font-size: 0.7rem;
      letter-spacing: 0.15em;
      color: #d4af37;
      display: block;
      margin-bottom: 0.25rem;
    }

    .modal-title {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.35rem;
      margin: 0;
      color: #ffffff;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: #888888;
      font-size: 1.5rem;
      cursor: pointer;
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
      color: #999999;
      text-transform: uppercase;
      margin-bottom: 0.45rem;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      background: #141414;
      border: 1px solid #2a2a2a;
      border-radius: 0;
      color: #ffffff;
      padding: 0.75rem;
      font-size: 0.85rem;
      outline: none;
      box-sizing: border-box;
    }

    .form-group input:focus,
    .form-group select:focus {
      border-color: #d4af37;
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
      background: #111111;
      border: 1px solid #222222;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
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
      color: #d4af37;
      font-weight: 700;
    }

    .btn-add-line {
      background: transparent;
      border: 1px solid #d4af37;
      color: #d4af37;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.35rem 0.75rem;
      cursor: pointer;
      border-radius: 0;
    }

    .btn-add-line:hover {
      background: #d4af37;
      color: #000;
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
      color: #777;
      font-size: 0.7rem;
      padding: 0.5rem;
      text-align: left;
      border-bottom: 1px solid #222;
    }

    .items-table td {
      padding: 0.5rem;
      border-bottom: 1px solid #1a1a1a;
      vertical-align: middle;
    }

    .items-table select,
    .items-table input {
      background: #181818;
      border: 1px solid #333;
      color: #fff;
      padding: 0.45rem;
      font-size: 0.8rem;
      width: 100%;
      box-sizing: border-box;
      outline: none;
    }

    .btn-remove-line {
      background: transparent;
      border: none;
      color: #ff6666;
      font-size: 1.2rem;
      cursor: pointer;
    }

    .lote-total-card {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid #222;
    }

    .total-label {
      font-size: 0.75rem;
      letter-spacing: 0.15em;
      color: #888;
    }

    .total-value {
      font-size: 1.3rem;
      font-weight: 700;
      color: #ffffff;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .btn-cancel {
      background: transparent;
      border: 1px solid #333333;
      color: #888888;
      padding: 0.75rem 1.25rem;
      font-size: 0.75rem;
      cursor: pointer;
      border-radius: 0;
    }

    .btn-submit {
      background: #d4af37;
      border: 1px solid #d4af37;
      color: #000000;
      padding: 0.75rem 1.5rem;
      font-weight: 700;
      font-size: 0.75rem;
      letter-spacing: 0.1em;
      cursor: pointer;
      border-radius: 0;
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
      background: #141414;
      padding: 1.25rem;
      border: 1px solid #222;
      margin-bottom: 1.25rem;
    }

    .sum-label {
      font-size: 0.68rem;
      letter-spacing: 0.12em;
      color: #777;
      display: block;
      margin-bottom: 0.2rem;
    }

    .sum-val {
      font-size: 0.95rem;
      color: #fff;
      font-weight: 600;
    }

    .gold-val {
      color: #d4af37;
      font-size: 1.2rem;
    }

    .obs-box {
      background: #111;
      border-left: 2px solid #d4af37;
      padding: 0.75rem 1rem;
      font-size: 0.8rem;
      color: #aaa;
      margin-bottom: 1.25rem;
    }

    .items-title {
      font-size: 0.78rem;
      letter-spacing: 0.15em;
      color: #d4af37;
      margin: 0 0 0.75rem 0;
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
      background: #141414;
      border: 1px solid #222;
      padding: 0.75rem 1rem;
    }

    .item-prenda-name {
      font-weight: 600;
      font-size: 0.85rem;
      color: #fff;
    }

    .item-meta {
      font-size: 0.75rem;
      color: #777;
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
      color: #d4af37;
    }

    .item-cost {
      font-size: 0.75rem;
      color: #888;
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
  searchProveedorQuery = '';
  filteredProveedores = computed(() => {
    const q = this.searchProveedorQuery.trim().toLowerCase();
    if (!q) return this.proveedores();
    return this.proveedores().filter(p =>
      p.razon_social.toLowerCase().includes(q) ||
      p.nit.toLowerCase().includes(q) ||
      (p.contacto_nombre && p.contacto_nombre.toLowerCase().includes(q))
    );
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
