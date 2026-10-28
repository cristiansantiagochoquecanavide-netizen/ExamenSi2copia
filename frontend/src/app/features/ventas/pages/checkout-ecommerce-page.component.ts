import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CartService, CartItem } from '../services/cart.service';
import { VentasService } from '../services/ventas.service';
import { InventarioService } from '../../inventario/services/inventario.service';
import { CatalogoService } from '../../catalogo/services/catalogo.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionesService } from '../../notificaciones/services/notificaciones.service';
import { Sucursal } from '../../inventario/models/inventario.models';
import { Prenda } from '../../catalogo/models/catalogo.models';
import {
  VentaResponse,
  VentaOnlineCheckoutRequest,
  EnvioPedido,
  ActualizarEstadoEnvioRequest,
  ValidarCuponResponse
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
          <div class="subtitle-badge">ATELIER NOIR &bull; E-COMMERCE</div>
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
            <span>Bolsa &amp; Checkout</span>
            <span class="tab-badge" *ngIf="(cartService.count$ | async) as count">{{ count }}</span>
          </button>
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab === 'pedidos'"
            (click)="cargarPedidosTab()">
            <span>Rastreo de Pedidos</span>
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
        <div *ngIf="pedidoConfirmado" class="order-confirmed-panel animate-fade">
          <div class="success-crest">
            <span class="material-symbols-outlined crest-icon" style="font-size: 32px; color: #16a34a;">check_circle</span>
            <div class="stripe-success-tag" [ngSwitch]="ultimoMetodoPagoUtilizado">
              <span *ngSwitchCase="'LIBELULA_BOLIVIA'">PAGO ACREDITADO CON QR SIMPLE (LIBÉLULA)</span>
              <span *ngSwitchCase="'PAYPAL_EXPRESS'">PAGO AUTORIZADO CON PAYPAL EXPRESS</span>
              <span *ngSwitchDefault>PAGO AUTORIZADO CON STRIPE</span>
            </div>
            <h2>¡Tu compra ha sido exitosa!</h2>
            <p class="order-subtitle">Su pedido digital fue procesado, el pago ha sido confirmado y el comprobante fiscal fue emitido.</p>
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
                  Envío a Domicilio Express ({{ pedidoConfirmado.envio?.ciudad }})
                </span>
                <span class="val" *ngIf="pedidoConfirmado.envio?.tipo_entrega === 'CLICK_AND_COLLECT'">
                  Click &amp; Collect (Recojo en Boutique)
                </span>
                <span class="val text-muted" *ngIf="pedidoConfirmado.envio?.direccion_linea1">
                  {{ pedidoConfirmado.envio?.direccion_linea1 }}
                </span>
              </div>
              <div class="detail-group">
                <span class="lbl">Total Liquidado:</span>
                <span class="val font-bold gold-text font-lg">
                  <span class="currency">Bs.</span> {{ pedidoConfirmado.total | number:'1.2-2' }}
                </span>
                <span class="val text-muted">
                  (Subtotal: <span class="currency">Bs.</span> {{ pedidoConfirmado.subtotal | number:'1.2-2' }} + Envío: <span class="currency">Bs.</span> {{ pedidoConfirmado.costo_envio | number:'1.2-2' }})
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
                    <td class="text-right"><span class="currency">Bs.</span> {{ item.precio_unitario | number:'1.2-2' }}</td>
                    <td class="text-right font-bold"><span class="currency">Bs.</span> {{ item.subtotal | number:'1.2-2' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="order-actions">
              <button type="button" class="btn-atelier-outline" (click)="imprimirComprobante()">
                Imprimir Voucher / Comprobante
              </button>
              <button type="button" class="btn-atelier-gold" (click)="verEnRastreo(pedidoConfirmado)">
                Rastrear Envío en Tiempo Real
              </button>
              <button type="button" class="btn-atelier-text" (click)="nuevaCompra()">
                + Realizar otra compra
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
                <span class="material-symbols-outlined empty-icon" style="font-size: 36px; color: #94a3b8;">shopping_bag</span>
                <h4>Su bolsa de compras está vacía</h4>
                <p>Seleccione prendas de nuestra colección de alta costura para iniciar su compra.</p>

                <!-- QUICK SELECTOR DE PRENDAS PARA TESTING RÁPIDO -->
                <div class="quick-add-zone" *ngIf="prendasCatalogo.length > 0">
                  <span class="quick-add-title">Añadir Prendas Rápidas para Demostración:</span>
                  <div class="quick-items-grid">
                    <div *ngFor="let p of prendasCatalogo.slice(0, 4)" class="quick-item-card">
                      <div class="quick-info">
                        <strong>{{ p.nombre }}</strong>
                        <span class="quick-price"><span class="currency">Bs.</span> {{ p.precio_base | number:'1.2-2' }}</span>
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
                        <span class="currency">Bs.</span> {{ item.precio_unitario | number:'1.2-2' }}
                      </td>
                      <td class="text-center">
                        <div class="quantity-control">
                          <button type="button" class="btn-qty" (click)="disminuirCantidad(item)">-</button>
                          <span class="qty-number">{{ item.cantidad }}</span>
                          <button type="button" class="btn-qty" (click)="aumentarCantidad(item)">+</button>
                        </div>
                      </td>
                      <td class="text-right font-bold gold-text">
                        <span class="currency">Bs.</span> {{ (item.precio_unitario * item.cantidad) | number:'1.2-2' }}
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
                    Vaciar Bolsa
                  </button>
                </div>
              </div>
            </div>

            <!-- DESGLOSE ECONÓMICO Y ENVÍO GRATIS -->
            <div class="panel-box shipping-incentive-box" *ngIf="cartItems.length > 0">
              <div *ngIf="subtotal >= 150" class="free-shipping-achieved">
                <span class="incentive-badge">BENEFICIO EXCLUSIVO</span>
                <strong>¡Felicidades! Su compra califica para Envío Courier Express GRATUITO.</strong>
              </div>
              <div *ngIf="subtotal < 150" class="free-shipping-progress">
                <span>Agregue <strong class="gold-text"><span class="currency">Bs.</span> {{ (150 - subtotal) | number:'1.2-2' }}</strong> adicionales para obtener <strong>Envío Courier GRATIS</strong>.</span>
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
                      <span class="material-symbols-outlined delivery-icon">local_shipping</span>
                      <strong>Envío a Domicilio Express</strong>
                    </div>
                    <p class="delivery-desc">Despacho courier a su puerta con número de seguimiento en tiempo real.</p>
                    <span class="delivery-cost" [class.free]="costoCalculadoEnvio === 0">
                      {{ costoCalculadoEnvio === 0 ? 'GRATIS (VIP)' : 'Bs. 5.00' }}
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
                      <span class="material-symbols-outlined delivery-icon">storefront</span>
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
                    <label>Ciudad *</label>
                    <select class="atelier-select" [(ngModel)]="ciudad" (change)="onCiudadChange()">
                      <option *ngFor="let c of getCiudadesDisponibles()" [value]="c">{{ c }}</option>
                    </select>
                  </div>
                  <div class="form-group col-12">
                    <label>Sucursal / Tienda de Despacho *</label>
                    <select class="atelier-select" [(ngModel)]="sucursalDespachoId">
                      <option *ngFor="let s of getSucursalesPorCiudad()" [value]="s.id">
                        {{ s.nombre }} - {{ s.direccion || 'Boutique Oficial' }}
                      </option>
                    </select>
                  </div>
                  <div class="form-group col-12">
                    <label>Dirección de Entrega (Calle, Número, Edificio, Dpto) *</label>
                    <input type="text" class="atelier-input" [(ngModel)]="direccionLinea1" placeholder="Ej: Condominio La Riviera #12B">
                  </div>
                  <div class="form-group col-12">
                    <label>Instrucciones de Entrega (Opcional)</label>
                    <input type="text" class="atelier-input" [(ngModel)]="instruccionesEntrega" placeholder="Ej: Tocar timbre 4B o dejar en recepción">
                  </div>
                </div>
              </div>

              <!-- CAMPOS SI ES CLICK & COLLECT -->
              <div *ngIf="tipoEntrega === 'CLICK_AND_COLLECT'" class="delivery-subform animate-fade">
                <div class="form-grid">
                  <div class="form-group col-12">
                    <label>Ciudad *</label>
                    <select class="atelier-select" [(ngModel)]="ciudad" (change)="onCiudadChange()">
                      <option *ngFor="let c of getCiudadesDisponibles()" [value]="c">{{ c }}</option>
                    </select>
                  </div>
                  <div class="form-group col-12">
                    <label>Sucursal / Tienda para Retiro *</label>
                    <select class="atelier-select" [(ngModel)]="sucursalDespachoId">
                      <option *ngFor="let s of getSucursalesPorCiudad()" [value]="s.id">
                        {{ s.nombre }} - {{ s.direccion || 'Boutique Oficial' }}
                      </option>
                    </select>
                  </div>
                </div>
                <div class="collect-notice">
                  <span>ℹ️ Su pedido estará listo para retiro en boutique en un plazo máximo de 2 horas tras confirmar el pago.</span>
                </div>
              </div>
            </div>

            <!-- PASO 3: CUPÓN DE DESCUENTO (CU16) -->
            <div class="panel-box form-section coupon-box">
              <div class="section-title">
                <span class="step-num">3</span>
                <h3>Cupón de Promoción o Descuento</h3>
              </div>
              <div class="coupon-content">
                <div *ngIf="!cuponAplicado || !cuponAplicado.valido" class="coupon-input-group">
                  <input
                    type="text"
                    class="atelier-input font-mono uppercase"
                    [(ngModel)]="codigoCuponInput"
                    placeholder="Ej: ATELIER20, NOIR50, ENVIOGRATIS"
                    (keyup.enter)="aplicarCupon()">
                  <button
                    type="button"
                    class="btn-apply-coupon"
                    [disabled]="validandoCupon || !codigoCuponInput.trim()"
                    (click)="aplicarCupon()">
                    {{ validandoCupon ? 'Validando...' : 'Aplicar Cupón' }}
                  </button>
                </div>

                <div *ngIf="mensajeCupon" class="coupon-feedback" [class.success]="cuponAplicado?.valido" [class.error]="cuponAplicado && !cuponAplicado.valido">
                  <span>{{ mensajeCupon }}</span>
                </div>

                <div *ngIf="cuponAplicado && cuponAplicado.valido" class="coupon-badge-applied">
                  <div class="coupon-applied-info">
                    <span class="coupon-tag">{{ cuponAplicado.codigo }}</span>
                    <span class="coupon-benefit">
                      {{ cuponAplicado.tipo_descuento === 'ENVIO_GRATIS' ? 'Envío Yaigo Bonificado (GRATIS)' : ('- Bs. ' + (cuponAplicado.descuento_calculado | number:'1.2-2') + ' de Descuento') }}
                    </span>
                  </div>
                  <button type="button" class="btn-remove-coupon" (click)="quitarCupon()" title="Quitar cupón">&times;</button>
                </div>
              </div>
            </div>

            <!-- PASO 4: PASARELA DE PAGO INTEGRADA (CU12) -->
            <div class="panel-box form-section">
              <div class="section-title">
                <span class="step-num">4</span>
                <h3>Pasarela de Pago Electrónico</h3>
              </div>

              <div class="payment-tabs">
                <button
                  type="button"
                  class="pay-tab-btn"
                  [class.active]="pasarelaSeleccionada === 'LIBELULA_BOLIVIA'"
                  (click)="seleccionarPasarela('LIBELULA_BOLIVIA')">
                  <span>QR Simple (Bolivia)</span>
                </button>
                <button
                  type="button"
                  class="pay-tab-btn"
                  [class.active]="pasarelaSeleccionada === 'STRIPE_INTL'"
                  (click)="seleccionarPasarela('STRIPE_INTL')">
                  <span>Tarjeta de Crédito / Débito</span>
                </button>
                <button
                  type="button"
                  class="pay-tab-btn"
                  [class.active]="pasarelaSeleccionada === 'PAYPAL_EXPRESS'"
                  (click)="seleccionarPasarela('PAYPAL_EXPRESS')">
                  <span>PayPal Express</span>
                </button>
              </div>

              <!-- DETALLES DE CADA PASARELA -->
              <div class="payment-method-body">
                <!-- QR LIBÉLULA INTERACTIVO -->
                <div *ngIf="pasarelaSeleccionada === 'LIBELULA_BOLIVIA'" class="pay-body-item animate-fade">
                  <div class="qr-checkout-layout">
                    <!-- FRAME DEL CÓDIGO QR -->
                    <div class="qr-frame-wrapper">
                      <div class="qr-code-box">
                        <img
                          [src]="getQrImageUrl()"
                          (error)="$any($event.target).src = svgFallbackQr"
                          alt="QR Simple Interoperable"
                          class="qr-main-image" />

                        <!-- OVERLAY DE VERIFICACIÓN (3 SEGUNDOS) -->
                        <div *ngIf="isVerificandoPago" class="qr-verify-overlay animate-fade">
                          <div class="luxury-spinner"></div>
                          <strong class="verifying-text">Verificando Pago...</strong>
                          <span class="countdown-badge">{{ segundosRestantesQR }}s</span>
                          <small class="verifying-hint">Consultando compensación en red bancaria (Libélula / Simple)</small>
                        </div>
                      </div>
                      <span class="qr-fiscal-label">QR FISCAL INTEROPERABLE &bull; ASOBAN</span>
                    </div>

                    <!-- METADATOS Y BOTÓN DE VERIFICACIÓN -->
                    <div class="qr-meta-panel">
                      <div class="qr-amount-card">
                        <span class="qr-amount-title">Total a Pagar por QR:</span>
                        <div class="qr-amount-val"><span class="currency">Bs.</span> {{ totalFinal | number:'1.2-2' }}</div>
                        <div class="qr-timer-pill">
                          <span class="pulse-dot"></span>
                          <span>Vigencia del QR: <strong>09:50 min</strong></span>
                        </div>
                      </div>

                      <div class="qr-instructions-list">
                        <div class="qr-step-item">
                          <span class="step-circle">1</span>
                          <span>Abra la app de su <strong>banca móvil boliviana</strong> (BCP, BNB, Banco Unión, Ganadero, etc.).</span>
                        </div>
                        <div class="qr-step-item">
                          <span class="step-circle">2</span>
                          <span>Escanee el código QR y confirme la transferencia por <strong>Bs. {{ totalFinal | number:'1.2-2' }}</strong>.</span>
                        </div>
                        <div class="qr-step-item">
                          <span class="step-circle">3</span>
                          <span>Presione el botón de abajo para <strong>verificar la acreditación</strong> inmediata.</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        class="btn-verify-qr-now"
                        [disabled]="isVerificandoPago || isSubmitting || cartItems.length === 0"
                        (click)="iniciarVerificacionQR()">
                        <span *ngIf="!isVerificandoPago">Verificar Pago</span>
                        <span *ngIf="isVerificandoPago">
                          <span class="spinner-dot"></span> Verificando pago bancario... ({{ segundosRestantesQR }}s)
                        </span>
                      </button>
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
                      <label>Año (YY o YYYY) *</label>
                      <input type="text" class="atelier-input font-mono" [(ngModel)]="anioExp" placeholder="28" maxlength="4">
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
                  <div class="paypal-checkout-layout">
                    <div class="paypal-header-row">
                      <div class="paypal-brand-title">
                        <span class="material-symbols-outlined paypal-logo-icon">payments</span>
                        <strong>PayPal Express Checkout</strong>
                      </div>
                      <span class="paypal-secure-pill">Pasarela Internacional</span>
                    </div>

                    <p class="paypal-desc">
                      Autorice el cargo en dólares estadounidenses de manera protegida mediante su saldo PayPal o tarjetas internacionales vinculadas.
                    </p>

                    <div class="paypal-conversion-box">
                      <div class="conv-item">
                        <span class="conv-label">Monto en Moneda Local:</span>
                        <span class="conv-val">Bs. {{ totalFinal | number:'1.2-2' }}</span>
                      </div>
                      <div class="conv-divider">&rarr;</div>
                      <div class="conv-item">
                        <span class="conv-label">Total a Autorizar (T/C 6.96):</span>
                        <span class="conv-val font-bold gold-text font-lg">$ {{ (totalFinal / 6.96) | number:'1.2-2' }} USD</span>
                      </div>
                    </div>

                    <div *ngIf="isVerificandoPago && pasarelaSeleccionada === 'PAYPAL_EXPRESS'" class="paypal-processing-overlay animate-fade">
                      <div class="luxury-spinner"></div>
                      <p class="font-semibold">Conectando con pasarela PayPal...</p>
                      <small>Confirmando token de autorización en {{ segundosRestantesQR }}s...</small>
                    </div>

                    <button
                      type="button"
                      *ngIf="!(isVerificandoPago && pasarelaSeleccionada === 'PAYPAL_EXPRESS')"
                      class="btn-paypal-main"
                      [disabled]="isSubmitting || cartItems.length === 0"
                      (click)="iniciarPagoPaypal()">
                      <span>Pagar con PayPal Express ($ {{ (totalFinal / 6.96) | number:'1.2-2' }} USD)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- RESUMEN FINAL Y BOTÓN DE CONFIRMACIÓN -->
            <div class="panel-box checkout-summary-box">
              <div class="summary-line">
                <span>Subtotal Prendas:</span>
                <span><span class="currency">Bs.</span> {{ subtotal | number:'1.2-2' }}</span>
              </div>
              <div *ngIf="descuentoCupon > 0" class="summary-line discount-line">
                <span class="gold-text">Descuento Cupón ({{ cuponAplicado?.codigo }}):</span>
                <span class="gold-text font-bold">- <span class="currency">Bs.</span> {{ descuentoCupon | number:'1.2-2' }}</span>
              </div>
              <div class="summary-line">
                <span>Logística / Envío:</span>
                <span [class.gold-text]="costoCalculadoEnvio === 0">
                  {{ costoCalculadoEnvio === 0 ? 'GRATIS (Bs. 0.00)' : ('Bs. ' + (costoCalculadoEnvio | number:'1.2-2')) }}
                </span>
              </div>
              <div class="summary-line total-line">
                <span>Total a Pagar:</span>
                <span class="grand-total"><span class="currency">Bs.</span> {{ totalFinal | number:'1.2-2' }}</span>
              </div>

              <button
                type="button"
                class="btn-confirm-checkout"
                [disabled]="isSubmitting || isVerificandoPago || cartItems.length === 0"
                (click)="accionConfirmar()">
                <span *ngIf="!isSubmitting && !isVerificandoPago">
                  <ng-container [ngSwitch]="pasarelaSeleccionada">
                    <span *ngSwitchCase="'LIBELULA_BOLIVIA'">VERIFICAR PAGO QR &bull; <span class="currency">Bs.</span> {{ totalFinal | number:'1.2-2' }}</span>
                    <span *ngSwitchCase="'PAYPAL_EXPRESS'">PAGAR CON PAYPAL &bull; $ {{ (totalFinal / 6.96) | number:'1.2-2' }} USD</span>
                    <span *ngSwitchDefault>CONFIRMAR CON STRIPE &bull; <span class="currency">Bs.</span> {{ totalFinal | number:'1.2-2' }}</span>
                  </ng-container>
                </span>
                <span *ngIf="isVerificandoPago">
                  <span class="spinner-dot"></span> Verificando Pago Bancario... ({{ segundosRestantesQR }}s)
                </span>
                <span *ngIf="isSubmitting && !isVerificandoPago">
                  <span class="spinner-dot"></span> Registrando Pedido y Comprobante...
                </span>
              </button>

              <div class="security-badges">
                <span>Protocolo Seguro SSL/TLS</span>
                <span>Garantía de Calce (RN07)</span>
                <span>Trazabilidad de Despacho</span>
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
              <h3 *ngIf="authService.isStaff()">Control Logístico de Envíos &amp; Pedidos Online</h3>
              <h3 *ngIf="!authService.isStaff()">Mis Pedidos &amp; Seguimiento de Envíos</h3>
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

              <div class="filter-item" *ngIf="authService.isStaff()">
                <label>Sucursal:</label>
                <select class="atelier-select compact" [(ngModel)]="filtroSucursal" (change)="aplicarFiltrosPedidos()">
                  <option [ngValue]="null">Todas las Sucursales</option>
                  <option *ngFor="let s of sucursales" [ngValue]="s.id">{{ s.nombre }}</option>
                </select>
              </div>

              <button type="button" class="btn-refresh" (click)="cargarPedidosTab()" [disabled]="isLoadingPedidos">
                Actualizar
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
                        {{ v.envio.codigo_seguimiento }}
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
                    <span class="currency">Bs.</span> {{ v.total | number:'1.2-2' }}
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
                        Ver Detalle
                      </button>
                      <button
                        type="button"
                        class="btn-row-action highlight"
                        *ngIf="authService.isStaff() && v.envio && v.envio.estado_envio !== 'ENTREGADO' && v.envio.estado_envio !== 'CANCELADO'"
                        (click)="abrirModalActualizarEstado(v)">
                        Avanzar Estado
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
      padding: 2rem 2.5rem;
      max-width: 1400px;
      margin: 0 auto;
      color: #111827;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
      font-size: 0.72rem;
      letter-spacing: 2px;
      color: #4b5563;
      margin-bottom: 0.4rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .header-titles h1 {
      font-family: 'Inter', sans-serif;
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin: 0 0 0.5rem 0;
      color: #000000;
    }
    .header-titles .description {
      color: #4b5563;
      font-size: 0.95rem;
      max-width: 800px;
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
      display: flex;
      align-items: center;
      gap: 8px;
      background: transparent;
      border: none;
      color: #4b5563;
      padding: 8px 18px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
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
    .tab-badge {
      background: rgba(255, 255, 255, 0.25);
      color: inherit;
      font-size: 0.7rem;
      padding: 1px 6px;
      border-radius: 10px;
      font-weight: 700;
    }
    .tab-btn:not(.active) .tab-badge {
      background: #e5e7eb;
      color: #374151;
    }

    /* TOASTS */
    .toast-banner {
      display: flex;
      align-items: center;
      padding: 1rem 1.25rem;
      border-radius: 4px;
      margin-bottom: 1.5rem;
      gap: 1rem;
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
    .toast-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 0.875rem;
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
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 4px;
      padding: 1.75rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      padding-bottom: 0.75rem;
    }
    .panel-header h3 {
      margin: 0;
      font-size: 1.15rem;
      color: #000000;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .item-count-text {
      font-size: 0.85rem;
      color: #4b5563;
      font-weight: 600;
    }

    .checkout-grid {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      gap: 1.75rem;
      align-items: start;
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
      opacity: 0.4;
    }
    .empty-cart-state h4 {
      margin: 0 0 0.5rem 0;
      color: #000000;
      font-size: 1.2rem;
      font-weight: 700;
    }
    .empty-cart-state p {
      color: #6b7280;
      font-size: 0.9rem;
      margin-bottom: 1.5rem;
    }
    .quick-add-zone {
      margin-top: 2rem;
      background: #f9fafb;
      border: 1px dashed rgba(0, 0, 0, 0.15);
      border-radius: 4px;
      padding: 1.25rem;
      text-align: left;
    }
    .quick-add-title {
      display: block;
      font-size: 0.75rem;
      letter-spacing: 1.5px;
      color: #4b5563;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 0.75rem;
    }
    .quick-items-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.75rem;
    }
    .quick-item-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      padding: 0.85rem;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.2s ease;
    }
    .quick-item-card:hover {
      border-color: #000000;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    .quick-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .quick-info strong {
      font-size: 0.85rem;
      color: #000000;
      font-weight: 600;
    }
    .quick-price {
      font-size: 0.8rem;
      color: #111827;
      font-weight: 700;
    }
    .btn-quick-add {
      background: #000000;
      border: 1px solid #000000;
      color: #ffffff;
      padding: 5px 12px;
      font-size: 0.75rem;
      border-radius: 2px;
      cursor: pointer;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: all 0.15s ease;
    }
    .btn-quick-add:hover {
      background: #262626;
      border-color: #262626;
    }

    /* CART TABLE */
    .atelier-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }
    .atelier-table th {
      text-align: left;
      padding: 0.75rem 0.65rem;
      color: #4b5563;
      font-size: 0.72rem;
      letter-spacing: 1px;
      text-transform: uppercase;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      background: #f9fafb;
      font-weight: 700;
    }
    .atelier-table td {
      padding: 0.85rem 0.65rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      vertical-align: middle;
      color: #111827;
    }
    .item-title-cell {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .item-name {
      font-weight: 600;
      color: #000000;
    }
    .item-sku {
      font-size: 0.72rem;
      color: #6b7280;
    }
    .badge-tag {
      background: #f3f4f6;
      border: 1px solid rgba(0, 0, 0, 0.08);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.72rem;
      color: #374151;
      margin-right: 4px;
    }
    .quantity-control {
      display: inline-flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 2px;
    }
    .btn-qty {
      background: transparent;
      border: none;
      color: #111827;
      width: 26px;
      height: 26px;
      cursor: pointer;
      font-weight: bold;
      transition: background 0.15s;
    }
    .btn-qty:hover {
      background: #f3f4f6;
    }
    .qty-number {
      padding: 0 8px;
      font-size: 0.85rem;
      font-weight: 600;
      color: #000000;
    }
    .btn-delete-item {
      background: transparent;
      border: none;
      color: #9ca3af;
      font-size: 1.25rem;
      cursor: pointer;
      transition: color 0.15s ease;
    }
    .btn-delete-item:hover {
      color: #ef4444;
    }
    .cart-table-footer {
      padding-top: 1rem;
      text-align: right;
    }

    /* INCENTIVE BANNER */
    .shipping-incentive-box {
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.08);
      padding: 1rem 1.25rem;
      font-size: 0.88rem;
      border-radius: 4px;
      color: #374151;
    }
    .incentive-badge {
      display: inline-block;
      font-size: 0.68rem;
      letter-spacing: 1px;
      background: #000000;
      color: #ffffff;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 2px;
      margin-bottom: 0.35rem;
      text-transform: uppercase;
    }

    /* FORM STYLES */
    .form-section {
      margin-bottom: 1.5rem;
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
      background: #000000;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.78rem;
    }
    .section-title h3 {
      margin: 0;
      font-size: 1.05rem;
      color: #000000;
      font-weight: 700;
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
      color: #4b5563;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.35rem;
      font-weight: 600;
    }
    .atelier-input, .atelier-select, .atelier-textarea {
      width: 100%;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 4px;
      color: #111827;
      padding: 0.65rem 0.85rem;
      font-size: 0.88rem;
      box-sizing: border-box;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .atelier-input:focus, .atelier-select:focus, .atelier-textarea:focus {
      outline: none;
      border-color: #000000;
      box-shadow: 0 0 0 1px #000000;
    }

    /* DELIVERY OPTIONS */
    .delivery-options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .delivery-card {
      background: #fbfbfb;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      padding: 1.15rem;
      cursor: pointer;
      display: flex;
      gap: 10px;
      transition: all 0.2s ease;
    }
    .delivery-card:hover {
      border-color: #000000;
      background: #ffffff;
    }
    .delivery-card.selected {
      border: 2px solid #000000;
      background: #ffffff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    .card-radio-indicator {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid #d1d5db;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 2px;
      flex-shrink: 0;
    }
    .delivery-card.selected .card-radio-indicator {
      border-color: #000000;
    }
    .radio-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #000000;
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
      font-weight: 700;
      color: #000000;
    }
    .delivery-desc {
      font-size: 0.78rem;
      color: #6b7280;
      margin: 0 0 0.5rem 0;
      line-height: 1.35;
    }
    .delivery-cost {
      font-size: 0.85rem;
      font-weight: 700;
      color: #000000;
    }
    .delivery-cost.free {
      color: #166534;
    }
    .delivery-subform {
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 4px;
      padding: 1.25rem;
      margin-top: 1rem;
    }
    .collect-notice {
      margin-top: 0.5rem;
      font-size: 0.8rem;
      color: #4b5563;
    }

    /* PAYMENT TABS */
    .payment-tabs {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      margin-bottom: 1rem;
    }
    .pay-tab-btn {
      background: #f3f4f6;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 4px;
      padding: 8px 10px;
      color: #4b5563;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
    }
    .pay-tab-btn:hover {
      color: #000000;
      border-color: rgba(0, 0, 0, 0.2);
    }
    .pay-tab-btn.active {
      border-color: #000000;
      background: #000000;
      color: #ffffff;
      font-weight: 700;
    }
    .payment-method-body {
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 4px;
      padding: 1.25rem;
    }
    /* QR CHECKOUT INTERACTIVO */
    .qr-checkout-layout {
      display: grid;
      grid-template-columns: 210px 1fr;
      gap: 1.25rem;
      align-items: start;
    }
    @media (max-width: 640px) {
      .qr-checkout-layout {
        grid-template-columns: 1fr;
      }
    }
    .qr-frame-wrapper {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 10px;
      border-radius: 4px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
    }
    .qr-code-box {
      position: relative;
      width: 100%;
      aspect-ratio: 1 / 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      border-radius: 2px;
      overflow: hidden;
    }
    .qr-main-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .qr-verify-overlay {
      position: absolute;
      inset: 0;
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(3px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 12px;
      text-align: center;
      gap: 6px;
      z-index: 10;
    }
    .luxury-spinner {
      width: 34px;
      height: 34px;
      border: 3px solid rgba(0, 0, 0, 0.1);
      border-top: 3px solid #000000;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .verifying-text {
      font-size: 0.85rem;
      color: #000000;
    }
    .countdown-badge {
      background: #000000;
      color: #ffffff;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .verifying-hint {
      font-size: 0.7rem;
      color: #6b7280;
      line-height: 1.2;
    }
    .qr-fiscal-label {
      display: block;
      font-size: 0.65rem;
      font-weight: 700;
      color: #10b981;
      letter-spacing: 0.5px;
      margin-top: 8px;
      text-transform: uppercase;
    }
    .qr-meta-panel {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .qr-amount-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      padding: 10px 14px;
      border-radius: 4px;
    }
    .qr-amount-title {
      display: block;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6b7280;
    }
    .qr-amount-val {
      font-size: 1.35rem;
      font-weight: 800;
      color: #000000;
      margin: 2px 0;
    }
    .qr-timer-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: #b45309;
      font-weight: 500;
    }
    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      animation: pulse-dot-anim 1.5s infinite;
    }
    @keyframes pulse-dot-anim {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    .qr-instructions-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.8rem;
      color: #374151;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      padding: 10px 12px;
      border-radius: 4px;
    }
    .qr-step-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      line-height: 1.35;
    }
    .step-circle {
      background: #000000;
      color: #ffffff;
      width: 17px;
      height: 17px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.65rem;
      font-weight: 700;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .btn-verify-qr-now {
      background: #000000;
      color: #ffffff;
      border: 1px solid #000000;
      padding: 11px 16px;
      font-weight: 700;
      font-size: 0.85rem;
      letter-spacing: 0.8px;
      border-radius: 3px;
      cursor: pointer;
      text-transform: uppercase;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .btn-verify-qr-now:hover:not(:disabled) {
      background: #27272a;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
    }
    .btn-verify-qr-now:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    /* PAYPAL EXPRESS CARD */
    .paypal-checkout-layout {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 4px;
      padding: 1.25rem;
    }
    .paypal-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .paypal-brand-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.95rem;
      color: #003087;
    }
    .paypal-secure-pill {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      font-size: 0.7rem;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 600;
    }
    .paypal-desc {
      font-size: 0.8rem;
      color: #6b7280;
      margin: 0 0 1rem 0;
      line-height: 1.4;
    }
    .paypal-conversion-box {
      display: flex;
      align-items: center;
      justify-content: space-around;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 10px 14px;
      border-radius: 4px;
      margin-bottom: 1.15rem;
    }
    .conv-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .conv-label {
      font-size: 0.7rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .conv-val {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
    }
    .conv-divider {
      font-size: 1.1rem;
      color: #94a3b8;
    }
    .paypal-processing-overlay {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      padding: 1.25rem;
      border-radius: 4px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .paypal-processing-overlay p {
      margin: 0;
      color: #003087;
    }
    .paypal-processing-overlay small {
      color: #64748b;
    }
    .btn-paypal-main {
      width: 100%;
      background: #ffc439;
      color: #111827;
      border: 1px solid #f2ba36;
      border-radius: 4px;
      padding: 12px 18px;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background 0.15s ease;
      box-shadow: 0 2px 6px rgba(255, 196, 57, 0.35);
    }
    .btn-paypal-main:hover:not(:disabled) {
      background: #f4b628;
    }
    .btn-paypal-main:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* FINAL SUMMARY & BUTTON */
    .checkout-summary-box {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
    }
    .summary-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.65rem;
      font-size: 0.9rem;
      color: #4b5563;
    }
    .total-line {
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      padding-top: 0.85rem;
      margin-top: 0.85rem;
      color: #000000;
      font-size: 1.05rem;
      font-weight: bold;
    }
    .grand-total {
      color: #000000;
      font-size: 1.4rem;
      font-weight: 800;
    }
    .btn-confirm-checkout {
      width: 100%;
      background: #000000;
      color: #ffffff;
      border: none;
      padding: 1.1rem;
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 1px;
      border-radius: 2px;
      cursor: pointer;
      margin-top: 1.25rem;
      transition: all 0.2s ease;
      text-transform: uppercase;
    }
    .btn-confirm-checkout:hover:not(:disabled) {
      background: #262626;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .btn-confirm-checkout:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .security-badges {
      display: flex;
      justify-content: space-between;
      font-size: 0.72rem;
      color: #6b7280;
      margin-top: 1.25rem;
      text-align: center;
      border-top: 1px solid rgba(0, 0, 0, 0.06);
      padding-top: 0.85rem;
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
      color: #000000;
      margin-bottom: 0.5rem;
    }
    .stripe-success-tag {
      display: inline-block;
      background: #000000;
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 1.5px;
      padding: 4px 14px;
      border-radius: 20px;
      margin-bottom: 0.75rem;
    }
    .success-crest h2 {
      font-family: 'Inter', sans-serif;
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0 0 0.5rem 0;
      color: #000000;
    }
    .order-subtitle {
      color: #6b7280;
      margin: 0;
    }
    .order-summary-box {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 4px;
      padding: 2rem;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.04);
    }
    .summary-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .summary-label {
      display: block;
      font-size: 0.72rem;
      letter-spacing: 1px;
      color: #6b7280;
      text-transform: uppercase;
      font-weight: 600;
    }
    .summary-value {
      font-size: 1.15rem;
      font-weight: 700;
      color: #000000;
    }
    .highlight-badge {
      background: #f3f4f6;
      border: 1px solid rgba(0, 0, 0, 0.1);
      color: #000000;
      padding: 4px 10px;
      border-radius: 3px;
      font-size: 0.95rem;
      font-weight: 700;
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
      color: #6b7280;
      margin-bottom: 0.25rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .detail-group .val {
      display: block;
      color: #000000;
      font-size: 0.9rem;
      font-weight: 500;
    }
    .confirmed-items-list {
      margin-top: 1.5rem;
      border-top: 1px solid rgba(0, 0, 0, 0.06);
      padding-top: 1.5rem;
    }
    .confirmed-items-list h4 {
      margin: 0 0 1rem 0;
      color: #000000;
      font-size: 0.95rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
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
      color: #4b5563;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .btn-refresh {
      background: #f3f4f6;
      border: 1px solid rgba(0, 0, 0, 0.1);
      color: #111827;
      padding: 0.55rem 0.85rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.15s;
    }
    .btn-refresh:hover {
      background: #e5e7eb;
      color: #000000;
    }
    .tracking-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .code-venta {
      color: #000000;
      font-weight: 700;
    }
    .tracking-num {
      font-size: 0.78rem;
      color: #6b7280;
    }
    .status-pill {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .status-pill.PREPARANDO {
      background: #fef3c7;
      border: 1px solid #fcd34d;
      color: #92400e;
    }
    .status-pill.EN_CAMINO {
      background: #e0f2fe;
      border: 1px solid #bae6fd;
      color: #0369a1;
    }
    .status-pill.LISTO_RECOJO {
      background: #f3e8ff;
      border: 1px solid #e9d5ff;
      color: #6b21a8;
    }
    .status-pill.ENTREGADO {
      background: #dcfce7;
      border: 1px solid #bbf7d0;
      color: #15803d;
    }
    .status-pill.CANCELADO {
      background: #fee2e2;
      border: 1px solid #fecaca;
      color: #b91c1c;
    }
    .type-tag {
      background: #f3f4f6;
      border: 1px solid rgba(0, 0, 0, 0.08);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.72rem;
      color: #374151;
      display: inline-block;
      margin-bottom: 2px;
      font-weight: 600;
    }
    .type-tag.collect {
      border-color: rgba(0, 0, 0, 0.2);
      color: #000000;
    }
    .row-actions {
      display: flex;
      gap: 6px;
      justify-content: center;
    }
    .btn-row-action {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      color: #374151;
      padding: 4px 8px;
      font-size: 0.75rem;
      border-radius: 3px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.15s;
    }
    .btn-row-action:hover {
      background: #f3f4f6;
      color: #000000;
      border-color: #000000;
    }
    .btn-row-action.highlight {
      border-color: #000000;
      color: #000000;
      background: #ffffff;
    }
    .btn-row-action.highlight:hover {
      background: #000000;
      color: #ffffff;
    }

    /* MODAL */
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
      z-index: 1200;
      padding: 1rem;
    }
    .modal-dialog {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      width: 100%;
      max-width: 520px;
      padding: 1.75rem;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
      color: #111827;
    }
    .modal-dialog.large {
      max-width: 750px;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      padding-bottom: 0.75rem;
    }
    .modal-header h3 {
      margin: 0;
      font-size: 1.15rem;
      color: #000000;
      font-weight: 700;
    }
    .btn-close-modal {
      background: transparent;
      border: none;
      color: #9ca3af;
      font-size: 1.5rem;
      cursor: pointer;
    }
    .btn-close-modal:hover {
      color: #000000;
    }
    .modal-info-banner {
      background: #f9fafb;
      border-left: 3px solid #000000;
      padding: 0.75rem 1rem;
      margin-bottom: 1.25rem;
      font-size: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 4px;
      color: #374151;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
    }
    .detail-overview-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      background: #f9fafb;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1.25rem;
      font-size: 0.85rem;
      border: 1px solid rgba(0, 0, 0, 0.06);
    }
    .modal-subtitle {
      margin: 1rem 0 0.5rem 0;
      font-size: 0.95rem;
      color: #000000;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .modal-financial-summary {
      margin-top: 1.25rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      text-align: right;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.9rem;
      color: #374151;
    }

    /* BUTTONS */
    .btn-atelier-gold {
      background: #000000;
      color: #ffffff;
      border: none;
      padding: 0.65rem 1.25rem;
      font-size: 0.85rem;
      font-weight: 700;
      border-radius: 2px;
      cursor: pointer;
      transition: all 0.2s ease;
      letter-spacing: 0.5px;
    }
    .btn-atelier-gold:hover:not(:disabled) {
      background: #262626;
    }
    .btn-atelier-gold:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-atelier-outline {
      background: transparent;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #374151;
      padding: 0.65rem 1.25rem;
      font-size: 0.85rem;
      font-weight: 600;
      border-radius: 2px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-atelier-outline:hover {
      background: #f3f4f6;
      border-color: #000000;
      color: #000000;
    }
    .btn-atelier-text {
      background: transparent;
      border: none;
      color: #6b7280;
      font-size: 0.85rem;
      cursor: pointer;
      text-decoration: underline;
    }
    .btn-atelier-text:hover {
      color: #000000;
    }
    .text-danger {
      color: #dc2626 !important;
    }

    /* UTILITIES */
    .gold-text {
      color: #000000 !important;
      font-weight: 700;
    }
    .text-muted { color: #6b7280; }
    .font-mono { font-family: monospace; }
    .font-bold { font-weight: 700; }
    .font-lg { font-size: 1.15rem; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .currency { font-family: sans-serif; font-weight: 600; }
    .animate-fade {
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ESTILOS CUPÓN CU16 */
    .coupon-box {
      border: 1px dashed rgba(0, 0, 0, 0.15) !important;
      background: #f9fafb !important;
    }
    .coupon-input-group {
      display: flex;
      gap: 10px;
      margin-top: 10px;
    }
    .btn-apply-coupon {
      padding: 0 18px;
      background: #000000;
      color: #ffffff;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      border: none;
      border-radius: 2px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .btn-apply-coupon:hover:not(:disabled) {
      background: #262626;
    }
    .btn-apply-coupon:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .coupon-feedback {
      margin-top: 10px;
      font-size: 12px;
      padding: 8px 12px;
      border-radius: 4px;
    }
    .coupon-feedback.success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    }
    .coupon-feedback.error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }
    .coupon-badge-applied {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 10px 14px;
      border-radius: 4px;
      margin-top: 10px;
    }
    .coupon-tag {
      font-family: monospace;
      font-weight: 700;
      color: #166534;
      margin-right: 8px;
    }
    .coupon-benefit {
      font-size: 12px;
      color: #15803d;
      font-weight: 600;
    }
    .btn-remove-coupon {
      background: transparent;
      border: none;
      color: #6b7280;
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
      padding: 0 4px;
    }
    .btn-remove-coupon:hover {
      color: #dc2626;
    }
    .discount-line {
      color: #166534 !important;
    }

    /* =========================================================
       RESPONSIVIDAD MÓVIL Y TABLET (CHECKOUT E-COMMERCE)
       ========================================================= */
    @media (max-width: 992px) {
      .atelier-checkout-container {
        padding: 1.5rem 1rem;
      }
      .header-titles h1 {
        font-size: 1.9rem;
      }
      .checkout-grid {
        grid-template-columns: 1fr;
        gap: 1.25rem;
      }
    }

    @media (max-width: 768px) {
      .atelier-checkout-container {
        padding: 1rem 0.5rem;
      }
      .checkout-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
        margin-bottom: 1.25rem;
      }
      .header-titles h1 {
        font-size: 1.65rem;
      }
      .header-titles .description {
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
      .panel-box {
        padding: 1rem 0.85rem;
      }
      .cart-item-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }
      .cart-item-thumb {
        width: 70px;
        height: 90px;
      }
      .cart-item-actions {
        width: 100%;
        justify-content: space-between;
      }
      .payment-gateways-grid {
        grid-template-columns: 1fr !important;
      }
      .form-row-2 {
        grid-template-columns: 1fr !important;
      }
    }
  `]
})
export class CheckoutEcommercePageComponent implements OnInit {
  readonly cartService = inject(CartService);
  private readonly ventasService = inject(VentasService);
  private readonly inventarioService = inject(InventarioService);
  private readonly catalogoService = inject(CatalogoService);
  readonly authService = inject(AuthService);
  private readonly notifService = inject(NotificacionesService);

  activeTab: 'checkout' | 'pedidos' = 'checkout';
  cartItems: CartItem[] = [];
  subtotal = 0;
  costoCalculadoEnvio = 5.00;
  totalFinal = 0;

  // Cupones CU16
  codigoCuponInput = '';
  validandoCupon = false;
  cuponAplicado: ValidarCuponResponse | null = null;
  descuentoCupon = 0;
  mensajeCupon: string | null = null;

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

  // Pasarelas y Verificación Interactiva
  pasarelaSeleccionada: 'LIBELULA_BOLIVIA' | 'STRIPE_INTL' | 'PAYPAL_EXPRESS' = 'LIBELULA_BOLIVIA';
  ultimoMetodoPagoUtilizado: 'LIBELULA_BOLIVIA' | 'STRIPE_INTL' | 'PAYPAL_EXPRESS' = 'LIBELULA_BOLIVIA';
  isVerificandoPago = false;
  segundosRestantesQR = 3;
  svgFallbackQr = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23ffffff'/><rect x='10' y='10' width='25' height='25' fill='%23000000'/><rect x='14' y='14' width='17' height='17' fill='%23ffffff'/><rect x='18' y='18' width='9' height='9' fill='%23000000'/><rect x='65' y='10' width='25' height='25' fill='%23000000'/><rect x='69' y='14' width='17' height='17' fill='%23ffffff'/><rect x='73' y='18' width='9' height='9' fill='%23000000'/><rect x='10' y='65' width='25' height='25' fill='%23000000'/><rect x='14' y='69' width='17' height='17' fill='%23ffffff'/><rect x='18' y='73' width='9' height='9' fill='%23000000'/><rect x='42' y='12' width='6' height='15' fill='%23000000'/><rect x='52' y='20' width='6' height='12' fill='%23000000'/><rect x='42' y='32' width='16' height='6' fill='%23000000'/><rect x='12' y='42' width='20' height='6' fill='%23000000'/><rect x='25' y='52' width='12' height='6' fill='%23000000'/><rect x='42' y='45' width='15' height='15' fill='%23000000'/><rect x='65' y='45' width='20' height='8' fill='%23000000'/><rect x='65' y='60' width='10' height='15' fill='%23000000'/><rect x='80' y='60' width='10' height='25' fill='%23000000'/><rect x='42' y='68' width='15' height='17' fill='%23000000'/><text x='50' y='96' font-size='5.5' text-anchor='middle' font-weight='bold' fill='%23111827'>QR SIMPLE BOLIVIA</text></svg>";

  numeroTarjeta = '4242 4242 4242 4242';
  mesExp = '12';
  anioExp = '28';
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
        if (sucursales.length > 0) {
          const ciudades = this.getCiudadesDisponibles();
          if (ciudades.length > 0) {
            this.ciudad = ciudades[0];
            this.departamento = ciudades[0];
          }
          const sucsEnCiudad = this.getSucursalesPorCiudad();
          if (sucsEnCiudad.length > 0) {
            this.sucursalDespachoId = sucsEnCiudad[0].id;
          } else {
            this.sucursalDespachoId = sucursales[0].id;
          }
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
    let envioBase = 0.0;
    if (this.tipoEntrega === 'CLICK_AND_COLLECT') {
      envioBase = 0.0;
    } else {
      // Envío gratis si subtotal >= 150
      envioBase = this.subtotal >= 150 ? 0.0 : 5.0;
    }

    if (this.cuponAplicado && this.cuponAplicado.valido) {
      if (this.cuponAplicado.tipo_descuento === 'ENVIO_GRATIS') {
        this.costoCalculadoEnvio = 0.0;
        this.descuentoCupon = envioBase;
      } else {
        this.costoCalculadoEnvio = envioBase;
        this.descuentoCupon = this.cuponAplicado.descuento_calculado;
      }
    } else {
      this.costoCalculadoEnvio = envioBase;
      this.descuentoCupon = 0.0;
    }

    this.totalFinal = Math.max(0, this.subtotal - this.descuentoCupon + this.costoCalculadoEnvio);
  }

  aplicarCupon(): void {
    const code = this.codigoCuponInput.trim().toUpperCase();
    if (!code) return;

    this.validandoCupon = true;
    this.mensajeCupon = null;

    this.ventasService.validarCupon({
      codigo: code,
      subtotal: this.subtotal,
      costo_envio: this.tipoEntrega === 'CLICK_AND_COLLECT' ? 0.0 : 5.0,
      sucursal_id: Number(this.sucursalDespachoId)
    }).subscribe({
      next: (res) => {
        this.validandoCupon = false;
        this.cuponAplicado = res;
        if (res.valido) {
          this.mensajeCupon = res.mensaje;
          this.calcularTotales();
        } else {
          this.mensajeCupon = res.mensaje;
          this.descuentoCupon = 0;
          this.calcularTotales();
        }
      },
      error: (err) => {
        this.validandoCupon = false;
        this.mensajeCupon = err.error?.detail || 'Error al validar el cupón con el servidor.';
        this.cuponAplicado = null;
        this.descuentoCupon = 0;
        this.calcularTotales();
      }
    });
  }

  quitarCupon(): void {
    this.cuponAplicado = null;
    this.descuentoCupon = 0;
    this.codigoCuponInput = '';
    this.mensajeCupon = null;
    this.calcularTotales();
  }

  seleccionarTipoEntrega(tipo: 'DOMICILIO' | 'CLICK_AND_COLLECT'): void {
    this.tipoEntrega = tipo;
    this.calcularTotales();
  }

  getCiudadesDisponibles(): string[] {
    const ciudadesSet = new Set<string>();
    for (const s of this.sucursales) {
      if (s.activo) {
        const nom = s.ciudad?.nombre || 'Santa Cruz';
        ciudadesSet.add(nom);
      }
    }
    const arr = Array.from(ciudadesSet);
    return arr.length > 0 ? arr : ['Santa Cruz', 'La Paz', 'Cochabamba'];
  }

  getSucursalesPorCiudad(): Sucursal[] {
    if (!this.ciudad) return this.sucursales.filter(s => s.activo);
    const filtered = this.sucursales.filter(s => s.activo && (s.ciudad?.nombre?.toLowerCase() === this.ciudad.toLowerCase()));
    return filtered.length > 0 ? filtered : this.sucursales.filter(s => s.activo);
  }

  onCiudadChange(): void {
    const sucursalesEnCiudad = this.getSucursalesPorCiudad();
    if (sucursalesEnCiudad.length > 0) {
      this.sucursalDespachoId = sucursalesEnCiudad[0].id;
    }
    this.departamento = this.ciudad;
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

  getQrImageUrl(): string {
    const dataText = encodeURIComponent(`SIMPLE_BOLIVIA_BOB_${this.totalFinal.toFixed(2)}_CU12_ATELIER_NOIR`);
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${dataText}`;
  }

  iniciarVerificacionQR(): void {
    if (this.cartItems.length === 0) {
      this.mensajeError = 'Su bolsa de compras está vacía.';
      return;
    }
    if (!this.clienteNombre || !this.clienteEmail) {
      this.mensajeError = 'Por favor complete su nombre y correo electrónico en el Paso 1.';
      return;
    }
    if (this.tipoEntrega === 'DOMICILIO' && !this.direccionLinea1) {
      this.mensajeError = 'Debe indicar la dirección de entrega en el Paso 2.';
      return;
    }

    this.mensajeError = null;
    this.isVerificandoPago = true;
    this.segundosRestantesQR = 3;

    const timer = setInterval(() => {
      this.segundosRestantesQR--;
      if (this.segundosRestantesQR <= 0) {
        clearInterval(timer);
        this.isVerificandoPago = false;
        this.procesarCheckout();
      }
    }, 1000);
  }

  iniciarPagoPaypal(): void {
    if (this.cartItems.length === 0) {
      this.mensajeError = 'Su bolsa de compras está vacía.';
      return;
    }
    if (!this.clienteNombre || !this.clienteEmail) {
      this.mensajeError = 'Por favor complete su nombre y correo electrónico en el Paso 1.';
      return;
    }
    if (this.tipoEntrega === 'DOMICILIO' && !this.direccionLinea1) {
      this.mensajeError = 'Debe indicar la dirección de entrega en el Paso 2.';
      return;
    }

    this.mensajeError = null;
    this.isVerificandoPago = true;
    this.segundosRestantesQR = 2;

    const timer = setInterval(() => {
      this.segundosRestantesQR--;
      if (this.segundosRestantesQR <= 0) {
        clearInterval(timer);
        this.isVerificandoPago = false;
        this.procesarCheckout();
      }
    }, 1000);
  }

  accionConfirmar(): void {
    if (this.pasarelaSeleccionada === 'LIBELULA_BOLIVIA') {
      this.iniciarVerificacionQR();
    } else if (this.pasarelaSeleccionada === 'PAYPAL_EXPRESS') {
      this.iniciarPagoPaypal();
    } else {
      this.procesarCheckout();
    }
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
      codigo_cupon: this.cuponAplicado?.valido ? this.cuponAplicado.codigo : undefined,
      descuento: this.descuentoCupon,
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
        moneda: 'BOB',
        cliente_email: this.clienteEmail,
        datos_tarjeta: this.pasarelaSeleccionada === 'STRIPE_INTL' ? {
          numero: (this.numeroTarjeta || '').replace(/\s+/g, ''),
          mes_exp: (this.mesExp || '').trim().padStart(2, '0'),
          anio_exp: (this.anioExp || '').trim().length === 4 ? (this.anioExp || '').trim().slice(2) : (this.anioExp || '').trim(),
          cvc: (this.cvc || '').trim(),
          titular: (this.titularTarjeta || '').trim()
        } : undefined,
        concepto: `Compra Online E-Commerce Atelier Noir - Total Bs. ${this.totalFinal.toFixed(2)}`
      }
    };

    this.ventasService.procesarCheckoutOnline(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.pedidoConfirmado = res;
        this.ultimoMetodoPagoUtilizado = this.pasarelaSeleccionada;
        this.cartService.clear();

        let pasarelaNombre = 'Stripe';
        if (this.pasarelaSeleccionada === 'LIBELULA_BOLIVIA') pasarelaNombre = 'QR Simple Libélula';
        if (this.pasarelaSeleccionada === 'PAYPAL_EXPRESS') pasarelaNombre = 'PayPal Express';

        this.mensajeExito = `¡Tu compra ha sido exitosa! Pedido #${res.codigo_venta} confirmado con ${pasarelaNombre}. Tracking logístico: ${res.envio?.codigo_seguimiento || 'Generado'}.`;

        // Disparar Notificación Push solicitada (CU15 / CU21)
        this.notifService.mostrarPushToast({
          titulo: 'Compra Realizada con éxito',
          mensaje: `Tu pedido #${res.codigo_venta} por Bs. ${res.total} fue procesado correctamente.`,
          accionLabel: 'Ver bolsa o carrito de compras',
          urlDestino: '/ventas/checkout',
          onAccion: () => {
            this.activeTab = 'checkout';
          },
          tipo: 'ESTADO_PEDIDO'
        });
        this.notifService.cargarResumen();
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
    if (!this.authService.isStaff()) {
      const user = this.authService.currentUser();
      if (user?.email) {
        filtrados = filtrados.filter(p =>
          (p.cliente?.email && p.cliente.email.toLowerCase() === user.email.toLowerCase()) ||
          (p.cliente_nombre && p.cliente_nombre.toLowerCase() === user.nombre.toLowerCase())
        );
      }
    }
    if (this.filtroEstado !== 'TODOS') {
      filtrados = filtrados.filter(p => p.envio?.estado_envio === this.filtroEstado);
    }
    if (this.filtroSucursal && this.authService.isStaff()) {
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
