import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificacionesService, PushToastData } from '../services/notificaciones.service';

@Component({
  selector: 'app-promo-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- 1. TOAST DE NOTIFICACIÓN PUSH TRANSACCIONAL (COMPRA, RESERVA, ALERTAS) -->
    @if (notifService.activePushToast(); as push) {
      <div class="promo-toast-overlay" (click)="ejecutarAccionPush(push)">
        <div class="promo-toast-card push-card" (click)="$event.stopPropagation()">
          <!-- Barra superior de auto-cierre -->
          <div class="toast-progress-bar push-bar"></div>

          <!-- Botón Cerrar Rápido -->
          <button
            type="button"
            class="btn-toast-close"
            (click)="notifService.cerrarPushToast()"
            title="Cerrar notificación"
            aria-label="Cerrar notificación"
          >
            &times;
          </button>

          <!-- Cabecera de Tipo -->
          <div class="toast-header-row">
            <span class="toast-tag-badge push-badge">
              <span class="material-symbols-outlined tag-sparkle">{{ getPushIcon(push) }}</span>
              {{ getPushBadgeText(push) }}
            </span>
            <span class="toast-live-pill">&bull; EN VIVO</span>
          </div>

          <!-- Título y Mensaje -->
          <h4 class="toast-title">{{ push.titulo }}</h4>
          <p class="toast-desc">{{ push.mensaje }}</p>

          <!-- Botón de Acción Directo Debajo del Mensaje -->
          <div class="toast-actions-row">
            <button
              type="button"
              class="btn-toast-cta push-cta"
              (click)="ejecutarAccionPush(push)"
            >
              <span>{{ push.accionLabel || 'Ver detalles' }}</span>
              <span class="cta-arrow">&rarr;</span>
            </button>
          </div>
        </div>
      </div>
    }

    <!-- 2. TOAST DE PROMOCIÓN / CUPÓN EN VIVO (CREADO POR ADMIN) -->
    @if (!notifService.activePushToast()) {
      @if (notifService.activePromoToast(); as promo) {
        <div class="promo-toast-overlay" (click)="onToastClick(promo)">
          <div class="promo-toast-card" (click)="$event.stopPropagation()">
          <!-- Barra superior de tiempo de auto-cierre -->
          <div class="toast-progress-bar"></div>

          <!-- Botón Cerrar Rápido -->
          <button
            type="button"
            class="btn-toast-close"
            (click)="notifService.cerrarPromoToast()"
            title="Cerrar aviso"
            aria-label="Cerrar notificación de promoción"
          >
            &times;
          </button>

          <!-- Cabecera de la Oferta -->
          <div class="toast-header-row">
            <span class="toast-tag-badge">
              <span class="material-symbols-outlined tag-sparkle">local_offer</span> OFERTA EXCLUSIVA
            </span>
            @if (getDescuento(promo)) {
              <span class="toast-discount-pill">{{ getDescuento(promo) }}</span>
            }
          </div>

          <!-- Título y Mensaje -->
          <h4 class="toast-title">{{ promo.titulo }}</h4>
          <p class="toast-desc">{{ promo.mensaje }}</p>

          <!-- Cupón de Descuento Interactivo -->
          @if (getCupon(promo); as cupon) {
            <div class="toast-coupon-box">
              <div class="coupon-left">
                <span class="coupon-label">CUPÓN EXCLUSIVO:</span>
                <span class="coupon-code">{{ cupon }}</span>
              </div>
              <button
                type="button"
                class="btn-copy-coupon"
                [class.copied]="copiado()"
                (click)="copiarCupon(cupon, $event)"
              >
                @if (copiado()) {
                  <span>¡Copiado! &#10003;</span>
                } @else {
                  <span>Copiar</span>
                }
              </button>
            </div>
          }

          <!-- Botón de Acción Principal -->
          <div class="toast-actions-row">
            <button
              type="button"
              class="btn-toast-cta"
              (click)="irAlCatalogo(promo)"
            >
              <span>Ver Catálogo &amp; Comprar</span>
              <span class="cta-arrow">&rarr;</span>
            </button>
          </div>
        </div>
      </div>
    }
  }
  `,
  styles: [`
    .promo-toast-overlay {
      position: fixed;
      top: 76px;
      right: 24px;
      z-index: 999998;
      max-width: 410px;
      width: calc(100vw - 32px);
      animation: slideInToast 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideInToast {
      from {
        opacity: 0;
        transform: translateY(-16px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .promo-toast-card {
      position: relative;
      background: #000000;
      color: #ffffff;
      border: 1.5px solid #c5a880;
      border-radius: 14px;
      padding: 18px 20px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35), 0 4px 12px rgba(197, 168, 128, 0.2);
      overflow: hidden;
    }

    .promo-toast-card.push-card {
      border-color: #10b981;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4), 0 4px 14px rgba(16, 185, 129, 0.25);
    }

    /* Barra de progreso de tiempo */
    .toast-progress-bar {
      position: absolute;
      top: 0;
      left: 0;
      height: 3.5px;
      background: #c5a880;
      width: 100%;
      animation: progressShrink 8s linear forwards;
    }

    .toast-progress-bar.push-bar {
      background: #10b981;
      animation: progressShrink 8.5s linear forwards;
    }

    @keyframes progressShrink {
      from { width: 100%; }
      to { width: 0%; }
    }

    .btn-toast-close {
      position: absolute;
      top: 12px;
      right: 14px;
      background: transparent;
      border: none;
      color: #999999;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      padding: 2px 6px;
      transition: color 0.2s;
    }

    .btn-toast-close:hover {
      color: #ffffff;
    }

    .toast-header-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }

    .toast-tag-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: rgba(197, 168, 128, 0.15);
      border: 1px solid #c5a880;
      color: #c5a880;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
      padding: 2px 8px;
      border-radius: 6px;
    }

    .toast-tag-badge.push-badge {
      background: rgba(16, 185, 129, 0.15);
      border-color: #10b981;
      color: #10b981;
    }

    .toast-discount-pill {
      background: #c5a880;
      color: #000000;
      font-size: 10.5px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }

    .toast-live-pill {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #10b981;
    }

    .toast-title {
      font-size: 14.5px !important;
      font-weight: 800 !important;
      color: #ffffff !important;
      margin: 0 0 6px 0 !important;
      letter-spacing: 0.3px;
      line-height: 1.3;
      padding-right: 20px;
    }

    .toast-desc {
      font-size: 12.5px;
      color: #d1d5db;
      line-height: 1.45;
      margin: 0 0 14px 0;
    }

    /* Caja del Cupón */
    .toast-coupon-box {
      background: #171717;
      border: 1px dashed #c5a880;
      border-radius: 8px;
      padding: 9px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    .coupon-left {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .coupon-label {
      font-size: 9.5px;
      font-weight: 700;
      color: #a1a1aa;
      letter-spacing: 0.5px;
    }

    .coupon-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 15px;
      font-weight: 800;
      color: #c5a880;
      letter-spacing: 1.5px;
    }

    .btn-copy-coupon {
      background: #ffffff;
      color: #000000;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-copy-coupon:hover {
      background: #c5a880;
      color: #000000;
    }

    .btn-copy-coupon.copied {
      background: #10b981;
      color: #ffffff;
    }

    /* Botón CTA */
    .toast-actions-row {
      display: flex;
      gap: 8px;
    }

    .btn-toast-cta {
      flex: 1;
      background: #c5a880;
      color: #000000;
      border: none;
      padding: 9px 16px;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 800;
      letter-spacing: 0.5px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
    }

    .btn-toast-cta.push-cta {
      background: #10b981;
      color: #ffffff;
    }

    .btn-toast-cta:hover {
      background: #ffffff;
      color: #000000;
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(197, 168, 128, 0.4);
    }

    .btn-toast-cta.push-cta:hover {
      background: #34d399;
      color: #000000;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
    }

    .cta-arrow {
      font-size: 14px;
      transition: transform 0.2s;
    }

    .btn-toast-cta:hover .cta-arrow {
      transform: translateX(3px);
    }
  `]
})
export class PromoToastComponent {
  readonly notifService = inject(NotificacionesService);
  private readonly router = inject(Router);

  copiado = signal<boolean>(false);

  // --- MÉTODOS PARA TOAST PUSH TRANSACCIONAL ---
  getPushIcon(push: PushToastData): string {
    if (push.tipo === 'ESTADO_PEDIDO') return 'shopping_bag';
    if (push.tipo === 'RESERVA_PROBADOR') return 'schedule';
    return 'notifications';
  }

  getPushBadgeText(push: PushToastData): string {
    if (push.tipo === 'ESTADO_PEDIDO') return 'COMPRA CONFIRMADA';
    if (push.tipo === 'RESERVA_PROBADOR') return 'RESERVA CONFIRMADA';
    return 'NOTIFICACIÓN PUSH';
  }

  ejecutarAccionPush(push: PushToastData): void {
    this.notifService.cerrarPushToast();
    if (push.onAccion) {
      push.onAccion();
      return;
    }
    if (push.urlDestino) {
      this.router.navigateByUrl(push.urlDestino);
    }
  }

  // --- MÉTODOS PARA TOAST DE PROMOCIÓN ---
  getCupon(promo: any): string | null {
    if (!promo?.data_extra) return null;
    return promo.data_extra['cupon'] || promo.data_extra['codigo_cupon'] || null;
  }

  getDescuento(promo: any): string | null {
    if (!promo?.data_extra) return null;
    const val = promo.data_extra['descuento'] || promo.data_extra['valor_descuento'];
    const tipo = promo.data_extra['tipo_descuento'];
    if (!val) return null;
    return tipo === 'MONTO_FIJO' ? `$${val} OFF` : `${val}% OFF`;
  }

  copiarCupon(cupon: string, event: MouseEvent): void {
    event.stopPropagation();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(cupon).then(() => {
        this.copiado.set(true);
        setTimeout(() => this.copiado.set(false), 2500);
      });
    }
  }

  irAlCatalogo(promo: any): void {
    this.notifService.marcarLeida(promo.id);
    this.notifService.cerrarPromoToast();
    const link = promo.data_extra?.['link'] || '/catalogo';
    this.router.navigateByUrl(link);
  }

  onToastClick(promo: any): void {
    this.irAlCatalogo(promo);
  }
}
