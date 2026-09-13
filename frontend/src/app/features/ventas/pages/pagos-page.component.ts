import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { VentasService } from '../services/ventas.service';
import {
  PagoResponse, PagoElectronicoCreate, QRGenerarResponse,
  DatosTarjetaInput
} from '../models/ventas.models';

@Component({
  selector: 'app-pagos-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="atelier-pagos-container">
      <!-- HEADER -->
      <header class="pagos-header">
        <div class="header-titles">
          <div class="subtitle-badge">ATELIER NOIR &bull; CAJA &amp; PAGOS</div>
          <h1>Pasarela de Pagos Multi-Canal</h1>
          <p class="description">
            Cobro digital y conciliación omnicanal: QR Simple (Libélula Bolivia), Tarjetas de Crédito/Débito (Stripe Sandbox) y Billetera Digital (PayPal Express).
          </p>
        </div>
        <div class="header-actions">
          <div class="tabs-switcher">
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab === 'terminal'"
              (click)="activeTab = 'terminal'">
              Terminal de Cobro
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab === 'historial'"
              (click)="cambiarAHistorial()">
              Historial &amp; Conciliación
            </button>
          </div>
        </div>
      </header>

      <!-- MENSAJES DE ALERTA -->
      <div *ngIf="mensajeExito" class="toast-banner success">
        <span class="toast-icon">&#10003;</span>
        <div class="toast-body">
          <strong>Operación Exitosa</strong>
          <span>{{ mensajeExito }}</span>
        </div>
        <button type="button" class="btn-close-toast" (click)="mensajeExito = null">&times;</button>
      </div>

      <div *ngIf="mensajeError" class="toast-banner error">
        <span class="toast-icon">&#9888;</span>
        <div class="toast-body">
          <strong>Transacción Rechazada / Error</strong>
          <span>{{ mensajeError }}</span>
        </div>
        <button type="button" class="btn-close-toast" (click)="mensajeError = null">&times;</button>
      </div>

      <!-- TAB 1: TERMINAL DE COBRO -->
      <main *ngIf="activeTab === 'terminal'" class="terminal-layout">
        <!-- COLUMNA IZQUIERDA: CONFIGURACIÓN DEL COBRO -->
        <section class="atelier-card checkout-params-card">
          <div class="card-header">
            <h3>1. Parámetros del Cobro</h3>
            <span class="gold-pill">Configuración</span>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>Monto a Cobrar *</label>
              <div class="input-currency-group">
                <span class="currency-label">{{ moneda === 'USD' ? '$' : 'Bs.' }}</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  [(ngModel)]="monto"
                  class="atelier-input-amount"
                  placeholder="0.00"
                  [disabled]="qrActivo !== null">
              </div>
            </div>

            <div class="form-group">
              <label>Moneda de Liquidación</label>
              <select [(ngModel)]="moneda" class="atelier-select" [disabled]="qrActivo !== null">
                <option value="USD">USD - Dólar Estadounidense ($)</option>
                <option value="BOB">BOB - Bolivianos (Bs.)</option>
              </select>
            </div>

            <div class="form-group full-width">
              <label>Concepto / Glosa de Cobro</label>
              <input
                type="text"
                [(ngModel)]="concepto"
                class="atelier-input"
                placeholder="Ej: Conjunto Gala Seda Negra - Colección Atelier"
                [disabled]="qrActivo !== null">
            </div>

            <div class="form-group full-width">
              <label>Email del Cliente (Envío de Voucher)</label>
              <input
                type="email"
                [(ngModel)]="clienteEmail"
                class="atelier-input"
                placeholder="cliente@ateliernoir.com"
                [disabled]="qrActivo !== null">
            </div>

            <div class="form-group full-width">
              <label>ID Ticket Venta Asociada (Opcional)</label>
              <input
                type="number"
                [(ngModel)]="ventaId"
                class="atelier-input"
                placeholder="Ej: 15 (Dejar vacío para anticipo/reserva)"
                [disabled]="qrActivo !== null">
            </div>
          </div>

          <!-- RESUMEN EN VIVO -->
          <div class="live-summary-box">
            <div class="summary-row">
              <span>Importe Base:</span>
              <span class="amount-val">{{ moneda === 'USD' ? '$' : 'Bs.' }} {{ monto | number:'1.2-2' }}</span>
            </div>
            <div class="summary-row">
              <span>Comisión de Pasarela (0% Sandbox):</span>
              <span class="free-badge">BONIFICADO</span>
            </div>
            <div class="divider-gold"></div>
            <div class="summary-row total-row">
              <span>TOTAL A LIQUIDAR:</span>
              <span class="gold-price">{{ moneda === 'USD' ? '$' : 'Bs.' }} {{ monto | number:'1.2-2' }}</span>
            </div>
          </div>
        </section>

        <!-- COLUMNA DERECHA: SELECCIÓN DE MÉTODO Y EJECUCIÓN -->
        <section class="atelier-card payment-method-card">
          <div class="card-header">
            <h3>2. Método &amp; Pasarela de Pago</h3>
            <span class="gold-pill">Multi-Pasarela</span>
          </div>

          <!-- SELECTOR DE PASARELAS -->
          <div class="gateway-selector">
            <button
              type="button"
              class="gateway-option"
              [class.selected]="metodoSeleccionado === 'QR_SIMPLE'"
              (click)="seleccionarMetodo('QR_SIMPLE')">
              <div class="gateway-icon qr-icon">&#9638;</div>
              <div class="gateway-info">
                <strong>QR Simple Libélula</strong>
                <small>Bolivia &bull; Banco Central / BNB / BCP</small>
              </div>
              <span *ngIf="metodoSeleccionado === 'QR_SIMPLE'" class="check-badge">&#10003;</span>
            </button>

            <button
              type="button"
              class="gateway-option"
              [class.selected]="metodoSeleccionado === 'TARJETA'"
              (click)="seleccionarMetodo('TARJETA')">
              <div class="gateway-icon card-icon">&#128179;</div>
              <div class="gateway-info">
                <strong>Tarjeta Débito / Crédito</strong>
                <small>Stripe Gateway &bull; Visa, Mastercard</small>
              </div>
              <span *ngIf="metodoSeleccionado === 'TARJETA'" class="check-badge">&#10003;</span>
            </button>

            <button
              type="button"
              class="gateway-option"
              [class.selected]="metodoSeleccionado === 'PAYPAL'"
              (click)="seleccionarMetodo('PAYPAL')">
              <div class="gateway-icon paypal-icon">P</div>
              <div class="gateway-info">
                <strong>PayPal Express</strong>
                <small>Billetera Digital Internacional</small>
              </div>
              <span *ngIf="metodoSeleccionado === 'PAYPAL'" class="check-badge">&#10003;</span>
            </button>
          </div>

          <!-- PANEL ESPECÍFICO: QR SIMPLE -->
          <div *ngIf="metodoSeleccionado === 'QR_SIMPLE'" class="gateway-panel qr-panel">
            <div *ngIf="!qrActivo" class="qr-pre-generate">
              <div class="instruction-box">
                <p>Al presionar <strong>"Generar Código QR Dinámico"</strong>, el sistema contactará la pasarela de Libélula para registrar el identificador único de recaudación con expiración de 5 minutos.</p>
              </div>
              <button
                type="button"
                class="btn-atelier-gold btn-large"
                (click)="generarQR()"
                [disabled]="cargandoQr || monto <= 0">
                <span *ngIf="cargandoQr" class="spinner-inline"></span>
                {{ cargandoQr ? 'Generando Código QR...' : '&#9638; Generar Código QR Dinámico' }}
              </button>
            </div>

            <!-- QR GENERADO Y ACTIVO -->
            <div *ngIf="qrActivo" class="qr-active-display">
              <div class="qr-status-bar" [class.confirmed]="qrConfirmadoExitoso" [class.expired]="qrExpirado">
                <span *ngIf="qrConfirmadoExitoso" class="status-badge confirmed">&#10003; PAGO ACREDITADO EN BANCO</span>
                <span *ngIf="!qrConfirmadoExitoso && !qrExpirado" class="status-badge pending">&#9203; ESPERANDO TRANSFERENCIA CLIENTE...</span>
                <span *ngIf="qrExpirado" class="status-badge expired">&#9888; QR EXPIRADO</span>

                <div class="countdown-timer" *ngIf="!qrConfirmadoExitoso && !qrExpirado">
                  <span>Expira en:</span>
                  <strong class="timer-digits">{{ formatCountdown(qrCountdown) }}</strong>
                </div>
              </div>

              <!-- CONTENEDOR DEL SVG QR -->
              <div class="qr-svg-wrapper">
                <div class="qr-svg-frame" [innerHTML]="sanitizedQrSvg"></div>
                <div class="qr-details">
                  <div class="qr-detail-item">
                    <span class="label">Recaudación:</span>
                    <span class="value code-font">{{ qrActivo.codigo_recaudacion }}</span>
                  </div>
                  <div class="qr-detail-item">
                    <span class="label">Importe QR:</span>
                    <span class="value highlight-gold">{{ qrActivo.moneda === 'USD' ? '$' : 'Bs.' }} {{ qrActivo.monto | number:'1.2-2' }}</span>
                  </div>
                </div>
              </div>

              <!-- ACCIONES DE SIMULACIÓN QR -->
              <div class="qr-actions-row">
                <button
                  type="button"
                  *ngIf="!qrConfirmadoExitoso && !qrExpirado"
                  class="btn-atelier-gold"
                  (click)="simularAcreditacionQR()"
                  [disabled]="verificandoQr">
                  <span *ngIf="verificandoQr" class="spinner-inline"></span>
                  {{ verificandoQr ? 'Verificando con Banco...' : '&#10003; Simular Acreditación Bancaria' }}
                </button>

                <button
                  type="button"
                  *ngIf="qrConfirmadoExitoso && pagoQrActual"
                  class="btn-atelier-outline"
                  (click)="abrirVoucher(pagoQrActual)">
                  &#128196; Ver Voucher Digital
                </button>

                <button
                  type="button"
                  class="btn-atelier-text"
                  (click)="cancelarOResetQR()">
                  {{ qrConfirmadoExitoso ? 'Nuevo Cobro' : 'Cancelar QR' }}
                </button>
              </div>
            </div>
          </div>

          <!-- PANEL ESPECÍFICO: TARJETA CRÉDITO/DÉBITO (STRIPE) -->
          <div *ngIf="metodoSeleccionado === 'TARJETA'" class="gateway-panel card-panel">
            <!-- TARJETA VISUAL ATELIER LUXURY -->
            <div class="luxury-credit-card-preview">
              <div class="card-chip">&#9636;&#9636;</div>
              <div class="card-brand-logo">
                {{ detectarFranquicia(tarjeta.numero) }}
              </div>
              <div class="card-number-display">
                {{ formatearTarjetaDisplay(tarjeta.numero) }}
              </div>
              <div class="card-meta-row">
                <div class="card-holder-box">
                  <small>TITULAR DE LA TARJETA</small>
                  <span>{{ tarjeta.titular ? (tarjeta.titular | uppercase) : 'NOMBRE DEL CLIENTE' }}</span>
                </div>
                <div class="card-expiry-box">
                  <small>EXPIRA</small>
                  <span>{{ tarjeta.mes_exp || 'MM' }}/{{ tarjeta.anio_exp || 'AA' }}</span>
                </div>
              </div>
            </div>

            <!-- BOTONES DE RELLENO RÁPIDO PARA TESTING -->
            <div class="quick-test-bar">
              <span class="quick-label">Tarjetas Sandbox de Prueba:</span>
              <button type="button" class="btn-chip approved" (click)="llenarTarjetaAprobada()">
                &#10003; Tarjeta Válida (Stripe 4242...)
              </button>
              <button type="button" class="btn-chip declined" (click)="llenarTarjetaRechazada()">
                &#9888; Sin Fondos (Stripe 4000...)
              </button>
            </div>

            <!-- FORMULARIO DE DATOS DE TARJETA -->
            <div class="card-form-grid">
              <div class="form-group full-width">
                <label>Número de Tarjeta (16 dígitos) *</label>
                <input
                  type="text"
                  [(ngModel)]="tarjeta.numero"
                  class="atelier-input"
                  maxlength="19"
                  placeholder="4242 4242 4242 4242"
                  (input)="limpiarMascaraTarjeta()">
              </div>

              <div class="form-group">
                <label>Mes Exp (MM) *</label>
                <select [(ngModel)]="tarjeta.mes_exp" class="atelier-select">
                  <option value="01">01 - Ene</option>
                  <option value="02">02 - Feb</option>
                  <option value="03">03 - Mar</option>
                  <option value="04">04 - Abr</option>
                  <option value="05">05 - May</option>
                  <option value="06">06 - Jun</option>
                  <option value="07">07 - Jul</option>
                  <option value="08">08 - Ago</option>
                  <option value="09">09 - Sep</option>
                  <option value="10">10 - Oct</option>
                  <option value="11">11 - Nov</option>
                  <option value="12">12 - Dic</option>
                </select>
              </div>

              <div class="form-group">
                <label>Año Exp (AA) *</label>
                <select [(ngModel)]="tarjeta.anio_exp" class="atelier-select">
                  <option value="25">2025</option>
                  <option value="26">2026</option>
                  <option value="27">2027</option>
                  <option value="28">2028</option>
                  <option value="29">2029</option>
                  <option value="30">2030</option>
                </select>
              </div>

              <div class="form-group">
                <label>CVC / CVV *</label>
                <input
                  type="password"
                  [(ngModel)]="tarjeta.cvc"
                  class="atelier-input"
                  maxlength="4"
                  placeholder="123">
              </div>

              <div class="form-group full-width">
                <label>Nombre y Apellido del Titular *</label>
                <input
                  type="text"
                  [(ngModel)]="tarjeta.titular"
                  class="atelier-input"
                  placeholder="ISABELLA VANDERBILT">
              </div>
            </div>

            <button
              type="button"
              class="btn-atelier-gold btn-large"
              (click)="procesarPagoTarjeta()"
              [disabled]="procesandoTarjeta || !tarjeta.numero || !tarjeta.titular || monto <= 0">
              <span *ngIf="procesandoTarjeta" class="spinner-inline"></span>
              {{ procesandoTarjeta ? 'Autorizando con Stripe Gateway...' : '&#128179; Procesar Cargo de ' + (moneda === 'USD' ? '$' : 'Bs.') + ' ' + (monto | number:'1.2-2') }}
            </button>
          </div>

          <!-- PANEL ESPECÍFICO: PAYPAL EXPRESS -->
          <div *ngIf="metodoSeleccionado === 'PAYPAL'" class="gateway-panel paypal-panel">
            <div class="paypal-hero-box">
              <div class="paypal-logo-big">
                <span class="blue-p">Pay</span><span class="light-blue-p">Pal</span>
                <span class="express-badge">Express Checkout</span>
              </div>
              <p>Conexión segura de alta fidelidad con Sandbox API de PayPal. Al autorizar, se emitirá una orden vinculada al comprador instantáneamente.</p>
              
              <div class="paypal-buyer-field">
                <label>Cuenta PayPal del Comprador:</label>
                <input
                  type="email"
                  [(ngModel)]="clienteEmail"
                  class="atelier-input"
                  placeholder="buyer@ateliernoir.com">
              </div>

              <button
                type="button"
                class="btn-paypal-express"
                (click)="procesarPagoPaypal()"
                [disabled]="procesandoPaypal || monto <= 0">
                <span *ngIf="procesandoPaypal" class="spinner-inline"></span>
                <span *ngIf="!procesandoPaypal">&#128274; Pagar con <i>PayPal</i></span>
                <span *ngIf="procesandoPaypal">Conectando con PayPal...</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      <!-- TAB 2: HISTORIAL Y CONCILIACIÓN -->
      <section *ngIf="activeTab === 'historial'" class="atelier-card historial-card">
        <div class="historial-toolbar">
          <div class="filter-item">
            <label>Filtrar por Pasarela:</label>
            <select [(ngModel)]="filtroPasarela" (change)="cargarHistorial()" class="atelier-select">
              <option value="">Todas las Pasarelas</option>
              <option value="LIBELULA_BOLIVIA">Libélula Bolivia (QR)</option>
              <option value="STRIPE_INTL">Stripe International (Tarjetas)</option>
              <option value="PAYPAL_EXPRESS">PayPal Express</option>
              <option value="EFECTIVO_POS">Efectivo POS</option>
            </select>
          </div>

          <div class="filter-item">
            <label>Filtrar por Estado:</label>
            <select [(ngModel)]="filtroEstado" (change)="cargarHistorial()" class="atelier-select">
              <option value="">Todos los Estados</option>
              <option value="CONFIRMADO">Acreditado / Confirmado</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="RECHAZADO">Rechazado</option>
            </select>
          </div>

          <button type="button" class="btn-atelier-outline btn-refresh" (click)="cargarHistorial()">
            &#8635; Actualizar Lista
          </button>
        </div>

        <div *ngIf="cargandoHistorial" class="loading-state">
          <div class="spinner-inline large"></div>
          <p>Sincronizando transacciones con el libro diario...</p>
        </div>

        <div *ngIf="!cargandoHistorial && pagosList.length === 0" class="empty-state">
          <p>No se encontraron registros de pagos con los filtros seleccionados.</p>
        </div>

        <div *ngIf="!cargandoHistorial && pagosList.length > 0" class="table-responsive">
          <table class="atelier-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha / Hora</th>
                <th>Método &amp; Pasarela</th>
                <th>Ticket Venta</th>
                <th>Referencia Externa</th>
                <th>Cliente / Email</th>
                <th class="text-right">Monto</th>
                <th class="text-center">Estado</th>
                <th class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of pagosList">
                <td class="code-font">#{{ p.id }}</td>
                <td>{{ p.fecha_hora | date:'dd/MM/yyyy HH:mm' }}</td>
                <td>
                  <span class="method-tag" [ngClass]="p.metodo_pago.toLowerCase()">
                    {{ p.metodo_pago }}
                  </span>
                  <small class="gateway-sub">{{ p.pasarela || 'DIRECTO' }}</small>
                </td>
                <td>
                  <span *ngIf="p.venta_id" class="ticket-link">Venta #{{ p.venta_id }}</span>
                  <span *ngIf="!p.venta_id" class="reserva-tag">Anticipo / Reserva</span>
                </td>
                <td class="code-font text-ellipsis" title="{{ p.transaccion_externa_id }}">
                  {{ p.transaccion_externa_id || 'N/A' }}
                </td>
                <td>{{ p.cliente_email || 'Sin registrar' }}</td>
                <td class="text-right font-bold highlight-gold">
                  {{ p.moneda === 'USD' ? '$' : 'Bs.' }} {{ p.monto | number:'1.2-2' }}
                </td>
                <td class="text-center">
                  <span class="status-pill" [ngClass]="p.estado_pago.toLowerCase()">
                    {{ p.estado_pago }}
                  </span>
                </td>
                <td class="text-center">
                  <button
                    type="button"
                    class="btn-icon-action"
                    title="Ver Comprobante Digital"
                    (click)="abrirVoucher(p)">
                    &#128196; Voucher
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- MODAL VOUCHER DIGITAL IMPRIMIBLE -->
      <div *ngIf="mostrarVoucherModal && voucherPago" class="modal-backdrop">
        <div class="modal-voucher-container">
          <div class="modal-header-actions">
            <span class="voucher-title">Comprobante Fiscal / Voucher Digital</span>
            <button type="button" class="btn-close-modal" (click)="cerrarVoucher()">&times;</button>
          </div>

          <div class="voucher-slip" id="printable-voucher">
            <div class="voucher-brand">
              <div class="brand-crest">&#9670; ATELIER NOIR &#9670;</div>
              <div class="brand-sub">ALTA COSTURA &bull; PASARELA DIGITAL</div>
            </div>

            <div class="voucher-badge-seal" [class.approved]="voucherPago.estado_pago === 'CONFIRMADO'">
              {{ voucherPago.estado_pago === 'CONFIRMADO' ? 'TRANSACCIÓN APROBADA' : voucherPago.estado_pago }}
            </div>

            <div class="voucher-details-grid">
              <div class="voucher-row">
                <span class="lbl">ID PAGO:</span>
                <span class="val font-bold">#{{ voucherPago.id }}</span>
              </div>
              <div class="voucher-row">
                <span class="lbl">FECHA / HORA:</span>
                <span class="val">{{ voucherPago.fecha_hora | date:'dd/MM/yyyy HH:mm:ss' }}</span>
              </div>
              <div class="voucher-row">
                <span class="lbl">PASARELA:</span>
                <span class="val">{{ voucherPago.pasarela }}</span>
              </div>
              <div class="voucher-row">
                <span class="lbl">MÉTODO:</span>
                <span class="val">{{ voucherPago.metodo_pago }}</span>
              </div>
              <div class="voucher-row" *ngIf="voucherPago.venta_id">
                <span class="lbl">TICKET DE VENTA:</span>
                <span class="val">#{{ voucherPago.venta_id }}</span>
              </div>
              <div class="voucher-row">
                <span class="lbl">CÓD. AUTORIZACIÓN:</span>
                <span class="val code-font highlight-gold">{{ voucherPago.transaccion_externa_id || 'PENDIENTE' }}</span>
              </div>
              <div class="voucher-row" *ngIf="voucherPago.cliente_email">
                <span class="lbl">CLIENTE / EMAIL:</span>
                <span class="val">{{ voucherPago.cliente_email }}</span>
              </div>
            </div>

            <div class="voucher-total-box">
              <span class="total-label">MONTO TOTAL LIQUIDADO</span>
              <span class="total-number">{{ voucherPago.moneda === 'USD' ? '$' : 'Bs.' }} {{ voucherPago.monto | number:'1.2-2' }}</span>
            </div>

            <div class="voucher-footer-notes">
              <p>Transacción procesada y auditada electrónicamente bajo protocolo seguro SSL/TLS.</p>
              <p class="micro">Validez tributaria según normativa bancaria vigente. Conserve este comprobante.</p>
            </div>
          </div>

          <div class="modal-footer-actions">
            <button type="button" class="btn-atelier-outline" (click)="imprimirVoucher()">
              &#128438; Imprimir Voucher
            </button>
            <button type="button" class="btn-atelier-gold" (click)="cerrarVoucher()">
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .atelier-pagos-container {
      padding: 2rem 2.5rem;
      max-width: 1400px;
      margin: 0 auto;
      color: #111827;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* HEADER */
    .pagos-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .subtitle-badge {
      font-size: 0.72rem;
      letter-spacing: 2px;
      color: #4b5563;
      margin-bottom: 0.4rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .header-titles h1 {
      font-size: 2.25rem;
      font-family: 'Inter', sans-serif;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #000000;
      margin: 0 0 0.5rem 0;
    }
    .header-titles .description {
      color: #4b5563;
      font-size: 0.95rem;
      max-width: 650px;
      margin: 0;
      line-height: 1.5;
    }

    /* TABS */
    .tabs-switcher {
      display: inline-flex;
      background: #f3f4f6;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 6px;
      padding: 4px;
      gap: 4px;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: #4b5563;
      padding: 0.6rem 1.2rem;
      font-size: 0.85rem;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
      font-weight: 600;
    }
    .tab-btn:hover {
      color: #000000;
    }
    .tab-btn.active {
      background: #000000;
      color: #ffffff;
      font-weight: 700;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    }

    /* TOASTS */
    .toast-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border-radius: 4px;
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
    .toast-body { flex: 1; display: flex; flex-direction: column; font-size: 0.875rem; }
    .btn-close-toast {
      background: none;
      border: none;
      color: inherit;
      font-size: 1.3rem;
      cursor: pointer;
    }

    /* CARDS */
    .atelier-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 4px;
      padding: 1.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
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
      font-size: 1.2rem;
      color: #000000;
      margin: 0;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .gold-pill {
      font-size: 0.7rem;
      background: #f3f4f6;
      color: #111827;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 700;
    }

    /* LAYOUT TERMINAL */
    .terminal-layout {
      display: grid;
      grid-template-columns: 1fr 1.3fr;
      gap: 2rem;
      align-items: start;
    }
    @media (max-width: 1024px) {
      .terminal-layout { grid-template-columns: 1fr; }
    }

    /* FORM GRID */
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .full-width { grid-column: span 2; }
    .form-group label {
      display: block;
      font-size: 0.75rem;
      color: #4b5563;
      margin-bottom: 0.35rem;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .input-currency-group {
      display: flex;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 4px;
      align-items: center;
      padding: 0 0.85rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .input-currency-group:focus-within {
      border-color: #000000;
      box-shadow: 0 0 0 1px #000000;
    }
    .currency-label {
      color: #000000;
      font-weight: 800;
      font-size: 1.2rem;
      margin-right: 0.5rem;
    }
    .atelier-input-amount {
      width: 100%;
      background: transparent;
      border: none;
      color: #000000;
      font-size: 1.3rem;
      font-weight: 800;
      padding: 0.65rem 0;
      outline: none;
    }
    .atelier-input, .atelier-select {
      width: 100%;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 4px;
      color: #111827;
      padding: 0.65rem 0.85rem;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .atelier-input:focus, .atelier-select:focus {
      border-color: #000000;
      box-shadow: 0 0 0 1px #000000;
    }

    /* SUMMARY BOX */
    .live-summary-box {
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 4px;
      padding: 1.2rem;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      color: #4b5563;
      margin-bottom: 0.5rem;
    }
    .free-badge {
      background: #dcfce7;
      color: #15803d;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
    }
    .divider-gold {
      height: 1px;
      background: rgba(0, 0, 0, 0.08);
      margin: 0.8rem 0;
    }
    .total-row {
      font-size: 1rem;
      color: #000000;
      font-weight: 700;
      margin-bottom: 0;
    }
    .gold-price {
      color: #000000;
      font-size: 1.4rem;
      font-weight: 900;
    }

    /* GATEWAY SELECTOR */
    .gateway-selector {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    @media (max-width: 650px) {
      .gateway-selector { grid-template-columns: 1fr; }
    }
    .gateway-option {
      background: #fbfbfb;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      padding: 1.15rem 0.85rem;
      text-align: left;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      position: relative;
      transition: all 0.2s ease;
    }
    .gateway-option:hover {
      border-color: #000000;
      background: #ffffff;
    }
    .gateway-option.selected {
      border: 2px solid #000000;
      background: #ffffff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    .gateway-icon {
      font-size: 1.4rem;
      color: #000000;
    }
    .gateway-info strong {
      display: block;
      font-size: 0.85rem;
      color: #000000;
      font-weight: 700;
    }
    .gateway-info small {
      display: block;
      font-size: 0.7rem;
      color: #6b7280;
    }
    .check-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      background: #000000;
      color: #ffffff;
      font-size: 0.65rem;
      font-weight: bold;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* QR PANEL */
    .qr-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 1.5rem;
      background: #f9fafb;
      border-radius: 4px;
      border: 1px dashed rgba(0, 0, 0, 0.15);
    }
    .instruction-box {
      max-width: 420px;
      margin-bottom: 1.5rem;
      color: #4b5563;
      font-size: 0.85rem;
      line-height: 1.5;
    }
    .qr-active-display {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      width: 100%;
    }
    .qr-status-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      background: #ffffff;
      border-radius: 4px;
      padding: 0.6rem 1rem;
      border: 1px solid rgba(0, 0, 0, 0.08);
    }
    .status-badge {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .status-badge.pending { color: #d97706; }
    .status-badge.confirmed { color: #15803d; }
    .status-badge.expired { color: #dc2626; }
    .countdown-timer {
      font-size: 0.8rem;
      color: #6b7280;
      display: flex;
      gap: 0.4rem;
      align-items: center;
    }
    .timer-digits {
      color: #000000;
      font-size: 1.05rem;
      font-family: monospace;
      font-weight: 700;
    }
    .qr-svg-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    .qr-svg-frame {
      background: #ffffff;
      padding: 1rem;
      border-radius: 4px;
      border: 2px solid #000000;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.05);
      width: 220px;
      height: 220px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-svg-frame ::ng-deep svg {
      width: 100%;
      height: 100%;
    }
    .qr-details {
      font-size: 0.8rem;
      color: #6b7280;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .qr-actions-row {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    /* CARDS PANEL */
    .card-panel {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .luxury-credit-card-preview {
      background: #000000;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      padding: 1.5rem 1.75rem;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
      position: relative;
      height: 190px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      color: #ffffff;
    }
    .card-chip {
      font-size: 1.3rem;
      color: #ffffff;
    }
    .card-brand-logo {
      position: absolute;
      top: 1.5rem;
      right: 1.75rem;
      font-size: 1.2rem;
      font-weight: 900;
      letter-spacing: 2px;
      color: #ffffff;
      font-family: sans-serif;
    }
    .card-number-display {
      font-family: monospace;
      font-size: 1.25rem;
      letter-spacing: 3px;
      color: #ffffff;
    }
    .card-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .card-holder-box small, .card-expiry-box small {
      display: block;
      font-size: 0.6rem;
      color: #9ca3af;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .card-holder-box span, .card-expiry-box span {
      font-size: 0.85rem;
      color: #ffffff;
      letter-spacing: 1px;
      font-weight: 600;
    }
    .quick-test-bar {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
      background: #f3f4f6;
      padding: 0.6rem 0.85rem;
      border-radius: 4px;
    }
    .quick-label {
      font-size: 0.75rem;
      color: #4b5563;
      font-weight: 600;
    }
    .btn-chip {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      color: #374151;
      font-size: 0.72rem;
      padding: 0.3rem 0.65rem;
      border-radius: 3px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }
    .btn-chip.approved:hover {
      border-color: #166534;
      color: #166534;
      background: #f0fdf4;
    }
    .btn-chip.declined:hover {
      border-color: #dc2626;
      color: #dc2626;
      background: #fef2f2;
    }
    .card-form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1rem;
    }
    .card-form-grid .full-width { grid-column: span 3; }

    /* PAYPAL PANEL */
    .paypal-hero-box {
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 4px;
      padding: 2.5rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
    }
    .paypal-logo-big {
      font-size: 2rem;
      font-weight: 900;
      font-style: italic;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .blue-p { color: #003087; }
    .light-blue-p { color: #0079C1; }
    .express-badge {
      font-size: 0.75rem;
      font-style: normal;
      background: #f3f4f6;
      color: #000;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      margin-left: 0.5rem;
      font-weight: 700;
    }
    .paypal-hero-box p {
      color: #4b5563;
      font-size: 0.85rem;
      max-width: 440px;
      margin: 0;
    }
    .paypal-buyer-field {
      width: 100%;
      max-width: 360px;
      text-align: left;
    }
    .paypal-buyer-field label {
      display: block;
      font-size: 0.75rem;
      color: #4b5563;
      margin-bottom: 0.3rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .btn-paypal-express {
      background: #0070ba;
      color: #ffffff;
      border: none;
      font-weight: 700;
      font-size: 1rem;
      padding: 0.85rem 2.5rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-paypal-express:hover {
      background: #005ea6;
    }

    /* HISTORIAL & TABLA */
    .historial-toolbar {
      display: flex;
      gap: 1rem;
      align-items: flex-end;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }
    .filter-item {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      min-width: 220px;
    }
    .filter-item label {
      font-size: 0.75rem;
      color: #4b5563;
      text-transform: uppercase;
      font-weight: 600;
    }
    .btn-refresh {
      margin-bottom: 2px;
    }
    .table-responsive {
      overflow-x: auto;
    }
    .atelier-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    .atelier-table th {
      background: #f9fafb;
      color: #4b5563;
      text-transform: uppercase;
      font-size: 0.72rem;
      letter-spacing: 1px;
      padding: 0.75rem 0.85rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      font-weight: 700;
    }
    .atelier-table td {
      padding: 0.85rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      color: #111827;
    }
    .atelier-table tbody tr:hover {
      background: #f9fafb;
    }
    .code-font {
      font-family: monospace;
      font-size: 0.8rem;
    }
    .text-ellipsis {
      max-width: 150px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .method-tag {
      display: inline-block;
      font-size: 0.7rem;
      padding: 0.2rem 0.45rem;
      border-radius: 3px;
      font-weight: 600;
      background: #f3f4f6;
      color: #111827;
      border: 1px solid rgba(0, 0, 0, 0.06);
    }
    .gateway-sub {
      display: block;
      font-size: 0.65rem;
      color: #6b7280;
    }
    .status-pill {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .status-pill.confirmado {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }
    .status-pill.pendiente {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fcd34d;
    }
    .status-pill.rechazado {
      background: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }
    .btn-icon-action {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      color: #111827;
      padding: 0.35rem 0.65rem;
      border-radius: 3px;
      font-size: 0.75rem;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }
    .btn-icon-action:hover {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
    }

    /* BUTTONS GLOBALES */
    .btn-atelier-gold {
      background: #000000;
      color: #ffffff;
      border: none;
      font-weight: 700;
      font-size: 0.9rem;
      padding: 0.75rem 1.5rem;
      border-radius: 2px;
      cursor: pointer;
      transition: all 0.2s;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .btn-atelier-gold:hover:not(:disabled) {
      background: #262626;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);
    }
    .btn-atelier-gold:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-large {
      width: 100%;
      padding: 0.9rem;
    }
    .btn-atelier-outline {
      background: transparent;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #374151;
      font-weight: 600;
      font-size: 0.85rem;
      padding: 0.65rem 1.25rem;
      border-radius: 2px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-atelier-outline:hover {
      background: #f3f4f6;
      border-color: #000000;
      color: #000000;
    }
    .btn-atelier-text {
      background: none;
      border: none;
      color: #6b7280;
      font-size: 0.8rem;
      cursor: pointer;
      text-decoration: underline;
    }
    .btn-atelier-text:hover { color: #000000; }

    .highlight-gold { color: #000000; font-weight: 700; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }

    /* MODAL VOUCHER */
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
    .modal-voucher-container {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      max-width: 480px;
      width: 100%;
      padding: 1.75rem;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
      animation: zoomIn 0.25s ease;
      color: #111827;
    }
    .modal-header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .voucher-title {
      font-size: 0.85rem;
      color: #4b5563;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 700;
    }
    .btn-close-modal {
      background: none;
      border: none;
      color: #9ca3af;
      font-size: 1.5rem;
      cursor: pointer;
    }
    .btn-close-modal:hover {
      color: #000000;
    }
    .voucher-slip {
      background: #f9fafb;
      color: #111827;
      border-radius: 4px;
      padding: 1.5rem;
      font-family: 'Courier New', Courier, monospace;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-top: 4px solid #000000;
    }
    .voucher-brand {
      text-align: center;
      margin-bottom: 1rem;
      border-bottom: 1px dashed rgba(0, 0, 0, 0.15);
      padding-bottom: 0.75rem;
    }
    .brand-crest {
      font-weight: 900;
      letter-spacing: 2px;
      font-size: 1.1rem;
      color: #000000;
    }
    .brand-sub {
      font-size: 0.65rem;
      color: #6b7280;
      letter-spacing: 1px;
    }
    .voucher-badge-seal {
      text-align: center;
      padding: 0.4rem;
      background: #f3f4f6;
      font-weight: 900;
      letter-spacing: 1.5px;
      font-size: 0.85rem;
      margin-bottom: 1rem;
      border-radius: 4px;
    }
    .voucher-badge-seal.approved {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }
    .voucher-details-grid {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font-size: 0.8rem;
      margin-bottom: 1rem;
    }
    .voucher-row {
      display: flex;
      justify-content: space-between;
    }
    .voucher-row .lbl { color: #6b7280; }
    .voucher-row .val { color: #000000; font-weight: 600; }
    .voucher-total-box {
      border-top: 1px dashed rgba(0, 0, 0, 0.15);
      border-bottom: 1px dashed rgba(0, 0, 0, 0.15);
      padding: 0.75rem 0;
      text-align: center;
      margin-bottom: 1rem;
    }
    .total-label {
      display: block;
      font-size: 0.7rem;
      color: #6b7280;
      letter-spacing: 1px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .total-number {
      font-size: 1.6rem;
      font-weight: 900;
      color: #000000;
    }
    .voucher-footer-notes {
      font-size: 0.65rem;
      color: #6b7280;
      text-align: center;
      line-height: 1.4;
    }
    .modal-footer-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.25rem;
    }

    /* SPINNER */
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

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes zoomIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    /* PRINT RULES */
    @media print {
      body * {
        visibility: hidden;
      }
      #printable-voucher, #printable-voucher * {
        visibility: visible;
      }
      #printable-voucher {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
    }
  `]
})
export class PagosPageComponent implements OnInit, OnDestroy {
  private readonly ventasService = inject(VentasService);
  private readonly sanitizer = inject(DomSanitizer);

  activeTab: 'terminal' | 'historial' = 'terminal';
  metodoSeleccionado: 'QR_SIMPLE' | 'TARJETA' | 'PAYPAL' = 'QR_SIMPLE';

  // Parámetros de cobro
  monto: number = 280.00;
  moneda: 'USD' | 'BOB' = 'USD';
  concepto: string = 'Venta Prendas Colección Atelier Noir';
  clienteEmail: string = 'cliente.vip@ateliernoir.com';
  ventaId: number | null = null;

  // Estados QR
  cargandoQr: boolean = false;
  qrActivo: QRGenerarResponse | null = null;
  pagoQrActual: PagoResponse | null = null;
  sanitizedQrSvg: SafeHtml | null = null;
  qrCountdown: number = 300;
  qrTimer: any = null;
  qrExpirado: boolean = false;
  verificandoQr: boolean = false;
  qrConfirmadoExitoso: boolean = false;

  // Estados Tarjeta
  tarjeta: DatosTarjetaInput = {
    numero: '',
    mes_exp: '12',
    anio_exp: '28',
    cvc: '',
    titular: ''
  };
  procesandoTarjeta: boolean = false;

  // Estados PayPal
  procesandoPaypal: boolean = false;

  // Historial
  pagosList: PagoResponse[] = [];
  cargandoHistorial: boolean = false;
  filtroPasarela: string = '';
  filtroEstado: string = '';

  // Voucher Modal
  voucherPago: PagoResponse | null = null;
  mostrarVoucherModal: boolean = false;

  // Toasts
  mensajeExito: string | null = null;
  mensajeError: string | null = null;

  ngOnInit(): void {
    // Al iniciar, cargar historial para que esté listo
    this.cargarHistorial();
  }

  ngOnDestroy(): void {
    this.detenerContadorQR();
  }

  seleccionarMetodo(metodo: 'QR_SIMPLE' | 'TARJETA' | 'PAYPAL'): void {
    if (this.qrActivo && !this.qrConfirmadoExitoso) {
      if (!confirm('Tiene un cobro QR en curso. ¿Desea descartarlo y cambiar de método?')) {
        return;
      }
      this.cancelarOResetQR();
    }
    this.metodoSeleccionado = metodo;
    this.mensajeError = null;
    this.mensajeExito = null;
  }

  // --- OPERACIONES QR ---
  generarQR(): void {
    this.cargandoQr = true;
    this.mensajeError = null;
    this.mensajeExito = null;

    const payload: PagoElectronicoCreate = {
      venta_id: this.ventaId || null,
      metodo_pago: 'QR_SIMPLE',
      pasarela: 'LIBELULA_BOLIVIA',
      monto: this.monto,
      moneda: this.moneda,
      cliente_email: this.clienteEmail || null,
      concepto: this.concepto
    };

    this.ventasService.iniciarPagoElectronico(payload).subscribe({
      next: (res) => {
        this.cargandoQr = false;
        this.pagoQrActual = res.pago;
        if (res.qr) {
          this.qrActivo = res.qr;
          this.sanitizedQrSvg = this.sanitizer.bypassSecurityTrustHtml(res.qr.qr_imagen_svg);
          this.iniciarContadorQR(res.qr.expira_en_segundos || 300);
        }
      },
      error: (err) => {
        this.cargandoQr = false;
        this.mensajeError = err.error?.detail || 'Error conectando con la pasarela Libélula';
      }
    });
  }

  iniciarContadorQR(segundos: number): void {
    this.detenerContadorQR();
    this.qrCountdown = segundos;
    this.qrExpirado = false;
    this.qrConfirmadoExitoso = false;

    this.qrTimer = setInterval(() => {
      if (this.qrCountdown > 0) {
        this.qrCountdown--;
      } else {
        this.qrExpirado = true;
        this.detenerContadorQR();
      }
    }, 1000);
  }

  detenerContadorQR(): void {
    if (this.qrTimer) {
      clearInterval(this.qrTimer);
      this.qrTimer = null;
    }
  }

  formatCountdown(segundos: number): string {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  simularAcreditacionQR(): void {
    if (!this.pagoQrActual) return;
    this.verificandoQr = true;
    this.mensajeError = null;

    this.ventasService.confirmarPagoElectronico(this.pagoQrActual.id, {
      aprobado: true,
      codigo_autorizacion: `LIB-BANCO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    }).subscribe({
      next: (pagoConfirmado) => {
        this.verificandoQr = false;
        this.pagoQrActual = pagoConfirmado;
        this.qrConfirmadoExitoso = true;
        this.detenerContadorQR();
        this.mensajeExito = `¡Pago QR Acreditado! Ref: ${pagoConfirmado.transaccion_externa_id} por ${this.moneda === 'USD' ? '$' : 'Bs.'} ${pagoConfirmado.monto}`;
        this.cargarHistorial();
      },
      error: (err) => {
        this.verificandoQr = false;
        this.mensajeError = err.error?.detail || 'Error al validar la acreditación bancaria';
      }
    });
  }

  cancelarOResetQR(): void {
    this.detenerContadorQR();
    this.qrActivo = null;
    this.pagoQrActual = null;
    this.sanitizedQrSvg = null;
    this.qrCountdown = 300;
    this.qrExpirado = false;
    this.qrConfirmadoExitoso = false;
  }

  // --- OPERACIONES TARJETA ---
  limpiarMascaraTarjeta(): void {
    let digits = this.tarjeta.numero.replace(/\D/g, '');
    if (digits.length > 16) digits = digits.substring(0, 16);
    this.tarjeta.numero = digits.replace(/(.{4})/g, '$1 ').trim();
  }

  formatearTarjetaDisplay(num: string): string {
    if (!num) return '•••• •••• •••• ••••';
    let clean = num.replace(/\s/g, '');
    let padded = clean.padEnd(16, '•');
    return padded.replace(/(.{4})/g, '$1 ').trim();
  }

  detectarFranquicia(num: string): string {
    const clean = num ? num.replace(/\s/g, '') : '';
    if (clean.startsWith('4')) return 'VISA';
    if (clean.startsWith('5')) return 'MASTERCARD';
    if (clean.startsWith('3')) return 'AMEX';
    return 'CARD';
  }

  llenarTarjetaAprobada(): void {
    this.tarjeta = {
      numero: '4242 4242 4242 4242',
      mes_exp: '12',
      anio_exp: '28',
      cvc: '123',
      titular: 'ISABELLA VANDERBILT'
    };
    this.mensajeError = null;
  }

  llenarTarjetaRechazada(): void {
    this.tarjeta = {
      numero: '4000 0000 0000 0002',
      mes_exp: '05',
      anio_exp: '26',
      cvc: '999',
      titular: 'CARLOS SIN FONDOS'
    };
    this.mensajeError = null;
  }

  procesarPagoTarjeta(): void {
    this.procesandoTarjeta = true;
    this.mensajeError = null;
    this.mensajeExito = null;

    const payload: PagoElectronicoCreate = {
      venta_id: this.ventaId || null,
      metodo_pago: 'TARJETA',
      pasarela: 'STRIPE_INTL',
      monto: this.monto,
      moneda: this.moneda,
      cliente_email: this.clienteEmail || null,
      concepto: this.concepto,
      datos_tarjeta: {
        numero: this.tarjeta.numero.replace(/\s/g, ''),
        mes_exp: this.tarjeta.mes_exp,
        anio_exp: this.tarjeta.anio_exp,
        cvc: this.tarjeta.cvc,
        titular: this.tarjeta.titular.toUpperCase()
      }
    };

    this.ventasService.iniciarPagoElectronico(payload).subscribe({
      next: (res) => {
        this.procesandoTarjeta = false;
        this.mensajeExito = `Cobro aprobado por Stripe Sandbox. Auth Token: ${res.pago.transaccion_externa_id}`;
        this.abrirVoucher(res.pago);
        this.cargarHistorial();
      },
      error: (err) => {
        this.procesandoTarjeta = false;
        this.mensajeError = err.error?.detail || 'Error procesando la tarjeta con la pasarela bancaria';
      }
    });
  }

  // --- OPERACIONES PAYPAL ---
  procesarPagoPaypal(): void {
    this.procesandoPaypal = true;
    this.mensajeError = null;
    this.mensajeExito = null;

    const payload: PagoElectronicoCreate = {
      venta_id: this.ventaId || null,
      metodo_pago: 'PAYPAL',
      pasarela: 'PAYPAL_EXPRESS',
      monto: this.monto,
      moneda: this.moneda,
      cliente_email: this.clienteEmail || 'buyer@sandbox.paypal.com',
      concepto: this.concepto
    };

    this.ventasService.iniciarPagoElectronico(payload).subscribe({
      next: (res) => {
        this.procesandoPaypal = false;
        this.mensajeExito = `Autorización emitida vía PayPal Express. Transacción: ${res.pago.transaccion_externa_id}`;
        this.abrirVoucher(res.pago);
        this.cargarHistorial();
      },
      error: (err) => {
        this.procesandoPaypal = false;
        this.mensajeError = err.error?.detail || 'Error al conectar con PayPal Express Sandbox';
      }
    });
  }

  // --- HISTORIAL ---
  cambiarAHistorial(): void {
    this.activeTab = 'historial';
    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.cargandoHistorial = true;
    this.ventasService.getPagosElectronicos(
      this.filtroPasarela || undefined,
      this.filtroEstado || undefined
    ).subscribe({
      next: (pagos) => {
        this.pagosList = pagos;
        this.cargandoHistorial = false;
      },
      error: (err) => {
        this.cargandoHistorial = false;
        console.error('Error cargando historial de pagos:', err);
      }
    });
  }

  // --- MODAL VOUCHER ---
  abrirVoucher(pago: PagoResponse): void {
    this.voucherPago = pago;
    this.mostrarVoucherModal = true;
  }

  cerrarVoucher(): void {
    this.mostrarVoucherModal = false;
    this.voucherPago = null;
  }

  imprimirVoucher(): void {
    window.print();
  }
}
