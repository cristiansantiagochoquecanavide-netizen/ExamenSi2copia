import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CatalogoService } from '../services/catalogo.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  Prenda,
  PrendaCreate,
  PrendaUpdate,
  PrendaMultimediaCreate,
  Categoria,
  Temporada,
  Talla,
  Color
} from '../models/catalogo.models';

interface FotoLocal {
  url: string;
  formato: string;
  es_portada: boolean;
  nombre_archivo?: string;
  id_multimedia?: number;
}

@Component({
  selector: 'app-gestion-prendas-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="gestion-container">
      <!-- Top Navigation & Header -->
      <header class="gestion-header">
        <div class="header-left">
          <div class="eyebrow">
            <span class="gold-dot">&bull;</span>
            <span>CATÁLOGO MASTER &bull; ATELIER NOIR</span>
          </div>
          <h1 class="header-title">Gestión de Prendas</h1>
          <p class="header-subtitle">
            Alta manual, edición y administración de catálogo de prendas con galería fotográfica (1 a 5 fotos) y variantes de moda.
          </p>
        </div>

        <div class="header-actions">
          <button type="button" class="btn-back-catalog" (click)="router.navigate(['/catalogo'])">
            &larr; Volver al Catálogo
          </button>
          <button type="button" class="btn-add-primary" (click)="abrirModalCrear()">
            + AÑADIR PRENDA
          </button>
        </div>
      </header>

      <!-- Feedback Banner -->
      <div *ngIf="feedbackMsg()" class="feedback-strip" [class.error]="feedbackIsError()">
        <span>{{ feedbackMsg() }}</span>
        <button type="button" class="btn-close-banner" (click)="feedbackMsg.set(null)">&times;</button>
      </div>

      <!-- Filters & Search Toolbar -->
      <section class="toolbar-section">
        <div class="search-wrap">
          <svg class="search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Buscar por nombre, SKU o descripción..."
            class="search-input"
          />
          <button *ngIf="searchQuery" type="button" class="btn-clear-search" (click)="searchQuery = ''">&times;</button>
        </div>

        <!-- Sector Filter Chips -->
        <div class="sector-chips">
          <button
            type="button"
            class="chip-btn"
            [class.active]="selectedSector() === 'TODAS'"
            (click)="selectedSector.set('TODAS')">
            TODAS ({{ prendas().length }})
          </button>
          <button
            type="button"
            class="chip-btn"
            [class.active]="selectedSector() === 'MUJERES'"
            (click)="selectedSector.set('MUJERES')">
            MUJER
          </button>
          <button
            type="button"
            class="chip-btn"
            [class.active]="selectedSector() === 'HOMBRES'"
            (click)="selectedSector.set('HOMBRES')">
            HOMBRE
          </button>
          <button
            type="button"
            class="chip-btn"
            [class.active]="selectedSector() === 'NINOS'"
            (click)="selectedSector.set('NINOS')">
            NIÑOS
          </button>
          <button
            type="button"
            class="chip-btn"
            [class.active]="selectedSector() === 'UNISEX'"
            (click)="selectedSector.set('UNISEX')">
            UNISEX
          </button>
        </div>

        <!-- Category Dropdown -->
        <div class="category-select-wrap">
          <select [(ngModel)]="selectedCategoriaId" class="category-dropdown">
            <option value="ALL">Todas las categorías</option>
            <option *ngFor="let cat of categorias()" [value]="cat.id">
              {{ cat.nombre }} ({{ cat.sector }})
            </option>
          </select>
        </div>
      </section>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="loading-state">
        <div class="spinner-gold"></div>
        <p>Cargando inventario maestro de prendas...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading() && prendasFiltradas().length === 0" class="empty-state">
        <div class="empty-icon">👗</div>
        <h3 class="empty-title">NO HAY PRENDAS REGISTRADAS</h3>
        <p class="empty-desc">
          El catálogo se encuentra limpio y listo para cargar las prendas de tu boutique.
        </p>
        <button type="button" class="btn-empty-add" (click)="abrirModalCrear()">
          + Cargar Primera Prenda
        </button>
      </div>

      <!-- Table / Cards List -->
      <div *ngIf="!isLoading() && prendasFiltradas().length > 0" class="table-container">
        <table class="gestion-table">
          <thead>
            <tr>
              <th style="width: 70px;">FOTO</th>
              <th>PRENDA / SKU</th>
              <th>CATEGORÍA & SECTOR</th>
              <th>PRECIO</th>
              <th>TALLAS & COLORES</th>
              <th>FOTOS</th>
              <th>ESTADO</th>
              <th style="text-align: right;">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of prendasFiltradas()">
              <!-- Foto Portada -->
              <td>
                <div class="thumb-wrapper">
                  <img [src]="getPortadaUrl(p)" [alt]="p.nombre" class="table-thumb" (error)="handleImgError($event)" />
                </div>
              </td>

              <!-- Nombre y SKU -->
              <td>
                <div class="prenda-main-cell">
                  <span class="prenda-name">{{ p.nombre }}</span>
                  <span class="prenda-sku">{{ p.sku }}</span>
                </div>
              </td>

              <!-- Categoria & Sector -->
              <td>
                <div class="prenda-cat-cell">
                  <span class="cat-pill">{{ p.categoria?.nombre || 'General' }}</span>
                  <span class="sector-label">{{ p.categoria?.sector || 'UNISEX' }}</span>
                </div>
              </td>

              <!-- Precio Base -->
              <td>
                <span class="prenda-price">&dollar;{{ p.precio_base | number:'1.2-2' }}</span>
              </td>

              <!-- Tallas y Colores Variantes -->
              <td>
                <div class="variants-summary">
                  <span class="variant-count">{{ p.variantes.length }} variantes</span>
                  <div class="mini-chips">
                    <span *ngFor="let t of getUniqueSizes(p)" class="mini-size">{{ t }}</span>
                  </div>
                </div>
              </td>

              <!-- Cantidad de Fotos -->
              <td>
                <span class="photos-count-badge">
                  📷 {{ p.multimedia.length }} {{ p.multimedia.length === 1 ? 'foto' : 'fotos' }}
                </span>
              </td>

              <!-- Estado Activo -->
              <td>
                <span class="status-badge" [class.active]="p.activo" [class.inactive]="!p.activo">
                  {{ p.activo ? 'ACTIVA' : 'INACTIVA' }}
                </span>
              </td>

              <!-- Acciones -->
              <td style="text-align: right;">
                <div class="row-actions">
                  <button type="button" class="btn-icon-action btn-edit" (click)="abrirModalEditar(p)" title="Editar prenda">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    <span>Editar</span>
                  </button>
                  <button type="button" class="btn-icon-action btn-delete" (click)="solicitarEliminar(p)" title="Borrar prenda">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    <span>Borrar</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ======================================================== -->
      <!-- MODAL AÑADIR / EDITAR PRENDA                            -->
      <!-- ======================================================== -->
      <div *ngIf="showFormModal()" class="modal-backdrop" (click)="cerrarModalForm()">
        <div class="modal-dialog" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <div class="modal-title-group">
              <span class="modal-badge">{{ isEditing() ? 'MODO EDICIÓN' : 'NUEVA PRENDA' }}</span>
              <h2 class="modal-title">{{ isEditing() ? 'Editar Prenda' : 'Añadir Prenda al Catálogo' }}</h2>
            </div>
            <button type="button" class="btn-close-modal" (click)="cerrarModalForm()">&times;</button>
          </header>

          <form (ngSubmit)="guardarPrenda()" class="modal-form-wrapper">
            <div class="modal-scroll-body">
              <div class="modal-two-cols">
                <!-- COLUMNA IZQUIERDA: GALERÍA DE FOTOS -->
                <div class="col-photos">
                  <fieldset class="form-section-box">
                    <legend class="section-legend">
                      <span>GALERÍA DE FOTOS (1 A 5)</span>
                    </legend>
                    <p class="section-desc">Mínimo 1 foto obligatoria. Máximo 5 fotos.</p>

                    <!-- Upload Drag & Drop Area -->
                    <div
                      class="upload-dropzone"
                      [class.drag-over]="isDragging()"
                      [class.disabled]="fotosSubidas().length >= 5"
                      (dragover)="onDragOver($event)"
                      (dragleave)="onDragLeave($event)"
                      (drop)="onFileDrop($event)"
                      (click)="fileInput.click()">
                      <input
                        #fileInput
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
                        (change)="onFileSelected($event)"
                        style="display: none;"
                      />

                      <div class="dropzone-content">
                        <svg class="dropzone-icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <p class="dropzone-main-text">
                          {{ isUploadingImage() ? 'Subiendo imagen...' : 'Arrastrá fotos o hacé clic' }}
                        </p>
                        <div class="format-badges">
                          <span class="fmt-pill">JPG</span>
                          <span class="fmt-pill">PNG</span>
                          <span class="fmt-pill">WEBP</span>
                          <span class="fmt-pill">AVIF</span>
                        </div>
                        <span class="fmt-limit">Hasta 10 MB c/u &bull; {{ fotosSubidas().length }}/5 cargadas</span>
                      </div>
                    </div>

                    <!-- Upload Spinner / Error -->
                    <div *ngIf="uploadError()" class="upload-error-alert">
                      <span>⚠️ {{ uploadError() }}</span>
                    </div>

                    <!-- Gallery Grid -->
                    <div *ngIf="fotosSubidas().length > 0" class="photos-grid">
                      <div
                        *ngFor="let f of fotosSubidas(); let i = index"
                        class="photo-card"
                        [class.is-cover]="f.es_portada">
                        <img [src]="f.url" alt="Foto prenda {{ i + 1 }}" class="photo-card-img" />

                        <!-- Cover Badge -->
                        <div class="cover-indicator" *ngIf="f.es_portada">
                          ★ PORTADA
                        </div>

                        <!-- Actions overlay -->
                        <div class="photo-card-overlay">
                          <button
                            *ngIf="!f.es_portada"
                            type="button"
                            class="btn-make-cover"
                            (click)="marcarComoPortada(i)"
                            title="Establecer como foto de portada">
                            Hacer Portada
                          </button>
                          <button
                            type="button"
                            class="btn-remove-photo"
                            (click)="eliminarFotoLocal(i)"
                            title="Eliminar esta foto">
                            &times;
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Required warning if 0 photos -->
                    <p *ngIf="fotosSubidas().length === 0" class="field-warning">
                      ⚠️ Es obligatorio agregar al menos 1 foto para guardar la prenda.
                    </p>
                  </fieldset>
                </div>

                <!-- COLUMNA DERECHA: DATOS COMERCIALES Y VARIANTES -->
                <div class="col-data">
                  <!-- SECCIÓN 2: DATOS COMERCIALES MAESTROS -->
                  <fieldset class="form-section-box">
                    <legend class="section-legend">DATOS COMERCIALES</legend>

                    <div class="form-grid-2">
                      <div class="form-field">
                        <label>SKU Identificador *</label>
                        <input
                          type="text"
                          [(ngModel)]="formData.sku"
                          name="sku"
                          placeholder="Ej. NOIR-TRN-001"
                          required
                          class="form-ctrl"
                        />
                        <small class="field-hint">Código único de inventario</small>
                      </div>

                      <div class="form-field">
                        <label>Precio Base ($ USD) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          [(ngModel)]="formData.precio_base"
                          name="precio_base"
                          required
                          class="form-ctrl"
                        />
                      </div>
                    </div>

                    <div class="form-field" style="margin-top: 0.85rem;">
                      <label>Nombre Comercial de la Prenda *</label>
                      <input
                        type="text"
                        [(ngModel)]="formData.nombre"
                        name="nombre"
                        placeholder="Ej. Cashmere Atelier Trench"
                        required
                        class="form-ctrl"
                      />
                    </div>

                    <div class="form-field" style="margin-top: 0.85rem;">
                      <label>Descripción Editorial *</label>
                      <textarea
                        [(ngModel)]="formData.descripcion"
                        name="descripcion"
                        rows="2"
                        placeholder="Detalles sobre cortes arquitectónicos, caída de la tela, etc."
                        required
                        class="form-ctrl textarea-ctrl"
                      ></textarea>
                    </div>

                    <div class="form-grid-2" style="margin-top: 0.85rem;">
                      <div class="form-field">
                        <label>Categoría *</label>
                        <select [(ngModel)]="formData.categoria_id" name="categoria_id" required class="form-ctrl">
                          <option *ngFor="let cat of categorias()" [value]="cat.id">
                            {{ cat.nombre }} ({{ cat.sector }})
                          </option>
                        </select>
                      </div>

                      <div class="form-field">
                        <label>Temporada Comercial *</label>
                        <select [(ngModel)]="formData.temporada_id" name="temporada_id" required class="form-ctrl">
                          <option *ngFor="let temp of temporadas()" [value]="temp.id">
                            {{ temp.nombre }} ({{ temp.codigo }})
                          </option>
                        </select>
                      </div>
                    </div>
                  </fieldset>

                  <!-- SECCIÓN 3: VARIANTES DE MODA (TALLAS Y COLORES) -->
                  <fieldset class="form-section-box" style="margin-top: 1rem;">
                    <legend class="section-legend">VARIANTES DISPONIBLES (TALLAS & COLORES)</legend>
                    <p class="section-desc">Seleccioná las tallas y colores que tendrá la prenda.</p>

                    <!-- Chips de Tallas -->
                    <div class="chips-group-section">
                      <label class="chips-label">TALLAS DISPONIBLES:</label>
                      <div class="interactive-chips">
                        <button
                          *ngFor="let t of tallas()"
                          type="button"
                          class="selectable-chip"
                          [class.selected]="selectedTallasIds().includes(t.id)"
                          (click)="toggleTalla(t.id)">
                          {{ t.codigo }} ({{ t.descripcion }})
                        </button>
                      </div>
                    </div>

                    <!-- Chips de Colores -->
                    <div class="chips-group-section" style="margin-top: 0.85rem;">
                      <label class="chips-label">COLORES DISPONIBLES:</label>
                      <div class="interactive-chips">
                        <button
                          *ngFor="let c of colores()"
                          type="button"
                          class="selectable-chip color-chip"
                          [class.selected]="selectedColoresIds().includes(c.id)"
                          (click)="toggleColor(c.id)">
                          <span class="color-dot" [style.background-color]="c.codigo_hex || '#333'"></span>
                          {{ c.nombre }}
                        </button>
                      </div>
                    </div>
                  </fieldset>
                </div>
              </div>
            </div>

            <!-- Modal Footer Actions (FIXED AT BOTTOM) -->
            <footer class="modal-footer-actions">
              <div class="footer-info">
                <span class="footer-status-pill" [class.ready]="fotosSubidas().length > 0 && formData.sku && formData.nombre">
                  {{ fotosSubidas().length === 0 ? 'Falta agregar foto' : (!formData.sku || !formData.nombre ? 'Completar datos obligatorios' : 'Listo para guardar') }}
                </span>
                <span class="footer-hint">{{ fotosSubidas().length }}/5 fotos &bull; {{ selectedTallasIds().length }} tallas &bull; {{ selectedColoresIds().length }} colores</span>
              </div>
              <div class="footer-buttons">
                <button type="button" class="btn-modal-cancel" (click)="cerrarModalForm()">
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="btn-modal-submit"
                  [disabled]="isSaving() || fotosSubidas().length === 0 || !formData.sku || !formData.nombre">
                  {{ isSaving() ? 'Guardando...' : (isEditing() ? 'Actualizar Prenda' : 'Guardar Prenda') }}
                </button>
              </div>
            </footer>
          </form>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- MODAL CONFIRMACIÓN DE ELIMINACIÓN                       -->
      <!-- ======================================================== -->
      <div *ngIf="prendaAEliminar()" class="modal-backdrop" (click)="prendaAEliminar.set(null)">
        <div class="confirm-dialog" (click)="$event.stopPropagation()">
          <div class="confirm-icon">🗑️</div>
          <h3 class="confirm-title">¿Eliminar esta prenda?</h3>
          <p class="confirm-text">
            Estás por eliminar permanentemente <strong>{{ prendaAEliminar()?.nombre }}</strong> (SKU: {{ prendaAEliminar()?.sku }}).
            Se eliminarán también sus variantes y fotos vinculadas. Esta acción no se puede deshacer.
          </p>
          <div class="confirm-actions">
            <button type="button" class="btn-confirm-cancel" (click)="prendaAEliminar.set(null)">
              Cancelar
            </button>
            <button type="button" class="btn-confirm-delete" (click)="confirmarEliminar()" [disabled]="isDeleting()">
              {{ isDeleting() ? 'Eliminando...' : 'Sí, Eliminar Prenda' }}
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .gestion-container {
      max-width: 1440px;
      margin: 0 auto;
      padding: 2.5rem 2rem 5rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111827;
    }

    .gestion-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2.5rem;
      padding-bottom: 1.75rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .eyebrow {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.15em;
      color: #92400e;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }

    .gold-dot {
      color: #d97706;
      font-size: 1.1rem;
    }

    .header-title {
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #0f172a;
      margin: 0 0 0.5rem 0;
    }

    .header-subtitle {
      font-size: 0.95rem;
      color: #64748b;
      max-width: 700px;
      line-height: 1.5;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .btn-back-catalog {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #475569;
      font-weight: 700;
      font-size: 0.85rem;
      padding: 0.75rem 1.25rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-back-catalog:hover {
      background: #f8fafc;
      color: #0f172a;
      border-color: #94a3b8;
    }

    .btn-add-primary {
      background: #0f172a;
      color: #ffffff;
      border: 1px solid #0f172a;
      font-weight: 700;
      font-size: 0.85rem;
      letter-spacing: 0.08em;
      padding: 0.75rem 1.6rem;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);
      transition: all 0.2s ease;
    }
    .btn-add-primary:hover {
      background: #1e293b;
      border-color: #1e293b;
      transform: translateY(-1px);
    }

    /* Feedback */
    .feedback-strip {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      padding: 0.85rem 1.25rem;
      border-radius: 6px;
      margin-bottom: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
      font-weight: 600;
    }
    .feedback-strip.error {
      background: #fef2f2;
      border-color: #fecaca;
      color: #991b1b;
    }
    .btn-close-banner {
      background: transparent;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      color: inherit;
    }

    /* Toolbar */
    .toolbar-section {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }

    .search-wrap {
      position: relative;
      flex: 1;
      min-width: 280px;
    }
    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      color: #94a3b8;
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      padding: 0.75rem 2.5rem 0.75rem 2.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.9rem;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
    }
    .search-input:focus {
      border-color: #0f172a;
      box-shadow: 0 0 0 1px #0f172a;
    }
    .btn-clear-search {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 1.2rem;
      cursor: pointer;
    }

    .sector-chips {
      display: flex;
      gap: 0.5rem;
    }
    .chip-btn {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      color: #475569;
      font-weight: 700;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
      padding: 0.6rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .chip-btn:hover {
      border-color: #cbd5e1;
      background: #f8fafc;
    }
    .chip-btn.active {
      background: #0f172a;
      border-color: #0f172a;
      color: #ffffff;
    }

    .category-select-wrap {
      min-width: 220px;
    }
    .category-dropdown {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.85rem;
      color: #1e293b;
      background: #ffffff;
      outline: none;
    }

    /* Table */
    .table-container {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .gestion-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .gestion-table th {
      background: #f8fafc;
      color: #475569;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #e2e8f0;
      text-transform: uppercase;
    }
    .gestion-table td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      font-size: 0.88rem;
    }
    .gestion-table tr:last-child td {
      border-bottom: none;
    }
    .gestion-table tr:hover td {
      background: #fcfcfd;
    }

    .thumb-wrapper {
      width: 50px;
      height: 60px;
      border-radius: 4px;
      overflow: hidden;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
    }
    .table-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .prenda-main-cell {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .prenda-name {
      font-weight: 700;
      color: #0f172a;
    }
    .prenda-sku {
      font-size: 0.75rem;
      font-family: monospace;
      color: #64748b;
    }

    .prenda-cat-cell {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .cat-pill {
      font-weight: 600;
      color: #1e293b;
    }
    .sector-label {
      font-size: 0.72rem;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 0.04em;
    }

    .prenda-price {
      font-weight: 800;
      color: #0f172a;
      font-size: 0.95rem;
    }

    .variants-summary {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .variant-count {
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 600;
    }
    .mini-chips {
      display: flex;
      gap: 0.3rem;
      flex-wrap: wrap;
    }
    .mini-size {
      background: #f1f5f9;
      color: #334155;
      font-size: 0.7rem;
      padding: 0.15rem 0.4rem;
      border-radius: 3px;
      font-weight: 700;
    }

    .photos-count-badge {
      font-size: 0.8rem;
      font-weight: 700;
      color: #0f172a;
      background: #f8fafc;
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      display: inline-block;
    }

    .status-badge {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      padding: 0.35rem 0.65rem;
      border-radius: 4px;
      display: inline-block;
    }
    .status-badge.active {
      background: #dcfce7;
      color: #15803d;
    }
    .status-badge.inactive {
      background: #f1f5f9;
      color: #64748b;
    }

    .row-actions {
      display: flex;
      gap: 0.6rem;
      justify-content: flex-end;
    }
    .btn-icon-action {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 0.45rem 0.75rem;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-edit {
      color: #0f172a;
    }
    .btn-edit:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
    .btn-delete {
      color: #dc2626;
    }
    .btn-delete:hover {
      background: #fef2f2;
      border-color: #fecaca;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 5rem 1rem;
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      margin-top: 1.5rem;
    }
    .empty-icon {
      font-size: 3.5rem;
      margin-bottom: 1rem;
    }
    .empty-title {
      font-size: 1.4rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0f172a;
      margin: 0 0 0.5rem 0;
    }
    .empty-desc {
      font-size: 0.95rem;
      color: #64748b;
      margin: 0 0 1.5rem 0;
    }
    .btn-empty-add {
      background: #0f172a;
      color: #ffffff;
      border: none;
      font-weight: 700;
      font-size: 0.9rem;
      padding: 0.85rem 1.8rem;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 3px 12px rgba(15, 23, 42, 0.2);
      transition: all 0.2s ease;
    }
    .btn-empty-add:hover {
      background: #1e293b;
      transform: translateY(-2px);
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .modal-dialog {
      background: #ffffff;
      border-radius: 14px;
      width: 100%;
      max-width: 1080px;
      height: 88vh;
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
      border: 1px solid #cbd5e1;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 2rem;
      border-bottom: 1px solid #f1f5f9;
      background: #ffffff;
      flex-shrink: 0;
      z-index: 10;
    }
    .modal-badge {
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      color: #d97706;
      text-transform: uppercase;
      display: block;
      margin-bottom: 0.25rem;
    }
    .modal-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .btn-close-modal {
      background: none;
      border: none;
      font-size: 1.75rem;
      color: #94a3b8;
      cursor: pointer;
      line-height: 1;
      padding: 0.25rem;
      border-radius: 6px;
      transition: all 0.15s ease;
    }
    .btn-close-modal:hover {
      color: #0f172a;
      background: #f1f5f9;
    }

    .modal-form-wrapper {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .modal-scroll-body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 1.5rem 2rem;
    }

    .modal-two-cols {
      display: grid;
      grid-template-columns: 360px 1fr;
      gap: 1.5rem;
      align-items: start;
    }

    .col-photos,
    .col-data {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-section-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.15rem 1.25rem 1.25rem;
      background: #fafafa;
    }
    .section-legend {
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #0f172a;
      padding: 0 0.5rem;
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .legend-hint {
      font-size: 0.72rem;
      font-weight: 500;
      color: #64748b;
      letter-spacing: normal;
    }
    .section-desc {
      font-size: 0.78rem;
      color: #64748b;
      margin: 0 0 0.75rem 0;
      line-height: 1.4;
    }

    /* Dropzone */
    .upload-dropzone {
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      padding: 1.25rem 1rem;
      text-align: center;
      background: #ffffff;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 0.75rem;
    }
    .upload-dropzone:hover {
      border-color: #0f172a;
      background: #f8fafc;
    }
    .upload-dropzone.drag-over {
      border-color: #d97706;
      background: #fffbeb;
    }
    .upload-dropzone.disabled {
      opacity: 0.5;
      pointer-events: none;
    }
    .dropzone-icon {
      color: #94a3b8;
      margin-bottom: 0.4rem;
    }
    .dropzone-main-text {
      font-size: 0.85rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.45rem 0;
    }
    .format-badges {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
    }
    .fmt-pill {
      background: #f1f5f9;
      color: #334155;
      font-size: 0.65rem;
      font-weight: 800;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
    }
    .fmt-limit {
      display: block;
      font-size: 0.7rem;
      color: #64748b;
      margin-top: 0.4rem;
    }

    .upload-error-alert {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 0.65rem;
      border-radius: 6px;
      font-size: 0.8rem;
      margin-bottom: 0.75rem;
    }

    /* Photos Grid */
    .photos-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
      margin-top: 0.75rem;
    }
    .photo-card {
      position: relative;
      height: 125px;
      border-radius: 6px;
      overflow: hidden;
      border: 2px solid #e2e8f0;
      background: #0f172a;
    }
    .photo-card.is-cover {
      border-color: #d97706;
      box-shadow: 0 0 0 1px #d97706;
    }
    .photo-card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .cover-indicator {
      position: absolute;
      top: 6px;
      left: 6px;
      background: #d97706;
      color: #ffffff;
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      padding: 0.2rem 0.45rem;
      border-radius: 3px;
      z-index: 2;
    }
    .photo-card-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      opacity: 0;
      transition: opacity 0.2s ease;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: flex-end;
      padding: 0.5rem;
      z-index: 3;
    }
    .photo-card:hover .photo-card-overlay {
      opacity: 1;
    }
    .btn-remove-photo {
      background: #dc2626;
      color: #ffffff;
      border: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      font-size: 1.1rem;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .btn-make-cover {
      background: #d97706;
      color: #ffffff;
      border: none;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.35rem 0.5rem;
      border-radius: 4px;
      cursor: pointer;
      align-self: center;
      margin-top: auto;
      margin-bottom: auto;
    }

    .field-warning {
      color: #b45309;
      font-size: 0.8rem;
      font-weight: 600;
      margin: 0.5rem 0 0 0;
    }

    /* Form Inputs */
    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .form-grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1rem;
    }
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .form-field label {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #475569;
      text-transform: uppercase;
    }
    .form-ctrl {
      padding: 0.75rem 0.9rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.88rem;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      box-sizing: border-box;
    }
    .form-ctrl:focus {
      border-color: #0f172a;
      box-shadow: 0 0 0 1px #0f172a;
    }
    .textarea-ctrl {
      resize: vertical;
      min-height: 80px;
    }
    .field-hint {
      font-size: 0.7rem;
      color: #94a3b8;
    }

    /* Chips Selector */
    .chips-group-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .chips-label {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #64748b;
    }
    .interactive-chips {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .selectable-chip {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #334155;
      font-weight: 700;
      font-size: 0.78rem;
      padding: 0.5rem 0.85rem;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      transition: all 0.2s ease;
    }
    .selectable-chip:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .selectable-chip.selected {
      background: #0f172a;
      border-color: #0f172a;
      color: #ffffff;
    }
    .color-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 1px solid rgba(0, 0, 0, 0.2);
    }

    /* Modal Footer */
    .modal-footer-actions {
      flex-shrink: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 2rem;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      gap: 1rem;
    }
    .footer-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .footer-status-pill {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.25rem 0.6rem;
      border-radius: 999px;
      background: #fef3c7;
      color: #92400e;
    }
    .footer-status-pill.ready {
      background: #dcfce7;
      color: #15803d;
    }
    .footer-hint {
      font-size: 0.75rem;
      color: #64748b;
    }
    .footer-buttons {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .btn-modal-cancel {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #475569;
      font-weight: 700;
      font-size: 0.85rem;
      padding: 0.75rem 1.4rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-modal-cancel:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .btn-modal-submit {
      background: #0f172a;
      color: #ffffff;
      border: none;
      font-weight: 700;
      font-size: 0.85rem;
      letter-spacing: 0.05em;
      padding: 0.75rem 1.8rem;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
      transition: all 0.2s ease;
    }
    .btn-modal-submit:hover {
      background: #1e293b;
    }
    .btn-modal-submit:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    @media (max-width: 960px) {
      .modal-dialog {
        height: auto;
        max-height: 94vh;
      }
      .modal-two-cols {
        grid-template-columns: 1fr;
      }
      .modal-footer-actions {
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
      }
      .footer-buttons {
        justify-content: flex-end;
      }
    }

    /* Confirm Dialog */
    .confirm-dialog {
      background: #ffffff;
      border-radius: 12px;
      padding: 2.5rem 2rem;
      max-width: 480px;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
    }
    .confirm-icon {
      font-size: 2.8rem;
      margin-bottom: 1rem;
    }
    .confirm-title {
      font-size: 1.3rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.75rem 0;
    }
    .confirm-text {
      font-size: 0.9rem;
      color: #64748b;
      line-height: 1.5;
      margin: 0 0 2rem 0;
    }
    .confirm-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }
    .btn-confirm-cancel {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #475569;
      font-weight: 700;
      font-size: 0.85rem;
      padding: 0.75rem 1.4rem;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn-confirm-delete {
      background: #dc2626;
      border: 1px solid #dc2626;
      color: #ffffff;
      font-weight: 700;
      font-size: 0.85rem;
      padding: 0.75rem 1.6rem;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn-confirm-delete:hover {
      background: #b91c1c;
    }
    .btn-confirm-delete:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .loading-state {
      text-align: center;
      padding: 5rem 1rem;
      color: #64748b;
    }
    .spinner-gold {
      display: inline-block;
      width: 36px;
      height: 36px;
      border: 3px solid rgba(217, 119, 6, 0.2);
      border-top-color: #d97706;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 1rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class GestionPrendasPageComponent implements OnInit {
  private readonly catalogoService = inject(CatalogoService);
  readonly authService = inject(AuthService);
  readonly router = inject(Router);

  prendas = signal<Prenda[]>([]);
  categorias = signal<Categoria[]>([]);
  temporadas = signal<Temporada[]>([]);
  tallas = signal<Talla[]>([]);
  colores = signal<Color[]>([]);

  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isDeleting = signal<boolean>(false);
  isUploadingImage = signal<boolean>(false);
  isDragging = signal<boolean>(false);

  feedbackMsg = signal<string | null>(null);
  feedbackIsError = signal<boolean>(false);
  uploadError = signal<string | null>(null);

  // Filters
  searchQuery = '';
  selectedSector = signal<'TODAS' | 'MUJERES' | 'HOMBRES' | 'NINOS' | 'UNISEX'>('TODAS');
  selectedCategoriaId: number | 'ALL' = 'ALL';

  // Modals
  showFormModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  editingPrendaId: number | null = null;
  prendaAEliminar = signal<Prenda | null>(null);

  // Form Model
  formData: PrendaCreate = {
    sku: '',
    nombre: '',
    descripcion: '',
    precio_base: 180,
    categoria_id: 1,
    temporada_id: 1
  };
  fotosSubidas = signal<FotoLocal[]>([]);
  selectedTallasIds = signal<number[]>([]);
  selectedColoresIds = signal<number[]>([]);

  prendasFiltradas = computed(() => {
    let list = this.prendas();
    const sec = this.selectedSector();
    const catId = this.selectedCategoriaId;
    const query = this.searchQuery.trim().toLowerCase();

    if (sec !== 'TODAS') {
      list = list.filter(p => p.categoria?.sector === sec || p.categoria?.sector === 'UNISEX');
    }

    if (catId !== 'ALL') {
      list = list.filter(p => p.categoria_id === Number(catId));
    }

    if (query) {
      list = list.filter(p =>
        p.nombre.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.descripcion.toLowerCase().includes(query) ||
        (p.categoria?.nombre && p.categoria.nombre.toLowerCase().includes(query))
      );
    }

    return list;
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.isLoading.set(true);
    this.catalogoService.getPrendas().subscribe({
      next: (data) => {
        this.prendas.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.mostrarMensaje('Error al cargar prendas: ' + (err.error?.detail || err.message), true);
      }
    });

    this.catalogoService.getCategorias().subscribe({
      next: (cats) => {
        this.categorias.set(cats);
        if (cats.length > 0 && !this.formData.categoria_id) {
          this.formData.categoria_id = cats[0].id;
        }
      }
    });

    this.catalogoService.getTemporadas().subscribe({
      next: (temps) => {
        this.temporadas.set(temps);
        if (temps.length > 0 && !this.formData.temporada_id) {
          this.formData.temporada_id = temps[0].id;
        }
      }
    });

    this.catalogoService.getTallas().subscribe({
      next: (t) => this.tallas.set(t)
    });

    this.catalogoService.getColores().subscribe({
      next: (c) => this.colores.set(c)
    });
  }

  abrirModalCrear(): void {
    this.isEditing.set(false);
    this.editingPrendaId = null;
    this.formData = {
      sku: `NOIR-${Math.floor(1000 + Math.random() * 9000)}`,
      nombre: '',
      descripcion: '',
      precio_base: 250,
      categoria_id: this.categorias()[0]?.id || 1,
      temporada_id: this.temporadas()[0]?.id || 1
    };
    this.fotosSubidas.set([]);
    // Default select standard sizes and first color
    this.selectedTallasIds.set(this.tallas().slice(0, 3).map(t => t.id));
    this.selectedColoresIds.set(this.colores().slice(0, 1).map(c => c.id));
    this.uploadError.set(null);
    this.showFormModal.set(true);
  }

  abrirModalEditar(prenda: Prenda): void {
    this.isEditing.set(true);
    this.editingPrendaId = prenda.id;
    this.formData = {
      sku: prenda.sku,
      nombre: prenda.nombre,
      descripcion: prenda.descripcion,
      precio_base: Number(prenda.precio_base),
      categoria_id: prenda.categoria_id,
      temporada_id: prenda.temporada_id
    };

    // Load existing photos
    const fotos: FotoLocal[] = (prenda.multimedia || [])
      .filter(m => m.tipo === 'IMAGEN')
      .map(m => ({
        url: m.url,
        formato: m.formato,
        es_portada: m.es_portada,
        id_multimedia: m.id
      }));

    if (fotos.length > 0 && !fotos.some(f => f.es_portada)) {
      fotos[0].es_portada = true;
    }
    this.fotosSubidas.set(fotos);

    // Extract sizes and colors from variants
    const tallasIds = Array.from(new Set(prenda.variantes.map(v => v.talla_id)));
    const coloresIds = Array.from(new Set(prenda.variantes.map(v => v.color_id)));
    this.selectedTallasIds.set(tallasIds);
    this.selectedColoresIds.set(coloresIds);

    this.uploadError.set(null);
    this.showFormModal.set(true);
  }

  cerrarModalForm(): void {
    this.showFormModal.set(false);
  }

  // File Upload Handlers
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (this.fotosSubidas().length < 5) {
      this.isDragging.set(true);
    }
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(false);
  }

  onFileDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(false);
    if (!e.dataTransfer || !e.dataTransfer.files) return;
    this.procesarArchivos(Array.from(e.dataTransfer.files));
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input && input.files) {
      this.procesarArchivos(Array.from(input.files));
      input.value = '';
    }
  }

  procesarArchivos(archivos: File[]): void {
    this.uploadError.set(null);
    const espacioDisponible = 5 - this.fotosSubidas().length;
    if (espacioDisponible <= 0) {
      this.uploadError.set('Ya has alcanzado el límite máximo de 5 fotos por prenda.');
      return;
    }

    const permitidos = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
    const archivosAProcesar = archivos.slice(0, espacioDisponible);

    for (const file of archivosAProcesar) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!permitidos.includes(ext)) {
        this.uploadError.set(`Formato '${ext}' no admitido. Formatos permitidos: JPG, PNG, WEBP, AVIF.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        this.uploadError.set(`El archivo '${file.name}' excede el límite de 10 MB.`);
        continue;
      }

      this.isUploadingImage.set(true);
      this.catalogoService.uploadImagen(file).subscribe({
        next: (res) => {
          this.isUploadingImage.set(false);
          const current = [...this.fotosSubidas()];
          const esPrimera = current.length === 0;
          current.push({
            url: res.url,
            formato: res.formato,
            es_portada: esPrimera,
            nombre_archivo: res.nombre_original
          });
          this.fotosSubidas.set(current);
        },
        error: (err) => {
          this.isUploadingImage.set(false);
          this.uploadError.set('Error al subir imagen: ' + (err.error?.detail || err.message));
        }
      });
    }
  }

  marcarComoPortada(index: number): void {
    const updated = this.fotosSubidas().map((f, i) => ({
      ...f,
      es_portada: i === index
    }));
    this.fotosSubidas.set(updated);
  }

  eliminarFotoLocal(index: number): void {
    const current = [...this.fotosSubidas()];
    const wasCover = current[index].es_portada;
    current.splice(index, 1);
    if (wasCover && current.length > 0) {
      current[0].es_portada = true;
    }
    this.fotosSubidas.set(current);
  }

  // Tallas y Colores Toggle
  toggleTalla(id: number): void {
    const cur = [...this.selectedTallasIds()];
    const idx = cur.indexOf(id);
    if (idx > -1) {
      if (cur.length > 1) cur.splice(idx, 1);
    } else {
      cur.push(id);
    }
    this.selectedTallasIds.set(cur);
  }

  toggleColor(id: number): void {
    const cur = [...this.selectedColoresIds()];
    const idx = cur.indexOf(id);
    if (idx > -1) {
      if (cur.length > 1) cur.splice(idx, 1);
    } else {
      cur.push(id);
    }
    this.selectedColoresIds.set(cur);
  }

  // Guardar Prenda (Crear o Actualizar)
  guardarPrenda(): void {
    if (this.fotosSubidas().length === 0) {
      this.uploadError.set('Debes subir al menos 1 foto obligatoria para la prenda.');
      return;
    }

    this.isSaving.set(true);

    const multimediaPayload: PrendaMultimediaCreate[] = this.fotosSubidas().map(f => ({
      tipo: 'IMAGEN',
      url: f.url,
      formato: f.formato,
      es_portada: f.es_portada
    }));

    if (this.isEditing() && this.editingPrendaId) {
      // Actualizar
      const updateData: PrendaUpdate = {
        sku: this.formData.sku,
        nombre: this.formData.nombre,
        descripcion: this.formData.descripcion,
        precio_base: Number(this.formData.precio_base),
        categoria_id: Number(this.formData.categoria_id),
        temporada_id: Number(this.formData.temporada_id),
        tallas_ids: this.selectedTallasIds(),
        colores_ids: this.selectedColoresIds(),
        multimedia: multimediaPayload
      };

      this.catalogoService.updatePrenda(this.editingPrendaId, updateData).subscribe({
        next: (actualizada) => {
          this.isSaving.set(false);
          this.cerrarModalForm();
          this.mostrarMensaje(`Prenda '${actualizada.nombre}' actualizada exitosamente.`);
          this.cargarDatos();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.mostrarMensaje('Error al actualizar prenda: ' + (err.error?.detail || err.message), true);
        }
      });
    } else {
      // Crear nueva
      const createData: PrendaCreate = {
        sku: this.formData.sku,
        nombre: this.formData.nombre,
        descripcion: this.formData.descripcion,
        precio_base: Number(this.formData.precio_base),
        categoria_id: Number(this.formData.categoria_id),
        temporada_id: Number(this.formData.temporada_id),
        tallas_ids: this.selectedTallasIds(),
        colores_ids: this.selectedColoresIds(),
        multimedia: multimediaPayload
      };

      this.catalogoService.createPrenda(createData).subscribe({
        next: (creada) => {
          this.isSaving.set(false);
          this.cerrarModalForm();
          this.mostrarMensaje(`Prenda '${creada.nombre}' creada y vinculada con ${multimediaPayload.length} fotos exitosamente.`);
          this.cargarDatos();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.mostrarMensaje('Error al crear prenda: ' + (err.error?.detail || err.message), true);
        }
      });
    }
  }

  // Eliminar Prenda
  solicitarEliminar(prenda: Prenda): void {
    this.prendaAEliminar.set(prenda);
  }

  confirmarEliminar(): void {
    const target = this.prendaAEliminar();
    if (!target) return;

    this.isDeleting.set(true);
    this.catalogoService.deletePrenda(target.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.prendaAEliminar.set(null);
        this.mostrarMensaje(`Prenda '${target.nombre}' eliminada permanentemente del catálogo.`);
        this.cargarDatos();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.mostrarMensaje('Error al eliminar prenda: ' + (err.error?.detail || err.message), true);
      }
    });
  }

  // Helpers
  getPortadaUrl(prenda: Prenda): string {
    const portada = prenda.multimedia?.find(m => m.es_portada && m.tipo === 'IMAGEN');
    if (portada) return portada.url;
    const primeraImg = prenda.multimedia?.find(m => m.tipo === 'IMAGEN');
    if (primeraImg) return primeraImg.url;
    return 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80';
  }

  getUniqueSizes(prenda: Prenda): string[] {
    const setSizes = new Set<string>();
    for (const v of prenda.variantes || []) {
      if (v.talla?.codigo) setSizes.add(v.talla.codigo);
    }
    return Array.from(setSizes);
  }

  handleImgError(event: any): void {
    event.target.src = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80';
  }

  mostrarMensaje(msg: string, isError: boolean = false): void {
    this.feedbackMsg.set(msg);
    this.feedbackIsError.set(isError);
    if (!isError) {
      setTimeout(() => {
        if (this.feedbackMsg() === msg) {
          this.feedbackMsg.set(null);
        }
      }, 5000);
    }
  }
}
