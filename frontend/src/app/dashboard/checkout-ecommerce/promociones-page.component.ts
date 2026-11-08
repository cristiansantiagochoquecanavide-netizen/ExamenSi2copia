import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VentasService } from '../punto-venta-pos/ventas.service';
import { Promocion, PromocionCreate, ValidarCuponResponse } from '../punto-venta-pos/ventas.models';

@Component({
  selector: 'app-promociones-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="promociones-container">
      
      <!-- HEADER PRINCIPAL -->
      <header class="promo-header">
        <div class="header-titles">
          <div class="luxury-badge">ATELIER NOIR &bull; MARKETING &amp; FIDELIZACI&Oacute;N</div>
          <h1>Promociones &amp; Cupones de Descuento</h1>
          <p class="subtitle">
            Configur&aacute; campa&ntilde;as comerciales, cupones de descuento y valid&aacute; reglas de negocio omnicanal en tiempo real.
          </p>
        </div>

        <div class="header-actions">
          <button 
            type="button"
            (click)="abrirModalNuevaPromo()"
            class="btn-nueva-campana">
            <span class="btn-plus-icon">+</span> Nueva Campa&ntilde;a
          </button>

          <div class="tabs-switcher">
            <button 
              type="button"
              class="tab-btn"
              [class.active]="activeTab === 'campanas'"
              (click)="activeTab = 'campanas'">
              <span class="tab-icon">%</span> Campa&ntilde;as y Cupones
            </button>
            <button 
              type="button"
              class="tab-btn"
              [class.active]="activeTab === 'simulador'"
              (click)="activeTab = 'simulador'">
              <span class="tab-icon">&#9889;</span> Simulador de Canje
            </button>
          </div>
        </div>
      </header>

      <!-- ALERTAS Y NOTIFICACIONES -->
      <div *ngIf="mensajeExito" class="toast-alert success">
        <div class="toast-content">
          <span class="toast-icon">&#10003;</span>
          <span>{{ mensajeExito }}</span>
        </div>
        <button type="button" class="toast-close" (click)="mensajeExito = null">&times;</button>
      </div>

      <div *ngIf="errorGeneral" class="toast-alert error">
        <div class="toast-content">
          <span class="toast-icon">&#9888;</span>
          <span>{{ errorGeneral }}</span>
        </div>
        <button type="button" class="toast-close" (click)="errorGeneral = null">&times;</button>
      </div>

      <!-- ================= PESTAÑA 1: CAMPAÑAS Y CUPONES ================= -->
      <section *ngIf="activeTab === 'campanas'" class="tab-content">
        
        <!-- TARJETAS DE MÉTRICAS KPI -->
        <div class="metrics-grid">
          <div class="metric-card">
            <span class="metric-label">Total Campa&ntilde;as</span>
            <div class="metric-val">{{ promociones.length }}</div>
            <span class="metric-sub">Estrategias creadas</span>
          </div>

          <div class="metric-card highlight">
            <span class="metric-label emerald">Cupones Activos</span>
            <div class="metric-val emerald">{{ totalActivas }}</div>
            <span class="metric-sub">Listos para redimir</span>
          </div>

          <div class="metric-card">
            <span class="metric-label">Canjes Registrados</span>
            <div class="metric-val">{{ totalUsos }}</div>
            <span class="metric-sub">En POS y E-Commerce</span>
          </div>

          <div class="metric-card">
            <span class="metric-label">Ahorro Bonificado</span>
            <div class="metric-val"><span class="currency">$</span>{{ totalAhorroEstimado | number:'1.2-2' }}</div>
            <span class="metric-sub">Beneficio a clientes</span>
          </div>
        </div>

        <!-- BARRA DE BÚSQUEDA Y FILTROS -->
        <div class="filters-toolbar">
          <div class="search-box">
            <span class="search-icon">&#128269;</span>
            <input 
              type="text" 
              [(ngModel)]="filtroTexto" 
              placeholder="Buscar por c&oacute;digo o nombre de campa&ntilde;a..." 
              class="search-input" />
          </div>

          <div class="filter-selects">
            <select [(ngModel)]="filtroTipo" class="custom-select">
              <option value="TODOS">Todos los beneficios</option>
              <option value="PORCENTAJE">Porcentaje (%)</option>
              <option value="MONTO_FIJO">Monto Fijo ($ USD)</option>
              <option value="ENVIO_GRATIS">Env&iacute;o Bonificado</option>
            </select>

            <select [(ngModel)]="filtroEstado" class="custom-select">
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVOS">Solo Activos</option>
              <option value="INACTIVOS">Solo Inactivos</option>
            </select>

            <button type="button" (click)="cargarPromociones()" title="Actualizar listado" class="btn-refresh">
              &#8635;
            </button>
          </div>
        </div>

        <!-- TABLA DE CUPONES ATELIER NOIR -->
        <div class="table-wrapper">
          <div *ngIf="cargando" class="table-state">
            <div class="spinner-inline"></div>
            <p>Cargando cat&aacute;logo de promociones comerciales...</p>
          </div>

          <div *ngIf="!cargando && promocionesFiltradas.length === 0" class="table-state empty">
            <div class="empty-icon">&#127991;</div>
            <p>No se encontraron promociones que coincidan con los filtros seleccionados.</p>
          </div>

          <div *ngIf="!cargando && promocionesFiltradas.length > 0" class="table-responsive">
            <table class="promo-table">
              <thead>
                <tr>
                  <th>C&oacute;digo</th>
                  <th>Campa&ntilde;a / Descripci&oacute;n</th>
                  <th>Beneficio</th>
                  <th>Reglas Min / Max</th>
                  <th class="text-center">Usos / L&iacute;mite</th>
                  <th>Vigencia</th>
                  <th class="text-center">Estado</th>
                  <th class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of promocionesFiltradas" class="table-row">
                  
                  <!-- Código con botón de copia rápida -->
                  <td>
                    <div class="code-badge-wrap">
                      <span class="code-badge">{{ p.codigo }}</span>
                      <button type="button" (click)="copiarCodigo(p.codigo)" title="Copiar c&oacute;digo al portapapeles" class="btn-copy">
                        &#128203;
                      </button>
                    </div>
                  </td>

                  <!-- Campaña y Detalle -->
                  <td>
                    <div class="promo-title">{{ p.nombre }}</div>
                    <div class="promo-desc">{{ p.descripcion || 'Sin descripci&oacute;n adicional' }}</div>
                  </td>

                  <!-- Beneficio Comercial -->
                  <td>
                    <span *ngIf="p.tipo_descuento === 'PORCENTAJE'" class="benefit-badge badge-pct">
                      {{ p.valor_descuento }}% OFF
                    </span>
                    <span *ngIf="p.tipo_descuento === 'MONTO_FIJO'" class="benefit-badge badge-fixed">
                      <span class="currency">$</span>{{ p.valor_descuento | number:'1.2-2' }} USD
                    </span>
                    <span *ngIf="p.tipo_descuento === 'ENVIO_GRATIS'" class="benefit-badge badge-shipping">
                      &#128666; Env&iacute;o 100% Gratis
                    </span>
                  </td>

                  <!-- Reglas de Negocio -->
                  <td class="rules-cell">
                    <div>M&iacute;nimo: <strong><span class="currency">$</span>{{ p.monto_minimo_compra | number:'1.2-2' }}</strong></div>
                    <div *ngIf="p.descuento_maximo">Tope: <strong><span class="currency">$</span>{{ p.descuento_maximo | number:'1.2-2' }}</strong></div>
                    <div>L&iacute;mite: <strong>{{ p.limite_por_cliente }} uso(s)/cliente</strong></div>
                  </td>

                  <!-- Progreso de Canjes -->
                  <td class="text-center">
                    <div class="usage-numbers">
                      <strong>{{ p.usos_actuales }}</strong>
                      <span> / {{ p.limite_usos ? p.limite_usos : '&infin;' }}</span>
                    </div>
                    <div *ngIf="p.limite_usos" class="progress-bar-wrap">
                      <div class="progress-bar-fill" [style.width.%]="(p.usos_actuales / p.limite_usos) * 100"></div>
                    </div>
                  </td>

                  <!-- Vigencia -->
                  <td class="date-cell">
                    <div class="date-line">{{ p.fecha_inicio | date:'dd/MM/yyyy' }}</div>
                    <div class="date-sub">hasta {{ p.fecha_fin | date:'dd/MM/yyyy' }}</div>
                  </td>

                  <!-- Estado Toggle -->
                  <td class="text-center">
                    <button 
                      type="button"
                      (click)="alternarEstado(p)" 
                      [ngClass]="p.activo ? 'status-active' : 'status-inactive'"
                      class="status-pill">
                      {{ p.activo ? 'ACTIVO' : 'INACTIVO' }}
                    </button>
                  </td>

                  <!-- Acciones -->
                  <td class="text-right actions-cell">
                    <button 
                      type="button"
                      (click)="probarEnSimulador(p.codigo)" 
                      title="Probar en el Simulador de Canje" 
                      class="btn-action test">
                      &#9889; Probar
                    </button>
                    <button 
                      type="button"
                      (click)="eliminarPromo(p)" 
                      title="Eliminar o archivar campa&ntilde;a" 
                      class="btn-action delete">
                      &times;
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- ================= PESTAÑA 2: SIMULADOR DE CANJE (SANDBOX) ================= -->
      <section *ngIf="activeTab === 'simulador'" class="tab-content">
        <div class="simulator-layout">
          
          <!-- COLUMNA 1: CONFIGURACIÓN DE LA SIMULACIÓN -->
          <div class="sim-card">
            <div class="sim-card-header">
              <span class="badge-eyebrow">MOTOR DE REGLAS</span>
              <h2>Simular Canje de Cup&oacute;n</h2>
              <p class="sim-desc">
                Comprob&aacute; las reglas comerciales (gasto m&iacute;nimo, tope, vigencia y cupos) antes de lanzar la campa&ntilde;a a los clientes.
              </p>
            </div>

            <!-- Sugerencias de Códigos Rápidos -->
            <div class="form-group">
              <label class="form-label">Cupones r&aacute;pidos de prueba:</label>
              <div class="chips-wrap">
                <button 
                  type="button"
                  *ngFor="let c of cuponesSugeridos" 
                  (click)="simuladorCodigo = c"
                  [class.selected]="simuladorCodigo === c"
                  class="quick-chip">
                  {{ c }}
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">C&oacute;digo del Cup&oacute;n:</label>
              <input 
                type="text" 
                [(ngModel)]="simuladorCodigo" 
                placeholder="ej: ATELIER20" 
                class="custom-input uppercase font-mono" />
            </div>

            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label">Subtotal Prendas ($ USD):</label>
                <input 
                  type="number" 
                  [(ngModel)]="simuladorSubtotal" 
                  min="0" 
                  step="10" 
                  class="custom-input font-mono" />
              </div>

              <div class="form-group">
                <label class="form-label">Tarifa Env&iacute;o ($ USD):</label>
                <input 
                  type="number" 
                  [(ngModel)]="simuladorCostoEnvio" 
                  min="0" 
                  step="1" 
                  class="custom-input font-mono" />
              </div>
            </div>

            <button 
              type="button"
              (click)="ejecutarSimulacion()" 
              [disabled]="simulando || !simuladorCodigo.trim()"
              class="btn-submit-sim">
              <span *ngIf="simulando">Consultando Motor Comercial...</span>
              <span *ngIf="!simulando">&#9889; Validar &amp; Calcular Descuento</span>
            </button>
          </div>

          <!-- COLUMNA 2: TICKET DE RESULTADO EN VIVO -->
          <div class="sim-card ticket-card">
            <div class="sim-card-header">
              <span class="badge-eyebrow">AUDITOR&Iacute;A COMERCIAL</span>
              <h2>Desglose Financiero de Liquidaci&oacute;n</h2>
            </div>

            <!-- Estado Inicial Vacío -->
            <div *ngIf="!resultadoSimulacion" class="ticket-empty">
              <div class="empty-icon">&#129534;</div>
              <p>Ingres&aacute; un c&oacute;digo de cup&oacute;n y presion&aacute; <strong>Validar</strong> para simular el c&aacute;lculo financiero en vivo.</p>
            </div>

            <!-- Resultado: Cupón Válido -->
            <div *ngIf="resultadoSimulacion && resultadoSimulacion.valido" class="ticket-result">
              <div class="sim-banner success">
                <span class="banner-icon">&#127881;</span>
                <div>
                  <strong>{{ resultadoSimulacion.mensaje }}</strong>
                  <p>Cup&oacute;n validado con &eacute;xito bajo las pol&iacute;ticas comerciales vigentes de Atelier Noir.</p>
                </div>
              </div>

              <div class="ticket-box">
                <div class="ticket-head">
                  <span class="ticket-title">TICKET DE SIMULACI&Oacute;N</span>
                  <span class="ticket-token">#SIM-PROMO</span>
                </div>

                <div class="ticket-row">
                  <span>Subtotal prendas:</span>
                  <span class="ticket-val font-mono"><span class="currency">$</span>{{ simuladorSubtotal | number:'1.2-2' }} USD</span>
                </div>

                <div class="ticket-row discount">
                  <span>Descuento aplicado ({{ resultadoSimulacion.codigo }}):</span>
                  <span class="ticket-val font-mono">- <span class="currency">$</span>{{ resultadoSimulacion.descuento_calculado | number:'1.2-2' }} USD</span>
                </div>

                <div class="ticket-row">
                  <span>Costo de env&iacute;o courier:</span>
                  <span class="ticket-val font-mono" [class.strikethrough]="resultadoSimulacion.tipo_descuento === 'ENVIO_GRATIS'">
                    <span class="currency">$</span>{{ simuladorCostoEnvio | number:'1.2-2' }} USD
                  </span>
                </div>

                <div *ngIf="resultadoSimulacion.tipo_descuento === 'ENVIO_GRATIS'" class="ticket-row shipping-free">
                  <span>Bonificaci&oacute;n Yaigo Express:</span>
                  <span class="ticket-val font-mono">Gratis ($0.00)</span>
                </div>

                <div class="ticket-divider"></div>

                <div class="ticket-total">
                  <span>TOTAL FINAL A LIQUIDAR:</span>
                  <span class="grand-price font-mono"><span class="currency">$</span>{{ resultadoSimulacion.total_con_descuento | number:'1.2-2' }} USD</span>
                </div>
              </div>

              <!-- Reglas asociadas -->
              <div *ngIf="resultadoSimulacion.promocion" class="rules-detail-box">
                <span class="rules-header">Reglas aplicadas:</span>
                <div>Campa&ntilde;a: <strong>{{ resultadoSimulacion.promocion.nombre }}</strong></div>
                <div>Gasto m&iacute;nimo exigido: <strong><span class="currency">$</span>{{ resultadoSimulacion.promocion.monto_minimo_compra | number:'1.2-2' }} USD</strong></div>
                <div *ngIf="resultadoSimulacion.promocion.descuento_maximo">
                  Tope m&aacute;ximo de descuento: <strong><span class="currency">$</span>{{ resultadoSimulacion.promocion.descuento_maximo | number:'1.2-2' }} USD</strong>
                </div>
              </div>
            </div>

            <!-- Resultado: Cupón Rechazado -->
            <div *ngIf="resultadoSimulacion && !resultadoSimulacion.valido" class="ticket-result">
              <div class="sim-banner error">
                <span class="banner-icon">&#128683;</span>
                <div>
                  <strong>Cup&oacute;n Rechazado por el Motor</strong>
                  <p>{{ resultadoSimulacion.mensaje }}</p>
                </div>
              </div>

              <div class="ticket-box rejected">
                <div class="ticket-head">
                  <span class="ticket-title">TICKET RECHAZADO</span>
                  <span class="ticket-token">#SIN-DESCUENTO</span>
                </div>

                <div class="ticket-row">
                  <span>Subtotal prendas:</span>
                  <span class="ticket-val font-mono"><span class="currency">$</span>{{ simuladorSubtotal | number:'1.2-2' }} USD</span>
                </div>

                <div class="ticket-row">
                  <span>Descuento aplicado:</span>
                  <span class="ticket-val font-mono">$0.00 USD</span>
                </div>

                <div class="ticket-row">
                  <span>Costo de env&iacute;o courier:</span>
                  <span class="ticket-val font-mono"><span class="currency">$</span>{{ simuladorCostoEnvio | number:'1.2-2' }} USD</span>
                </div>

                <div class="ticket-divider"></div>

                <div class="ticket-total">
                  <span>TOTAL SIN DESCUENTO:</span>
                  <span class="grand-price font-mono"><span class="currency">$</span>{{ (simuladorSubtotal + simuladorCostoEnvio) | number:'1.2-2' }} USD</span>
                </div>
              </div>
            </div>

            <div class="ticket-foot">
              <span>MOTOR: PromoEngine v2.4</span>
              <span>ATELIER NOIR VALIDATOR</span>
            </div>
          </div>

        </div>
      </section>

      <!-- ================= MODAL: NUEVA CAMPAÑA / CUPÓN ================= -->
      <div *ngIf="modalNuevaPromo" class="modal-backdrop">
        <div class="modal-card">
          
          <div class="modal-head">
            <div>
              <div class="luxury-badge">ALTA COMERCIAL</div>
              <h3>Crear Nueva Campa&ntilde;a / Cup&oacute;n</h3>
            </div>
            <button type="button" class="modal-close" (click)="modalNuevaPromo = false">&times;</button>
          </div>

          <div class="modal-body">
            
            <div class="form-grid-2">
              <!-- Código -->
              <div class="form-group">
                <label class="form-label">C&oacute;digo del Cup&oacute;n *</label>
                <input 
                  type="text" 
                  [(ngModel)]="nuevaPromo.codigo" 
                  placeholder="ej: VERANO25" 
                  class="custom-input uppercase font-mono" />
              </div>

              <!-- Nombre -->
              <div class="form-group">
                <label class="form-label">Nombre de la Campa&ntilde;a *</label>
                <input 
                  type="text" 
                  [(ngModel)]="nuevaPromo.nombre" 
                  placeholder="ej: Descuento Colecci&oacute;n Noche" 
                  class="custom-input" />
              </div>
            </div>

            <!-- Descripción -->
            <div class="form-group">
              <label class="form-label">Descripci&oacute;n Comercial (Opcional):</label>
              <input 
                type="text" 
                [(ngModel)]="nuevaPromo.descripcion" 
                placeholder="ej: V&aacute;lido en prendas seleccionadas para compras presenciales y web" 
                class="custom-input" />
            </div>

            <div class="form-grid-2">
              <!-- Tipo de Descuento -->
              <div class="form-group">
                <label class="form-label">Tipo de Beneficio *</label>
                <select [(ngModel)]="nuevaPromo.tipo_descuento" class="custom-select">
                  <option value="PORCENTAJE">Porcentaje (%)</option>
                  <option value="MONTO_FIJO">Monto Fijo ($ USD)</option>
                  <option value="ENVIO_GRATIS">Env&iacute;o 100% Bonificado</option>
                </select>
              </div>

              <!-- Valor de Descuento -->
              <div class="form-group">
                <label class="form-label">
                  Valor del Beneficio {{ nuevaPromo.tipo_descuento === 'PORCENTAJE' ? '(%)' : '($ USD)' }} *
                </label>
                <input 
                  type="number" 
                  [(ngModel)]="nuevaPromo.valor_descuento" 
                  min="0" 
                  step="5" 
                  [disabled]="nuevaPromo.tipo_descuento === 'ENVIO_GRATIS'"
                  class="custom-input" />
              </div>
            </div>

            <div class="form-grid-2">
              <!-- Monto Mínimo Compra -->
              <div class="form-group">
                <label class="form-label">Gasto M&iacute;nimo Exigido ($ USD):</label>
                <input 
                  type="number" 
                  [(ngModel)]="nuevaPromo.monto_minimo_compra" 
                  min="0" 
                  class="custom-input" />
              </div>

              <!-- Descuento Máximo (Tope) -->
              <div class="form-group">
                <label class="form-label">Tope M&aacute;x. de Descuento ($ USD):</label>
                <input 
                  type="number" 
                  [(ngModel)]="nuevaPromo.descuento_maximo" 
                  min="0" 
                  placeholder="Opcional (sin tope)" 
                  class="custom-input" />
              </div>
            </div>

            <div class="form-grid-2">
              <!-- Límite Global de Usos -->
              <div class="form-group">
                <label class="form-label">L&iacute;mite Total de Canjes:</label>
                <input 
                  type="number" 
                  [(ngModel)]="nuevaPromo.limite_usos" 
                  min="1" 
                  placeholder="Opcional (ilimitado)" 
                  class="custom-input" />
              </div>

              <!-- Límite por Cliente -->
              <div class="form-group">
                <label class="form-label">L&iacute;mite por Cliente:</label>
                <input 
                  type="number" 
                  [(ngModel)]="nuevaPromo.limite_por_cliente" 
                  min="1" 
                  class="custom-input" />
              </div>
            </div>

            <div class="form-grid-2">
              <!-- Fechas Vigencia -->
              <div class="form-group">
                <label class="form-label">Fecha de Inicio *</label>
                <input 
                  type="date" 
                  [(ngModel)]="fechaInicioInput" 
                  class="custom-input" />
              </div>

              <div class="form-group">
                <label class="form-label">Fecha de Vencimiento *</label>
                <input 
                  type="date" 
                  [(ngModel)]="fechaFinInput" 
                  class="custom-input" />
              </div>
            </div>

          </div>

          <div class="modal-foot">
            <button type="button" class="btn-cancel" (click)="modalNuevaPromo = false">Cancelar</button>
            <button 
              type="button" 
              class="btn-submit-modal" 
              (click)="guardarNuevaPromo()" 
              [disabled]="guardandoPromo">
              {{ guardandoPromo ? 'Guardando...' : 'Crear Promoci&oacute;n' }}
            </button>
          </div>

        </div>
      </div>

    </div>
  `,
  styles: [`
    .promociones-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem 1.5rem 4rem;
      color: #111827;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* HEADER */
    .promo-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 1.5rem;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .header-titles h1 {
      font-size: 1.85rem;
      font-weight: 800;
      color: #111827;
      margin: 0.25rem 0 0.4rem;
      letter-spacing: -0.5px;
    }
    .subtitle {
      font-size: 0.9rem;
      color: #6b7280;
      margin: 0;
      max-width: 650px;
      line-height: 1.4;
    }
    .luxury-badge {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 0.25rem 0.65rem;
      border-radius: 4px;
      background: #000000;
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    /* HEADER ACTIONS & TABS */
    .header-actions {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.75rem;
    }
    .tabs-switcher {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #f3f4f6;
      padding: 0.35rem 0.5rem;
      border-radius: 9999px;
      border: 1px solid #e5e7eb;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: #6b7280;
      font-weight: 600;
      font-size: 0.85rem;
      padding: 0.55rem 1.3rem;
      border-radius: 9999px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .tab-btn:hover {
      color: #111827;
    }
    .tab-btn.active {
      background: #ffffff;
      color: #000000;
      font-weight: 700;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
    }
    .tab-icon {
      font-weight: 700;
      opacity: 0.85;
    }
    .btn-nueva-campana {
      background: #000000;
      color: #ffffff;
      border: 1px solid #000000;
      font-weight: 700;
      font-size: 0.85rem;
      padding: 0.65rem 1.45rem;
      border-radius: 9999px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .btn-nueva-campana:hover {
      background: #1f2937;
      border-color: #1f2937;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .btn-plus-icon {
      font-size: 1.05rem;
      line-height: 1;
      font-weight: 700;
    }

    /* TOAST ALERTS */
    .toast-alert {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.85rem 1.25rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      font-size: 0.88rem;
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
    .toast-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .toast-icon { font-weight: bold; }
    .toast-close {
      background: none;
      border: none;
      font-size: 1.2rem;
      color: currentColor;
      opacity: 0.6;
      cursor: pointer;
    }
    .toast-close:hover { opacity: 1; }

    /* METRICS GRID */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }
    .metric-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 1.25rem 1.5rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    }
    .metric-label {
      display: block;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6b7280;
    }
    .metric-label.emerald { color: #059669; }
    .metric-val {
      font-size: 2rem;
      font-weight: 800;
      color: #111827;
      margin: 0.35rem 0 0.15rem;
      letter-spacing: -0.5px;
    }
    .metric-val.emerald { color: #059669; }
    .metric-sub {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    /* FILTERS TOOLBAR */
    .filters-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 0.85rem 1rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }
    .search-box {
      position: relative;
      flex: 1;
      min-width: 260px;
      max-width: 400px;
    }
    .search-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.85rem;
      color: #9ca3af;
    }
    .search-input {
      width: 100%;
      box-sizing: border-box;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 0.55rem 0.85rem 0.55rem 2.2rem;
      font-size: 0.85rem;
      color: #111827;
      outline: none;
      transition: border-color 0.2s;
    }
    .search-input:focus { border-color: #000000; }
    .filter-selects {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .custom-select {
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 0.55rem 0.85rem;
      font-size: 0.82rem;
      color: #374151;
      outline: none;
      cursor: pointer;
      transition: border-color 0.2s;
    }
    .custom-select:focus { border-color: #000000; }
    .btn-refresh {
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 9999px;
      padding: 0.55rem 1.15rem;
      font-size: 0.95rem;
      color: #4b5563;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-refresh:hover {
      background: #f3f4f6;
      color: #111827;
      border-color: #9ca3af;
    }

    /* TABLE */
    .table-wrapper {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .table-state {
      padding: 3.5rem 1rem;
      text-align: center;
      color: #6b7280;
      font-size: 0.9rem;
    }
    .empty-icon {
      font-size: 2.2rem;
      margin-bottom: 0.5rem;
    }
    .table-responsive {
      overflow-x: auto;
    }
    .promo-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.85rem;
    }
    .promo-table th {
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
      padding: 0.85rem 1.1rem;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6b7280;
    }
    .promo-table td {
      padding: 1rem 1.1rem;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: middle;
      color: #1f2937;
    }
    .table-row:hover {
      background: #fafafa;
    }

    /* CODE BADGE & COPY */
    .code-badge-wrap {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .code-badge {
      font-family: 'JetBrains Mono', monospace, Consolas;
      font-weight: 700;
      font-size: 0.85rem;
      background: #f3f4f6;
      color: #000000;
      border: 1px solid #d1d5db;
      padding: 0.25rem 0.55rem;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .btn-copy {
      background: none;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      font-size: 0.85rem;
      padding: 0.2rem;
      transition: color 0.2s;
    }
    .btn-copy:hover { color: #000000; }

    /* PROMO DETAILS */
    .promo-title {
      font-weight: 700;
      color: #111827;
      margin-bottom: 0.15rem;
    }
    .promo-desc {
      font-size: 0.75rem;
      color: #6b7280;
      max-width: 280px;
      line-height: 1.3;
    }

    /* BENEFIT BADGES */
    .benefit-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
    }
    .badge-pct {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .badge-fixed {
      background: #eff6ff;
      color: #1e40af;
      border: 1px solid #bfdbfe;
    }
    .badge-shipping {
      background: #f5f3ff;
      color: #5b21b6;
      border: 1px solid #ddd6fe;
    }

    /* RULES */
    .rules-cell {
      font-size: 0.78rem;
      color: #4b5563;
      line-height: 1.4;
    }
    .rules-cell strong {
      color: #111827;
    }

    /* PROGRESS */
    .usage-numbers {
      font-family: monospace;
      font-size: 0.8rem;
    }
    .usage-numbers strong { color: #111827; }
    .usage-numbers span { color: #9ca3af; }
    .progress-bar-wrap {
      width: 75px;
      height: 5px;
      background: #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
      margin: 0.35rem auto 0;
    }
    .progress-bar-fill {
      height: 100%;
      background: #000000;
      border-radius: 10px;
    }

    /* DATES */
    .date-cell {
      font-size: 0.78rem;
    }
    .date-line {
      color: #111827;
      font-weight: 600;
    }
    .date-sub {
      color: #9ca3af;
      font-size: 0.72rem;
    }

    /* STATUS PILL */
    .status-pill {
      border: none;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      padding: 0.3rem 0.75rem;
      border-radius: 20px;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .status-pill:hover { opacity: 0.8; }
    .status-active {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .status-inactive {
      background: #f3f4f6;
      color: #6b7280;
      border: 1px solid #d1d5db;
    }

    /* ACTIONS CELL */
    .actions-cell {
      white-space: nowrap;
    }
    .btn-action {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.38rem 0.85rem;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.2s;
      margin-left: 0.6rem;
    }
    .btn-action.test {
      background: #ffffff;
      border: 1px solid #d1d5db;
      color: #111827;
    }
    .btn-action.test:hover {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
    }
    .btn-action.delete {
      background: #ffffff;
      border: 1px solid #fecaca;
      color: #dc2626;
    }
    .btn-action.delete:hover {
      background: #fee2e2;
    }

    /* ================= SIMULADOR LAYOUT ================= */
    .simulator-layout {
      display: grid;
      grid-template-columns: 1fr 1.25fr;
      gap: 1.75rem;
    }
    @media (max-width: 900px) {
      .simulator-layout {
        grid-template-columns: 1fr;
      }
    }
    .sim-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 1.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .badge-eyebrow {
      display: block;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 0.25rem;
    }
    .sim-card-header h2 {
      font-size: 1.35rem;
      font-weight: 800;
      color: #111827;
      margin: 0 0 0.35rem;
    }
    .sim-desc {
      font-size: 0.82rem;
      color: #6b7280;
      margin: 0 0 1.5rem;
      line-height: 1.4;
    }

    .form-group {
      margin-bottom: 1.15rem;
    }
    .form-label {
      display: block;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #374151;
      margin-bottom: 0.4rem;
    }
    .chips-wrap {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .quick-chip {
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      color: #111827;
      font-family: monospace;
      font-weight: 700;
      font-size: 0.78rem;
      padding: 0.35rem 0.75rem;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .quick-chip:hover {
      border-color: #000000;
    }
    .quick-chip.selected {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
    }
    .custom-input {
      width: 100%;
      box-sizing: border-box;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 0.65rem 0.85rem;
      font-size: 0.9rem;
      color: #111827;
      outline: none;
      transition: border-color 0.2s;
    }
    .custom-input:focus { border-color: #000000; }
    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .uppercase { text-transform: uppercase; }
    .font-mono { font-family: 'JetBrains Mono', monospace, Consolas; }

    .btn-submit-sim {
      width: 100%;
      background: #000000;
      color: #ffffff;
      border: 1px solid #000000;
      font-weight: 700;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 0.85rem 1.6rem;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 0.5rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
    .btn-submit-sim:hover:not(:disabled) {
      background: #1f2937;
      border-color: #1f2937;
    }
    .btn-submit-sim:disabled { opacity: 0.5; cursor: not-allowed; }

    /* TICKET CARD */
    .ticket-empty {
      padding: 4rem 1rem;
      text-align: center;
      color: #6b7280;
      font-size: 0.9rem;
      background: #f9fafb;
      border: 1px dashed #d1d5db;
      border-radius: 8px;
      margin: 1rem 0;
    }
    .sim-banner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border-radius: 8px;
      margin-bottom: 1.25rem;
    }
    .sim-banner.success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    }
    .sim-banner.error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }
    .banner-icon { font-size: 1.5rem; }
    .sim-banner p { margin: 0.2rem 0 0; font-size: 0.78rem; opacity: 0.9; }

    .ticket-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.25rem;
    }
    .ticket-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: #6b7280;
      letter-spacing: 1px;
      border-bottom: 1px dashed #d1d5db;
      padding-bottom: 0.6rem;
      margin-bottom: 0.75rem;
    }
    .ticket-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      padding: 0.35rem 0;
      color: #4b5563;
    }
    .ticket-row.discount {
      color: #059669;
      font-weight: 700;
    }
    .ticket-row.shipping-free {
      color: #5b21b6;
      font-weight: 600;
    }
    .ticket-divider {
      height: 1px;
      background: #e5e7eb;
      margin: 0.65rem 0;
    }
    .ticket-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
      font-weight: 800;
      color: #111827;
      padding-top: 0.25rem;
    }
    .grand-price {
      font-size: 1.25rem;
      color: #000000;
    }
    .strikethrough { text-decoration: line-through; color: #9ca3af; }

    .rules-detail-box {
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 0.85rem 1rem;
      font-size: 0.8rem;
      color: #374151;
      line-height: 1.4;
    }
    .rules-header {
      display: block;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6b7280;
      margin-bottom: 0.25rem;
    }
    .ticket-foot {
      display: flex;
      justify-content: space-between;
      font-size: 0.72rem;
      color: #9ca3af;
      font-family: monospace;
      border-top: 1px solid #e5e7eb;
      padding-top: 0.85rem;
      margin-top: 1.5rem;
    }

    /* ================= MODAL ================= */
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
    .modal-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      max-width: 650px;
      width: 100%;
      max-height: 92vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      animation: modalFadeIn 0.2s ease-out;
    }
    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.97); }
      to { opacity: 1; transform: scale(1); }
    }
    .modal-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .modal-head h3 {
      font-size: 1.25rem;
      font-weight: 800;
      color: #111827;
      margin: 0.2rem 0 0;
    }
    .modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: #6b7280;
      cursor: pointer;
    }
    .modal-close:hover { color: #111827; }
    .modal-body {
      padding: 1.5rem;
    }
    .modal-foot {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
    }
    .btn-cancel {
      background: #ffffff;
      border: 1px solid #d1d5db;
      color: #374151;
      font-weight: 600;
      font-size: 0.85rem;
      padding: 0.65rem 1.4rem;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-cancel:hover { background: #f3f4f6; color: #111827; }
    .btn-submit-modal {
      background: #000000;
      color: #ffffff;
      border: 1px solid #000000;
      font-weight: 600;
      font-size: 0.85rem;
      padding: 0.65rem 1.5rem;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-submit-modal:hover:not(:disabled) {
      background: #1f2937;
      border-color: #1f2937;
    }
    .btn-submit-modal:disabled { opacity: 0.5; cursor: not-allowed; }

    /* UTILITIES */
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .spinner-inline {
      width: 24px;
      height: 24px;
      border: 2px solid rgba(0, 0, 0, 0.1);
      border-top-color: #000000;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin: 0 auto 0.75rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class PromocionesPageComponent implements OnInit {
  private readonly ventasService = inject(VentasService);

  activeTab: 'campanas' | 'simulador' = 'campanas';
  promociones: Promocion[] = [];
  cargando = false;
  mensajeExito: string | null = null;
  errorGeneral: string | null = null;

  // Filtros
  filtroTexto = '';
  filtroTipo = 'TODOS';
  filtroEstado = 'TODOS';

  // Simulador
  simuladorCodigo = 'ATELIER20';
  simuladorSubtotal = 120;
  simuladorCostoEnvio = 5;
  simulando = false;
  resultadoSimulacion: ValidarCuponResponse | null = null;
  cuponesSugeridos = ['ATELIER20', 'NOIR50', 'ENVIOGRATIS'];

  // Modal Crear
  modalNuevaPromo = false;
  guardandoPromo = false;
  fechaInicioInput = '';
  fechaFinInput = '';
  nuevaPromo: PromocionCreate = {
    codigo: '',
    nombre: '',
    descripcion: '',
    tipo_descuento: 'PORCENTAJE',
    valor_descuento: 20,
    monto_minimo_compra: 60,
    descuento_maximo: undefined,
    limite_usos: 150,
    limite_por_cliente: 1,
    fecha_inicio: '',
    fecha_fin: '',
    activo: true
  };

  ngOnInit(): void {
    this.cargarPromociones();
  }

  cargarPromociones(): void {
    this.cargando = true;
    this.errorGeneral = null;
    this.ventasService.getPromociones().subscribe({
      next: (data) => {
        this.promociones = data;
        this.cargando = false;
      },
      error: (err) => {
        this.errorGeneral = 'Error al cargar las promociones: ' + (err.error?.detail || err.message);
        this.cargando = false;
      }
    });
  }

  get totalActivas(): number {
    return this.promociones.filter(p => p.activo).length;
  }

  get totalUsos(): number {
    return this.promociones.reduce((acc, p) => acc + (p.usos_actuales || 0), 0);
  }

  get totalAhorroEstimado(): number {
    return this.promociones.reduce((acc, p) => {
      const usos = p.usos_actuales || 0;
      if (p.tipo_descuento === 'MONTO_FIJO') return acc + (usos * p.valor_descuento);
      if (p.tipo_descuento === 'PORCENTAJE') return acc + (usos * 24.0);
      if (p.tipo_descuento === 'ENVIO_GRATIS') return acc + (usos * 5.0);
      return acc;
    }, 0);
  }

  get promocionesFiltradas(): Promocion[] {
    return this.promociones.filter(p => {
      const matchTexto = !this.filtroTexto.trim() || 
        p.codigo.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        p.nombre.toLowerCase().includes(this.filtroTexto.toLowerCase());
      
      const matchTipo = this.filtroTipo === 'TODOS' || p.tipo_descuento === this.filtroTipo;
      
      const matchEstado = this.filtroEstado === 'TODOS' || 
        (this.filtroEstado === 'ACTIVOS' && p.activo) ||
        (this.filtroEstado === 'INACTIVOS' && !p.activo);

      return matchTexto && matchTipo && matchEstado;
    });
  }

  copiarCodigo(codigo: string): void {
    navigator.clipboard.writeText(codigo);
    this.mensajeExito = 'Código ' + codigo + ' copiado al portapapeles.';
    setTimeout(() => this.mensajeExito = null, 3000);
  }

  alternarEstado(p: Promocion): void {
    const nuevoEstado = !p.activo;
    this.ventasService.cambiarEstadoPromocion(p.id, nuevoEstado).subscribe({
      next: (actualizada) => {
        p.activo = actualizada.activo;
        this.mensajeExito = 'Promoción ' + p.codigo + ' ' + (p.activo ? 'activada' : 'desactivada') + ' exitosamente.';
        setTimeout(() => this.mensajeExito = null, 3000);
      },
      error: (err) => {
        this.errorGeneral = 'Error al cambiar estado: ' + (err.error?.detail || err.message);
      }
    });
  }

  eliminarPromo(p: Promocion): void {
    if (!confirm('¿Deseas eliminar o archivar la promoción ' + p.codigo + '?')) return;

    this.ventasService.deletePromocion(p.id).subscribe({
      next: (res) => {
        this.mensajeExito = res.mensaje || ('Promoción ' + p.codigo + ' procesada.');
        this.cargarPromociones();
      },
      error: (err) => {
        this.errorGeneral = 'Error al eliminar promoción: ' + (err.error?.detail || err.message);
      }
    });
  }

  probarEnSimulador(codigo: string): void {
    this.simuladorCodigo = codigo;
    this.activeTab = 'simulador';
    this.ejecutarSimulacion();
  }

  ejecutarSimulacion(): void {
    if (!this.simuladorCodigo.trim()) return;

    this.simulando = true;
    this.resultadoSimulacion = null;
    this.ventasService.validarCupon({
      codigo: this.simuladorCodigo.trim(),
      subtotal: this.simuladorSubtotal,
      costo_envio: this.simuladorCostoEnvio
    }).subscribe({
      next: (res) => {
        this.resultadoSimulacion = res;
        this.simulando = false;
      },
      error: (err) => {
        this.resultadoSimulacion = {
          valido: false,
          codigo: this.simuladorCodigo,
          mensaje: err.error?.detail || 'Error de conexión con el motor de validación',
          descuento_calculado: 0,
          total_con_descuento: this.simuladorSubtotal + this.simuladorCostoEnvio
        };
        this.simulando = false;
      }
    });
  }

  abrirModalNuevaPromo(): void {
    const hoy = new Date();
    const proximoMes = new Date();
    proximoMes.setDate(hoy.getDate() + 30);

    this.fechaInicioInput = hoy.toISOString().split('T')[0];
    this.fechaFinInput = proximoMes.toISOString().split('T')[0];

    this.nuevaPromo = {
      codigo: '',
      nombre: '',
      descripcion: '',
      tipo_descuento: 'PORCENTAJE',
      valor_descuento: 20,
      monto_minimo_compra: 60,
      descuento_maximo: undefined,
      limite_usos: 150,
      limite_por_cliente: 1,
      fecha_inicio: '',
      fecha_fin: '',
      activo: true
    };
    this.modalNuevaPromo = true;
  }

  guardarNuevaPromo(): void {
    if (!this.nuevaPromo.codigo.trim() || !this.nuevaPromo.nombre.trim()) {
      this.errorGeneral = 'El código y el nombre de la promoción son obligatorios.';
      return;
    }

    if (!this.fechaInicioInput || !this.fechaFinInput) {
      this.errorGeneral = 'Debes especificar las fechas de inicio y fin.';
      return;
    }

    this.guardandoPromo = true;
    this.nuevaPromo.fecha_inicio = new Date(this.fechaInicioInput + 'T00:00:00Z').toISOString();
    this.nuevaPromo.fecha_fin = new Date(this.fechaFinInput + 'T23:59:59Z').toISOString();

    this.ventasService.createPromocion(this.nuevaPromo).subscribe({
      next: (creada) => {
        this.mensajeExito = 'Promoción ' + creada.codigo + ' creada con éxito!';
        this.guardandoPromo = false;
        this.modalNuevaPromo = false;
        this.cargarPromociones();
      },
      error: (err) => {
        this.errorGeneral = 'Error al crear la promoción: ' + (err.error?.detail || err.message);
        this.guardandoPromo = false;
      }
    });
  }
}
