// ==============================================================================
// CASO DE USO: CU05 - AUTENTICAR USUARIO Y ESTABLECER CONTEXTO DE TENANT
// CU02: REGISTRAR EMPRESA CONTRATANTE (TENANT BOUTIQUE)
// ROL: Todos los Usuarios (Cliente, Cajero, Admin, Superadmin, Invitado)
// CAPA MVC: [VISTA & VIEWCONTROLLER ANGULAR]
// ==============================================================================

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SaasService, PlanSuscripcionModel } from '../../core/services/saas.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="login-page-container">
      <!-- TOP NAVIGATION BAR DEDICADA PARA LOGIN -->
      <header class="login-topbar">
        <a routerLink="/" class="brand-link" title="Ir al Landing de AtelierOS">
          <span class="brand-name">ATELIER</span>
          <span class="os-pill">OS</span>
        </a>

        <div class="topbar-actions">
          <a routerLink="/catalogo" class="btn-store-nav" title="Ver catálogo de prendas como invitado">
            <span class="material-symbols-outlined nav-icon">storefront</span>
            <span>Ir a Tienda</span>
          </a>
          <button type="button" class="btn-register-nav" (click)="abrirModalRegistro()" title="Crear una nueva tienda o boutique">
            <span class="material-symbols-outlined nav-icon">add_business</span>
            <span>Registrar Tienda</span>
          </button>
        </div>
      </header>

      <!-- VIEWPORT CENTRAL CON LA TARJETA DE LOGIN -->
      <main class="login-main-section">
        <div class="login-box-wrapper">
          
          <!-- Encabezado de Bienvenida -->
          <div class="brand-header">
            <div class="header-badge">ATELIER OS &bull; CONSOLA DE GESTIÓN</div>
            <h1 class="welcome-heading">Bienvenido a AtelierOS</h1>
            <p class="welcome-subheading">
              Ingresá tus credenciales para acceder a la administración multitenant de tu boutique.
            </p>
          </div>

          <!-- Alerta de Éxito al Registrar Tienda -->
          @if (registroExitosoMensaje()) {
            <div class="alert-success">
              <span class="material-symbols-outlined alert-icon-success">check_circle</span>
              <div class="alert-content">
                <strong>¡Registro Completado!</strong>
                <p>{{ registroExitosoMensaje() }}</p>
              </div>
            </div>
          }

          <!-- Tarjeta de Autenticación -->
          <div class="login-card">
            <!-- Barra de Acceso Rápido Demo -->
            <div class="demo-credential-box">
              <div class="demo-info">
                <span class="demo-badge">ACCESO RÁPIDO POR ROL</span>
                <span class="demo-text">Probá las vistas web/móvil según cada rol:</span>
              </div>
              <div class="demo-role-buttons">
                <button type="button" class="btn-role-chip" (click)="fillRole('ADMIN')">AdminFashion</button>
                <button type="button" class="btn-role-chip" (click)="fillRole('ENCARGADO')">EncargadoFashion</button>
                <button type="button" class="btn-role-chip" (click)="fillRole('CAJERO')">CajeroFashion</button>
                <button type="button" class="btn-role-chip" (click)="fillRole('CLIENTE')">ClienteFashion</button>
                <button type="button" class="btn-role-chip tenant-chip" (click)="fillRole('VELVET')">Velvet Night</button>
              </div>
            </div>

            <!-- Alerta de Error de Autenticación -->
            @if (errorMessage()) {
              <div class="alert-error">
                <span class="material-symbols-outlined error-icon">error</span>
                <span class="error-text">{{ errorMessage() }}</span>
              </div>
              <div style="margin-top: 0.5rem; margin-bottom: 0.75rem; text-align: center;">
                <button type="button" style="background: transparent; border: 1px dashed #cbd5e1; padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.75rem; color: #475569; cursor: pointer;" (click)="changeBackendUrl()">
                  ⚙️ Configurar URL Backend (Render)
                </button>
              </div>
            }

            <!-- Formulario de Inicio de Sesión -->
            <form (ngSubmit)="onSubmit()" class="login-form">
              <div class="form-group">
                <label for="email" class="form-label">CORREO ELECTRÓNICO</label>
                <div class="input-wrapper">
                  <span class="material-symbols-outlined input-icon">mail</span>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    [(ngModel)]="email"
                    required
                    placeholder="ejemplo@tutienda.com"
                    class="form-input"
                    [disabled]="isLoading()"
                  />
                </div>
              </div>

              <div class="form-group">
                <div class="label-row">
                  <label for="password" class="form-label">CONTRASEÑA</label>
                </div>
                <div class="input-wrapper">
                  <span class="material-symbols-outlined input-icon">lock</span>
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
              </div>

              <button
                type="submit"
                class="btn-submit"
                [disabled]="isLoading() || !email || !password"
              >
                @if (isLoading()) {
                  <span class="loading-state">AUTENTICANDO EN ATELIER OS...</span>
                } @else {
                  <span>INICIAR SESIÓN &rarr;</span>
                }
              </button>
            </form>

            <!-- Enlaces Inferiores -->
            <div class="card-footer">
              <a routerLink="/catalogo" class="link-guest">
                <span class="material-symbols-outlined icon-small">storefront</span>
                <span>Ir a Tienda (Explorar catálogo sin iniciar sesión) &rarr;</span>
              </a>
              <div class="footer-divider"></div>
              <div class="register-prompt">
                <span>¿Tu marca aún no está en AtelierOS?</span>
                <button type="button" class="btn-text-register" (click)="abrirModalRegistro()">
                  Registrar Tienda
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- MODAL DE REGISTRO DE EMPRESA / TIENDA (CU02) -->
      @if (showRegistroModal()) {
        <div class="modal-backdrop" (click)="cerrarModalRegistro()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-group">
                <span class="modal-badge">CU02 &bull; ONBOARDING TENANT</span>
                <h3 class="modal-title">Registrar Nueva Tienda en AtelierOS</h3>
                <p class="modal-subtitle">
                  Provisiona tu boutique en la nube con subdominio propio, base de datos aislada y usuario administrador.
                </p>
              </div>
              <button type="button" class="btn-close" (click)="cerrarModalRegistro()">&times;</button>
            </div>

            @if (registroError()) {
              <div class="alert-error modal-alert">
                <span class="material-symbols-outlined error-icon">warning</span>
                <span>{{ registroError() }}</span>
              </div>
            }

            <form (ngSubmit)="crearEmpresaSubmit()" class="modal-form">
              <div class="form-group">
                <label class="form-label">RAZÓN SOCIAL / NOMBRE DE LA MARCA *</label>
                <input
                  type="text"
                  [(ngModel)]="nuevaEmpresa.razon_social"
                  name="modalRazon"
                  placeholder="Ej. Maison Riviera S.R.L."
                  required
                  class="form-input"
                />
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">NIT CORPORATIVO *</label>
                  <input
                    type="text"
                    [(ngModel)]="nuevaEmpresa.nit"
                    name="modalNit"
                    placeholder="Ej. 1029384756"
                    required
                    class="form-input"
                  />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">SUBDOMINIO TENANT *</label>
                  <div class="subdomain-input-group">
                    <input
                      type="text"
                      [(ngModel)]="nuevaEmpresa.subdominio"
                      name="modalSub"
                      placeholder="maisonriviera"
                      required
                      class="form-input subdomain-input"
                    />
                    <span class="subdomain-suffix">.atelieros.bo</span>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">CORREO ELECTRÓNICO ADMINISTRADOR *</label>
                <input
                  type="email"
                  [(ngModel)]="nuevaEmpresa.email_corporativo"
                  name="modalEmail"
                  placeholder="admin@maisonriviera.bo"
                  required
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label class="form-label">PLAN DE SUSCRIPCIÓN INICIAL</label>
                <select [(ngModel)]="nuevaEmpresa.plan_id" name="modalPlan" class="form-select">
                  @for (p of planes(); track p.id) {
                    <option [value]="p.id">
                      {{ p.nombre }} — $ {{ p.precio_mensual | number:'1.2-2' }}/mes (Hasta {{ p.limite_sucursales > 100 ? 'Ilimitadas' : p.limite_sucursales }} sucursales)
                    </option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">CONTRASEÑA INICIAL ADMIN</label>
                <input
                  type="password"
                  [(ngModel)]="nuevaEmpresa.admin_password"
                  name="modalPass"
                  placeholder="Password123!"
                  class="form-input"
                />
                <span class="field-hint">Podrás cambiar tu contraseña una vez que ingreses a tu panel.</span>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-cancel" (click)="cerrarModalRegistro()">
                  Cancelar
                </button>
                <button type="submit" class="btn-confirm-register" [disabled]="isRegistering()">
                  @if (isRegistering()) {
                    <span>Registrando Tienda...</span>
                  } @else {
                    <span>Crear Tienda y Continuar &rarr;</span>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .login-page-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: #fafafc;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #111827;
      box-sizing: border-box;
    }

    /* TOPBAR */
    .login-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.15rem 2rem;
      background: #ffffff;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .brand-link {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      text-decoration: none;
      color: #000000;
    }

    .brand-name {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: 0.04em;
    }

    .os-pill {
      background: #000000;
      color: #ffffff;
      font-size: 0.62rem;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.05em;
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn-store-nav {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.5rem 1rem;
      background: #ffffff;
      color: #111827;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 9999px;
      font-size: 0.82rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .btn-store-nav:hover {
      background: #f3f4f6;
      border-color: #000000;
    }

    .btn-register-nav {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.5rem 1.15rem;
      background: #000000;
      color: #ffffff;
      border: 1px solid #000000;
      border-radius: 9999px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-register-nav:hover {
      background: #27272a;
      border-color: #27272a;
      transform: translateY(-1px);
    }

    .nav-icon {
      font-size: 1.05rem;
    }

    /* MAIN SECTION */
    .login-main-section {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1rem;
    }

    .login-box-wrapper {
      width: 100%;
      max-width: 480px;
    }

    .brand-header {
      text-align: center;
      margin-bottom: 1.75rem;
    }

    .header-badge {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #4b5563;
      background: #f3f4f6;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      margin-bottom: 0.75rem;
    }

    .welcome-heading {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #000000;
      margin: 0 0 0.5rem;
    }

    .welcome-subheading {
      font-size: 0.88rem;
      color: #4b5563;
      line-height: 1.45;
      margin: 0;
    }

    /* ALERTA DE ÉXITO */
    .alert-success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      padding: 0.9rem 1rem;
      border-radius: 10px;
      margin-bottom: 1.25rem;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      font-size: 0.84rem;
      line-height: 1.4;
    }

    .alert-icon-success {
      color: #16a34a;
      font-size: 1.3rem;
      flex-shrink: 0;
      margin-top: -1px;
    }

    .alert-content p {
      margin: 0.25rem 0 0;
    }

    /* TARJETA DE LOGIN */
    .login-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 14px;
      padding: clamp(1.5rem, 5vw, 2.25rem);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
    }

    /* DEMO CHIPS */
    .demo-credential-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 0.85rem 1rem;
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }

    .demo-info {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .demo-badge {
      font-size: 0.65rem;
      letter-spacing: 0.08em;
      color: #475569;
      font-weight: 800;
      text-transform: uppercase;
    }

    .demo-text {
      font-size: 0.78rem;
      color: #64748b;
    }

    .demo-role-buttons {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .btn-role-chip {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 5px 9px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-role-chip:hover {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
    }

    .btn-role-chip.tenant-chip {
      background: #f1f5f9;
      border-color: #94a3b8;
    }

    /* ALERTA DE ERROR */
    .alert-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1.25rem;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .error-icon {
      color: #dc2626;
      font-size: 1.2rem;
    }

    /* FORMULARIO */
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

    .form-row {
      display: flex;
      gap: 0.75rem;
    }

    .flex-1 {
      flex: 1;
    }

    .form-label {
      font-size: 0.72rem;
      letter-spacing: 0.06em;
      color: #374151;
      font-weight: 700;
      text-transform: uppercase;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 0.85rem;
      color: #9ca3af;
      font-size: 1.15rem;
      pointer-events: none;
    }

    .form-input {
      width: 100%;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      color: #111827;
      padding: 0.75rem 1rem 0.75rem 2.6rem;
      font-size: 0.88rem;
      outline: none;
      box-sizing: border-box;
      transition: all 0.2s ease;
    }

    .form-input:focus {
      border-color: #000000;
      box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.08);
    }

    .btn-submit {
      margin-top: 0.5rem;
      width: 100%;
      background: #000000;
      color: #ffffff;
      border: 1px solid #000000;
      border-radius: 8px;
      padding: 0.85rem 1rem;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-submit:hover:not(:disabled) {
      background: #27272a;
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
    }

    .btn-submit:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    /* FOOTER */
    .card-footer {
      margin-top: 1.75rem;
      padding-top: 1.25rem;
      border-top: 1px solid #f1f5f9;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      align-items: center;
      text-align: center;
    }

    .link-guest {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      color: #111827;
      font-weight: 600;
      text-decoration: none;
      font-size: 0.84rem;
      transition: color 0.2s;
    }

    .link-guest:hover {
      text-decoration: underline;
    }

    .icon-small {
      font-size: 1.05rem;
    }

    .footer-divider {
      width: 100%;
      height: 1px;
      background: #f1f5f9;
    }

    .register-prompt {
      font-size: 0.82rem;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .btn-text-register {
      background: none;
      border: none;
      color: #000000;
      font-weight: 700;
      cursor: pointer;
      font-size: 0.82rem;
      padding: 0;
      text-decoration: underline;
    }

    .btn-text-register:hover {
      color: #3b82f6;
    }

    /* MODAL */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
      box-sizing: border-box;
    }

    .modal-card {
      background: #ffffff;
      border-radius: 14px;
      max-width: 540px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      padding: 1.75rem;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.2);
      box-sizing: border-box;
      animation: modalSlide 0.2s ease-out;
    }

    @keyframes modalSlide {
      from { transform: translateY(16px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
    }

    .modal-badge {
      display: inline-block;
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      color: #2563eb;
      background: #eff6ff;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      margin-bottom: 0.4rem;
    }

    .modal-title {
      font-size: 1.35rem;
      font-weight: 800;
      margin: 0 0 0.35rem;
      color: #111827;
    }

    .modal-subtitle {
      font-size: 0.82rem;
      color: #64748b;
      margin: 0;
      line-height: 1.4;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #94a3b8;
      padding: 0.2rem;
      line-height: 1;
    }

    .btn-close:hover {
      color: #000000;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
    }

    .modal-form .form-input {
      padding: 0.75rem 1rem;
    }

    .subdomain-input-group {
      display: flex;
      align-items: center;
    }

    .subdomain-input {
      border-top-right-radius: 0 !important;
      border-bottom-right-radius: 0 !important;
    }

    .subdomain-suffix {
      background: #f1f5f9;
      border: 1px solid #d1d5db;
      border-left: none;
      color: #64748b;
      font-size: 0.78rem;
      font-weight: 600;
      padding: 0.75rem 0.85rem;
      border-top-right-radius: 8px;
      border-bottom-right-radius: 8px;
    }

    .form-select {
      width: 100%;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      color: #111827;
      padding: 0.75rem 1rem;
      font-size: 0.88rem;
      outline: none;
      box-sizing: border-box;
    }

    .form-select:focus {
      border-color: #000000;
    }

    .field-hint {
      font-size: 0.72rem;
      color: #94a3b8;
      margin-top: 0.2rem;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid #f1f5f9;
    }

    .btn-cancel {
      padding: 0.7rem 1.25rem;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      color: #4b5563;
      font-size: 0.84rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-cancel:hover {
      background: #f9fafb;
    }

    .btn-confirm-register {
      padding: 0.7rem 1.4rem;
      background: #000000;
      border: 1px solid #000000;
      border-radius: 8px;
      color: #ffffff;
      font-size: 0.84rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-confirm-register:hover:not(:disabled) {
      background: #27272a;
    }

    .btn-confirm-register:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class LoginPageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly saasService = inject(SaasService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  email = '';
  password = '';

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly registroExitosoMensaje = signal<string | null>(null);

  // Modal Registro Empresa (CU02)
  readonly showRegistroModal = signal(false);
  readonly isRegistering = signal(false);
  readonly registroError = signal<string | null>(null);
  readonly planes = signal<PlanSuscripcionModel[]>([]);

  nuevaEmpresa = {
    razon_social: '',
    nit: '',
    subdominio: '',
    email_corporativo: '',
    plan_id: 2,
    admin_password: 'Password123!'
  };

  ngOnInit(): void {
    // 1. Cargar planes disponibles para el registro de boutique
    this.saasService.getPlanes().subscribe({
      next: (data) => this.planes.set(data),
      error: () => {
        this.planes.set([
          { id: 1, codigo: 'BASICO', nombre: 'Plan Básico Emprendedor', precio_mensual: 29.99, limite_sucursales: 2, permite_ia: false, permite_offline: false, activo: true },
          { id: 2, codigo: 'INTERMEDIO', nombre: 'Plan Profesional Multitienda', precio_mensual: 79.99, limite_sucursales: 10, permite_ia: true, permite_offline: true, activo: true },
          { id: 3, codigo: 'VIP', nombre: 'Plan Corporativo VIP', precio_mensual: 199.99, limite_sucursales: 999, permite_ia: true, permite_offline: true, activo: true }
        ]);
      }
    });

    // 2. Verificar queryParams
    const qp = this.route.snapshot.queryParams;
    if (qp['expired'] === 'true') {
      this.errorMessage.set('Tu sesión ha expirado por inactividad. Por favor volvé a ingresar.');
    }
    if (qp['registrar'] === 'true') {
      this.abrirModalRegistro();
      if (qp['planId']) {
        this.nuevaEmpresa.plan_id = +qp['planId'];
      }
    }
  }

  abrirModalRegistro(): void {
    this.registroError.set(null);
    this.showRegistroModal.set(true);
  }

  cerrarModalRegistro(): void {
    this.showRegistroModal.set(false);
    this.registroError.set(null);
  }

  crearEmpresaSubmit(): void {
    if (!this.nuevaEmpresa.razon_social || !this.nuevaEmpresa.nit || !this.nuevaEmpresa.subdominio || !this.nuevaEmpresa.email_corporativo) {
      this.registroError.set('Por favor completa todos los campos requeridos: Razón Social, NIT, Subdominio y Correo.');
      return;
    }

    this.isRegistering.set(true);
    this.registroError.set(null);

    this.saasService.crearEmpresa(this.nuevaEmpresa).subscribe({
      next: (res: any) => {
        this.isRegistering.set(false);
        this.showRegistroModal.set(false);
        this.email = res.email_corporativo;
        this.password = this.nuevaEmpresa.admin_password || 'Password123!';
        this.registroExitosoMensaje.set(
          `¡Tienda "${res.razon_social}" (Tenant #${res.id}) creada con éxito con subdominio ${res.subdominio}.atelieros.bo! Tus credenciales han sido precargadas abajo. Haz clic en "Iniciar Sesión" para ingresar a tu consola.`
        );
        this.errorMessage.set(null);
      },
      error: (err) => {
        this.isRegistering.set(false);
        const detail = err.error?.detail || 'Error al registrar la empresa. Verifica que el NIT, subdominio o correo no estén registrados previamente.';
        this.registroError.set(detail);
      }
    });
  }

  fillRole(role: 'ADMIN' | 'ENCARGADO' | 'CAJERO' | 'CLIENTE' | 'VELVET'): void {
    if (role === 'ADMIN') {
      this.email = 'AdminFashion@gmail.com';
      this.password = 'Admin123';
    } else if (role === 'ENCARGADO') {
      this.email = 'EncargadoFashion@gmail.com';
      this.password = 'Encargado123';
    } else if (role === 'CAJERO') {
      this.email = 'CajeroFashion@gmail.com';
      this.password = 'Cajero123';
    } else if (role === 'VELVET') {
      this.email = 'VelvetNight@gmail.com';
      this.password = 'Velvet123';
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
      next: () => {
        this.isLoading.set(false);
        // Redirección al catálogo o dashboard según rol
        this.router.navigate(['/catalogo']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const currentUrl = localStorage.getItem('API_URL') || 'https://fashionstore-backend-48fs.onrender.com/api/v1';
        const detail = err.status === 0
          ? `No se pudo conectar con el backend (${currentUrl}). Verifique que el servicio esté activo en Render o configure la URL correcta.`
          : (err.error?.detail || 'Error al autenticar. Verifique sus credenciales.');
        this.errorMessage.set(detail);
      }
    });
  }

  changeBackendUrl(): void {
    const current = localStorage.getItem('API_URL') || 'https://fashionstore-backend-48fs.onrender.com/api/v1';
    const input = window.prompt(
      'Ingrese la URL de su Backend en Render (ej: https://fashionstore-backend-xxxx.onrender.com/api/v1):',
      current
    );
    if (input && input.trim()) {
      let url = input.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      if (!url.endsWith('/api/v1')) {
        url = url.replace(/\/+$/, '') + '/api/v1';
      }
      localStorage.setItem('API_URL', url);
      window.location.reload();
    }
  }
}
