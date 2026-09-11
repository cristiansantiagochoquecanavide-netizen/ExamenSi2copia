import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { CartService } from './features/ventas/services/cart.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
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

  logout(): void {
    this.authService.logout();
  }
}
