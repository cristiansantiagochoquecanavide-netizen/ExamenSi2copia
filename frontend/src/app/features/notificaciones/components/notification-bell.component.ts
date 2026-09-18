import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificacionesService } from '../services/notificaciones.service';
import { Notificacion } from '../models/notificaciones.models';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-wrapper">
      <!-- Botón Campana en el Navbar -->
      <button
        type="button"
        class="nav-bell-btn"
        (click)="toggleOpen($event)"
        title="Centro de Notificaciones y Alertas"
        aria-label="Abrir centro de notificaciones"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="bell-svg">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>

        @if (notifService.unreadCount() > 0) {
          <span class="bell-badge-count">{{ notifService.unreadCount() }}</span>
        }
      </button>

      <!-- Dropdown Panel de Notificaciones -->
      @if (notifService.isOpen()) {
        <div class="notif-dropdown-card" (click)="$event.stopPropagation()">
          <!-- Header del Panel -->
          <header class="notif-dropdown-header">
            <div class="header-left">
              <h4 class="notif-dropdown-title">NOTIFICACIONES</h4>
              @if (notifService.unreadCount() > 0) {
                <span class="unread-pill">{{ notifService.unreadCount() }} nuevas</span>
              }
            </div>
            @if (notifService.unreadCount() > 0) {
              <button
                type="button"
                class="btn-mark-all-read"
                (click)="notifService.marcarTodasLeidas()"
              >
                Marcar todas leídas
              </button>
            }
          </header>

          <!-- Filtros Rápidos -->
          <div class="notif-filters-bar">
            <button
              type="button"
              class="filter-pill"
              [class.active]="activeFilter() === 'TODAS'"
              (click)="setFilter('TODAS')"
            >
              Todas
            </button>
            <button
              type="button"
              class="filter-pill"
              [class.active]="activeFilter() === 'NO_LEIDAS'"
              (click)="setFilter('NO_LEIDAS')"
            >
              No Leídas
            </button>
          </div>

          <!-- Lista de Notificaciones -->
          <div class="notif-list-scroll">
            @if (notifService.isLoading()) {
              <div class="notif-loading">Cargando alertas...</div>
            } @else if (filteredNotifications().length === 0) {
              <div class="notif-empty">
                <span class="empty-icon">🔔</span>
                <p>No tenés notificaciones en esta sección.</p>
              </div>
            } @else {
              @for (notif of filteredNotifications(); track notif.id) {
                <div
                  class="notif-item-row"
                  [class.unread]="!notif.leida"
                  [class.read]="notif.leida"
                  (click)="onNotificationClick(notif)"
                >
                  <div class="notif-icon-col">
                    <span class="type-icon-badge" [ngClass]="getBadgeClass(notif.tipo)">
                      {{ getEmojiForType(notif.tipo) }}
                    </span>
                  </div>

                  <div class="notif-content-col">
                    <div class="notif-title-row">
                      <div class="tag-group">
                        <span class="type-tag">{{ getTypeLabel(notif.tipo) }}</span>
                        @if (!notif.leida) {
                          <span class="pill-unread-tag">&bull; NUEVA</span>
                        }
                      </div>
                      <span class="notif-time">{{ notif.created_at | date:'shortTime' }}</span>
                    </div>
                    <h5 class="notif-item-title">{{ notif.titulo }}</h5>
                    <p class="notif-item-msg">{{ notif.mensaje }}</p>

                    @if (notif.tipo === 'RECOMENDACION_IA') {
                      <div class="ia-action-hint">
                        <span>Ver recomendación en Atelier Stylist &rarr;</span>
                      </div>
                    }
                  </div>

                  <div class="notif-actions-col">
                    <button
                      type="button"
                      class="btn-delete-notif"
                      (click)="onDelete(notif.id, $event)"
                      title="Descartar"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              }
            }
          </div>

          <!-- Footer con Simulación Rápida para Evaluación -->
          <footer class="notif-dropdown-footer">
            <div class="test-label">Simular alertas en vivo (Evaluación):</div>
            <div class="test-buttons-row">
              <button
                type="button"
                class="btn-sim-ia"
                (click)="simularAlerta('RECOMENDACION_IA')"
                title="Generar alerta de look IA"
              >
                ✨ IA Stylist
              </button>
              <button
                type="button"
                class="btn-sim-reserva"
                (click)="simularAlerta('RESERVA_PROBADOR')"
                title="Generar alerta de probador"
              >
                🕒 Probador
              </button>
              <button
                type="button"
                class="btn-sim-pedido"
                (click)="simularAlerta('ESTADO_PEDIDO')"
                title="Generar alerta de pedido"
              >
                🛍️ Pedido
              </button>
              <button
                type="button"
                class="btn-sim-promo"
                (click)="simularAlerta('PROMOCION')"
                title="Generar alerta de descuento"
              >
                🏷️ Promo
              </button>
            </div>
          </footer>
        </div>
      }
    </div>
  `,
  styles: [`
    .notification-wrapper {
      position: relative;
      display: inline-block;
    }

    /* Botón Campana Navbar */
    .nav-bell-btn {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.18);
      width: 38px;
      height: 38px;
      border-radius: 50% !important;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
      color: #000000;
      padding: 0 !important;
      box-sizing: border-box;
      transition: all 0.2s ease;
    }

    .nav-bell-btn:hover {
      background: #f9fafb;
      border-color: #000000;
      transform: translateY(-1px);
    }

    .bell-svg {
      width: 20px;
      height: 20px;
      display: block;
      stroke: #000000;
    }

    .bell-badge-count {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #dc2626;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      min-width: 17px;
      height: 17px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      border: 1.5px solid #ffffff;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      animation: badgePop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    @keyframes badgePop {
      from { transform: scale(0); }
      to { transform: scale(1); }
    }

    /* Dropdown Card */
    .notif-dropdown-card {
      position: absolute;
      top: calc(100% + 12px);
      right: 0;
      width: 420px;
      max-width: calc(100vw - 24px);
      background: #ffffff;
      border: 1px solid #e5e5e5;
      border-radius: 12px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.06);
      z-index: 999999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: notifPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes notifPop {
      from { opacity: 0; transform: translateY(-8px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* Header */
    .notif-dropdown-header {
      padding: 14px 18px;
      background: #000000;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #c5a880;
      gap: 12px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .notif-dropdown-title {
      font-size: 14px !important;
      font-weight: 800 !important;
      letter-spacing: 1px;
      margin: 0 !important;
      color: #ffffff !important;
      white-space: nowrap;
    }

    .unread-pill {
      background: #c5a880;
      color: #000000;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 12px;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1.2;
    }

    .btn-mark-all-read {
      background: transparent;
      border: none;
      color: #c5a880;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: underline;
      white-space: nowrap;
      margin-left: auto;
      text-align: right;
      transition: color 0.2s;
    }

    .btn-mark-all-read:hover {
      color: #ffffff;
    }

    /* Filters Bar */
    .notif-filters-bar {
      display: flex;
      gap: 8px;
      padding: 10px 16px;
      background: #f9f9f9;
      border-bottom: 1px solid #eeeeee;
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .notif-filters-bar::-webkit-scrollbar {
      display: none;
    }

    .filter-pill {
      background: #ffffff;
      border: 1px solid #dddddd;
      color: #444444;
      font-size: 12px;
      padding: 5px 12px;
      border-radius: 14px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }

    .filter-pill:hover {
      border-color: #000000;
      color: #000000;
    }

    .filter-pill.active {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
      font-weight: 600;
    }

    /* List Scroll */
    .notif-list-scroll {
      max-height: 340px;
      overflow-y: auto;
      background: #ffffff;
    }

    .notif-loading, .notif-empty {
      padding: 30px 20px;
      text-align: center;
      color: #777777;
      font-size: 14px;
    }

    .empty-icon {
      font-size: 28px;
      display: block;
      margin-bottom: 8px;
    }

    .notif-item-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 13px 16px;
      border-bottom: 1px solid #eeeeee;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }

    /* No Leídas: Fondo blanco puro, borde izquierdo dorado y textos oscuros */
    .notif-item-row.unread {
      background: #ffffff;
      border-left: 4px solid #c5a880;
    }

    .notif-item-row.unread:hover {
      background: #fffdf9;
    }

    .notif-item-row.unread .notif-item-title {
      color: #000000 !important;
      font-weight: 800 !important;
    }

    .notif-item-row.unread .notif-item-msg {
      color: #222222;
      font-weight: 500;
    }

    .notif-item-row.unread .type-tag {
      color: #8c7657;
      font-weight: 800;
    }

    /* Leídas: Fondo grisáceo suave, letras notablemente más claras y atenuadas */
    .notif-item-row.read {
      background: #f7f8fa;
      border-left: 4px solid transparent;
      opacity: 0.82;
    }

    .notif-item-row.read:hover {
      background: #eef1f4;
      opacity: 1;
    }

    .notif-item-row.read .notif-item-title {
      color: #71717a !important;
      font-weight: 600 !important;
    }

    .notif-item-row.read .notif-item-msg {
      color: #a1a1aa;
      font-weight: 400;
    }

    .notif-item-row.read .type-tag {
      color: #a1a1aa;
      font-weight: 600;
    }

    .notif-item-row.read .type-icon-badge {
      opacity: 0.5;
      filter: grayscale(35%);
    }

    .tag-group {
      display: inline-flex;
      align-items: center;
      gap: 7px;
    }

    .pill-unread-tag {
      background: #c5a880;
      color: #000000;
      font-size: 9.5px;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 6px;
      letter-spacing: 0.5px;
      display: inline-block;
      line-height: 1.3;
    }

    .notif-icon-col {
      flex-shrink: 0;
    }

    .type-icon-badge {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      background: #f2f2f2;
      transition: all 0.2s ease;
    }

    .badge-ia { background: #fef7ec; border: 1px solid #f2e2c2; }
    .badge-reserva { background: #eff6ff; border: 1px solid #bfdbfe; }
    .badge-pedido { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .badge-promo { background: #fdf2f8; border: 1px solid #fbcfe8; }
    .badge-stock { background: #fffbeb; border: 1px solid #fef3c7; }

    .notif-content-col {
      flex: 1;
      min-width: 0;
    }

    .notif-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .type-tag {
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .notif-time {
      font-size: 11px;
      color: #999999;
    }

    .notif-item-title {
      font-size: 13.5px !important;
      margin: 0 0 4px 0 !important;
      line-height: 1.3;
    }

    .notif-item-msg {
      font-size: 12.5px;
      line-height: 1.4;
      margin: 0;
    }

    .ia-action-hint {
      margin-top: 6px;
      font-size: 11.5px;
      font-weight: 600;
      color: #8c7657;
      text-decoration: underline;
    }

    .notif-actions-col {
      flex-shrink: 0;
    }

    .btn-delete-notif {
      background: transparent;
      border: none;
      color: #bbbbbb;
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
      padding: 0 4px;
    }

    .btn-delete-notif:hover {
      color: #000000;
    }

    /* Footer de Pruebas */
    .notif-dropdown-footer {
      padding: 12px 16px;
      background: #fafafa;
      border-top: 1px solid #eeeeee;
    }

    .test-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #888888;
      margin-bottom: 8px;
    }

    .test-buttons-row {
      display: flex;
      gap: 6px;
    }

    .test-buttons-row button {
      flex: 1;
      padding: 6px 5px;
      font-size: 11.5px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      border: 1px solid #dddddd;
      background: #ffffff;
      color: #222222;
      transition: all 0.2s;
    }

    .test-buttons-row button:hover {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
    }
  `]
})
export class NotificationBellComponent {
  readonly notifService = inject(NotificacionesService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);

  activeFilter = signal<string>('TODAS');

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.notifService.close();
    }
  }

  toggleOpen(event: MouseEvent): void {
    event.stopPropagation();
    this.notifService.toggleOpen();
  }

  setFilter(filter: string): void {
    this.activeFilter.set(filter);
    if (filter === 'NO_LEIDAS') {
      this.notifService.cargarNotificaciones(undefined, true);
    } else if (filter === 'TODAS') {
      this.notifService.cargarNotificaciones();
    } else {
      this.notifService.cargarNotificaciones(filter);
    }
  }

  filteredNotifications(): Notificacion[] {
    const list = this.notifService.notifications();
    const filter = this.activeFilter();
    if (filter === 'NO_LEIDAS') {
      return list.filter(n => !n.leida);
    }
    if (filter === 'TODAS') {
      return list;
    }
    return list.filter(n => n.tipo === filter);
  }

  onNotificationClick(notif: Notificacion): void {
    if (!notif.leida) {
      this.notifService.marcarLeida(notif.id);
    }
    this.notifService.close();

    // Navegación contextual según el tipo de alerta
    if (notif.tipo === 'RECOMENDACION_IA') {
      this.router.navigate(['/ia-asistente']);
    } else if (notif.tipo === 'RESERVA_PROBADOR') {
      this.router.navigate(['/reservas']);
    } else if (notif.tipo === 'ESTADO_PEDIDO') {
      this.router.navigate(['/ventas/checkout']);
    } else if (notif.tipo === 'PROMOCION') {
      this.router.navigate(['/catalogo']);
    } else if (notif.tipo === 'ALERTA_STOCK') {
      this.router.navigate(['/inventario']);
    }
  }

  onDelete(id: number, event: MouseEvent): void {
    event.stopPropagation();
    this.notifService.eliminarNotificacion(id);
  }

  simularAlerta(tipo: string): void {
    this.notifService.emitirAlertaTest(tipo).subscribe({
      next: (notif) => {
        // Alerta añadida automáticamente
      },
      error: (err) => console.error('Error emitiendo alerta de prueba:', err)
    });
  }

  getTypeLabel(tipo: string): string {
    switch (tipo) {
      case 'RECOMENDACION_IA': return 'Atelier Stylist';
      case 'RESERVA_PROBADOR': return 'Reserva Probador';
      case 'ESTADO_PEDIDO': return 'Estado de Pedido';
      case 'PROMOCION': return 'Promoción Especial';
      case 'ALERTA_STOCK': return 'Alerta Stock';
      default: return 'Alerta FashionStore';
    }
  }

  getEmojiForType(tipo: string): string {
    switch (tipo) {
      case 'RECOMENDACION_IA': return '✨';
      case 'RESERVA_PROBADOR': return '🕒';
      case 'ESTADO_PEDIDO': return '🛍️';
      case 'PROMOCION': return '🏷️';
      case 'ALERTA_STOCK': return '⚠️';
      default: return '🔔';
    }
  }

  getBadgeClass(tipo: string): string {
    switch (tipo) {
      case 'RECOMENDACION_IA': return 'badge-ia';
      case 'RESERVA_PROBADOR': return 'badge-reserva';
      case 'ESTADO_PEDIDO': return 'badge-pedido';
      case 'PROMOCION': return 'badge-promo';
      case 'ALERTA_STOCK': return 'badge-stock';
      default: return '';
    }
  }
}
