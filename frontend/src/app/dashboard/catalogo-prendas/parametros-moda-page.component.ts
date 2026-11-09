import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CatalogoService } from './catalogo.service';
import {
  Categoria, CategoriaCreate,
  Talla, TallaCreate,
  Color, ColorCreate,
  Temporada, TemporadaCreate
} from './catalogo.models';

type TabType = 'CATEGORIAS' | 'TALLAS' | 'COLORES' | 'TEMPORADAS';

@Component({
  selector: 'app-parametros-moda-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="param-container">
      <!-- Editorial Header -->
      <div class="param-hero">
        <div class="eyebrow">
          <span class="gold-dot">&bull;</span>
          <span>SISTEMA DE TAXONOMÍA</span>
        </div>
        <h1 class="hero-title">Parámetros de Moda</h1>
        <p class="hero-desc">
          Definición y control de la taxonomía del guardarropa: Categorías por sector, Tallas normalizadas, Carta cromática Atelier Noir y Temporadas comerciales.
        </p>

        <!-- Navigation Tabs -->
        <div class="tabs-container">
          <div class="tabs-group">
            <button 
              type="button"
              class="tab-btn" 
              [class.active]="activeTab() === 'CATEGORIAS'"
              (click)="activeTab.set('CATEGORIAS')"
            >
              CATEGORÍAS ({{ categoriasFiltradas().length }})
            </button>
            <button 
              type="button"
              class="tab-btn" 
              [class.active]="activeTab() === 'TALLAS'"
              (click)="activeTab.set('TALLAS')"
            >
              TALLAS ({{ tallas().length }})
            </button>
            <button 
              type="button"
              class="tab-btn" 
              [class.active]="activeTab() === 'COLORES'"
              (click)="activeTab.set('COLORES')"
            >
              PALETA CROMÁTICA ({{ colores().length }})
            </button>
            <button 
              type="button"
              class="tab-btn" 
              [class.active]="activeTab() === 'TEMPORADAS'"
              (click)="activeTab.set('TEMPORADAS')"
            >
              TEMPORADAS ({{ temporadas().length }})
            </button>
          </div>

          <div class="tab-action">
            @if (activeTab() === 'CATEGORIAS') {
              <button type="button" class="btn-gold" (click)="openCategoriaModal()">+ NUEVA CATEGORÍA</button>
            } @else if (activeTab() === 'TALLAS') {
              <button type="button" class="btn-gold" (click)="openTallaModal()">+ NUEVA TALLA</button>
            } @else if (activeTab() === 'COLORES') {
              <button type="button" class="btn-gold" (click)="openColorModal()">+ NUEVO COLOR</button>
            } @else {
              <button type="button" class="btn-gold" (click)="openTemporadaModal()">+ NUEVA TEMPORADA</button>
            }
          </div>
        </div>
      </div>

      <!-- Notification Banner -->
      @if (feedbackMsg()) {
        <div class="feedback-banner" [class.error]="feedbackIsError()">
          <span>{{ feedbackMsg() }}</span>
          <button type="button" class="btn-close-banner" (click)="feedbackMsg.set(null)">&times;</button>
        </div>
      }

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="loading-state">
          <span class="spinner"></span>
          <span>SINCRONIZANDO CON FASTAPI...</span>
        </div>
      }

      <!-- Content Area -->
      <div class="tab-content-area">
        
        <!-- ================= 1. CATEGORÍAS ================= -->
        @if (activeTab() === 'CATEGORIAS') {
          <div class="card-panel">
            <div class="panel-header">
              <h2 class="panel-title">Categorías de Colección</h2>
              <span class="panel-hint">Clasificación de siluetas y prendas por sector comercial</span>
            </div>

            <div class="table-wrap">
              <table class="noir-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>NOMBRE</th>
                    <th>SECTOR</th>
                    <th>DESCRIPCIÓN</th>
                    <th>ESTADO</th>
                    <th class="text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  @for (cat of categoriasFiltradas(); track cat.id) {
                    <tr>
                      <td class="col-id">#{{ cat.id }}</td>
                      <td class="col-strong">{{ cat.nombre }}</td>
                      <td>
                        <span class="sector-badge" [attr.data-sector]="cat.sector">
                          {{ cat.sector }}
                        </span>
                      </td>
                      <td class="col-muted">{{ cat.descripcion || 'Sin descripción' }}</td>
                      <td>
                        <span class="status-dot" [class.active]="cat.activo"></span>
                        <span class="status-text">{{ cat.activo ? 'ACTIVO' : 'INACTIVO' }}</span>
                      </td>
                      <td class="text-right">
                        <button 
                          type="button" 
                          class="btn-action-ghost"
                          (click)="toggleCategoriaActivo(cat)"
                        >
                          {{ cat.activo ? 'Desactivar' : 'Activar' }}
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="empty-msg">No se han encontrado categorías registradas.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- ================= 2. TALLAS ================= -->
        @if (activeTab() === 'TALLAS') {
          <div class="card-panel">
            <div class="panel-header">
              <h2 class="panel-title">Escala de Tallas</h2>
              <span class="panel-hint">Normativa de tallaje y ordenamiento en probadores y catálogo</span>
            </div>

            <div class="table-wrap">
              <table class="noir-table">
                <thead>
                  <tr>
                    <th>ORDEN</th>
                    <th>CÓDIGO TALLA</th>
                    <th>DESCRIPCIÓN</th>
                    <th>ESTADO</th>
                    <th class="text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  @for (talla of tallas(); track talla.id) {
                    <tr>
                      <td class="col-id">#{{ talla.orden }}</td>
                      <td>
                        <span class="talla-badge">{{ talla.codigo }}</span>
                      </td>
                      <td class="col-muted">{{ talla.descripcion || 'Estándar' }}</td>
                      <td>
                        <span class="status-dot" [class.active]="talla.activo"></span>
                        <span class="status-text">{{ talla.activo ? 'ACTIVO' : 'INACTIVO' }}</span>
                      </td>
                      <td class="text-right">
                        <button 
                          type="button" 
                          class="btn-action-ghost"
                          (click)="toggleTallaActivo(talla)"
                        >
                          {{ talla.activo ? 'Desactivar' : 'Activar' }}
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="empty-msg">No hay tallas configuradas en la base de datos.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- ================= 3. COLORES ================= -->
        @if (activeTab() === 'COLORES') {
          <div class="card-panel">
            <div class="panel-header">
              <h2 class="panel-title">Paleta Cromática Atelier Noir</h2>
              <span class="panel-hint">Muestras digitales, códigos HEX y RGB para renderizado 3D e interfaz</span>
            </div>

            <div class="colors-grid">
              @for (color of colores(); track color.id) {
                <div class="color-card">
                  <div class="swatch" [style.background-color]="color.codigo_hex || '#000000'"></div>
                  <div class="color-info">
                    <div class="color-name">{{ color.nombre }}</div>
                    <div class="color-codes">
                      <span class="code-hex">{{ color.codigo_hex || 'N/A' }}</span>
                      <span class="code-rgb">{{ color.codigo_rgb || '' }}</span>
                    </div>
                  </div>
                  <div class="color-footer">
                    <span class="status-dot" [class.active]="color.activo"></span>
                    <button 
                      type="button" 
                      class="btn-action-ghost"
                      (click)="toggleColorActivo(color)"
                    >
                      {{ color.activo ? 'Desactivar' : 'Activar' }}
                    </button>
                  </div>
                </div>
              } @empty {
                <div class="empty-msg">No se registran colores en la paleta.</div>
              }
            </div>
          </div>
        }

        <!-- ================= 4. TEMPORADAS ================= -->
        @if (activeTab() === 'TEMPORADAS') {
          <div class="card-panel">
            <div class="panel-header">
              <h2 class="panel-title">Temporadas Comerciales</h2>
              <span class="panel-hint">Ciclos de lanzamiento y vigencia temporal de colecciones</span>
            </div>

            <div class="table-wrap">
              <table class="noir-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>CÓDIGO</th>
                    <th>NOMBRE TEMPORADA</th>
                    <th>FECHA INICIO</th>
                    <th>FECHA FIN</th>
                    <th>ESTADO</th>
                    <th class="text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  @for (temp of temporadas(); track temp.id) {
                    <tr>
                      <td class="col-id">#{{ temp.id }}</td>
                      <td>
                        <span class="season-code">{{ temp.codigo }}</span>
                      </td>
                      <td class="col-strong">{{ temp.nombre }}</td>
                      <td class="col-muted">{{ temp.fecha_inicio || 'Indefinida' }}</td>
                      <td class="col-muted">{{ temp.fecha_fin || 'Indefinida' }}</td>
                      <td>
                        <span class="status-dot" [class.active]="temp.activo"></span>
                        <span class="status-text">{{ temp.activo ? 'VIGENTE' : 'FINALIZADA' }}</span>
                      </td>
                      <td class="text-right">
                        <button 
                          type="button" 
                          class="btn-action-ghost"
                          (click)="toggleTemporadaActivo(temp)"
                        >
                          {{ temp.activo ? 'Cerrar' : 'Reactivar' }}
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7" class="empty-msg">No hay temporadas registradas.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

      </div>

      <!-- ================= MODALES DE CREACIÓN ================= -->

      <!-- Modal Categoría -->
      @if (showCategoriaModal()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3 class="modal-title">Nueva Categoría de Moda</h3>
              <button type="button" class="btn-close" (click)="closeModals()">&times;</button>
            </div>
            <form (ngSubmit)="saveCategoria()" class="modal-body">
              <div class="form-group">
                <label>Nombre de Categoría *</label>
                <input type="text" [(ngModel)]="nuevaCategoria.nombre" name="nombre" placeholder="Ej. Blazers de Gala" required />
              </div>
              <div class="form-group">
                <label>Sector de Vestimenta *</label>
                <select [(ngModel)]="nuevaCategoria.sector" name="sector" required>
                  <option value="MUJERES">MUJERES</option>
                  @if (authService.currentTenant().empresaId !== 2) {
                    <option value="UNISEX">UNISEX</option>
                    <option value="HOMBRES">HOMBRES</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label>Descripción Editorial</label>
                <textarea [(ngModel)]="nuevaCategoria.descripcion" name="descripcion" rows="3" placeholder="Detalles de las piezas pertenecientes a esta categoría..."></textarea>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-cancel" (click)="closeModals()">Cancelar</button>
                <button type="submit" class="btn-submit" [disabled]="!nuevaCategoria.nombre">Guardar Categoría</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Talla -->
      @if (showTallaModal()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3 class="modal-title">Nueva Talla Normalizada</h3>
              <button type="button" class="btn-close" (click)="closeModals()">&times;</button>
            </div>
            <form (ngSubmit)="saveTalla()" class="modal-body">
              <div class="form-group">
                <label>Código de Talla *</label>
                <input type="text" [(ngModel)]="nuevaTalla.codigo" name="codigo" placeholder="Ej. XL, 42, ÚNICA" required />
              </div>
              <div class="form-group">
                <label>Orden Numérico de Presentación *</label>
                <input type="number" [(ngModel)]="nuevaTalla.orden" name="orden" required />
              </div>
              <div class="form-group">
                <label>Descripción / Medidas</label>
                <input type="text" [(ngModel)]="nuevaTalla.descripcion" name="descripcion" placeholder="Ej. Extra Large - Contorno Pecho 108cm" />
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-cancel" (click)="closeModals()">Cancelar</button>
                <button type="submit" class="btn-submit" [disabled]="!nuevaTalla.codigo">Guardar Talla</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Color -->
      @if (showColorModal()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3 class="modal-title">Nuevo Tono Cromático</h3>
              <button type="button" class="btn-close" (click)="closeModals()">&times;</button>
            </div>
            <form (ngSubmit)="saveColor()" class="modal-body">
              <div class="form-group">
                <label>Nombre del Color *</label>
                <input type="text" [(ngModel)]="nuevoColor.nombre" name="nombre" placeholder="Ej. Nero Ossidiana" required />
              </div>
              <div class="form-group">
                <label>Código Hexadecimal *</label>
                <div class="color-picker-input">
                  <input type="color" [(ngModel)]="nuevoColor.codigo_hex" name="hex_picker" (input)="syncColorRgb()" />
                  <input type="text" [(ngModel)]="nuevoColor.codigo_hex" name="codigo_hex" placeholder="#0a0a0a" (input)="syncColorRgb()" required />
                </div>
              </div>
              <div class="form-group">
                <label>Código RGB</label>
                <input type="text" [(ngModel)]="nuevoColor.codigo_rgb" name="codigo_rgb" placeholder="rgb(10, 10, 10)" />
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-cancel" (click)="closeModals()">Cancelar</button>
                <button type="submit" class="btn-submit" [disabled]="!nuevoColor.nombre">Guardar Color</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Temporada -->
      @if (showTemporadaModal()) {
        <div class="modal-backdrop" (click)="closeModals()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3 class="modal-title">Nueva Temporada Comercial</h3>
              <button type="button" class="btn-close" (click)="closeModals()">&times;</button>
            </div>
            <form (ngSubmit)="saveTemporada()" class="modal-body">
              <div class="form-group">
                <label>Nombre de la Colección/Temporada *</label>
                <input type="text" [(ngModel)]="nuevaTemporada.nombre" name="nombre" placeholder="Ej. Otoño - Invierno 2026" required />
              </div>
              <div class="form-group">
                <label>Código Identificador *</label>
                <input type="text" [(ngModel)]="nuevaTemporada.codigo" name="codigo" placeholder="Ej. FW-2026" required />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Fecha de Inicio</label>
                  <input type="date" [(ngModel)]="nuevaTemporada.fecha_inicio" name="fecha_inicio" />
                </div>
                <div class="form-group">
                  <label>Fecha de Cierre</label>
                  <input type="date" [(ngModel)]="nuevaTemporada.fecha_fin" name="fecha_fin" />
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-cancel" (click)="closeModals()">Cancelar</button>
                <button type="submit" class="btn-submit" [disabled]="!nuevaTemporada.nombre || !nuevaTemporada.codigo">Guardar Temporada</button>
              </div>
            </form>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .param-container {
      padding: 2.5rem 3rem;
      max-width: 1440px;
      margin: 0 auto;
      color: #111111;
      background-color: #ffffff;
    }

    .param-hero {
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      padding-bottom: 2rem;
      margin-bottom: 2rem;
    }

    .eyebrow {
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

    .hero-desc {
      font-family: 'Inter', sans-serif;
      font-size: 0.95rem;
      color: #4b5563;
      max-width: 800px;
      line-height: 1.6;
      margin-bottom: 2rem;
    }

    .tabs-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .tabs-group {
      display: flex;
      gap: 0.5rem;
    }

    .tab-btn {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.18);
      border-radius: 0;
      color: #4b5563;
      padding: 0.75rem 1.25rem;
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab-btn:hover {
      border-color: #000000;
      color: #000000;
      background: #f3f4f6;
    }

    .tab-btn.active {
      background: #000000;
      border-color: #000000;
      color: #ffffff;
      font-weight: 700;
    }

    .btn-gold {
      background: #000000;
      color: #ffffff;
      border: 1px solid #000000;
      border-radius: 0;
      padding: 0.75rem 1.5rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-gold:hover {
      background: #262626;
      border-color: #262626;
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
      border-radius: 0;
      font-weight: 500;
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

    .loading-state {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1.5rem;
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.08);
      font-size: 0.8rem;
      letter-spacing: 0.15em;
      color: #374151;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(0, 0, 0, 0.15);
      border-top-color: #000000;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .card-panel {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 1.75rem;
      box-shadow: none;
    }

    .panel-header {
      margin-bottom: 1.5rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      padding-bottom: 1rem;
    }

    .panel-title {
      font-family: 'Inter', sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0 0 0.35rem 0;
      color: #000000;
    }

    .panel-hint {
      font-size: 0.82rem;
      color: #6b7280;
    }

    .table-wrap {
      overflow-x: auto;
    }

    .noir-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      text-align: left;
      background: #ffffff;
      color: #111111;
    }

    .noir-table th {
      border-bottom: 2px solid rgba(0, 0, 0, 0.12);
      padding: 0.85rem 1rem;
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      color: #000000;
      font-weight: 700;
      text-transform: uppercase;
      background: #f9fafb;
    }

    .noir-table td {
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      padding: 1rem;
      vertical-align: middle;
      color: #1f2937;
    }

    .noir-table tbody tr:hover {
      background-color: #f9fafb;
    }

    .col-id {
      color: #6b7280;
      font-family: monospace;
      font-size: 0.8rem;
    }

    .col-strong {
      font-weight: 700;
      color: #000000;
    }

    .col-muted {
      color: #4b5563;
      font-size: 0.82rem;
    }

    .text-right {
      text-align: right;
    }

    .sector-badge {
      display: inline-block;
      padding: 0.25rem 0.65rem;
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      background: #000000;
      border: 1px solid #000000;
      color: #ffffff;
      font-weight: 700;
      border-radius: 0;
    }

    .talla-badge {
      display: inline-block;
      min-width: 38px;
      text-align: center;
      padding: 0.35rem 0.65rem;
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #000000;
      font-weight: 700;
      font-size: 0.85rem;
    }

    .season-code {
      display: inline-block;
      padding: 0.25rem 0.65rem;
      background: #f9fafb;
      border: 1px solid rgba(0, 0, 0, 0.2);
      color: #000000;
      font-weight: 700;
      font-size: 0.75rem;
    }

    .status-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #9ca3af;
      margin-right: 0.45rem;
    }

    .status-dot.active {
      background: #059669;
      box-shadow: 0 0 6px rgba(5, 150, 105, 0.4);
    }

    .status-text {
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      color: #374151;
      font-weight: 600;
    }

    .btn-action-ghost {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.25);
      color: #374151;
      padding: 0.45rem 0.95rem;
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;
      border-radius: 0;
      transition: all 0.2s ease;
    }

    .btn-action-ghost:hover {
      background: #f3f4f6;
      color: #000000;
      border-color: #000000;
    }

    /* Colors Grid */
    .colors-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1.25rem;
    }

    .color-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .swatch {
      height: 100px;
      width: 100%;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }

    .color-info {
      padding: 1rem;
      flex: 1;
    }

    .color-name {
      font-weight: 700;
      font-size: 0.95rem;
      margin-bottom: 0.45rem;
      color: #000000;
    }

    .color-codes {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      font-family: monospace;
      font-size: 0.75rem;
      color: #6b7280;
    }

    .code-hex {
      color: #000000;
      font-weight: 700;
    }

    .color-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      background: #f9fafb;
    }

    .empty-msg {
      text-align: center;
      padding: 2.5rem;
      color: #6b7280;
      font-size: 0.85rem;
    }

    /* Modals */
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

    .modal-dialog {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 0;
      width: 90%;
      max-width: 500px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }

    .modal-title {
      font-family: 'Inter', sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0;
      color: #000000;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: #6b7280;
      font-size: 1.5rem;
      cursor: pointer;
    }

    .btn-close:hover {
      color: #000000;
    }

    .modal-body {
      padding: 1.5rem;
    }

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

    .form-group input[type="text"],
    .form-group input[type="number"],
    .form-group input[type="date"],
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

    .color-picker-input {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .color-picker-input input[type="color"] {
      width: 44px;
      height: 44px;
      padding: 0;
      border: 1px solid rgba(0, 0, 0, 0.2);
      background: transparent;
      cursor: pointer;
      border-radius: 0;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 1.75rem;
    }

    .btn-cancel {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.25);
      color: #374151;
      padding: 0.75rem 1.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      border-radius: 0;
    }

    .btn-cancel:hover {
      background: #f3f4f6;
      color: #000000;
    }

    .btn-submit {
      background: #000000;
      border: 1px solid #000000;
      color: #ffffff;
      padding: 0.75rem 1.5rem;
      font-weight: 700;
      font-size: 0.75rem;
      letter-spacing: 0.1em;
      cursor: pointer;
      border-radius: 0;
      text-transform: uppercase;
    }

    .btn-submit:hover {
      background: #262626;
    }

    .btn-submit:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `]
})
export class ParametrosModaPageComponent implements OnInit {
  private readonly catalogoService = inject(CatalogoService);
  readonly authService = inject(AuthService);

  categoriasFiltradas = computed(() => {
    const list = this.categorias();
    const isVelvet = this.authService.currentTenant().empresaId === 2;
    if (isVelvet) {
      return list.filter(c => c.sector === 'MUJERES');
    }
    return list;
  });

  activeTab = signal<TabType>('CATEGORIAS');
  isLoading = signal<boolean>(false);
  feedbackMsg = signal<string | null>(null);
  feedbackIsError = signal<boolean>(false);

  // Collections
  categorias = signal<Categoria[]>([]);
  tallas = signal<Talla[]>([]);
  colores = signal<Color[]>([]);
  temporadas = signal<Temporada[]>([]);

  // Modal Visibility
  showCategoriaModal = signal<boolean>(false);
  showTallaModal = signal<boolean>(false);
  showColorModal = signal<boolean>(false);
  showTemporadaModal = signal<boolean>(false);

  // Form Models
  nuevaCategoria: CategoriaCreate = { nombre: '', sector: 'UNISEX', descripcion: '' };
  nuevaTalla: TallaCreate = { codigo: '', orden: 1, descripcion: '' };
  nuevoColor: ColorCreate = { nombre: '', codigo_hex: '#111111', codigo_rgb: 'rgb(17, 17, 17)' };
  nuevaTemporada: TemporadaCreate = { nombre: '', codigo: '', fecha_inicio: '', fecha_fin: '' };

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.isLoading.set(true);
    this.catalogoService.getCategorias().subscribe({
      next: (data) => this.categorias.set(data),
      error: () => {}
    });

    this.catalogoService.getTallas().subscribe({
      next: (data) => this.tallas.set(data),
      error: () => {}
    });

    this.catalogoService.getColores().subscribe({
      next: (data) => this.colores.set(data),
      error: () => {}
    });

    this.catalogoService.getTemporadas().subscribe({
      next: (data) => {
        this.temporadas.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  // --- Modal Openers ---
  openCategoriaModal(): void {
    this.nuevaCategoria = { nombre: '', sector: 'UNISEX', descripcion: '' };
    this.showCategoriaModal.set(true);
  }

  openTallaModal(): void {
    this.nuevaTalla = { codigo: '', orden: this.tallas().length + 1, descripcion: '' };
    this.showTallaModal.set(true);
  }

  openColorModal(): void {
    this.nuevoColor = { nombre: '', codigo_hex: '#111111', codigo_rgb: 'rgb(17, 17, 17)' };
    this.showColorModal.set(true);
  }

  openTemporadaModal(): void {
    this.nuevaTemporada = { nombre: '', codigo: '', fecha_inicio: '', fecha_fin: '' };
    this.showTemporadaModal.set(true);
  }

  closeModals(): void {
    this.showCategoriaModal.set(false);
    this.showTallaModal.set(false);
    this.showColorModal.set(false);
    this.showTemporadaModal.set(false);
  }

  // --- Actions ---
  saveCategoria(): void {
    this.isLoading.set(true);
    this.catalogoService.createCategoria(this.nuevaCategoria).subscribe({
      next: () => {
        this.closeModals();
        this.showFeedback('Categoría creada exitosamente en FastAPI.');
        this.loadAll();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showFeedback(err.error?.detail || 'Error al guardar categoría.', true);
      }
    });
  }

  toggleCategoriaActivo(cat: Categoria): void {
    this.catalogoService.updateCategoria(cat.id, { activo: !cat.activo }).subscribe({
      next: () => {
        this.showFeedback(`Categoría '${cat.nombre}' actualizada.`);
        this.loadAll();
      },
      error: (err) => this.showFeedback(err.error?.detail || 'Error al actualizar.', true)
    });
  }

  saveTalla(): void {
    this.isLoading.set(true);
    this.catalogoService.createTalla(this.nuevaTalla).subscribe({
      next: () => {
        this.closeModals();
        this.showFeedback('Talla registrada en la escala de moda.');
        this.loadAll();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showFeedback(err.error?.detail || 'Error al crear talla.', true);
      }
    });
  }

  toggleTallaActivo(talla: Talla): void {
    this.catalogoService.updateTalla(talla.id, { activo: !talla.activo }).subscribe({
      next: () => {
        this.showFeedback(`Talla '${talla.codigo}' actualizada.`);
        this.loadAll();
      },
      error: (err) => this.showFeedback(err.error?.detail || 'Error al actualizar.', true)
    });
  }

  saveColor(): void {
    this.isLoading.set(true);
    this.catalogoService.createColor(this.nuevoColor).subscribe({
      next: () => {
        this.closeModals();
        this.showFeedback('Color cromático registrado en la paleta Atelier Noir.');
        this.loadAll();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showFeedback(err.error?.detail || 'Error al registrar color.', true);
      }
    });
  }

  toggleColorActivo(color: Color): void {
    this.catalogoService.updateColor(color.id, { activo: !color.activo }).subscribe({
      next: () => {
        this.showFeedback(`Color '${color.nombre}' actualizado.`);
        this.loadAll();
      },
      error: (err) => this.showFeedback(err.error?.detail || 'Error al actualizar.', true)
    });
  }

  syncColorRgb(): void {
    const hex = this.nuevoColor.codigo_hex;
    if (hex && /^#[0-9A-Fa-f]{6}$/.test(hex)) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      this.nuevoColor.codigo_rgb = `rgb(${r}, ${g}, ${b})`;
    }
  }

  saveTemporada(): void {
    this.isLoading.set(true);
    this.catalogoService.createTemporada(this.nuevaTemporada).subscribe({
      next: () => {
        this.closeModals();
        this.showFeedback('Temporada comercial registrada exitosamente.');
        this.loadAll();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showFeedback(err.error?.detail || 'Error al registrar temporada.', true);
      }
    });
  }

  toggleTemporadaActivo(temp: Temporada): void {
    this.catalogoService.updateTemporada(temp.id, { activo: !temp.activo }).subscribe({
      next: () => {
        this.showFeedback(`Temporada '${temp.codigo}' actualizada.`);
        this.loadAll();
      },
      error: (err) => this.showFeedback(err.error?.detail || 'Error al actualizar.', true)
    });
  }

  showFeedback(msg: string, isError: boolean = false): void {
    this.feedbackMsg.set(msg);
    this.feedbackIsError.set(isError);
    setTimeout(() => {
      if (this.feedbackMsg() === msg) {
        this.feedbackMsg.set(null);
      }
    }, 4000);
  }
}
