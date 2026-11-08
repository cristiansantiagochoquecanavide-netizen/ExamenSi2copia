// ==============================================================================
// CASO DE USO: CU14 - REGISTRAR RESERVA PARA ENSAYO EN TIENDA / PROBADOR
// ROL: Cliente / Vendedor
// CAPA MVC: [VISTA & VIEWCONTROLLER ANGULAR]
// ==============================================================================

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ReservasService } from './reservas.service';
import { InventarioService } from '../inventario-stock/inventario.service';
import { CatalogoService } from '../catalogo-prendas/catalogo.service';
import { Reserva, ReservaCreate, DetalleReservaCreate } from './reservas.models';
import { Sucursal, Ciudad } from '../inventario-stock/inventario.models';
import { Prenda, PrendaVariante, InventarioStock } from '../catalogo-prendas/catalogo.models';
import { environment } from '../../../environments/environment';
import { NotificacionesService } from '../difusion-campanas/notificaciones.service';

interface PrendaEnReserva {
  prenda: Prenda;
  variante: PrendaVariante;
  cantidad: number;
}

@Component({
  selector: 'app-reservas-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="atelier-reservas-container">
      <!-- HEADER -->
      <header class="reservas-header">
        <div class="header-titles">
          <div class="subtitle-badge">ATELIER NOIR &bull; RESERVA DE VESTIDOR</div>
          <h1>Reservas para Probador en Boutique</h1>
          <p class="description">
            Apartá prendas exclusivas de alta costura para probarlas en tu boutique favorita con fecha y turno agendado.
          </p>
        </div>
        <div class="header-actions">
          <div class="tabs-switcher">
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab === 'agendar'"
              (click)="activeTab = 'agendar'">
              Agendar Probador
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab === 'mis-reservas'"
              (click)="cambiarAMisReservas()">
              Mis Reservas
            </button>
          </div>
        </div>
      </header>

      <!-- MENSAJES TOAST -->
      <div *ngIf="mensajeExito" class="toast-banner success">
        <span class="toast-icon">&#10003;</span>
        <div class="toast-body">
          <strong>Reserva Confirmada</strong>
          <span>{{ mensajeExito }}</span>
        </div>
        <button type="button" class="btn-close-toast" (click)="mensajeExito = null">&times;</button>
      </div>

      <div *ngIf="mensajeError" class="toast-banner error">
        <span class="toast-icon">&#9888;</span>
        <div class="toast-body">
          <strong>Error en la Reserva</strong>
          <span>{{ mensajeError }}</span>
        </div>
        <button type="button" class="btn-close-toast" (click)="mensajeError = null">&times;</button>
      </div>

      <!-- TAB 1: AGENDAR PROBADOR -->
      <main *ngIf="activeTab === 'agendar'" class="agendar-layout">
        <!-- COLUMNA IZQUIERDA: PARÁMETROS DE CITA & SUCURSAL -->
        <section class="atelier-card step-card">
          <div class="card-header">
            <h3>1. Boutique &amp; Turno de Visita</h3>
            <span class="gold-pill">Paso 1</span>
          </div>

          <div class="form-grid">
            <!-- CIUDAD / DEPARTAMENTO (MACRO FILTRO) -->
            <div class="form-group">
              <label>1. Ciudad / Departamento</label>
              <select
                [(ngModel)]="ciudadSeleccionadaId"
                (change)="onCiudadChange()"
                class="atelier-select">
                <option [ngValue]="null">-- Todas las ciudades --</option>
                <option *ngFor="let c of ciudadesList" [ngValue]="c.id">
                  {{ c.nombre }} ({{ c.codigo }})
                </option>
              </select>
            </div>

            <!-- SUCURSAL / BOUTIQUE (MICRO SELECCIÓN) -->
            <div class="form-group">
              <label>2. Boutique / Sucursal *</label>
              <select
                [(ngModel)]="sucursalSeleccionadaId"
                (change)="onSucursalChange()"
                class="atelier-select">
                <option [ngValue]="null">-- Elegir boutique --</option>
                <option *ngFor="let s of sucursalesFiltradas" [ngValue]="s.id">
                  {{ s.nombre }} — {{ getCiudadNombre(s) }} ({{ s.direccion }})
                </option>
              </select>
            </div>

            <!-- DETALLES SUCURSAL SELECCIONADA -->
            <div *ngIf="sucursalActual" class="sucursal-info-box full-width">
              <div class="info-line">
                <span class="lbl">&#127961;&#65039; Ciudad / Departamento:</span>
                <span class="val font-bold highlight-gold">{{ getCiudadNombre(sucursalActual) }}</span>
              </div>
              <div class="info-line">
                <span class="lbl">&#128205; Dirección:</span>
                <span class="val">{{ sucursalActual.direccion }}</span>
              </div>
              <div class="info-line">
                <span class="lbl">&#9200; Horario:</span>
                <span class="val">{{ sucursalActual.horario_atencion || '10:00 - 20:00' }}</span>
              </div>
              <div class="info-line">
                <span class="lbl">&#128085; Capacidad Vestidores:</span>
                <span class="val highlight-gold">{{ sucursalActual.capacidad_probadores }} probadores disponibles</span>
              </div>
            </div>

            <!-- FECHA -->
            <div class="form-group">
              <label>Fecha de la Cita *</label>
              <input
                type="date"
                [(ngModel)]="fechaReserva"
                [min]="hoyStr"
                class="atelier-input">
            </div>

            <!-- HORA / TURNO -->
            <div class="form-group">
              <label>Hora Estimada *</label>
              <select [(ngModel)]="horaEstimada" class="atelier-select">
                <option value="10:00">10:00 AM (Mañana)</option>
                <option value="11:30">11:30 AM (Mañana)</option>
                <option value="14:00">02:00 PM (Tarde)</option>
                <option value="15:30">03:30 PM (Tarde)</option>
                <option value="17:00">05:00 PM (Tarde)</option>
                <option value="18:30">06:30 PM (Noche)</option>
                <option value="19:30">07:30 PM (Noche)</option>
              </select>
            </div>

            <!-- ANTICIPO / GARANTÍA OPCIONAL -->
            <div class="form-group">
              <label>Anticipo de Garantía (Opcional)</label>
              <div class="input-currency-group">
                <span class="currency-label">{{ moneda === 'USD' ? '$' : 'Bs.' }}</span>
                <input
                  type="number"
                  step="5"
                  min="0"
                  [(ngModel)]="montoAnticipo"
                  class="atelier-input-amount"
                  placeholder="0.00">
              </div>
            </div>

            <div class="form-group">
              <label>Moneda</label>
              <select [(ngModel)]="moneda" class="atelier-select">
                <option value="BOB">BOB (Bs.)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>

            <!-- OBSERVACIONES -->
            <div class="form-group full-width">
              <label>Peticiones Especiales / Notas para el Asesor</label>
              <textarea
                [(ngModel)]="observaciones"
                rows="2"
                class="atelier-textarea"
                placeholder="Ej: Deseo probar con tacones negros, preparar probador VIP..."></textarea>
            </div>
          </div>
        </section>

        <!-- COLUMNA DERECHA: SELECCIÓN DE PRENDAS DEL CATÁLOGO & CARRITO -->
        <section class="atelier-card prendas-card">
          <div class="card-header">
            <h3>2. Prendas a Probarse</h3>
            <span class="gold-pill">Paso 2</span>
          </div>

          <div *ngIf="!sucursalSeleccionadaId" class="select-sucursal-notice">
            <span class="notice-icon">&#9754;</span>
            <p>Primero seleccioná una boutique en el Paso 1 para verificar las existencias físicas en tiempo real.</p>
          </div>

          <div *ngIf="sucursalSeleccionadaId">
            <!-- BUSCADOR RÁPIDO DE PRENDAS -->
            <div class="prendas-search-box">
              <input
                type="text"
                [(ngModel)]="busquedaPrenda"
                placeholder="Buscar prenda por nombre o código..."
                class="atelier-input">
            </div>

            <!-- GRILLA DE PRENDAS DISPONIBLES EN LA BOUTIQUE -->
            <div class="prendas-selector-list">
              <div *ngFor="let p of prendasFiltradas()" class="prenda-mini-card">
                <div class="prenda-mini-thumb">
                  <img [src]="getPortadaUrl(p)" [alt]="p.nombre" class="thumb-img" (error)="onImgError($event)" />
                </div>
                <div class="prenda-mini-body">
                  <strong class="prenda-name">{{ p.nombre }}</strong>
                  <div class="prenda-meta">
                    <span class="prenda-price">{{ moneda === 'USD' ? '$' : 'Bs.' }} {{ p.precio_base | number:'1.2-2' }}</span>
                    <span class="prenda-cat">{{ p.categoria?.nombre || 'Alta Costura' }}</span>
                  </div>

                  <!-- SELECTOR DE VARIANTE (TALLA Y COLOR) -->
                  <div class="variante-picker-row" *ngIf="p.variantes && p.variantes.length > 0">
                    <select
                      #varianteSelect
                      class="atelier-select-mini">
                      <option
                        *ngFor="let v of p.variantes"
                        [value]="v.id">
                        Talla: {{ v.talla?.codigo || 'U' }} &bull; {{ v.color?.nombre || 'Color' }} (Stock: {{ getStockDisponible(v.id) }} uds)
                      </option>
                    </select>

                    <button
                      type="button"
                      class="btn-add-prenda"
                      (click)="agregarPrenda(p, +varianteSelect.value)">
                      + Apartar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- CESTA DE PRENDAS APARTADAS -->
            <div class="prendas-apartadas-box">
              <h4>Prendas en tu Cita de Probador ({{ prendasApartadas.length }})</h4>

              <div *ngIf="prendasApartadas.length === 0" class="empty-basket">
                <p>No has agregado prendas a tu cita todavía. Seleccioná arriba las piezas que deseas probarte.</p>
              </div>

              <div *ngIf="prendasApartadas.length > 0" class="basket-items-list">
                <div *ngFor="let item of prendasApartadas; let i = index" class="basket-item-row">
                  <img [src]="getPortadaUrl(item.prenda)" [alt]="item.prenda.nombre" class="basket-thumb-img" (error)="onImgError($event)" />
                  <div class="basket-item-info">
                    <strong>{{ item.prenda.nombre }}</strong>
                    <small class="basket-item-specs">
                      Talla: {{ item.variante.talla?.codigo }} &bull; Color: {{ item.variante.color?.nombre }} &bull; SKU: {{ item.variante.sku_variante }}
                    </small>
                  </div>

                  <div class="basket-item-qty">
                    <button type="button" class="btn-qty" (click)="cambiarCantidad(i, -1)">-</button>
                    <span class="qty-num">{{ item.cantidad }}</span>
                    <button type="button" class="btn-qty" (click)="cambiarCantidad(i, 1)">+</button>
                  </div>

                  <div class="basket-item-subtotal">
                    {{ moneda === 'USD' ? '$' : 'Bs.' }} {{ (item.prenda.precio_base * item.cantidad) | number:'1.2-2' }}
                  </div>

                  <button type="button" class="btn-remove-item" (click)="eliminarPrenda(i)">&times;</button>
                </div>

                <!-- TOTAL ESTIMADO & BOTÓN CONFIRMAR -->
                <div class="basket-total-summary">
                  <div class="summary-total-line">
                    <span>Total Estimado de las Prendas:</span>
                    <strong class="gold-amount">{{ moneda === 'USD' ? '$' : 'Bs.' }} {{ calcularTotalPrendas() | number:'1.2-2' }}</strong>
                  </div>
                  <div class="summary-total-line" *ngIf="montoAnticipo > 0">
                    <span>Anticipo de Garantía Agendado:</span>
                    <span class="anticipo-val">{{ moneda === 'USD' ? '$' : 'Bs.' }} {{ montoAnticipo | number:'1.2-2' }}</span>
                  </div>

                  <button
                    type="button"
                    class="btn-atelier-gold btn-confirm-reserva"
                    (click)="confirmarReserva()"
                    [disabled]="guardandoReserva || prendasApartadas.length === 0 || !sucursalSeleccionadaId || !fechaReserva">
                    <span *ngIf="guardandoReserva" class="spinner-inline"></span>
                    {{ guardandoReserva ? 'Confirmando Reserva...' : '&#128085; Agendar Cita en Probador Físico' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <!-- TAB 2: MIS RESERVAS -->
      <section *ngIf="activeTab === 'mis-reservas'" class="atelier-card mis-reservas-card">
        <div class="reservas-toolbar">
          <div class="filter-item">
            <label>Filtrar por Estado:</label>
            <select [(ngModel)]="filtroEstado" (change)="cargarMisReservas()" class="atelier-select">
              <option value="">Todos los Estados</option>
              <option value="CONFIRMADA">Confirmadas / Agendadas</option>
              <option value="EN_PROBADOR">En Probador</option>
              <option value="COMPLETADA">Completadas</option>
              <option value="CANCELADA">Canceladas</option>
            </select>
          </div>

          <button type="button" class="btn-atelier-outline btn-refresh" (click)="cargarMisReservas()">
            &#8635; Actualizar Lista
          </button>
        </div>

        <div *ngIf="cargandoReservas" class="loading-state">
          <div class="spinner-inline large"></div>
          <p>Consultando tu agenda de probadores...</p>
        </div>

        <div *ngIf="!cargandoReservas && reservasList.length === 0" class="empty-state">
          <p>No tenés citas de probador registradas con los filtros seleccionados.</p>
        </div>

        <div *ngIf="!cargandoReservas && reservasList.length > 0" class="reservas-grid">
          <div *ngFor="let r of reservasList" class="reserva-card-luxury">
            <div class="card-reserva-header">
              <span class="code-badge">{{ r.codigo_reserva }}</span>
              <span class="status-pill" [ngClass]="r.estado.toLowerCase()">{{ r.estado }}</span>
            </div>

            <div class="card-reserva-body">
              <div class="reserva-info-row">
                <span class="lbl">&#128205; Boutique:</span>
                <span class="val font-bold">{{ r.sucursal?.nombre || 'Boutique Atelier' }} ({{ getCiudadNombre(r.sucursal) }})</span>
              </div>
              <div class="reserva-info-row">
                <span class="lbl">&#128197; Fecha &amp; Hora:</span>
                <span class="val highlight-gold">{{ r.fecha_reserva | date:'dd/MM/yyyy' }} a las {{ r.hora_estimada }}</span>
              </div>
              <div class="reserva-info-row" *ngIf="r.monto_anticipo > 0">
                <span class="lbl">&#128179; Anticipo:</span>
                <span class="val">{{ r.moneda === 'USD' ? '$' : 'Bs.' }} {{ r.monto_anticipo | number:'1.2-2' }}</span>
              </div>

              <!-- PRENDAS APARTADAS -->
              <div class="reserva-items-preview">
                <small class="items-title">Prendas en Vestidor ({{ r.detalles.length }}):</small>
                <ul>
                  <li *ngFor="let d of r.detalles">
                    {{ d.cantidad }}x {{ d.variante?.prenda?.nombre || 'Prenda' }} 
                    <span class="tag-specs">({{ d.variante?.talla?.codigo }} / {{ d.variante?.color?.nombre }})</span>
                  </li>
                </ul>
              </div>
            </div>

            <div class="card-reserva-actions">
              <button
                type="button"
                class="btn-action-qr"
                (click)="abrirPaseProbador(r)">
                &#9638; Ver Pase QR
              </button>

              <button
                type="button"
                *ngIf="r.estado === 'CONFIRMADA' || r.estado === 'PENDIENTE'"
                class="btn-action-cancel"
                (click)="cancelarReserva(r)">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- MODAL: PASE DE ACCESO A PROBADOR (FITTING ROOM PASS) -->
      <div *ngIf="mostrarPaseModal && reservaActualPase" class="modal-backdrop">
        <div class="modal-pase-container">
          <div class="modal-header-actions">
            <span class="pase-title">Pase de Acceso a Probador Físico</span>
            <button type="button" class="btn-close-modal" (click)="cerrarPase()">&times;</button>
          </div>

          <div class="pase-slip" id="printable-fitting-pass">
            <div class="pase-brand">
              <div class="brand-crest">&#9670; ATELIER NOIR &#9670;</div>
              <div class="brand-sub">FITTING ROOM RESERVATION PASS</div>
            </div>

            <div class="pase-status-banner" [class.confirmed]="reservaActualPase.estado === 'CONFIRMADA'">
              {{ reservaActualPase.estado === 'CONFIRMADA' ? 'CITA CONFIRMADA' : reservaActualPase.estado }}
            </div>

            <!-- CÓDIGO QR EN CUADRO DORADO -->
            <div class="pase-qr-box">
              <div class="pase-qr-svg" [innerHTML]="sanitizedQrSvg"></div>
              <span class="pase-code-display">{{ reservaActualPase.codigo_reserva }}</span>
              <small class="pase-scan-hint">Presentá este código al llegar a la boutique</small>
            </div>

            <!-- DETALLES DE LA CITA -->
            <div class="pase-details-table">
              <div class="pase-row">
                <span class="lbl">BOUTIQUE:</span>
                <span class="val font-bold">{{ reservaActualPase.sucursal?.nombre }} ({{ getCiudadNombre(reservaActualPase.sucursal) }})</span>
              </div>
              <div class="pase-row">
                <span class="lbl">DIRECCIÓN:</span>
                <span class="val">{{ reservaActualPase.sucursal?.direccion }}</span>
              </div>
              <div class="pase-row">
                <span class="lbl">FECHA Y HORA:</span>
                <span class="val font-bold highlight-black">{{ reservaActualPase.fecha_reserva | date:'dd/MM/yyyy' }} - {{ reservaActualPase.hora_estimada }}</span>
              </div>
              <div class="pase-row">
                <span class="lbl">CLIENTE:</span>
                <span class="val">{{ reservaActualPase.cliente?.nombre }} {{ reservaActualPase.cliente?.apellido }}</span>
              </div>
            </div>

            <!-- LISTA DE PRENDAS RESERVADAS -->
            <div class="pase-prendas-section">
              <div class="prendas-header-lbl">PRENDAS RESERVADAS EN PROBADOR:</div>
              <div *ngFor="let d of reservaActualPase.detalles" class="pase-prenda-line">
                <span>&bull; {{ d.cantidad }}x {{ d.variante?.prenda?.nombre }} ({{ d.variante?.talla?.codigo }} / {{ d.variante?.color?.nombre }})</span>
                <span class="font-bold">{{ reservaActualPase.moneda === 'USD' ? '$' : 'Bs.' }} {{ d.subtotal | number:'1.2-2' }}</span>
              </div>
            </div>

            <div class="pase-footer-notes">
              <p>Por favor presentate 5 minutos antes de tu turno agendado.</p>
              <p class="micro">Las prendas se apartarán exclusivamente durante la franja asignada.</p>
            </div>
          </div>

          <div class="modal-footer-actions">
            <button type="button" class="btn-atelier-outline" (click)="imprimirPase()">
              &#128438; Imprimir Pase
            </button>
            <button type="button" class="btn-atelier-gold" (click)="cerrarPase()">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .atelier-reservas-container {
      padding: 2rem 1.5rem 4rem;
      max-width: 1400px;
      margin: 0 auto;
      color: #111827;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* HEADER */
    .reservas-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      gap: 1.5rem;
      flex-wrap: wrap;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }
    .subtitle-badge {
      font-size: 0.75rem;
      letter-spacing: 2px;
      color: #6b7280;
      margin-bottom: 0.5rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .header-titles h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #000000;
      margin: 0 0 0.5rem 0;
      letter-spacing: -0.02em;
    }
    .header-titles .description {
      color: #6b7280;
      font-size: 0.95rem;
      max-width: 650px;
      margin: 0;
      line-height: 1.5;
    }

    /* TABS */
    .tabs-switcher {
      display: inline-flex;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 4px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: #6b7280;
      padding: 0.6rem 1.2rem;
      font-size: 0.85rem;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.2s ease;
      font-weight: 500;
    }
    .tab-btn:hover:not(.active) {
      color: #111827;
      background: rgba(0, 0, 0, 0.04);
    }
    .tab-btn.active {
      background: #000000;
      color: #ffffff;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    /* TOASTS */
    .toast-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      animation: slideDown 0.3s ease;
    }
    .toast-banner.success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    }
    .toast-banner.error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }
    .toast-icon { font-size: 1.3rem; }
    .toast-body { flex: 1; display: flex; flex-direction: column; font-size: 0.9rem; }
    .btn-close-toast {
      background: none;
      border: none;
      color: inherit;
      font-size: 1.3rem;
      cursor: pointer;
      opacity: 0.7;
    }
    .btn-close-toast:hover { opacity: 1; }

    /* CARDS */
    .atelier-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 12px;
      padding: 1.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }
    .card-header h3 {
      font-size: 1.15rem;
      font-weight: 600;
      color: #111827;
      margin: 0;
      letter-spacing: -0.01em;
    }
    .gold-pill {
      font-size: 0.7rem;
      background: #f3f4f6;
      color: #374151;
      padding: 0.25rem 0.6rem;
      border-radius: 20px;
      border: 1px solid #e5e7eb;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    /* AGENDAR LAYOUT */
    .agendar-layout {
      display: grid;
      grid-template-columns: 1.1fr 1.4fr;
      gap: 2rem;
    }
    @media (max-width: 1024px) {
      .agendar-layout { grid-template-columns: 1fr; }
    }

    /* FORMS */
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .full-width { grid-column: span 2; }
    .form-group label {
      display: block;
      font-size: 0.8rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 0.35rem;
    }
    .atelier-input, .atelier-select, .atelier-textarea {
      width: 100%;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      color: #111827;
      padding: 0.65rem 0.85rem;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .atelier-input:focus, .atelier-select:focus, .atelier-textarea:focus {
      border-color: #000000;
      box-shadow: 0 0 0 1px #000000;
    }
    .input-currency-group {
      display: flex;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      align-items: center;
      padding: 0 0.75rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .input-currency-group:focus-within {
      border-color: #000000;
      box-shadow: 0 0 0 1px #000000;
    }
    .currency-label {
      color: #374151;
      font-weight: 700;
      font-size: 1rem;
      margin-right: 0.5rem;
    }
    .atelier-input-amount {
      width: 100%;
      background: transparent;
      border: none;
      color: #111827;
      font-size: 1.15rem;
      font-weight: 700;
      padding: 0.6rem 0;
      outline: none;
    }
    .sucursal-info-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font-size: 0.8rem;
    }
    .sucursal-info-box .lbl { color: #6b7280; margin-right: 0.5rem; }
    .sucursal-info-box .val { color: #111827; font-weight: 500; }

    /* PRENDAS CARD */
    .select-sucursal-notice {
      padding: 3rem 1.5rem;
      text-align: center;
      color: #6b7280;
      font-size: 0.95rem;
    }
    .notice-icon { font-size: 2rem; color: #111827; display: block; margin-bottom: 0.5rem; }
    .prendas-search-box { margin-bottom: 1rem; }
    .prendas-selector-list {
      max-height: 380px;
      overflow-y: auto;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #ffffff;
      margin-bottom: 1.5rem;
    }
    .prenda-mini-card {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #f3f4f6;
      display: flex;
      gap: 1rem;
      align-items: center;
      transition: background 0.15s ease;
    }
    .prenda-mini-card:hover {
      background: #fafafa;
    }
    .prenda-mini-thumb {
      width: 60px;
      height: 60px;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
    }
    .thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.2s ease;
    }
    .prenda-mini-card:hover .thumb-img {
      transform: scale(1.05);
    }
    .prenda-mini-card:last-child { border-bottom: none; }
    .prenda-mini-body { flex: 1; min-width: 0; }
    .prenda-name {
      display: block;
      font-size: 0.9rem;
      font-weight: 600;
      color: #111827;
      margin-bottom: 0.2rem;
    }
    .prenda-meta {
      display: flex;
      gap: 0.75rem;
      font-size: 0.75rem;
      color: #6b7280;
      margin-bottom: 0.5rem;
    }
    .prenda-price { color: #111827; font-weight: 700; }
    .variante-picker-row {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .atelier-select-mini {
      flex: 1;
      background: #ffffff;
      border: 1px solid #d1d5db;
      color: #111827;
      padding: 0.4rem 0.6rem;
      font-size: 0.8rem;
      border-radius: 6px;
      outline: none;
    }
    .atelier-select-mini:focus {
      border-color: #000000;
    }
    .btn-add-prenda {
      background: #ffffff;
      border: 1px solid #111827;
      color: #111827;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.4rem 0.85rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-add-prenda:hover {
      background: #000000;
      color: #ffffff;
    }

    /* CESTA DE PRENDAS */
    .prendas-apartadas-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 1.25rem;
    }
    .prendas-apartadas-box h4 {
      margin: 0 0 1rem 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: #111827;
      letter-spacing: -0.01em;
    }
    .empty-basket {
      text-align: center;
      color: #9ca3af;
      font-size: 0.85rem;
      padding: 1.5rem 0;
    }
    .basket-item-row {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid #e5e7eb;
      font-size: 0.85rem;
      color: #111827;
    }
    .basket-thumb-img {
      width: 44px;
      height: 44px;
      border-radius: 6px;
      object-fit: cover;
      flex-shrink: 0;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
    }
    .basket-item-info { flex: 1; min-width: 0; }
    .basket-item-specs { display: block; color: #6b7280; font-size: 0.75rem; }
    .basket-item-qty {
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }
    .btn-qty {
      background: #ffffff;
      border: 1px solid #d1d5db;
      color: #111827;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
    }
    .btn-qty:hover {
      background: #f3f4f6;
    }
    .qty-num { min-width: 20px; text-align: center; font-weight: 600; }
    .basket-item-subtotal {
      color: #111827;
      font-weight: 700;
      min-width: 70px;
      text-align: right;
    }
    .btn-remove-item {
      background: none;
      border: none;
      color: #dc2626;
      font-size: 1.2rem;
      cursor: pointer;
      opacity: 0.7;
    }
    .btn-remove-item:hover { opacity: 1; }
    .basket-total-summary {
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 1px dashed #d1d5db;
    }
    .summary-total-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
      color: #4b5563;
    }
    .gold-amount { color: #000000; font-size: 1.3rem; font-weight: 700; }
    .btn-confirm-reserva {
      width: 100%;
      margin-top: 1rem;
      padding: 0.9rem;
    }

    /* MIS RESERVAS GRID */
    .reservas-toolbar {
      display: flex;
      gap: 1rem;
      align-items: flex-end;
      margin-bottom: 1.5rem;
    }
    .reservas-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.5rem;
    }
    .reserva-card-luxury {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 10px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .reserva-card-luxury:hover {
      border-color: #d1d5db;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
    }
    .card-reserva-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #f3f4f6;
    }
    .code-badge {
      font-family: monospace;
      color: #111827;
      font-weight: 700;
      font-size: 0.85rem;
      background: #f3f4f6;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }
    .status-pill {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 12px;
      letter-spacing: 0.5px;
    }
    .status-pill.confirmada {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .status-pill.cancelada {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .reserva-info-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      margin-bottom: 0.4rem;
    }
    .reserva-info-row .lbl { color: #6b7280; }
    .reserva-info-row .val { color: #111827; font-weight: 500; }
    .reserva-items-preview {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid #f3f4f6;
      font-size: 0.8rem;
    }
    .items-title { color: #4b5563; font-weight: 500; display: block; margin-bottom: 0.35rem; }
    .reserva-items-preview ul {
      margin: 0;
      padding-left: 1.2rem;
      color: #374151;
    }
    .tag-specs { color: #6b7280; font-size: 0.7rem; }
    .card-reserva-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1.25rem;
      padding-top: 0.75rem;
      border-top: 1px solid #f3f4f6;
    }
    .btn-action-qr {
      flex: 1;
      background: #ffffff;
      border: 1px solid #111827;
      color: #111827;
      font-weight: 600;
      padding: 0.55rem;
      border-radius: 6px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-action-qr:hover { background: #000000; color: #ffffff; }
    .btn-action-cancel {
      background: transparent;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 0.55rem 0.85rem;
      border-radius: 6px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-action-cancel:hover { background: #fef2f2; }

    /* MODAL PASE DE PROBADOR */
    .modal-backdrop {
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
    .modal-pase-container {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      max-width: 460px;
      width: 100%;
      padding: 1.5rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      animation: zoomIn 0.25s ease;
    }
    .modal-header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .pase-title {
      font-size: 0.85rem;
      color: #4b5563;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }
    .btn-close-modal {
      background: none;
      border: none;
      color: #6b7280;
      font-size: 1.5rem;
      cursor: pointer;
    }
    .btn-close-modal:hover { color: #111827; }
    .pase-slip {
      background: #ffffff;
      color: #111827;
      border-radius: 8px;
      padding: 1.5rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      border: 1px solid #e5e7eb;
      border-top: 4px solid #000000;
    }
    .pase-brand {
      text-align: center;
      margin-bottom: 0.75rem;
      border-bottom: 1px dashed #d1d5db;
      padding-bottom: 0.5rem;
    }
    .brand-crest {
      font-weight: 800;
      letter-spacing: 2px;
      font-size: 1.1rem;
      color: #000000;
    }
    .brand-sub { font-size: 0.65rem; color: #6b7280; letter-spacing: 1px; }
    .pase-status-banner {
      text-align: center;
      padding: 0.35rem;
      font-weight: 700;
      letter-spacing: 1.5px;
      font-size: 0.8rem;
      margin-bottom: 1rem;
      border-radius: 4px;
      background: #f3f4f6;
    }
    .pase-status-banner.confirmed {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .pase-qr-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 1.25rem;
      padding: 0.75rem;
      background: #fafafa;
      border: 1px dashed #d1d5db;
      border-radius: 8px;
    }
    .pase-qr-svg {
      width: 170px;
      height: 170px;
    }
    .pase-qr-svg ::ng-deep svg { width: 100%; height: 100%; }
    .pase-code-display {
      font-size: 1rem;
      font-weight: 800;
      letter-spacing: 2px;
      margin-top: 0.5rem;
      color: #000000;
    }
    .pase-scan-hint { font-size: 0.65rem; color: #6b7280; }
    .pase-details-table {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.8rem;
      margin-bottom: 1rem;
    }
    .pase-row { display: flex; justify-content: space-between; }
    .pase-row .lbl { color: #6b7280; }
    .pase-row .val { color: #111827; font-weight: 600; }
    .pase-prendas-section {
      border-top: 1px dashed #e5e7eb;
      border-bottom: 1px dashed #e5e7eb;
      padding: 0.75rem 0;
      margin-bottom: 1rem;
      font-size: 0.75rem;
    }
    .prendas-header-lbl { font-weight: 600; margin-bottom: 0.35rem; color: #111827; }
    .pase-prenda-line { display: flex; justify-content: space-between; margin-bottom: 0.2rem; }
    .pase-footer-notes {
      font-size: 0.65rem;
      color: #6b7280;
      text-align: center;
      line-height: 1.3;
    }
    .modal-footer-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.25rem;
    }

    /* GLOBAL BUTTONS */
    .btn-atelier-gold {
      background: #000000;
      color: #ffffff;
      border: 1px solid #000000;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-atelier-gold:hover:not(:disabled) {
      background: #1f2937;
      border-color: #1f2937;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);
    }
    .btn-atelier-gold:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-atelier-outline {
      background: #ffffff;
      border: 1px solid #d1d5db;
      color: #374151;
      font-weight: 600;
      font-size: 0.85rem;
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-atelier-outline:hover {
      background: #f3f4f6;
      color: #111827;
      border-color: #9ca3af;
    }

    .highlight-gold { color: #111827; font-weight: 600; }
    .font-bold { font-weight: bold; }
    .spinner-inline {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(0,0,0,0.15);
      border-top-color: #000000;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      vertical-align: middle;
      margin-right: 0.4rem;
    }
    .spinner-inline.large {
      width: 32px;
      height: 32px;
      border-width: 3px;
      border-top-color: #000000;
      margin-bottom: 1rem;
    }
    .loading-state, .empty-state {
      padding: 3rem;
      text-align: center;
      color: #6b7280;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

    @media print {
      body * { visibility: hidden; }
      #printable-fitting-pass, #printable-fitting-pass * { visibility: visible; }
      #printable-fitting-pass {
        position: absolute;
        left: 0; top: 0;
        width: 100%;
      }
    }

    /* =========================================================
       RESPONSIVIDAD MÓVIL Y TABLET (RESERVAS)
       ========================================================= */
    @media (max-width: 992px) {
      .atelier-reservas-container {
        padding: 1.5rem 1rem;
      }
      .reservas-header .header-titles h1 {
        font-size: 1.85rem;
      }
      .booking-stepper-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .atelier-reservas-container {
        padding: 1rem 0.5rem;
      }
      .reservas-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
        margin-bottom: 1.25rem;
      }
      .reservas-header .header-titles h1 {
        font-size: 1.6rem;
      }
      .reservas-header .description {
        font-size: 0.85rem;
      }
      .tabs-switcher {
        width: 100%;
        display: flex;
      }
      .tab-btn {
        flex: 1;
        justify-content: center;
        padding: 0.6rem 0.5rem;
        font-size: 0.8rem;
      }
      .panel-step-card {
        padding: 1.15rem 0.85rem;
      }
      .sucursales-cards-grid {
        grid-template-columns: 1fr !important;
      }
      .date-time-picker-grid {
        grid-template-columns: 1fr !important;
      }
      .prendas-grid-selection {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 0.75rem !important;
      }
    }
  `]
})
export class ReservasPageComponent implements OnInit {
  private readonly reservasService = inject(ReservasService);
  private readonly inventarioService = inject(InventarioService);
  private readonly catalogoService = inject(CatalogoService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly notifService = inject(NotificacionesService);

  activeTab: 'agendar' | 'mis-reservas' = 'agendar';

  // Paso 1: Sucursal y Cita
  ciudadesList: Ciudad[] = [];
  ciudadSeleccionadaId: number | null = null;
  sucursalesList: Sucursal[] = [];
  sucursalesFiltradas: Sucursal[] = [];
  sucursalSeleccionadaId: number | null = null;
  sucursalActual: Sucursal | null = null;

  hoyStr: string = new Date().toISOString().split('T')[0];
  fechaReserva: string = new Date().toISOString().split('T')[0];
  horaEstimada: string = '15:30';
  montoAnticipo: number = 0;
  moneda: 'USD' | 'BOB' = 'BOB';
  observaciones: string = '';

  // Paso 2: Catálogo y Prendas Apartadas
  prendasList: Prenda[] = [];
  stockMap: Map<number, number> = new Map(); // variante_id -> disponible
  busquedaPrenda: string = '';
  prendasApartadas: PrendaEnReserva[] = [];

  guardandoReserva: boolean = false;

  // Tab 2: Mis Reservas
  reservasList: Reserva[] = [];
  cargandoReservas: boolean = false;
  filtroEstado: string = '';

  // Modal Pase
  reservaActualPase: Reserva | null = null;
  sanitizedQrSvg: SafeHtml | null = null;
  mostrarPaseModal: boolean = false;

  // Toasts
  mensajeExito: string | null = null;
  mensajeError: string | null = null;

  ngOnInit(): void {
    this.cargarCiudades();
    this.cargarSucursales();
    this.cargarCatalogo();
  }

  cargarCiudades(): void {
    this.inventarioService.getCiudades().subscribe({
      next: (ciudades) => {
        this.ciudadesList = ciudades;
      },
      error: (err) => console.error('Error cargando ciudades:', err)
    });
  }

  cargarSucursales(): void {
    this.inventarioService.getSucursales().subscribe({
      next: (sucursales) => {
        this.sucursalesList = sucursales;
        this.filtrarSucursales();
      },
      error: (err) => console.error('Error cargando sucursales:', err)
    });
  }

  onCiudadChange(): void {
    this.filtrarSucursales();
  }

  filtrarSucursales(): void {
    if (this.ciudadSeleccionadaId) {
      this.sucursalesFiltradas = this.sucursalesList.filter(s => s.ciudad_id === this.ciudadSeleccionadaId);
    } else {
      this.sucursalesFiltradas = [...this.sucursalesList];
    }

    const existe = this.sucursalesFiltradas.some(s => s.id === this.sucursalSeleccionadaId);
    if (!existe) {
      this.sucursalSeleccionadaId = this.sucursalesFiltradas.length > 0 ? this.sucursalesFiltradas[0].id : null;
    }
    this.onSucursalChange();
  }

  getCiudadNombre(sucursal: Sucursal | null | undefined): string {
    if (!sucursal) return 'Bolivia';
    if (sucursal.ciudad?.nombre) return sucursal.ciudad.nombre;
    const c = this.ciudadesList.find(item => item.id === sucursal.ciudad_id);
    return c?.nombre || 'Bolivia';
  }

  resolveImageUrl(url?: string): string {
    if (!url) return 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80';
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;
    const backendOrigin = (environment.apiUrl || '').replace(/\/api\/v1\/?$/, '');
    if (url.startsWith('/static/')) return `${backendOrigin}${url}`;
    if (url.startsWith('static/')) return `${backendOrigin}/${url}`;
    if (url.includes('backend:8000')) return url.replace(/http:\/\/[^/]+/, backendOrigin);
    if (url.includes('localhost:8000')) return url.replace('http://localhost:8000', backendOrigin);
    return url;
  }

  getPortadaUrl(prenda: Prenda | undefined | null): string {
    if (!prenda) return 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80';
    const portada = prenda.multimedia?.find(m => m.es_portada && m.tipo === 'IMAGEN');
    if (portada) return this.resolveImageUrl(portada.url);
    const primeraImg = prenda.multimedia?.find(m => m.tipo === 'IMAGEN');
    if (primeraImg) return this.resolveImageUrl(primeraImg.url);
    return 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80';
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80';
    }
  }

  cargarCatalogo(): void {
    this.catalogoService.getPrendas().subscribe({
      next: (prendas) => {
        this.prendasList = prendas;
      },
      error: (err) => console.error('Error cargando catálogo:', err)
    });
  }

  onSucursalChange(): void {
    this.sucursalActual = this.sucursalesList.find(s => s.id === this.sucursalSeleccionadaId) || null;
    this.actualizarStockSucursal();
  }

  actualizarStockSucursal(): void {
    if (!this.sucursalSeleccionadaId) {
      this.stockMap.clear();
      return;
    }
    this.catalogoService.getStockPorSucursal(this.sucursalSeleccionadaId).subscribe({
      next: (stocks: InventarioStock[]) => {
        this.stockMap.clear();
        stocks.forEach(s => {
          this.stockMap.set(s.variante_id, s.cantidad_disponible);
        });
      },
      error: (err) => console.error('Error cargando stock de sucursal:', err)
    });
  }

  getStockDisponible(varianteId: number): number {
    return this.stockMap.get(varianteId) || 0;
  }

  prendasFiltradas(): Prenda[] {
    if (!this.busquedaPrenda.trim()) return this.prendasList;
    const q = this.busquedaPrenda.toLowerCase();
    return this.prendasList.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.categoria?.nombre && p.categoria.nombre.toLowerCase().includes(q))
    );
  }

  agregarPrenda(prenda: Prenda, varianteId: number): void {
    this.mensajeError = null;
    const variante = prenda.variantes?.find(v => v.id === varianteId);
    if (!variante) return;

    const disponible = this.getStockDisponible(varianteId);
    if (disponible <= 0) {
      this.mensajeError = `La variante seleccionada no cuenta con existencias en ${this.sucursalActual?.nombre}.`;
      return;
    }

    const existente = this.prendasApartadas.find(item => item.variante.id === varianteId);
    if (existente) {
      if (existente.cantidad + 1 > disponible) {
        this.mensajeError = `No podés apartar más de ${disponible} unidades disponibles de esta prenda.`;
        return;
      }
      existente.cantidad++;
    } else {
      this.prendasApartadas.push({
        prenda,
        variante,
        cantidad: 1
      });
    }
  }

  cambiarCantidad(index: number, delta: number): void {
    const item = this.prendasApartadas[index];
    const nuevaCantidad = item.cantidad + delta;
    const disponible = this.getStockDisponible(item.variante.id);

    if (nuevaCantidad <= 0) {
      this.eliminarPrenda(index);
    } else if (nuevaCantidad > disponible) {
      this.mensajeError = `Stock máximo disponible en sucursal: ${disponible} unidades.`;
    } else {
      item.cantidad = nuevaCantidad;
    }
  }

  eliminarPrenda(index: number): void {
    this.prendasApartadas.splice(index, 1);
  }

  calcularTotalPrendas(): number {
    return this.prendasApartadas.reduce((acc, item) => acc + (item.prenda.precio_base * item.cantidad), 0);
  }

  confirmarReserva(): void {
    if (!this.sucursalSeleccionadaId || this.prendasApartadas.length === 0) return;

    this.guardandoReserva = true;
    this.mensajeError = null;
    this.mensajeExito = null;

    const payload: ReservaCreate = {
      sucursal_id: this.sucursalSeleccionadaId,
      fecha_reserva: this.fechaReserva,
      hora_estimada: this.horaEstimada,
      monto_anticipo: this.montoAnticipo || 0,
      moneda: this.moneda,
      observaciones: this.observaciones || null,
      detalles: this.prendasApartadas.map(item => ({
        variante_id: item.variante.id,
        cantidad: item.cantidad
      }))
    };

    this.reservasService.crearReserva(payload).subscribe({
      next: (reserva) => {
        this.guardandoReserva = false;
        this.mensajeExito = `Cita agendada con éxito. Código de Pase: ${reserva.codigo_reserva}`;
        this.prendasApartadas = [];
        this.actualizarStockSucursal();
        this.abrirPaseProbador(reserva);

        // Disparar Notificación Push solicitada (CU13 / CU21)
        this.notifService.mostrarPushToast({
          titulo: 'Reserva realizada con éxito',
          mensaje: `Tu cita en ${this.sucursalActual?.nombre || 'Boutique'} ha sido confirmada. Pase #${reserva.codigo_reserva}.`,
          accionLabel: 'Ver mis reservas',
          urlDestino: '/reservas',
          onAccion: () => {
            this.cambiarAMisReservas();
          },
          tipo: 'RESERVA_PROBADOR'
        });
        this.notifService.cargarResumen();
      },
      error: (err) => {
        this.guardandoReserva = false;
        this.mensajeError = err.error?.detail || 'Error al procesar la reserva';
      }
    });
  }

  // --- TAB 2: MIS RESERVAS ---
  cambiarAMisReservas(): void {
    this.activeTab = 'mis-reservas';
    this.cargarMisReservas();
  }

  cargarMisReservas(): void {
    this.cargandoReservas = true;
    this.reservasService.getReservas(undefined, this.filtroEstado || undefined).subscribe({
      next: (reservas) => {
        this.reservasList = reservas;
        this.cargandoReservas = false;
      },
      error: (err) => {
        this.cargandoReservas = false;
        console.error('Error cargando reservas:', err);
      }
    });
  }

  cancelarReserva(r: Reserva): void {
    if (!confirm(`¿Confirmás la cancelación de la reserva #${r.codigo_reserva}? Las prendas se liberarán a disponibilidad general.`)) {
      return;
    }

    this.reservasService.cancelarReserva(r.id, 'Cancelada por el cliente desde la plataforma').subscribe({
      next: (reservaActualizada) => {
        this.mensajeExito = `Reserva #${reservaActualizada.codigo_reserva} cancelada y stock liberado.`;
        this.cargarMisReservas();
        this.actualizarStockSucursal();
      },
      error: (err) => {
        this.mensajeError = err.error?.detail || 'Error al cancelar la reserva';
      }
    });
  }

  // --- MODAL PASE ---
  abrirPaseProbador(r: Reserva): void {
    this.reservaActualPase = r;
    if (r.qr_svg) {
      this.sanitizedQrSvg = this.sanitizer.bypassSecurityTrustHtml(r.qr_svg);
    } else {
      this.sanitizedQrSvg = null;
    }
    this.mostrarPaseModal = true;
  }

  cerrarPase(): void {
    this.mostrarPaseModal = false;
    this.reservaActualPase = null;
    this.sanitizedQrSvg = null;
  }

  imprimirPase(): void {
    window.print();
  }
}
