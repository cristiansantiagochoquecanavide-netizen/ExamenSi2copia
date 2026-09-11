import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="login-viewport">
      <div class="login-wrapper">
        <!-- Editorial Header -->
        <div class="brand-header">
          <span class="brand-subtitle">ATELIER NOIR &bull; PRIVATE ACCESS</span>
          <h1 class="brand-title">FashionStore</h1>
          <p class="brand-caption">Ingresá tus credenciales para acceder a la plataforma editorial y gestión de alta costura.</p>
        </div>

        <!-- Card Container -->
        <div class="login-card">
          <!-- Quick Demo Access Bar -->
          <div class="demo-credential-box">
            <div class="demo-info">
              <span class="demo-badge">ACCESO RÁPIDO POR ROL</span>
              <span class="demo-text">Probá las vistas web/móvil según cada rol:</span>
            </div>
            <div class="demo-role-buttons">
              <button type="button" class="btn-role-chip" (click)="fillRole('ADMIN')">Admin</button>
              <button type="button" class="btn-role-chip" (click)="fillRole('ENCARGADO')">Encargado</button>
              <button type="button" class="btn-role-chip" (click)="fillRole('CAJERO')">Cajero</button>
              <button type="button" class="btn-role-chip" (click)="fillRole('CLIENTE')">Cliente</button>
            </div>
          </div>

          <!-- Error Alert -->
          @if (errorMessage()) {
            <div class="alert-error">
              <span class="error-indicator">!</span>
              <span class="error-text">{{ errorMessage() }}</span>
            </div>
          }

          <!-- Form -->
          <form (ngSubmit)="onSubmit()" class="login-form">
            <div class="form-group">
              <label for="email" class="form-label">CORREO ELECTRÓNICO</label>
              <input
                id="email"
                type="email"
                name="email"
                [(ngModel)]="email"
                required
                placeholder="ejemplo@fashionstore.com"
                class="form-input"
                [disabled]="isLoading()"
              />
            </div>

            <div class="form-group">
              <label for="password" class="form-label">CONTRASEÑA</label>
              <input
                id="password"
                type="password"
                name="password"
                [(ngModel)]="password"
                required
                placeholder="••••••••"
                class="form-input"
                [disabled]="isLoading()"
              />
            </div>

            <button
              type="submit"
              class="btn-submit"
              [disabled]="isLoading() || !email || !password"
            >
              @if (isLoading()) {
                <span class="loading-state">AUTENTICANDO...</span>
              } @else {
                <span>INICIAR SESIÓN</span>
              }
            </button>
          </form>

          <div class="card-footer">
            <span class="footer-note">SISTEMA SEGURO CON TOKENS JWT (CU1)</span>
            <a routerLink="/catalogo" class="link-guest">Explorar catálogo como invitado &rarr;</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-viewport {
      min-height: calc(100vh - 120px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      background: radial-gradient(circle at 50% 20%, rgba(212, 175, 55, 0.05) 0%, rgba(0, 0, 0, 0) 70%);
    }

    .login-wrapper {
      width: 100%;
      max-width: 480px;
    }

    .brand-header {
      text-align: center;
      margin-bottom: 2.5rem;
    }

    .brand-subtitle {
      display: block;
      font-size: 0.7rem;
      letter-spacing: 0.25em;
      color: var(--color-gold);
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .brand-title {
      font-family: var(--font-serif);
      font-size: 3rem;
      font-weight: 400;
      letter-spacing: 0.05em;
      color: var(--color-primary);
      margin-bottom: 0.5rem;
      text-transform: uppercase;
    }

    .brand-caption {
      font-size: 0.85rem;
      color: var(--color-on-surface-muted);
      line-height: 1.5;
    }

    .login-card {
      background: var(--color-surface);
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 2.5rem;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);
      position: relative;
    }

    .login-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--color-gold), transparent);
    }

    .demo-credential-box {
      background: #191919;
      border: 1px solid rgba(212, 175, 55, 0.3);
      padding: 0.75rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.75rem;
    }

    .demo-info {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .demo-badge {
      font-size: 0.6rem;
      letter-spacing: 0.15em;
      color: var(--color-gold);
      font-weight: 600;
    }

    .demo-text {
      font-size: 0.75rem;
      color: var(--color-on-surface);
      font-family: monospace;
    }

    .demo-role-buttons {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .btn-role-chip {
      background: #000000;
      border: 1px solid rgba(212, 175, 55, 0.4);
      color: var(--color-gold);
      font-size: 0.68rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 5px 9px;
      cursor: pointer;
      border-radius: 0;
      transition: all 0.2s ease;
    }

    .btn-role-chip:hover {
      background: var(--color-gold);
      color: #000000;
      border-color: var(--color-gold);
    }

    .alert-error {
      background: rgba(220, 38, 38, 0.1);
      border: 1px solid rgba(220, 38, 38, 0.4);
      color: #fca5a5;
      padding: 0.75rem 1rem;
      margin-bottom: 1.5rem;
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .error-indicator {
      font-weight: bold;
      color: #ef4444;
      font-size: 1rem;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-label {
      font-size: 0.7rem;
      letter-spacing: 0.12em;
      color: var(--color-on-surface-muted);
      font-weight: 500;
    }

    .form-input {
      background: #0d0d0d;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      padding: 0.85rem 1rem;
      font-size: 0.9rem;
      transition: all 0.2s ease;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--color-gold);
      background: #111111;
      box-shadow: 0 0 10px rgba(212, 175, 55, 0.15);
    }

    .form-input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-submit {
      margin-top: 0.5rem;
      background: #ffffff;
      color: #000000;
      border: none;
      padding: 1rem;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-submit:hover:not(:disabled) {
      background: var(--color-gold);
      color: #000000;
      transform: translateY(-1px);
    }

    .btn-submit:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .card-footer {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: center;
      text-align: center;
    }

    .footer-note {
      font-size: 0.65rem;
      letter-spacing: 0.15em;
      color: #555555;
    }

    .link-guest {
      color: var(--color-gold);
      text-decoration: none;
      font-size: 0.8rem;
      letter-spacing: 0.05em;
      transition: color 0.2s ease;
    }

    .link-guest:hover {
      color: #ffffff;
      text-decoration: underline;
    }
  `]
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  email = '';
  password = '';

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    if (this.route.snapshot.queryParams['expired'] === 'true') {
      this.errorMessage.set('Tu sesión ha expirado por inactividad. Por favor volvé a ingresar.');
    }
  }

  fillRole(role: 'ADMIN' | 'ENCARGADO' | 'CAJERO' | 'CLIENTE'): void {
    if (role === 'ADMIN') {
      this.email = 'AdminFashion@gmail.com';
      this.password = 'Admin123';
    } else if (role === 'ENCARGADO') {
      this.email = 'EncargadoSucursal@gmail.com';
      this.password = 'Encargado123';
    } else if (role === 'CAJERO') {
      this.email = 'CajeroFashion@gmail.com';
      this.password = 'Cajero123';
    } else {
      this.email = 'ClienteFashion@gmail.com';
      this.password = 'Cliente123';
    }
    this.errorMessage.set(null);
  }

  onSubmit(): void {
    if (!this.email || !this.password) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        // Redireccion automatica al catalogo
        this.router.navigate(['/catalogo']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const detail = err.error?.detail || 'Error al autenticar. Verifique sus credenciales.';
        this.errorMessage.set(detail);
      }
    });
  }
}
