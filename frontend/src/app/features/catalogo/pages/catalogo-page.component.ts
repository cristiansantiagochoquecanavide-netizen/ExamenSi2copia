import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogoService } from '../services/catalogo.service';
import { InventarioService } from '../../inventario/services/inventario.service';
import {
  Prenda,
  PrendaCreate,
  PrendaMultimedia,
  PrendaMultimediaCreate,
  Categoria,
  Temporada,
  Talla,
  Color,
  AjusteInventarioRequest
} from '../models/catalogo.models';
import { Sucursal } from '../../inventario/models/inventario.models';

@Component({
  selector: 'app-catalogo-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="catalogo-container">
      <!-- Editorial Header Banner -->
      <section class="editorial-hero">
        <div class="hero-content">
          <div class="editorial-eyebrow">
            <span class="gold-dot">&bull;</span>
            <span>CATÁLOGO DIGITAL CON AR</span>
          </div>
          <h1 class="hero-title">Colección</h1>
          <p class="hero-description">
            Sastrería contemporánea, siluetas desestructuradas y tecnología de Realidad Aumentada (AR) con modelos 3D (.glb / .usdz) para probadores virtuales y control de inventario por sucursal.
          </p>
        </div>
      </section>

      <!-- SECCIÓN DE CONTROLES (2 FILAS FIEL AL MOCKUP) -->
      <section class="catalog-filters-container">
        <!-- FILA 1: SECTORES / DEPARTAMENTOS -->
        <div class="row-sectors">
          <button 
            type="button" 
            class="sector-pill" 
            [class.active]="selectedSector() === 'TODAS'"
            (click)="seleccionarSector('TODAS')">
            TODAS
          </button>
          <button 
            type="button" 
            class="sector-pill" 
            [class.active]="selectedSector() === 'MUJERES'"
            (click)="seleccionarSector('MUJERES')">
            MUJER
          </button>
          <button 
            type="button" 
            class="sector-pill" 
            [class.active]="selectedSector() === 'HOMBRES'"
            (click)="seleccionarSector('HOMBRES')">
            HOMBRE
          </button>
          <button 
            type="button" 
            class="sector-pill" 
            [class.active]="selectedSector() === 'NINOS'"
            (click)="seleccionarSector('NINOS')">
            NI&Ntilde;OS
          </button>
          <button 
            type="button" 
            class="sector-pill" 
            [class.active]="selectedSector() === 'UNISEX'"
            (click)="seleccionarSector('UNISEX')">
            UNISEX
          </button>
        </div>

        <!-- FILA 2: SUBCATEGORÍAS A LA IZQUIERDA + BUSCADOR A LA DERECHA -->
        <div class="row-subcats-and-search">
          <div class="subcat-chips-group">
            <button 
              type="button" 
              class="subcat-chip" 
              [class.active]="selectedCategoriaId() === 'ALL'"
              (click)="seleccionarCategoria('ALL')">
              Todas
            </button>
            <button 
              type="button" 
              *ngFor="let cat of categoriasDelSector()" 
              class="subcat-chip" 
              [class.active]="selectedCategoriaId() === cat.id"
              (click)="seleccionarCategoria(cat.id)">
              {{ cat.nombre }}
            </button>
          </div>

          <!-- BUSCADOR A LA DERECHA -->
          <div class="search-inline-wrap">
            <div class="search-input-box">
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (keyup.enter)="ejecutarBusqueda()"
                placeholder="Buscar"
                class="search-input-field"
              />
              <button 
                *ngIf="searchQuery" 
                type="button" 
                class="btn-clear-query" 
                (click)="limpiarBusqueda()" 
                title="Limpiar búsqueda">&times;</button>
            </div>
            <button type="button" class="btn-search-pill" (click)="ejecutarBusqueda()">
              <span class="search-lens-icon">&#128269;</span> Buscar
            </button>
          </div>
        </div>
      </section>

      <!-- Status Bar & Actions -->
      <div class="status-strip">
        <div class="status-left">
          <span class="status-pulse"></span>
          <span class="status-label">CATÁLOGO CON AR &bull; SINCRONIZADO</span>
        </div>
        <div class="action-buttons-group">
          <button type="button" class="btn-action-gold" (click)="openCreatePrendaModal()">
            + REGISTRAR PRENDA
          </button>
          <button type="button" class="btn-action-outline" (click)="openAjusteModal()">
            AJUSTAR STOCK SUCURSAL
          </button>
          <button type="button" class="btn-refresh" (click)="loadPrendas()" [disabled]="isLoading()">
            &#x21bb; Actualizar
          </button>
        </div>
      </div>

      <!-- Feedback Banner -->
      @if (feedbackMsg()) {
        <div class="feedback-banner" [class.error]="feedbackIsError()">
          <span>{{ feedbackMsg() }}</span>
          <button type="button" class="btn-close-banner" (click)="feedbackMsg.set(null)">&times;</button>
        </div>
      }

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="loading-grid">
          @for (i of [1, 2, 3]; track i) {
            <div class="skeleton-card">
              <div class="skeleton-img"></div>
              <div class="skeleton-line title"></div>
              <div class="skeleton-line price"></div>
            </div>
          }
        </div>
      }

      <!-- Error State -->
      @if (errorMessage()) {
        <div class="alert-box">
          <span class="alert-title">ERROR DE CONEXIÓN CON EL BACKEND</span>
          <p class="alert-desc">{{ errorMessage() }}</p>
          <button type="button" class="btn-retry" (click)="loadPrendas()">Reintentar conexión</button>
        </div>
      }

      <!-- Products Grid -->
      @if (!isLoading() && !errorMessage()) {
        @if (filteredPrendas().length === 0) {
          <div class="empty-state">
            <h3 class="empty-title">NO SE ENCONTRARON PRENDAS</h3>
            <p class="empty-text">No existen prendas activas con el filtro seleccionado.</p>
          </div>
        } @else {
          <div class="products-grid">
            @for (prenda of filteredPrendas(); track prenda.id) {
              <article class="product-card">
                <!-- Image Wrapper -->
                <div class="image-wrapper" (click)="openDetail(prenda)">
                  <img
                    [src]="getPortadaUrl(prenda)"
                    [alt]="prenda.nombre"
                    class="product-image"
                    loading="lazy"
                    (error)="handleImageError($event)"
                  />
                  
                  <!-- Badges Overlay -->
                  <div class="badge-overlay">
                    <span class="category-tag">{{ prenda.categoria?.nombre || 'COLECCIÓN' }}</span>
                    @if (prenda.categoria?.sector && prenda.categoria?.sector !== 'UNISEX') {
                      <span class="sector-tag">{{ prenda.categoria?.sector === 'MUJERES' ? 'MUJER' : (prenda.categoria?.sector === 'HOMBRES' ? 'HOMBRE' : (prenda.categoria?.sector === 'NINOS' ? 'NIÑOS' : prenda.categoria?.sector)) }}</span>
                    }
                    @if (has3DModel(prenda)) {
                      <span class="ar-badge">
                        <span class="ar-icon">&diams;</span> 3D AR READY
                      </span>
                    }
                  </div>

                  <div class="hover-action-overlay">
                    <span class="hover-btn">VER DETALLE &bull; AR</span>
                  </div>
                </div>

                <!-- Product Info -->
                <div class="product-info">
                  <div class="meta-row">
                    <span class="sku-tag">{{ prenda.sku }}</span>
                    <span class="season-tag">{{ prenda.temporada?.nombre || 'SS-2026' }}</span>
                  </div>

                  <h2 class="product-title" (click)="openDetail(prenda)">{{ prenda.nombre }}</h2>
                  
                  <p class="product-desc">{{ prenda.descripcion }}</p>

                  <!-- Available Sizes -->
                  <div class="variants-row">
                    <span class="variants-label">TALLAS:</span>
                    <div class="size-chips">
                      @for (talla of getUniqueSizes(prenda); track talla) {
                        <span class="size-chip">{{ talla }}</span>
                      }
                    </div>
                  </div>

                  <!-- Card Footer -->
                  <div class="card-footer">
                    <div class="price-container">
                      <span class="currency">$</span>
                      <span class="price-value">{{ prenda.precio_base | number:'1.2-2' }}</span>
                    </div>

                    <button type="button" class="btn-card-action" (click)="openDetail(prenda)">
                      EXPLORAR &bull; 3D
                    </button>
                  </div>
                </div>
              </article>
            }
          </div>
        }
      }

      <!-- ================= MODAL DETALLE & AR ================= -->
      @if (selectedPrenda(); as prenda) {
        <div class="modal-backdrop" (click)="closeDetail()">
          <div class="modal-container" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-group">
                <span class="modal-eyebrow">{{ prenda.categoria?.nombre }} &bull; SKU: {{ prenda.sku }}</span>
                <h2 class="modal-title">{{ prenda.nombre }}</h2>
              </div>
              <button type="button" class="modal-close" (click)="closeDetail()">&times;</button>
            </div>

            <div class="modal-body">
              <div class="modal-media-column">
                <img [src]="getPortadaUrl(prenda)" [alt]="prenda.nombre" class="modal-main-img" />
                
                <div class="multimedia-add-box">
                  <span class="add-box-title">+ Vincular Nuevo Archivo AR</span>
                  <div class="add-box-row">
                    <select [(ngModel)]="nuevoMultimedia.tipo">
                      <option value="MODELO_3D_GLB">Modelo .GLB (Android/Web)</option>
                      <option value="MODELO_3D_USDZ">Modelo .USDZ (iOS AR)</option>
                      <option value="IMAGEN">Imagen de Galería</option>
                    </select>
                    <input 
                      type="text" 
                      [(ngModel)]="nuevoMultimedia.url" 
                      placeholder="https://...modelo.glb"
                    />
                    <button type="button" class="btn-attach" (click)="attachMultimedia(prenda.id)">
                      Adjuntar
                    </button>
                  </div>
                </div>
              </div>

              <div class="modal-info-column">
                <p class="modal-desc">{{ prenda.descripcion }}</p>

                <div class="modal-price-box">
                  <span class="modal-price-label">PRECIO BASE:</span>
                  <span class="modal-price-value"><span class="currency">$</span>{{ prenda.precio_base | number:'1.2-2' }}</span>
                </div>

                <!-- Modelos 3D y AR vinculados -->
                <div class="ar-section">
                  <h4 class="ar-section-title">&diams; ACTIVOS DE REALIDAD AUMENTADA (AR)</h4>
                  <p class="ar-note">Formatos optimizados para Probador Virtual Móvil y Visualización Web:</p>
                  
                  <div class="ar-models-list">
                    @for (media of get3DModels(prenda); track media.id) {
                      <div class="ar-model-item">
                        <div class="ar-model-meta">
                          <span class="ar-badge-pill">{{ media.formato.toUpperCase() }}</span>
                          <span class="ar-model-type">{{ media.tipo === 'MODELO_3D_GLB' ? 'Web / Android (SceneViewer)' : 'iOS (Quick Look)' }}</span>
                        </div>
                        <a [href]="media.url" target="_blank" rel="noopener noreferrer" class="ar-link">
                          Inspeccionar Modelo 3D &rarr;
                        </a>
                      </div>
                    } @empty {
                      <div class="no-models-notice">No se han adjuntado modelos 3D todavía para esta pieza.</div>
                    }
                  </div>
                </div>

                <!-- Variantes de Talla y Color -->
                <div class="variants-section">
                  <h4 class="section-subtitle">VARIANTES DISPONIBLES EN STOCK:</h4>
                  <div class="variants-table-mini">
                    @for (v of prenda.variantes; track v.id) {
                      <div class="variant-pill">
                        <span class="v-talla">Talla: {{ v.talla?.codigo || 'N/A' }}</span>
                        <span class="v-color" [style.color]="v.color?.codigo_hex || '#fff'">
                          &bull; {{ v.color?.nombre || 'Color' }}
                        </span>
                        <span class="v-sku">SKU: {{ v.sku_variante }}</span>
                      </div>
                    }
                  </div>
                </div>

                <div class="modal-actions">
                  <button type="button" class="btn-reserve-lead" (click)="closeDetail()">
                    CERRAR FICHA TÉCNICA
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ================= MODAL REGISTRAR PRENDA ================= -->
      @if (showCreateModal()) {
        <div class="modal-backdrop" (click)="showCreateModal.set(false)">
          <div class="modal-dialog-large" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3 class="modal-title">Registrar Nueva Prenda en Catálogo</h3>
              <button type="button" class="modal-close" (click)="showCreateModal.set(false)">&times;</button>
            </div>
            <form (ngSubmit)="savePrenda()" class="modal-form-body">
              <div class="form-row-2">
                <div class="form-group">
                  <label>SKU Maestro *</label>
                  <input type="text" [(ngModel)]="nuevaPrenda.sku" name="sku" placeholder="Ej. PRD-TRENCH-NOIR" required />
                </div>
                <div class="form-group">
                  <label>Nombre de la Prenda *</label>
                  <input type="text" [(ngModel)]="nuevaPrenda.nombre" name="nombre" placeholder="Ej. The Midnight Trench Coat" required />
                </div>
              </div>

              <div class="form-group">
                <label>Descripción Editorial *</label>
                <textarea [(ngModel)]="nuevaPrenda.descripcion" name="descripcion" rows="2" placeholder="Corte desestructurado, lana virgen italiana con forro de seda..." required></textarea>
              </div>

              <div class="form-row-3">
                <div class="form-group">
                  <label>Precio Base ($ USD) *</label>
                  <input type="number" step="0.01" [(ngModel)]="nuevaPrenda.precio_base" name="precio_base" required />
                </div>
                <div class="form-group">
                  <label>Categoría *</label>
                  <select [(ngModel)]="nuevaPrenda.categoria_id" name="categoria_id" required>
                    @for (cat of categorias(); track cat.id) {
                      <option [value]="cat.id">{{ cat.nombre }} ({{ cat.sector }})</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label>Temporada *</label>
                  <select [(ngModel)]="nuevaPrenda.temporada_id" name="temporada_id" required>
                    @for (temp of temporadas(); track temp.id) {
                      <option [value]="temp.id">{{ temp.nombre }} ({{ temp.codigo }})</option>
                    }
                  </select>
                </div>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label>Talla Inicial de Muestra</label>
                  <select [(ngModel)]="varianteInicialTallaId" name="varianteTalla">
                    @for (t of tallas(); track t.id) {
                      <option [value]="t.id">{{ t.codigo }} - {{ t.descripcion }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label>Color Inicial de Muestra</label>
                  <select [(ngModel)]="varianteInicialColorId" name="varianteColor">
                    @for (c of colores(); track c.id) {
                      <option [value]="c.id">{{ c.nombre }} ({{ c.codigo_hex }})</option>
                    }
                  </select>
                </div>
              </div>

              <!-- Media AR Inputs -->
              <div class="ar-inputs-box">
                <span class="ar-box-title">Activos Multimedia y Modelos 3D (AR):</span>
                <div class="form-group">
                  <label>URL Imagen de Portada</label>
                  <input type="text" [(ngModel)]="urlPortada" name="urlPortada" placeholder="https://images.unsplash.com/..." />
                </div>
                <div class="form-row-2">
                  <div class="form-group">
                    <label>Modelo 3D .GLB (Android / Web AR)</label>
                    <input type="text" [(ngModel)]="urlGlb" name="urlGlb" placeholder="https://models.ateliernoir.com/trench.glb" />
                  </div>
                  <div class="form-group">
                    <label>Modelo 3D .USDZ (Apple Quick Look AR)</label>
                    <input type="text" [(ngModel)]="urlUsdz" name="urlUsdz" placeholder="https://models.ateliernoir.com/trench.usdz" />
                  </div>
                </div>
              </div>

              <div class="modal-actions-footer">
                <button type="button" class="btn-cancel" (click)="showCreateModal.set(false)">Cancelar</button>
                <button type="submit" class="btn-submit" [disabled]="!nuevaPrenda.sku || !nuevaPrenda.nombre">
                  Registrar Prenda
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ================= MODAL AJUSTE DE INVENTARIO ================= -->
      @if (showAjusteModal()) {
        <div class="modal-backdrop" (click)="showAjusteModal.set(false)">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3 class="modal-title">Ajuste de Inventario por Sucursal</h3>
              <button type="button" class="modal-close" (click)="showAjusteModal.set(false)">&times;</button>
            </div>
            <form (ngSubmit)="saveAjuste()" class="modal-body">
              <div class="form-group">
                <label>Sucursal Destino *</label>
                <select [(ngModel)]="nuevoAjuste.sucursal_id" name="sucursal_id" required>
                  @for (suc of sucursales(); track suc.id) {
                    <option [value]="suc.id">{{ suc.nombre }} - {{ suc.ciudad?.nombre || 'Sucursal' }}</option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label>Variante de Prenda *</label>
                <select [(ngModel)]="nuevoAjuste.variante_id" name="variante_id" required>
                  @for (p of prendas(); track p.id) {
                    @for (v of p.variantes; track v.id) {
                      <option [value]="v.id">
                        {{ p.nombre }} &bull; Talla {{ v.talla?.codigo }} / {{ v.color?.nombre }} (SKU: {{ v.sku_variante }})
                      </option>
                    }
                  }
                </select>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label>Tipo de Movimiento *</label>
                  <select [(ngModel)]="nuevoAjuste.tipo_movimiento" name="tipo_movimiento" required>
                    <option value="INGRESO_INICIAL">INGRESO INICIAL</option>
                    <option value="AJUSTE_POSITIVO">AJUSTE POSITIVO (+)</option>
                    <option value="AJUSTE_NEGATIVO">AJUSTE NEGATIVO (-)</option>
                    <option value="DEVOLUCION">DEVOLUCIÓN A STOCK</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Cantidad de Unidades *</label>
                  <input type="number" min="1" [(ngModel)]="nuevoAjuste.cantidad" name="cantidad" required />
                </div>
              </div>

              <div class="form-group">
                <label>Motivo o Justificación del Movimiento *</label>
                <input type="text" [(ngModel)]="nuevoAjuste.motivo" name="motivo" placeholder="Ej. Recepción de lote central SS26" required />
              </div>

              <div class="modal-actions-footer">
                <button type="button" class="btn-cancel" (click)="showAjusteModal.set(false)">Cancelar</button>
                <button type="submit" class="btn-submit" [disabled]="nuevoAjuste.cantidad <= 0 || !nuevoAjuste.motivo">
                  Aplicar Ajuste de Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .catalogo-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2.5rem 3rem 4rem 3rem;
      color: #111111;
      background-color: #ffffff;
    }

    .editorial-hero {
      padding: 0 0 2.5rem 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      margin-bottom: 2rem;
    }

    .editorial-eyebrow {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.72rem;
      letter-spacing: 0.25em;
      color: #374151;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 0.75rem;
    }

    .gold-dot {
      color: #000000;
    }

    .hero-title {
      font-family: 'Inter', sans-serif;
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0 0 0.75rem 0;
      color: #000000;
    }

    .hero-description {
      font-family: 'Inter', sans-serif;
      font-size: 0.95rem;
      color: #4b5563;
      max-width: 800px;
      line-height: 1.6;
      margin-bottom: 2rem;
    }

    /* CONTROLES DEL CATÁLOGO: 2 FILAS FIEL AL MOCKUP APROBADO */
    .catalog-filters-container {
      margin-top: 1.5rem;
      margin-bottom: 2.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem; /* DISTANCIA VERTICAL CLARA: FILA 1 Y FILA 2 NUNCA CHOCAN */
    }

    /* FILA 1: SECTORES */
    .row-sectors {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .sector-pill {
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 9999px;
      color: #111111;
      padding: 0.55rem 1.45rem;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }
    .sector-pill:hover {
      border-color: #000000;
      color: #000000;
      background: #f9fafb;
    }
    .sector-pill.active {
      background: #000000 !important;
      border-color: #000000 !important;
      color: #ffffff !important;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
    }

    /* FILA 2: SUBCATEGORÍAS A LA IZQUIERDA + BUSCADOR A LA DERECHA */
    .row-subcats-and-search {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .subcat-chips-group {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      flex-wrap: wrap;
    }

    .subcat-chip {
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 9999px;
      color: #374151;
      padding: 0.48rem 1.15rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    .subcat-chip:hover {
      border-color: #000000;
      color: #000000;
      background: #f9fafb;
    }
    .subcat-chip.active {
      background: #000000 !important;
      border-color: #000000 !important;
      color: #ffffff !important;
      font-weight: 700;
    }

    /* BUSCADOR A LA DERECHA */
    .search-inline-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-left: auto;
    }

    .search-input-box {
      position: relative;
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 0 0.85rem;
      width: 250px;
      transition: border-color 0.2s;
    }
    .search-input-box:focus-within {
      border-color: #000000;
    }
    .search-input-field {
      border: none;
      background: transparent;
      padding: 0.55rem 0.2rem;
      font-size: 0.85rem;
      color: #111827;
      outline: none;
      width: 100%;
    }
    .search-input-field::placeholder {
      color: #9ca3af;
    }
    .btn-clear-query {
      background: none;
      border: none;
      color: #9ca3af;
      font-size: 1.1rem;
      cursor: pointer;
      padding: 0 0.25rem;
      border-radius: 50%;
    }
    .btn-clear-query:hover { color: #111827; }

    .btn-search-pill {
      background: #000000 !important;
      color: #ffffff !important;
      border: 1px solid #000000 !important;
      border-radius: 8px !important;
      padding: 0.55rem 1.25rem !important;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.2s;
    }
    .btn-search-pill:hover {
      background: #1f2937 !important;
      border-color: #1f2937 !important;
    }
    .search-lens-icon {
      font-size: 0.85rem;
      line-height: 1;
    }

    .sector-tag {
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 0.25rem 0.65rem;
      background: #000000;
      color: #ffffff;
      border-radius: 9999px;
      margin-left: 0.4rem;
    }

    .status-strip {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.08);
      padding: 1rem 1.5rem;
      margin-bottom: 2.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .status-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .status-pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #059669;
      box-shadow: 0 0 6px rgba(5, 150, 105, 0.4);
    }

    .status-label {
      font-size: 0.75rem;
      letter-spacing: 0.15em;
      color: #374151;
      font-weight: 600;
    }

    .action-buttons-group {
      display: flex;
      gap: 0.85rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .btn-action-gold {
      background: #000000;
      border: 1px solid #000000;
      color: #ffffff;
      padding: 0.65rem 1.4rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      cursor: pointer;
      border-radius: 9999px;
      transition: all 0.2s ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .btn-action-gold:hover {
      background: #262626;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .btn-action-outline {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.25);
      color: #000000;
      padding: 0.65rem 1.4rem;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      cursor: pointer;
      border-radius: 9999px;
      transition: all 0.2s ease;
    }

    .btn-action-outline:hover {
      background: #f3f4f6;
      border-color: #000000;
    }

    .btn-refresh {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.18);
      color: #374151;
      padding: 0.65rem 1.25rem;
      font-size: 0.75rem;
      cursor: pointer;
      border-radius: 9999px;
      font-weight: 600;
    }

    .btn-refresh:hover {
      color: #000000;
      border-color: #000000;
    }

    .feedback-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ecfdf5;
      border: 1px solid #059669;
      color: #065f46;
      padding: 0.85rem 1.25rem;
      margin-bottom: 1.5rem;
      font-size: 0.85rem;
    }

    .feedback-banner.error {
      background: #fef2f2;
      border-color: #dc2626;
      color: #991b1b;
    }

    .btn-close-banner {
      background: transparent;
      border: none;
      color: inherit;
      font-size: 1.2rem;
      cursor: pointer;
    }

    .alert-box {
      background: #fef2f2;
      border: 1px solid #dc2626;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .alert-title {
      font-weight: 700;
      color: #991b1b;
      font-size: 0.85rem;
      letter-spacing: 0.1em;
      display: block;
      margin-bottom: 0.5rem;
    }

    .alert-desc {
      font-size: 0.85rem;
      color: #4b5563;
      margin-bottom: 1rem;
    }

    .btn-retry {
      background: #ffffff;
      border: 1px solid #dc2626;
      color: #dc2626;
      padding: 0.5rem 1rem;
      font-size: 0.75rem;
      cursor: pointer;
      font-weight: 600;
    }

    /* Products Grid */
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 2rem;
    }

    .product-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .product-card:hover {
      border-color: rgba(0, 0, 0, 0.3);
    }

    .image-wrapper {
      position: relative;
      height: 420px;
      overflow: hidden;
      cursor: pointer;
      background: #f9fafb;
    }

    .product-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }

    .image-wrapper:hover .product-image {
      transform: scale(1.03);
    }

    .badge-overlay {
      position: absolute;
      top: 1rem;
      left: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .category-tag {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      font-size: 0.68rem;
      letter-spacing: 0.15em;
      padding: 0.25rem 0.65rem;
      text-transform: uppercase;
      color: #111111;
      font-weight: 700;
    }

    .ar-badge {
      background: #000000;
      border: 1px solid #000000;
      color: #ffffff;
      font-size: 0.68rem;
      letter-spacing: 0.15em;
      padding: 0.25rem 0.65rem;
      font-weight: 700;
    }

    .hover-action-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(255, 255, 255, 0.95);
      padding: 0.85rem;
      text-align: center;
      transform: translateY(100%);
      transition: transform 0.3s ease;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
    }

    .image-wrapper:hover .hover-action-overlay {
      transform: translateY(0);
    }

    .hover-btn {
      font-size: 0.75rem;
      letter-spacing: 0.2em;
      color: #000000;
      font-weight: 700;
    }

    .product-info {
      padding: 1.5rem;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 0.72rem;
      color: #6b7280;
      font-family: monospace;
    }

    .product-title {
      font-family: 'Inter', sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0 0 0.75rem 0;
      color: #000000;
      cursor: pointer;
      transition: color 0.2s ease;
    }

    .product-title:hover {
      color: #4b5563;
    }

    .product-desc {
      font-size: 0.85rem;
      color: #4b5563;
      line-height: 1.5;
      margin-bottom: 1.25rem;
      flex: 1;
    }

    .variants-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .variants-label {
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
    }

    .size-chips {
      display: flex;
      gap: 0.35rem;
    }

    .size-chip {
      display: inline-block;
      min-width: 26px;
      text-align: center;
      padding: 0.2rem 0.4rem;
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.15);
      font-size: 0.72rem;
      color: #111111;
      font-weight: 600;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      padding-top: 1.25rem;
    }

    .price-container {
      font-family: 'Inter', sans-serif;
    }

    .currency {
      color: #000000;
      margin-right: 2px;
      font-size: 0.9rem;
      font-weight: 700;
    }

    .price-value {
      font-size: 1.35rem;
      font-weight: 800;
      color: #000000;
    }

    .btn-card-action {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.25);
      color: #000000;
      padding: 0.6rem 1.3rem;
      font-size: 0.72rem;
      letter-spacing: 0.15em;
      font-weight: 700;
      cursor: pointer;
      border-radius: 9999px;
      transition: all 0.2s ease;
    }

    .btn-card-action:hover {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
    }

    /* Modal Styling */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-container {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 0;
      width: 90%;
      max-width: 960px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
    }

    .modal-dialog {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 0;
      width: 90%;
      max-width: 560px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
    }

    .modal-dialog-large {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 0;
      width: 90%;
      max-width: 800px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 2rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }

    .modal-eyebrow {
      font-size: 0.72rem;
      letter-spacing: 0.15em;
      color: #4b5563;
      font-weight: 700;
      text-transform: uppercase;
      display: block;
      margin-bottom: 0.25rem;
    }

    .modal-title {
      font-family: 'Inter', sans-serif;
      font-size: 1.4rem;
      font-weight: 700;
      margin: 0;
      color: #000000;
    }

    .modal-close {
      background: transparent;
      border: none;
      color: #6b7280;
      font-size: 1.75rem;
      cursor: pointer;
    }

    .modal-close:hover {
      color: #000000;
    }

    .modal-body {
      padding: 2rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }

    .modal-form-body {
      padding: 2rem;
    }

    .modal-main-img {
      width: 100%;
      height: 380px;
      object-fit: cover;
      border: 1px solid rgba(0, 0, 0, 0.1);
      margin-bottom: 1rem;
    }

    .multimedia-add-box {
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 1rem;
    }

    .add-box-title {
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      color: #000000;
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .add-box-row {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .add-box-row select,
    .add-box-row input {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #111111;
      padding: 0.5rem;
      font-size: 0.8rem;
      border-radius: 0;
      outline: none;
    }

    .btn-attach {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.3);
      color: #000000;
      padding: 0.55rem 1.25rem;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      border-radius: 9999px;
      transition: all 0.2s ease;
    }

    .btn-attach:hover {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
    }

    .modal-desc {
      font-size: 0.9rem;
      line-height: 1.6;
      color: #4b5563;
      margin-bottom: 1.5rem;
    }

    .modal-price-box {
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 1rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .modal-price-label {
      font-size: 0.75rem;
      letter-spacing: 0.15em;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
    }

    .modal-price-value {
      font-size: 1.4rem;
      font-weight: 800;
      color: #000000;
    }

    .ar-section {
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .ar-section-title {
      font-size: 0.78rem;
      letter-spacing: 0.15em;
      color: #000000;
      font-weight: 700;
      margin: 0 0 0.5rem 0;
      text-transform: uppercase;
    }

    .ar-note {
      font-size: 0.8rem;
      color: #6b7280;
      margin-bottom: 1rem;
    }

    .ar-model-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 0.75rem 1rem;
      margin-bottom: 0.5rem;
    }

    .ar-badge-pill {
      font-size: 0.7rem;
      font-family: monospace;
      padding: 0.2rem 0.4rem;
      background: #f3f4f6;
      color: #111111;
      border: 1px solid rgba(0, 0, 0, 0.2);
      margin-right: 0.5rem;
      font-weight: 700;
    }

    .ar-model-type {
      font-size: 0.78rem;
      color: #4b5563;
      font-weight: 600;
    }

    .ar-link {
      color: #000000;
      font-size: 0.75rem;
      text-decoration: underline;
      letter-spacing: 0.08em;
      font-weight: 700;
    }

    .section-subtitle {
      font-size: 0.75rem;
      letter-spacing: 0.15em;
      color: #374151;
      font-weight: 700;
      text-transform: uppercase;
      margin: 0 0 0.75rem 0;
    }

    .variants-table-mini {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      margin-bottom: 1.5rem;
    }

    .variant-pill {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0.85rem;
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.08);
      font-size: 0.8rem;
      color: #111111;
    }

    .v-sku {
      color: #6b7280;
      font-family: monospace;
      font-size: 0.75rem;
    }

    .btn-reserve-lead {
      width: 100%;
      background: #000000;
      color: #ffffff;
      border: 1px solid #000000;
      padding: 0.9rem 1.5rem;
      font-size: 0.78rem;
      letter-spacing: 0.2em;
      font-weight: 700;
      cursor: pointer;
      border-radius: 9999px;
      transition: background 0.2s ease, box-shadow 0.2s ease;
      text-transform: uppercase;
    }

    .btn-reserve-lead:hover {
      background: #262626;
    }

    /* Form rows */
    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-group label {
      display: block;
      font-size: 0.72rem;
      letter-spacing: 0.1em;
      color: #374151;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 0.45rem;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: 0;
      color: #111111;
      padding: 0.75rem;
      font-size: 0.85rem;
      outline: none;
      box-sizing: border-box;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      border-color: #000000;
      box-shadow: 0 0 0 1px #000000;
    }

    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-row-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1rem;
    }

    .ar-inputs-box {
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .ar-box-title {
      font-size: 0.78rem;
      letter-spacing: 0.12em;
      color: #000000;
      display: block;
      margin-bottom: 1rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .modal-actions-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .btn-cancel {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.25);
      color: #374151;
      padding: 0.75rem 1.4rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      border-radius: 9999px;
      transition: all 0.2s ease;
    }

    .btn-cancel:hover {
      background: #f3f4f6;
      color: #000000;
    }

    .btn-submit {
      background: #000000;
      border: 1px solid #000000;
      color: #ffffff;
      padding: 0.75rem 1.6rem;
      font-weight: 700;
      font-size: 0.75rem;
      letter-spacing: 0.1em;
      cursor: pointer;
      border-radius: 9999px;
      text-transform: uppercase;
      transition: all 0.2s ease;
    }

    .btn-submit:hover {
      background: #262626;
    }

    .btn-submit:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* Skeleton */
    .loading-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 2rem;
    }

    .skeleton-card {
      background: #f3f4f6;
      height: 480px;
    }

    .empty-state {
      text-align: center;
      padding: 5rem 0;
    }

    .empty-title {
      font-family: 'Inter', sans-serif;
      font-weight: 700;
      font-size: 1.5rem;
      color: #111111;
    }

    .empty-text {
      color: #6b7280;
      font-size: 0.85rem;
    }
  `]
})
export class CatalogoPageComponent implements OnInit {
  private readonly catalogoService = inject(CatalogoService);
  private readonly inventarioService = inject(InventarioService);

  prendas = signal<Prenda[]>([]);
  categorias = signal<Categoria[]>([]);
  temporadas = signal<Temporada[]>([]);
  tallas = signal<Talla[]>([]);
  colores = signal<Color[]>([]);
  sucursales = signal<Sucursal[]>([]);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  feedbackMsg = signal<string | null>(null);
  feedbackIsError = signal<boolean>(false);

  selectedSector = signal<'TODAS' | 'MUJERES' | 'HOMBRES' | 'NINOS' | 'UNISEX'>('TODAS');
  selectedCategoriaId = signal<number | 'ALL'>('ALL');
  searchQuery = '';
  searchTermActive = signal<string>('');
  selectedPrenda = signal<Prenda | null>(null);

  // Modals visibility
  showCreateModal = signal<boolean>(false);
  showAjusteModal = signal<boolean>(false);

  // Forms state
  nuevaPrenda: PrendaCreate = {
    sku: '',
    nombre: '',
    descripcion: '',
    precio_base: 280,
    categoria_id: 1,
    temporada_id: 1
  };
  varianteInicialTallaId: number = 1;
  varianteInicialColorId: number = 1;
  urlPortada: string = 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80';
  urlGlb: string = 'https://storage.googleapis.com/fashion-models/midnight-trench.glb';
  urlUsdz: string = 'https://storage.googleapis.com/fashion-models/midnight-trench.usdz';

  nuevoAjuste: AjusteInventarioRequest = {
    variante_id: 1,
    sucursal_id: 1,
    tipo_movimiento: 'INGRESO_INICIAL',
    cantidad: 25,
    motivo: 'Recepción inicial de colección SS26'
  };

  nuevoMultimedia: PrendaMultimediaCreate = {
    tipo: 'MODELO_3D_GLB',
    url: '',
    formato: '.glb',
    es_portada: false
  };

  categoriasDelSector = computed(() => {
    const sector = this.selectedSector();
    const cats = this.categorias();
    if (sector === 'TODAS') return cats;
    return cats.filter(c => c.sector === sector || c.sector === 'UNISEX');
  });

  filteredPrendas = computed(() => {
    let list = this.prendas();
    const sector = this.selectedSector();
    const catId = this.selectedCategoriaId();
    const query = this.searchTermActive();

    // 1. Filtrar por Sector (Audiencia / Departamento)
    if (sector !== 'TODAS') {
      list = list.filter(p => p.categoria?.sector === sector || p.categoria?.sector === 'UNISEX');
    }

    // 2. Filtrar por Categoría específica
    if (catId !== 'ALL') {
      list = list.filter(p => p.categoria_id === catId);
    }

    // 3. Filtrar por búsqueda activa
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

  seleccionarSector(sector: 'TODAS' | 'MUJERES' | 'HOMBRES' | 'NINOS' | 'UNISEX'): void {
    this.selectedSector.set(sector);
    this.selectedCategoriaId.set('ALL');
  }

  seleccionarCategoria(catId: number | 'ALL'): void {
    this.selectedCategoriaId.set(catId);
  }

  ejecutarBusqueda(): void {
    this.searchTermActive.set(this.searchQuery.trim().toLowerCase());
  }

  limpiarBusqueda(): void {
    this.searchQuery = '';
    this.searchTermActive.set('');
  }

  ngOnInit(): void {
    this.loadPrendas();
    this.loadMetadata();
  }

  loadPrendas(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.catalogoService.getPrendas().subscribe({
      next: (data) => {
        this.prendas.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message || 'No se pudo cargar el catalogo de prendas desde FastAPI.');
      }
    });
  }

  loadMetadata(): void {
    this.catalogoService.getCategorias().subscribe({
      next: (cats) => {
        this.categorias.set(cats);
        if (cats.length > 0) this.nuevaPrenda.categoria_id = cats[0].id;
      }
    });

    this.catalogoService.getTemporadas().subscribe({
      next: (temps) => {
        this.temporadas.set(temps);
        if (temps.length > 0) this.nuevaPrenda.temporada_id = temps[0].id;
      }
    });

    this.catalogoService.getTallas().subscribe({
      next: (t) => {
        this.tallas.set(t);
        if (t.length > 0) this.varianteInicialTallaId = t[0].id;
      }
    });

    this.catalogoService.getColores().subscribe({
      next: (c) => {
        this.colores.set(c);
        if (c.length > 0) this.varianteInicialColorId = c[0].id;
      }
    });

    this.inventarioService.getSucursales().subscribe({
      next: (sucs) => {
        this.sucursales.set(sucs);
        if (sucs.length > 0) this.nuevoAjuste.sucursal_id = sucs[0].id;
      }
    });
  }

  openCreatePrendaModal(): void {
    this.nuevaPrenda = {
      sku: `PRD-${Date.now().toString().slice(-4)}`,
      nombre: '',
      descripcion: '',
      precio_base: 320,
      categoria_id: this.categorias()[0]?.id || 1,
      temporada_id: this.temporadas()[0]?.id || 1
    };
    this.showCreateModal.set(true);
  }

  savePrenda(): void {
    this.isLoading.set(true);
    const payload: PrendaCreate = {
      ...this.nuevaPrenda,
      variantes: [
        {
          talla_id: Number(this.varianteInicialTallaId),
          color_id: Number(this.varianteInicialColorId)
        }
      ]
    };

    this.catalogoService.createPrenda(payload).subscribe({
      next: (prendaCreada) => {
        // Attach initial media if URLs provided
        if (this.urlPortada) {
          this.catalogoService.vincularMultimedia(prendaCreada.id, {
            tipo: 'IMAGEN',
            url: this.urlPortada,
            formato: '.jpg',
            es_portada: true
          }).subscribe();
        }
        if (this.urlGlb) {
          this.catalogoService.vincularMultimedia(prendaCreada.id, {
            tipo: 'MODELO_3D_GLB',
            url: this.urlGlb,
            formato: '.glb',
            es_portada: false
          }).subscribe();
        }
        if (this.urlUsdz) {
          this.catalogoService.vincularMultimedia(prendaCreada.id, {
            tipo: 'MODELO_3D_USDZ',
            url: this.urlUsdz,
            formato: '.usdz',
            es_portada: false
          }).subscribe();
        }

        this.showCreateModal.set(false);
        this.showFeedback(`Prenda '${prendaCreada.nombre}' y modelos 3D registrados exitosamente.`);
        this.loadPrendas();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showFeedback(err.error?.detail || 'Error al registrar prenda.', true);
      }
    });
  }

  openAjusteModal(): void {
    // Pick first available variant ID
    const firstPrenda = this.prendas()[0];
    const firstVarId = firstPrenda?.variantes?.[0]?.id || 1;
    this.nuevoAjuste = {
      variante_id: firstVarId,
      sucursal_id: this.sucursales()[0]?.id || 1,
      tipo_movimiento: 'INGRESO_INICIAL',
      cantidad: 20,
      motivo: 'Ajuste inicial de inventario en tienda'
    };
    this.showAjusteModal.set(true);
  }

  saveAjuste(): void {
    this.isLoading.set(true);
    this.catalogoService.ajustarInventario({
      ...this.nuevoAjuste,
      variante_id: Number(this.nuevoAjuste.variante_id),
      sucursal_id: Number(this.nuevoAjuste.sucursal_id),
      cantidad: Number(this.nuevoAjuste.cantidad)
    }).subscribe({
      next: (stock) => {
        this.isLoading.set(false);
        this.showAjusteModal.set(false);
        this.showFeedback(`Stock ajustado exitosamente: ${stock.cantidad_disponible} unidades disponibles.`);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showFeedback(err.error?.detail || 'Error al aplicar ajuste de stock.', true);
      }
    });
  }

  attachMultimedia(prendaId: number): void {
    if (!this.nuevoMultimedia.url) return;
    const formato = this.nuevoMultimedia.url.endsWith('.glb') ? '.glb' : (this.nuevoMultimedia.url.endsWith('.usdz') ? '.usdz' : '.jpg');
    this.catalogoService.vincularMultimedia(prendaId, {
      ...this.nuevoMultimedia,
      formato: formato
    }).subscribe({
      next: (media) => {
        this.showFeedback(`Activo AR '${media.tipo}' vinculado con éxito.`);
        this.nuevoMultimedia.url = '';
        this.loadPrendas();
        // Update selectedPrenda
        this.catalogoService.getPrendaById(prendaId).subscribe({
          next: (p) => this.selectedPrenda.set(p)
        });
      },
      error: (err) => this.showFeedback(err.error?.detail || 'Error al vincular multimedia.', true)
    });
  }

  getPortadaUrl(prenda: Prenda): string {
    const portada = prenda.multimedia?.find(m => m.es_portada && m.tipo === 'IMAGEN');
    if (portada) return portada.url;
    const primeraImg = prenda.multimedia?.find(m => m.tipo === 'IMAGEN');
    if (primeraImg) return primeraImg.url;
    return 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80';
  }

  has3DModel(prenda: Prenda): boolean {
    return prenda.multimedia?.some(m => m.tipo === 'MODELO_3D_GLB' || m.tipo === 'MODELO_3D_USDZ') ?? false;
  }

  get3DModels(prenda: Prenda): PrendaMultimedia[] {
    return prenda.multimedia?.filter(m => m.tipo === 'MODELO_3D_GLB' || m.tipo === 'MODELO_3D_USDZ') ?? [];
  }

  getUniqueSizes(prenda: Prenda): string[] {
    if (!prenda.variantes) return ['S', 'M', 'L'];
    const sizes = prenda.variantes
      .map(v => v.talla?.codigo)
      .filter((v): v is string => !!v);
    return Array.from(new Set(sizes));
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80';
  }

  openDetail(prenda: Prenda): void {
    this.selectedPrenda.set(prenda);
  }

  closeDetail(): void {
    this.selectedPrenda.set(null);
  }

  showFeedback(msg: string, isError = false): void {
    this.feedbackMsg.set(msg);
    this.feedbackIsError.set(isError);
    setTimeout(() => {
      if (this.feedbackMsg() === msg) {
        this.feedbackMsg.set(null);
      }
    }, 4500);
  }
}
