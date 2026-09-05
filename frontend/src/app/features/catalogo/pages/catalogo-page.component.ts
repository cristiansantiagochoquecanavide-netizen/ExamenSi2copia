import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogoService } from '../services/catalogo.service';
import { Prenda, PrendaMultimedia } from '../models/catalogo.models';

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
            <span>TEMPORADA SS-2026 &bull; COLECCIÓN PERMANENTE</span>
          </div>
          <h1 class="hero-title">Atelier Noir</h1>
          <p class="hero-description">
            Sastrería contemporánea, siluetas desestructuradas y tecnología de Realidad Aumentada (AR) para probadores virtuales.
          </p>
        </div>

        <!-- Filter & Search Bar -->
        <div class="filter-bar">
          <div class="filter-chips">
            <button 
              type="button" 
              class="chip" 
              [class.active]="selectedSector() === 'ALL'"
              (click)="selectedSector.set('ALL')"
            >
              TODAS LAS PRENDAS
            </button>
            <button 
              type="button" 
              class="chip" 
              [class.active]="selectedSector() === 'TRENCH'"
              (click)="selectedSector.set('TRENCH')"
            >
              ABRIGOS &amp; TRENCH
            </button>
            <button 
              type="button" 
              class="chip" 
              [class.active]="selectedSector() === 'PANT'"
              (click)="selectedSector.set('PANT')"
            >
              PANTALONES &amp; SASTRERÍA
            </button>
          </div>

          <div class="search-box">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Buscar prenda o SKU..."
              class="search-input"
            />
            <span class="search-badge">{{ filteredPrendas().length }} PRENDAS</span>
          </div>
        </div>
      </section>

      <!-- Status Bar -->
      <div class="status-strip">
        <div class="status-left">
          <span class="status-pulse"></span>
          <span class="status-label">FASTAPI POSTGRESQL &bull; CU6 CATÁLOGO CON AR &bull; ONLINE</span>
        </div>
        <button type="button" class="btn-refresh" (click)="loadPrendas()" [disabled]="isLoading()">
          &#x21bb; Actualizar
        </button>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="loading-grid">
          @for (i of [1, 2]; track i) {
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

      <!-- Modal de Detalle y Modelos 3D (AR) -->
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
                  <p class="ar-note">Modelos 3D generados para visualización inmersiva en navegadores y probador virtual móvil:</p>
                  
                  <div class="ar-models-list">
                    @for (media of get3DModels(prenda); track media.id) {
                      <div class="ar-model-item">
                        <div class="ar-model-meta">
                          <span class="ar-badge-pill">{{ media.formato.toUpperCase() }}</span>
                          <span class="ar-model-type">{{ media.tipo === 'MODELO_3D_GLB' ? 'Web / Android (SceneViewer)' : 'iOS (Quick Look)' }}</span>
                        </div>
                        <a [href]="media.url" target="_blank" rel="noopener noreferrer" class="ar-link">
                          Descargar / Inspeccionar &rarr;
                        </a>
                      </div>
                    }
                  </div>
                </div>

                <!-- Variantes de Talla y Color -->
                <div class="variants-section">
                  <h4 class="section-subtitle">VARIANTES DISPONIBLES EN STOCK (CU6):</h4>
                  <div class="variants-table-mini">
                    @for (v of prenda.variantes; track v.id) {
                      <div class="variant-pill">
                        <span class="v-talla">Talla: {{ v.talla?.codigo || 'N/A' }}</span>
                        <span class="v-color" [style.color]="v.color?.codigo_hex || '#fff'">
                          &bull; {{ v.color?.nombre || 'Color' }}
                        </span>
                      </div>
                    }
                  </div>
                </div>

                <div class="modal-actions">
                  <button type="button" class="btn-reserve-lead" (click)="closeDetail()">
                    CONFIRMAR SELECCIÓN
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .catalogo-container {
      max-width: 1400px;
      margin: 0 auto;
      padding-bottom: 4rem;
    }

    /* Editorial Hero */
    .editorial-hero {
      padding: 2rem 0 3rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      margin-bottom: 2rem;
    }

    .editorial-eyebrow {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      letter-spacing: 0.25em;
      color: var(--color-gold);
      font-weight: 500;
      margin-bottom: 0.75rem;
    }

    .gold-dot {
      color: var(--color-gold);
      font-size: 1.2rem;
      line-height: 0;
    }

    .hero-title {
      font-family: var(--font-serif);
      font-size: 3.5rem;
      font-weight: 400;
      letter-spacing: 0.02em;
      color: var(--color-primary);
      text-transform: uppercase;
      margin-bottom: 1rem;
    }

    .hero-description {
      font-size: 1.05rem;
      color: var(--color-on-surface-muted);
      max-width: 700px;
      line-height: 1.6;
    }

    /* Filters Bar */
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 2.5rem;
      flex-wrap: wrap;
      gap: 1.5rem;
    }

    .filter-chips {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .chip {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: var(--color-on-surface-muted);
      padding: 0.6rem 1.2rem;
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .chip:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .chip.active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: #000000;
      font-weight: 600;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .search-input {
      background: #0e0e0e;
      border: 1px solid rgba(255, 255, 255, 0.18);
      color: #ffffff;
      padding: 0.6rem 1.2rem;
      font-size: 0.85rem;
      min-width: 260px;
      transition: border-color 0.2s ease;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--color-gold);
    }

    .search-badge {
      font-size: 0.7rem;
      letter-spacing: 0.15em;
      color: var(--color-gold);
      border: 1px solid rgba(212, 175, 55, 0.4);
      padding: 0.55rem 0.8rem;
      white-space: nowrap;
    }

    /* Status Strip */
    .status-strip {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0d0d0d;
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 0.6rem 1.2rem;
      margin-bottom: 2.5rem;
    }

    .status-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .status-pulse {
      width: 8px;
      height: 8px;
      border-radius: 50% !important;
      background-color: #10b981;
      box-shadow: 0 0 8px #10b981;
    }

    .status-label {
      font-size: 0.7rem;
      letter-spacing: 0.15em;
      color: #aaaaaa;
      font-family: monospace;
    }

    .btn-refresh {
      background: transparent;
      border: none;
      color: var(--color-gold);
      font-size: 0.75rem;
      letter-spacing: 0.1em;
      cursor: pointer;
      text-transform: uppercase;
      transition: color 0.2s ease;
    }

    .btn-refresh:hover {
      color: #ffffff;
    }

    /* Products Grid */
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 2.5rem;
    }

    .product-card {
      background: #111111;
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
      position: relative;
    }

    .product-card:hover {
      border-color: var(--color-gold);
      transform: translateY(-4px);
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.9);
    }

    .image-wrapper {
      position: relative;
      height: 440px;
      background: #050505;
      overflow: hidden;
      cursor: pointer;
    }

    .product-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
      transition: transform 0.5s ease;
    }

    .product-card:hover .product-image {
      transform: scale(1.04);
    }

    .badge-overlay {
      position: absolute;
      top: 1rem;
      left: 1rem;
      right: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      pointer-events: none;
    }

    .category-tag {
      background: rgba(0, 0, 0, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      font-size: 0.65rem;
      letter-spacing: 0.15em;
      padding: 4px 10px;
      text-transform: uppercase;
    }

    .ar-badge {
      background: rgba(19, 19, 19, 0.9);
      border: 1px solid var(--color-gold);
      color: var(--color-gold);
      font-size: 0.65rem;
      font-weight: 600;
      letter-spacing: 0.15em;
      padding: 4px 10px;
      display: flex;
      align-items: center;
      gap: 4px;
      box-shadow: 0 0 10px rgba(212, 175, 55, 0.2);
    }

    .ar-icon {
      color: var(--color-gold);
    }

    .hover-action-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .product-card:hover .hover-action-overlay {
      opacity: 1;
    }

    .hover-btn {
      background: #ffffff;
      color: #000000;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.2em;
      padding: 0.8rem 1.5rem;
      border: none;
      text-transform: uppercase;
    }

    .product-info {
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      color: var(--color-on-surface-muted);
      margin-bottom: 0.5rem;
    }

    .sku-tag {
      font-family: monospace;
      color: var(--color-gold);
    }

    .product-title {
      font-family: var(--font-serif);
      font-size: 1.6rem;
      font-weight: 400;
      color: #ffffff;
      margin-bottom: 0.75rem;
      cursor: pointer;
      line-height: 1.25;
      transition: color 0.2s ease;
    }

    .product-title:hover {
      color: var(--color-gold);
    }

    .product-desc {
      font-size: 0.85rem;
      color: #888888;
      line-height: 1.5;
      margin-bottom: 1.25rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .variants-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .variants-label {
      font-size: 0.65rem;
      letter-spacing: 0.15em;
      color: var(--color-on-surface-muted);
    }

    .size-chips {
      display: flex;
      gap: 0.35rem;
    }

    .size-chip {
      font-size: 0.65rem;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #cccccc;
      padding: 2px 7px;
      font-family: monospace;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
      padding-top: 1.25rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .price-container {
      display: flex;
      align-items: baseline;
      gap: 2px;
    }

    .currency {
      font-size: 1rem;
      color: var(--color-gold);
      font-weight: 500;
    }

    .price-value {
      font-size: 1.4rem;
      font-weight: 600;
      color: #ffffff;
      letter-spacing: -0.02em;
    }

    .btn-card-action {
      background: transparent;
      border: 1px solid var(--color-gold);
      color: var(--color-gold);
      padding: 0.65rem 1.1rem;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-card-action:hover {
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
      max-width: 900px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95);
      position: relative;
    }

    .modal-header {
      padding: 1.75rem 2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .modal-eyebrow {
      font-size: 0.7rem;
      letter-spacing: 0.2em;
      color: var(--color-gold);
      display: block;
      margin-bottom: 0.25rem;
    }

    .modal-title {
      font-family: var(--font-serif);
      font-size: 2rem;
      color: #ffffff;
    }

    .modal-close {
      background: transparent;
      border: none;
      color: #888888;
      font-size: 2rem;
      cursor: pointer;
      line-height: 1;
      transition: color 0.2s ease;
    }

    .modal-close:hover {
      color: #ffffff;
    }

    .modal-body {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 2rem;
      padding: 2rem;
    }

    @media (max-width: 768px) {
      .modal-body {
        grid-template-columns: 1fr;
      }
    }

    .modal-main-img {
      width: 100%;
      height: 420px;
      object-fit: cover;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .modal-info-column {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .modal-desc {
      font-size: 0.9rem;
      color: #cccccc;
      line-height: 1.6;
    }

    .modal-price-box {
      background: #181818;
      padding: 1rem;
      border-left: 3px solid var(--color-gold);
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .modal-price-label {
      font-size: 0.75rem;
      letter-spacing: 0.15em;
      color: var(--color-on-surface-muted);
    }

    .modal-price-value {
      font-size: 1.6rem;
      font-weight: 700;
      color: #ffffff;
    }

    .ar-section {
      background: #141414;
      border: 1px solid rgba(212, 175, 55, 0.3);
      padding: 1.25rem;
    }

    .ar-section-title {
      font-size: 0.75rem;
      letter-spacing: 0.15em;
      color: var(--color-gold);
      margin-bottom: 0.5rem;
    }

    .ar-note {
      font-size: 0.8rem;
      color: #888888;
      margin-bottom: 1rem;
    }

    .ar-models-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .ar-model-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0b0b0b;
      padding: 0.6rem 0.8rem;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .ar-model-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .ar-badge-pill {
      font-size: 0.65rem;
      background: var(--color-gold);
      color: #000000;
      font-weight: 700;
      padding: 2px 6px;
    }

    .ar-model-type {
      font-size: 0.75rem;
      color: #cccccc;
    }

    .ar-link {
      color: var(--color-gold);
      font-size: 0.75rem;
      text-decoration: none;
      letter-spacing: 0.05em;
    }

    .ar-link:hover {
      text-decoration: underline;
      color: #ffffff;
    }

    .variants-section {
      padding-top: 0.5rem;
    }

    .section-subtitle {
      font-size: 0.7rem;
      letter-spacing: 0.15em;
      color: #888888;
      margin-bottom: 0.5rem;
    }

    .variants-table-mini {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .variant-pill {
      background: #1c1c1c;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 4px 10px;
      font-size: 0.75rem;
      display: flex;
      gap: 6px;
    }

    .v-talla {
      color: #ffffff;
      font-weight: 600;
    }

    .btn-reserve-lead {
      width: 100%;
      background: #ffffff;
      color: #000000;
      border: none;
      padding: 1rem;
      font-weight: 600;
      letter-spacing: 0.2em;
      font-size: 0.8rem;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: 0.5rem;
    }

    .btn-reserve-lead:hover {
      background: var(--color-gold);
      color: #000000;
    }

    /* Skeleton Loading */
    .loading-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 2.5rem;
    }

    .skeleton-card {
      background: #111111;
      height: 520px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      animation: pulse 1.5s infinite;
    }

    .skeleton-img {
      height: 380px;
      background: #1a1a1a;
    }

    .skeleton-line {
      background: #1a1a1a;
      height: 16px;
    }

    .skeleton-line.title {
      width: 70%;
    }

    .skeleton-line.price {
      width: 40%;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }

    /* Error & Empty States */
    .alert-box {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid #ef4444;
      padding: 2rem;
      text-align: center;
      margin: 2rem 0;
    }

    .alert-title {
      color: #f87171;
      font-weight: 600;
      letter-spacing: 0.15em;
      display: block;
      margin-bottom: 0.5rem;
    }

    .alert-desc {
      color: #e5e5e5;
      font-size: 0.9rem;
      margin-bottom: 1.5rem;
    }

    .btn-retry {
      background: transparent;
      border: 1px solid #ef4444;
      color: #f87171;
      padding: 0.6rem 1.5rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      font-size: 0.75rem;
      cursor: pointer;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      border: 1px dashed rgba(255, 255, 255, 0.15);
    }

    .empty-title {
      font-family: var(--font-serif);
      font-size: 1.8rem;
      margin-bottom: 0.5rem;
    }

    .empty-text {
      color: var(--color-on-surface-muted);
    }
  `]
})
export class CatalogoPageComponent implements OnInit {
  private readonly catalogoService = inject(CatalogoService);

  readonly prendas = signal<Prenda[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  searchQuery = '';
  readonly selectedSector = signal<'ALL' | 'TRENCH' | 'PANT'>('ALL');
  readonly selectedPrenda = signal<Prenda | null>(null);

  readonly filteredPrendas = computed(() => {
    let list = this.prendas();
    const sector = this.selectedSector();
    const query = this.searchQuery.trim().toLowerCase();

    if (sector === 'TRENCH') {
      list = list.filter(p => p.sku.includes('TRN') || (p.categoria?.nombre.toLowerCase().includes('abrigos') ?? false));
    } else if (sector === 'PANT') {
      list = list.filter(p => p.sku.includes('PNT') || (p.categoria?.nombre.toLowerCase().includes('pantalones') ?? false));
    }

    if (query) {
      list = list.filter(p =>
        p.nombre.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.descripcion.toLowerCase().includes(query)
      );
    }

    return list;
  });

  ngOnInit(): void {
    this.loadPrendas();
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
}
