import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CartService, CartItem } from '../services/cart.service';
import { VentasService } from '../services/ventas.service';
import { InventarioService } from '../../inventario/services/inventario.service';
import { CatalogoService } from '../../catalogo/services/catalogo.service';
import { AuthService } from '../../../core/services/auth.service';
import { Sucursal } from '../../inventario/models/inventario.models';
import { Prenda } from '../../catalogo/models/catalogo.models';
import {
  VentaResponse,
  VentaOnlineCheckoutRequest,
  EnvioPedido,
  ActualizarEstadoEnvioRequest
} from '../models/ventas.models';

@Component({
  selector: 'app-checkout-ecommerce-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="atelier-checkout-container">
      <!-- HEADER -->
      <header class="checkout-header">
        <div class="header-titles">
          <div class="subtitle-badge">ATELIER NOIR &bull; E-COMMERCE &bull; CICLO #2 (CU15)</div>
          <h1>Boutique Digital &amp; Checkout</h1>
          <p class="description">
            Experiencia de compra omnicanal de alta costura: bolsa de compras reactiva, cálculo dinámico de courier express o Click &amp; Collect en boutique, integración de pasarelas de pago y trazabilidad logística en tiempo real.
          </p>
        </div>

        <!-- TABS SWITCHER -->
        <div class="tabs-switcher">
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab === 'checkout'"
            (click)="activeTab = 'checkout'">
            <span>🛍️ Bolsa &amp; Checkout</span>
            <span class="tab-badge" *ngIf="(cartService.count$ | async) as count">{{ count }}</span>
          </button>
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab === 'pedidos'"
            (click)="cargarPedidosTab()">
            <span>📦 Rastreo de Pedidos</span>
          </button>
        </div>
      </header>

      <!-- MENSAJES TOAST -->
      <div *ngIf="mensajeExito" class="toast-banner success">
        <span class="toast-icon">&#10003;</span>
        <div class="toast-body">
          <strong>¡Operación Exitosa!</strong>
          <span>{{ mensajeExito }}</span>
        </div>
        <button type="button" class="btn-close-toast" (click)="mensajeExito = null">&times;</button>
      </div>

      <div *ngIf="mensajeError" class="toast-banner error">
        <span class="toast-icon">&#9888;</span>
        <div class="toast-body">
          <strong>Disculpe las molestias</strong>
          <span>{{ mensajeError }}</span>
        </div>
        <button type="button" class="btn-close-toast" (click)="mensajeError = null">&times;</button>
      </div>

      <!-- ============================================================== -->
      <!-- PESTAÑA 1: CARRITO & CHECKOUT                                   -->
      <!-- ============================================================== -->
      <div *ngIf="activeTab === 'checkout'" class="checkout-layout">

        <!-- SI HAY UN PEDIDO RECIÉN CONFIRMADO: VISTA COMPROBANTE -->
        <div *ngIf="pedidoConfirmado" class="order-confirmed-panel">
          <div class="success-crest">
            <div class="crest-icon">✦</div>
            <h2>¡Gracias por su compra en Atelier Noir!</h2>
            <p class="order-subtitle">Su pedido digital ha sido procesado y el comprobante fiscal fue emitido.</p>
          </div>

          <div class="order-summary-box">
            <div class="summary-header">
              <div>
                <span class="summary-label">CÓDIGO DE VENTA:</span>
                <span class="summary-value font-bold gold-text">#{{ pedidoConfirmado.codigo_venta }}</span>
              </div>
              <div *ngIf="pedidoConfirmado.envio">
                <span class="summary-label">TRACKING LOGÍSTICO:</span>
                <span class="summary-value font-mono highlight-badge">{{ pedidoConfirmado.envio.codigo_seguimiento }}</span>
              </div>
              <div>
                <span class="summary-label">ESTADO:</span>
                <span class="status-pill" [ngClass]="pedidoConfirmado.envio?.estado_envio || 'PREPARANDO'">
                  {{ pedidoConfirmado.envio?.estado_envio || 'CONFIRMADO' }}
                </span>
              </div>
            </div>

            <div class="order-details-grid">
              <div class="detail-group">
                <span class="lbl">Cliente:</span>
                <span class="val">{{ pedidoConfirmado.cliente_nombre }}</span>
                <span class="val text-muted" *ngIf="pedidoConfirmado.cliente_nit">NIT/CI: {{ pedidoConfirmado.cliente_nit }}</span>
              </div>
              <div class="detail-group">
                <span class="lbl">Modalidad de Despacho:</span>
                <span class="val" *ngIf="pedidoConfirmado.envio?.tipo_entrega === 'DOMICILIO'">
                  🚚 Envío a Domicilio Express ({{ pedidoConfirmado.envio?.ciudad }})
                </span>
                <span class="val" *ngIf="pedidoConfirmado.envio?.tipo_entrega === 'CLICK_AND_COLLECT'">
                  🏛️ Click &amp; Collect (Recojo en Boutique)
                </span>
                <span class="val text-muted" *ngIf="pedidoConfirmado.envio?.direccion_linea1">
                  {{ pedidoConfirmado.envio?.direccion_linea1 }}
                </span>
              </div>
              <div class="detail-group">
                <span class="lbl">Total Liquidado:</span>
                <span class="val font-bold gold-text font-lg">
                  <span class="currency">$</span>{{ pedidoConfirmado.total | number:'1.2-2' }} USD
                </span>
                <span class="val text-muted">
                  (Subtotal: <span class="currency">$</span>{{ pedidoConfirmado.subtotal | number:'1.2-2' }} + Envío: <span class="currency">$</span>{{ pedidoConfirmado.costo_envio | number:'1.2-2' }})
                </span>
              </div>
            </div>

            <!-- TABLA DE ARTÍCULOS DEL PEDIDO CONFIRMADO -->
            <div class="confirmed-items-list">
              <h4>Prendas Adquiridas</h4>
              <table class="atelier-table compact">
                <thead>
                  <tr>
                    <th>Prenda</th>
                    <th>Talla / Color</th>
                    <th class="text-right">Cant.</th>
                    <th class="text-right">Precio Unit.</th>
                    <th class="text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of pedidoConfirmado.detalles">
                    <td>{{ item.variante?.prenda?.nombre || 'Prenda Atelier' }}</td>
                    <td>{{ item.variante?.talla?.codigo || 'Talla' }} &bull; {{ item.variante?.color?.nombre || 'Color' }}</td>
                    <td class="text-right">{{ item.cantidad }}</td>
                    <td class="text-right"><span class="currency">$</span>{{ item.precio_unitario | number:'1.2-2' }}</td>
                    <td class="text-right font-bold"><span class="currency">$</span>{{ item.subtotal | number:'1.2-2' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="order-actions">
              <button type="button" class="btn-atelier-outline" (click)="imprimirComprobante()">
                🖨️ Imprimir Voucher / Comprobante
              </button>
              <button type="button" class="btn-atelier-gold" (click)="verEnRastreo(pedidoConfirmado)">
                📦 Rastrear Envío en Tiempo Real
              </button>
              <button type="button" class="btn-atelier-text" (click)="nuevaCompra()">
                ➕ Realizar otra compra
              </button>
            </div>
          </div>
        </div>

        <!-- FLUJO DE COMPRA ACTIVO (CUANDO NO ESTÁ EN VISTA DE CONFIRMACIÓN) -->
        <div *ngIf="!pedidoConfirmado" class="checkout-grid">

          <!-- COLUMNA IZQUIERDA: BOLSA DE COMPRAS & QUICK ADD -->
          <div class="cart-column">
            <div class="panel-box">
              <div class="panel-header">
                <h3>Bolsa de Compras</h3>
                <span class="item-count-text">{{ cartItems.length }} artículos</span>
              </div>

              <!-- SI EL CARRITO ESTÁ VACÍO -->
              <div *ngIf="cartItems.length === 0" class="empty-cart-state">
                <div class="empty-icon">🛍️</div>
                <h4>Su bolsa de compras está vacía</h4>
                <p>Seleccione prendas de nuestra colección de alta costura para iniciar su compra.</p>

                <!-- QUICK SELECTOR DE PRENDAS PARA TESTING RÁPIDO -->
                <div class="quick-add-zone" *ngIf="prendasCatalogo.length > 0">
                  <span class="quick-add-title">Añadir Prendas Rápidas para Demostración:</span>
                  <div class="quick-items-grid">
                    <div *ngFor="let p of prendasCatalogo.slice(0, 4)" class="quick-item-card">
                      <div class="quick-info">
                        <strong>{{ p.nombre }}</strong>
                        <span class="quick-price"><span class="currency">$</span>{{ p.precio_base | number:'1.2-2' }} USD</span>
                      </div>
                      <button
                        type="button"
                        class="btn-quick-add"
                        *ngIf="p.variantes && p.variantes.length > 0"
                        (click)="agregarPrendaRapida(p)">
                        + Agregar
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- LISTADO DE ÍTEMS EN EL CARRITO -->
              <div *ngIf="cartItems.length > 0" class="cart-items-table-wrapper">
                <table class="atelier-table">
                  <thead>
                    <tr>
                      <th>Prenda</th>
                      <th>Detalles</th>
                      <th class="text-right">Precio</th>
                      <th class="text-center">Cant.</th>
                      <th class="text-right">Subtotal</th>
                      <th class="text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let item of cartItems">
                      <td>
                        <div class="item-title-cell">
                          <span class="item-name">{{ item.prenda_nombre }}</span>
                          <span class="item-sku font-mono">SKU: {{ item.variante_sku }}</span>
                        </div>
                      </td>
                      <td>
                        <div class="item-variants">
                          <span class="badge-tag">Talla: {{ item.talla }}</span>
                          <span class="badge-tag">Color: {{ item.color }}</span>
                        </div>
                      </td>
                      <td class="text-right">
                        <span class="currency">$</span>{{ item.precio_unitario | number:'1.2-2' }}
                      </td>
                      <td class="text-center">
                        <div class="quantity-control">
                          <button type="button" class="btn-qty" (click)="disminuirCantidad(item)">-</button>
                          <span class="qty-number">{{ item.cantidad }}</span>
                          <button type="button" class="btn-qty" (click)="aumentarCantidad(item)">+</button>
                        </div>
                      </td>
                      <td class="text-right font-bold gold-text">
                        <span class="currency">$</span>{{ (item.precio_unitario * item.cantidad) | number:'1.2-2' }}
                      </td>
                      <td class="text-center">
                        <button type="button" class="btn-delete-item" (click)="eliminarItem(item)" title="Quitar">
                          &times;
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div class="cart-table-footer">
                  <button type="button" class="btn-atelier-text text-danger" (click)="vaciarBolsa()">
                    🗑️ Vaciar Bolsa
                  </button>
                </div>
              </div>
            </div>

            <!-- DESGLOSE ECONÓMICO Y ENVÍO GRATIS -->
            <div class="panel-box shipping-incentive-box" *ngIf="cartItems.length > 0">
              <div *ngIf="subtotal >= 150" class="free-shipping-achieved">
                <span class="incentive-badge">✨ BENEFICIO VIP EXCLUSIVO</span>
                <strong>¡Felicidades! Su compra califica para Envío Courier Express GRATUITO.</strong>
              </div>
              <div *ngIf="subtotal < 150" class="free-shipping-progress">
                <span>Agregue <strong class="gold-text"><span class="currency">$</span>{{ (150 - subtotal) | number:'1.2-2' }} USD</strong> adicionales para obtener <strong>Envío Courier GRATIS</strong>.</span>
              </div>
            </div>
          </div>

          <!-- COLUMNA DERECHA: FORMULARIO CHECKOUT (LOGÍSTICA & PAGO) -->
          <div class="checkout-form-column">

            <!-- PASO 1: DATOS DEL CLIENTE -->
            <div class="panel-box form-section">
              <div class="section-title">
                <span class="step-num">1</span>
                <h3>Datos de Contacto &amp; Facturación</h3>
              </div>
              <div class="form-grid">
                <div class="form-group col-12">
                  <label>Nombre Completo / Razón Social *</label>
                  <input type="text" class="atelier-input" [(ngModel)]="clienteNombre" placeholder="Ej: Marcela Benítez">
                </div>
                <div class="form-group col-6">
                  <label>NIT o CI *</label>
                  <input type="text" class="atelier-input" [(ngModel)]="clienteNit" placeholder="Ej: 8392102012">
                </div>
                <div class="form-group col-6">
                  <label>Teléfono Celular *</label>
                  <input type="text" class="atelier-input" [(ngModel)]="clienteTelefono" placeholder="Ej: +591 78912345">
                </div>
                <div class="form-group col-12">
                  <label>Correo Electrónico (Para Voucher y Tracking) *</label>
                  <input type="email" class="atelier-input" [(ngModel)]="clienteEmail" placeholder="cliente@fashionstore.com">
                </div>
              </div>
            </div>

            <!-- PASO 2: MODALIDAD DE ENTREGA -->
            <div class="panel-box form-section">
              <div class="section-title">
                <span class="step-num">2</span>
                <h3>Modalidad de Entrega</h3>
              </div>

              <div class="delivery-options-grid">
                <!-- OPCIÓN A: DOMICILIO -->
                <div
                  class="delivery-card"
                  [class.selected]="tipoEntrega === 'DOMICILIO'"
                  (click)="seleccionarTipoEntrega('DOMICILIO')">
                  <div class="card-radio-indicator">
                    <span class="radio-dot" *ngIf="tipoEntrega === 'DOMICILIO'"></span>
                  </div>
                  <div class="delivery-card-content">
                    <div class="delivery-card-header">
                      <span class="delivery-icon">🚚</span>
                      <strong>Envío a Domicilio Express</strong>
                    </div>
                    <p class="delivery-desc">Despacho courier a su puerta con número de seguimiento en tiempo real.</p>
                    <span class="delivery-cost" [class.free]="costoCalculadoEnvio === 0">
                      {{ costoCalculadoEnvio === 0 ? 'GRATIS (VIP)' : '$5.00 USD' }}
                    </span>
                  </div>
                </div>

                <!-- OPCIÓN B: CLICK & COLLECT -->
                <div
                  class="delivery-card"
                  [class.selected]="tipoEntrega === 'CLICK_AND_COLLECT'"
                  (click)="seleccionarTipoEntrega('CLICK_AND_COLLECT')">
                  <div class="card-radio-indicator">
                    <span class="radio-dot" *ngIf="tipoEntrega === 'CLICK_AND_COLLECT'"></span>
                  </div>
                  <div class="delivery-card-content">
                    <div class="delivery-card-header">
                      <span class="delivery-icon">🏛️</span>
                      <strong>Click &amp; Collect (Boutique)</strong>
                    </div>
                    <p class="delivery-desc">Retiro personal sin costo en cualquiera de nuestras boutiques de alta costura.</p>
                    <span class="delivery-cost free">GRATIS</span>
                  </div>
                </div>
              </div>

              <!-- CAMPOS SI ES A DOMICILIO -->
              <div *ngIf="tipoEntrega === 'DOMICILIO'" class="delivery-subform animate-fade">
                <div class="form-grid">
                  <div class="form-group col-12">
                    <label>Dirección (Calle, Número, Edificio) *</label>
                    <input type="text" class="atelier-input" [(ngModel)]="direccionLinea1" placeholder="Ej: Av. Ballivián #1234, Edif. Torre Zafiro, Dpto 4B">
                  </div>
                  <div class="form-group col-6">
                    <label>Ciudad *</label>
                    <input type="text" class="atelier-input" [(ngModel)]="ciudad" placeholder="La Paz">
                  </div>
                  <div class="form-group col-6">
                    <label>Departamento / Región *</label>
                    <input type="text" class="atelier-input" [(ngModel)]="departamento" placeholder="La Paz">
                  </div>
                  <div class="form-group col-12">
                    <label>Instrucciones de Entrega (Opcional)</label>
                    <input type="text" class="atelier-input" [(ngModel)]="instruccionesEntrega" placeholder="Ej: Tocar timbre 4B o dejar en recepción">
                  </div>
                  <div class="form-group col-12">
                    <label>Boutique de Despacho (Inventario Físico) *</label>
                    <select class="atelier-select" [(ngModel)]="sucursalDespachoId">
                      <option *ngFor="let s of sucursales" [value]="s.id">{{ s.nombre }} ({{ s.ciudad?.nombre || 'Bolivia' }})</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- CAMPOS SI ES CLICK & COLLECT -->
              <div *ngIf="tipoEntrega === 'CLICK_AND_COLLECT'" class="delivery-subform animate-fade">
                <div class="form-group">
                  <label>Seleccione Boutique para Retiro *</label>
                  <select class="atelier-select" [(ngModel)]="sucursalDespachoId">
                    <option *ngFor="let s of sucursales" [value]="s.id">{{ s.nombre }} - {{ s.direccion || 'Boutique Oficial' }}</option>
                  </select>
                </div>
                <div class="collect-notice">
                  <span>ℹ️ Su pedido estará listo para retiro en un plazo máximo de 2 horas tras confirmar el pago.</span>
                </div>
              </div>
            </div>

            <!-- PASO 3: PASARELA DE PAGO INTEGRADA (CU12) -->
            <div class="panel-box form-section">
              <div class="section-title">
                <span class="step-num">3</span>
                <h3>Pasarela de Pago Electrónico</h3>
              </div>

              <div class="payment-tabs">
                <button
                  type="button"
                  class="pay-tab-btn"
                  [class.active]="pasarelaSeleccionada === 'LIBELULA_BOLIVIA'"
                  (click)="seleccionarPasarela('LIBELULA_BOLIVIA')">
                  <span>📱 QR Simple Libélula</span>
                </button>
                <button
                  type="button"
                  class="pay-tab-btn"
                  [class.active]="pasarelaSeleccionada === 'STRIPE_INTL'"
                  (click)="seleccionarPasarela('STRIPE_INTL')">
                  <span>💳 Tarjeta Stripe</span>
                </button>
                <button
                  type="button"
                  class="pay-tab-btn"
                  [class.active]="pasarelaSeleccionada === 'PAYPAL_EXPRESS'"
                  (click)="seleccionarPasarela('PAYPAL_EXPRESS')">
                  <span>🅿️ PayPal Express</span>
                </button>
              </div>

              <!-- DETALLES DE CADA PASARELA -->
              <div class="payment-method-body">
                <!-- QR LIBÉLULA -->
                <div *ngIf="pasarelaSeleccionada === 'LIBELULA_BOLIVIA'" class="pay-body-item">
                  <div class="qr-preview-badge">
                    <span class="badge-icon">📷</span>
                    <div>
                      <strong>Pago Rápido Interoperable</strong>
                      <p>Al confirmar el pedido se generará automáticamente el código QR fiscal para escanear desde cualquier aplicación bancaria boliviana.</p>
                    </div>
                  </div>
                </div>

                <!-- STRIPE CARD -->
                <div *ngIf="pasarelaSeleccionada === 'STRIPE_INTL'" class="pay-body-item animate-fade">
                  <div class="form-grid">
                    <div class="form-group col-12">
                      <label>Número de Tarjeta (Stripe Sandbox) *</label>
                      <input type="text" class="atelier-input font-mono" [(ngModel)]="numeroTarjeta" placeholder="4242 4242 4242 4242">
                    </div>
                    <div class="form-group col-4">
                      <label>Mes (MM) *</label>
                      <input type="text" class="atelier-input font-mono" [(ngModel)]="mesExp" placeholder="12" maxlength="2">
                    </div>
                    <div class="form-group col-4">
                      <label>Año (YYYY) *</label>
                      <input type="text" class="atelier-input font-mono" [(ngModel)]="anioExp" placeholder="2028" maxlength="4">
                    </div>
                    <div class="form-group col-4">
                      <label>CVC *</label>
                      <input type="text" class="atelier-input font-mono" [(ngModel)]="cvc" placeholder="123" maxlength="4">
                    </div>
                    <div class="form-group col-12">
                      <label>Titular de la Tarjeta *</label>
                      <input type="text" class="atelier-input" [(ngModel)]="titularTarjeta" placeholder="Nombre como figura en el plástico">
                    </div>
                  </div>
                </div>

                <!-- PAYPAL EXPRESS -->
                <div *ngIf="pasarelaSeleccionada === 'PAYPAL_EXPRESS'" class="pay-body-item animate-fade">
                  <div class="paypal-info-box">
                    <strong>Billetera Digital Internacional</strong>
                    <p>Será autenticado directamente con su cuenta PayPal Express de manera cifrada y segura.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- PASO 4: TOTAL Y BOTÓN DE CONFIRMACIÓN -->
            <div class="panel-box checkout-summary-box">
              <div class="summary-line">
                <span>Subtotal Prendas:</span>
                <span><span class="currency">$</span>{{ subtotal | number:'1.2-2' }} USD</span>
              </div>
              <div class="summary-line">
                <span>Logística / Envío:</span>
                <span [class.gold-text]="costoCalculadoEnvio === 0">
                  {{ costoCalculadoEnvio === 0 ? 'GRATIS ($0.00)' : ('$' + (costoCalculadoEnvio | number:'1.2-2') + ' USD') }}
                </span>
              </div>
              <div class="summary-line total-line">
                <span>Total a Pagar:</span>
                <span class="grand-total"><span class="currency">$</span>{{ totalFinal | number:'1.2-2' }} USD</span>
              </div>

              <button
                type="button"
                class="btn-confirm-checkout"
                [disabled]="isSubmitting || cartItems.length === 0"
                (click)="procesarCheckout()">
                <span *ngIf="!isSubmitting">
                  CONFIRMAR PEDIDO &bull; <span class="currency">$</span>{{ totalFinal | number:'1.2-2' }} USD
                </span>
                <span *ngIf="isSubmitting">
                  <span class="spinner-dot"></span> Procesando con Pasarela...
                </span>
              </button>

              <div class="security-badges">
                <span>🔒 Protocolo Seguro SSL/TLS</span>
                <span>💎 Garantía de Alta Costura</span>
                <span>📦 Trazabilidad de Despacho</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- PESTAÑA 2: RASTREO Y GESTIÓN DE PEDIDOS ONLINE                 -->
      <!-- ============================================================== -->
      <div *ngIf="activeTab === 'pedidos'" class="pedidos-layout">
        <div class="panel-box">
          <div class="panel-header-filter">
            <div class="header-filter-title">
              <h3>Control Logístico de Envíos &amp; Pedidos Online</h3>
              <span class="filter-count">{{ pedidosOnline.length }} pedidos registrados</span>
            </div>

            <!-- FILTROS -->
            <div class="filter-controls">
              <div class="filter-item">
                <label>Filtrar por Estado:</label>
                <select class="atelier-select compact" [(ngModel)]="filtroEstado" (change)="aplicarFiltrosPedidos()">
                  <option value="TODOS">Todos los Estados</option>
                  <option value="PREPARANDO">Preparando en Boutique</option>
                  <option value="EN_CAMINO">En Camino (Courier)</option>
                  <option value="LISTO_RECOJO">Listo para Recojo</option>
                  <option value="ENTREGADO">Entregado</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              </div>

              <div class="filter-item">
                <label>Sucursal:</label>
                <select class="atelier-select compact" [(ngModel)]="filtroSucursal" (change)="aplicarFiltrosPedidos()">
                  <option [ngValue]="null">Todas las Sucursales</option>
                  <option *ngFor="let s of sucursales" [ngValue]="s.id">{{ s.nombre }}</option>
                </select>
              </div>

              <button type="button" class="btn-refresh" (click)="cargarPedidosTab()" [disabled]="isLoadingPedidos">
                🔄 Refrescar
              </button>
            </div>
          </div>

          <!-- TABLA DE PEDIDOS -->
          <div class="table-responsive">
            <table class="atelier-table">
              <thead>
                <tr>
                  <th>Venta &bull; Tracking</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Modalidad &bull; Destino</th>
                  <th class="text-right">Total</th>
                  <th class="text-center">Estado Logístico</th>
                  <th class="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="pedidosOnline.length === 0">
                  <td colspan="7" class="text-center empty-cell">
                    <p>No se encontraron pedidos online con los filtros seleccionados.</p>
                  </td>
                </tr>
                <tr *ngFor="let v of pedidosOnline">
                  <td>
                    <div class="tracking-cell">
                      <span class="code-venta font-bold">#{{ v.codigo_venta }}</span>
                      <span class="tracking-num font-mono gold-text" *ngIf="v.envio">
                        🚚 {{ v.envio.codigo_seguimiento }}
                      </span>
                    </div>
                  </td>
                  <td>{{ v.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td>
                    <div class="client-cell">
                      <strong>{{ v.cliente_nombre }}</strong>
                      <span class="text-muted small" *ngIf="v.cliente">{{ v.cliente.email }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="shipping-info-cell" *ngIf="v.envio">
                      <span class="type-tag" [class.collect]="v.envio.tipo_entrega === 'CLICK_AND_COLLECT'">
                        {{ v.envio.tipo_entrega === 'DOMICILIO' ? 'Envío a Domicilio' : 'Click & Collect' }}
                      </span>
                      <span class="dest-text text-muted small" *ngIf="v.envio.tipo_entrega === 'DOMICILIO'">
                        {{ v.envio.direccion_linea1 }} ({{ v.envio.ciudad }})
                      </span>
                      <span class="dest-text text-muted small" *ngIf="v.envio.tipo_entrega === 'CLICK_AND_COLLECT'">
                        Boutique: {{ v.sucursal?.nombre || 'Principal' }}
                      </span>
                    </div>
                  </td>
                  <td class="text-right font-bold gold-text">
                    <span class="currency">$</span>{{ v.total | number:'1.2-2' }}
                  </td>
                  <td class="text-center">
                    <span class="status-pill" [ngClass]="v.envio?.estado_envio || 'PREPARANDO'">
                      {{ v.envio?.estado_envio || 'CONFIRMADO' }}
                    </span>
                  </td>
                  <td class="text-center">
                    <div class="row-actions">
                      <button
                        type="button"
                        class="btn-row-action"
                        title="Ver Detalle"
                        (click)="abrirDetallePedido(v)">
                        👁️ Detalle
                      </button>
                      <button
                        type="button"
                        class="btn-row-action highlight"
                        *ngIf="v.envio && v.envio.estado_envio !== 'ENTREGADO' && v.envio.estado_envio !== 'CANCELADO'"
                        (click)="abrirModalActualizarEstado(v)">
                        ⚡ Avanzar Estado
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- MODAL: ACTUALIZAR ESTADO LOGÍSTICO (ADMIN / ENCARGADO)          -->
      <!-- ============================================================== -->
      <div *ngIf="mostrarModalEstado && pedidoParaActualizar && pedidoParaActualizar.envio" class="modal-backdrop">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>Actualizar Estado Logístico</h3>
            <button type="button" class="btn-close-modal" (click)="cerrarModalEstado()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="modal-info-banner">
              <div><strong>Pedido:</strong> #{{ pedidoParaActualizar.codigo_venta }}</div>
              <div><strong>Tracking:</strong> {{ pedidoParaActualizar.envio.codigo_seguimiento }}</div>
              <div><strong>Estado Actual:</strong> <span class="gold-text">{{ pedidoParaActualizar.envio.estado_envio }}</span></div>
            </div>

            <div class="form-group">
              <label>Nuevo Estado de Envío *</label>
              <select class="atelier-select" [(ngModel)]="nuevoEstadoEnvio">
                <option value="PREPARANDO">PREPARANDO (En empaque boutique)</option>
                <option value="EN_CAMINO">EN_CAMINO (Entregado a Courier)</option>
                <option value="LISTO_RECOJO">LISTO_RECOJO (Disponible en Boutique)</option>
                <option value="ENTREGADO">ENTREGADO (Recepción final confirmada)</option>
                <option value="CANCELADO">CANCELADO</option>
              </select>
            </div>

            <div class="form-group" *ngIf="nuevoEstadoEnvio === 'EN_CAMINO'">
              <label>Empresa Courier / Repartidor *</label>
              <input type="text" class="atelier-input" [(ngModel)]="courierNombre" placeholder="Ej: Yaigo Express, DHL Express, PedidosYa">
            </div>

            <div class="form-group">
              <label>Notas u Observaciones Logísticas</label>
              <textarea class="atelier-textarea" rows="2" [(ngModel)]="notasEnvio" placeholder="Detalles de la entrega o guía..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-atelier-outline" (click)="cerrarModalEstado()">Cancelar</button>
            <button type="button" class="btn-atelier-gold" [disabled]="isSubmitting" (click)="guardarNuevoEstado()">
              <span *ngIf="!isSubmitting">Guardar Cambio</span>
              <span *ngIf="isSubmitting">Actualizando...</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- MODAL: DETALLE COMPLETO DE PEDIDO                              -->
      <!-- ============================================================== -->
      <div *ngIf="pedidoDetalleModal" class="modal-backdrop">
        <div class="modal-dialog large">
          <div class="modal-header">
            <h3>Detalle del Pedido #{{ pedidoDetalleModal.codigo_venta }}</h3>
            <button type="button" class="btn-close-modal" (click)="pedidoDetalleModal = null">&times;</button>
          </div>
          <div class="modal-body">
            <div class="detail-overview-grid">
              <div><strong>Cliente:</strong> {{ pedidoDetalleModal.cliente_nombre }} (NIT: {{ pedidoDetalleModal.cliente_nit }})</div>
              <div><strong>Sucursal Despacho:</strong> {{ pedidoDetalleModal.sucursal?.nombre || 'Boutique' }}</div>
              <div *ngIf="pedidoDetalleModal.envio">
                <strong>Tracking:</strong> {{ pedidoDetalleModal.envio.codigo_seguimiento }}
                ({{ pedidoDetalleModal.envio.tipo_entrega }})
              </div>
              <div *ngIf="pedidoDetalleModal.envio?.direccion_linea1">
                <strong>Dirección:</strong> {{ pedidoDetalleModal.envio?.direccion_linea1 }}, {{ pedidoDetalleModal.envio?.ciudad }}
              </div>
            </div>

            <h4 class="modal-subtitle">Artículos Comprados</h4>
            <table class="atelier-table compact">
              <thead>
                <tr>
                  <th>Prenda</th>
                  <th>Variante</th>
                  <th class="text-right">Cant.</th>
                  <th class="text-right">Precio Unit.</th>
                  <th class="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let d of pedidoDetalleModal.detalles">
                  <td>{{ d.variante?.prenda?.nombre || 'Prenda Atelier' }}</td>
                  <td>{{ d.variante?.talla?.codigo || 'Talla' }} - {{ d.variante?.color?.nombre || 'Color' }}</td>
                  <td class="text-right">{{ d.cantidad }}</td>
                  <td class="text-right"><span class="currency">$</span>{{ d.precio_unitario | number:'1.2-2' }}</td>
                  <td class="text-right font-bold"><span class="currency">$</span>{{ d.subtotal | number:'1.2-2' }}</td>
                </tr>
              </tbody>
            </table>

            <div class="modal-financial-summary">
              <div>Subtotal: <span class="currency">$</span>{{ pedidoDetalleModal.subtotal | number:'1.2-2' }} USD</div>
              <div>Costo Envío: <span class="currency">$</span>{{ pedidoDetalleModal.costo_envio | number:'1.2-2' }} USD</div>
              <div class="font-bold gold-text font-lg">Total: <span class="currency">$</span>{{ pedidoDetalleModal.total | number:'1.2-2' }} USD</div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-atelier-gold" (click)="pedidoDetalleModal = null">Cerrar</button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .atelier-checkout-container {
      padding: 1.5rem 2rem;
      max-width: 1400px;
      margin: 0 auto;
      color: #e5e5e5;
    }

    /* HEADER */
    .checkout-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .subtitle-badge {
      font-size: 0.75rem;
      letter-spacing: 2px;
      color: #d4af37;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }
    .header-titles h1 {
      font-family: 'Cinzel', 'Playfair Display', serif;
      font-size: 2.2rem;
      font-weight: 700;
      letter-spacing: 1px;
      margin: 0 0 0.5rem 0;
      color: #ffffff;
    }
    .header-titles .description {
      color: #a5a5a5;
      font-size: 0.95rem;
      max-width: 800px;
      margin: 0;
      line-height: 1.5;
    }

    /* TABS */
    .tabs-switcher {
      display: flex;
      background: #181818;
      border: 1px solid #2a2a2a;
      border-radius: 6px;
      padding: 4px;
      gap: 4px;
    }
    .tab-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background: transparent;
      border: none;
      color: #a5a5a5;
      padding: 8px 18px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
    }
    .tab-btn.active {
      background: #d4af37;
      color: #0d0d0d;
    }
    .tab-badge {
      background: #0d0d0d;
      color: #d4af37;
      font-size: 0.7rem;
      padding: 1px 6px;
      border-radius: 10px;
      font-weight: 700;
    }

    /* TOASTS */
    .toast-banner {
      display: flex;
      align-items: center;
      padding: 1rem 1.25rem;
      border-radius: 6px;
      margin-bottom: 1.5rem;
      gap: 1rem;
    }
    .toast-banner.success {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #34d399;
    }
    .toast-banner.error {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #f87171;
    }
    .toast-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .btn-close-toast {
      background: none;
      border: none;
      color: inherit;
      font-size: 1.25rem;
      cursor: pointer;
    }

    /* PANELS & GRIDS */
    .panel-box {
      background: #141414;
      border: 1px solid #262626;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
      border-bottom: 1px solid #222;
      padding-bottom: 0.75rem;
    }
    .panel-header h3 {
      margin: 0;
      font-size: 1.15rem;
      color: #ffffff;
      font-weight: 600;
    }
    .item-count-text {
      font-size: 0.85rem;
      color: #d4af37;
    }

    .checkout-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.75rem;
    }
    @media (max-width: 1024px) {
      .checkout-grid {
        grid-template-columns: 1fr;
      }
    }

    /* EMPTY CART */
    .empty-cart-state {
      text-align: center;
      padding: 2.5rem 1rem;
    }
    .empty-icon {
      font-size: 3rem;
      margin-bottom: 0.75rem;
    }
    .empty-cart-state h4 {
      margin: 0 0 0.5rem 0;
      color: #fff;
      font-size: 1.2rem;
    }
    .empty-cart-state p {
      color: #888;
      font-size: 0.9rem;
      margin-bottom: 1.5rem;
    }
    .quick-add-zone {
      margin-top: 2rem;
      background: #191919;
      border: 1px dashed #333;
      border-radius: 6px;
      padding: 1.25rem;
      text-align: left;
    }
    .quick-add-title {
      display: block;
      font-size: 0.8rem;
      letter-spacing: 1px;
      color: #d4af37;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 0.75rem;
    }
    .quick-items-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.75rem;
    }
    .quick-item-card {
      background: #101010;
      border: 1px solid #292929;
      padding: 0.75rem;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .quick-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .quick-info strong {
      font-size: 0.85rem;
      color: #fff;
    }
    .quick-price {
      font-size: 0.8rem;
      color: #d4af37;
    }
    .btn-quick-add {
      background: rgba(212, 175, 55, 0.15);
      border: 1px solid #d4af37;
      color: #d4af37;
      padding: 4px 10px;
      font-size: 0.75rem;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.15s ease;
    }
    .btn-quick-add:hover {
      background: #d4af37;
      color: #0d0d0d;
    }

    /* CART TABLE */
    .atelier-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }
    .atelier-table th {
      text-align: left;
      padding: 0.75rem 0.5rem;
      color: #888;
      font-size: 0.75rem;
      letter-spacing: 1px;
      text-transform: uppercase;
      border-bottom: 1px solid #262626;
    }
    .atelier-table td {
      padding: 0.85rem 0.5rem;
      border-bottom: 1px solid #1f1f1f;
      vertical-align: middle;
    }
    .item-title-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .item-name {
      font-weight: 600;
      color: #ffffff;
    }
    .item-sku {
      font-size: 0.72rem;
      color: #777;
    }
    .badge-tag {
      background: #202020;
      border: 1px solid #333;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.72rem;
      color: #aaa;
      margin-right: 4px;
    }
    .quantity-control {
      display: inline-flex;
      align-items: center;
      background: #1c1c1c;
      border: 1px solid #333;
      border-radius: 4px;
    }
    .btn-qty {
      background: transparent;
      border: none;
      color: #ccc;
      width: 26px;
      height: 26px;
      cursor: pointer;
      font-weight: bold;
    }
    .btn-qty:hover {
      background: #333;
      color: #fff;
    }
    .qty-number {
      padding: 0 8px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .btn-delete-item {
      background: transparent;
      border: none;
      color: #666;
      font-size: 1.25rem;
      cursor: pointer;
      transition: color 0.15s ease;
    }
    .btn-delete-item:hover {
      color: #f87171;
    }
    .cart-table-footer {
      padding-top: 1rem;
      text-align: right;
    }

    /* INCENTIVE BANNER */
    .shipping-incentive-box {
      background: rgba(212, 175, 55, 0.06);
      border: 1px solid rgba(212, 175, 55, 0.25);
      padding: 1rem 1.25rem;
      font-size: 0.88rem;
    }
    .incentive-badge {
      display: inline-block;
      font-size: 0.68rem;
      letter-spacing: 1px;
      background: #d4af37;
      color: #0d0d0d;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
      margin-bottom: 0.35rem;
    }

    /* FORM STYLES */
    .form-section {
      margin-bottom: 1.25rem;
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 1.25rem;
    }
    .step-num {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #d4af37;
      color: #0d0d0d;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.78rem;
    }
    .section-title h3 {
      margin: 0;
      font-size: 1.05rem;
      color: #fff;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 0.85rem;
    }
    .col-12 { grid-column: span 12; }
    .col-6 { grid-column: span 6; }
    .col-4 { grid-column: span 4; }

    .form-group label {
      display: block;
      font-size: 0.75rem;
      color: #aaa;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.35rem;
    }
    .atelier-input, .atelier-select, .atelier-textarea {
      width: 100%;
      background: #111111;
      border: 1px solid #333333;
      border-radius: 4px;
      color: #ffffff;
      padding: 0.65rem 0.85rem;
      font-size: 0.88rem;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }
    .atelier-input:focus, .atelier-select:focus, .atelier-textarea:focus {
      outline: none;
      border-color: #d4af37;
    }

    /* DELIVERY OPTIONS */
    .delivery-options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .delivery-card {
      background: #111;
      border: 1px solid #2a2a2a;
      border-radius: 6px;
      padding: 1rem;
      cursor: pointer;
      display: flex;
      gap: 10px;
      transition: all 0.2s ease;
    }
    .delivery-card:hover {
      border-color: #555;
    }
    .delivery-card.selected {
      border-color: #d4af37;
      background: rgba(212, 175, 55, 0.05);
    }
    .card-radio-indicator {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid #555;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 2px;
    }
    .delivery-card.selected .card-radio-indicator {
      border-color: #d4af37;
    }
    .radio-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #d4af37;
    }
    .delivery-card-content {
      flex: 1;
    }
    .delivery-card-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 0.35rem;
      font-size: 0.9rem;
      color: #fff;
    }
    .delivery-desc {
      font-size: 0.78rem;
      color: #888;
      margin: 0 0 0.5rem 0;
      line-height: 1.35;
    }
    .delivery-cost {
      font-size: 0.85rem;
      font-weight: 700;
      color: #fff;
    }
    .delivery-cost.free {
      color: #34d399;
    }
    .delivery-subform {
      background: #0d0d0d;
      border: 1px solid #222;
      border-radius: 6px;
      padding: 1rem;
      margin-top: 1rem;
    }
    .collect-notice {
      margin-top: 0.5rem;
      font-size: 0.8rem;
      color: #aaa;
    }

    /* PAYMENT TABS */
    .payment-tabs {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      margin-bottom: 1rem;
    }
    .pay-tab-btn {
      background: #111;
      border: 1px solid #2a2a2a;
      border-radius: 4px;
      padding: 8px 10px;
      color: #999;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .pay-tab-btn.active {
      border-color: #d4af37;
      background: rgba(212, 175, 55, 0.1);
      color: #fff;
    }
    .payment-method-body {
      background: #0d0d0d;
      border: 1px solid #222;
      border-radius: 6px;
      padding: 1.25rem;
    }
    .qr-preview-badge {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge-icon {
      font-size: 2rem;
    }
    .qr-preview-badge strong {
      display: block;
      color: #fff;
      margin-bottom: 2px;
    }
    .qr-preview-badge p {
      margin: 0;
      font-size: 0.8rem;
      color: #888;
    }
    .paypal-info-box {
      font-size: 0.85rem;
    }
    .paypal-info-box strong {
      display: block;
      color: #fff;
      margin-bottom: 4px;
    }
    .paypal-info-box p {
      margin: 0;
      color: #888;
    }

    /* FINAL SUMMARY & BUTTON */
    .checkout-summary-box {
      background: #141414;
      border: 1px solid #2d2d2d;
    }
    .summary-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.65rem;
      font-size: 0.9rem;
      color: #aaa;
    }
    .total-line {
      border-top: 1px solid #262626;
      padding-top: 0.85rem;
      margin-top: 0.85rem;
      color: #ffffff;
      font-size: 1.05rem;
      font-weight: bold;
    }
    .grand-total {
      color: #d4af37;
      font-size: 1.35rem;
    }
    .btn-confirm-checkout {
      width: 100%;
      background: #d4af37;
      color: #0d0d0d;
      border: none;
      padding: 1rem;
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 1px;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 1rem;
      transition: all 0.2s ease;
    }
    .btn-confirm-checkout:hover:not(:disabled) {
      background: #e6c555;
      transform: translateY(-1px);
    }
    .btn-confirm-checkout:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .security-badges {
      display: flex;
      justify-content: space-between;
      font-size: 0.72rem;
      color: #777;
      margin-top: 1rem;
      text-align: center;
    }

    /* ORDER CONFIRMED VIEW */
    .order-confirmed-panel {
      max-width: 900px;
      margin: 0 auto;
    }
    .success-crest {
      text-align: center;
      margin-bottom: 2rem;
    }
    .crest-icon {
      font-size: 3rem;
      color: #d4af37;
      margin-bottom: 0.5rem;
    }
    .success-crest h2 {
      font-family: 'Cinzel', serif;
      font-size: 2rem;
      margin: 0 0 0.5rem 0;
      color: #fff;
    }
    .order-subtitle {
      color: #888;
      margin: 0;
    }
    .order-summary-box {
      background: #141414;
      border: 1px solid rgba(212, 175, 55, 0.3);
      border-radius: 8px;
      padding: 2rem;
    }
    .summary-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #262626;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .summary-label {
      display: block;
      font-size: 0.72rem;
      letter-spacing: 1px;
      color: #888;
    }
    .summary-value {
      font-size: 1.15rem;
    }
    .highlight-badge {
      background: rgba(212, 175, 55, 0.15);
      border: 1px solid #d4af37;
      color: #d4af37;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.95rem;
    }
    .order-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .detail-group .lbl {
      display: block;
      font-size: 0.75rem;
      color: #888;
      margin-bottom: 0.25rem;
    }
    .detail-group .val {
      display: block;
      color: #fff;
      font-size: 0.9rem;
    }
    .confirmed-items-list {
      margin-top: 1.5rem;
      border-top: 1px solid #262626;
      padding-top: 1.5rem;
    }
    .confirmed-items-list h4 {
      margin: 0 0 1rem 0;
      color: #d4af37;
      font-size: 0.95rem;
    }
    .order-actions {
      display: flex;
      gap: 1rem;
      margin-top: 2rem;
      flex-wrap: wrap;
    }

    /* TABLA Y FILTROS TAB 2: PEDIDOS ONLINE */
    .panel-header-filter {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .filter-controls {
      display: flex;
      align-items: flex-end;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .filter-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .filter-item label {
      font-size: 0.72rem;
      color: #888;
      text-transform: uppercase;
    }
    .btn-refresh {
      background: #1f1f1f;
      border: 1px solid #333;
      color: #ccc;
      padding: 0.55rem 0.85rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
    }
    .tracking-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .code-venta {
      color: #fff;
    }
    .tracking-num {
      font-size: 0.78rem;
    }
    .status-pill {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .status-pill.PREPARANDO {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid #f59e0b;
      color: #fbbf24;
    }
    .status-pill.EN_CAMINO {
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid #3b82f6;
      color: #60a5fa;
    }
    .status-pill.LISTO_RECOJO {
      background: rgba(168, 85, 247, 0.15);
      border: 1px solid #a855f7;
      color: #c084fc;
    }
    .status-pill.ENTREGADO {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid #10b981;
      color: #34d399;
    }
    .status-pill.CANCELADO {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #f87171;
    }
    .type-tag {
      background: #202020;
      border: 1px solid #333;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.72rem;
      color: #ddd;
      display: inline-block;
      margin-bottom: 2px;
    }
    .type-tag.collect {
      border-color: rgba(212, 175, 55, 0.4);
      color: #d4af37;
    }
    .row-actions {
      display: flex;
      gap: 6px;
      justify-content: center;
    }
    .btn-row-action {
      background: #1b1b1b;
      border: 1px solid #333;
      color: #bbb;
      padding: 4px 8px;
      font-size: 0.75rem;
      border-radius: 4px;
      cursor: pointer;
    }
    .btn-row-action:hover {
      background: #252525;
      color: #fff;
    }
    .btn-row-action.highlight {
      border-color: rgba(212, 175, 55, 0.4);
      color: #d4af37;
    }
    .btn-row-action.highlight:hover {
      background: #d4af37;
      color: #0d0d0d;
    }

    /* MODAL */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1200;
      padding: 1rem;
    }
    .modal-dialog {
      background: #141414;
      border: 1px solid #333;
      border-radius: 8px;
      width: 100%;
      max-width: 520px;
      padding: 1.5rem;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);
    }
    .modal-dialog.large {
      max-width: 750px;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
      border-bottom: 1px solid #262626;
      padding-bottom: 0.75rem;
    }
    .modal-header h3 {
      margin: 0;
      font-size: 1.15rem;
      color: #fff;
    }
    .btn-close-modal {
      background: transparent;
      border: none;
      color: #888;
      font-size: 1.5rem;
      cursor: pointer;
    }
    .modal-info-banner {
      background: #1c1c1c;
      border-left: 3px solid #d4af37;
      padding: 0.75rem 1rem;
      margin-bottom: 1.25rem;
      font-size: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid #222;
    }
    .detail-overview-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      background: #191919;
      padding: 1rem;
      border-radius: 6px;
      margin-bottom: 1.25rem;
      font-size: 0.85rem;
    }
    .modal-subtitle {
      margin: 1rem 0 0.5rem 0;
      font-size: 0.95rem;
      color: #d4af37;
    }
    .modal-financial-summary {
      margin-top: 1.25rem;
      padding-top: 0.75rem;
      border-top: 1px solid #262626;
      text-align: right;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.9rem;
    }

    /* BUTTONS */
    .btn-atelier-gold {
      background: #d4af37;
      color: #0d0d0d;
      border: none;
      padding: 0.65rem 1.25rem;
      font-size: 0.85rem;
      font-weight: 700;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-atelier-gold:hover:not(:disabled) {
      background: #e6c555;
    }
    .btn-atelier-outline {
      background: transparent;
      border: 1px solid #d4af37;
      color: #d4af37;
      padding: 0.65rem 1.25rem;
      font-size: 0.85rem;
      font-weight: 600;
      border-radius: 4px;
      cursor: pointer;
    }
    .btn-atelier-outline:hover {
      background: rgba(212, 175, 55, 0.15);
    }
    .btn-atelier-text {
      background: transparent;
      border: none;
      color: #999;
      font-size: 0.85rem;
      cursor: pointer;
      text-decoration: underline;
    }
    .btn-atelier-text:hover {
      color: #fff;
    }
    .text-danger {
      color: #f87171 !important;
    }

    /* UTILITIES */
    .gold-text { color: #d4af37; }
    .text-muted { color: #888888; }
    .font-mono { font-family: monospace; }
    .font-bold { font-weight: 700; }
    .font-lg { font-size: 1.15rem; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .currency { font-family: sans-serif; }
    .animate-fade {
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class CheckoutEcommercePageComponent implements OnInit {
  readonly cartService = inject(CartService);
  private readonly ventasService = inject(VentasService);
  private readonly inventarioService = inject(InventarioService);
  private readonly catalogoService = inject(CatalogoService);
  private readonly authService = inject(AuthService);

  activeTab: 'checkout' | 'pedidos' = 'checkout';
  cartItems: CartItem[] = [];
  subtotal = 0;
  costoCalculadoEnvio = 5.00;
  totalFinal = 0;

  // Formulario Checkout
  clienteNombre = '';
  clienteNit = '0';
  clienteTelefono = '';
  clienteEmail = '';
  tipoEntrega: 'DOMICILIO' | 'CLICK_AND_COLLECT' = 'DOMICILIO';
  direccionLinea1 = '';
  ciudad = 'La Paz';
  departamento = 'La Paz';
  instruccionesEntrega = '';
  sucursalDespachoId: number = 2; // Default Calacoto

  // Pasarelas
  pasarelaSeleccionada: 'LIBELULA_BOLIVIA' | 'STRIPE_INTL' | 'PAYPAL_EXPRESS' = 'LIBELULA_BOLIVIA';
  numeroTarjeta = '4242 4242 4242 4242';
  mesExp = '12';
  anioExp = '2028';
  cvc = '123';
  titularTarjeta = 'CLIENTE ATELIER';

  // Estados y Listados
  sucursales: Sucursal[] = [];
  prendasCatalogo: Prenda[] = [];
  isSubmitting = false;
  mensajeExito: string | null = null;
  mensajeError: string | null = null;
  pedidoConfirmado: VentaResponse | null = null;

  // Tab 2: Pedidos Online
  pedidosOnline: VentaResponse[] = [];
  todosLosPedidos: VentaResponse[] = [];
  filtroEstado = 'TODOS';
  filtroSucursal: number | null = null;
  isLoadingPedidos = false;
  pedidoDetalleModal: VentaResponse | null = null;

  // Modal Actualizar Estado Logístico
  mostrarModalEstado = false;
  pedidoParaActualizar: VentaResponse | null = null;
  nuevoEstadoEnvio: 'PREPARANDO' | 'EN_CAMINO' | 'LISTO_RECOJO' | 'ENTREGADO' | 'CANCELADO' = 'EN_CAMINO';
  courierNombre = 'Yaigo Express Courier';
  notasEnvio = '';

  ngOnInit(): void {
    this.cargarDatosIniciales();
    this.suscribirAlCarrito();
  }

  private suscribirAlCarrito(): void {
    this.cartService.items$.subscribe(items => {
      this.cartItems = items;
      this.calcularTotales();
    });
  }

  private cargarDatosIniciales(): void {
    // Autocompletar datos del usuario autenticado si existe
    const usuarioActual = this.authService.currentUser();
    if (usuarioActual) {
      this.clienteNombre = `${usuarioActual.nombre || ''} ${usuarioActual.apellido || ''}`.trim();
      this.clienteEmail = usuarioActual.email || '';
      if (usuarioActual.ci_nit) this.clienteNit = usuarioActual.ci_nit;
      if (usuarioActual.telefono) this.clienteTelefono = usuarioActual.telefono;
      if (usuarioActual.direccion) this.direccionLinea1 = usuarioActual.direccion;
    }

    // Cargar sucursales
    this.inventarioService.getSucursales().subscribe({
      next: (sucursales) => {
        this.sucursales = sucursales;
        if (sucursales.length > 0 && !this.sucursalDespachoId) {
          this.sucursalDespachoId = sucursales[0].id;
        }
      },
      error: (err) => console.error('Error al cargar sucursales:', err)
    });

    // Cargar prendas de muestra para Quick-Add
    this.catalogoService.getPrendas().subscribe({
      next: (prendas) => {
        this.prendasCatalogo = prendas;
      },
      error: (err) => console.error('Error al cargar catálogo:', err)
    });
  }

  calcularTotales(): void {
    this.subtotal = this.cartService.getSubtotal();
    if (this.tipoEntrega === 'CLICK_AND_COLLECT') {
      this.costoCalculadoEnvio = 0.0;
    } else {
      // Envío gratis si subtotal >= 150
      this.costoCalculadoEnvio = this.subtotal >= 150 ? 0.0 : 5.0;
    }
    this.totalFinal = this.subtotal + this.costoCalculadoEnvio;
  }

  seleccionarTipoEntrega(tipo: 'DOMICILIO' | 'CLICK_AND_COLLECT'): void {
    this.tipoEntrega = tipo;
    this.calcularTotales();
  }

  seleccionarPasarela(pasarela: 'LIBELULA_BOLIVIA' | 'STRIPE_INTL' | 'PAYPAL_EXPRESS'): void {
    this.pasarelaSeleccionada = pasarela;
  }

  // Métodos de Carrito
  aumentarCantidad(item: CartItem): void {
    this.cartService.updateQuantity(item.variante_id, item.cantidad + 1);
  }

  disminuirCantidad(item: CartItem): void {
    this.cartService.updateQuantity(item.variante_id, item.cantidad - 1);
  }

  eliminarItem(item: CartItem): void {
    this.cartService.removeItem(item.variante_id);
  }

  vaciarBolsa(): void {
    this.cartService.clear();
  }

  agregarPrendaRapida(prenda: Prenda): void {
    if (!prenda.variantes || prenda.variantes.length === 0) return;
    const v = prenda.variantes[0];
    this.cartService.addItem({
      variante_id: v.id,
      prenda_id: prenda.id,
      prenda_nombre: prenda.nombre,
      prenda_sku: prenda.sku,
      variante_sku: v.sku_variante || prenda.sku,
      talla: v.talla?.codigo || 'M',
      color: v.color?.nombre || 'Negro',
      precio_unitario: prenda.precio_base
    }, 1);
    this.mensajeExito = `Añadido "${prenda.nombre}" a su bolsa de compras.`;
    setTimeout(() => this.mensajeExito = null, 3000);
  }

  // PROCESAMIENTO CHECKOUT
  procesarCheckout(): void {
    if (this.cartItems.length === 0) {
      this.mensajeError = 'Su bolsa de compras está vacía.';
      return;
    }
    if (!this.clienteNombre || !this.clienteEmail) {
      this.mensajeError = 'Por favor complete su nombre y correo electrónico.';
      return;
    }
    if (this.tipoEntrega === 'DOMICILIO' && !this.direccionLinea1) {
      this.mensajeError = 'Debe indicar la dirección de entrega.';
      return;
    }

    this.isSubmitting = true;
    this.mensajeError = null;

    let metodoPagoFinal: 'QR_SIMPLE' | 'TARJETA' | 'PAYPAL' = 'QR_SIMPLE';
    if (this.pasarelaSeleccionada === 'STRIPE_INTL') metodoPagoFinal = 'TARJETA';
    if (this.pasarelaSeleccionada === 'PAYPAL_EXPRESS') metodoPagoFinal = 'PAYPAL';

    const tipoEntregaPayload = this.tipoEntrega === 'CLICK_AND_COLLECT' ? 'CLICK_AND_COLLECT' : 'DOMICILIO';
    const datosEnvioObj = {
      tipo_entrega: tipoEntregaPayload,
      direccion_linea1: this.tipoEntrega === 'DOMICILIO' ? this.direccionLinea1 : undefined,
      ciudad: this.tipoEntrega === 'DOMICILIO' ? this.ciudad : undefined,
      departamento: this.tipoEntrega === 'DOMICILIO' ? this.departamento : undefined,
      telefono_contacto: this.clienteTelefono || undefined,
      instrucciones_entrega: this.instruccionesEntrega || undefined,
      sucursal_recojo_id: this.tipoEntrega === 'CLICK_AND_COLLECT' ? Number(this.sucursalDespachoId) : undefined
    };

    const payload: any = {
      sucursal_despacho_id: Number(this.sucursalDespachoId),
      sucursal_id: Number(this.sucursalDespachoId),
      cliente_nombre: this.clienteNombre,
      cliente_nit: this.clienteNit || '0',
      cliente_email: this.clienteEmail,
      cliente_telefono: this.clienteTelefono || undefined,
      observaciones: 'Venta E-Commerce Atelier Noir',
      detalles: this.cartItems.map(item => ({
        variante_id: item.variante_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario
      })),
      envio: datosEnvioObj,
      datos_envio: datosEnvioObj,
      pago: {
        metodo_pago: metodoPagoFinal,
        pasarela: this.pasarelaSeleccionada,
        monto: this.totalFinal,
        moneda: 'USD',
        cliente_email: this.clienteEmail,
        datos_tarjeta: this.pasarelaSeleccionada === 'STRIPE_INTL' ? {
          numero: this.numeroTarjeta.replace(/\s+/g, ''),
          mes_exp: this.mesExp,
          anio_exp: this.anioExp,
          cvc: this.cvc,
          titular: this.titularTarjeta
        } : undefined,
        concepto: `Compra Online E-Commerce Atelier Noir - Total $${this.totalFinal.toFixed(2)} USD`
      }
    };

    this.ventasService.procesarCheckoutOnline(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.pedidoConfirmado = res;
        this.cartService.clear();
        this.mensajeExito = `¡Pedido ${res.codigo_venta} procesado con éxito! Se descontó stock y se generó el tracking ${res.envio?.codigo_seguimiento}.`;
      },
      error: (err) => {
        this.isSubmitting = false;
        const detail = err.error?.detail;
        if (Array.isArray(detail)) {
          this.mensajeError = detail.map((d: any) => d.msg ? `${d.loc?.slice(1)?.join('.') || ''}: ${d.msg}` : JSON.stringify(d)).join(' | ');
        } else if (typeof detail === 'string') {
          this.mensajeError = detail;
        } else {
          this.mensajeError = 'No se pudo procesar la compra online.';
        }
      }
    });
  }

  nuevaCompra(): void {
    this.pedidoConfirmado = null;
    this.mensajeExito = null;
  }

  imprimirComprobante(): void {
    window.print();
  }

  verEnRastreo(pedido: VentaResponse): void {
    this.activeTab = 'pedidos';
    this.cargarPedidosTab();
  }

  // TAB 2: PEDIDOS ONLINE
  cargarPedidosTab(): void {
    this.activeTab = 'pedidos';
    this.isLoadingPedidos = true;
    this.ventasService.getPedidosOnline().subscribe({
      next: (pedidos) => {
        this.isLoadingPedidos = false;
        this.todosLosPedidos = pedidos;
        this.aplicarFiltrosPedidos();
      },
      error: (err) => {
        this.isLoadingPedidos = false;
        console.error('Error al cargar pedidos online:', err);
      }
    });
  }

  aplicarFiltrosPedidos(): void {
    let filtrados = [...this.todosLosPedidos];
    if (this.filtroEstado !== 'TODOS') {
      filtrados = filtrados.filter(p => p.envio?.estado_envio === this.filtroEstado);
    }
    if (this.filtroSucursal) {
      filtrados = filtrados.filter(p => p.sucursal_id === this.filtroSucursal);
    }
    this.pedidosOnline = filtrados;
  }

  abrirDetallePedido(pedido: VentaResponse): void {
    this.pedidoDetalleModal = pedido;
  }

  abrirModalActualizarEstado(pedido: VentaResponse): void {
    this.pedidoParaActualizar = pedido;
    if (pedido.envio) {
      this.nuevoEstadoEnvio = pedido.envio.estado_envio as any;
      if (this.nuevoEstadoEnvio === 'PREPARANDO') this.nuevoEstadoEnvio = 'EN_CAMINO';
    }
    this.mostrarModalEstado = true;
  }

  cerrarModalEstado(): void {
    this.mostrarModalEstado = false;
    this.pedidoParaActualizar = null;
  }

  guardarNuevoEstado(): void {
    if (!this.pedidoParaActualizar || !this.pedidoParaActualizar.envio) return;
    this.isSubmitting = true;

    const payload: ActualizarEstadoEnvioRequest = {
      estado_envio: this.nuevoEstadoEnvio,
      courier_nombre: this.courierNombre,
      notas: this.notasEnvio || undefined
    };

    this.ventasService.actualizarEstadoEnvio(this.pedidoParaActualizar.envio.id, payload).subscribe({
      next: (envioActualizado) => {
        this.isSubmitting = false;
        this.mensajeExito = `Tracking ${envioActualizado.codigo_seguimiento} actualizado a ${envioActualizado.estado_envio}.`;
        this.cerrarModalEstado();
        this.cargarPedidosTab();
        setTimeout(() => this.mensajeExito = null, 4000);
      },
      error: (err) => {
        this.isSubmitting = false;
        const detail = err.error?.detail || 'Error al actualizar el estado logístico.';
        this.mensajeError = typeof detail === 'string' ? detail : JSON.stringify(detail);
      }
    });
  }
}
