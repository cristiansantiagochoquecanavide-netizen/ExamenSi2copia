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
    <div class="atelier-container">
      <!-- 1. HERO & BANNER EDITORIAL -->
      <section class="atelier-hero">
        <div class="hero-backdrop"></div>
        <div class="hero-content">
          <div class="hero-badge">
            <span class="ai-sparkle">✦</span>
            <span>ATELIER STYLIST • MOTOR DE RECOMENDACIONES IA</span>
          </div>

          <h1 class="hero-title">Tu Estilista Personal de Alta Costura</h1>

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
            <button type="button" class="btn-quiz-cta" (click)="abrirModalQuiz()">
              <span class="btn-icon">⚡</span>
              <span>{{ dashboard()?.perfil_completado ? 'Refinar mi Test de Estilo' : 'Realizar Test de Estilo Personal' }}</span>
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
                      <span class="currency">USD</span>
                      <span class="amount">\${{ prenda.precio_base | number:'1.2-2' }}</span>
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
                  @for (sec of ['MUJER', 'HOMBRE', 'UNISEX', 'NINOS']; track sec) {
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
                <label class="group-label">5. Rango de Presupuesto Estimado por Prenda (USD)</label>
                <div class="budget-input-wrap">
                  <span class="budget-symbol">$</span>
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
                        <span class="item-val">\${{ item.precio_base | number:'1.2-2' }}</span>
                      </div>
                    </div>
                  }
                </div>

                <div class="look-total-bar">
                  <div>
                    <span class="look-total-label">Total Conjunto Completo:</span>
                    <strong class="look-total-amount">\${{ outfitModalData()!.precio_total | number:'1.2-2' }} USD</strong>
                  </div>
                  @if (outfitModalData()!.ahorro_estimado > 0) {
                    <span class="saving-badge">Ahorro por Look: -\${{ outfitModalData()!.ahorro_estimado | number:'1.2-2' }}</span>
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
      background-color: #0d0d0d;
      color: #f5f5f5;
      min-height: 100vh;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .atelier-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem 1.5rem 5rem;
    }

    /* 1. HERO BANNER */
    .atelier-hero {
      position: relative;
      background: linear-gradient(135deg, #141414 0%, #1f1b16 100%);
      border: 1px solid rgba(197, 168, 128, 0.3);
      padding: 3rem 2.5rem;
      border-radius: 8px;
      margin-bottom: 2.5rem;
      overflow: hidden;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.9rem;
      background: rgba(197, 168, 128, 0.15);
      border: 1px solid #c5a880;
      color: #dfcaa7;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      border-radius: 50px;
      margin-bottom: 1.25rem;
    }

    .ai-sparkle {
      color: #c5a880;
      font-size: 0.9rem;
    }

    .hero-title {
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0 0 1rem;
      color: #ffffff;
      font-family: 'Cinzel', 'Playfair Display', Georgia, serif;
    }

    .hero-description {
      font-size: 1.05rem;
      line-height: 1.6;
      color: #cccccc;
      max-width: 850px;
      margin-bottom: 2rem;
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1.25rem;
    }

    .btn-quiz-cta {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      background: #c5a880;
      color: #111111;
      font-weight: 700;
      font-size: 0.9rem;
      padding: 0.85rem 1.6rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .btn-quiz-cta:hover {
      background: #dfcaa7;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(197, 168, 128, 0.35);
    }

    .profile-summary-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .summary-pill {
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #dfcaa7;
      padding: 0.4rem 0.85rem;
      border-radius: 50px;
      font-size: 0.8rem;
    }

    /* 2. OCCASIONS BAR */
    .occasions-bar {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 3rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .bar-label {
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #888888;
      white-space: nowrap;
    }

    .pills-scroll {
      display: flex;
      gap: 0.6rem;
      overflow-x: auto;
      padding-bottom: 0.25rem;
    }

    .occasion-pill {
      background: #1a1a1a;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #bbbbbb;
      padding: 0.5rem 1.1rem;
      border-radius: 50px;
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
    }

    .occasion-pill:hover {
      border-color: #c5a880;
      color: #ffffff;
    }

    .occasion-pill.active {
      background: #c5a880;
      border-color: #c5a880;
      color: #111111;
      font-weight: 700;
    }

    /* 3. SECTION HEADERS */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 1.75rem;
      border-bottom: 1px solid rgba(197, 168, 128, 0.2);
      padding-bottom: 0.75rem;
    }

    .section-tag {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #c5a880;
      text-transform: uppercase;
    }

    .section-title {
      font-size: 1.6rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0.25rem 0 0;
      font-family: 'Cinzel', 'Playfair Display', Georgia, serif;
    }

    .coordination-badge {
      font-size: 0.78rem;
      color: #7dd3fc;
      background: rgba(125, 211, 252, 0.1);
      border: 1px solid rgba(125, 211, 252, 0.3);
      padding: 0.3rem 0.75rem;
      border-radius: 4px;
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
      background: #141414;
      border: 1px solid rgba(197, 168, 128, 0.35);
      border-radius: 8px;
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .outfit-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 1rem;
    }

    .outfit-match {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      color: #dfcaa7;
      background: rgba(197, 168, 128, 0.15);
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      margin-bottom: 0.5rem;
    }

    .outfit-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 0.3rem;
    }

    .outfit-desc {
      font-size: 0.88rem;
      color: #aaaaaa;
      margin: 0;
      line-height: 1.5;
    }

    .outfit-pricing {
      text-align: right;
      min-width: 140px;
    }

    .price-label {
      font-size: 0.72rem;
      color: #888888;
      display: block;
      text-transform: uppercase;
    }

    .price-val {
      font-size: 1.4rem;
      font-weight: 800;
      color: #ffffff;
      display: block;
    }

    .saving-tag {
      font-size: 0.72rem;
      color: #4ade80;
      background: rgba(74, 222, 128, 0.12);
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
      background: #1c1c1c;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      overflow: hidden;
    }

    .item-img-wrapper {
      position: relative;
      height: 190px;
      overflow: hidden;
    }

    .item-img-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .item-img-wrapper:hover img {
      transform: scale(1.05);
    }

    .item-role-tag {
      position: absolute;
      bottom: 8px;
      left: 8px;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      color: #dfcaa7;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.2rem 0.55rem;
      border-radius: 3px;
      border: 1px solid rgba(197, 168, 128, 0.3);
    }

    .item-meta {
      padding: 0.85rem;
    }

    .item-cat {
      font-size: 0.7rem;
      text-transform: uppercase;
      color: #888888;
      display: block;
      margin-bottom: 0.25rem;
    }

    .item-name {
      font-size: 0.92rem;
      color: #ffffff;
      display: block;
      margin-bottom: 0.4rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-price {
      font-size: 0.95rem;
      font-weight: 700;
      color: #dfcaa7;
    }

    /* 4. RECOMMENDATIONS GRID */
    .recommendations-section {
      margin-bottom: 5rem;
    }

    .section-subtitle {
      font-size: 0.9rem;
      color: #999999;
      margin: 0.3rem 0 0;
    }

    .recommendations-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 2rem;
    }

    .recom-card {
      background: #141414;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: all 0.25s ease;
      position: relative;
    }

    .recom-card:hover {
      border-color: #c5a880;
      transform: translateY(-4px);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
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
      background: #c5a880;
      color: #111111;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.25rem 0.65rem;
      border-radius: 50px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }

    .ia-tag {
      background: rgba(0, 0, 0, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #ffffff;
      font-size: 0.68rem;
      font-weight: 600;
      padding: 0.25rem 0.55rem;
      border-radius: 4px;
      backdrop-filter: blur(4px);
    }

    .card-img-container {
      height: 340px;
      overflow: hidden;
      background: #1a1a1a;
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
      background: rgba(197, 168, 128, 0.12);
      border: 1px solid #c5a880;
      color: #dfcaa7;
    }

    .pill-sector {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #cccccc;
    }

    /* Regla 4: Nombre comercial en negrita */
    .product-title {
      font-size: 1.15rem;
      font-weight: 800; /* Obligatoriamente negrita */
      color: #ffffff;
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
      color: #ffffff;
    }

    .review-count {
      color: #888888;
    }

    /* Rationale Box */
    .ai-rationale-box {
      background: rgba(197, 168, 128, 0.08);
      border-left: 3px solid #c5a880;
      padding: 0.65rem 0.85rem;
      border-radius: 0 4px 4px 0;
      margin-bottom: 1.25rem;
      display: flex;
      gap: 0.4rem;
    }

    .quote-icon {
      color: #c5a880;
      font-size: 1.2rem;
      line-height: 1;
      font-family: Georgia, serif;
    }

    .rationale-text {
      font-size: 0.82rem;
      color: #d1d5db;
      font-style: italic;
      margin: 0;
      line-height: 1.45;
    }

    .card-footer {
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 1rem;
    }

    .price-wrap {
      display: flex;
      flex-direction: column;
    }

    .currency {
      font-size: 0.68rem;
      color: #888888;
    }

    .amount {
      font-size: 1.25rem;
      font-weight: 800;
      color: #ffffff;
    }

    .actions-wrap {
      display: flex;
      gap: 0.5rem;
    }

    .btn-look-modal {
      background: transparent;
      border: 1px solid #c5a880;
      color: #dfcaa7;
      font-size: 0.78rem;
      font-weight: 600;
      padding: 0.5rem 0.85rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-look-modal:hover {
      background: rgba(197, 168, 128, 0.15);
      color: #ffffff;
    }

    .btn-view-product {
      background: #ffffff;
      color: #111111;
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
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(6px);
      z-index: 1000;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 1.5rem;
    }

    .quiz-modal,
    .look-modal {
      background: #161616;
      border: 1px solid #c5a880;
      border-radius: 8px;
      width: 100%;
      max-width: 680px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.5rem;
      border-bottom: 1px solid rgba(197, 168, 128, 0.25);
    }

    .modal-pre-tag {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #c5a880;
    }

    .modal-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0.25rem 0 0;
    }

    .btn-close-modal {
      background: transparent;
      border: none;
      color: #888888;
      font-size: 1.3rem;
      cursor: pointer;
      line-height: 1;
    }

    .btn-close-modal:hover {
      color: #ffffff;
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
      color: #aaaaaa;
      margin: 0;
      line-height: 1.5;
    }

    .group-label {
      display: block;
      font-size: 0.88rem;
      font-weight: 600;
      color: #dfcaa7;
      margin-bottom: 0.6rem;
    }

    .options-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .quiz-pill {
      background: #202020;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #cccccc;
      font-size: 0.82rem;
      padding: 0.45rem 1rem;
      border-radius: 50px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .quiz-pill:hover {
      border-color: #c5a880;
      color: #ffffff;
    }

    .quiz-pill.selected {
      background: #c5a880;
      border-color: #c5a880;
      color: #111111;
      font-weight: 700;
    }

    .budget-input-wrap {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .budget-symbol {
      font-size: 1.2rem;
      color: #c5a880;
      font-weight: 700;
    }

    .budget-field {
      background: #202020;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      padding: 0.65rem 1rem;
      border-radius: 4px;
      font-size: 1rem;
      width: 160px;
    }

    .budget-hint {
      font-size: 0.8rem;
      color: #888888;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      background: #121212;
    }

    .btn-cancel {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #bbbbbb;
      padding: 0.75rem 1.25rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.88rem;
    }

    .btn-save-quiz {
      background: #c5a880;
      border: none;
      color: #111111;
      font-weight: 700;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.88rem;
      text-decoration: none;
    }

    .btn-save-quiz:hover {
      background: #dfcaa7;
    }

    /* LOOK MODAL STYLES */
    .look-desc-callout {
      background: rgba(197, 168, 128, 0.1);
      border-left: 3px solid #c5a880;
      padding: 0.75rem 1rem;
      font-size: 0.88rem;
      color: #dfcaa7;
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
      background: #1f1f1f;
      border: 1px solid rgba(255, 255, 255, 0.08);
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
      color: #c5a880;
      display: block;
      margin-bottom: 0.2rem;
    }

    .item-cat-txt {
      font-size: 0.75rem;
      color: #888888;
      display: block;
      margin-bottom: 0.3rem;
    }

    .item-motivo {
      font-size: 0.78rem;
      color: #cccccc;
      font-style: italic;
      margin: 0;
    }

    .item-price-col {
      font-size: 1.15rem;
      font-weight: 700;
      color: #dfcaa7;
      white-space: nowrap;
    }

    .look-total-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 1rem;
    }

    .look-total-label {
      font-size: 0.8rem;
      color: #888888;
      display: block;
    }

    .look-total-amount {
      font-size: 1.5rem;
      color: #ffffff;
    }

    .saving-badge {
      background: rgba(74, 222, 128, 0.15);
      border: 1px solid #4ade80;
      color: #4ade80;
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
      color: #888888;
    }

    .spinner {
      display: inline-block;
      width: 36px;
      height: 36px;
      border: 3px solid rgba(197, 168, 128, 0.2);
      border-top-color: #c5a880;
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

