import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { ToastService } from './core/services/toast.service';
import { LocalOfflineStorageService } from './core/services/local-offline-storage.service';
import { CartService } from './features/ventas/services/cart.service';
import { ChatbotWidgetComponent } from './features/ia-asistente/components/chatbot-widget.component';
import { NotificationBellComponent } from './features/notificaciones/components/notification-bell.component';
import { PromoToastComponent } from './features/notificaciones/components/promo-toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ChatbotWidgetComponent, NotificationBellComponent, PromoToastComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'FashionStore';
  readonly authService = inject(AuthService);
  readonly offlineService = inject(LocalOfflineStorageService);
  readonly toastService = inject(ToastService);
  readonly cartService = inject(CartService);
  readonly router = inject(Router);

  readonly isMobileMenuOpen = signal<boolean>(false);
  readonly openMobileDropdown = signal<string | null>(null);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.closeMobileMenu();
    });
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
    this.openMobileDropdown.set(null);
  }

  toggleMobileDropdown(name: string): void {
    this.openMobileDropdown.update(curr => curr === name ? null : name);
  }

  isModuleActive(prefix: string): boolean {
    return this.router.url.startsWith(prefix);
  }

  isCatalogoActive(): boolean {
    return this.router.url.startsWith('/catalogo');
  }

  isInventarioActive(): boolean {
    return this.router.url.startsWith('/inventario');
  }

  sincronizarLoteOffline(): void {
    this.offlineService.sincronizarLoteOffline().subscribe({
      next: (res) => {
        if (res && res.total_recibidos > 0) {
          this.toastService.success(`Sincronización Completada: ${res.procesados_exitosamente} transacciones asentadas, ${res.duplicados_idempotentes} duplicados ignorados, ${res.conflictos_stock} discrepancias.`);
        } else {
          this.toastService.info('No existen operaciones offline pendientes en la cola local.');
        }
      },
      error: (err) => {
        this.toastService.error('Error al comunicarse con el servidor central: ' + (err.message || err));
      }
    });
  }

  logout(): void {
    this.closeMobileMenu();
    this.authService.logout();
  }
}
