import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
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
  readonly cartService = inject(CartService);
  readonly router = inject(Router);

  isModuleActive(prefix: string): boolean {
    return this.router.url.startsWith(prefix);
  }

  isCatalogoActive(): boolean {
    return this.router.url.startsWith('/catalogo') || this.router.url === '/inventario';
  }

  isInventarioActive(): boolean {
    return this.router.url.startsWith('/inventario/recepcion') || this.router.url.startsWith('/inventario/transferencias');
  }

  logout(): void {
    this.authService.logout();
  }
}
