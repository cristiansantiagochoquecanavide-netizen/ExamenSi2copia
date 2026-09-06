import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioService } from '../services/inventario.service';
import { UsuariosService } from '../../usuarios/services/usuarios.service';
import {
  Ciudad, Sucursal, CiudadCreate, SucursalCreate, SucursalUpdate
} from '../models/inventario.models';
import { UsuarioResponse } from '../../usuarios/models/usuarios.models';

@Component({
  selector: 'app-inventario-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sucursales-container">
      <!-- Header Editorial -->
      <div class="header-section">
        <div class="eyebrow">
          <span class="gold-dot">&bull;</span>
          <span>EXPANSIÓN GEOGRÁFICA Y TIENDAS FÍSICAS &bull; CASO DE USO #4</span>
        </div>
        <h1 class="page-title">Ciudades y Sucursales</h1>
        <p class="subtitle">
          Administración de puntos de venta físicos, asignación de encargados y capacidad de probadores inteligentes.
        </p>

        <!-- Tabs -->
        <div class="tabs-bar">
          <div class="tabs-left">
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'SUCURSALES'"
              (click)="activeTab.set('SUCURSALES')"
            >
              SUCURSALES FÍSICAS ({{ sucursales().length }})
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'CIUDADES'"
              (click)="activeTab.set('CIUDADES')"
            >
              CIUDADES COBERTURA ({{ ciudades().length }})
            </button>
          </div>

          <div>
            @if (activeTab() === 'SUCURSALES') {
              <button type="button" class="btn-action-gold" (click)="openSucursalModal()">
                + REGISTRAR SUCURSAL
              </button>
            } @else {
              <button type="button" class="btn-action-gold" (click)="openCiudadModal()">
                + REGISTRAR CIUDAD
              </button>
            }
          </div>
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

      <!-- Loading -->
      @if (isLoading()) {
        <div class="loading-box">
          <span class="spinner"></span>
          <span>CARGANDO SUCURSALES Y CIUDADES...</span>
        </div>
      }

      <!-- TAB: SUCURSALES -->
      @if (!isLoading() && activeTab() === 'SUCURSALES') {
        <div class="branches-grid">
          @for (s of sucursales(); track s.id) {
            <article class="branch-card">
              <div class="branch-card-header">
                <div>
                  <span class="city-tag">{{ s.ciudad?.nombre || 'Ciudad #' + s.ciudad_id }}</span>
                  <h3 class="branch-name">{{ s.nombre }}</h3>
                </div>
                <span class="status-indicator" [class.inactive]="!s.activo">
                  {{ s.activo ? 'OPERATIVA' : 'INACTIVA' }}
                </span>
              </div>

              <p class="branch-address">{{ s.direccion }}</p>

              <div class="branch-specs-box">
                <div class="spec-row">
                  <span class="spec-label">ENCARGADO:</span>
                  <span class="spec-val gold">{{ getEncargadoNombre(s.encargado_id) }}</span>
                </div>
                <div class="spec-row">
                  <span class="spec-label">HORARIO:</span>
                  <span class="spec-val">{{ s.horario_atencion || 'Lun - Sab: 10:00 - 21:00' }}</span>
                </div>
                <div class="spec-row">
                  <span class="spec-label">TELÉFONO:</span>
                  <span class="spec-val">{{ s.telefono || 'No registrado' }}</span>
                </div>
                <div class="spec-row">
                  <span class="spec-label">PROBADORES AR:</span>
                  <span class="spec-val">{{ s.capacidad_probadores }} cabinas</span>
                </div>
              </div>

              <div class="card-footer">
                <button type="button" class="btn-edit-branch" (click)="openEditSucursal(s)">
                  MODIFICAR SUCURSAL
                </button>
              </div>
            </article>
          }
        </div>
      }

      <!-- TAB: CIUDADES -->
      @if (!isLoading() && activeTab() === 'CIUDADES') {
        <div class="cities-grid">
          @for (c of ciudades(); track c.id) {
            <div class="city-card">
              <div class="city-identity">
                <span class="city-code">{{ c.codigo }}</span>
                <h3 class="city-name">{{ c.nombre }}</h3>
              </div>
              <div class="city-status">
                <span class="status-pill">{{ c.activo ? 'ACTIVA' : 'INACTIVA' }}</span>
              </div>
            </div>
          }
        </div>
      }

      <!-- Modal Sucursal -->
      @if (isSucursalModalOpen()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal-container" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <span class="modal-eyebrow">{{ editingSucursalId() ? 'EDITAR SUCURSAL' : 'NUEVA SUCURSAL' }} &bull; CU4</span>
                <h2 class="modal-title">{{ editingSucursalId() ? sNombre : 'Registrar Sucursal' }}</h2>
              </div>
              <button type="button" class="btn-close" (click)="closeModals()">&times;</button>
            </div>

            <form (ngSubmit)="saveSucursal()" class="modal-form">
              <div class="modal-body form-grid">
                <div class="form-group full-span">
                  <label class="form-label">NOMBRE DE LA SUCURSAL</label>
                  <input type="text" [(ngModel)]="sNombre" name="sNombre" required class="form-input" placeholder="Sucursal Equipetrol" />
                </div>
                <div class="form-group full-span">
                  <label class="form-label">DIRECCIÓN FÍSICA</label>
                  <input type="text" [(ngModel)]="sDireccion" name="sDireccion" required class="form-input" placeholder="Av. San Martín #450" />
                </div>
                <div class="form-group">
                  <label class="form-label">CIUDAD</label>
                  <select [(ngModel)]="sCiudadId" name="sCiudadId" required class="form-input">
                    <option [ngValue]="null" disabled>Seleccionar Ciudad...</option>
                    @for (c of ciudades(); track c.id) {
                      <option [ngValue]="c.id">{{ c.nombre }} ({{ c.codigo }})</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">ENCARGADO DE SUCURSAL</label>
                  <select [(ngModel)]="sEncargadoId" name="sEncargadoId" class="form-input">
                    <option [ngValue]="null">Sin encargado asignado</option>
                    @for (u of encargadosDisponibles(); track u.id) {
                      <option [ngValue]="u.id">{{ u.nombre }} {{ u.apellido }} ({{ u.email }})</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">TELÉFONO DE CONTACTO</label>
                  <input type="text" [(ngModel)]="sTelefono" name="sTelefono" class="form-input" placeholder="+591 3 3456789" />
                </div>
                <div class="form-group">
                  <label class="form-label">CAPACIDAD PROBADORES</label>
                  <input type="number" [(ngModel)]="sCapacidad" name="sCapacidad" min="1" max="20" class="form-input" />
                </div>
                <div class="form-group full-span">
                  <label class="form-label">HORARIO DE ATENCIÓN</label>
                  <input type="text" [(ngModel)]="sHorario" name="sHorario" class="form-input" placeholder="Lun - Sab: 10:00 - 21:00" />
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-cancel" (click)="closeModals()">CANCELAR</button>
                <button type="submit" class="btn-save" [disabled]="isSubmitting() || !sNombre || !sCiudadId">
                  {{ isSubmitting() ? 'GUARDANDO...' : 'GUARDAR SUCURSAL' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Ciudad -->
      @if (isCiudadModalOpen()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal-container sm" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <span class="modal-eyebrow">COBERTURA &bull; CU4</span>
                <h2 class="modal-title">Registrar Ciudad</h2>
              </div>
              <button type="button" class="btn-close" (click)="closeModals()">&times;</button>
            </div>

            <form (ngSubmit)="saveCiudad()" class="modal-form">
              <div class="modal-body">
                <div class="form-group">
                  <label class="form-label">NOMBRE DE LA CIUDAD</label>
                  <input type="text" [(ngModel)]="cNombre" name="cNombre" required class="form-input" placeholder="Cochabamba" />
                </div>
                <div class="form-group" style="margin-top: 1rem;">
                  <label class="form-label">CÓDIGO IATA / ABREVIACIÓN</label>
                  <input type="text" [(ngModel)]="cCodigo" name="cCodigo" required maxlength="10" class="form-input" placeholder="CBB" />
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-cancel" (click)="closeModals()">CANCELAR</button>
                <button type="submit" class="btn-save" [disabled]="isSubmitting() || !cNombre || !cCodigo">
                  {{ isSubmitting() ? 'GUARDANDO...' : 'GUARDAR CIUDAD' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .sucursales-container {
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

    .tabs-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .tabs-left {
      display: flex;
      gap: 0.5rem;
    }

    .tab-btn {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #aaaaaa;
      padding: 0.65rem 1.4rem;
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab-btn.active {
      background: var(--color-gold);
      border-color: var(--color-gold);
      color: #000000;
      font-weight: 700;
    }

    .btn-action-gold {
      background: #ffffff;
      color: #000000;
      border: none;
      padding: 0.75rem 1.5rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-action-gold:hover {
      background: var(--color-gold);
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

    .branches-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 2rem;
    }

    .branch-card {
      background: #111111;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: border-color 0.2s ease;
    }

    .branch-card:hover {
      border-color: var(--color-gold);
    }

    .branch-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .city-tag {
      font-size: 0.65rem;
      letter-spacing: 0.15em;
      color: var(--color-gold);
      text-transform: uppercase;
      font-weight: 600;
    }

    .branch-name {
      font-family: var(--font-serif);
      font-size: 1.5rem;
      color: #ffffff;
      margin-top: 2px;
    }

    .status-indicator {
      font-size: 0.6rem;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid #10b981;
      color: #10b981;
      font-weight: 700;
      padding: 2px 6px;
    }

    .status-indicator.inactive {
      background: rgba(239, 68, 68, 0.15);
      border-color: #ef4444;
      color: #ef4444;
    }

    .branch-address {
      font-size: 0.85rem;
      color: #aaaaaa;
      margin-bottom: 1.25rem;
      line-height: 1.4;
    }

    .branch-specs-box {
      background: #090909;
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 1rem;
      margin-bottom: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .spec-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
    }

    .spec-label {
      color: var(--color-on-surface-muted);
      letter-spacing: 0.08em;
    }

    .spec-val {
      color: #ffffff;
      font-weight: 500;
    }

    .spec-val.gold {
      color: var(--color-gold);
    }

    .card-footer {
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .btn-edit-branch {
      width: 100%;
      background: transparent;
      border: 1px solid var(--color-gold);
      color: var(--color-gold);
      padding: 0.6rem;
      font-size: 0.7rem;
      letter-spacing: 0.15em;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-edit-branch:hover {
      background: var(--color-gold);
      color: #000000;
    }

    /* Cities Grid */
    .cities-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    .city-card {
      background: #111111;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .city-code {
      font-size: 0.7rem;
      font-family: monospace;
      color: var(--color-gold);
      display: block;
    }

    .city-name {
      font-family: var(--font-serif);
      font-size: 1.3rem;
      color: #ffffff;
    }

    .status-pill {
      font-size: 0.65rem;
      color: #34d399;
      border: 1px solid #10b981;
      padding: 2px 6px;
    }

    /* Modals */
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
    }

    .modal-container.sm {
      max-width: 480px;
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
export class InventarioPageComponent implements OnInit {
  private readonly inventarioService = inject(InventarioService);
  private readonly usuariosService = inject(UsuariosService);

  readonly sucursales = signal<Sucursal[]>([]);
  readonly ciudades = signal<Ciudad[]>([]);
  readonly personal = signal<UsuarioResponse[]>([]);
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly activeTab = signal<'SUCURSALES' | 'CIUDADES'>('SUCURSALES');

  // Modals
  readonly isSucursalModalOpen = signal(false);
  readonly isCiudadModalOpen = signal(false);
  readonly editingSucursalId = signal<number | null>(null);

  // Form Sucursal
  sNombre = '';
  sDireccion = '';
  sTelefono = '';
  sHorario = '';
  sCapacidad = 3;
  sCiudadId: number | null = null;
  sEncargadoId: number | null = null;

  // Form Ciudad
  cNombre = '';
  cCodigo = '';

  readonly encargadosDisponibles = computed(() => {
    return this.personal().filter(u => u.tipo_usuario === 'PERSONAL');
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.inventarioService.getSucursales().subscribe({
      next: (sList) => {
        this.sucursales.set(sList);
        this.inventarioService.getCiudades().subscribe({
          next: (cList) => {
            this.ciudades.set(cList);
            this.usuariosService.listar({ tipo_usuario: 'PERSONAL' }).subscribe({
              next: (pList) => {
                this.personal.set(pList);
                this.isLoading.set(false);
              },
              error: () => this.isLoading.set(false)
            });
          },
          error: (err) => {
            this.isLoading.set(false);
            this.errorMessage.set(err.error?.detail || 'Error al cargar ciudades.');
          }
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || 'Error al cargar sucursales.');
      }
    });
  }

  getEncargadoNombre(encargadoId?: number | null): string {
    if (!encargadoId) return 'Por asignar';
    const enc = this.personal().find(p => p.id === encargadoId);
    return enc ? `${enc.nombre} ${enc.apellido}` : `Personal #${encargadoId}`;
  }

  openSucursalModal(): void {
    this.editingSucursalId.set(null);
    this.sNombre = '';
    this.sDireccion = '';
    this.sTelefono = '';
    this.sHorario = 'Lun - Sab: 10:00 - 21:00';
    this.sCapacidad = 3;
    this.sCiudadId = this.ciudades().length > 0 ? this.ciudades()[0].id : null;
    this.sEncargadoId = null;
    this.isSucursalModalOpen.set(true);
  }

  openEditSucursal(s: Sucursal): void {
    this.editingSucursalId.set(s.id);
    this.sNombre = s.nombre;
    this.sDireccion = s.direccion;
    this.sTelefono = s.telefono || '';
    this.sHorario = s.horario_atencion || '';
    this.sCapacidad = s.capacidad_probadores;
    this.sCiudadId = s.ciudad_id;
    this.sEncargadoId = s.encargado_id || null;
    this.isSucursalModalOpen.set(true);
  }

  openCiudadModal(): void {
    this.cNombre = '';
    this.cCodigo = '';
    this.isCiudadModalOpen.set(true);
  }

  closeModals(): void {
    this.isSucursalModalOpen.set(false);
    this.isCiudadModalOpen.set(false);
  }

  saveSucursal(): void {
    if (!this.sNombre || !this.sCiudadId) return;
    this.isSubmitting.set(true);

    const id = this.editingSucursalId();
    if (id) {
      const data: SucursalUpdate = {
        nombre: this.sNombre,
        direccion: this.sDireccion,
        telefono: this.sTelefono,
        horario_atencion: this.sHorario,
        capacidad_probadores: this.sCapacidad,
        ciudad_id: this.sCiudadId,
        encargado_id: this.sEncargadoId
      };
      this.inventarioService.updateSucursal(id, data).subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.closeModals();
          this.successMessage.set(`Sucursal '${res.nombre}' actualizada exitosamente.`);
          this.loadData();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.error?.detail || 'Error al actualizar sucursal.');
        }
      });
    } else {
      const data: SucursalCreate = {
        nombre: this.sNombre,
        direccion: this.sDireccion,
        telefono: this.sTelefono,
        horario_atencion: this.sHorario,
        capacidad_probadores: this.sCapacidad,
        ciudad_id: this.sCiudadId,
        encargado_id: this.sEncargadoId
      };
      this.inventarioService.createSucursal(data).subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.closeModals();
          this.successMessage.set(`Sucursal '${res.nombre}' registrada exitosamente.`);
          this.loadData();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.error?.detail || 'Error al registrar sucursal.');
        }
      });
    }
  }

  saveCiudad(): void {
    if (!this.cNombre || !this.cCodigo) return;
    this.isSubmitting.set(true);

    const data: CiudadCreate = {
      nombre: this.cNombre,
      codigo: this.cCodigo.toUpperCase()
    };
    this.inventarioService.createCiudad(data).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.closeModals();
        this.successMessage.set(`Ciudad '${res.nombre}' creada con éxito.`);
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.detail || 'Error al crear ciudad.');
      }
    });
  }
}
