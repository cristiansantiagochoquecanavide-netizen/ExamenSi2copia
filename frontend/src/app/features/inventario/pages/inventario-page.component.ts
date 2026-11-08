// ==============================================================================
// CASOS DE USO:
// - CU04: ADMINISTRAR SUCURSALES CON CONTROL DE LÍMITES
// - CU10: ADMINISTRAR EXISTENCIAS DE INVENTARIO POR SUCURSAL
// - CU11: CONSULTAR DISPONIBILIDAD DE INVENTARIO MULTI-SUCURSAL
// - CU12: SOLICITAR Y DESPACHAR TRASPASO DE INVENTARIO
// - CU13: CONFIRMAR RECEPCIÓN DE TRASPASO EN DESTINO
// - CU17: RESOLVER CONFLICTOS DE CONSISTENCIA DE INVENTARIO
// ROL: Encargado de Sucursal / Admin Tenant
// CAPA MVC: [VISTA & VIEWCONTROLLER ANGULAR]
// ==============================================================================

// ==============================================================================
// CASOS DE USO:
// - CU04: ADMINISTRAR SUCURSALES CON CONTROL DE LÍMITES
// - CU10: ADMINISTRAR EXISTENCIAS DE INVENTARIO POR SUCURSAL
// - CU11: CONSULTAR DISPONIBILIDAD DE INVENTARIO MULTI-SUCURSAL
// - CU12: SOLICITAR Y DESPACHAR TRASPASO DE INVENTARIO
// - CU13: CONFIRMAR RECEPCIÓN DE TRASPASO EN DESTINO
// - CU17: RESOLVER CONFLICTOS DE CONSISTENCIA DE INVENTARIO
// ROL: Encargado de Sucursal / Admin Tenant
// CAPA MVC: [VISTA & VIEWCONTROLLER ANGULAR]
// ==============================================================================

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { InventarioService } from '../services/inventario.service';
import { CatalogoService } from '../../catalogo/services/catalogo.service';
import { UsuariosService } from '../../usuarios/services/usuarios.service';
import {
  Ciudad, Sucursal, CiudadCreate, SucursalCreate, SucursalUpdate
} from '../models/inventario.models';
import {
  InventarioStock, AjusteInventarioRequest
} from '../../catalogo/models/catalogo.models';
import { UsuarioResponse } from '../../usuarios/models/usuarios.models';

