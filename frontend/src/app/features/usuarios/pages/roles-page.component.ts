import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RolesService } from '../services/roles.service';
import { RolResponse, PermisoResponse, RolCreate, RolUpdate } from '../models/usuarios.models';

interface ModuloPermisos {
  modulo: string;
  permisos: PermisoResponse[];
}

@Component({
  selector: 'app-roles-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="roles-container">
      <!-- Header Editorial -->
      <div class="header-section">
        <div class="eyebrow">
          <span class="gold-dot">&bull;</span>
          <span>SEGURIDAD RBAC &bull; CASO DE USO #2</span>
        </div>
        <h1 class="page-title">Gestión de Roles y Permisos</h1>
        <p class="subtitle">
          Configuración granular de matriz de permisos por módulo de negocio para personal y clientes.
        </p>

        <div class="actions-bar">
          <button type="button" class="btn-create" (click)="openCreateModal()">
            + CREAR NUEVO ROL
          </button>
          <span class="roles-count">{{ roles().length }} ROLES CONFIGURADOS</span>
        </div>
      </div>

      <!-- Feedbacks -->
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

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="loading-box">
          <span class="spinner"></span>
          <span>CARGANDO MATRIZ DE ROLES Y PERMISOS...</span>
        </div>
      }

      <!-- Roles Grid -->
      @if (!isLoading()) {
        <div class="roles-grid">
          @for (rol of roles(); track rol.id) {
            <article class="role-card" [class.system-role]="rol.es_sistema">
              <div class="role-card-header">
                <div class="role-identity">
                  <span class="role-id">ID #{{ rol.id }}</span>
                  <h3 class="role-name">{{ rol.nombre }}</h3>
                </div>
                @if (rol.es_sistema) {
                  <span class="badge-system">SISTEMA</span>
                } @else {
                  <span class="badge-custom">PERSONALIZADO</span>
                }
              </div>

              <p class="role-desc">{{ rol.descripcion || 'Sin descripción asignada.' }}</p>

              <div class="permissions-summary">
                <div class="perm-header">
                  <span class="perm-title">MATRIZ DE PERMISOS ({{ rol.permisos.length }})</span>
                </div>
                
                @if (rol.permisos.length === 0) {
                  <span class="empty-perm">Sin permisos asignados</span>
                } @else {
                  <div class="perm-chips">
                    @for (p of rol.permisos; track p.id) {
                      <span class="perm-chip" [attr.data-modulo]="p.modulo">
                        {{ p.codigo }}
                      </span>
                    }
                  </div>
                }
              </div>

              <div class="card-footer">
                <button type="button" class="btn-edit" (click)="openEditModal(rol)">
                  EDITAR MATRIZ
                </button>
                @if (!rol.es_sistema) {
                  <button type="button" class="btn-delete" (click)="confirmDelete(rol)">
                    ELIMINAR
                  </button>
                }
              </div>
            </article>
          }
        </div>
      }

      <!-- Modal de Creacion / Edicion (Matriz RBAC) -->
      @if (isModalOpen()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal-container" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <span class="modal-eyebrow">{{ editingRolId() ? 'EDITAR ROL' : 'NUEVO ROL' }} &bull; CU2 RBAC</span>
                <h2 class="modal-title">{{ editingRolId() ? formNombre : 'Crear Nuevo Rol' }}</h2>
              </div>
              <button type="button" class="btn-close" (click)="closeModal()">&times;</button>
            </div>

            <form (ngSubmit)="saveRol()" class="modal-form">
              <div class="modal-body">
                <div class="form-group">
                  <label for="rol-nombre" class="form-label">NOMBRE DEL ROL</label>
                  <input
                    id="rol-nombre"
                    type="text"
                    [(ngModel)]="formNombre"
                    name="nombre"
                    required
                    placeholder="Ej. ENCARGADO_INVENTARIO"
                    class="form-input"
                  />
                </div>

                <div class="form-group">
                  <label for="rol-desc" class="form-label">DESCRIPCIÓN OPERATIVA</label>
                  <input
                    id="rol-desc"
                    type="text"
                    [(ngModel)]="formDescripcion"
                    name="descripcion"
                    placeholder="Ej. Responsable de recepcionar stock e inventarios..."
                    class="form-input"
                  />
                </div>

                <!-- Selector de Permisos agrupados por Modulo -->
                <div class="permissions-matrix-section">
                  <div class="matrix-header">
                    <span class="matrix-title">&diams; SELECCIÓN DE PERMISOS POR MÓDULO</span>
                    <span class="matrix-counter">{{ selectedPermisoIds.size }} permisos seleccionados</span>
                  </div>

                  <div class="modules-accordion">
                    @for (group of permisosAgrupados(); track group.modulo) {
                      <div class="module-block">
                        <div class="module-header">
                          <span class="module-name">{{ group.modulo | uppercase }}</span>
                          <button
                            type="button"
                            class="btn-toggle-module"
                            (click)="toggleModuleAll(group)"
                          >
                            {{ isModuleFullySelected(group) ? 'Desmarcar Módulo' : 'Marcar Todo Módulo' }}
                          </button>
                        </div>

                        <div class="permissions-list">
                          @for (p of group.permisos; track p.id) {
                            <label class="checkbox-label" [class.checked]="selectedPermisoIds.has(p.id)">
                              <input
                                type="checkbox"
                                [checked]="selectedPermisoIds.has(p.id)"
                                (change)="togglePermiso(p.id)"
                                class="custom-checkbox"
                              />
                              <div class="perm-info">
                                <span class="perm-code">{{ p.codigo }}</span>
                                <span class="perm-desc">{{ p.descripcion || p.modulo }}</span>
                              </div>
                            </label>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-cancel" (click)="closeModal()">
                  CANCELAR
                </button>
                <button type="submit" class="btn-save" [disabled]="isSaving() || !formNombre">
                  {{ isSaving() ? 'GUARDANDO...' : (editingRolId() ? 'ACTUALIZAR MATRIZ' : 'GUARDAR ROL') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .roles-container {
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
    }

    .btn-create {
      background: var(--color-gold);
      color: #000000;
      border: none;
      padding: 0.8rem 1.5rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-create:hover {
      background: #ffffff;
      color: #000000;
    }

    .roles-count {
      font-size: 0.75rem;
      letter-spacing: 0.15em;
      color: var(--color-gold);
      border: 1px solid rgba(212, 175, 55, 0.3);
      padding: 6px 12px;
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

    .roles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 2rem;
    }

    .role-card {
      background: #111111;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: border-color 0.2s ease;
    }

    .role-card:hover {
      border-color: var(--color-gold);
    }

    .role-card.system-role {
      border-left: 3px solid var(--color-gold);
    }

    .role-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }

    .role-id {
      font-size: 0.65rem;
      font-family: monospace;
      color: var(--color-gold);
      display: block;
    }

    .role-name {
      font-family: var(--font-serif);
      font-size: 1.6rem;
      color: #ffffff;
    }

    .badge-system {
      background: rgba(212, 175, 55, 0.2);
      border: 1px solid var(--color-gold);
      color: var(--color-gold);
      font-size: 0.6rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      padding: 2px 6px;
    }

    .badge-custom {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #cccccc;
      font-size: 0.6rem;
      letter-spacing: 0.15em;
      padding: 2px 6px;
    }

    .role-desc {
      font-size: 0.85rem;
      color: #888888;
      margin-bottom: 1.5rem;
      line-height: 1.4;
    }

    .permissions-summary {
      background: #090909;
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .perm-header {
      margin-bottom: 0.75rem;
    }

    .perm-title {
      font-size: 0.65rem;
      letter-spacing: 0.15em;
      color: var(--color-on-surface-muted);
    }

    .empty-perm {
      font-size: 0.8rem;
      color: #555555;
      font-style: italic;
    }

    .perm-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .perm-chip {
      font-size: 0.65rem;
      font-family: monospace;
      background: #181818;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #dddddd;
      padding: 2px 7px;
    }

    .card-footer {
      display: flex;
      gap: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .btn-edit {
      flex: 1;
      background: transparent;
      border: 1px solid var(--color-gold);
      color: var(--color-gold);
      padding: 0.6rem;
      font-size: 0.7rem;
      letter-spacing: 0.15em;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-edit:hover {
      background: var(--color-gold);
      color: #000000;
    }

    .btn-delete {
      background: transparent;
      border: 1px solid #ef4444;
      color: #ef4444;
      padding: 0.6rem 1rem;
      font-size: 0.7rem;
      letter-spacing: 0.15em;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-delete:hover {
      background: #ef4444;
      color: #ffffff;
    }

    /* Modal */
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
      max-width: 850px;
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
      flex: 1;
      overflow: hidden;
    }

    .modal-body {
      padding: 2rem;
      overflow-y: auto;
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
    }

    .form-input {
      background: #0d0d0d;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      padding: 0.8rem 1rem;
      font-size: 0.9rem;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--color-gold);
    }

    .permissions-matrix-section {
      background: #090909;
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 1.5rem;
    }

    .matrix-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .matrix-title {
      font-size: 0.75rem;
      letter-spacing: 0.15em;
      color: var(--color-gold);
    }

    .matrix-counter {
      font-size: 0.75rem;
      color: #ffffff;
      font-family: monospace;
    }

    .modules-accordion {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .module-block {
      background: #141414;
      border: 1px solid rgba(255, 255, 255, 0.06);
      padding: 1rem;
    }

    .module-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .module-name {
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: var(--color-primary);
    }

    .btn-toggle-module {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #aaaaaa;
      font-size: 0.65rem;
      padding: 2px 8px;
      cursor: pointer;
    }

    .btn-toggle-module:hover {
      color: var(--color-gold);
      border-color: var(--color-gold);
    }

    .permissions-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 0.75rem;
    }

    .checkbox-label {
      background: #0c0c0c;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 0.6rem 0.8rem;
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .checkbox-label.checked {
      background: #1c180b;
      border-color: var(--color-gold);
    }

    .custom-checkbox {
      accent-color: var(--color-gold);
      margin-top: 3px;
    }

    .perm-info {
      display: flex;
      flex-direction: column;
    }

    .perm-code {
      font-size: 0.75rem;
      font-family: monospace;
      color: #ffffff;
      font-weight: 600;
    }

    .perm-desc {
      font-size: 0.7rem;
      color: #888888;
    }

    .modal-footer {
      padding: 1.5rem 2rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
    }

    .btn-cancel {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      padding: 0.8rem 1.5rem;
      font-size: 0.75rem;
      letter-spacing: 0.15em;
      cursor: pointer;
    }

    .btn-save {
      background: #ffffff;
      color: #000000;
      border: none;
      padding: 0.8rem 2rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      cursor: pointer;
    }

    .btn-save:hover:not(:disabled) {
      background: var(--color-gold);
      color: #000000;
    }

    .btn-save:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `]
})
export class RolesPageComponent implements OnInit {
  private readonly rolesService = inject(RolesService);

  readonly roles = signal<RolResponse[]>([]);
  readonly permisos = signal<PermisoResponse[]>([]);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly isModalOpen = signal(false);
  readonly editingRolId = signal<number | null>(null);

  formNombre = '';
  formDescripcion = '';
  selectedPermisoIds = new Set<number>();

  readonly permisosAgrupados = computed<ModuloPermisos[]>(() => {
    const all = this.permisos();
    const map = new Map<string, PermisoResponse[]>();
    for (const p of all) {
      const list = map.get(p.modulo) || [];
      list.push(p);
      map.set(p.modulo, list);
    }
    return Array.from(map.entries()).map(([modulo, permisos]) => ({ modulo, permisos }));
  });

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.rolesService.getPermisos().subscribe({
      next: (perms) => {
        this.permisos.set(perms);
        this.rolesService.getRoles().subscribe({
          next: (rList) => {
            this.roles.set(rList);
            this.isLoading.set(false);
          },
          error: (err) => {
            this.isLoading.set(false);
            this.errorMessage.set(err.error?.detail || 'Error al obtener roles.');
          }
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || 'Error al obtener catalogo de permisos.');
      }
    });
  }

  openCreateModal(): void {
    this.editingRolId.set(null);
    this.formNombre = '';
    this.formDescripcion = '';
    this.selectedPermisoIds = new Set<number>();
    this.isModalOpen.set(true);
  }

  openEditModal(rol: RolResponse): void {
    this.editingRolId.set(rol.id);
    this.formNombre = rol.nombre;
    this.formDescripcion = rol.descripcion || '';
    this.selectedPermisoIds = new Set<number>(rol.permisos.map(p => p.id));
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  togglePermiso(id: number): void {
    if (this.selectedPermisoIds.has(id)) {
      this.selectedPermisoIds.delete(id);
    } else {
      this.selectedPermisoIds.add(id);
    }
  }

  isModuleFullySelected(group: ModuloPermisos): boolean {
    return group.permisos.every(p => this.selectedPermisoIds.has(p.id));
  }

  toggleModuleAll(group: ModuloPermisos): void {
    if (this.isModuleFullySelected(group)) {
      group.permisos.forEach(p => this.selectedPermisoIds.delete(p.id));
    } else {
      group.permisos.forEach(p => this.selectedPermisoIds.add(p.id));
    }
  }

  saveRol(): void {
    if (!this.formNombre) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const permisos_ids = Array.from(this.selectedPermisoIds);
    const id = this.editingRolId();

    if (id) {
      const payload: RolUpdate = {
        nombre: this.formNombre,
        descripcion: this.formDescripcion,
        permisos_ids
      };
      this.rolesService.updateRol(id, payload).subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.isModalOpen.set(false);
          this.successMessage.set(`Rol '${updated.nombre}' actualizado con éxito.`);
          this.loadAll();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.error?.detail || 'No se pudo actualizar el rol.');
        }
      });
    } else {
      const payload: RolCreate = {
        nombre: this.formNombre,
        descripcion: this.formDescripcion,
        permisos_ids
      };
      this.rolesService.createRol(payload).subscribe({
        next: (created) => {
          this.isSaving.set(false);
          this.isModalOpen.set(false);
          this.successMessage.set(`Rol '${created.nombre}' creado exitosamente.`);
          this.loadAll();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.error?.detail || 'No se pudo crear el rol.');
        }
      });
    }
  }

  confirmDelete(rol: RolResponse): void {
    if (rol.es_sistema) {
      alert('Los roles de sistema no pueden ser eliminados.');
      return;
    }
    if (!confirm(`¿Está seguro de eliminar el rol '${rol.nombre}'?`)) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.rolesService.deleteRol(rol.id).subscribe({
      next: () => {
        this.successMessage.set(`Rol '${rol.nombre}' eliminado correctamente.`);
        this.loadAll();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Error al eliminar el rol.');
      }
    });
  }
}
