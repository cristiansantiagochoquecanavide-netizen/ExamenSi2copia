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
          <span>ADMINISTRACIÓN DE PERSONAL Y CLIENTES</span>
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
                <span class="modal-eyebrow">PERSONAL CON SUCURSAL</span>
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
                <span class="modal-eyebrow">CUENTA E-COMMERCE</span>
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
                <span class="modal-eyebrow">ACTUALIZACIÓN DE PERFIL</span>
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
      max-width: 100%;
      margin: 0 auto;
      padding: 0.75rem 0.5rem 3rem;
      background-color: #ffffff;
      color: #111111;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      box-sizing: border-box;
    }

    .header-section {
      padding: 0 0 1.25rem 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      margin-bottom: 1.25rem;
    }

    .eyebrow {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: #374151;
      margin-bottom: 0.35rem;
      text-transform: uppercase;
    }

    .gold-dot {
      color: #000000;
      font-size: 1.1rem;
    }

    .page-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: #000000;
      margin-bottom: 0.35rem;
      letter-spacing: -0.02em;
      text-transform: uppercase;
    }

    .subtitle {
      color: #4b5563;
      font-size: 0.88rem;
      line-height: 1.4;
      max-width: 700px;
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
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.18);
      color: #4b5563;
      padding: 0.6rem 1.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      border-radius: 0;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .chip:hover {
      color: #000000;
      border-color: #000000;
      background: #f9fafb;
    }

    .chip.active {
      background: #000000;
      border-color: #000000;
      color: #ffffff;
      font-weight: 700;
    }

    .header-buttons {
      display: flex;
      gap: 0.75rem;
    }

    .btn-create-personal {
      background: #000000;
      color: #ffffff;
      border: 1px solid #000000;
      padding: 0.75rem 1.4rem;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: 0;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-create-personal:hover {
      background: #262626;
      border-color: #262626;
    }

    .btn-create-cliente {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.25);
      color: #000000;
      padding: 0.75rem 1.4rem;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: 0;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-create-cliente:hover {
      background: #f3f4f6;
      border-color: #000000;
    }

    .alert-success {
      background: #ecfdf5;
      border: 1px solid #059669;
      color: #065f46;
      padding: 0.8rem 1.2rem;
      border-radius: 0;
      margin-bottom: 1.5rem;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .alert-error {
      background: #fef2f2;
      border: 1px solid #dc2626;
      color: #991b1b;
      padding: 0.8rem 1.2rem;
      border-radius: 0;
      margin-bottom: 1.5rem;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .loading-box {
      text-align: center;
      padding: 4rem;
      color: #4b5563;
      letter-spacing: 0.12em;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .users-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 1.5rem;
    }

    .user-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 0;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: border-color 0.2s ease;
      box-shadow: none;
    }

    .user-card:hover {
      border-color: rgba(0, 0, 0, 0.3);
    }

    .user-card.blocked {
      opacity: 0.85;
      border-left: 4px solid #ef4444;
      background: #ffffff;
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
      border-radius: 0;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      color: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.95rem;
    }

    .user-main-info {
      flex: 1;
    }

    .user-fullname {
      font-size: 1.15rem;
      font-weight: 700;
      color: #000000;
      margin-bottom: 2px;
      letter-spacing: -0.01em;
    }

    .user-email {
      font-size: 0.8rem;
      color: #6b7280;
      font-family: monospace;
    }

    .status-pill {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      padding: 3px 8px;
      border-radius: 0;
      text-transform: uppercase;
    }

    .status-pill[data-status="ACTIVO"] {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    }

    .status-pill[data-status="INACTIVO"] {
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      color: #4b5563;
    }

    .status-pill[data-status="BLOQUEADO"] {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }

    .user-details-strip {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 0;
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
    }

    .detail-lbl {
      color: #6b7280;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      font-size: 0.72rem;
    }

    .detail-val {
      color: #111111;
      font-weight: 600;
    }

    .detail-val.gold {
      color: #000000;
      font-weight: 700;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1rem;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .status-actions {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .action-caption {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #6b7280;
      text-transform: uppercase;
    }

    .state-buttons {
      display: flex;
      gap: 6px;
    }

    .btn-state {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      color: #4b5563;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 0;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-state:hover:not(:disabled) {
      background: #f3f4f6;
      color: #000000;
      border-color: #000000;
    }

    .btn-state:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .btn-edit-user {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.25);
      color: #000000;
      padding: 0.55rem 1.1rem;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      border-radius: 0;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-edit-user:hover {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
    }

    /* Modal Styling */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .modal-container {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      max-width: 720px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      box-sizing: border-box;
    }

    .modal-header {
      padding: 24px 28px 18px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: #ffffff;
    }

    .modal-eyebrow {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #374151;
      text-transform: uppercase;
      display: block;
      margin-bottom: 4px;
    }

    .modal-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.01em;
      text-transform: uppercase;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 1.6rem;
      cursor: pointer;
      line-height: 1;
      padding: 2px 6px;
      border-radius: 4px;
      transition: color 0.15s ease;
    }

    .btn-close:hover {
      color: #0f172a;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex: 1;
    }

    .modal-body {
      padding: 24px 28px;
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
      gap: 8px;
      margin-bottom: 18px;
      width: 100%;
      box-sizing: border-box;
    }

    .form-label {
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #374151;
      text-transform: uppercase;
      margin: 0;
      display: block;
    }

    .form-input {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      color: #111827;
      padding: 0.5rem 0.85rem;
      font-size: 0.88rem;
      height: 42px;
      min-height: 42px;
      width: 100%;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .form-input:hover {
      border-color: #94a3b8;
    }

    .form-input:focus {
      border-color: #000000;
      box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.12);
    }

    .modal-footer {
      padding: 18px 28px 24px;
      border-top: 1px solid #f1f5f9;
      background: #ffffff;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      box-sizing: border-box;
    }

    .btn-cancel {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 0.6rem 1.4rem;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      border-radius: 9999px;
      height: 42px;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .btn-cancel:hover {
      background: #f8fafc;
      border-color: #94a3b8;
      color: #0f172a;
    }

    .btn-save {
      background: #000000;
      color: #ffffff;
      border: 1px solid #000000;
      padding: 0.6rem 1.6rem;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      border-radius: 9999px;
      height: 42px;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .btn-save:hover:not(:disabled) {
      background: #262626;
      transform: translateY(-1px);
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