@Component({
  selector: 'app-inventario-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="sucursales-container">
      <!-- Header Editorial -->
      <div class="header-section">
        <div class="eyebrow">
          <span class="gold-dot">&bull;</span>
          <span>EXPANSIÓN GEOGRÁFICA Y CONTROL DE INVENTARIO MULTISUCURSAL</span>
        </div>
        <h1 class="page-title">
          @if (activeTab() === 'STOCK') { Matriz de Stock por Tienda }
          @else if (activeTab() === 'SUCURSALES') { Sucursales Físicas }
          @else { Cobertura y Ciudades }
        </h1>
        <p class="subtitle">
          @if (activeTab() === 'STOCK') {
            Supervisión en tiempo real de existencias, reservas en probadores AR y umbrales de reabastecimiento por punto de venta.
          } @else if (activeTab() === 'SUCURSALES') {
            Administración de tiendas físicas, asignación de encargados y capacidad de probadores inteligentes.
          } @else {
            Configuración de plazas geográficas activas y centros de distribución logística.
          }
        </p>

        <!-- Tabs -->
        <div class="tabs-bar">
          <div class="tabs-left">
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'STOCK'"
              (click)="setTab('STOCK')"
            >
              MATRIZ DE STOCK POR TIENDA
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'SUCURSALES'"
              (click)="setTab('SUCURSALES')"
            >
              SUCURSALES FÍSICAS ({{ sucursales().length }})
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'CIUDADES'"
              (click)="setTab('CIUDADES')"
            >
              CIUDADES COBERTURA ({{ ciudades().length }})
            </button>
          </div>

          <div>
            @if (activeTab() === 'SUCURSALES') {
              <button type="button" class="btn-action-gold" (click)="openSucursalModal()">
                + REGISTRAR SUCURSAL
              </button>
            } @else if (activeTab() === 'CIUDADES') {
              <button type="button" class="btn-action-gold" (click)="openCiudadModal()">
                + REGISTRAR CIUDAD
              </button>
            } @else {
              <button type="button" class="btn-action-gold" (click)="openAjusteGenericoModal()">
                + AJUSTAR INVENTARIO
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Feedbacks -->
      @if (successMessage()) {
        <div class="alert-success">
          <span>&check; {{ successMessage() }}</span>
        </div>
      }
      @if (errorMessage()) {
        <div class="alert-error">
          <span>&excl; {{ errorMessage() }}</span>
        </div>
      }

      <!-- Loading General -->
      @if (isLoading()) {
        <div class="loading-box">
          <span class="spinner"></span>
          <span>CARGANDO DATOS DE INVENTARIO...</span>
        </div>
      }

      <!-- ========================================== -->
      <!-- TAB 1: MATRIZ DE STOCK POR TIENDA          -->
      <!-- ========================================== -->
      @if (!isLoading() && activeTab() === 'STOCK') {
        <div class="stock-tab-content">
          <!-- Control Panel -->
          <div class="stock-controls-panel">
            <div class="control-col">
              <label class="control-label">PUNTO DE VENTA / SUCURSAL</label>
              <select
                class="control-select"
                [ngModel]="selectedSucursalId()"
                (ngModelChange)="onSucursalChange($event)"
              >
                @for (s of sucursales(); track s.id) {
                  <option [value]="s.id">
                    {{ s.nombre }} — {{ s.ciudad?.nombre || 'Ciudad #' + s.ciudad_id }} {{ !s.activo ? '(INACTIVA)' : '' }}
                  </option>
                }
              </select>
            </div>

            <div class="control-col search-col">
              <label class="control-label">BUSCAR PRENDA O SKU</label>
              <div class="search-input-wrap">
                <input
                  type="text"
                  class="control-input"
                  placeholder="Ej: Camisa, Blazer, NOIR-6647..."
                  [ngModel]="stockSearchTerm()"
                  (ngModelChange)="stockSearchTerm.set($event)"
                  (keyup.escape)="stockSearchTerm.set('')"
                />
                @if (stockSearchTerm()) {
                  <button type="button" class="btn-clear-search" (click)="stockSearchTerm.set('')" title="Limpiar búsqueda">&times;</button>
                }
              </div>
            </div>

            <div class="control-col">
              <label class="control-label">FILTRAR DISPONIBILIDAD</label>
              <div class="filter-pills">
                <button
                  type="button"
                  class="filter-pill"
                  [class.active]="stockFilter() === 'ALL'"
                  (click)="stockFilter.set('ALL')"
                >
                  TODOS ({{ stockList().length }})
                </button>
                <button
                  type="button"
                  class="filter-pill warning"
                  [class.active]="stockFilter() === 'LOW'"
                  (click)="stockFilter.set('LOW')"
                >
                  BAJO STOCK ({{ totalBajoStock() }})
                </button>
                <button
                  type="button"
                  class="filter-pill danger"
                  [class.active]="stockFilter() === 'OUT'"
                  (click)="stockFilter.set('OUT')"
                >
                  AGOTADOS ({{ totalAgotadas() }})
                </button>
              </div>
            </div>

            <div class="control-col refresh-col">
              <button
                type="button"
                class="btn-refresh-stock"
                (click)="loadStockForSelectedSucursal()"
                title="Recargar inventario"
              >
                &#x21bb; REFRESCAR
              </button>
            </div>
          </div>

          <!-- KPI Cards -->
          <div class="stock-kpis-grid">
            <div class="kpi-card">
              <span class="kpi-label">STOCK TOTAL DISPONIBLE</span>
              <span class="kpi-value">{{ totalUnidades() }} <small>unid.</small></span>
              <span class="kpi-sub">Listas para despacho inmediato</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">UNIDADES RESERVADAS</span>
              <span class="kpi-value gold">{{ totalReservadas() }} <small>unid.</small></span>
              <span class="kpi-sub">Comprometidas en Probador AR / Web</span>
            </div>
            <div class="kpi-card" [class.alert-border]="totalBajoStock() > 0">
              <span class="kpi-label">ALERTAS DE REABASTECIMIENTO</span>
              <span class="kpi-value" [class.danger-val]="totalBajoStock() > 0">
                {{ totalBajoStock() }} <small>variantes</small>
              </span>
              <span class="kpi-sub">Existencias en o bajo el stock mínimo</span>
            </div>
            <div class="kpi-card" [class.danger-border]="totalAgotadas() > 0">
              <span class="kpi-label">VARIANTES AGOTADAS</span>
              <span class="kpi-value" [class.danger-val]="totalAgotadas() > 0">
                {{ totalAgotadas() }} <small>variantes</small>
              </span>
              <span class="kpi-sub">Requieren recepción de lote urgente</span>
            </div>
          </div>

          <!-- Stock Table -->
          @if (isStockLoading()) {
            <div class="loading-box">
              <span class="spinner"></span>
              <span>CONSULTANDO STOCK DE LA TIENDA...</span>
            </div>
          } @else if (filteredStock().length === 0) {
            <div class="empty-stock-box">
              <div class="empty-icon">&#128230;</div>
              <h3 class="empty-title">Sin registros de stock coincidentes</h3>
              <p class="empty-desc">
                @if (stockSearchTerm().trim()) {
                  No se encontraron prendas ni variantes para la búsqueda "<strong>{{ stockSearchTerm() }}</strong>".
                } @else {
                  No se encontraron variantes con los filtros seleccionados para esta sucursal.
                }
              </p>
              @if (stockSearchTerm().trim() || stockFilter() !== 'ALL') {
                <button type="button" class="btn-clear-search-empty" (click)="resetStockFilters()">
                  Restablecer búsqueda y filtros
                </button>
              }
            </div>
          } @else {
            <div class="table-card">
              <table class="stock-table">
                <thead>
                  <tr>
                    <th>PRENDA / PRODUCTO</th>
                    <th>SKU VARIANTE</th>
                    <th>COLOR</th>
                    <th>TALLA</th>
                    <th class="text-center">DISPONIBLE</th>
                    <th class="text-center">RESERVADO</th>
                    <th class="text-center">MÍNIMO</th>
                    <th class="text-center">ESTADO</th>
                    <th class="text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of filteredStock(); track item.id) {
                    <tr>
                      <td class="product-cell">
                        <div class="product-name">
                          {{ item.variante?.prenda?.nombre || 'Prenda #' + item.variante?.prenda_id }}
                        </div>
                        <div class="product-sku">
                          {{ item.variante?.prenda?.sku || 'SKU BASE' }}
                        </div>
                      </td>
                      <td>
                        <span class="variant-sku">{{ item.variante?.sku_variante }}</span>
                      </td>
                      <td>
                        <div class="color-wrap">
                          <span
                            class="color-dot"
                            [style.background-color]="item.variante?.color?.codigo_hex || '#777777'"
                          ></span>
                          <span>{{ item.variante?.color?.nombre || 'Color #' + item.variante?.color_id }}</span>
                        </div>
                      </td>
                      <td>
                        <span class="talla-badge">{{ item.variante?.talla?.codigo || 'N/A' }}</span>
                      </td>
                      <td class="text-center">
                        <span class="stock-num bold" [class.zero-stock]="item.cantidad_disponible === 0">
                          {{ item.cantidad_disponible }}
                        </span>
                      </td>
                      <td class="text-center">
                        <span class="stock-num" [class.has-reserved]="item.cantidad_reservada > 0">
                          {{ item.cantidad_reservada }}
                        </span>
                      </td>
                      <td class="text-center">
                        <span class="stock-num muted-num">{{ item.stock_minimo }}</span>
                      </td>
                      <td class="text-center">
                        @if (item.cantidad_disponible === 0) {
                          <span class="status-pill-out">AGOTADO</span>
                        } @else if (item.cantidad_disponible <= item.stock_minimo) {
                          <span class="status-pill-low">BAJO STOCK</span>
                        } @else {
                          <span class="status-pill-ok">DISPONIBLE</span>
                        }
                      </td>
                      <td class="text-right">
                        <button
                          type="button"
                          class="btn-adjust-row"
                          (click)="openAjusteItemModal(item)"
                          title="Ajustar inventario de esta variante"
                        >
                          AJUSTAR
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

      <!-- ========================================== -->
      <!-- TAB 2: SUCURSALES FÍSICAS                  -->
      <!-- ========================================== -->
      @if (!isLoading() && activeTab() === 'SUCURSALES') {
        <!-- BANNER DE CUOTA DE SUCURSALES (CU04 / RN08) -->
        <div class="saas-quota-banner" [class.warning]="sucursales().length >= getLimiteSucursales()">
          <span class="material-symbols-outlined quota-icon">domain</span>
          <div class="quota-content">
            <div class="quota-top">
              <strong>Control de Cuota Multi-Tenant (CU04):</strong>
              <span>Plan {{ authService.currentTenant().planCodigo }} &bull; {{ sucursales().length }} de {{ getLimiteSucursales() }} sucursales utilizadas</span>
            </div>
            @if (sucursales().length >= getLimiteSucursales()) {
              <p class="quota-msg limit">
                Has alcanzado el límite máximo de sucursales permitidas para tu plan ({{ getLimiteSucursales() }} sucursales). 
                Para abrir nuevas tiendas físicas debes solicitar una ampliación de plan (Upgrade a Intermedio o VIP).
              </p>
            } @else {
              <p class="quota-msg ok">
                Tu plan te permite registrar {{ getLimiteSucursales() - sucursales().length }} sucursal(es) adicional(es) en este tenant.
              </p>
            }
          </div>
          <a routerLink="/saas" class="btn-quota-saas" title="Ver gestión del SaaS y suscripción">Ver Plan SaaS</a>
        </div>

        <div class="branches-grid">
          @for (s of sucursales(); track s.id) {
            <article class="branch-card">
              <div class="branch-card-header">
                <div>
                  <span class="city-tag">{{ s.ciudad?.nombre || 'Ciudad #' + s.ciudad_id }}</span>
                  <h3 class="branch-name">{{ s.nombre }}</h3>
                </div>
                <span class="status-indicator" [class.inactive]="!s.activo">
                  {{ s.activo ? 'OPERATIVA' : 'INACTIVA' }}
                </span>
              </div>

              <p class="branch-address">{{ s.direccion }}</p>

              <div class="branch-specs-box">
                <div class="spec-row">
                  <span class="spec-label">ENCARGADO:</span>
                  <span class="spec-val gold">{{ getEncargadoNombre(s.encargado_id) }}</span>
                </div>
                <div class="spec-row">
                  <span class="spec-label">HORARIO:</span>
                  <span class="spec-val">{{ s.horario_atencion || 'Lun - Sab: 10:00 - 21:00' }}</span>
                </div>
                <div class="spec-row">
                  <span class="spec-label">TELÉFONO:</span>
                  <span class="spec-val">{{ s.telefono || 'No registrado' }}</span>
                </div>
                <div class="spec-row">
                  <span class="spec-label">PROBADORES AR:</span>
                  <span class="spec-val">{{ s.capacidad_probadores }} cabinas</span>
                </div>
              </div>

              <div class="card-footer">
                <button type="button" class="btn-edit-branch" (click)="openEditSucursal(s)">
                  MODIFICAR SUCURSAL
                </button>
              </div>
            </article>
          }
        </div>
      }

      <!-- ========================================== -->
      <!-- TAB 3: CIUDADES COBERTURA                  -->
      <!-- ========================================== -->
      @if (!isLoading() && activeTab() === 'CIUDADES') {
        <div class="cities-grid">
          @for (c of ciudades(); track c.id) {
            <div class="city-card">
              <div class="city-identity">
                <span class="city-code">{{ c.codigo }}</span>
                <h3 class="city-name">{{ c.nombre }}</h3>
              </div>
              <div class="city-status">
                <span class="status-pill">{{ c.activo ? 'ACTIVA' : 'INACTIVA' }}</span>
              </div>
            </div>
          }
        </div>
      }

      <!-- ========================================== -->
      <!-- MODAL: AJUSTE DE INVENTARIO                -->
      <!-- ========================================== -->
      @if (isAjusteModalOpen()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal-container" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <span class="modal-eyebrow">CONTROL KARDEX DE INVENTARIO</span>
                <h2 class="modal-title">Ajuste de Stock por Sucursal</h2>
              </div>
              <button type="button" class="btn-close" (click)="closeModals()">&times;</button>
            </div>

            <form (ngSubmit)="submitAjuste()" class="modal-form">
              <div class="modal-body form-grid">
                <!-- Sucursal Info -->
                <div class="form-group full-span info-banner">
                  <span class="info-label">SUCURSAL DESTINO:</span>
                  <strong class="info-val">{{ getSelectedSucursalNombre() }}</strong>
                </div>

                <!-- Variante Info -->
                @if (selectedItemForAjuste(); as item) {
                  <div class="form-group full-span info-banner">
                    <span class="info-label">VARIANTE SELECCIONADA:</span>
                    <strong class="info-val">
                      {{ item.variante?.prenda?.nombre || 'Prenda' }} — {{ item.variante?.sku_variante }} ({{ item.variante?.color?.nombre }}, {{ item.variante?.talla?.codigo }})
                    </strong>
                    <span class="info-sub">Stock Disponible Actual: {{ item.cantidad_disponible }} un.</span>
                  </div>
                }

                <div class="form-group">
                  <label class="form-label">TIPO DE AJUSTE *</label>
                  <select [(ngModel)]="ajusteTipo" name="ajusteTipo" class="form-input">
                    <option value="AJUSTE_POSITIVO">AJUSTE POSITIVO (+ SUMAR STOCK)</option>
                    <option value="AJUSTE_NEGATIVO">AJUSTE NEGATIVO (- RESTAR STOCK / MERMA)</option>
                    <option value="INGRESO_INICIAL">INGRESO INICIAL</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">CANTIDAD DE UNIDADES *</label>
                  <input
                    type="number"
                    [(ngModel)]="ajusteCantidad"
                    name="ajusteCantidad"
                    min="1"
                    max="1000"
                    required
                    class="form-input"
                  />
                </div>

                <div class="form-group full-span">
                  <label class="form-label">MOTIVO DEL AJUSTE *</label>
                  <input
                    type="text"
                    [(ngModel)]="ajusteMotivo"
                    name="ajusteMotivo"
                    required
                    class="form-input"
                    placeholder="Ej: Conteo físico mensual, Merma de prendas, Devolución de bodega"
                  />
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-cancel" (click)="closeModals()">CANCELAR</button>
                <button
                  type="submit"
                  class="btn-save"
                  [disabled]="isSubmitting() || ajusteCantidad <= 0 || !ajusteMotivo"
                >
                  {{ isSubmitting() ? 'PROCESANDO...' : 'CONFIRMAR AJUSTE' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ========================================== -->
      <!-- MODAL: REGISTRAR / EDITAR SUCURSAL         -->
      <!-- ========================================== -->
      @if (isSucursalModalOpen()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal-container" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <span class="modal-eyebrow">{{ editingSucursalId() ? 'EDITAR SUCURSAL' : 'NUEVA SUCURSAL' }}</span>
                <h2 class="modal-title">{{ editingSucursalId() ? sNombre : 'Registrar Sucursal' }}</h2>
              </div>
              <button type="button" class="btn-close" (click)="closeModals()">&times;</button>
            </div>

            <form (ngSubmit)="saveSucursal()" class="modal-form">
              <div class="modal-body form-grid">
                <div class="form-group full-span">
                  <label class="form-label">NOMBRE DE LA SUCURSAL</label>
                  <input type="text" [(ngModel)]="sNombre" name="sNombre" required class="form-input" placeholder="Sucursal Equipetrol" />
                </div>
                <div class="form-group full-span">
                  <label class="form-label">DIRECCIÓN FÍSICA</label>
                  <input type="text" [(ngModel)]="sDireccion" name="sDireccion" required class="form-input" placeholder="Av. San Martín #450" />
                </div>
                <div class="form-group">
                  <label class="form-label">CIUDAD</label>
                  <select [(ngModel)]="sCiudadId" name="sCiudadId" required class="form-input">
                    <option [ngValue]="null" disabled>Seleccionar Ciudad...</option>
                    @for (c of ciudades(); track c.id) {
                      <option [ngValue]="c.id">{{ c.nombre }} ({{ c.codigo }})</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">ENCARGADO DE SUCURSAL</label>
                  <select [(ngModel)]="sEncargadoId" name="sEncargadoId" class="form-input">
                    <option [ngValue]="null">Sin encargado asignado</option>
                    @for (u of encargadosDisponibles(); track u.id) {
                      <option [ngValue]="u.id">{{ u.nombre }} {{ u.apellido }} ({{ u.email }})</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">TELÉFONO DE CONTACTO</label>
                  <input type="text" [(ngModel)]="sTelefono" name="sTelefono" class="form-input" placeholder="+591 3 3456789" />
                </div>
                <div class="form-group">
                  <label class="form-label">CAPACIDAD PROBADORES</label>
                  <input type="number" [(ngModel)]="sCapacidad" name="sCapacidad" min="1" max="20" class="form-input" />
                </div>
                <div class="form-group full-span">
                  <label class="form-label">HORARIO DE ATENCIÓN</label>
                  <input type="text" [(ngModel)]="sHorario" name="sHorario" class="form-input" placeholder="Lun - Sab: 10:00 - 21:00" />
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-cancel" (click)="closeModals()">CANCELAR</button>
                <button type="submit" class="btn-save" [disabled]="isSubmitting() || !sNombre || !sCiudadId">
                  {{ isSubmitting() ? 'GUARDANDO...' : 'GUARDAR SUCURSAL' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ========================================== -->
      <!-- MODAL: REGISTRAR CIUDAD                    -->
      <!-- ========================================== -->
      @if (isCiudadModalOpen()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal-container sm" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <span class="modal-eyebrow">COBERTURA GEOGRÁFICA</span>
                <h2 class="modal-title">Registrar Ciudad</h2>
              </div>
              <button type="button" class="btn-close" (click)="closeModals()">&times;</button>
            </div>

            <form (ngSubmit)="saveCiudad()" class="modal-form">
              <div class="modal-body">
                <div class="form-group">
                  <label class="form-label">NOMBRE DE LA CIUDAD</label>
                  <input type="text" [(ngModel)]="cNombre" name="cNombre" required class="form-input" placeholder="Cochabamba" />
                </div>
                <div class="form-group" style="margin-top: 1rem;">
                  <label class="form-label">CÓDIGO IATA / ABREVIACIÓN</label>
                  <input type="text" [(ngModel)]="cCodigo" name="cCodigo" required maxlength="10" class="form-input" placeholder="CBB" />
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-cancel" (click)="closeModals()">CANCELAR</button>
                <button type="submit" class="btn-save" [disabled]="isSubmitting() || !cNombre || !cCodigo">
                  {{ isSubmitting() ? 'GUARDANDO...' : 'GUARDAR CIUDAD' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .sucursales-container {
      max-width: 1400px;
      margin: 0 auto;
      padding-bottom: 4rem;
      background-color: #ffffff;
      color: #111111;
    }

    .header-section {
      padding: 0.75rem 0 1.25rem 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      margin-bottom: 1.25rem;
    }

    .eyebrow {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.72rem;
      letter-spacing: 0.15em;
      color: #374151;
      font-weight: 700;
      margin-bottom: 0.35rem;
      text-transform: uppercase;
    }

    .gold-dot {
      color: #000000;
      font-size: 1.1rem;
    }

    .page-title {
      font-family: 'Inter', sans-serif;
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      text-transform: uppercase;
      color: #000000;
      margin-bottom: 0.35rem;
    }

    .subtitle {
      color: #4b5563;
      font-size: 0.88rem;
    }

    .tabs-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1.25rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .tabs-left {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .tab-btn {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.18);
      color: #4b5563;
      padding: 0.65rem 1.4rem;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      cursor: pointer;
      transition: all 0.2s ease;
      border-radius: 0;
    }

    .tab-btn:hover {
      background: #f3f4f6;
      color: #000000;
      border-color: #000000;
    }

    .tab-btn.active {
      background: #000000;
      border-color: #000000;
      color: #ffffff;
      font-weight: 700;
    }

    .btn-action-gold {
      background: #000000;
      color: #ffffff;
      border: 1px solid #000000;
      padding: 0.75rem 1.5rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      cursor: pointer;
      border-radius: 0;
      transition: all 0.2s ease;
    }

    .btn-action-gold:hover {
      background: #262626;
    }

    .alert-success {
      background: #ecfdf5;
      border: 1px solid #059669;
      color: #065f46;
      padding: 0.8rem 1.2rem;
      margin-bottom: 1.5rem;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .alert-error {
      background: #fef2f2;
      border: 1px solid #dc2626;
      color: #991b1b;
      padding: 0.8rem 1.2rem;
      margin-bottom: 1.5rem;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .loading-box {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 3rem;
      font-size: 0.8rem;
      letter-spacing: 0.15em;
      color: #6b7280;
    }

    .spinner {
      width: 1.5rem;
      height: 1.5rem;
      border: 2px solid #e5e7eb;
      border-top-color: #000000;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ========================================== */
    /* STOCK TAB STYLES                           */
    /* ========================================== */
    .stock-tab-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .stock-controls-panel {
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 1.25rem;
    }

    .control-col {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .control-col.search-col {
      flex: 1;
      min-width: 240px;
    }

    .control-col.refresh-col {
      margin-left: auto;
    }

    .control-label {
      font-size: 0.68rem;
      letter-spacing: 0.12em;
      color: #4b5563;
      font-weight: 700;
      text-transform: uppercase;
    }

    .control-select, .control-input {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #111111;
      padding: 0.6rem 0.85rem;
      font-size: 0.82rem;
      border-radius: 0;
      height: 38px;
    }

    .control-select:focus, .control-input:focus {
      outline: none;
      border-color: #000000;
    }

    .search-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-input-wrap .control-input {
      width: 100%;
      padding-right: 2rem;
    }

    .btn-clear-search {
      position: absolute;
      right: 0.5rem;
      background: transparent;
      border: none;
      font-size: 1.2rem;
      color: #9ca3af;
      cursor: pointer;
    }

    .btn-clear-search:hover {
      color: #111111;
    }

    .filter-pills {
      display: flex;
      gap: 0.4rem;
    }

    .filter-pill {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.18);
      color: #4b5563;
      padding: 0.5rem 0.85rem;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      cursor: pointer;
      border-radius: 0;
      transition: all 0.2s ease;
      height: 38px;
    }

    .filter-pill:hover {
      background: #f3f4f6;
      color: #000000;
    }

    .filter-pill.active {
      background: #000000;
      border-color: #000000;
      color: #ffffff;
      font-weight: 700;
    }

    .filter-pill.warning.active {
      background: #b45309;
      border-color: #b45309;
      color: #ffffff;
    }

    .filter-pill.danger.active {
      background: #b91c1c;
      border-color: #b91c1c;
      color: #ffffff;
    }

    .btn-refresh-stock {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #000000;
      padding: 0.5rem 1rem;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
      border-radius: 0;
      height: 38px;
      transition: all 0.2s ease;
    }

    .btn-refresh-stock:hover {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
    }

    /* KPI Cards */
    .stock-kpis-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem;
    }

    .kpi-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      border-radius: 0;
    }

    .kpi-card.alert-border {
      border-left: 4px solid #f59e0b;
    }

    .kpi-card.danger-border {
      border-left: 4px solid #ef4444;
    }

    .kpi-label {
      font-size: 0.68rem;
      letter-spacing: 0.15em;
      color: #6b7280;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }

    .kpi-value {
      font-size: 2rem;
      font-weight: 800;
      color: #000000;
      line-height: 1;
      font-family: 'Inter', sans-serif;
    }

    .kpi-value small {
      font-size: 0.9rem;
      font-weight: 500;
      color: #6b7280;
    }

    .kpi-value.gold {
      color: #c5a059;
    }

    .kpi-value.danger-val {
      color: #dc2626;
    }

    .kpi-sub {
      font-size: 0.75rem;
      color: #9ca3af;
      margin-top: 0.5rem;
    }

    /* Stock Table */
    .table-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      overflow-x: auto;
      border-radius: 0;
    }

    .stock-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
      text-align: left;
    }

    .stock-table th {
      background: #fafafa;
      padding: 0.85rem 1.25rem;
      font-size: 0.68rem;
      letter-spacing: 0.12em;
      font-weight: 700;
      color: #4b5563;
      text-transform: uppercase;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }

    .stock-table td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      vertical-align: middle;
    }

    .stock-table tr:hover {
      background: #fafafa;
    }

    .product-cell {
      max-width: 280px;
    }

    .product-name {
      font-weight: 700;
      color: #000000;
      font-size: 0.88rem;
    }

    .product-sku {
      font-size: 0.72rem;
      color: #6b7280;
      font-family: monospace;
      margin-top: 2px;
    }

    .variant-sku {
      font-family: monospace;
      font-weight: 600;
      color: #374151;
      font-size: 0.78rem;
      background: #f3f4f6;
      padding: 2px 6px;
    }

    .color-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .color-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 1px solid rgba(0, 0, 0, 0.2);
      flex-shrink: 0;
    }

    .talla-badge {
      display: inline-block;
      font-family: monospace;
      font-weight: 700;
      font-size: 0.75rem;
      padding: 2px 8px;
      background: #111111;
      color: #ffffff;
    }

    .stock-num {
      font-size: 0.95rem;
      font-family: 'Inter', monospace;
      color: #111111;
    }

    .stock-num.bold {
      font-weight: 700;
      font-size: 1.05rem;
    }

    .stock-num.zero-stock {
      color: #dc2626;
      font-weight: 800;
    }

    .stock-num.has-reserved {
      color: #c5a059;
      font-weight: 700;
    }

    .stock-num.muted-num {
      color: #9ca3af;
    }

    .status-pill-ok {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #065f46;
      background: #ecfdf5;
      border: 1px solid #10b981;
      padding: 3px 8px;
    }

    .status-pill-low {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #92400e;
      background: #fef3c7;
      border: 1px solid #f59e0b;
      padding: 3px 8px;
    }

    .status-pill-out {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #991b1b;
      background: #fef2f2;
      border: 1px solid #ef4444;
      padding: 3px 8px;
    }

    .btn-adjust-row {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.25);
      color: #000000;
      padding: 0.4rem 0.8rem;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      cursor: pointer;
      border-radius: 0;
      transition: all 0.2s ease;
    }

    .btn-adjust-row:hover {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }

    .empty-stock-box {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 4rem 2rem;
      text-align: center;
    }

    .empty-icon {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }

    .empty-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #000000;
      margin-bottom: 0.35rem;
    }

    .empty-desc {
      font-size: 0.85rem;
      color: #6b7280;
    }

    .btn-clear-search-empty {
      margin-top: 1rem;
      background: #0f172a;
      color: #ffffff;
      border: none;
      padding: 0.6rem 1.4rem;
      border-radius: 6px;
      font-weight: 700;
      font-size: 0.82rem;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .btn-clear-search-empty:hover {
      background: #1e293b;
    }

    .info-banner {
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.08);
      padding: 0.85rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .info-label {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #6b7280;
    }

    .info-val {
      font-size: 0.9rem;
      color: #111111;
    }

    .info-sub {
      font-size: 0.75rem;
      color: #4b5563;
      margin-top: 2px;
    }

    /* ========================================== */
    /* SUCURSALES & CIUDADES GRIDS               */
    /* ========================================== */
    .branches-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.5rem;
    }

    .branch-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      border-radius: 0;
      transition: all 0.2s ease;
    }

    .branch-card:hover {
      border-color: rgba(0, 0, 0, 0.3);
    }

    .branch-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .city-tag {
      font-size: 0.65rem;
      letter-spacing: 0.15em;
      color: #374151;
      text-transform: uppercase;
      font-weight: 700;
    }

    .branch-name {
      font-family: 'Inter', sans-serif;
      font-size: 1.35rem;
      font-weight: 700;
      color: #000000;
      margin-top: 2px;
    }

    .status-indicator {
      font-size: 0.62rem;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      font-weight: 700;
      padding: 2px 7px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border-radius: 0;
    }

    .status-indicator.inactive {
      background: #fef2f2;
      border-color: #fecaca;
      color: #991b1b;
    }

    .branch-address {
      font-size: 0.85rem;
      color: #4b5563;
      margin-bottom: 1.25rem;
      line-height: 1.4;
    }

    .branch-specs-box {
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.08);
      padding: 1rem;
      margin-bottom: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      border-radius: 0;
    }

    .spec-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
    }

    .spec-label {
      color: #6b7280;
      letter-spacing: 0.08em;
      font-weight: 600;
      text-transform: uppercase;
    }

    .spec-val {
      color: #111111;
      font-weight: 700;
    }

    .spec-val.gold {
      color: #000000;
      font-weight: 700;
    }

    .card-footer {
      padding-top: 1rem;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
    }

    .btn-edit-branch {
      width: 100%;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.25);
      color: #000000;
      padding: 0.65rem;
      font-size: 0.72rem;
      letter-spacing: 0.15em;
      font-weight: 700;
      text-transform: uppercase;
      cursor: pointer;
      border-radius: 0;
      transition: all 0.2s ease;
    }

    .btn-edit-branch:hover {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
    }

    /* Cities Grid */
    .cities-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    .city-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 0;
    }

    .city-code {
      font-size: 0.7rem;
      font-family: monospace;
      color: #6b7280;
      font-weight: 700;
      display: block;
    }

    .city-name {
      font-family: 'Inter', sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      color: #000000;
    }

    .status-pill {
      font-size: 0.65rem;
      color: #166534;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 2px 7px;
      font-weight: 700;
      border-radius: 0;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .modal-container {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      max-width: 720px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      border-radius: 12px;
      overflow: hidden;
      box-sizing: border-box;
    }

    .modal-container.sm {
      max-width: 480px;
    }

    .modal-header {
      padding: 24px 28px 18px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: #ffffff;
    }

    .modal-eyebrow {
      font-size: 0.72rem;
      letter-spacing: 0.12em;
      color: #374151;
      font-weight: 700;
      text-transform: uppercase;
      display: block;
      margin-bottom: 4px;
    }

    .modal-title {
      font-family: 'Inter', sans-serif;
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.01em;
      margin: 0;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 1.6rem;
      cursor: pointer;
      line-height: 1;
      padding: 2px 6px;
      border-radius: 4px;
      transition: color 0.15s ease;
    }

    .btn-close:hover {
      color: #0f172a;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex: 1;
    }

    .modal-body {
      padding: 24px 28px;
      overflow-y: auto;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }

    .full-span {
      grid-column: span 2;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 18px;
      width: 100%;
      box-sizing: border-box;
    }

    .form-label {
      font-size: 0.76rem;
      letter-spacing: 0.06em;
      color: #374151;
      font-weight: 700;
      text-transform: uppercase;
      display: block;
      margin: 0;
    }

    .form-input {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #111827;
      padding: 0.5rem 0.85rem;
      font-size: 0.88rem;
      border-radius: 6px;
      height: 42px;
      min-height: 42px;
      width: 100%;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .form-input:hover {
      border-color: #94a3b8;
    }

    .form-input:focus {
      border-color: #000000;
      box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.12);
    }

    .modal-footer {
      padding: 18px 28px 24px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      box-sizing: border-box;
      background: #ffffff;
    }

    .btn-cancel {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 0.6rem 1.4rem;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      cursor: pointer;
      border-radius: 9999px;
      height: 42px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .btn-cancel:hover {
      background: #f8fafc;
      border-color: #94a3b8;
      color: #0f172a;
    }

    .btn-save {
      background: #000000;
      color: #ffffff;
      border: 1px solid #000000;
      padding: 0.6rem 1.6rem;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      cursor: pointer;
      border-radius: 9999px;
      height: 42px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-transform: uppercase;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
      transition: all 0.15s ease;
    }

    .btn-save:hover:not(:disabled) {
      background: #262626;
      transform: translateY(-1px);
    }
  
    .saas-quota-banner {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 2rem;
    }
    .saas-quota-banner.warning {
      background: #fff1f2;
      border-color: #fecdd3;
    }
    .quota-icon {
      font-size: 2.2rem;
    }
    .quota-content {
      flex-grow: 1;
    }
    .quota-top {
      display: flex;
      gap: 0.75rem;
      align-items: baseline;
      margin-bottom: 0.35rem;
      font-size: 0.95rem;
    }
    .quota-msg {
      margin: 0;
      font-size: 0.85rem;
      color: #64748b;
    }
    .quota-msg.limit {
      color: #991b1b;
      font-weight: 600;
    }
    .quota-msg.ok {
      color: #166534;
      font-weight: 500;
    }
    .btn-quota-saas {
      background: #000;
      color: #fff;
      padding: 0.6rem 1.2rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 700;
      text-decoration: none;
      white-space: nowrap;
      transition: background 0.2s;
    }
    .btn-quota-saas:hover {
      background: #27272a;
    }
  `]
})
export class InventarioPageComponent implements OnInit {
  readonly authService = inject(AuthService);

  getLimiteSucursales(): number {
    const plan = this.authService.currentTenant().planCodigo;
    if (plan === 'BASICO') return 2;
    if (plan === 'INTERMEDIO') return 10;
    return 999;
  }

  private readonly inventarioService = inject(InventarioService);
  private readonly catalogoService = inject(CatalogoService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly sucursales = signal<Sucursal[]>([]);
  readonly ciudades = signal<Ciudad[]>([]);
  readonly personal = signal<UsuarioResponse[]>([]);
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly activeTab = signal<'STOCK' | 'SUCURSALES' | 'CIUDADES'>('STOCK');

  // Stock Tab State
  readonly stockList = signal<InventarioStock[]>([]);
  readonly isStockLoading = signal<boolean>(false);
  readonly selectedSucursalId = signal<number | null>(null);
  readonly stockSearchTerm = signal<string>('');
  readonly stockFilter = signal<'ALL' | 'LOW' | 'OUT'>('ALL');

  // Ajuste Modal State
  readonly isAjusteModalOpen = signal(false);
  readonly selectedItemForAjuste = signal<InventarioStock | null>(null);
  ajusteTipo: 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO' | 'INGRESO_INICIAL' = 'AJUSTE_POSITIVO';
  ajusteCantidad = 1;
  ajusteMotivo = 'Ajuste de inventario físico en tienda';

  // Modals Sucursal & Ciudad
  readonly isSucursalModalOpen = signal(false);
  readonly isCiudadModalOpen = signal(false);
  readonly editingSucursalId = signal<number | null>(null);

  // Form Sucursal
  sNombre = '';
  sDireccion = '';
  sTelefono = '';
  sHorario = '';
  sCapacidad = 3;
  sCiudadId: number | null = null;
  sEncargadoId: number | null = null;

  // Form Ciudad
  cNombre = '';
  cCodigo = '';

  readonly encargadosDisponibles = computed(() => {
    return this.personal().filter(u => u.tipo_usuario === 'PERSONAL');
  });

  resetStockFilters(): void {
    this.stockSearchTerm.set('');
    this.stockFilter.set('ALL');
  }

  // Filtered Stock Computed
  readonly filteredStock = computed(() => {
    const list = this.stockList();
    const term = this.stockSearchTerm().trim().toLowerCase();
    const filter = this.stockFilter();

    return list.filter(item => {
      const prendaNombre = (item.variante?.prenda?.nombre || '').toLowerCase();
      const prendaSKU = (item.variante?.prenda?.sku || '').toLowerCase();
      const prendaDesc = (item.variante?.prenda?.descripcion || '').toLowerCase();
      const varianteSKU = (item.variante?.sku_variante || '').toLowerCase();
      const colorNombre = (item.variante?.color?.nombre || '').toLowerCase();
      const tallaCodigo = (item.variante?.talla?.codigo || '').toLowerCase();
      const tallaDesc = (item.variante?.talla?.descripcion || '').toLowerCase();
      const barcode = (item.variante?.codigo_barras || '').toLowerCase();

      const matchesSearch = !term ||
        prendaNombre.includes(term) ||
        prendaSKU.includes(term) ||
        prendaDesc.includes(term) ||
        varianteSKU.includes(term) ||
        colorNombre.includes(term) ||
        tallaCodigo.includes(term) ||
        tallaDesc.includes(term) ||
        barcode.includes(term) ||
        term === String(item.variante?.prenda_id) ||
        term === String(item.variante_id);

      if (!matchesSearch) return false;

      if (filter === 'LOW') {
        return item.cantidad_disponible <= item.stock_minimo && item.cantidad_disponible > 0;
      }
      if (filter === 'OUT') {
        return item.cantidad_disponible === 0;
      }
      return true;
    });
  });

  // KPI Computeds
  readonly totalUnidades = computed(() => {
    return this.stockList().reduce((acc, curr) => acc + (curr.cantidad_disponible || 0), 0);
  });

  readonly totalReservadas = computed(() => {
    return this.stockList().reduce((acc, curr) => acc + (curr.cantidad_reservada || 0), 0);
  });

  readonly totalBajoStock = computed(() => {
    return this.stockList().filter(
      item => item.cantidad_disponible <= item.stock_minimo && item.cantidad_disponible > 0
    ).length;
  });

  readonly totalAgotadas = computed(() => {
    return this.stockList().filter(item => item.cantidad_disponible === 0).length;
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab === 'SUCURSALES') {
        this.activeTab.set('SUCURSALES');
      } else if (tab === 'CIUDADES') {
        this.activeTab.set('CIUDADES');
      } else if (tab === 'STOCK') {
        this.activeTab.set('STOCK');
      }
    });

    this.loadData();
  }

  setTab(tab: 'STOCK' | 'SUCURSALES' | 'CIUDADES'): void {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.inventarioService.getSucursales().subscribe({
      next: (sList) => {
        this.sucursales.set(sList);

        if (sList.length > 0 && !this.selectedSucursalId()) {
          this.selectedSucursalId.set(sList[0].id);
          this.loadStockForSelectedSucursal();
        } else if (this.selectedSucursalId()) {
          this.loadStockForSelectedSucursal();
        }

        this.inventarioService.getCiudades().subscribe({
          next: (cList) => {
            this.ciudades.set(cList);
            this.usuariosService.listar({ tipo_usuario: 'PERSONAL' }).subscribe({
              next: (pList) => {
                this.personal.set(pList);
                this.isLoading.set(false);
              },
              error: () => this.isLoading.set(false)
            });
          },
          error: (err) => {
            this.isLoading.set(false);
            this.errorMessage.set(err.error?.detail || 'Error al cargar ciudades.');
          }
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || 'Error al cargar sucursales.');
      }
    });
  }

  onSucursalChange(sucId: any): void {
    const numericId = Number(sucId);
    this.selectedSucursalId.set(numericId);
    this.loadStockForSelectedSucursal();
  }

  loadStockForSelectedSucursal(): void {
    const sucId = this.selectedSucursalId();
    if (!sucId) return;

    this.isStockLoading.set(true);
    this.catalogoService.getStockPorSucursal(sucId).subscribe({
      next: (data) => {
        this.stockList.set(data);
        this.isStockLoading.set(false);
      },
      error: (err) => {
        this.isStockLoading.set(false);
        this.errorMessage.set(err.error?.detail || 'Error al consultar stock de la sucursal.');
      }
    });
  }

  getSelectedSucursalNombre(): string {
    const id = this.selectedSucursalId();
    const suc = this.sucursales().find(s => s.id === id);
    return suc ? `${suc.nombre} (${suc.ciudad?.nombre || 'Sucursal #' + suc.id})` : 'Sucursal actual';
  }

  getEncargadoNombre(encargadoId?: number | null): string {
    if (!encargadoId) return 'Por asignar';
    const enc = this.personal().find(p => p.id === encargadoId);
    return enc ? `${enc.nombre} ${enc.apellido}` : `Personal #${encargadoId}`;
  }

  // --- MODALS STOCK ADJUSTMENT ---
  openAjusteGenericoModal(): void {
    if (this.filteredStock().length > 0) {
      this.openAjusteItemModal(this.filteredStock()[0]);
    } else if (this.stockList().length > 0) {
      this.openAjusteItemModal(this.stockList()[0]);
    }
  }

  openAjusteItemModal(item: InventarioStock): void {
    this.selectedItemForAjuste.set(item);
    this.ajusteTipo = 'AJUSTE_POSITIVO';
    this.ajusteCantidad = 1;
    this.ajusteMotivo = 'Ajuste de inventario físico en tienda';
    this.isAjusteModalOpen.set(true);
  }

  submitAjuste(): void {
    const item = this.selectedItemForAjuste();
    if (!item) return;

    this.isSubmitting.set(true);
    const payload: AjusteInventarioRequest = {
      variante_id: item.variante_id,
      sucursal_id: item.sucursal_id,
      tipo_movimiento: this.ajusteTipo,
      cantidad: this.ajusteCantidad,
      motivo: this.ajusteMotivo
    };

    this.catalogoService.ajustarInventario(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModals();
        this.successMessage.set(
          `Stock ajustado exitosamente para la variante '${item.variante?.sku_variante || ''}'.`
        );
        this.loadStockForSelectedSucursal();
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.detail || 'Error al procesar el ajuste de inventario.');
      }
    });
  }

  // --- MODALS SUCURSALES & CIUDADES ---
  openSucursalModal(): void {
    this.editingSucursalId.set(null);
    this.sNombre = '';
    this.sDireccion = '';
    this.sTelefono = '';
    this.sHorario = 'Lun - Sab: 10:00 - 21:00';
    this.sCapacidad = 3;
    this.sCiudadId = this.ciudades().length > 0 ? this.ciudades()[0].id : null;
    this.sEncargadoId = null;
    this.isSucursalModalOpen.set(true);
  }

  openEditSucursal(s: Sucursal): void {
    this.editingSucursalId.set(s.id);
    this.sNombre = s.nombre;
    this.sDireccion = s.direccion;
    this.sTelefono = s.telefono || '';
    this.sHorario = s.horario_atencion || '';
    this.sCapacidad = s.capacidad_probadores;
    this.sCiudadId = s.ciudad_id;
    this.sEncargadoId = s.encargado_id || null;
    this.isSucursalModalOpen.set(true);
  }

  openCiudadModal(): void {
    this.cNombre = '';
    this.cCodigo = '';
    this.isCiudadModalOpen.set(true);
  }

  closeModals(): void {
    this.isSucursalModalOpen.set(false);
    this.isCiudadModalOpen.set(false);
    this.isAjusteModalOpen.set(false);
    this.selectedItemForAjuste.set(null);
  }

  saveSucursal(): void {
    if (!this.sNombre || !this.sCiudadId) return;
    this.isSubmitting.set(true);

    const id = this.editingSucursalId();
    if (id) {
      const data: SucursalUpdate = {
        nombre: this.sNombre,
        direccion: this.sDireccion,
        telefono: this.sTelefono,
        horario_atencion: this.sHorario,
        capacidad_probadores: this.sCapacidad,
        ciudad_id: this.sCiudadId,
        encargado_id: this.sEncargadoId
      };
      this.inventarioService.updateSucursal(id, data).subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.closeModals();
          this.successMessage.set(`Sucursal '${res.nombre}' actualizada exitosamente.`);
          this.loadData();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.error?.detail || 'Error al actualizar sucursal.');
        }
      });
    } else {
      const data: SucursalCreate = {
        nombre: this.sNombre,
        direccion: this.sDireccion,
        telefono: this.sTelefono,
        horario_atencion: this.sHorario,
        capacidad_probadores: this.sCapacidad,
        ciudad_id: this.sCiudadId,
        encargado_id: this.sEncargadoId
      };
      this.inventarioService.createSucursal(data).subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.closeModals();
          this.successMessage.set(`Sucursal '${res.nombre}' registrada exitosamente.`);
          this.loadData();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.error?.detail || 'Error al registrar sucursal.');
        }
      });
    }
  }

  saveCiudad(): void {
    if (!this.cNombre || !this.cCodigo) return;
    this.isSubmitting.set(true);

    const data: CiudadCreate = {
      nombre: this.cNombre,
      codigo: this.cCodigo.toUpperCase()
    };
    this.inventarioService.createCiudad(data).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.closeModals();
        this.successMessage.set(`Ciudad '${res.nombre}' creada con éxito.`);
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.detail || 'Error al crear ciudad.');
      }
    });
  }
}
