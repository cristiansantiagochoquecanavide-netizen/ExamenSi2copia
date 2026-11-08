// ==============================================================================
// CASO DE USO: CU05 - AUTENTICAR USUARIO Y ESTABLECER CONTEXTO DE TENANT
// ROL: Todos los Usuarios (Cliente, Cajero, Admin, Superadmin)
// CAPA MVC: [VISTA & VIEWCONTROLLER ANGULAR]
// ==============================================================================

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
              <button type="button" class="btn-role-chip" (click)="fillRole('TENANT2')">Tenant 2 (Urban)</button>
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
            <span class="footer-note">SISTEMA SEGURO CON TOKENS JWT</span>
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
      padding: 1.5rem 1rem;
      background: #fafafa;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      box-sizing: border-box;
    }

    .login-wrapper {
      width: 100%;
      max-width: 460px;
    }

    .brand-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .brand-subtitle {
      display: block;
      font-size: 0.72rem;
      letter-spacing: 0.18em;
      color: #6b7280;
      margin-bottom: 0.35rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .brand-title {
      font-size: 1.85rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #000000;
      margin-bottom: 0.35rem;
    }

    .brand-caption {
      font-size: 0.85rem;
      color: #6b7280;
      line-height: 1.4;
    }

    .login-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 12px;
      padding: clamp(1.25rem, 4vw, 2rem);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      position: relative;
    }

    .demo-credential-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 0.85rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      margin-bottom: 1.75rem;
    }

    .demo-info {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .demo-badge {
      font-size: 0.65rem;
      letter-spacing: 0.1em;
      color: #4b5563;
      font-weight: 700;
      text-transform: uppercase;
    }

    .demo-text {
      font-size: 0.8rem;
      color: #6b7280;
    }

    .demo-role-buttons {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .btn-role-chip {
      background: #ffffff;
      border: 1px solid #d1d5db;
      color: #111827;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 5px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-role-chip:hover {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
    }

    .alert-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .error-indicator {
      font-weight: bold;
      color: #dc2626;
      font-size: 1rem;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .form-label {
      font-size: 0.75rem;
      letter-spacing: 0.05em;
      color: #374151;
      font-weight: 600;
    }

    .form-input {
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      color: #111827;
      padding: 0.75rem 1rem;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .form-input:focus {
      border-color: #000000;
      box-shadow: 0 0 0 1px #000000;
    }

    .form-input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-submit {
      margin-top: 0.5rem;
      width: 100%;
      background: #000000;
      color: #ffffff;
      border: 1px solid #000000;
      border-radius: 6px;
      padding: 0.85rem;
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-submit:hover:not(:disabled) {
      background: #1f2937;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .btn-submit:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .card-footer {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #f3f4f6;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: center;
      text-align: center;
    }

    .footer-note {
      font-size: 0.7rem;
      color: #9ca3af;
      letter-spacing: 0.05em;
    }

    .link-guest {
      color: #111827;
      font-weight: 600;
      text-decoration: none;
      font-size: 0.85rem;
      transition: color 0.2s ease;
    }

    .link-guest:hover {
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

  fillRole(role: 'ADMIN' | 'ENCARGADO' | 'CAJERO' | 'CLIENTE' | 'TENANT2'): void {
    if (role === 'ADMIN') {
      this.email = 'AdminFashion@gmail.com';
      this.password = 'Admin123';
    } else if (role === 'ENCARGADO') {
      this.email = 'EncargadoSucursal@gmail.com';
      this.password = 'Encargado123';
    } else if (role === 'CAJERO') {
      this.email = 'CajeroFashion@gmail.com';
      this.password = 'Cajero123';
    } else if (role === 'TENANT2') {
      this.email = 'gerencia@urbanstyle.bo';
      this.password = 'Password123!';
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
