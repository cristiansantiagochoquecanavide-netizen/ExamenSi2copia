// ==============================================================================
// CASOS DE USO:
// - CU01: ADMINISTRAR PLANES DE SUSCRIPCIÓN
// - CU02: REGISTRAR EMPRESA CONTRATANTE (TENANT)
// - CU03: GESTIONAR SUSCRIPCIÓN Y ESTADO DE CUENTA
// ROL: Superadministrador SaaS / Admin Tenant
// CAPA MVC: [VISTA & VIEWCONTROLLER ANGULAR]
// ==============================================================================

// ==============================================================================
// CASOS DE USO:
// - CU01: ADMINISTRAR PLANES DE SUSCRIPCIÓN
// - CU02: REGISTRAR EMPRESA CONTRATANTE (TENANT)
// - CU03: GESTIONAR SUSCRIPCIÓN Y ESTADO DE CUENTA
// ROL: Superadministrador SaaS / Admin Tenant
// CAPA MVC: [VISTA & VIEWCONTROLLER ANGULAR]
// ==============================================================================

import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SaasService, PlanSuscripcionModel, PoliticaGarantiaModel, SucursalTenantModel } from '../../core/services/saas.service';

@Component({
  selector: 'app-saas-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="saas-viewport">
      <!-- HEADER PRINCIPAL -->
      <header class="saas-header">
        <div class="saas-header-content">
          <div class="badge-cluster">
            <span class="saas-badge">ARQUITECTURA SAAS MULTITENANT &bull; INF412</span>
            <span class="tenant-active-tag" [class.urban]="authService.currentTenant().empresaId === 2">
              <span class="material-symbols-outlined header-tag-icon">domain</span> {{ authService.currentTenant().nombreEmpresa }}
            </span>
          </div>
          <h1 class="saas-title">Gestión de Suscripciones &amp; Plataforma SaaS</h1>
          <p class="saas-subtitle">
            Administración de planes contratados, políticas de garantía de cambio (RN07), aislamiento por tenant y límites de sucursales (RN08).
          </p>
        </div>

        <!-- STATS RÁPIDOS DEL TENANT -->
        <div class="tenant-quick-stats">
          <div class="stat-card">
            <span class="stat-label">PLAN ACTUAL</span>
            <span class="stat-value gold">{{ authService.currentTenant().planCodigo }}</span>
            <span class="stat-hint">Subdominio: {{ authService.currentTenant().subdominio }}.fashionstore.bo</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">CUOTA SUCURSALES</span>
            <span class="stat-value">{{ sucursales().length }} / {{ getLimiteSucursales() }}</span>
            <span class="stat-hint">{{ getCuotaStatusText() }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">MODO OFFLINE</span>
            <span class="stat-value" [class.success]="authService.currentTenant().permiteOffline" [class.muted]="!authService.currentTenant().permiteOffline">
              {{ authService.currentTenant().permiteOffline ? 'HABILITADO' : 'NO INCLUIDO' }}
            </span>
            <span class="stat-hint">PWA Angular e IndexedDB</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">IA GENERATIVA</span>
            <span class="stat-value" [class.success]="authService.currentTenant().permiteIa" [class.muted]="!authService.currentTenant().permiteIa">
              {{ authService.currentTenant().permiteIa ? 'ACTIVA' : 'NO INCLUIDA' }}
            </span>
            <span class="stat-hint">Google Gemini &amp; ML</span>
          </div>
        </div>
      </header>

      <!-- BARRA DE PESTAÑAS (TABS) -->
      <nav class="saas-tabs-nav">
        <button 
          type="button" 
          class="tab-btn" 
          [class.active]="activeTab() === 'PLANES'" 
          (click)="activeTab.set('PLANES')">
          <span class="material-symbols-outlined tab-icon">workspace_premium</span> Planes de Suscripción (CU01)
        </button>
        <button 
          type="button" 
          class="tab-btn" 
          [class.active]="activeTab() === 'EMPRESA'" 
          (click)="activeTab.set('EMPRESA')">
          <span class="material-symbols-outlined tab-icon">apartment</span> Mi Empresa &amp; Tenant (CU02/CU03)
        </button>
        <button 
          type="button" 
          class="tab-btn" 
          [class.active]="activeTab() === 'GARANTIA'" 
          (click)="activeTab.set('GARANTIA')">
          <span class="material-symbols-outlined tab-icon">verified_user</span> Políticas de Garantía (RN07)
        </button>
        <button 
          type="button" 
          class="tab-btn" 
          [class.active]="activeTab() === 'SUCURSALES'" 
          (click)="activeTab.set('SUCURSALES')">
          <span class="material-symbols-outlined tab-icon">store</span> Límites de Sucursales (CU04 / RN08)
        </button>
      </nav>

      <!-- MENSAJES DE ALERTA -->
      @if (alertMessage()) {
        <div class="alert-box" [class.error]="isAlertError()">
          <span class="material-symbols-outlined alert-icon">{{ isAlertError() ? 'error' : 'check_circle' }}</span>
          <span>{{ alertMessage() }}</span>
          <button type="button" class="alert-close" (click)="alertMessage.set(null)">&times;</button>
        </div>
      }

      <!-- TAB 1: PLANES DE SUSCRIPCIÓN (CU01) -->
      @if (activeTab() === 'PLANES') {
        <section class="tab-section">
          <div class="section-header-row">
            <div class="section-heading">
              <h2>Planes de Suscripción Multitenant</h2>
              <p>Estructura de precios, cuotas de infraestructura y capacidades tecnológicas configuradas en PostgreSQL.</p>
            </div>
            <button type="button" class="btn-create-top" (click)="showCrearPlanModal.set(true)">
              + Crear Nuevo Plan (CU01)
            </button>
          </div>

          <div class="plans-grid">
            @for (plan of planes(); track plan.id) {
              <div class="plan-card" [class.current-plan]="isCurrentPlan(plan.codigo)">
                @if (isCurrentPlan(plan.codigo)) {
                  <span class="current-plan-ribbon">TU PLAN CONTRATADO</span>
                }
                <div class="plan-card-header">
                  <span class="plan-tier">{{ plan.codigo }}</span>
                  <h3 class="plan-name">{{ plan.nombre }}</h3>
                  <div class="plan-pricing">
                    <span class="currency">$</span>
                    <span class="amount">{{ plan.precio_mensual | number:'1.2-2' }}</span>
                    <span class="period">/ mes</span>
                  </div>
                  <p class="plan-desc">{{ plan.descripcion }}</p>
                </div>

                <div class="plan-features-list">
                  <div class="feature-item">
                    <span class="material-symbols-outlined feature-check">check</span>
                    <span><strong>Límite de Sucursales:</strong> {{ plan.limite_sucursales >= 999 ? 'Ilimitadas' : plan.limite_sucursales + ' sucursales físicas' }}</span>
                  </div>
                  <div class="feature-item">
                    <span class="material-symbols-outlined feature-check" [class.disabled]="!plan.permite_offline">{{ plan.permite_offline ? 'check' : 'close' }}</span>
                    <span>Modo Offline PWA &amp; SQLite Móvil</span>
                  </div>
                  <div class="feature-item">
                    <span class="material-symbols-outlined feature-check" [class.disabled]="!plan.permite_ia">{{ plan.permite_ia ? 'check' : 'close' }}</span>
                    <span>Asistente con IA Generativa (Google Gemini)</span>
                  </div>
                  <div class="feature-item">
                    <span class="material-symbols-outlined feature-check">check</span>
                    <span>Aislamiento estricto de base de datos por Tenant</span>
                  </div>
                  <div class="feature-item">
                    <span class="material-symbols-outlined feature-check">check</span>
                    <span>Guía anatómica de medidas en cm para prendas</span>
                  </div>
                </div>

                <div class="plan-action-box">
                  @if (isCurrentPlan(plan.codigo)) {
                    <button type="button" class="btn-plan-action current" disabled>Plan Activo</button>
                  } @else {
                    <button type="button" class="btn-plan-action upgrade" (click)="solicitarUpgrade(plan.codigo)">
                      Migrar a {{ plan.nombre }}
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        </section>
      }

      <!-- TAB 2: MI EMPRESA & TENANT (CU02 / CU03) -->
      @if (activeTab() === 'EMPRESA') {
        <section class="tab-section">
          <div class="section-header-row">
            <div class="section-heading">
              <h2>Identidad de la Empresa &amp; Suscripción SaaS</h2>
              <p>Aislamiento de catálogo, sucursales y personal asignados al Tenant {{ authService.currentTenant().empresaId }}.</p>
            </div>
            <div class="btn-actions-row">
              <button type="button" class="btn-action-renew" (click)="renovarSuscripcion()">
                <span class="material-symbols-outlined icon-inline">autorenew</span> Renovar Suscripción (CU03)
              </button>
              <button type="button" class="btn-create-top" (click)="showCrearEmpresaModal.set(true)">
                + Registrar Empresa Tenant (CU02)
              </button>
            </div>
          </div>

          <div class="tenant-details-card">
            <div class="tenant-info-grid">
              <div class="info-group">
                <label>RAZÓN SOCIAL</label>
                <div class="info-value">{{ authService.currentTenant().nombreEmpresa }}</div>
              </div>
              <div class="info-group">
                <label>NIT CORPORATIVO</label>
                <div class="info-value">{{ authService.currentUser()?.ci_nit || (authService.currentTenant().empresaId === 2 ? '9876543210' : '1029384756') }}</div>
              </div>
              <div class="info-group">
                <label>SUBDOMINIO MULTITENANT</label>
                <div class="info-value badge-subdomain">
                  https://{{ authService.currentTenant().subdominio }}.fashionstore.bo
                </div>
              </div>
              <div class="info-group">
                <label>EMAIL DE CONTACTO</label>
                <div class="info-value">{{ authService.currentUser()?.email || (authService.currentTenant().empresaId === 2 ? 'VelvetNight@gmail.com' : 'AdminFashion@gmail.com') }}</div>
              </div>
              <div class="info-group">
                <label>ESTADO DE SUSCRIPCIÓN</label>
                <div class="info-value"><span class="badge-status-active">ACTIVA &bull; Renovación Anual</span></div>
              </div>
              <div class="info-group">
                <label>POLÍTICA DE CALCE</label>
                <div class="info-value">Guía Anatómica en cm + Garantía 7 días</div>
              </div>
            </div>

            <div class="tenant-isolation-banner">
              <span class="material-symbols-outlined shield-icon">security</span>
              <div class="isolation-text">
                <strong>Garantía de Aislamiento de Datos (Multi-Tenant Data Isolation)</strong>
                <p>
                  Todas las consultas SQL ejecutadas por este usuario se filtran automáticamente con 
                  <code>WHERE empresa_id = {{ authService.currentTenant().empresaId }}</code> en FastAPI y PostgreSQL. 
                  Los clientes, stock, ventas y bitácoras de este tenant son invisibles para cualquier otra empresa registrada.
                </p>
              </div>
            </div>
          </div>
        </section>
      }

      <!-- TAB 3: POLÍTICAS DE GARANTÍA (CU18 / RN07) -->
      @if (activeTab() === 'GARANTIA') {
        <section class="tab-section">
          <div class="section-heading">
            <h2>Políticas de Garantía y Devolución de Prendas</h2>
            <p>Reglas de negocio parametrizables por empresa con cumplimiento estricto de la regla académica RN07.</p>
          </div>

          <div class="policy-card">
            <!-- ALERTA REGLA RN07 -->
            <div class="rn07-highlight-box">
              <span class="rn07-tag">REGLA DE NEGOCIO OBLIGATORIA &bull; RN07</span>
              <h3 class="rn07-title">Prohibición Absoluta de Reembolso de Dinero</h3>
              <p class="rn07-desc">
                Bajo ninguna circunstancia la plataforma emite devoluciones monetarias en efectivo ni reintegros a tarjetas bancarias. 
                Las devoluciones por calce se tramitan mediante <strong>Notas de Devolución</strong> para reingreso a stock y cambio directo por otra talla, o saldo a favor en cuenta de tienda.
              </p>
            </div>

            <form (ngSubmit)="guardarPolitica()" class="policy-form">
              <div class="policy-field-group">
                <label for="plazoDias">PLAZO MÁXIMO PARA CAMBIO DE TALLA (DÍAS CALENDARIO):</label>
                <div class="input-with-hint">
                  <input 
                    id="plazoDias" 
                    type="number" 
                    [(ngModel)]="politicaDias" 
                    name="politicaDias" 
                    min="1" 
                    max="60" 
                    required 
                    class="form-control" />
                  <span class="field-hint">Días contados desde la emisión de la nota de venta o entrega.</span>
                </div>
              </div>

              <div class="policy-toggle-row">
                <div class="toggle-info">
                  <strong>Permite Cambio por Talla / Guía de Medidas</strong>
                  <span>El cliente puede solicitar otra talla presentando la prenda en probador.</span>
                </div>
                <span class="toggle-state active">HABILITADO</span>
              </div>

              <div class="policy-toggle-row">
                <div class="toggle-info">
                  <strong>Exige Etiqueta Original Intacta</strong>
                  <span>La prenda no debe presentar signos de uso ni lavado.</span>
                </div>
                <span class="toggle-state active">OBLIGATORIO</span>
              </div>

              <div class="policy-toggle-row disabled">
                <div class="toggle-info">
                  <strong>Admite Reembolso en Dinero en Efectivo</strong>
                  <span class="error-text">Inmutable por sistema para cumplimiento de la regla RN07.</span>
                </div>
                <span class="toggle-state locked">BLOQUEADO POR RN07</span>
              </div>

              <div class="policy-actions">
                <button type="submit" class="btn-save-policy" [disabled]="isSavingPolicy()">
                  {{ isSavingPolicy() ? 'Guardando...' : 'Actualizar Plazo de Garantía' }}
                </button>
              </div>
            </form>
          </div>
        </section>
      }

      <!-- TAB 4: SUCURSALES Y CONTROL DE CUOTAS (CU04 / RN08) -->
      @if (activeTab() === 'SUCURSALES') {
        <section class="tab-section">
          <div class="section-heading">
            <h2>Límites de Sucursales por Plan de Suscripción</h2>
            <p>Validación de cuota en backend según el plan contratado (Plan Básico: máx 2 | Plan Profesional: máx 10).</p>
          </div>

          <!-- BANNER DE CUOTA -->
          <div class="quota-meter-box" [class.limit-reached]="sucursales().length >= getLimiteSucursales()">
            <div class="quota-header">
              <div>
                <span class="quota-eyebrow">PLAN CONTRATADO: {{ authService.currentTenant().planCodigo }}</span>
                <h3 class="quota-title">
                  {{ sucursales().length }} de {{ getLimiteSucursales() }} Sucursales Activas
                </h3>
              </div>
              <span class="quota-percentage">
                {{ getCuotaPorcentaje() }}% de Capacidad
              </span>
            </div>

            <!-- BARRA DE PROGRESO -->
            <div class="quota-progress-track">
              <div class="quota-progress-fill" [style.width.%]="getCuotaPorcentaje()"></div>
            </div>

            @if (sucursales().length >= getLimiteSucursales()) {
              <div class="quota-warning">
                <span class="material-symbols-outlined icon-inline">warning</span> <strong>Límite de cuota alcanzado:</strong> Tu empresa ha utilizado el total de sucursales permitidas por el Plan {{ authService.currentTenant().planCodigo }}. 
                Cualquier intento de crear una nueva sucursal será rechazado con <code>HTTP 400 Bad Request</code>.
              </div>
            } @else {
              <div class="quota-ok">
                <span class="material-symbols-outlined icon-inline">check_circle</span> Tu plan actual te permite registrar <strong>{{ getLimiteSucursales() - sucursales().length }}</strong> sucursal(es) adicional(es).
              </div>
            }
          </div>

          <!-- FORMULARIO DE PRUEBA DE CREACIÓN DE SUCURSAL -->
          <div class="branch-create-box">
            <h3>Registrar Nueva Sucursal (Verificación de Regla RN08)</h3>
            <form (ngSubmit)="intentarCrearSucursal()" class="branch-form">
              <div class="form-row">
                <div class="form-group">
                  <label for="nuevaSucNombre">NOMBRE SUCURSAL</label>
                  <input id="nuevaSucNombre" type="text" [(ngModel)]="nuevaSucNombre" name="nuevaSucNombre" placeholder="Ej. Sucursal Mall Las Brisas" required class="form-control" />
                </div>
                <div class="form-group">
                  <label for="nuevaSucDir">DIRECCIÓN</label>
                  <input id="nuevaSucDir" type="text" [(ngModel)]="nuevaSucDir" name="nuevaSucDir" placeholder="Ej. 4to Anillo, Planta Baja" required class="form-control" />
                </div>
                <div class="form-group">
                  <label for="nuevaSucTel">TELÉFONO</label>
                  <input id="nuevaSucTel" type="text" [(ngModel)]="nuevaSucTel" name="nuevaSucTel" placeholder="Ej. +591-70011223" class="form-control" />
                </div>
              </div>
              <div class="form-actions">
                <button type="submit" class="btn-create-branch" [disabled]="isCreatingBranch()">
                  {{ isCreatingBranch() ? 'Validando con Backend...' : '+ Registrar Sucursal con Validación de Cuota' }}
                </button>
              </div>
            </form>
          </div>

          <!-- LISTA DE SUCURSALES ACTIVAS -->
          <div class="branches-list-table">
            <h3>Sucursales Registradas para este Tenant</h3>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre Sucursal</th>
                  <th>Dirección</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (suc of sucursales(); track suc.id) {
                  <tr>
                    <td>#{{ suc.id }}</td>
                    <td><strong>{{ suc.nombre }}</strong></td>
                    <td>{{ suc.direccion }}</td>
                    <td>{{ suc.telefono || 'Sin teléfono' }}</td>
                    <td><span class="badge-active">OPERATIVA</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      <!-- MODAL CREAR PLAN (CU01) -->
      @if (showCrearPlanModal()) {
        <div class="saas-modal-backdrop" (click)="showCrearPlanModal.set(false)">
          <div class="saas-modal-card" (click)="$event.stopPropagation()">
            <div class="modal-card-header">
              <h3>Crear Nuevo Plan de Suscripción (CU01)</h3>
              <button type="button" class="btn-close-modal" (click)="showCrearPlanModal.set(false)">&times;</button>
            </div>
            <form (ngSubmit)="guardarPlan()" class="modal-form">
              <div class="form-group">
                <label>CÓDIGO ÚNICO</label>
                <input type="text" [(ngModel)]="nuevoPlan.codigo" name="planCodigo" placeholder="Ej. VIP_PLUS" required class="form-control" />
              </div>
              <div class="form-group">
                <label>NOMBRE COMERCIAL</label>
                <input type="text" [(ngModel)]="nuevoPlan.nombre" name="planNombre" placeholder="Ej. Plan Expansión Total" required class="form-control" />
              </div>
              <div class="form-group">
                <label>PRECIO MENSUAL ($ USD)</label>
                <input type="number" step="0.01" [(ngModel)]="nuevoPlan.precio_mensual" name="planPrecio" required class="form-control" />
              </div>
              <div class="form-group">
                <label>LÍMITE MÁXIMO DE SUCURSALES</label>
                <input type="number" min="1" [(ngModel)]="nuevoPlan.limite_sucursales" name="planLimite" required class="form-control" />
              </div>
              <div class="form-group">
                <label>DESCRIPCIÓN</label>
                <textarea [(ngModel)]="nuevoPlan.descripcion" name="planDesc" rows="2" class="form-control"></textarea>
              </div>
              <div class="checkbox-cluster">
                <label><input type="checkbox" [(ngModel)]="nuevoPlan.permite_offline" name="planOffline" /> Modo Offline (PWA &amp; SQLite)</label>
                <label><input type="checkbox" [(ngModel)]="nuevoPlan.permite_ia" name="planIa" /> Acceso a IA Generativa</label>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-secondary" (click)="showCrearPlanModal.set(false)">Cancelar</button>
                <button type="submit" class="btn-primary" [disabled]="isSavingPlan()">{{ isSavingPlan() ? 'Guardando...' : 'Crear Plan' }}</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- MODAL REGISTRAR EMPRESA / TENANT (CU02) -->
      @if (showCrearEmpresaModal()) {
        <div class="saas-modal-backdrop" (click)="showCrearEmpresaModal.set(false)">
          <div class="saas-modal-card" (click)="$event.stopPropagation()">
            <div class="modal-card-header">
              <h3>Registrar Nueva Empresa Contratante (Tenant CU02)</h3>
              <button type="button" class="btn-close-modal" (click)="showCrearEmpresaModal.set(false)">&times;</button>
            </div>
            <form (ngSubmit)="guardarEmpresa()" class="modal-form">
              <div class="form-group">
                <label>RAZÓN SOCIAL</label>
                <input type="text" [(ngModel)]="nuevaEmpresa.razon_social" name="empRazon" placeholder="Ej. Streetwear Bolivia S.R.L." required class="form-control" />
              </div>
              <div class="form-group">
                <label>NIT CORPORATIVO</label>
                <input type="text" [(ngModel)]="nuevaEmpresa.nit" name="empNit" placeholder="Ej. 1234567890" required class="form-control" />
              </div>
              <div class="form-group">
                <label>SUBDOMINIO (aislamiento multitenant)</label>
                <input type="text" [(ngModel)]="nuevaEmpresa.subdominio" name="empSub" placeholder="Ej. streetwear" required class="form-control" />
              </div>
              <div class="form-group">
                <label>CORREO CORPORATIVO (ADMIN)</label>
                <input type="email" [(ngModel)]="nuevaEmpresa.email_corporativo" name="empEmail" placeholder="admin@streetwear.bo" required class="form-control" />
              </div>
              <div class="form-group">
                <label>PLAN INICIAL</label>
                <select [(ngModel)]="nuevaEmpresa.plan_id" name="empPlan" class="form-control">
                  @for (p of planes(); track p.id) {
                    <option [value]="p.id">{{ p.nombre }} ({{ p.codigo }} - {{ p.limite_sucursales }} sucursales)</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>CONTRASEÑA INICIAL ADMIN</label>
                <input type="password" [(ngModel)]="nuevaEmpresa.admin_password" name="empPass" placeholder="Password123!" class="form-control" />
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-secondary" (click)="showCrearEmpresaModal.set(false)">Cancelar</button>
                <button type="submit" class="btn-primary" [disabled]="isSavingEmpresa()">{{ isSavingEmpresa() ? 'Registrando...' : 'Registrar Empresa' }}</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .saas-viewport {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem 1rem 3rem;
      color: #1a1a1a;
      font-family: inherit;
      box-sizing: border-box;
    }

    /* HEADER */
    .saas-header {
      margin-bottom: 1.5rem;
    }
    .badge-cluster {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }
    .saas-badge {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      background: #000;
      color: #fff;
      padding: 0.3rem 0.75rem;
      border-radius: 4px;
    }
    .tenant-active-tag {
      font-size: 0.8rem;
      font-weight: 600;
      background: #eef2ff;
      color: #3730a3;
      padding: 0.3rem 0.75rem;
      border-radius: 4px;
      border: 1px solid #c7d2fe;
    }
    .tenant-active-tag.urban {
      background: #f0fdf4;
      color: #166534;
      border-color: #bbf7d0;
    }
    .saas-title {
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0 0 0.35rem;
      color: #0f172a;
    }
    .saas-subtitle {
      font-size: 0.9rem;
      color: #64748b;
      margin: 0 0 1.25rem;
      max-width: 800px;
      line-height: 1.4;
    }

    /* QUICK STATS */
    .tenant-quick-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }
    .stat-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    .stat-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.05em;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
    }
    .stat-value.gold {
      color: #b45309;
    }
    .stat-value.success {
      color: #15803d;
    }
    .stat-value.muted {
      color: #94a3b8;
    }
    .stat-hint {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    /* TABS */
    .saas-tabs-nav {
      display: flex;
      gap: 0.5rem;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 2.5rem;
      overflow-x: auto;
    }
    .tab-btn {
      background: transparent;
      border: none;
      border-bottom: 3px solid transparent;
      padding: 0.85rem 1.25rem;
      font-size: 0.95rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      white-space: nowrap;
      transition: all 0.2s ease;
      margin-bottom: -2px;
    }
    .tab-btn:hover {
      color: #0f172a;
    }
    .tab-btn .tab-icon {
      font-size: 18px;
      line-height: 1;
    }
    .tab-btn.active {
      color: #0f172a;
      border-bottom-color: #000;
      font-weight: 700;
    }

    /* ALERT */
    .alert-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      padding: 1rem 1.25rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.95rem;
    }
    .alert-box.error {
      background: #fef2f2;
      border-color: #fecaca;
      color: #991b1b;
    }
    .alert-close {
      margin-left: auto;
      background: transparent;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      color: inherit;
    }

    /* SECTION HEADINGS */
    .section-heading {
      margin-bottom: 2rem;
    }
    .section-heading h2 {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 0.35rem;
    }
    .section-heading p {
      color: #64748b;
      margin: 0;
      font-size: 0.95rem;
    }

    /* TAB 1: PLANES */
    .plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }
    .plan-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 2rem;
      position: relative;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .plan-card:hover {
      box-shadow: 0 10px 25px rgba(0,0,0,0.06);
    }
    .plan-card.current-plan {
      border: 2px solid #000;
      background: #fafafa;
    }
    .current-plan-ribbon {
      position: absolute;
      top: -12px;
      right: 20px;
      background: #000;
      color: #fff;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      letter-spacing: 0.05em;
    }
    .plan-tier {
      font-size: 0.75rem;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 0.1em;
    }
    .plan-name {
      font-size: 1.35rem;
      font-weight: 800;
      margin: 0.35rem 0 1rem;
    }
    .plan-pricing {
      display: flex;
      align-items: baseline;
      gap: 0.25rem;
      margin-bottom: 1rem;
    }
    .currency {
      font-size: 1.25rem;
      font-weight: 700;
    }
    .amount {
      font-size: 2.25rem;
      font-weight: 900;
    }
    .period {
      color: #64748b;
      font-size: 0.9rem;
    }
    .plan-desc {
      font-size: 0.9rem;
      color: #64748b;
      line-height: 1.4;
      margin: 0 0 1.5rem;
      min-height: 40px;
    }
    .plan-features-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 2rem;
      flex-grow: 1;
    }
    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.9rem;
      color: #334155;
    }
    .feature-check {
      color: #16a34a;
      font-weight: 800;
    }
    .feature-check.disabled {
      color: #dc2626;
    }
    .btn-plan-action {
      width: 100%;
      padding: 0.85rem;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-plan-action.current {
      background: #e2e8f0;
      color: #475569;
      border: none;
      cursor: default;
    }
    .btn-plan-action.upgrade {
      background: #000;
      color: #fff;
      border: none;
    }
    .btn-plan-action.upgrade:hover {
      background: #27272a;
    }

    /* TAB 2: EMPRESA */
    .tenant-details-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 2rem;
    }
    .tenant-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .info-group label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748b;
      display: block;
      margin-bottom: 0.35rem;
    }
    .info-value {
      font-size: 1.05rem;
      font-weight: 600;
      color: #0f172a;
    }
    .badge-subdomain {
      font-family: monospace;
      color: #4338ca;
    }
    .badge-status-active {
      display: inline-block;
      background: #dcfce7;
      color: #15803d;
      font-size: 0.8rem;
      padding: 0.25rem 0.65rem;
      border-radius: 4px;
      font-weight: 700;
    }
    .tenant-isolation-banner {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1.25rem;
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }
    .shield-icon {
      font-size: 1.75rem;
    }
    .isolation-text p {
      margin: 0.35rem 0 0;
      font-size: 0.9rem;
      color: #64748b;
      line-height: 1.4;
    }

    /* TAB 3: GARANTÍA */
    .policy-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 2rem;
    }
    .rn07-highlight-box {
      background: #fff1f2;
      border-left: 4px solid #e11d48;
      padding: 1.25rem;
      border-radius: 0 8px 8px 0;
      margin-bottom: 2rem;
    }
    .rn07-tag {
      font-size: 0.7rem;
      font-weight: 800;
      color: #e11d48;
      letter-spacing: 0.05em;
    }
    .rn07-title {
      font-size: 1.2rem;
      font-weight: 800;
      color: #881337;
      margin: 0.35rem 0;
    }
    .rn07-desc {
      font-size: 0.9rem;
      color: #4c0519;
      margin: 0;
      line-height: 1.4;
    }
    .policy-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .policy-field-group label {
      font-size: 0.85rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      display: block;
    }
    .form-control {
      width: 100%;
      max-width: 320px;
      padding: 0.75rem 1rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 1rem;
    }
    .field-hint {
      font-size: 0.8rem;
      color: #64748b;
      margin-top: 0.35rem;
      display: block;
    }
    .policy-toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .toggle-info strong {
      display: block;
      font-size: 0.95rem;
    }
    .toggle-info span {
      font-size: 0.85rem;
      color: #64748b;
    }
    .toggle-state.active {
      color: #16a34a;
      font-weight: 700;
    }
    .toggle-state.locked {
      color: #dc2626;
      font-weight: 800;
      background: #fee2e2;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }
    .btn-save-policy {
      background: #000;
      color: #fff;
      border: none;
      padding: 0.85rem 1.75rem;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
    }

    /* TAB 4: SUCURSALES & CUOTAS */
    .quota-meter-box {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.75rem;
      margin-bottom: 2rem;
    }
    .quota-meter-box.limit-reached {
      border-color: #fca5a5;
      background: #fff5f5;
    }
    .quota-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 1rem;
    }
    .quota-eyebrow {
      font-size: 0.75rem;
      font-weight: 800;
      color: #64748b;
    }
    .quota-title {
      font-size: 1.5rem;
      font-weight: 800;
      margin: 0.25rem 0 0;
    }
    .quota-percentage {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
    }
    .quota-progress-track {
      height: 12px;
      background: #e2e8f0;
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: 1rem;
    }
    .quota-progress-fill {
      height: 100%;
      background: #000;
      border-radius: 999px;
      transition: width 0.3s ease;
    }
    .quota-warning {
      color: #b91c1c;
      font-size: 0.9rem;
      line-height: 1.4;
    }
    .quota-ok {
      color: #15803d;
      font-size: 0.9rem;
    }
    .branch-create-box {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.75rem;
      margin-bottom: 2rem;
    }
    .branch-create-box h3 {
      margin: 0 0 1rem;
      font-size: 1.15rem;
    }
    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .btn-create-branch {
      background: #000;
      color: #fff;
      border: none;
      padding: 0.85rem 1.5rem;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
    }
    .branches-list-table {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.75rem;
    }
    .branches-list-table h3 {
      margin: 0 0 1rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
      font-size: 0.9rem;
    }
    th {
      font-weight: 700;
      color: #64748b;
      font-size: 0.8rem;
    }
    .badge-active {
      background: #dcfce7;
      color: #15803d;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }

    .section-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .btn-actions-row {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .btn-create-top {
      background: #000;
      color: #fff;
      border: 1px solid #000;
      padding: 0.65rem 1.25rem;
      border-radius: 6px;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-create-top:hover {
      background: #333;
    }
    .btn-action-renew {
      background: #eef2ff;
      color: #3730a3;
      border: 1px solid #c7d2fe;
      padding: 0.65rem 1.25rem;
      border-radius: 6px;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .btn-action-renew:hover {
      background: #e0e7ff;
    }
    .saas-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(3px);
    }
    .saas-modal-card {
      background: #ffffff;
      border-radius: 12px;
      width: 100%;
      max-width: 540px;
      padding: 28px 32px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      border: 1px solid #e2e8f0;
      box-sizing: border-box;
      max-height: 90vh;
      overflow-y: auto;
    }
    .modal-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid #f1f5f9;
    }
    .modal-card-header h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.01em;
    }
    .btn-close-modal {
      background: none;
      border: none;
      font-size: 1.6rem;
      cursor: pointer;
      color: #94a3b8;
      line-height: 1;
      padding: 2px 6px;
      border-radius: 4px;
      transition: color 0.15s ease;
    }
    .btn-close-modal:hover {
      color: #0f172a;
    }
    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      box-sizing: border-box;
    }
    .form-group label {
      display: block;
      color: #374151;
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      text-align: left;
      margin: 0;
    }
    .form-control {
      width: 100%;
      height: 42px;
      min-height: 42px;
      padding: 0.5rem 0.85rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.88rem;
      color: #111827;
      background-color: #ffffff;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .form-control:hover {
      border-color: #94a3b8;
    }
    .form-control:focus {
      border-color: #000000;
      box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.12);
    }
    .form-control::placeholder {
      color: #9ca3af;
      font-size: 0.85rem;
    }
    textarea.form-control {
      height: auto;
      min-height: 84px;
      resize: vertical;
    }
    .checkbox-cluster {
      display: flex;
      gap: 20px;
      align-items: center;
      flex-wrap: wrap;
      margin-top: 4px;
      margin-bottom: 4px;
      width: 100%;
    }
    .checkbox-cluster label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      text-transform: none;
      font-weight: 500;
      color: #374151;
      font-size: 0.82rem;
      letter-spacing: normal;
      user-select: none;
      margin: 0;
    }
    .checkbox-cluster input[type="checkbox"] {
      width: 18px;
      height: 18px;
      margin: 0;
      accent-color: #000000;
      cursor: pointer;
      flex-shrink: 0;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px solid #f1f5f9;
      width: 100%;
      box-sizing: border-box;
    }
    .btn-secondary {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 0.6rem 1.4rem;
      height: 42px;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .btn-secondary:hover {
      background: #f8fafc;
      border-color: #94a3b8;
      color: #0f172a;
    }
    .btn-primary {
      background: #000000;
      border: 1px solid #000000;
      color: #ffffff;
      padding: 0.6rem 1.6rem;
      height: 42px;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 0.85rem;
      letter-spacing: 0.04em;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .btn-primary:hover {
      background: #262626;
      transform: translateY(-1px);
    }
    .btn-primary:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      transform: none;
    }
  `]
})
export class SaasPageComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly saasService = inject(SaasService);

  readonly activeTab = signal<'PLANES' | 'EMPRESA' | 'GARANTIA' | 'SUCURSALES'>('PLANES');
  readonly planes = signal<PlanSuscripcionModel[]>([]);
  readonly sucursales = signal<SucursalTenantModel[]>([]);
  
  politicaDias: number = 7;
  readonly isSavingPolicy = signal<boolean>(false);
  readonly isCreatingBranch = signal<boolean>(false);
  
  readonly alertMessage = signal<string | null>(null);
  readonly isAlertError = signal<boolean>(false);

  // Form nueva sucursal
  nuevaSucNombre: string = '';
  nuevaSucDir: string = '';
  nuevaSucTel: string = '';

  // Form nuevo plan (CU01)
  readonly showCrearPlanModal = signal<boolean>(false);
  readonly isSavingPlan = signal<boolean>(false);
  nuevoPlan = {
    codigo: '',
    nombre: '',
    descripcion: '',
    precio_mensual: 49.99,
    limite_sucursales: 5,
    permite_ia: false,
    permite_offline: false
  };

  // Form nueva empresa tenant (CU02)
  readonly showCrearEmpresaModal = signal<boolean>(false);
  readonly isSavingEmpresa = signal<boolean>(false);
  nuevaEmpresa = {
    razon_social: '',
    nit: '',
    subdominio: '',
    email_corporativo: '',
    telefono: '',
    plan_id: 1,
    admin_password: 'Password123!'
  };

  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.cargarDatos();
    const qp = this.route.snapshot.queryParams;
    if (qp['registrar'] === 'true' || qp['planId']) {
      this.activeTab.set('EMPRESA');
      if (qp['planId']) {
        this.nuevaEmpresa.plan_id = +qp['planId'];
      }
      this.showCrearEmpresaModal.set(true);
    }
  }

  cargarDatos(): void {
    // 1. Cargar planes
    this.saasService.getPlanes().subscribe({
      next: (data) => this.planes.set(data),
      error: () => {
        // Fallback mock si la red falla
        this.planes.set([
          { id: 1, codigo: 'BASICO', nombre: 'Plan Básico Emprendedor', descripcion: 'Hasta 2 sucursales, catálogo y ventas estándar.', precio_mensual: 29.99, limite_sucursales: 2, permite_ia: false, permite_offline: false, activo: true },
          { id: 2, codigo: 'INTERMEDIO', nombre: 'Plan Profesional Multitienda', descripcion: 'Hasta 10 sucursales, PWA/Móvil offline y reportes.', precio_mensual: 79.99, limite_sucursales: 10, permite_ia: true, permite_offline: true, activo: true },
          { id: 3, codigo: 'VIP', nombre: 'Plan Corporativo VIP', descripcion: 'Sucursales ilimitadas, IA generativa y ML analítico.', precio_mensual: 199.99, limite_sucursales: 999, permite_ia: true, permite_offline: true, activo: true }
        ]);
      }
    });

    // 2. Cargar sucursales del tenant
    this.saasService.getSucursalesTenant().subscribe({
      next: (data) => this.sucursales.set(data),
      error: () => {}
    });

    // 3. Cargar política de garantía
    this.saasService.getPoliticaGarantia().subscribe({
      next: (pol) => {
        if (pol && pol.plazo_dias_cambio) {
          this.politicaDias = pol.plazo_dias_cambio;
        }
      },
      error: () => {}
    });
  }

  isCurrentPlan(codigo: string): boolean {
    return this.authService.currentTenant().planCodigo === codigo;
  }

  getLimiteSucursales(): number {
    const plan = this.authService.currentTenant().planCodigo;
    if (plan === 'BASICO') return 2;
    if (plan === 'INTERMEDIO') return 10;
    return 999;
  }

  getCuotaPorcentaje(): number {
    const lim = this.getLimiteSucursales();
    const count = this.sucursales().length;
    return Math.min(100, Math.round((count / lim) * 100));
  }

  getCuotaStatusText(): string {
    const lim = this.getLimiteSucursales();
    const count = this.sucursales().length;
    if (count >= lim) return 'Límite alcanzado';
    return `${lim - count} disponibles`;
  }

  guardarPolitica(): void {
    this.isSavingPolicy.set(true);
    this.saasService.actualizarPoliticaGarantia({ plazo_dias_cambio: this.politicaDias }).subscribe({
      next: () => {
        this.isSavingPolicy.set(false);
        this.isAlertError.set(false);
        this.alertMessage.set(`Política de garantía actualizada con éxito a ${this.politicaDias} días de cambio. Regla RN07 inmutable preservada.`);
      },
      error: (err) => {
        this.isSavingPolicy.set(false);
        this.isAlertError.set(true);
        this.alertMessage.set(err.error?.detail || 'Error al actualizar política de garantía.');
      }
    });
  }

  intentarCrearSucursal(): void {
    if (!this.nuevaSucNombre || !this.nuevaSucDir) return;
    this.isCreatingBranch.set(true);

    this.saasService.crearSucursalTenant({
      nombre: this.nuevaSucNombre,
      direccion: this.nuevaSucDir,
      telefono: this.nuevaSucTel,
      horario_atencion: '09:00 - 20:00',
      capacidad_probadores: 3,
      ciudad_id: 1
    }).subscribe({
      next: (suc) => {
        this.isCreatingBranch.set(false);
        this.isAlertError.set(false);
        this.alertMessage.set(`¡Sucursal "${suc.nombre}" creada con éxito respetando la cuota del Plan ${this.authService.currentTenant().planCodigo}!`);
        this.nuevaSucNombre = '';
        this.nuevaSucDir = '';
        this.nuevaSucTel = '';
        this.cargarDatos();
      },
      error: (err) => {
        this.isCreatingBranch.set(false);
        this.isAlertError.set(true);
        const detail = err.error?.detail || 'Error al crear sucursal.';
        this.alertMessage.set(`Control de Cuotas (RN08): ${detail}`);
      }
    });
  }

  solicitarUpgrade(codigo: string): void {
    const targetPlan = this.planes().find(p => p.codigo === codigo);
    if (!targetPlan) return;

    this.isAlertError.set(false);
    this.alertMessage.set(`Procesando migración a ${targetPlan.nombre}...`);

    this.saasService.cambiarPlan(targetPlan.id).subscribe({
      next: (res) => {
        if (res.access_token) {
          this.authService.updateToken(res.access_token);
        } else {
          this.authService.updateTenantInfo({
            planCodigo: res.plan_codigo,
            permiteIa: res.permite_ia,
            permiteOffline: res.permite_offline
          });
        }
        this.isAlertError.set(false);
        this.alertMessage.set(`¡Migración exitosa! Tu empresa ahora opera bajo el Plan ${res.plan_nombre} (${res.plan_codigo}) con límite de ${res.limite_sucursales} sucursales.`);
        this.cargarDatos();
      },
      error: (err) => {
        this.isAlertError.set(true);
        this.alertMessage.set(err.error?.detail || `Error al cambiar al plan ${targetPlan.nombre}.`);
      }
    });
  }

  renovarSuscripcion(): void {
    this.isAlertError.set(false);
    this.alertMessage.set('Renovando suscripción anual...');
    this.saasService.renovarSuscripcion().subscribe({
      next: (res) => {
        this.isAlertError.set(false);
        this.alertMessage.set(`¡Suscripción renovada con éxito! Nueva vigencia hasta el ${res.fecha_fin} (${res.dias_restantes} días restantes).`);
        this.cargarDatos();
      },
      error: (err) => {
        this.isAlertError.set(true);
        this.alertMessage.set(err.error?.detail || 'Error al renovar suscripción.');
      }
    });
  }

  guardarPlan(): void {
    if (!this.nuevoPlan.codigo || !this.nuevoPlan.nombre || !this.nuevoPlan.precio_mensual) {
      this.isAlertError.set(true);
      this.alertMessage.set('Por favor completa código, nombre y precio del plan.');
      return;
    }
    this.isSavingPlan.set(true);
    this.saasService.crearPlan(this.nuevoPlan).subscribe({
      next: (res) => {
        this.isSavingPlan.set(false);
        this.showCrearPlanModal.set(false);
        this.isAlertError.set(false);
        this.alertMessage.set(`¡Plan "${res.nombre}" (${res.codigo}) creado exitosamente!`);
        this.nuevoPlan = { codigo: '', nombre: '', descripcion: '', precio_mensual: 49.99, limite_sucursales: 5, permite_ia: false, permite_offline: false };
        this.cargarDatos();
      },
      error: (err) => {
        this.isSavingPlan.set(false);
        this.isAlertError.set(true);
        this.alertMessage.set(err.error?.detail || 'Error al crear plan de suscripción.');
      }
    });
  }

  guardarEmpresa(): void {
    if (!this.nuevaEmpresa.razon_social || !this.nuevaEmpresa.nit || !this.nuevaEmpresa.subdominio || !this.nuevaEmpresa.email_corporativo) {
      this.isAlertError.set(true);
      this.alertMessage.set('Por favor completa razón social, NIT, subdominio y correo de la empresa.');
      return;
    }
    this.isSavingEmpresa.set(true);
    this.saasService.crearEmpresa(this.nuevaEmpresa).subscribe({
      next: (res: any) => {
        this.isSavingEmpresa.set(false);
        this.showCrearEmpresaModal.set(false);
        this.isAlertError.set(false);
        this.alertMessage.set(`¡Empresa "${res.razon_social}" (Tenant ID #${res.id}) registrada exitosamente con subdominio ${res.subdominio} y admin ${res.email_corporativo}!`);
        this.nuevaEmpresa = { razon_social: '', nit: '', subdominio: '', email_corporativo: '', telefono: '', plan_id: 1, admin_password: 'Password123!' };
      },
      error: (err) => {
        this.isSavingEmpresa.set(false);
        this.isAlertError.set(true);
        this.alertMessage.set(err.error?.detail || 'Error al registrar la empresa.');
      }
    });
  }
}
