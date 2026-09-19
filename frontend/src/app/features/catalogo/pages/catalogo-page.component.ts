import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CatalogoService } from '../services/catalogo.service';
import { InventarioService } from '../../inventario/services/inventario.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  Prenda,
  PrendaCreate,
  PrendaMultimedia,
  PrendaMultimediaCreate,
  Categoria,
  Temporada,
  Talla,
  Color,
  AjusteInventarioRequest,
  Calificacion,
  CalificacionCreate,
  ListadoCalificacionesResponse,
  EstadisticasCalificaciones
} from '../models/catalogo.models';
import { Sucursal } from '../../inventario/models/inventario.models';
import { IaAsistenteService } from '../../ia-asistente/services/ia-asistente.service';
import { OutfitSugerido } from '../../ia-asistente/models/ia-asistente.models';


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
          <div class="hero-ia-banner" (click)="irAEstilistaIA()">
            <span class="hero-ia-chip">✦ ATELIER IA</span>
            <span class="hero-ia-text">¿Buscás asesoramiento exclusivo? Descubrí recomendaciones hiperpersonalizadas y looks completos coordinados.</span>
            <span class="hero-ia-link">Probar Atelier Stylist &rarr;</span>
          </div>
        </div>
      </section>

      <!-- SECCIÓN DE CONTROLES (2 FILAS FIEL AL MOCKUP) -->
      <section class="catalog-filters-container">
        <!-- FILA 1: SECTORES A LA IZQUIERDA + BUSCADOR A LA DERECHA -->
        <div class="row-sectors-and-search">
          <div class="sector-pills-group">
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
              [class.active]="selectedSector() === 'UNISEX'"
              (click)="seleccionarSector('UNISEX')">
              UNISEX
            </button>
          </div>

          <!-- BUSCADOR A LA DERECHA (FIEL AL MODELO APROBADO) -->
          <div class="search-inline-wrap">
            <div class="search-input-container">
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchChange($event)"
                (keyup.enter)="ejecutarBusqueda()"
                placeholder="Buscar"
                class="search-input-mockup"
              />
              <button 
                *ngIf="searchQuery" 
                type="button" 
                class="btn-clear-query" 
                (click)="limpiarBusqueda()" 
                title="Limpiar búsqueda">&times;</button>
            </div>
            <button type="button" class="btn-search-mockup" (click)="ejecutarBusqueda()">
              <svg class="search-loupe-svg" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="7"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>Buscar</span>
            </button>
          </div>
        </div>

        <!-- FILA 2: SUBCATEGORÍAS CON ESPACIO COMPLETO -->
        <div class="row-subcats">
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
        </div>
      </section>

      <!-- Status Bar & Actions -->
      <div class="status-strip">
        <div class="status-left">
          <span class="status-pulse"></span>
          <span class="status-label">CATÁLOGO CON AR &bull; SINCRONIZADO</span>
        </div>
        <div class="action-buttons-group">
          <button type="button" class="btn-action-gold" (click)="router.navigate(['/catalogo/gestion'])">
            ⚙ GESTIONAR PRENDAS
          </button>
          <button type="button" class="btn-action-outline" (click)="router.navigate(['/catalogo/gestion'])">
            + AÑADIR PRENDA
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
            <h3 class="empty-title">CATÁLOGO LISTO PARA NUEVAS PRENDAS</h3>
            <p class="empty-text">No hay prendas registradas con el filtro actual. Podés añadir prendas con fotos, categorías y variantes.</p>
            <button type="button" class="btn-action-gold" style="margin-top: 1.5rem;" (click)="router.navigate(['/catalogo/gestion'])">
              + Ir al Gestor y Añadir Prenda
            </button>
          </div>
        } @else {
          <div class="products-grid">
            @for (prenda of filteredPrendas(); track prenda.id) {
              <article class="product-card">
                <!-- Image Wrapper (Relación de aspecto fija con object-fit: cover) -->
                <div class="image-wrapper" (click)="openDetail(prenda)">
                  <img
                    [src]="getPortadaUrl(prenda)"
                    [alt]="prenda.nombre"
                    class="product-image"
                    loading="lazy"
                    (error)="handleImageError($event)"
                  />
                  
                  <!-- Badges Overlay (Semicirculares superpuestos en esquina superior izquierda) -->
                  <div class="badge-overlay">
                    <span class="badge-category">{{ prenda.categoria?.nombre || 'COLECCIÓN' }}</span>
                    <span class="badge-sex">{{ getSectorLabel(prenda) }}</span>
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
                  <!-- Fila Superior: SKU y Temporada/Colección -->
                  <div class="meta-row">
                    <span class="sku-tag">{{ prenda.sku }}</span>
                    <span class="season-tag">{{ prenda.temporada?.nombre || 'Primavera-Verano 2026' }}</span>
                  </div>

                  <!-- Rating Stars & Reseñas (CU18) -->
                  <div class="rating-strip" (click)="openDetail(prenda, 'resenas'); $event.stopPropagation()" title="Ver opiniones de clientes">
                    <span class="stars-gold">
                      @for (star of getStarIcons(prenda.rating_promedio || 0); track $index) {
                        <span [class.star-filled]="star === '★'" [class.star-empty]="star === '☆'">{{ star }}</span>
                      }
                    </span>
                    <span class="rating-num">{{ (prenda.rating_promedio || 0) | number:'1.1-1' }}</span>
                    <span class="reviews-count">({{ prenda.total_resenas || 0 }})</span>
                  </div>

                  <!-- Nombre Comercial en Negritas -->
                  <h2 class="product-title font-bold" (click)="openDetail(prenda)">{{ prenda.nombre }}</h2>

                  
                  <!-- Descripción de la Prenda (Altura y líneas uniformes) -->
                  <p class="product-desc">{{ prenda.descripcion }}</p>

                  <!-- Tallas en Cajas Cuadradas/Rectangulares -->
                  <div class="variants-row">
                    <span class="variants-label">TALLAS:</span>
                    <div class="size-chips">
                      @for (talla of getSizesWithStock(prenda); track talla.codigo) {
                        <span 
                          class="size-chip" 
                          [class.size-disabled]="!talla.disponible"
                          [title]="talla.disponible ? 'Talla ' + talla.codigo : 'Talla ' + talla.codigo + ' (Agotada)'">
                          {{ talla.codigo }}
                        </span>
                      }
                    </div>
                  </div>

                  <!-- Card Footer: Precio e Hipervínculo/Botón de Acción -->
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

            <!-- TABS DE NAVEGACIÓN EN MODAL (CU18) -->
            <div class="modal-tabs-bar">
              <button 
                type="button" 
                class="modal-tab-btn" 
                [class.active]="activeModalTab() === 'info'" 
                (click)="activeModalTab.set('info')">
                <span class="tab-icon">&diams;</span> INFORMACIÓN &bull; AR 3D
              </button>
              <button 
                type="button" 
                class="modal-tab-btn" 
                [class.active]="activeModalTab() === 'resenas'" 
                (click)="activeModalTab.set('resenas')">
                <span class="tab-icon">★</span> RESEÑAS &bull; OPINIONES ({{ califEstadisticas()?.total_resenas || prenda.total_resenas || 0 }})
              </button>
              <button 
                type="button" 
                class="modal-tab-btn" 
                [class.active]="activeModalTab() === 'look'" 
                (click)="abrirTabLook(prenda.id)">
                <span class="tab-icon">✦</span> COMPLETA TU LOOK (IA)
              </button>
            </div>

            <!-- TAB 1: INFORMACIÓN Y 3D AR -->
            @if (activeModalTab() === 'info') {
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
            }

            <!-- TAB 2: RESEÑAS Y OPINIONES (CU18) -->
            @if (activeModalTab() === 'resenas') {
              <div class="modal-reviews-view">
                <!-- PANEL DE ESTADÍSTICAS Y MÉTRICAS -->
                <div class="reviews-stats-card">
                  <!-- Puntuación Promedio General -->
                  <div class="stats-col-score">
                    <span class="big-score">{{ (califEstadisticas()?.promedio || 0) | number:'1.1-1' }}</span>
                    <div class="score-stars">
                      @for (star of getStarIcons(califEstadisticas()?.promedio || 0); track $index) {
                        <span class="star-gold">{{ star }}</span>
                      }
                    </div>
                    <span class="score-subtext">{{ califEstadisticas()?.total_resenas || 0 }} opiniones de clientes</span>
                  </div>

                  <!-- Desglose por Estrellas (Barras de distribución) -->
                  <div class="stats-col-bars">
                    <div class="breakdown-row">
                      <span class="bar-label">5 ★</span>
                      <div class="bar-track">
                        <div class="bar-fill" [style.width.%]="getPercentage(califEstadisticas()?.desglose_estrellas?.estrellas_5 || 0, califEstadisticas()?.total_resenas || 0)"></div>
                      </div>
                      <span class="bar-count">{{ califEstadisticas()?.desglose_estrellas?.estrellas_5 || 0 }}</span>
                    </div>
                    <div class="breakdown-row">
                      <span class="bar-label">4 ★</span>
                      <div class="bar-track">
                        <div class="bar-fill" [style.width.%]="getPercentage(califEstadisticas()?.desglose_estrellas?.estrellas_4 || 0, califEstadisticas()?.total_resenas || 0)"></div>
                      </div>
                      <span class="bar-count">{{ califEstadisticas()?.desglose_estrellas?.estrellas_4 || 0 }}</span>
                    </div>
                    <div class="breakdown-row">
                      <span class="bar-label">3 ★</span>
                      <div class="bar-track">
                        <div class="bar-fill" [style.width.%]="getPercentage(califEstadisticas()?.desglose_estrellas?.estrellas_3 || 0, califEstadisticas()?.total_resenas || 0)"></div>
                      </div>
                      <span class="bar-count">{{ califEstadisticas()?.desglose_estrellas?.estrellas_3 || 0 }}</span>
                    </div>
                    <div class="breakdown-row">
                      <span class="bar-label">2 ★</span>
                      <div class="bar-track">
                        <div class="bar-fill" [style.width.%]="getPercentage(califEstadisticas()?.desglose_estrellas?.estrellas_2 || 0, califEstadisticas()?.total_resenas || 0)"></div>
                      </div>
                      <span class="bar-count">{{ califEstadisticas()?.desglose_estrellas?.estrellas_2 || 0 }}</span>
                    </div>
                    <div class="breakdown-row">
                      <span class="bar-label">1 ★</span>
                      <div class="bar-track">
                        <div class="bar-fill" [style.width.%]="getPercentage(califEstadisticas()?.desglose_estrellas?.estrellas_1 || 0, califEstadisticas()?.total_resenas || 0)"></div>
                      </div>
                      <span class="bar-count">{{ califEstadisticas()?.desglose_estrellas?.estrellas_1 || 0 }}</span>
                    </div>
                  </div>

                  <!-- Métricas de Ajuste de Talla y Calidad -->
                  <div class="stats-col-fit">
                    <div class="fit-indicator">
                      <span class="fit-title">AJUSTE DE TALLA</span>
                      <span class="fit-percentage">{{ califEstadisticas()?.porcentaje_fiel_talla || 100 }}%</span>
                      <span class="fit-caption">indica que es fiel a su talla habitual</span>
                    </div>
                    <div class="fit-pills">
                      <span class="fit-chip" [class.highlight]="(califEstadisticas()?.desglose_ajuste?.pequeno || 0) > 0">
                        Queda Pequeña ({{ califEstadisticas()?.desglose_ajuste?.pequeno || 0 }})
                      </span>
                      <span class="fit-chip active">
                        Fiel a la Talla ({{ califEstadisticas()?.desglose_ajuste?.fiel || 0 }})
                      </span>
                      <span class="fit-chip" [class.highlight]="(califEstadisticas()?.desglose_ajuste?.grande || 0) > 0">
                        Queda Grande ({{ califEstadisticas()?.desglose_ajuste?.grande || 0 }})
                      </span>
                    </div>
                    <div class="quality-mini">
                      <span class="quality-label">Calidad del Tejido:</span>
                      <span class="quality-val">{{ (califEstadisticas()?.promedio_calidad || 5.0) | number:'1.1-1' }} / 5.0</span>
                    </div>
                  </div>
                </div>

                <!-- ACCIÓN PARA CALIFICAR / MI RESEÑA -->
                <div class="review-action-strip">
                  @if (!authService.isAuthenticated()) {
                    <div class="login-prompt-box">
                      <span>¿Quieres compartir tu experiencia sobre esta prenda?</span>
                      <button type="button" class="btn-login-to-review" (click)="router.navigate(['/login'])">
                        INICIAR SESIÓN PARA CALIFICAR
                      </button>
                    </div>
                  } @else {
                    <!-- Si ya tiene reseña y no está en modo edición -->
                    @if (miCalificacion(); as miCal) {
                      @if (!showReviewForm()) {
                        <div class="my-review-card">
                          <div class="my-review-header">
                            <div class="my-review-title-group">
                              <span class="my-review-badge">TU OPINIÓN PUBLICADA</span>
                              <div class="stars-gold">
                                @for (star of getStarIcons(miCal.puntuacion); track $index) {
                                  <span>{{ star }}</span>
                                }
                              </div>
                              @if (miCal.compra_verificada) {
                                <span class="badge-verified-buyer">
                                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                  Compra Verificada
                                </span>
                              }
                            </div>
                            <div class="my-review-actions">
                              <button type="button" class="btn-edit-my-review" (click)="iniciarEdicionResena(miCal)">
                                Modificar
                              </button>
                              <button type="button" class="btn-delete-my-review" (click)="eliminarMiResena(miCal.id, prenda.id)">
                                Eliminar
                              </button>
                            </div>
                          </div>
                          <h4 class="my-review-heading">{{ miCal.titulo }}</h4>
                          <p class="my-review-text">{{ miCal.comentario }}</p>
                          <div class="my-review-meta">
                            <span>Ajuste: {{ getAjusteLabel(miCal.ajuste_talla) }}</span> &bull;
                            <span>Calidad: {{ miCal.calidad }}/5</span> &bull;
                            <span>{{ miCal.created_at | date:'dd/MM/yyyy' }}</span>
                          </div>
                        </div>
                      }
                    } @else {
                      @if (!showReviewForm()) {
                        <div class="btn-open-form-container">
                          <button type="button" class="btn-write-review" (click)="showReviewForm.set(true)">
                            &#9998; ESCRIBIR UNA RESEÑA
                          </button>
                          @if (esCompradorVerificado()) {
                            <span class="verified-status-hint">
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              ¡Compra verificada detectada para esta prenda!
                            </span>
                          }
                        </div>
                      }
                    }

                    <!-- FORMULARIO DE CREACIÓN / EDICIÓN -->
                    @if (showReviewForm()) {
                      <div class="review-form-card">
                        <div class="review-form-header">
                          <h4 class="review-form-title">{{ miCalificacion() ? 'Actualizar mi Opinión' : 'Calificar & Opinar sobre esta Prenda' }}</h4>
                          <button type="button" class="btn-cancel-form" (click)="showReviewForm.set(false)">&times;</button>
                        </div>

                        @if (esCompradorVerificado()) {
                          <div class="buyer-notice verified">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            <span>Has adquirido esta prenda en nuestra boutique. Tu reseña se publicará con la insignia oficial de <strong>Compra Verificada</strong>.</span>
                          </div>
                        }

                        <form (ngSubmit)="guardarCalificacion(prenda.id)" class="review-form-content">
                          <!-- Puntuación General Interactiva -->
                          <div class="form-group-review">
                            <label class="review-field-label">PUNTUACIÓN GENERAL *</label>
                            <div class="interactive-stars">
                              @for (num of [1, 2, 3, 4, 5]; track num) {
                                <button 
                                  type="button" 
                                  class="star-btn" 
                                  [class.active]="(hoverEstrellas() || nuevaCalificacion.puntuacion) >= num"
                                  (mouseenter)="hoverEstrellas.set(num)"
                                  (mouseleave)="hoverEstrellas.set(0)"
                                  (click)="nuevaCalificacion.puntuacion = num">
                                  ★
                                </button>
                              }
                              <span class="star-rating-text">{{ getRatingLabel(nuevaCalificacion.puntuacion) }}</span>
                            </div>
                          </div>

                          <!-- Ajuste de Talla y Calidad del Tejido -->
                          <div class="form-grid-2">
                            <div class="form-group-review">
                              <label class="review-field-label">¿CÓMO QUEDA LA TALLA? *</label>
                              <div class="fit-selector-buttons">
                                <button 
                                  type="button" 
                                  class="fit-select-btn" 
                                  [class.selected]="nuevaCalificacion.ajuste_talla === 'PEQUENO'"
                                  (click)="nuevaCalificacion.ajuste_talla = 'PEQUENO'">
                                  Queda Pequeña
                                </button>
                                <button 
                                  type="button" 
                                  class="fit-select-btn" 
                                  [class.selected]="nuevaCalificacion.ajuste_talla === 'FIEL'"
                                  (click)="nuevaCalificacion.ajuste_talla = 'FIEL'">
                                  Fiel a la Talla
                                </button>
                                <button 
                                  type="button" 
                                  class="fit-select-btn" 
                                  [class.selected]="nuevaCalificacion.ajuste_talla === 'GRANDE'"
                                  (click)="nuevaCalificacion.ajuste_talla = 'GRANDE'">
                                  Queda Grande
                                </button>
                              </div>
                            </div>

                            <div class="form-group-review">
                              <label class="review-field-label">CALIDAD DEL TEJIDO (1 A 5) *</label>
                              <div class="quality-score-selector">
                                @for (num of [1, 2, 3, 4, 5]; track num) {
                                  <button 
                                    type="button" 
                                    class="quality-num-btn" 
                                    [class.selected]="nuevaCalificacion.calidad === num"
                                    (click)="nuevaCalificacion.calidad = num">
                                    {{ num }}
                                  </button>
                                }
                              </div>
                            </div>
                          </div>

                          <!-- Título -->
                          <div class="form-group-review">
                            <label class="review-field-label">TÍTULO DE TU RESEÑA *</label>
                            <input 
                              type="text" 
                              [(ngModel)]="nuevaCalificacion.titulo" 
                              name="titulo" 
                              placeholder="Ej. Caída impecable, excelente para cenas de gala" 
                              required 
                              class="review-input"
                              maxlength="150"
                            />
                          </div>

                          <!-- Comentario -->
                          <div class="form-group-review">
                            <label class="review-field-label">TU OPINIÓN DETALLADA *</label>
                            <textarea 
                              [(ngModel)]="nuevaCalificacion.comentario" 
                              name="comentario" 
                              rows="3" 
                              placeholder="Cuéntanos sobre el corte, textura de la tela, comodidad y ocasiones de uso..." 
                              required 
                              class="review-textarea"
                            ></textarea>
                          </div>

                          <div class="form-review-actions">
                            <button type="button" class="btn-cancel-flat" (click)="showReviewForm.set(false)">Cancelar</button>
                            <button type="submit" class="btn-submit-review" [disabled]="isSubmittingCalif()">
                              {{ isSubmittingCalif() ? 'PUBLICANDO...' : (miCalificacion() ? 'ACTUALIZAR RESEÑA' : 'PUBLICAR RESEÑA') }}
                            </button>
                          </div>
                        </form>
                      </div>
                    }
                  }
                </div>

                <!-- LISTA DE RESEÑAS DE CLIENTES -->
                <div class="reviews-list-container">
                  <h4 class="reviews-list-title">OPINIONES DE NUESTROS CLIENTES ({{ califListado().length }})</h4>

                  @if (isLoadingCalif()) {
                    <div class="reviews-loading">Cargando opiniones...</div>
                  } @else if (califListado().length === 0) {
                    <div class="no-reviews-box">
                      <span>Esta prenda aún no tiene opiniones. ¡Sé el primero en calificarla!</span>
                    </div>
                  } @else {
                    <div class="reviews-stack">
                      @for (review of califListado(); track review.id) {
                        <article class="review-item">
                          <div class="review-item-header">
                            <div class="author-info">
                              <div class="author-avatar">{{ (review.usuario?.nombre || 'C')[0] }}</div>
                              <div class="author-details">
                                <span class="author-name">{{ review.usuario?.nombre }} {{ review.usuario?.apellido }}</span>
                                <div class="review-rating-sub">
                                  <span class="stars-gold-mini">
                                    @for (s of getStarIcons(review.puntuacion); track $index) {
                                      <span>{{ s }}</span>
                                    }
                                  </span>
                                  @if (review.compra_verificada) {
                                    <span class="badge-verified-buyer">
                                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                      Compra Verificada
                                    </span>
                                  }
                                </div>
                              </div>
                            </div>

                            <div class="review-meta-right">
                              <span class="review-date">{{ review.created_at | date:'dd MMM yyyy' }}</span>
                              @if (canDeleteReview(review)) {
                                <button type="button" class="btn-del-review" (click)="eliminarResenaAdmin(review.id, prenda.id)" title="Eliminar reseña">&times;</button>
                              }
                            </div>
                          </div>

                          <h5 class="review-title">{{ review.titulo }}</h5>
                          <p class="review-comment">{{ review.comentario }}</p>

                          <div class="review-tags-footer">
                            <span class="review-tag">Ajuste: {{ getAjusteLabel(review.ajuste_talla) }}</span>
                            <span class="review-tag">Calidad: {{ review.calidad }}/5</span>
                          </div>
                        </article>
                      }
                    </div>
                  }
                </div>
              </div>
            }

            <!-- TAB 3: COMPLETA TU LOOK (IA) (CU19) -->
            @if (activeModalTab() === 'look') {
              <div class="modal-look-view">
                @if (isLoadingOutfit()) {
                  <div class="loading-state-modal">
                    <span class="spinner-sm"></span>
                    <p>Coordinando prendas complementarias con Atelier IA...</p>
                  </div>
                } @else {
                  @if (outfitPrendaData(); as outfit) {
                    <div class="look-coordination-panel">
                      <div class="look-coordination-header">
                        <div class="look-header-titles">
                          <span class="look-badge-gold">✦ SUGERENCIA DE ESTILISMO &bull; {{ outfit.match_score }}% MATCH</span>
                          <h3 class="look-panel-title">{{ outfit.nombre_look }}</h3>
                          <p class="look-panel-desc">{{ outfit.descripcion_estilo }}</p>
                        </div>
                        <div class="look-panel-pricing">
                          <span class="look-pricing-label">Precio Look Completo</span>
                          <strong class="look-pricing-val">\${{ outfit.precio_total | number:'1.2-2' }}</strong>
                          @if (outfit.ahorro_estimado > 0) {
                            <span class="look-saving-chip">Ahorro: -\${{ outfit.ahorro_estimado | number:'1.2-2' }}</span>
                          }
                        </div>
                      </div>

                      <div class="look-items-grid">
                        @for (item of outfit.prendas; track item.id) {
                          <div class="look-garment-card" [class.is-current]="item.id === prenda.id">
                            <div class="look-garment-img-wrap">
                              <img [src]="item.imagen_url || getPortadaUrl(prenda)" [alt]="item.nombre" />
                              <span class="look-item-tag">{{ item.etiqueta_ia }}</span>
                            </div>
                            <div class="look-garment-info">
                              <strong class="look-item-name">{{ item.nombre }}</strong>
                              <span class="look-item-cat">{{ item.categoria_nombre }} &bull; {{ item.sector }}</span>
                              <p class="look-item-why">“{{ item.motivo_recomendacion }}”</p>
                              <span class="look-item-price">\${{ item.precio_base | number:'1.2-2' }} USD</span>
                            </div>
                            @if (item.id !== prenda.id) {
                              <button type="button" class="btn-switch-item" (click)="seleccionarPrendaPorId(item.id)">
                                Ver prenda
                              </button>
                            } @else {
                              <span class="current-item-badge">Prenda en vista</span>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }
                }
              </div>
            }

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

    /* FILA 1: SECTORES A LA IZQUIERDA + BUSCADOR A LA DERECHA */
    .row-sectors-and-search {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .sector-pills-group {
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

    /* FILA 2: SUBCATEGORÍAS CON ESPACIO COMPLETO */
    .row-subcats {
      display: flex;
      align-items: center;
      width: 100%;
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

    /* BUSCADOR A LA DERECHA - EXACTO AL MODELO APROBADO */
    .search-inline-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-left: auto;
    }

    .search-input-container {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    .search-input-mockup {
      width: 250px !important;
      height: 40px !important;
      box-sizing: border-box !important;
      background: #ffffff !important;
      border: 1px solid #d1d5db !important;
      border-radius: 8px !important;
      padding: 0 1rem !important;
      font-size: 0.88rem !important;
      color: #111827 !important;
      outline: none !important;
      box-shadow: none !important;
      transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
    }
    .search-input-mockup:focus {
      border-color: #000000 !important;
      box-shadow: 0 0 0 1px #000000 !important;
    }
    .search-input-mockup::placeholder {
      color: #9ca3af !important;
      font-size: 0.88rem !important;
    }

    .btn-clear-query {
      position: absolute;
      right: 0.65rem;
      background: none !important;
      border: none !important;
      color: #9ca3af !important;
      font-size: 1.1rem !important;
      cursor: pointer;
      padding: 0 0.25rem !important;
      border-radius: 50% !important;
      box-shadow: none !important;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .btn-clear-query:hover {
      color: #111827 !important;
    }

    .btn-search-mockup {
      background: #000000 !important;
      color: #ffffff !important;
      border: 1px solid #000000 !important;
      border-radius: 8px !important;
      height: 40px !important;
      box-sizing: border-box !important;
      padding: 0 1.25rem !important;
      font-size: 0.88rem !important;
      font-weight: 500 !important;
      letter-spacing: 0.02em !important;
      text-transform: none !important;
      cursor: pointer;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 0.5rem !important;
      transition: all 0.2s ease !important;
      box-shadow: none !important;
    }
    .btn-search-mockup:hover {
      background: #1f2937 !important;
      border-color: #1f2937 !important;
    }
    .btn-search-mockup:active {
      transform: scale(0.98);
    }
    .search-loupe-svg {
      width: 15px;
      height: 15px;
      display: inline-block;
      flex-shrink: 0;
      color: #ffffff;
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
      width: 100%;
      aspect-ratio: 3 / 4;
      overflow: hidden;
      cursor: pointer;
      background: #f9fafb;
    }

    .product-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
      transition: transform 0.4s ease;
    }

    .image-wrapper:hover .product-image {
      transform: scale(1.03);
    }

    /* Badges Superpuestos Semicirculares (Categoría y Sexo en esquina superior izquierda) */
    .badge-overlay {
      position: absolute;
      top: 1rem;
      left: 1rem;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.45rem;
      z-index: 5;
      pointer-events: none;
    }

    .badge-category {
      background: #ffffff !important;
      border: 1px solid rgba(0, 0, 0, 0.12) !important;
      border-radius: 9999px !important;
      color: #000000 !important;
      font-size: 0.65rem !important;
      font-weight: 800 !important;
      letter-spacing: 0.08em !important;
      text-transform: uppercase !important;
      padding: 0.32rem 0.85rem !important;
      width: fit-content !important;
      max-width: max-content !important;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
      line-height: 1 !important;
    }

    .badge-sex {
      background: #000000 !important;
      border: 1px solid #000000 !important;
      border-radius: 9999px !important;
      color: #ffffff !important;
      font-size: 0.65rem !important;
      font-weight: 800 !important;
      letter-spacing: 0.08em !important;
      text-transform: uppercase !important;
      padding: 0.32rem 0.85rem !important;
      width: fit-content !important;
      max-width: max-content !important;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
      line-height: 1 !important;
    }

    .ar-badge {
      background: rgba(0, 0, 0, 0.78) !important;
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 255, 255, 0.25) !important;
      border-radius: 9999px !important;
      color: #ffffff !important;
      font-size: 0.62rem !important;
      font-weight: 700 !important;
      letter-spacing: 0.08em !important;
      padding: 0.3rem 0.75rem !important;
      width: fit-content !important;
      max-width: max-content !important;
      line-height: 1 !important;
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
      align-items: center;
      margin-bottom: 0.45rem;
      font-size: 0.72rem;
      color: #6b7280;
      font-family: monospace, sans-serif;
      letter-spacing: 0.02em;
    }

    .sku-tag {
      color: #6b7280;
      font-weight: 600;
    }

    .season-tag {
      color: #6b7280;
      font-weight: 500;
    }

    .rating-strip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      margin-bottom: 0.45rem;
      cursor: pointer;
      width: fit-content;
      transition: opacity 0.2s;
    }

    .rating-strip:hover {
      opacity: 0.75;
    }

    .stars-gold {
      color: #d97706;
      font-size: 0.85rem;
      letter-spacing: 0.05em;
      line-height: 1;
    }

    .star-filled {
      color: #d97706;
    }

    .star-empty {
      color: #d1d5db;
    }

    .rating-num {
      font-weight: 700;
      font-size: 0.78rem;
      color: #111827;
    }

    .reviews-count {
      font-size: 0.72rem;
      color: #6b7280;
    }

    .product-title {

      font-family: 'Inter', sans-serif;
      font-size: 1.22rem;
      font-weight: 800 !important;
      margin: 0 0 0.65rem 0;
      color: #000000;
      cursor: pointer;
      line-height: 1.3;
      transition: color 0.2s ease;
    }

    .product-title:hover {
      color: #374151;
    }

    .product-desc {
      font-size: 0.83rem;
      color: #4b5563;
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      height: 4.35em; /* 3 líneas completas exactas (3 * 1.45em) sin corte de letras */
      margin-bottom: 1.15rem;
    }

    .variants-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      margin-bottom: 1.35rem;
    }

    .variants-label {
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      color: #6b7280;
      font-weight: 700;
      text-transform: uppercase;
    }

    .size-chips {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .size-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      height: 28px;
      box-sizing: border-box;
      padding: 0 6px;
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 3px;
      font-size: 0.78rem;
      font-weight: 600;
      color: #111827;
      transition: all 0.15s ease;
    }

    .size-chip.size-disabled {
      background: #f9fafb;
      border-color: #e5e7eb;
      color: #9ca3af;
      text-decoration: line-through;
      opacity: 0.6;
      cursor: not-allowed;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      padding-top: 1.15rem;
      margin-top: auto;
    }

    .price-container {
      display: flex;
      align-items: baseline;
      gap: 0.35rem;
      font-family: 'Inter', sans-serif;
    }

    .price-original {
      font-size: 0.95rem;
      color: #9ca3af;
      text-decoration: line-through;
      font-weight: 500;
    }

    .currency {
      color: #000000;
      margin-right: 1px;
      font-size: 1.1rem;
      font-weight: 800;
    }

    .price-value {
      font-size: 1.35rem;
      font-weight: 800;
      color: #000000;
      letter-spacing: -0.02em;
    }

    .btn-card-action {
      background: #ffffff !important;
      border: 1px solid #111111 !important;
      color: #111111 !important;
      padding: 0.52rem 1.2rem !important;
      font-size: 0.72rem !important;
      letter-spacing: 0.08em !important;
      font-weight: 700 !important;
      cursor: pointer;
      border-radius: 9999px !important;
      text-transform: uppercase !important;
      transition: all 0.2s ease !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .btn-card-action:hover {
      background: #000000 !important;
      color: #ffffff !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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

    .modal-tabs-bar {
      display: flex;
      gap: 1rem;
      padding: 0 2rem;
      background: #f9fafb;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }

    .modal-tab-btn {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: #6b7280;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      padding: 0.85rem 0.5rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.2s ease;
    }

    .modal-tab-btn:hover {
      color: #000000;
    }

    .modal-tab-btn.active {
      color: #000000;
      border-bottom-color: #000000;
    }

    .modal-tab-btn .tab-icon {
      font-size: 0.85rem;
      color: #d97706;
    }

    .modal-reviews-view {
      padding: 2rem;
      max-height: 70vh;
      overflow-y: auto;
    }

    .reviews-stats-card {
      display: grid;
      grid-template-columns: 180px 1fr 240px;
      gap: 2rem;
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .stats-col-score {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-right: 1px solid rgba(0, 0, 0, 0.08);
      padding-right: 1.5rem;
    }

    .big-score {
      font-size: 3rem;
      font-weight: 800;
      color: #111827;
      line-height: 1;
    }

    .score-stars {
      color: #d97706;
      font-size: 1.25rem;
      margin: 0.4rem 0;
      letter-spacing: 0.1em;
    }

    .score-subtext {
      font-size: 0.75rem;
      color: #6b7280;
      text-align: center;
    }

    .stats-col-bars {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 0.5rem;
    }

    .breakdown-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.75rem;
      color: #4b5563;
    }

    .bar-label {
      width: 2rem;
      font-weight: 600;
      color: #374151;
    }

    .bar-track {
      flex: 1;
      height: 8px;
      background: #e5e7eb;
      border-radius: 9999px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: #d97706;
      border-radius: 9999px;
      transition: width 0.4s ease;
    }

    .bar-count {
      width: 1.5rem;
      text-align: right;
      color: #6b7280;
      font-family: monospace;
    }

    .stats-col-fit {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 0.75rem;
      border-left: 1px solid rgba(0, 0, 0, 0.08);
      padding-left: 1.5rem;
    }

    .fit-title {
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      color: #6b7280;
      font-weight: 700;
      text-transform: uppercase;
      display: block;
    }

    .fit-percentage {
      font-size: 1.75rem;
      font-weight: 800;
      color: #111827;
      display: block;
      line-height: 1.1;
    }

    .fit-caption {
      font-size: 0.75rem;
      color: #6b7280;
      display: block;
    }

    .fit-pills {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-top: 0.25rem;
    }

    .fit-chip {
      font-size: 0.7rem;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      background: #ffffff;
      color: #6b7280;
      border: 1px solid #e5e7eb;
      width: fit-content;
    }

    .fit-chip.active {
      background: #fef3c7;
      color: #92400e;
      border-color: #fde68a;
      font-weight: 600;
    }

    .quality-mini {
      font-size: 0.75rem;
      color: #4b5563;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      padding-top: 0.5rem;
      margin-top: 0.25rem;
    }

    .quality-val {
      font-weight: 700;
      color: #111827;
    }

    .review-action-strip {
      margin-bottom: 2rem;
    }

    .login-prompt-box {
      background: #f9fafb;
      border: 1px dashed #d1d5db;
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      color: #4b5563;
      border-radius: 6px;
    }

    .btn-login-to-review {
      background: #000000;
      color: #ffffff;
      border: none;
      padding: 0.6rem 1.25rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      border-radius: 9999px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-login-to-review:hover {
      background: #27272a;
    }

    .btn-open-form-container {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .btn-write-review {
      background: #000000;
      color: #ffffff;
      border: none;
      padding: 0.75rem 1.75rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-write-review:hover {
      background: #27272a;
      transform: translateY(-1px);
    }

    .verified-status-hint {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.78rem;
      font-weight: 600;
      color: #059669;
      background: #ecfdf5;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      border: 1px solid #a7f3d0;
    }

    .my-review-card {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 1.25rem 1.5rem;
    }

    .my-review-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .my-review-title-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .my-review-badge {
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      background: #000000;
      color: #ffffff;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
    }

    .badge-verified-buyer {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.68rem;
      font-weight: 700;
      color: #059669;
      background: #ecfdf5;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      border: 1px solid #a7f3d0;
    }

    .my-review-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-edit-my-review {
      background: transparent;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #111111;
      padding: 0.35rem 0.85rem;
      font-size: 0.72rem;
      font-weight: 600;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-edit-my-review:hover {
      background: #000000;
      color: #ffffff;
    }

    .btn-delete-my-review {
      background: transparent;
      border: 1px solid #fca5a5;
      color: #dc2626;
      padding: 0.35rem 0.85rem;
      font-size: 0.72rem;
      font-weight: 600;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-delete-my-review:hover {
      background: #dc2626;
      color: #ffffff;
    }

    .my-review-heading {
      font-size: 1rem;
      font-weight: 700;
      color: #111827;
      margin: 0 0 0.4rem 0;
    }

    .my-review-text {
      font-size: 0.85rem;
      line-height: 1.5;
      color: #374151;
      margin: 0 0 0.75rem 0;
    }

    .my-review-meta {
      font-size: 0.72rem;
      color: #6b7280;
    }

    .review-form-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }

    .review-form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      padding-bottom: 0.75rem;
    }

    .review-form-title {
      font-size: 1rem;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }

    .btn-cancel-form {
      background: transparent;
      border: none;
      font-size: 1.5rem;
      color: #6b7280;
      cursor: pointer;
      line-height: 1;
    }
    .btn-cancel-form:hover {
      color: #000000;
    }

    .buyer-notice {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.8rem;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      margin-bottom: 1.25rem;
    }
    .buyer-notice.verified {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }

    .review-form-content {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group-review {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .review-field-label {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #374151;
      text-transform: uppercase;
    }

    .interactive-stars {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .star-btn {
      background: transparent;
      border: none;
      font-size: 1.75rem;
      color: #d1d5db;
      cursor: pointer;
      padding: 0 0.15rem;
      line-height: 1;
      transition: color 0.15s;
    }
    .star-btn.active {
      color: #d97706;
    }

    .star-rating-text {
      font-size: 0.8rem;
      font-weight: 600;
      color: #4b5563;
      margin-left: 0.75rem;
    }

    .fit-selector-buttons {
      display: flex;
      gap: 0.5rem;
    }

    .fit-select-btn {
      flex: 1;
      background: #f9fafb;
      border: 1px solid #d1d5db;
      color: #4b5563;
      border-radius: 9999px;
      padding: 0.55rem 0.85rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    .fit-select-btn.selected {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
    }

    .quality-score-selector {
      display: flex;
      gap: 0.5rem;
    }

    .quality-num-btn {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 9999px;
      background: #f9fafb;
      border: 1px solid #d1d5db;
      color: #374151;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .quality-num-btn.selected {
      background: #000000;
      color: #ffffff;
      border-color: #000000;
    }

    .review-input {
      border: 1px solid #d1d5db;
      border-radius: 4px;
      padding: 0.65rem 0.85rem;
      font-size: 0.85rem;
      color: #111827;
      outline: none;
    }
    .review-input:focus {
      border-color: #000000;
    }

    .review-textarea {
      border: 1px solid #d1d5db;
      border-radius: 4px;
      padding: 0.65rem 0.85rem;
      font-size: 0.85rem;
      color: #111827;
      outline: none;
      resize: vertical;
      font-family: inherit;
    }
    .review-textarea:focus {
      border-color: #000000;
    }

    .form-review-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .btn-cancel-flat {
      background: transparent;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #374151;
      padding: 0.6rem 1.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 9999px;
      cursor: pointer;
    }

    .btn-submit-review {
      background: #000000;
      color: #ffffff;
      border: none;
      padding: 0.6rem 1.5rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      border-radius: 9999px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-submit-review:hover {
      background: #27272a;
    }

    .reviews-list-container {
      margin-top: 2rem;
    }

    .reviews-list-title {
      font-size: 0.82rem;
      letter-spacing: 0.12em;
      font-weight: 700;
      color: #000000;
      margin: 0 0 1.25rem 0;
      text-transform: uppercase;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      padding-bottom: 0.5rem;
    }

    .no-reviews-box {
      background: #f9fafb;
      border: 1px dashed #d1d5db;
      padding: 2rem;
      text-align: center;
      color: #6b7280;
      font-size: 0.85rem;
      border-radius: 6px;
    }

    .reviews-loading {
      padding: 2rem;
      text-align: center;
      color: #6b7280;
      font-size: 0.85rem;
    }

    .reviews-stack {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .review-item {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      padding: 1.25rem 1.5rem;
      transition: box-shadow 0.2s ease;
    }
    .review-item:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .review-item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }

    .author-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .author-avatar {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 9999px;
      background: #111827;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
    }

    .author-details {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .author-name {
      font-size: 0.85rem;
      font-weight: 700;
      color: #111827;
    }

    .review-rating-sub {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .stars-gold-mini {
      color: #d97706;
      font-size: 0.8rem;
      letter-spacing: 0.05em;
    }

    .review-meta-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .review-date {
      font-size: 0.72rem;
      color: #6b7280;
    }

    .btn-del-review {
      background: transparent;
      border: none;
      color: #9ca3af;
      font-size: 1.25rem;
      cursor: pointer;
      line-height: 1;
      padding: 0.2rem;
    }
    .btn-del-review:hover {
      color: #dc2626;
    }

    .review-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #111827;
      margin: 0 0 0.35rem 0;
    }

    .review-comment {
      font-size: 0.85rem;
      line-height: 1.6;
      color: #374151;
      margin: 0 0 0.75rem 0;
    }

    .review-tags-footer {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .review-tag {
      font-size: 0.68rem;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      background: #f3f4f6;
      color: #4b5563;
      border: 1px solid #e5e7eb;
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

    /* CU19: Atelier IA Banner & Look Styles */
    .hero-ia-banner {
      margin-top: 1.5rem;
      background: linear-gradient(135deg, rgba(17, 17, 17, 0.95) 0%, rgba(35, 29, 21, 0.95) 100%);
      border: 1px solid #c5a880;
      border-radius: 6px;
      padding: 0.85rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
    }
    .hero-ia-banner:hover {
      border-color: #dfcaa7;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(197, 168, 128, 0.3);
    }
    .hero-ia-chip {
      background: #c5a880;
      color: #111111;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.25rem 0.65rem;
      border-radius: 50px;
      white-space: nowrap;
    }
    .hero-ia-text {
      color: #dfcaa7;
      font-size: 0.88rem;
      flex-grow: 1;
    }
    .hero-ia-link {
      color: #ffffff;
      font-weight: 700;
      font-size: 0.85rem;
      white-space: nowrap;
      text-decoration: underline;
    }

    .modal-look-view {
      padding: 2rem;
      max-height: 70vh;
      overflow-y: auto;
    }
    .look-coordination-panel {
      background: #fdfbf7;
      border: 1px solid #c5a880;
      border-radius: 8px;
      padding: 1.75rem;
    }
    .look-coordination-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid rgba(197, 168, 128, 0.3);
      padding-bottom: 1.25rem;
    }
    .look-badge-gold {
      font-size: 0.72rem;
      font-weight: 800;
      color: #92400e;
      background: #fef3c7;
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 0.4rem;
    }
    .look-panel-title {
      font-size: 1.3rem;
      font-weight: 800;
      color: #111827;
      margin: 0 0 0.35rem;
    }
    .look-panel-desc {
      font-size: 0.88rem;
      color: #4b5563;
      margin: 0;
      line-height: 1.45;
    }
    .look-panel-pricing {
      text-align: right;
      min-width: 140px;
    }
    .look-pricing-label {
      font-size: 0.72rem;
      color: #6b7280;
      display: block;
      text-transform: uppercase;
    }
    .look-pricing-val {
      font-size: 1.4rem;
      font-weight: 800;
      color: #111827;
      display: block;
    }
    .look-saving-chip {
      font-size: 0.72rem;
      color: #065f46;
      background: #d1fae5;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      display: inline-block;
      margin-top: 0.25rem;
      font-weight: 600;
    }
    .look-items-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem;
    }
    .look-garment-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 6px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      position: relative;
    }
    .look-garment-card.is-current {
      border: 2px solid #c5a880;
      background: #fffdfa;
    }
    .look-garment-img-wrap {
      position: relative;
      height: 180px;
      overflow: hidden;
      border-radius: 4px;
    }
    .look-garment-img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .look-item-tag {
      position: absolute;
      top: 8px;
      left: 8px;
      background: rgba(0, 0, 0, 0.75);
      color: #ffffff;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 3px;
    }
    .look-item-name {
      font-size: 0.95rem;
      font-weight: 800;
      color: #111827;
      display: block;
    }
    .look-item-cat {
      font-size: 0.72rem;
      color: #6b7280;
      display: block;
      text-transform: uppercase;
      margin-bottom: 0.3rem;
    }
    .look-item-why {
      font-size: 0.78rem;
      color: #4b5563;
      font-style: italic;
      margin: 0 0 0.5rem;
      line-height: 1.4;
    }
    .look-item-price {
      font-size: 1.05rem;
      font-weight: 800;
      color: #111827;
      display: block;
    }
    .btn-switch-item {
      background: #111827;
      color: #ffffff;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 0.5rem;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      margin-top: auto;
      transition: background 0.2s ease;
    }
    .btn-switch-item:hover {
      background: #c5a880;
      color: #000000;
    }
    .current-item-badge {
      font-size: 0.72rem;
      font-weight: 700;
      color: #92400e;
      background: #fef3c7;
      padding: 0.4rem;
      text-align: center;
      border-radius: 4px;
      margin-top: auto;
    }
    .loading-state-modal {
      text-align: center;
      padding: 3rem 1rem;
      color: #6b7280;
    }
    .spinner-sm {
      display: inline-block;
      width: 28px;
      height: 28px;
      border: 3px solid rgba(197, 168, 128, 0.3);
      border-top-color: #c5a880;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 0.75rem;
    }
  `]
})
export class CatalogoPageComponent implements OnInit {
  private readonly catalogoService = inject(CatalogoService);
  private readonly inventarioService = inject(InventarioService);
  private readonly iaService = inject(IaAsistenteService);
  readonly authService = inject(AuthService);
  readonly router = inject(Router);

  prendas = signal<Prenda[]>([]);
  categorias = signal<Categoria[]>([]);
  temporadas = signal<Temporada[]>([]);
  tallas = signal<Talla[]>([]);
  colores = signal<Color[]>([]);
  sucursales = signal<Sucursal[]>([]);

  // CU18: Calificaciones y Reseñas
  activeModalTab = signal<'info' | 'resenas' | 'look'>('info');
  califListado = signal<Calificacion[]>([]);
  califEstadisticas = signal<EstadisticasCalificaciones | null>(null);
  miCalificacion = signal<Calificacion | null>(null);
  esCompradorVerificado = signal<boolean>(false);
  isLoadingCalif = signal<boolean>(false);
  isSubmittingCalif = signal<boolean>(false);
  showReviewForm = signal<boolean>(false);
  hoverEstrellas = signal<number>(0);

  // CU19: Completa tu Look
  outfitPrendaData = signal<OutfitSugerido | null>(null);
  isLoadingOutfit = signal<boolean>(false);

  nuevaCalificacion: CalificacionCreate = {
    puntuacion: 5,
    ajuste_talla: 'FIEL',
    calidad: 5,
    titulo: '',
    comentario: ''
  };


  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  feedbackMsg = signal<string | null>(null);
  feedbackIsError = signal<boolean>(false);

  selectedSector = signal<'TODAS' | 'MUJERES' | 'HOMBRES' | 'UNISEX'>('TODAS');
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

  seleccionarSector(sector: 'TODAS' | 'MUJERES' | 'HOMBRES' | 'UNISEX'): void {
    this.selectedSector.set(sector);
    this.selectedCategoriaId.set('ALL');
  }

  seleccionarCategoria(catId: number | 'ALL'): void {
    this.selectedCategoriaId.set(catId);
  }

  onSearchChange(val: string): void {
    this.searchQuery = val;
    this.searchTermActive.set(val.trim().toLowerCase());
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

  getSectorLabel(prenda: Prenda): string {
    const s = prenda.categoria?.sector;
    if (!s || s === 'MUJERES') return 'MUJER';
    if (s === 'HOMBRES') return 'HOMBRE';
    return s;
  }

  getSizesWithStock(prenda: Prenda): { codigo: string; disponible: boolean }[] {
    const standardSizes = ['S', 'M', 'L'];
    const activeCodes = new Set(
      (prenda.variantes || [])
        .filter(v => v.activo && v.talla?.codigo)
        .map(v => v.talla!.codigo)
    );
    prenda.variantes?.forEach(v => {
      if (v.talla?.codigo && !standardSizes.includes(v.talla.codigo)) {
        standardSizes.push(v.talla.codigo);
      }
    });
    return standardSizes.map(code => ({
      codigo: code,
      disponible: activeCodes.has(code)
    }));
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80';
  }

  getStarIcons(rating: number): string[] {
    const rounded = Math.round(rating);
    const stars: string[] = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= rounded ? '★' : '☆');
    }
    return stars;
  }

  getPercentage(count: number, total: number): number {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  }

  getAjusteLabel(ajuste?: string): string {
    switch (ajuste?.toUpperCase()) {
      case 'PEQUENO': return 'Queda Pequeña';
      case 'GRANDE': return 'Queda Grande';
      case 'FIEL':
      default: return 'Fiel a la Talla';
    }
  }

  getRatingLabel(puntuacion: number): string {
    switch (puntuacion) {
      case 5: return 'Excelente (5/5)';
      case 4: return 'Muy Bueno (4/5)';
      case 3: return 'Bueno (3/5)';
      case 2: return 'Regular (2/5)';
      case 1: return 'Deficiente (1/5)';
      default: return `${puntuacion}/5`;
    }
  }

  canDeleteReview(review: Calificacion): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;
    if (user.id === review.usuario_id) return true;
    const rolNombre = user.rol?.nombre || '';
    return ['ADMINISTRADOR', 'ADMIN', 'GERENTE'].includes(rolNombre);
  }

  openDetail(prenda: Prenda, initialTab: 'info' | 'resenas' | 'look' = 'info'): void {
    this.selectedPrenda.set(prenda);
    this.activeModalTab.set(initialTab);
    this.showReviewForm.set(false);
    this.loadCalificaciones(prenda.id);
  }

  closeDetail(): void {
    this.selectedPrenda.set(null);
  }

  loadCalificaciones(prendaId: number): void {
    this.isLoadingCalif.set(true);
    this.catalogoService.getCalificacionesPrenda(prendaId).subscribe({
      next: (res) => {
        this.califListado.set(res.calificaciones);
        this.califEstadisticas.set(res.estadisticas);
        this.miCalificacion.set(res.mi_calificacion || null);
        this.esCompradorVerificado.set(res.es_comprador_verificado);
        this.isLoadingCalif.set(false);

        const curr = this.selectedPrenda();
        if (curr && curr.id === prendaId) {
          curr.rating_promedio = res.estadisticas.promedio;
          curr.total_resenas = res.estadisticas.total_resenas;
        }
        this.prendas.update(items =>
          items.map(p => p.id === prendaId ? {
            ...p,
            rating_promedio: res.estadisticas.promedio,
            total_resenas: res.estadisticas.total_resenas
          } : p)
        );

        if (res.mi_calificacion) {
          this.nuevaCalificacion = {
            puntuacion: res.mi_calificacion.puntuacion,
            ajuste_talla: res.mi_calificacion.ajuste_talla,
            calidad: res.mi_calificacion.calidad,
            titulo: res.mi_calificacion.titulo,
            comentario: res.mi_calificacion.comentario
          };
        } else {
          this.nuevaCalificacion = {
            puntuacion: 5,
            ajuste_talla: 'FIEL',
            calidad: 5,
            titulo: '',
            comentario: ''
          };
        }
      },
      error: () => {
        this.isLoadingCalif.set(false);
      }
    });
  }

  iniciarEdicionResena(calif: Calificacion): void {
    this.nuevaCalificacion = {
      puntuacion: calif.puntuacion,
      ajuste_talla: calif.ajuste_talla,
      calidad: calif.calidad,
      titulo: calif.titulo,
      comentario: calif.comentario
    };
    this.showReviewForm.set(true);
  }

  guardarCalificacion(prendaId: number): void {
    if (!this.nuevaCalificacion.titulo.trim()) {
      this.showFeedback('Por favor ingresa un título para tu reseña.', true);
      return;
    }
    if (this.nuevaCalificacion.comentario.trim().length < 5) {
      this.showFeedback('Por favor escribe un comentario de al menos 5 caracteres.', true);
      return;
    }

    this.isSubmittingCalif.set(true);
    this.catalogoService.calificarPrenda(prendaId, this.nuevaCalificacion).subscribe({
      next: () => {
        this.isSubmittingCalif.set(false);
        this.showReviewForm.set(false);
        this.showFeedback('¡Tu reseña ha sido publicada exitosamente!');
        this.loadCalificaciones(prendaId);
      },
      error: (err) => {
        this.isSubmittingCalif.set(false);
        const detail = err.error?.detail || 'Error al publicar la reseña.';
        this.showFeedback(detail, true);
      }
    });
  }

  eliminarMiResena(calificacionId: number, prendaId: number): void {
    if (!confirm('¿Estás seguro de eliminar tu reseña para esta prenda?')) return;
    this.catalogoService.eliminarCalificacion(calificacionId).subscribe({
      next: () => {
        this.showFeedback('Reseña eliminada correctamente.');
        this.loadCalificaciones(prendaId);
      },
      error: (err) => {
        const detail = err.error?.detail || 'Error al eliminar la reseña.';
        this.showFeedback(detail, true);
      }
    });
  }

  eliminarResenaAdmin(calificacionId: number, prendaId: number): void {
    if (!confirm('¿Estás seguro de eliminar esta reseña como moderador?')) return;
    this.catalogoService.eliminarCalificacion(calificacionId).subscribe({
      next: () => {
        this.showFeedback('Reseña eliminada por moderación.');
        this.loadCalificaciones(prendaId);
      },
      error: (err) => {
        const detail = err.error?.detail || 'Error al eliminar la reseña.';
        this.showFeedback(detail, true);
      }
    });
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

  // CU19: Completa tu Look e IA
  abrirTabLook(prendaId: number): void {
    this.activeModalTab.set('look');
    this.isLoadingOutfit.set(true);
    this.iaService.getOutfitSugerido(prendaId).subscribe({
      next: (data) => {
        this.outfitPrendaData.set(data);
        this.isLoadingOutfit.set(false);
      },
      error: (err) => {
        console.error('Error al cargar outfit:', err);
        this.isLoadingOutfit.set(false);
      }
    });
  }

  seleccionarPrendaPorId(prendaId: number): void {
    this.catalogoService.getPrendaById(prendaId).subscribe({
      next: (p) => {
        this.openDetail(p, 'look');
        this.abrirTabLook(p.id);
      }
    });
  }

  irAEstilistaIA(): void {
    this.router.navigate(['/ia-asistente']);
  }
}
