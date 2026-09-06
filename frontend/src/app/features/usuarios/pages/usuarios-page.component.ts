import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService } from '../services/usuarios.service';
import { RolesService } from '../services/roles.service';
import { InventarioService } from '../../inventario/services/inventario.service';
import {
  UsuarioResponse, RolResponse, PersonalRegistroRequest, ClienteRegistroRequest, UsuarioUpdate
} from '../models/usuarios.models';
import { Sucursal } from '../../inventario/models/inventario.models';

@Component({
  selector: 'app-usuarios-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="usuarios-container">
      <!-- Header Editorial -->
      <div class="header-section">
        <div class="eyebrow">
          <span class="gold-dot">&bull;</span>
          <span>ADMINISTRACIÓN DE PERSONAL Y CLIENTES &bull; CASO DE USO #3</span>
        </div>
        <h1 class="page-title">Directorio de Usuarios</h1>
        <p class="subtitle">
          Control de acceso para personal interno vinculado a sucursales físicas y clientes registrados.
        </p>

        <div class="actions-bar">
          <div class="filter-chips">
            <button
              type="button"
              class="chip"
              [class.active]="filtroTipo() === 'TODOS'"
              (click)="filtroTipo.set('TODOS')"
            >
              TODOS ({{ usuarios().length }})
            </button>
            <button
              type="button"
              class="chip"
              [class.active]="filtroTipo() === 'PERSONAL'"
              (click)="filtroTipo.set('PERSONAL')"
            >
              PERSONAL INTERNO
            </button>
            <button
              type="button"
              class="chip"
              [class.active]="filtroTipo() === 'CLIENTE'"
              (click)="filtroTipo.set('CLIENTE')"
            >
              CLIENTES
            </button>
          </div>

          <div class="header-buttons">
            <button type="button" class="btn-create-personal" (click)="openPersonalModal()">
              + REGISTRAR PERSONAL
            </button>
            <button type="button" class="btn-create-cliente" (click)="openClienteModal()">
              + REGISTRAR CLIENTE
            </button>
          </div>
        </div>
      </div>

      <!-- Feedback -->
      @if (successMessage()) {
        <div class="alert-success">
          <span>&check; {{ successMessage() }}</span>
        </div>
      }
      @if (errorMessage()) {
        <div class="alert-error">
          <span>&excl; {{ errorMessage() }}</span>
        </div>
      }

      <!-- Loading -->
      @if (isLoading()) {
        <div class="loading-box">
          <span class="spinner"></span>
          <span>CARGANDO DIRECTORIO DE USUARIOS...</span>
        </div>
      }

      <!-- Users Grid -->
      @if (!isLoading()) {
        <div class="users-grid">
          @for (u of usuariosFiltrados(); track u.id) {
            <article class="user-card" [class.blocked]="u.estado === 'BLOQUEADO'">
              <div class="user-card-header">
                <div class="avatar-monogram">
                  {{ u.nombre.charAt(0) }}{{ u.apellido.charAt(0) }}
                </div>
                <div class="user-main-info">
                  <h3 class="user-fullname">{{ u.nombre }} {{ u.apellido }}</h3>
                  <span class="user-email">{{ u.email }}</span>
                </div>
                <span class="status-pill" [attr.data-status]="u.estado">
                  {{ u.estado }}
                </span>
              </div>

              <div class="user-details-strip">
                <div class="detail-item">
                  <span class="detail-lbl">CI / NIT:</span>
                  <span class="detail-val">{{ u.ci_nit }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-lbl">TIPO:</span>
                  <span class="detail-val">{{ u.tipo_usuario }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-lbl">ROL ASIGNADO:</span>
                  <span class="detail-val gold">{{ u.rol?.nombre || 'Sin Rol' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-lbl">SUCURSAL:</span>
                  <span class="detail-val">{{ getSucursalNombre(u.sucursal_id) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-lbl">TELÉFONO:</span>
                  <span class="detail-val">{{ u.telefono || 'No registrado' }}</span>
                </div>
              </div>

              <div class="card-footer">
                <div class="status-actions">
                  <span class="action-caption">CAMBIAR ESTADO:</span>
                  <div class="state-buttons">
                    <button
                      type="button"
                      class="btn-state active-btn"
                      [disabled]="u.estado === 'ACTIVO'"
                      (click)="updateEstado(u.id, 'ACTIVO')"
                    >
                      ACTIVO
                    </button>
                    <button
                      type="button"
                      class="btn-state inactive-btn"
                      [disabled]="u.estado === 'INACTIVO'"
                      (click)="updateEstado(u.id, 'INACTIVO')"
                    >
                      INACTIVO
                    </button>
                    <button
                      type="button"
                      class="btn-state block-btn"
                      [disabled]="u.estado === 'BLOQUEADO'"
                      (click)="updateEstado(u.id, 'BLOQUEADO')"
                    >
                      BLOQUEAR
                    </button>
                  </div>
                </div>

                <button type="button" class="btn-edit-user" (click)="openEditModal(u)">
                  EDITAR
                </button>
              </div>
            </article>
          }
        </div>
      }

      <!-- Modal Registro Personal Interno -->
      @if (isPersonalModalOpen()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal-container" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <span class="modal-eyebrow">PERSONAL CON SUCURSAL &bull; CU3</span>
                <h2 class="modal-title">Registrar Personal Interno</h2>
              </div>
              <button type="button" class="btn-close" (click)="closeModals()">&times;</button>
            </div>

            <form (ngSubmit)="submitPersonal()" class="modal-form">
              <div class="modal-body form-grid">
                <div class="form-group">
                  <label class="form-label">NOMBRE</label>
                  <input type="text" [(ngModel)]="pNombre" name="pNombre" required class="form-input" placeholder="Carlos" />
                </div>
                <div class="form-group">
                  <label class="form-label">APELLIDO</label>
                  <input type="text" [(ngModel)]="pApellido" name="pApellido" required class="form-input" placeholder="Mendoza" />
                </div>
                <div class="form-group">
                  <label class="form-label">CORREO CORPORATIVO</label>
                  <input type="email" [(ngModel)]="pEmail" name="pEmail" required class="form-input" placeholder="carlos@fashionstore.com" />
                </div>
                <div class="form-group">
                  <label class="form-label">CONTRASEÑA TEMPORAL</label>
                  <input type="password" [(ngModel)]="pPassword" name="pPassword" required class="form-input" placeholder="Mínimo 6 caracteres" />
                </div>
                <div class="form-group">
                  <label class="form-label">CI / NIT</label>
                  <input type="text" [(ngModel)]="pCiNit" name="pCiNit" required class="form-input" placeholder="7890123" />
                </div>
                <div class="form-group">
                  <label class="form-label">TELÉFONO</label>
                  <input type="text" [(ngModel)]="pTelefono" name="pTelefono" class="form-input" placeholder="+591 70000000" />
                </div>
                <div class="form-group">
                  <label class="form-label">ROL ASIGNADO (RBAC)</label>
                  <select [(ngModel)]="pRolId" name="pRolId" required class="form-input">
                    <option [ngValue]="null" disabled>Seleccionar Rol...</option>
                    @for (r of roles(); track r.id) {
                      <option [ngValue]="r.id">{{ r.nombre }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">SUCURSAL VINCULADA</label>
                  <select [(ngModel)]="pSucursalId" name="pSucursalId" class="form-input">
                    <option [ngValue]="null">Sin sucursal fija (Central)</option>
                    @for (s of sucursales(); track s.id) {
                      <option [ngValue]="s.id">{{ s.nombre }}</option>
                    }
                  </select>
                </div>
                <div class="form-group full-span">
                  <label class="form-label">DIRECCIÓN</label>
                  <input type="text" [(ngModel)]="pDireccion" name="pDireccion" class="form-input" placeholder="Av. Principal #123" />
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-cancel" (click)="closeModals()">CANCELAR</button>
                <button type="submit" class="btn-save" [disabled]="isSubmitting()">
                  {{ isSubmitting() ? 'REGISTRANDO...' : 'REGISTRAR PERSONAL' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Registro Cliente -->
      @if (isClienteModalOpen()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal-container" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <span class="modal-eyebrow">CUENTA E-COMMERCE &bull; CU3</span>
                <h2 class="modal-title">Registrar Cliente</h2>
              </div>
              <button type="button" class="btn-close" (click)="closeModals()">&times;</button>
            </div>

            <form (ngSubmit)="submitCliente()" class="modal-form">
              <div class="modal-body form-grid">
                <div class="form-group">
                  <label class="form-label">NOMBRE</label>
                  <input type="text" [(ngModel)]="cNombre" name="cNombre" required class="form-input" placeholder="Camila" />
                </div>
                <div class="form-group">
                  <label class="form-label">APELLIDO</label>
                  <input type="text" [(ngModel)]="cApellido" name="cApellido" required class="form-input" placeholder="Vargas" />
                </div>
                <div class="form-group">
                  <label class="form-label">CORREO ELECTRÓNICO</label>
                  <input type="email" [(ngModel)]="cEmail" name="cEmail" required class="form-input" placeholder="camila@gmail.com" />
                </div>
                <div class="form-group">
                  <label class="form-label">CONTRASEÑA</label>
                  <input type="password" [(ngModel)]="cPassword" name="cPassword" required class="form-input" placeholder="Mínimo 6 caracteres" />
                </div>
                <div class="form-group">
                  <label class="form-label">CI / NIT</label>
                  <input type="text" [(ngModel)]="cCiNit" name="cCiNit" required class="form-input" placeholder="4567890" />
                </div>
                <div class="form-group">
                  <label class="form-label">TELÉFONO</label>
                  <input type="text" [(ngModel)]="cTelefono" name="cTelefono" class="form-input" placeholder="+591 71234567" />
                </div>
                <div class="form-group full-span">
                  <label class="form-label">DIRECCIÓN DE ENTREGA</label>
                  <input type="text" [(ngModel)]="cDireccion" name="cDireccion" class="form-input" placeholder="Condominio La Casona #4" />
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-cancel" (click)="closeModals()">CANCELAR</button>
                <button type="submit" class="btn-save" [disabled]="isSubmitting()">
                  {{ isSubmitting() ? 'REGISTRANDO...' : 'REGISTRAR CLIENTE' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Editar Usuario -->
      @if (isEditModalOpen()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal-container" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <span class="modal-eyebrow">ACTUALIZACIÓN DE PERFIL &bull; CU3</span>
                <h2 class="modal-title">Editar Usuario</h2>
              </div>
              <button type="button" class="btn-close" (click)="closeModals()">&times;</button>
            </div>

            <form (ngSubmit)="submitEdit()" class="modal-form">
              <div class="modal-body form-grid">
                <div class="form-group">
                  <label class="form-label">NOMBRE</label>
                  <input type="text" [(ngModel)]="editNombre" name="editNombre" required class="form-input" />
                </div>
                <div class="form-group">
                  <label class="form-label">APELLIDO</label>
                  <input type="text" [(ngModel)]="editApellido" name="editApellido" required class="form-input" />
                </div>
                <div class="form-group">
                  <label class="form-label">TELÉFONO</label>
                  <input type="text" [(ngModel)]="editTelefono" name="editTelefono" class="form-input" />
                </div>
                <div class="form-group">
                  <label class="form-label">ROL</label>
                  <select [(ngModel)]="editRolId" name="editRolId" class="form-input">
                    @for (r of roles(); track r.id) {
                      <option [ngValue]="r.id">{{ r.nombre }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">SUCURSAL VINCULADA</label>
                  <select [(ngModel)]="editSucursalId" name="editSucursalId" class="form-input">
                    <option [ngValue]="null">Sin sucursal</option>
                    @for (s of sucursales(); track s.id) {
                      <option [ngValue]="s.id">{{ s.nombre }}</option>
                    }
                  </select>
                </div>
                <div class="form-group full-span">
                  <label class="form-label">DIRECCIÓN</label>
                  <input type="text" [(ngModel)]="editDireccion" name="editDireccion" class="form-input" />
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-cancel" (click)="closeModals()">CANCELAR</button>
                <button type="submit" class="btn-save" [disabled]="isSubmitting()">
                  {{ isSubmitting() ? 'GUARDANDO...' : 'GUARDAR CAMBIOS' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .usuarios-container {
      max-width: 1400px;
      margin: 0 auto;
      padding-bottom: 4rem;
    }

    .header-section {
      padding: 1.5rem 0 2rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      margin-bottom: 2rem;
    }

    .eyebrow {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      letter-spacing: 0.2em;
      color: var(--color-gold);
      margin-bottom: 0.5rem;
    }

    .gold-dot {
      color: var(--color-gold);
      font-size: 1.2rem;
    }

    .page-title {
      font-family: var(--font-serif);
      font-size: 3rem;
      text-transform: uppercase;
      color: var(--color-primary);
      margin-bottom: 0.5rem;
    }

    .subtitle {
      color: var(--color-on-surface-muted);
      font-size: 0.95rem;
    }

    .actions-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .filter-chips {
      display: flex;
      gap: 0.5rem;
    }

    .chip {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #aaaaaa;
      padding: 0.6rem 1.2rem;
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .chip:hover, .chip.active {
      border-color: var(--color-gold);
      color: #ffffff;
    }

    .chip.active {
      background: rgba(212, 175, 55, 0.15);
      color: var(--color-gold);
      font-weight: 600;
    }

    .header-buttons {
      display: flex;
      gap: 0.75rem;
    }

    .btn-create-personal {
      background: var(--color-gold);
      color: #000000;
      border: none;
      padding: 0.8rem 1.4rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-create-personal:hover {
      background: #ffffff;
    }

    .btn-create-cliente {
      background: transparent;
      border: 1px solid #ffffff;
      color: #ffffff;
      padding: 0.8rem 1.4rem;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.15em;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-create-cliente:hover {
      background: #ffffff;
      color: #000000;
    }

    .alert-success {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid #10b981;
      color: #34d399;
      padding: 0.8rem 1.2rem;
      margin-bottom: 1.5rem;
      font-size: 0.85rem;
    }

    .alert-error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid #ef4444;
      color: #f87171;
      padding: 0.8rem 1.2rem;
      margin-bottom: 1.5rem;
      font-size: 0.85rem;
    }

    .loading-box {
      text-align: center;
      padding: 4rem;
      color: var(--color-gold);
      letter-spacing: 0.15em;
      font-size: 0.85rem;
    }

    .users-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 2rem;
    }

    .user-card {
      background: #111111;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: border-color 0.2s ease;
    }

    .user-card:hover {
      border-color: var(--color-gold);
    }

    .user-card.blocked {
      opacity: 0.7;
      border-left: 3px solid #ef4444;
    }

    .user-card-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }

    .avatar-monogram {
      width: 44px;
      height: 44px;
      background: #1a1a1a;
      border: 1px solid var(--color-gold);
      color: var(--color-gold);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.9rem;
    }

    .user-main-info {
      flex: 1;
    }

    .user-fullname {
      font-family: var(--font-serif);
      font-size: 1.3rem;
      color: #ffffff;
      margin-bottom: 2px;
    }

    .user-email {
      font-size: 0.75rem;
      color: #888888;
      font-family: monospace;
    }

    .status-pill {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      padding: 3px 8px;
    }

    .status-pill[data-status="ACTIVO"] {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid #10b981;
      color: #10b981;
    }

    .status-pill[data-status="INACTIVO"] {
      background: rgba(156, 163, 175, 0.15);
      border: 1px solid #9ca3af;
      color: #9ca3af;
    }

    .status-pill[data-status="BLOQUEADO"] {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #ef4444;
    }

    .user-details-strip {
      background: #090909;
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 1rem;
      margin-bottom: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
    }

    .detail-lbl {
      color: var(--color-on-surface-muted);
      letter-spacing: 0.08em;
    }

    .detail-val {
      color: #ffffff;
      font-weight: 500;
    }

    .detail-val.gold {
      color: var(--color-gold);
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .status-actions {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .action-caption {
      font-size: 0.6rem;
      letter-spacing: 0.1em;
      color: #666666;
    }

    .state-buttons {
      display: flex;
      gap: 4px;
    }

    .btn-state {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #888888;
      font-size: 0.6rem;
      padding: 2px 6px;
      cursor: pointer;
    }

    .btn-state:hover:not(:disabled) {
      color: #ffffff;
      border-color: #ffffff;
    }

    .btn-state:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .btn-edit-user {
      background: transparent;
      border: 1px solid var(--color-gold);
      color: var(--color-gold);
      padding: 0.5rem 1rem;
      font-size: 0.7rem;
      letter-spacing: 0.15em;
      cursor: pointer;
    }

    .btn-edit-user:hover {
      background: var(--color-gold);
      color: #000000;
    }

    /* Modal Styling */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.88);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .modal-container {
      background: #111111;
      border: 1px solid var(--color-gold);
      max-width: 750px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95);
    }

    .modal-header {
      padding: 1.5rem 2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .modal-eyebrow {
      font-size: 0.65rem;
      letter-spacing: 0.2em;
      color: var(--color-gold);
    }

    .modal-title {
      font-family: var(--font-serif);
      font-size: 2rem;
      color: #ffffff;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: #888888;
      font-size: 2rem;
      cursor: pointer;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .modal-body {
      padding: 2rem;
      overflow-y: auto;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }

    .full-span {
      grid-column: span 2;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .form-label {
      font-size: 0.7rem;
      letter-spacing: 0.12em;
      color: var(--color-on-surface-muted);
    }

    .form-input {
      background: #0d0d0d;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      padding: 0.75rem 1rem;
      font-size: 0.85rem;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--color-gold);
    }

    .modal-footer {
      padding: 1.25rem 2rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
    }

    .btn-cancel {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      padding: 0.75rem 1.5rem;
      font-size: 0.75rem;
      letter-spacing: 0.15em;
      cursor: pointer;
    }

    .btn-save {
      background: #ffffff;
      color: #000000;
      border: none;
      padding: 0.75rem 2rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      cursor: pointer;
    }

    .btn-save:hover:not(:disabled) {
      background: var(--color-gold);
    }
  `]
})
export class UsuariosPageComponent implements OnInit {
  private readonly usuariosService = inject(UsuariosService);
  private readonly rolesService = inject(RolesService);
  private readonly inventarioService = inject(InventarioService);

  readonly usuarios = signal<UsuarioResponse[]>([]);
  readonly roles = signal<RolResponse[]>([]);
  readonly sucursales = signal<Sucursal[]>([]);
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly filtroTipo = signal<'TODOS' | 'PERSONAL' | 'CLIENTE'>('TODOS');

  // Modals state
  readonly isPersonalModalOpen = signal(false);
  readonly isClienteModalOpen = signal(false);
  readonly isEditModalOpen = signal(false);
  readonly editingUserId = signal<number | null>(null);

  // Form fields Personal
  pNombre = '';
  pApellido = '';
  pEmail = '';
  pPassword = '';
  pCiNit = '';
  pTelefono = '';
  pDireccion = '';
  pRolId: number | null = null;
  pSucursalId: number | null = null;

  // Form fields Cliente
  cNombre = '';
  cApellido = '';
  cEmail = '';
  cPassword = '';
  cCiNit = '';
  cTelefono = '';
  cDireccion = '';

  // Form fields Edit
  editNombre = '';
  editApellido = '';
  editTelefono = '';
  editDireccion = '';
  editRolId: number | null = null;
  editSucursalId: number | null = null;

  readonly usuariosFiltrados = computed(() => {
    const list = this.usuarios();
    const filtro = this.filtroTipo();
    if (filtro === 'TODOS') return list;
    return list.filter(u => u.tipo_usuario === filtro);
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.usuariosService.listar().subscribe({
      next: (uList) => {
        this.usuarios.set(uList);
        this.rolesService.getRoles().subscribe({
          next: (rList) => this.roles.set(rList),
          error: () => {}
        });
        this.inventarioService.getSucursales().subscribe({
          next: (sList) => this.sucursales.set(sList),
          error: () => {}
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || 'Error al cargar directorio de usuarios.');
      }
    });
  }

  getSucursalNombre(sucursalId?: number | null): string {
    if (!sucursalId) return 'Oficina Central / E-Commerce';
    const suc = this.sucursales().find(s => s.id === sucursalId);
    return suc ? suc.nombre : `Sucursal #${sucursalId}`;
  }

  updateEstado(userId: number, estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO'): void {
    this.usuariosService.cambiarEstado(userId, estado).subscribe({
      next: (res) => {
        this.successMessage.set(`Estado de ${res.nombre} cambiado a ${estado}`);
        this.loadData();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Error al cambiar estado.');
      }
    });
  }

  openPersonalModal(): void {
    this.pNombre = '';
    this.pApellido = '';
    this.pEmail = '';
    this.pPassword = '';
    this.pCiNit = '';
    this.pTelefono = '';
    this.pDireccion = '';
    this.pRolId = null;
    this.pSucursalId = null;
    this.isPersonalModalOpen.set(true);
  }

  openClienteModal(): void {
    this.cNombre = '';
    this.cApellido = '';
    this.cEmail = '';
    this.cPassword = '';
    this.cCiNit = '';
    this.cTelefono = '';
    this.cDireccion = '';
    this.isClienteModalOpen.set(true);
  }

  openEditModal(u: UsuarioResponse): void {
    this.editingUserId.set(u.id);
    this.editNombre = u.nombre;
    this.editApellido = u.apellido;
    this.editTelefono = u.telefono || '';
    this.editDireccion = u.direccion || '';
    this.editRolId = u.rol_id;
    this.editSucursalId = u.sucursal_id || null;
    this.isEditModalOpen.set(true);
  }

  closeModals(): void {
    this.isPersonalModalOpen.set(false);
    this.isClienteModalOpen.set(false);
    this.isEditModalOpen.set(false);
  }

  submitPersonal(): void {
    if (!this.pRolId) {
      alert('Debe asignar un rol al personal.');
      return;
    }
    this.isSubmitting.set(true);
    const data: PersonalRegistroRequest = {
      email: this.pEmail,
      password: this.pPassword,
      nombre: this.pNombre,
      apellido: this.pApellido,
      ci_nit: this.pCiNit,
      rol_id: this.pRolId,
      sucursal_id: this.pSucursalId,
      telefono: this.pTelefono,
      direccion: this.pDireccion
    };

    this.usuariosService.registrarPersonal(data).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.closeModals();
        this.successMessage.set(`Personal '${res.nombre} ${res.apellido}' registrado con éxito.`);
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.detail || 'Error al registrar personal.');
      }
    });
  }

  submitCliente(): void {
    this.isSubmitting.set(true);
    const data: ClienteRegistroRequest = {
      email: this.cEmail,
      password: this.cPassword,
      nombre: this.cNombre,
      apellido: this.cApellido,
      ci_nit: this.cCiNit,
      telefono: this.cTelefono,
      direccion: this.cDireccion
    };

    this.usuariosService.registrarCliente(data).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.closeModals();
        this.successMessage.set(`Cliente '${res.nombre} ${res.apellido}' registrado exitosamente.`);
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.detail || 'Error al registrar cliente.');
      }
    });
  }

  submitEdit(): void {
    const id = this.editingUserId();
    if (!id) return;
    this.isSubmitting.set(true);

    const data: UsuarioUpdate = {
      nombre: this.editNombre,
      apellido: this.editApellido,
      telefono: this.editTelefono,
      direccion: this.editDireccion,
      rol_id: this.editRolId || undefined,
      sucursal_id: this.editSucursalId
    };

    this.usuariosService.actualizar(id, data).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.closeModals();
        this.successMessage.set(`Usuario '${res.nombre}' actualizado correctamente.`);
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.detail || 'Error al actualizar usuario.');
      }
    });
  }
}
