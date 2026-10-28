import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CatalogoService } from '../services/catalogo.service';
import { SaasService } from '../../../core/services/saas.service';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import {
  Prenda,
  PrendaCreate,
  PrendaUpdate,
  PrendaMultimediaCreate,
  Categoria,
  Temporada,
  Talla,
  Color,
  Sucursal,
  StockDistribucionItem
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
            [class.active]="selectedSector() === 'UNISEX'"
            (click)="selectedSector.set('UNISEX')">
            UNISEX
          </button>
        </div>

        <!-- Category Dropdown -->
        <div class="category-select-wrap">
          <select [(ngModel)]="selectedCategoriaId" class="category-dropdown">
            <option value="ALL">Todas las categorías</option>
            <optgroup label="MUJERES">
              <option *ngFor="let cat of categoriasMujer()" [value]="cat.id">{{ cat.nombre }}</option>
            </optgroup>
            <optgroup label="HOMBRES">
              <option *ngFor="let cat of categoriasHombre()" [value]="cat.id">{{ cat.nombre }}</option>
            </optgroup>
            <optgroup label="UNISEX">
              <option *ngFor="let cat of categoriasUnisex()" [value]="cat.id">{{ cat.nombre }}</option>
            </optgroup>
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
        <div class="empty-icon">
          <span class="material-symbols-outlined" style="font-size: 40px; color: #64748b;">inventory_2</span>
        </div>
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
              <th>STOCK</th>
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
                <span class="prenda-price">Bs. {{ p.precio_base | number:'1.2-2' }}</span>
              </td>

              <!-- Stock Total -->
              <td>
                <div class="stock-summary-cell">
                  <span class="stock-pill" [class.in-stock]="(p.stock_total || 0) > 0" [class.out-of-stock]="(p.stock_total || 0) <= 0">
                    <span class="stock-dot">&bull;</span>
                    {{ (p.stock_total || 0) > 0 ? (p.stock_total + ' uds') : 'Agotado' }}
                  </span>
                </div>
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
              <td style="white-space: nowrap;">
                <span class="photos-count-badge">
                  {{ p.multimedia.length }} {{ p.multimedia.length === 1 ? 'foto' : 'fotos' }}
                </span>
              </td>

              <!-- Estado Activo / Inactivo Informativo -->
              <td>
                <span
                  class="status-badge"
                  [class.active]="p.activo"
                  [class.inactive]="!p.activo">
                  <span class="status-indicator-dot"></span>
                  <span class="status-txt-main">{{ p.activo ? 'ACTIVA' : 'INACTIVA' }}</span>
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
                      <span class="material-symbols-outlined alert-symbol">warning</span>
                      <span>{{ uploadError() }}</span>
                    </div>

                    <!-- Gallery Grid -->
                    <div *ngIf="fotosSubidas().length > 0" class="photos-grid">
                      <div
                        *ngFor="let f of fotosSubidas(); let i = index"
                        class="photo-card"
                        [class.is-cover]="f.es_portada">
                        <img [src]="resolveImageUrl(f.url)" alt="Foto prenda {{ i + 1 }}" class="photo-card-img" />

                        <!-- Cover Badge -->
                        <div class="cover-indicator" *ngIf="f.es_portada">
                          PORTADA
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
                      <span class="material-symbols-outlined alert-symbol">info</span> Es obligatorio agregar al menos 1 foto para guardar la prenda.
                    </p>
                  </fieldset>
                </div>

                <!-- COLUMNA DERECHA: DATOS COMERCIALES Y VARIANTES -->
                <div class="col-data">
                  <!-- SECCIÓN 2: DATOS COMERCIALES MAESTROS -->
                  <fieldset class="form-section-box">
                    <legend class="section-legend">DATOS COMERCIALES</legend>

                    <div class="comerciales-grid">
                      <!-- Fila 1: Campos superiores con ancho ajustado a su título -->
                      <div class="form-field field-sku">
                        <label>SKU Identificador *</label>
                        <input
                          type="text"
                          [(ngModel)]="formData.sku"
                          name="sku"
                          placeholder="Ej. NOIR-TRN-001"
                          required
                          class="form-ctrl"
                        />
                        <small class="field-hint">Código único</small>
                      </div>

                      <div class="form-field field-precio">
                        <label>Precio Base (Bs.) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          [(ngModel)]="formData.precio_base"
                          name="precio_base"
                          required
                          class="form-ctrl"
                        />
                        <small class="field-hint">Moneda nacional</small>
                      </div>

                      <div class="form-field field-stock">
                        <label>Stock Total (Uds)</label>
                        <div class="stock-total-display">
                          <span class="stock-total-number">{{ totalStockCalculado() }}</span>
                          <span class="stock-total-unit">uds</span>
                        </div>
                        <small class="field-hint">Auto-calculado por sucursal</small>
                      </div>

                      <!-- Fila 2: Nombre Comercial que termina exactamente en el borde derecho de Stock Inicial -->
                      <div class="form-field field-nombre">
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

                      <!-- Fila 3: Descripción Editorial alineada al mismo borde derecho -->
                      <div class="form-field field-descripcion">
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

                      <!-- Fila 4: Categoría y Temporada alineadas al mismo ancho total -->
                      <div class="field-clasificacion-wrap">
                        <div class="form-field">
                          <label>Categoría *</label>
                          <select [(ngModel)]="formData.categoria_id" name="categoria_id" required class="form-ctrl">
                            <optgroup label="MUJERES">
                              <option *ngFor="let cat of categoriasMujer()" [value]="cat.id">
                                {{ cat.nombre }}
                              </option>
                            </optgroup>
                            <optgroup label="HOMBRES">
                              <option *ngFor="let cat of categoriasHombre()" [value]="cat.id">
                                {{ cat.nombre }}
                              </option>
                            </optgroup>
                            <optgroup label="UNISEX">
                              <option *ngFor="let cat of categoriasUnisex()" [value]="cat.id">
                                {{ cat.nombre }}
                              </option>
                            </optgroup>
                          </select>
                        </div>

                        <div class="form-field">
                          <label>Temporada Comercial *</label>
                          <select [(ngModel)]="formData.temporada_id" name="temporada_id" required class="form-ctrl">
                            <option *ngFor="let temp of temporadas()" [value]="temp.id">
                              {{ temp.nombre }}{{ temp.codigo && temp.codigo !== 'CASUAL' && temp.codigo !== 'SIN-TEMP' ? ' (' + temp.codigo + ')' : '' }}
                            </option>
                          </select>
                        </div>
                      </div>

                      <!-- Fila 5: Estado de Publicación / Visibilidad en Tienda -->
                      <div class="field-visibilidad-wrap">
                        <label class="field-visibilidad-label">ESTADO DE PUBLICACIÓN (VISIBILIDAD EN TIENDA)</label>
                        <div class="visibilidad-toggle-card" [class.is-active]="formData.activo" (click)="formData.activo = !formData.activo">
                          <label class="switch-toggle" (click)="$event.stopPropagation()">
                            <input type="checkbox" [(ngModel)]="formData.activo" name="activo" />
                            <span class="switch-slider"></span>
                          </label>
                          <div class="visibilidad-info">
                            <span class="visibilidad-title">
                              {{ formData.activo ? 'Prenda Activa (Visible en catálogo)' : 'Prenda Pausada (Oculta para clientes)' }}
                            </span>
                            <span class="visibilidad-sub">
                              {{ formData.activo ? 'Disponible para búsqueda, visualización y compra en catálogo.' : 'Oculta en la web. Ideal para preparar lanzamientos y colecciones.' }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </fieldset>

                  <!-- SECCIÓN 3: VARIANTES DE MODA (TALLAS Y COLORES) -->
                  <fieldset class="form-section-box" style="margin-top: 0.65rem;">
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
                    <div class="chips-group-section color-section-wrap" style="margin-top: 0.65rem;">
                      <div class="color-header-row">
                        <label class="chips-label">COLORES DISPONIBLES:</label>
                        <span class="color-palette-legend">Tono Claro &larr; &bull; &rarr; Tono Fuerte</span>
                      </div>
                      <div class="color-chips-grid">
                        <button
                          *ngFor="let c of colores()"
                          type="button"
                          class="selectable-chip color-chip"
                          [class.selected]="selectedColoresIds().includes(c.id)"
                          (click)="toggleColor(c.id)"
                          [title]="c.nombre">
                          <span class="color-dot" [style.background-color]="c.codigo_hex || '#333'"></span>
                          <span class="color-chip-text">{{ c.nombre }}</span>
                        </button>
                      </div>
                    </div>

                    <!-- MINI-GRILLA DE STOCK POR VARIANTE Y SUCURSAL -->
                    <div class="stock-matrix-section" *ngIf="stockFilas().length > 0 && sucursales().length > 0">
                      <div class="stock-matrix-header">
                        <div class="stock-matrix-title-wrap">
                          <span class="matrix-tag">DISTRIBUCIÓN REAL</span>
                          <label class="chips-label">STOCK POR VARIANTE Y SUCURSAL:</label>
                        </div>
                        <span class="stock-matrix-sub">Ingresá las unidades físicas disponibles en cada tienda</span>
                      </div>

                      <div class="stock-matrix-table-wrap">
                        <table class="stock-matrix-table">
                          <thead>
                            <tr>
                              <th>Talla / Variante</th>
                              <th *ngFor="let suc of sucursales()" class="col-sucursal">
                                {{ suc.nombre }}
                              </th>
                              <th class="col-subtotal">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr *ngFor="let row of stockFilas()">
                              <td class="cell-variante">
                                <span class="row-talla">{{ row.tallaDesc }}</span>
                                <span class="row-color" *ngIf="selectedColoresIds().length > 1">
                                  <span class="color-dot-mini" [style.background-color]="row.colorHex"></span>
                                  {{ row.colorNombre }}
                                </span>
                              </td>
                              <td *ngFor="let suc of sucursales()" class="cell-input">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  [value]="getStockQty(row.tallaId, row.colorId, suc.id)"
                                  (input)="setStockQty(row.tallaId, row.colorId, suc.id, $event)"
                                  class="matrix-stock-input"
                                  placeholder="0"
                                />
                              </td>
                              <td class="cell-subtotal">
                                <span class="subtotal-badge">{{ getSubtotalFila(row.tallaId, row.colorId) }} uds</span>
                              </td>
                            </tr>
                          </tbody>
                          <tfoot>
                            <tr class="stock-matrix-total-row">
                              <td><strong>Total Inventario</strong></td>
                              <td *ngFor="let suc of sucursales()" class="cell-total-suc">
                                <strong>{{ getTotalSucursal(suc.id) }} uds</strong>
                              </td>
                              <td class="cell-grand-total">
                                <span class="grand-total-badge">{{ totalStockCalculado() }} uds</span>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </fieldset>

                  <!-- SECCIÓN 4: GUÍA ANATÓMICA DE MEDIDAS EN CENTÍMETROS (CU06) -->
                  <fieldset class="form-section-box" style="margin-top: 0.65rem;" *ngIf="selectedTallasIds().length > 0">
                    <legend class="section-legend">GUÍA ANATÓMICA DE MEDIDAS (EN CM - CU06)</legend>
                    <p class="section-desc">Dimensiones corporales en centímetros por talla (pecho, cintura, cadera, largo, manga).</p>

                    <div class="guia-medidas-table-wrap">
                      <table class="guia-table">
                        <thead>
                          <tr>
                            <th>Talla</th>
                            <th>Pecho (cm)</th>
                            <th>Cintura (cm)</th>
                            <th>Cadera (cm)</th>
                            <th>Largo (cm)</th>
                            <th>Manga (cm)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr *ngFor="let t of getSelectedTallasList()">
                            <td class="cell-talla-code"><strong>{{ t.codigo }}</strong></td>
                            <td><input type="number" min="1" step="0.5" [(ngModel)]="getMedida(t.id).pecho_cm" [name]="'pecho_' + t.id" class="input-measure" /></td>
                            <td><input type="number" min="1" step="0.5" [(ngModel)]="getMedida(t.id).cintura_cm" [name]="'cintura_' + t.id" class="input-measure" /></td>
                            <td><input type="number" min="1" step="0.5" [(ngModel)]="getMedida(t.id).cadera_cm" [name]="'cadera_' + t.id" class="input-measure" /></td>
                            <td><input type="number" min="1" step="0.5" [(ngModel)]="getMedida(t.id).largo_cm" [name]="'largo_' + t.id" class="input-measure" /></td>
                            <td><input type="number" min="1" step="0.5" [(ngModel)]="getMedida(t.id).manga_cm" [name]="'manga_' + t.id" class="input-measure" /></td>
                          </tr>
                        </tbody>
                      </table>
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
                  [disabled]="isSaving() || isUploadingImage() || fotosSubidas().length === 0 || !formData.sku || !formData.nombre">
                  {{ isSaving() ? 'Guardando...' : (isUploadingImage() ? 'Subiendo fotos...' : (isEditing() ? 'Actualizar Prenda' : 'Guardar Prenda')) }}
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
          <div class="confirm-icon">
            <span class="material-symbols-outlined" style="font-size: 32px; color: #dc2626;">delete_forever</span>
          </div>
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
      max-width: 100%;
      margin: 0 auto;
      padding: 0.75rem 0.5rem 3rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111827;
      box-sizing: border-box;
    }

    .gestion-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e5e7eb;
      gap: 1rem;
      flex-wrap: wrap;
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
      margin-bottom: 0.35rem;
    }

    .gold-dot {
      color: #d97706;
      font-size: 1.1rem;
    }

    .header-title {
      font-size: 1.65rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0f172a;
      margin: 0 0 0.35rem 0;
    }

    .header-subtitle {
      font-size: 0.88rem;
      color: #64748b;
      max-width: 700px;
      line-height: 1.4;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .btn-back-catalog {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #475569;
      font-weight: 700;
      font-size: 0.8rem;
      padding: 0.55rem 1rem;
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
      font-size: 0.8rem;
      letter-spacing: 0.06em;
      padding: 0.55rem 1.25rem;
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
      z-index: 3;
    }
    .search-input {
      width: 100%;
      padding: 0.75rem 2.5rem 0.75rem 2.75rem !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 8px !important;
      font-size: 0.9rem !important;
      background-color: #ffffff !important;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
    }
    .search-input:focus {
      border-color: #0f172a !important;
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
      overflow-x: auto;
      width: 100%;
      max-width: 100%;
      -webkit-overflow-scrolling: touch;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .gestion-table {
      width: 100%;
      min-width: 820px;
      border-collapse: collapse;
      text-align: left;
    }
    .gestion-table th {
      background: #f8fafc;
      color: #475569;
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      padding: 0.55rem 0.7rem;
      border-bottom: 1px solid #e2e8f0;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .gestion-table td {
      padding: 0.55rem 0.7rem;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      font-size: 0.8rem;
    }
    .gestion-table tr:last-child td {
      border-bottom: none;
    }
    .gestion-table tr:hover td {
      background: #fcfcfd;
    }

    .thumb-wrapper {
      width: 38px;
      height: 46px;
      border-radius: 4px;
      overflow: hidden;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      flex-shrink: 0;
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

    .stock-summary-cell {
      display: flex;
      align-items: center;
    }
    .stock-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.3rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .stock-pill.in-stock {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .stock-pill.out-of-stock {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .stock-dot {
      font-size: 1.1rem;
      line-height: 0;
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
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
    }

    .status-badge {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      padding: 0.35rem 0.65rem;
      border-radius: 4px;
      display: inline-block;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.32rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      user-select: none;
    }
    .status-badge.active {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .status-badge.inactive {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fca5a5;
    }
    .status-indicator-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }
    .status-badge.active .status-indicator-dot {
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
    }
    .status-badge.inactive .status-indicator-dot {
      background: #ef4444;
      box-shadow: 0 0 6px #ef4444;
    }

    .row-actions {
      display: flex;
      gap: 0.5rem;
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
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem 0.75rem;
      box-sizing: border-box;
    }

    .modal-dialog {
      background: #ffffff;
      border-radius: 12px;
      width: 1040px;
      max-width: 95vw;
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
      border: 1px solid #cbd5e1;
      margin: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.15rem 1.75rem;
      border-bottom: 1px solid #f1f5f9;
      background: #ffffff;
      flex-shrink: 0;
      z-index: 10;
    }
    .modal-badge {
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      color: #d97706;
      text-transform: uppercase;
      display: block;
      margin-bottom: 0.15rem;
    }
    .modal-title {
      font-size: 1.25rem;
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
      padding: 1.25rem 1.75rem;
    }

    .modal-two-cols {
      display: grid;
      grid-template-columns: 320px minmax(0, 1fr);
      gap: 1.5rem;
      align-items: start;
      width: 100%;
    }

    .col-photos,
    .col-data {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .form-section-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.75rem 1rem 0.85rem;
      background: #fafafa;
      min-width: 0;
    }
    .section-legend {
      font-size: 0.76rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #0f172a;
      padding: 0 0.5rem;
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .legend-hint {
      font-size: 0.7rem;
      font-weight: 500;
      color: #64748b;
      letter-spacing: normal;
    }
    .section-desc {
      font-size: 0.74rem;
      color: #64748b;
      margin: 0 0 0.5rem 0;
      line-height: 1.35;
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

    /* Form Inputs & Comerciales Grid */
    .comerciales-grid {
      display: grid;
      grid-template-columns: 1.15fr 1fr 1fr;
      gap: 1rem;
      width: 100%;
    }
    .field-sku {
      width: 100%;
    }
    .field-sku .form-ctrl {
      width: 100%;
    }
    .field-precio {
      width: 100%;
    }
    .field-precio .form-ctrl {
      width: 100%;
    }
    .field-stock {
      width: 100%;
    }
    .field-stock .form-ctrl {
      width: 100%;
    }
    .field-nombre {
      grid-column: 1 / 4;
      width: 100%;
    }
    .field-nombre .form-ctrl {
      width: 100%;
    }
    .field-descripcion {
      grid-column: 1 / 4;
      width: 100%;
    }
    .field-descripcion .form-ctrl {
      width: 100%;
    }
    .field-clasificacion-wrap {
      grid-column: 1 / 4;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem;
      width: 100%;
    }
    .field-visibilidad-wrap {
      grid-column: 1 / 4;
      width: 100%;
      margin-top: 0.35rem;
    }
    .field-visibilidad-label {
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      color: #475569;
      text-transform: uppercase;
      margin-bottom: 0.35rem;
      display: block;
    }
    .visibilidad-toggle-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.85rem 1rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .visibilidad-toggle-card.is-active {
      background: #f0fdf4;
      border-color: #86efac;
    }
    .switch-toggle {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
      cursor: pointer;
    }
    .switch-toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .switch-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #cbd5e1;
      transition: 0.25s;
      border-radius: 24px;
    }
    .switch-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.25s;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
    .switch-toggle input:checked + .switch-slider {
      background-color: #10b981;
    }
    .switch-toggle input:checked + .switch-slider:before {
      transform: translateX(20px);
    }
    .visibilidad-info {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .visibilidad-title {
      font-size: 0.82rem;
      font-weight: 700;
      color: #0f172a;
    }
    .visibilidad-sub {
      font-size: 0.74rem;
      color: #64748b;
      line-height: 1.35;
    }
    @media (max-width: 640px) {
      .comerciales-grid {
        grid-template-columns: 1fr;
        width: 100%;
      }
      .field-sku, .field-precio, .field-stock, .field-nombre, .field-descripcion, .field-clasificacion-wrap, .field-visibilidad-wrap {
        grid-column: 1 / -1;
        width: 100%;
      }
      .field-clasificacion-wrap {
        grid-template-columns: 1fr;
      }
      .color-section-wrap {
        width: 100%;
      }
      .color-chips-grid {
        grid-template-columns: repeat(auto-fill, minmax(115px, 1fr));
        width: 100%;
      }
    }

    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .form-grid-3 {
      display: grid;
      grid-template-columns: 1.15fr 1fr 1fr;
      gap: 0.75rem;
    }
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
      margin-bottom: 12px;
    }
    .form-field label {
      font-size: 0.74rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #374151;
      text-transform: uppercase;
      white-space: normal;
      line-height: 1.25;
      margin: 0;
      display: block;
    }
    .field-hint {
      font-size: 0.68rem;
      color: #94a3b8;
      white-space: normal;
      line-height: 1.2;
    }
    .form-ctrl {
      padding: 0.5rem 0.85rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.88rem;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      box-sizing: border-box;
      width: 100%;
      height: 42px;
      min-height: 42px;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .form-ctrl:focus {
      border-color: #000000;
      box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.12);
    }
    .textarea-ctrl {
      resize: vertical;
      min-height: 48px;
      height: 48px;
      padding: 0.45rem 0.75rem;
      font-size: 0.85rem;
      line-height: 1.35;
    }
    .field-hint {
      font-size: 0.68rem;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Chips Selector */
    .chips-group-section {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .chips-label {
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #64748b;
    }
    .interactive-chips {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
    .selectable-chip {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #334155;
      font-weight: 700;
      font-size: 0.75rem;
      padding: 0.38rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.2s ease;
      box-sizing: border-box;
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
      flex-shrink: 0;
    }
    .color-section-wrap {
      width: fit-content;
      max-width: 100%;
    }
    .color-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.35rem;
      gap: 1.25rem;
      width: 100%;
    }
    .color-palette-legend {
      font-size: 0.68rem;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.04em;
      white-space: nowrap;
    }
    .color-chips-grid {
      display: grid;
      grid-template-columns: max-content max-content max-content;
      gap: 0.35rem 0.55rem;
      width: fit-content;
      max-width: 100%;
      max-height: 220px;
      overflow-y: auto;
      overflow-x: hidden;
      padding-right: 0.35rem;
    }
    .color-chips-grid::-webkit-scrollbar,
    .modal-scroll-body::-webkit-scrollbar {
      width: 6px;
    }
    .color-chips-grid::-webkit-scrollbar-track,
    .modal-scroll-body::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 4px;
    }
    .color-chips-grid::-webkit-scrollbar-thumb,
    .modal-scroll-body::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }
    .color-chips-grid::-webkit-scrollbar-thumb:hover,
    .modal-scroll-body::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
    .selectable-chip.color-chip {
      padding: 0.32rem 0.55rem;
      font-size: 0.73rem;
      justify-content: flex-start;
      width: 100%;
      box-sizing: border-box;
      gap: 0.4rem;
      min-width: 0;
    }
    .color-chip-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    /* Stock Total Display in Basic Info */
    .stock-total-display {
      display: flex;
      align-items: baseline;
      gap: 0.35rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.45rem 0.75rem;
      min-height: 38px;
      box-sizing: border-box;
    }
    .stock-total-number {
      font-size: 1.1rem;
      font-weight: 800;
      color: #0f172a;
    }
    .stock-total-unit {
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }

    /* Stock Matrix Section */
    .stock-matrix-section {
      margin-top: 0.85rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.75rem 0.9rem;
    }
    .stock-matrix-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.6rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .stock-matrix-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .matrix-tag {
      background: #0f172a;
      color: #ffffff;
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      padding: 0.18rem 0.45rem;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .stock-matrix-sub {
      font-size: 0.68rem;
      color: #64748b;
      font-style: italic;
    }
    .stock-matrix-table-wrap {
      overflow-x: auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
    }
    .stock-matrix-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
    }
    .stock-matrix-table th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.55rem 0.75rem;
      border-bottom: 1px solid #cbd5e1;
      text-align: left;
    }
    .stock-matrix-table th.col-sucursal {
      text-align: center;
      min-width: 130px;
    }
    .stock-matrix-table th.col-subtotal {
      text-align: right;
      min-width: 90px;
    }
    .stock-matrix-table td {
      padding: 0.45rem 0.75rem;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .cell-variante {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      color: #1e293b;
    }
    .row-talla {
      font-weight: 700;
    }
    .row-color {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.72rem;
      color: #64748b;
      background: #f1f5f9;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
    }
    .color-dot-mini {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }
    .cell-input {
      text-align: center;
    }
    .matrix-stock-input {
      width: 70px;
      padding: 0.35rem 0.5rem;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      font-size: 0.85rem;
      font-weight: 700;
      text-align: center;
      color: #0f172a;
      transition: all 0.15s ease;
      background: #fcfdfe;
    }
    .matrix-stock-input:focus {
      outline: none;
      border-color: #0f172a;
      background: #ffffff;
      box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.15);
    }
    .cell-subtotal {
      text-align: right;
    }
    .subtotal-badge {
      background: #f1f5f9;
      color: #334155;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      display: inline-block;
    }
    .stock-matrix-total-row {
      background: #f8fafc;
      font-weight: 700;
      border-top: 2px solid #cbd5e1;
    }
    .stock-matrix-total-row td {
      border-bottom: none;
      padding: 0.6rem 0.75rem;
    }
    .cell-total-suc {
      text-align: center;
      color: #0f172a;
      font-size: 0.82rem;
    }
    .cell-grand-total {
      text-align: right;
    }
    .grand-total-badge {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
      font-size: 0.85rem;
      font-weight: 800;
      padding: 0.25rem 0.65rem;
      border-radius: 5px;
      display: inline-block;
    }

    /* Modal Footer */
    .modal-footer-actions {
      flex-shrink: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.75rem;
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
        width: 96vw;
        max-height: 94vh;
      }
      .modal-two-cols {
        grid-template-columns: 1fr;
        gap: 1.25rem;
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

    .guia-medidas-table-wrap {
      overflow-x: auto;
      margin-top: 0.5rem;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .guia-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
    }
    .guia-table th {
      background: #f8fafc;
      padding: 0.5rem 0.6rem;
      border: 1px solid #e2e8f0;
      text-align: center;
      font-weight: 700;
      color: #334155;
    }
    .guia-table td {
      padding: 0.4rem 0.5rem;
      border: 1px solid #e2e8f0;
      text-align: center;
    }
    .cell-talla-code {
      background: #f1f5f9;
      font-weight: 800;
      color: #0f172a;
    }
    .input-measure {
      width: 70px;
      padding: 0.35rem 0.4rem;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      text-align: center;
      font-size: 0.82rem;
      font-weight: 600;
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
  private readonly saasService = inject(SaasService);
  readonly authService = inject(AuthService);
  readonly router = inject(Router);

  prendas = signal<Prenda[]>([]);
  categorias = signal<Categoria[]>([]);
  temporadas = signal<Temporada[]>([]);
  tallas = signal<Talla[]>([]);
  colores = signal<Color[]>([]);

  // Guía anatómica de medidas (CU06)
  medidasAnatomicas: Record<number, { pecho_cm: number; cintura_cm: number; cadera_cm: number; largo_cm: number; manga_cm: number }> = {};

  getMedida(tallaId: number) {
    if (!this.medidasAnatomicas[tallaId]) {
      const t = this.tallas().find(x => x.id === tallaId);
      const orden = t?.orden ?? 1;
      const base = 84 + (orden * 4);
      this.medidasAnatomicas[tallaId] = {
        pecho_cm: base,
        cintura_cm: base - 20,
        cadera_cm: base + 6,
        largo_cm: 130 + (orden * 2),
        manga_cm: 56 + orden
      };
    }
    return this.medidasAnatomicas[tallaId];
  }

  getSelectedTallasList(): Talla[] {
    const ids = this.selectedTallasIds();
    return this.tallas().filter(t => ids.includes(t.id));
  }

  guardarMedidasPrenda(prendaId: number): void {
    for (const t of this.getSelectedTallasList()) {
      const med = this.getMedida(t.id);
      this.saasService.guardarGuiaMedida(prendaId, {
        talla_id: t.id,
        pecho_cm: med.pecho_cm,
        cintura_cm: med.cintura_cm,
        cadera_cm: med.cadera_cm,
        largo_cm: med.largo_cm,
        manga_cm: med.manga_cm,
        observacion_calce: `Calce anatómico para talla ${t.codigo} en centímetros`
      }).subscribe({ error: () => {} });
    }
  }

  categoriasMujer = computed(() => this.categorias().filter(c => c.sector === 'MUJERES'));
  categoriasHombre = computed(() => this.categorias().filter(c => c.sector === 'HOMBRES'));
  categoriasUnisex = computed(() => this.categorias().filter(c => c.sector === 'UNISEX'));

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
  selectedSector = signal<'TODAS' | 'MUJERES' | 'HOMBRES' | 'UNISEX'>('TODAS');
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
    temporada_id: 1,
    stock_inicial: 25,
    activo: true
  };
  fotosSubidas = signal<FotoLocal[]>([]);
  selectedTallasIds = signal<number[]>([]);
  selectedColoresIds = signal<number[]>([]);
  sucursales = signal<Sucursal[]>([]);
  stockMatrix = signal<Record<string, number>>({});

  stockFilas = computed(() => {
    const tallasMap = new Map(this.tallas().map(t => [t.id, t]));
    const coloresMap = new Map(this.colores().map(c => [c.id, c]));
    const rows: { tallaId: number; tallaDesc: string; colorId: number; colorNombre: string; colorHex: string }[] = [];

    for (const tId of this.selectedTallasIds()) {
      const t = tallasMap.get(tId);
      for (const cId of this.selectedColoresIds()) {
        const c = coloresMap.get(cId);
        rows.push({
          tallaId: tId,
          tallaDesc: t ? `${t.codigo} (${t.descripcion || ''})` : `Talla #${tId}`,
          colorId: cId,
          colorNombre: c?.nombre || `Color #${cId}`,
          colorHex: c?.codigo_hex || '#333'
        });
      }
    }
    return rows;
  });

  totalStockCalculado = computed(() => {
    const matrix = this.stockMatrix();
    let sum = 0;
    for (const row of this.stockFilas()) {
      for (const suc of this.sucursales()) {
        const key = `${row.tallaId}_${row.colorId}_${suc.id}`;
        sum += Number(matrix[key] || 0);
      }
    }
    return sum;
  });

  getStockQty(tallaId: number, colorId: number, sucursalId: number): number {
    const key = `${tallaId}_${colorId}_${sucursalId}`;
    return this.stockMatrix()[key] ?? 0;
  }

  setStockQty(tallaId: number, colorId: number, sucursalId: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const val = Math.max(0, parseInt(target.value, 10) || 0);
    const key = `${tallaId}_${colorId}_${sucursalId}`;
    this.stockMatrix.update(prev => ({
      ...prev,
      [key]: val
    }));
  }

  getSubtotalFila(tallaId: number, colorId: number): number {
    const matrix = this.stockMatrix();
    return this.sucursales().reduce((sum, suc) => {
      const key = `${tallaId}_${colorId}_${suc.id}`;
      return sum + Number(matrix[key] || 0);
    }, 0);
  }

  getTotalSucursal(sucursalId: number): number {
    const matrix = this.stockMatrix();
    return this.stockFilas().reduce((sum, row) => {
      const key = `${row.tallaId}_${row.colorId}_${sucursalId}`;
      return sum + Number(matrix[key] || 0);
    }, 0);
  }

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
    this.catalogoService.getPrendas({ activo_solo: false }).subscribe({
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

    this.catalogoService.getSucursales().subscribe({
      next: (sucs) => this.sucursales.set(sucs)
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
      temporada_id: this.temporadas()[0]?.id || 1,
      stock_inicial: 0,
      activo: true
    };
    this.fotosSubidas.set([]);
    // Default select standard sizes and first color
    this.selectedTallasIds.set(this.tallas().slice(0, 3).map(t => t.id));
    this.selectedColoresIds.set(this.colores().slice(0, 1).map(c => c.id));
    this.stockMatrix.set({});
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
      temporada_id: prenda.temporada_id,
      stock_inicial: prenda.stock_total !== undefined ? prenda.stock_total : 0,
      activo: prenda.activo ?? true
    };

    // Load existing photos
    const fotos: FotoLocal[] = (prenda.multimedia || [])
      .filter(m => m.tipo === 'IMAGEN')
      .map(m => ({
        url: this.resolveImageUrl(m.url),
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

    // Populate stock matrix from existing variants and stock items
    const matrix: Record<string, number> = {};
    for (const v of (prenda.variantes || [])) {
      for (const stk of (v.stock_items || [])) {
        matrix[`${v.talla_id}_${v.color_id}_${stk.sucursal_id}`] = stk.cantidad_disponible;
      }
    }
    this.stockMatrix.set(matrix);

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

      // 1. Vista previa inmediata con ObjectURL
      const previewUrl = URL.createObjectURL(file);
      const tempItem: FotoLocal = {
        url: previewUrl,
        formato: ext,
        es_portada: this.fotosSubidas().length === 0,
        nombre_archivo: file.name
      };
      this.fotosSubidas.update(prev => [...prev, tempItem]);

      // 2. Subida al backend
      this.isUploadingImage.set(true);
      this.catalogoService.uploadImagen(file).subscribe({
        next: (res) => {
          this.isUploadingImage.set(false);
          const resolvedUrl = this.resolveImageUrl(res.url);
          this.fotosSubidas.update(prev =>
            prev.map(f => f.url === previewUrl ? {
              ...f,
              url: resolvedUrl,
              formato: res.formato,
              nombre_archivo: res.nombre_original
            } : f)
          );
        },
        error: (err) => {
          this.isUploadingImage.set(false);
          this.uploadError.set('Error al subir imagen: ' + (err.error?.detail || err.message));
          this.fotosSubidas.update(prev => prev.filter(f => f.url !== previewUrl));
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

    const stockDistribucion: StockDistribucionItem[] = [];
    for (const row of this.stockFilas()) {
      for (const suc of this.sucursales()) {
        const key = `${row.tallaId}_${row.colorId}_${suc.id}`;
        stockDistribucion.push({
          talla_id: row.tallaId,
          color_id: row.colorId,
          sucursal_id: suc.id,
          cantidad: Number(this.stockMatrix()[key]) || 0
        });
      }
    }

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
        stock_inicial: this.totalStockCalculado(),
        stock_distribucion: stockDistribucion,
        activo: this.formData.activo,
        tallas_ids: this.selectedTallasIds(),
        colores_ids: this.selectedColoresIds(),
        multimedia: multimediaPayload
      };

      this.catalogoService.updatePrenda(this.editingPrendaId, updateData).subscribe({
        next: (actualizada) => {
          this.guardarMedidasPrenda(actualizada.id);
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
        stock_inicial: this.totalStockCalculado(),
        stock_distribucion: stockDistribucion,
        activo: this.formData.activo,
        tallas_ids: this.selectedTallasIds(),
        colores_ids: this.selectedColoresIds(),
        multimedia: multimediaPayload
      };

      this.catalogoService.createPrenda(createData).subscribe({
        next: (creada) => {
          this.guardarMedidasPrenda(creada.id);
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

  // Activar / Pausar prenda directamente (para promociones u horarios)
  toggleActivoPrenda(prenda: Prenda, event?: Event): void {
    if (event) event.stopPropagation();
    const nuevoEstado = !prenda.activo;

    this.catalogoService.updatePrenda(prenda.id, { activo: nuevoEstado }).subscribe({
      next: () => {
        this.prendas.update(list => list.map(p => p.id === prenda.id ? { ...p, activo: nuevoEstado } : p));
        const msg = nuevoEstado
          ? `Prenda '${prenda.nombre}' ACTIVADA (ahora es visible en el catálogo y tienda pública).`
          : `Prenda '${prenda.nombre}' PAUSADA (oculta del catálogo para clientes; lista para promoción).`;
        this.mostrarMensaje(msg);
      },
      error: (err) => {
        this.mostrarMensaje('Error al cambiar visibilidad de la prenda: ' + (err.error?.detail || err.message), true);
      }
    });
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
  resolveImageUrl(url?: string): string {
    if (!url) return 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80';
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;
    const backendOrigin = (environment.apiUrl || '').replace(/\/api\/v1\/?$/, '');
    if (url.startsWith('/static/')) return `${backendOrigin}${url}`;
    if (url.startsWith('static/')) return `${backendOrigin}/${url}`;
    if (url.includes('backend:8000')) return url.replace(/http:\/\/[^/]+/, backendOrigin);
    if (url.includes('localhost:8000')) return url.replace('http://localhost:8000', backendOrigin);
    return url;
  }

  getPortadaUrl(prenda: Prenda): string {
    const portada = prenda.multimedia?.find(m => m.es_portada && m.tipo === 'IMAGEN');
    if (portada) return this.resolveImageUrl(portada.url);
    const primeraImg = prenda.multimedia?.find(m => m.tipo === 'IMAGEN');
    if (primeraImg) return this.resolveImageUrl(primeraImg.url);
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
