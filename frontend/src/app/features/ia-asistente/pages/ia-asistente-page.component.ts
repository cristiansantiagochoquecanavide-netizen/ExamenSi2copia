import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IaAsistenteService } from '../services/ia-asistente.service';
import {
  DashboardRecomendaciones,
  PreferenciaEstilo,
  PreferenciaEstiloCreate,
  RecomendacionPrenda,
  OutfitSugerido
} from '../models/ia-asistente.models';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-ia-asistente-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="catalogo-container">
      <!-- 1. HERO & BANNER EDITORIAL (ESTILO FASHIONSTORE) -->
      <section class="editorial-hero">
        <div class="hero-content">
          <div class="editorial-eyebrow">
            <span class="gold-dot">&bull;</span>
            <span>ATELIER STYLIST &bull; MOTOR DE RECOMENDACIONES IA</span>
          </div>

          <h1 class="hero-title">Tu Estilista Personal</h1>

          <p class="hero-description">
            @if (dashboard()?.usuario_nombre) {
              Hola, <strong>{{ dashboard()?.usuario_nombre }}</strong>. Nuestro motor inteligente analiza tus compras previas,
              ocasiones predilectas y la colección de temporada para curar selecciones y looks que realzan tu presencia.
            } @else {
              Descubrí piezas exclusivas seleccionadas por nuestro algoritmo de estilismo inteligente según tendencias estacionales,
              armonía tonal y ocasiones de gala.
            }
          </p>

          <div class="hero-actions">
            <button type="button" class="btn-action-gold" (click)="abrirModalQuiz()">
              ⚡ {{ dashboard()?.perfil_completado ? 'REFINAR MI TEST DE ESTILO' : 'REALIZAR TEST DE ESTILO PERSONAL' }}
            </button>

            @if (dashboard()?.perfil_completado && dashboard()?.preferencias) {
              <div class="profile-summary-pills">
                <span class="summary-pill">Silueta: {{ dashboard()?.preferencias?.sector_preferido }}</span>
                <span class="summary-pill">Ocasión: {{ dashboard()?.preferencias?.ocasion_frecuente }}</span>
                @if (dashboard()?.preferencias?.presupuesto_max) {
                  <span class="summary-pill">Hasta \${{ dashboard()?.preferencias?.presupuesto_max }}</span>
                }
              </div>
            }
          </div>
        </div>
      </section>

      <!-- 2. FILTRO RÁPIDO DE OCASIÓN -->
      <section class="occasions-bar">
        <span class="bar-label">Explorar por Ocasión:</span>
        <div class="pills-scroll">
          @for (oc of ocasionesDisponibles; track oc.id) {
            <button
              type="button"
              class="occasion-pill"
              [class.active]="ocasionSeleccionada() === oc.id"
              (click)="seleccionarOcasion(oc.id)"
            >
              {{ oc.label }}
            </button>
          }
        </div>
      </section>

      <!-- 3. LOOKS COORDINADOS SUGERIDOS ("COMPLETA TU LOOK") -->
      @if (dashboard()?.outfits_destacados && dashboard()!.outfits_destacados.length > 0) {
        <section class="outfits-section">
          <div class="section-header">
            <div>
              <span class="section-tag">CURADURÍA DE LOOKS</span>
              <h2 class="section-title">Looks Completos Coordinados por Atelier IA</h2>
            </div>
            <span class="coordination-badge">✓ Armonía cromática &amp; corte garantizados</span>
          </div>

          <div class="outfits-grid">
            @for (outfit of dashboard()!.outfits_destacados; track outfit.id) {
              <div class="outfit-card">
                <div class="outfit-header">
                  <div class="outfit-info">
                    <span class="outfit-match">★ {{ outfit.match_score }}% Match Estilístico</span>
                    <h3 class="outfit-title">{{ outfit.nombre_look }}</h3>
                    <p class="outfit-desc">{{ outfit.descripcion_estilo }}</p>
                  </div>
                  <div class="outfit-pricing">
                    <span class="price-label">Conjunto Completo</span>
                    <span class="price-val">\${{ outfit.precio_total | number:'1.2-2' }}</span>
                    @if (outfit.ahorro_estimado > 0) {
                      <span class="saving-tag">Ahorro: -\${{ outfit.ahorro_estimado | number:'1.2-2' }}</span>
                    }
                  </div>
                </div>

                <div class="outfit-items-row">
                  @for (prenda of outfit.prendas; track prenda.id) {
                    <div class="outfit-item-card">
                      <div class="item-img-wrapper">
                        <img [src]="prenda.imagen_url || 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=400&q=80'" [alt]="prenda.nombre" />
                        <span class="item-role-tag">{{ prenda.etiqueta_ia }}</span>
                      </div>
                      <div class="item-meta">
                        <span class="item-cat">{{ prenda.categoria_nombre }}</span>
                        <strong class="item-name">{{ prenda.nombre }}</strong>
                        <span class="item-price">\${{ prenda.precio_base | number:'1.2-2' }}</span>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </section>
      }

      <!-- 4. RECOMENDACIONES INDIVIDUALES HIPERPERSONALIZADAS -->
      <section class="recommendations-section">
        <div class="section-header">
          <div>
            <span class="section-tag">SELECCIÓN INDIVIDUAL</span>
            <h2 class="section-title">Prendas Recomendadas Especialmente para Ti</h2>
          </div>
          <p class="section-subtitle">
            Basado en tu compatibilidad de silueta, ocasiones declaradas y compras registradas.
          </p>
        </div>

        @if (cargando()) {
          <div class="loading-state">
            <span class="spinner"></span>
            <p>Calculando afinidades de alta costura con Atelier IA...</p>
          </div>
        } @else if (prendasMostradas().length === 0) {
          <div class="empty-state">
            <p>No se encontraron prendas para la ocasión seleccionada. Probá con otra categoría o actualizá tu Test de Estilo.</p>
          </div>
        } @else {
          <div class="recommendations-grid">
            @for (prenda of prendasMostradas(); track prenda.id) {
              <div class="recom-card">
                <!-- Badges Superiores -->
                <div class="card-badges-top">
                  <span class="match-badge">⚡ {{ prenda.match_score }}% MATCH</span>
                  <span class="ia-tag">{{ prenda.etiqueta_ia }}</span>
                </div>

                <!-- Imagen de la Prenda -->
                <div class="card-img-container">
                  <img
                    [src]="prenda.imagen_url || 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80'"
                    [alt]="prenda.nombre"
                    loading="lazy"
                  />
                </div>

                <!-- Contenido Informativo -->
                <div class="card-body">
                  <!-- Pills de Categoría y Sector (Semicirculares) -->
                  <div class="category-pills-row">
                    <span class="pill-category">{{ prenda.categoria_nombre }}</span>
                    <span class="pill-sector">{{ prenda.sector }}</span>
                  </div>

                  <!-- Nombre Comercial en Negrita -->
                  <h3 class="product-title">{{ prenda.nombre }}</h3>

                  <!-- Calificación de Estrellas (CU18) -->
                  <div class="rating-row">
                    <span class="stars">★★★★★</span>
                    <span class="rating-num">{{ prenda.rating_promedio }}</span>
                    <span class="review-count">({{ prenda.total_resenas }} reseñas)</span>
                  </div>

                  <!-- Rationale / Explicación de la IA -->
                  <div class="ai-rationale-box">
                    <span class="quote-icon">“</span>
                    <p class="rationale-text">{{ prenda.motivo_recomendacion }}</p>
                  </div>

                  <!-- Precio y Acciones -->
                  <div class="card-footer">
                    <div class="price-wrap">
                      <span class="currency">Bs.</span>
                      <span class="amount">{{ prenda.precio_base | number:'1.2-2' }}</span>
                    </div>

                    <div class="actions-wrap">
                      <button
                        type="button"
                        class="btn-look-modal"
                        title="Ver combinaciones de este producto"
                        (click)="verCombinacionesLook(prenda)"
                      >
                        Combinar
                      </button>
                      <a
                        [routerLink]="['/catalogo']"
                        class="btn-view-product"
                        (click)="registrarInteraccion(prenda.id, 'CLICK')"
                      >
                        Ver en Catálogo
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </section>

      <!-- 5. MODAL INTERACTIVO: TEST DE ESTILO PERSONAL (QUIZ) -->
      @if (mostrarModalQuiz()) {
        <div class="modal-backdrop" (click)="cerrarModalQuiz()">
          <div class="quiz-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <span class="modal-pre-tag">PERFIL DE MODA INTELIGENTE</span>
                <h3 class="modal-title">Test de Estilo Personal • Atelier IA</h3>
              </div>
              <button type="button" class="btn-close-modal" (click)="cerrarModalQuiz()">✕</button>
            </div>

            <div class="modal-body">
              <p class="quiz-instruction">
                Respondé estas breves preguntas para que nuestra IA calibre tus recomendaciones según tu silueta, ocasiones y presupuesto.
              </p>

              <!-- Paso 1: Sector / Silueta -->
              <div class="quiz-group">
                <label class="group-label">1. Silueta / Colección Principal</label>
                <div class="options-pills">
                  @for (sec of ['MUJER', 'HOMBRE', 'UNISEX']; track sec) {
                    <button
                      type="button"
                      class="quiz-pill"
                      [class.selected]="quizForm.sector_preferido === sec"
                      (click)="quizForm.sector_preferido = sec"
                    >
                      {{ sec }}
                    </button>
                  }
                </div>
              </div>

              <!-- Paso 2: Ocasión Frecuente -->
              <div class="quiz-group">
                <label class="group-label">2. Ocasión de Uso Más Frecuente</label>
                <div class="options-pills">
                  @for (oc of [
                    { id: 'GALA', label: 'Gala & Noche' },
                    { id: 'FORMAL_OFICINA', label: 'Formal & Oficina' },
                    { id: 'COCTEL', label: 'Cóctel & Eventos' },
                    { id: 'CASUAL', label: 'Casual de Lujo' },
                    { id: 'URBANO', label: 'Urbano Vanguardia' }
                  ]; track oc.id) {
                    <button
                      type="button"
                      class="quiz-pill"
                      [class.selected]="quizForm.ocasion_frecuente === oc.id"
                      (click)="quizForm.ocasion_frecuente = oc.id"
                    >
                      {{ oc.label }}
                    </button>
                  }
                </div>
              </div>

              <!-- Paso 3: Estilos Predilectos -->
              <div class="quiz-group">
                <label class="group-label">3. Estilos de Diseño que te Identifican (Selección múltiple)</label>
                <div class="options-pills">
                  @for (est of ['Elegante', 'Minimalista', 'Sartorial', 'Vanguardista', 'Clásico', 'Contemporáneo']; track est) {
                    <button
                      type="button"
                      class="quiz-pill"
                      [class.selected]="quizForm.estilos_preferidos.includes(est)"
                      (click)="toggleEstilo(est)"
                    >
                      {{ est }}
                    </button>
                  }
                </div>
              </div>

              <!-- Paso 4: Colores Favoritos -->
              <div class="quiz-group">
                <label class="group-label">4. Paleta de Colores Preferida</label>
                <div class="options-pills">
                  @for (col of ['Negro Noir', 'Blanco Puro', 'Dorado Oro', 'Azul Noche', 'Esmeralda', 'Bordeaux']; track col) {
                    <button
                      type="button"
                      class="quiz-pill"
                      [class.selected]="quizForm.colores_favoritos.includes(col)"
                      (click)="toggleColor(col)"
                    >
                      {{ col }}
                    </button>
                  }
                </div>
              </div>

              <!-- Paso 5: Presupuesto Máximo -->
              <div class="quiz-group">
                <label class="group-label">5. Rango de Presupuesto Estimado por Prenda (Bs.)</label>
                <div class="budget-input-wrap">
                  <span class="budget-symbol">Bs.</span>
                  <input
                    type="number"
                    min="50"
                    max="5000"
                    step="50"
                    class="budget-field"
                    [(ngModel)]="quizForm.presupuesto_max"
                    placeholder="Ej: 800"
                  />
                  <span class="budget-hint">Dejá en blanco si no tenés límite estricto</span>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="cerrarModalQuiz()">Cancelar</button>
              <button type="button" class="btn-save-quiz" [disabled]="guardandoQuiz()" (click)="guardarQuiz()">
                @if (guardandoQuiz()) {
                  <span>Calibrando...</span>
                } @else {
                  <span>Guardar y Actualizar Recomendaciones</span>
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- 6. MODAL INTERACTIVO: COMPLETA TU LOOK DE UNA PRENDA -->
      @if (outfitModalPrenda()) {
        <div class="modal-backdrop" (click)="cerrarModalOutfit()">
          <div class="look-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <span class="modal-pre-tag">COMBINACIÓN SUGERIDA POR ATELIER IA</span>
                <h3 class="modal-title">{{ outfitModalData()?.nombre_look || 'Completa tu Look' }}</h3>
              </div>
              <button type="button" class="btn-close-modal" (click)="cerrarModalOutfit()">✕</button>
            </div>

            <div class="modal-body">
              <p class="look-desc-callout">{{ outfitModalData()?.descripcion_estilo }}</p>

              @if (cargandoOutfit()) {
                <div class="loading-state">
                  <span class="spinner"></span>
                  <p>Coordinando prendas complementarias...</p>
                </div>
              } @else if (outfitModalData()) {
                <div class="look-items-list">
                  @for (item of outfitModalData()!.prendas; track item.id) {
                    <div class="look-item-box">
                      <img [src]="item.imagen_url || 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=300&q=80'" [alt]="item.nombre" />
                      <div class="item-info">
                        <span class="item-tag">{{ item.etiqueta_ia }}</span>
                        <strong>{{ item.nombre }}</strong>
                        <span class="item-cat-txt">{{ item.categoria_nombre }} &bull; {{ item.sector }}</span>
                        <p class="item-motivo">{{ item.motivo_recomendacion }}</p>
                      </div>
                      <div class="item-price-col">
                        <span class="item-val">Bs. {{ item.precio_base | number:'1.2-2' }}</span>
                      </div>
                    </div>
                  }
                </div>

                <div class="look-total-bar">
                  <div>
                    <span class="look-total-label">Total Conjunto Completo:</span>
                    <strong class="look-total-amount">Bs. {{ outfitModalData()!.precio_total | number:'1.2-2' }}</strong>
                  </div>
                  @if (outfitModalData()!.ahorro_estimado > 0) {
                    <span class="saving-badge">Ahorro por Look: -Bs. {{ outfitModalData()!.ahorro_estimado | number:'1.2-2' }}</span>
                  }
                </div>
              }
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="cerrarModalOutfit()">Cerrar</button>
              <a [routerLink]="['/catalogo']" class="btn-save-quiz" (click)="cerrarModalOutfit()">
                Explorar en Catálogo
              </a>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background-color: #ffffff;
      color: #111111;
      min-height: 100vh;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .catalogo-container,
    .atelier-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2.5rem 3rem 4rem 3rem;
      color: #111111;
      background-color: #ffffff;
    }

    /* 1. HERO BANNER EDITORIAL */
    .editorial-hero {
      padding: 0 0 2.5rem 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      margin-bottom: 2.5rem;
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
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0 0 0.75rem 0;
      color: #000000 !important;
    }

    .hero-description {
      font-size: 0.95rem;
      line-height: 1.6;
      color: #4b5563;
      max-width: 800px;
      margin-bottom: 2rem;
    }

    .hero-description strong {
      color: #000000;
      font-weight: 700;
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1.25rem;
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
      text-transform: uppercase;
    }

    .btn-action-gold:hover {
      background: #262626;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .profile-summary-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .summary-pill {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.12);
      color: #374151;
      padding: 0.4rem 0.85rem;
      border-radius: 50px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    /* 2. OCCASIONS BAR */
    .occasions-bar {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 3rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }

    .bar-label {
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6b7280;
      font-weight: 600;
      white-space: nowrap;
    }

    .pills-scroll {
      display: flex;
      gap: 0.6rem;
      overflow-x: auto;
      padding-bottom: 0.25rem;
    }

    .occasion-pill {
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

    .occasion-pill:hover {
      border-color: #000000;
      color: #000000;
      background: #f9fafb;
    }

    .occasion-pill.active {
      background: #000000 !important;
      border-color: #000000 !important;
      color: #ffffff !important;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
    }

    /* 3. SECTION HEADERS */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 1.75rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      padding-bottom: 0.75rem;
    }

    .section-tag {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #92400e;
      text-transform: uppercase;
    }

    .section-title {
      font-size: 1.6rem;
      font-weight: 800;
      color: #000000 !important;
      margin: 0.25rem 0 0;
    }

    .coordination-badge {
      font-size: 0.78rem;
      font-weight: 600;
      color: #0369a1;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      padding: 0.35rem 0.85rem;
      border-radius: 50px;
    }

    /* 3. OUTFITS CARDS */
    .outfits-section {
      margin-bottom: 4rem;
    }

    .outfits-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 1.75rem;
    }

    @media (max-width: 768px) {
      .outfits-grid {
        grid-template-columns: 1fr;
      }
    }

    .outfit-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 6px;
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .outfit-card:hover {
      border-color: rgba(0, 0, 0, 0.25);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }

    .outfit-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      padding-bottom: 1rem;
    }

    .outfit-match {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      color: #78350f;
      background: #fbf6ee;
      border: 1px solid #e7d8c5;
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      margin-bottom: 0.5rem;
    }

    .outfit-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #000000 !important;
      margin: 0 0 0.3rem;
    }

    .outfit-desc {
      font-size: 0.88rem;
      color: #4b5563;
      margin: 0;
      line-height: 1.5;
    }

    .outfit-pricing {
      text-align: right;
      min-width: 140px;
    }

    .price-label {
      font-size: 0.72rem;
      color: #6b7280;
      display: block;
      text-transform: uppercase;
      font-weight: 600;
    }

    .price-val {
      font-size: 1.4rem;
      font-weight: 800;
      color: #000000 !important;
      display: block;
    }

    .saving-tag {
      font-size: 0.72rem;
      font-weight: 700;
      color: #15803d;
      background: #dcfce7;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      display: inline-block;
      margin-top: 0.25rem;
    }

    .outfit-items-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .outfit-item-card {
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 6px;
      overflow: hidden;
    }

    .item-img-wrapper {
      position: relative;
      height: 190px;
      background: #f3f4f6;
      overflow: hidden;
    }

    .item-img-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .item-img-wrapper:hover img {
      transform: scale(1.04);
    }

    .item-role-tag {
      position: absolute;
      bottom: 8px;
      left: 8px;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
      color: #ffffff;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.2rem 0.55rem;
      border-radius: 3px;
    }

    .item-meta {
      padding: 0.85rem;
    }

    .item-cat {
      font-size: 0.7rem;
      text-transform: uppercase;
      color: #6b7280;
      display: block;
      margin-bottom: 0.25rem;
    }

    .item-name {
      font-size: 0.92rem;
      font-weight: 700;
      color: #111111;
      display: block;
      margin-bottom: 0.4rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-price {
      font-size: 0.95rem;
      font-weight: 800;
      color: #000000;
    }

    /* 4. RECOMMENDATIONS GRID */
    .recommendations-section {
      margin-bottom: 5rem;
    }

    .section-subtitle {
      font-size: 0.9rem;
      color: #6b7280;
      margin: 0.3rem 0 0;
    }

    .recommendations-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 2rem;
    }

    .recom-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 6px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: all 0.25s ease;
      position: relative;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
    }

    .recom-card:hover {
      border-color: rgba(0, 0, 0, 0.3);
      transform: translateY(-4px);
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
    }

    .card-badges-top {
      position: absolute;
      top: 12px;
      left: 12px;
      right: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 2;
    }

    .match-badge {
      background: #000000;
      color: #ffffff;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.25rem 0.65rem;
      border-radius: 50px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }

    .ia-tag {
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(0, 0, 0, 0.15);
      color: #111111;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.25rem 0.55rem;
      border-radius: 4px;
      backdrop-filter: blur(4px);
    }

    .card-img-container {
      height: 340px;
      overflow: hidden;
      background: #f3f4f6;
      position: relative;
    }

    .card-img-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }

    .recom-card:hover .card-img-container img {
      transform: scale(1.04);
    }

    .card-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }

    /* Regla 1, 2, 3: Marcos semicirculares que se acoplan al texto */
    .category-pills-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .pill-category,
    .pill-sector {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      max-width: 100%;
      padding: 0.2rem 0.75rem;
      border-radius: 50px; /* Semicircular */
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.04em;
    }

    .pill-category {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.12);
      color: #000000;
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 0.32rem 0.85rem;
      border-radius: 9999px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    }

    .pill-sector {
      background: #000000;
      border: 1px solid #000000;
      color: #ffffff;
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 0.32rem 0.85rem;
      border-radius: 9999px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }

    /* Regla 4: Nombre comercial en negrita */
    .product-title {
      font-size: 1.15rem;
      font-weight: 800; /* Obligatoriamente negrita */
      color: #000000 !important;
      margin: 0 0 0.5rem;
      line-height: 1.35;
    }

    .rating-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 0.85rem;
      font-size: 0.82rem;
    }

    .stars {
      color: #f59e0b;
      letter-spacing: 0.1em;
    }

    .rating-num {
      font-weight: 700;
      color: #111111;
    }

    .review-count {
      color: #6b7280;
    }

    /* Rationale Box */
    .ai-rationale-box {
      background: #fdfbf7;
      border: 1px solid rgba(197, 168, 128, 0.3);
      border-left: 3px solid #c5a880;
      padding: 0.65rem 0.85rem;
      border-radius: 0 4px 4px 0;
      margin-bottom: 1.25rem;
      display: flex;
      gap: 0.4rem;
    }

    .quote-icon {
      color: #b45309;
      font-size: 1.2rem;
      line-height: 1;
      font-family: Georgia, serif;
    }

    .rationale-text {
      font-size: 0.82rem;
      color: #374151;
      font-style: italic;
      margin: 0;
      line-height: 1.45;
    }

    .card-footer {
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      padding-top: 1rem;
    }

    .price-wrap {
      display: flex;
      flex-direction: column;
    }

    .currency {
      font-size: 0.68rem;
      color: #6b7280;
      font-weight: 600;
    }

    .amount {
      font-size: 1.25rem;
      font-weight: 800;
      color: #000000 !important;
    }

    .actions-wrap {
      display: flex;
      gap: 0.5rem;
    }

    .btn-look-modal {
      background: #ffffff;
      border: 1px solid #c5a880;
      color: #78350f;
      font-size: 0.78rem;
      font-weight: 600;
      padding: 0.5rem 0.85rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-look-modal:hover {
      background: #fdfbf7;
      border-color: #78350f;
    }

    .btn-view-product {
      background: #000000;
      color: #ffffff;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 0.5rem 0.95rem;
      border-radius: 4px;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .btn-view-product:hover {
      background: #c5a880;
      color: #000000;
    }

    /* MODAL STYLES */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 1.5rem;
    }

    .quiz-modal,
    .look-modal {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 8px;
      width: 100%;
      max-width: 680px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.5rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }

    .modal-pre-tag {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #78350f;
    }

    .modal-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: #000000 !important;
      margin: 0.25rem 0 0;
    }

    .btn-close-modal {
      background: transparent;
      border: none;
      color: #6b7280;
      font-size: 1.3rem;
      cursor: pointer;
      line-height: 1;
      transition: color 0.15s ease;
    }

    .btn-close-modal:hover {
      color: #000000;
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .quiz-instruction {
      font-size: 0.9rem;
      color: #4b5563;
      margin: 0;
      line-height: 1.5;
    }

    .group-label {
      display: block;
      font-size: 0.88rem;
      font-weight: 700;
      color: #111111;
      margin-bottom: 0.6rem;
    }

    .options-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .quiz-pill {
      background: #f3f4f6;
      border: 1px solid rgba(0, 0, 0, 0.1);
      color: #374151;
      font-size: 0.82rem;
      font-weight: 600;
      padding: 0.45rem 1rem;
      border-radius: 50px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .quiz-pill:hover {
      border-color: #000000;
      color: #000000;
    }

    .quiz-pill.selected {
      background: #000000;
      border-color: #000000;
      color: #ffffff;
      font-weight: 700;
    }

    .budget-input-wrap {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .budget-symbol {
      font-size: 1.2rem;
      color: #78350f;
      font-weight: 800;
    }

    .budget-field {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #000000;
      padding: 0.65rem 1rem;
      border-radius: 4px;
      font-size: 1rem;
      width: 160px;
    }

    .budget-hint {
      font-size: 0.8rem;
      color: #6b7280;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      background: #f9fafb;
    }

    .btn-cancel {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #374151;
      padding: 0.75rem 1.25rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.88rem;
      font-weight: 600;
    }

    .btn-cancel:hover {
      background: #f3f4f6;
      color: #000000;
    }

    .btn-save-quiz {
      background: #000000;
      border: none;
      color: #ffffff;
      font-weight: 700;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.88rem;
      text-decoration: none;
      transition: background 0.2s ease;
    }

    .btn-save-quiz:hover {
      background: #c5a880;
      color: #000000;
    }

    /* LOOK MODAL STYLES */
    .look-desc-callout {
      background: #fdfbf7;
      border: 1px solid rgba(197, 168, 128, 0.3);
      border-left: 3px solid #c5a880;
      padding: 0.75rem 1rem;
      font-size: 0.88rem;
      color: #78350f;
      margin: 0;
    }

    .look-items-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .look-item-box {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 6px;
      padding: 0.85rem;
    }

    .look-item-box img {
      width: 75px;
      height: 90px;
      object-fit: cover;
      border-radius: 4px;
    }

    .item-info {
      flex-grow: 1;
    }

    .item-tag {
      font-size: 0.65rem;
      font-weight: 700;
      color: #78350f;
      display: block;
      margin-bottom: 0.2rem;
    }

    .item-cat-txt {
      font-size: 0.75rem;
      color: #6b7280;
      display: block;
      margin-bottom: 0.3rem;
    }

    .item-motivo {
      font-size: 0.78rem;
      color: #374151;
      font-style: italic;
      margin: 0;
    }

    .item-price-col {
      font-size: 1.15rem;
      font-weight: 800;
      color: #000000;
      white-space: nowrap;
    }

    .look-total-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      padding-top: 1rem;
    }

    .look-total-label {
      font-size: 0.8rem;
      color: #6b7280;
      display: block;
    }

    .look-total-amount {
      font-size: 1.5rem;
      color: #000000;
      font-weight: 800;
    }

    .saving-badge {
      background: #dcfce7;
      border: 1px solid #86efac;
      color: #15803d;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.4rem 0.85rem;
      border-radius: 50px;
    }

    /* LOADING & EMPTY */
    .loading-state,
    .empty-state {
      text-align: center;
      padding: 4rem 1rem;
      color: #6b7280;
    }

    .spinner {
      display: inline-block;
      width: 36px;
      height: 36px;
      border: 3px solid rgba(0, 0, 0, 0.1);
      border-top-color: #000000;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class IaAsistentePageComponent implements OnInit {
  private readonly iaService = inject(IaAsistenteService);
  readonly authService = inject(AuthService);

  dashboard = signal<DashboardRecomendaciones | null>(null);
  cargando = signal<boolean>(true);
  ocasionSeleccionada = signal<string>('TODAS');

  // Modal Quiz de Estilo
  mostrarModalQuiz = signal<boolean>(false);
  guardandoQuiz = signal<boolean>(false);
  quizForm: PreferenciaEstiloCreate = {
    sector_preferido: 'MUJER',
    ocasion_frecuente: 'GALA',
    estilos_preferidos: ['Elegante', 'Sartorial'],
    colores_favoritos: ['Negro Noir', 'Dorado Oro'],
    presupuesto_max: 900
  };

  // Modal Outfit Individual
  outfitModalPrenda = signal<RecomendacionPrenda | null>(null);
  outfitModalData = signal<OutfitSugerido | null>(null);
  cargandoOutfit = signal<boolean>(false);

  ocasionesDisponibles = [
    { id: 'TODAS', label: 'Todas las Ocasiones' },
    { id: 'GALA', label: 'Gala & Noche' },
    { id: 'FORMAL_OFICINA', label: 'Formal & Oficina' },
    { id: 'COCTEL', label: 'Cóctel & Fiestas' },
    { id: 'CASUAL', label: 'Casual de Lujo' },
    { id: 'URBANO', label: 'Urbano Vanguardia' }
  ];

  ngOnInit(): void {
    this.cargarDashboard();
  }

  cargarDashboard(ocasion?: string): void {
    this.cargando.set(true);
    const ocParam = ocasion && ocasion !== 'TODAS' ? ocasion : undefined;
    this.iaService.getRecomendaciones(ocParam).subscribe({
      next: (data) => {
        this.dashboard.set(data);
        if (data.preferencias) {
          this.quizForm = {
            sector_preferido: data.preferencias.sector_preferido,
            ocasion_frecuente: data.preferencias.ocasion_frecuente,
            estilos_preferidos: [...data.preferencias.estilos_preferidos],
            colores_favoritos: [...data.preferencias.colores_favoritos],
            presupuesto_max: data.preferencias.presupuesto_max
          };
        }
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar dashboard de recomendaciones:', err);
        this.cargando.set(false);
      }
    });
  }

  seleccionarOcasion(ocasionId: string): void {
    this.ocasionSeleccionada.set(ocasionId);
    this.cargarDashboard(ocasionId);
  }

  prendasMostradas(): RecomendacionPrenda[] {
    return this.dashboard()?.para_ti || [];
  }

  // Quiz Modal Handlers
  abrirModalQuiz(): void {
    this.mostrarModalQuiz.set(true);
  }

  cerrarModalQuiz(): void {
    this.mostrarModalQuiz.set(false);
  }

  toggleEstilo(estilo: string): void {
    const idx = this.quizForm.estilos_preferidos.indexOf(estilo);
    if (idx >= 0) {
      this.quizForm.estilos_preferidos.splice(idx, 1);
    } else {
      this.quizForm.estilos_preferidos.push(estilo);
    }
  }

  toggleColor(color: string): void {
    const idx = this.quizForm.colores_favoritos.indexOf(color);
    if (idx >= 0) {
      this.quizForm.colores_favoritos.splice(idx, 1);
    } else {
      this.quizForm.colores_favoritos.push(color);
    }
  }

  guardarQuiz(): void {
    this.guardandoQuiz.set(true);
    this.iaService.guardarPerfilEstilo(this.quizForm).subscribe({
      next: () => {
        this.guardandoQuiz.set(false);
        this.cerrarModalQuiz();
        this.cargarDashboard(this.ocasionSeleccionada());
      },
      error: (err) => {
        console.error('Error al guardar perfil de estilo:', err);
        this.guardandoQuiz.set(false);
      }
    });
  }

  // Outfit Modal Handlers
  verCombinacionesLook(prenda: RecomendacionPrenda): void {
    this.outfitModalPrenda.set(prenda);
    this.cargandoOutfit.set(true);
    this.iaService.getOutfitSugerido(prenda.id).subscribe({
      next: (outfit) => {
        this.outfitModalData.set(outfit);
        this.cargandoOutfit.set(false);
      },
      error: (err) => {
        console.error('Error al cargar outfit coordinado:', err);
        this.cargandoOutfit.set(false);
      }
    });
  }

  cerrarModalOutfit(): void {
    this.outfitModalPrenda.set(null);
    this.outfitModalData.set(null);
  }

  registrarInteraccion(prendaId: number, tipo: string): void {
    this.iaService.registrarInteraccion(prendaId, tipo, 1.0, 'CLICK_CATALOGO').subscribe();
  }
}

