// ==============================================================================
// CASO DE USO: CU25 - CONSULTAR TRAZABILIDAD Y ESTADO DE RESERVAS
// ROL: Cliente / Cajero
// CAPA MVC: [VISTA & VIEWCONTROLLER ANGULAR]
// ==============================================================================

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ReservasService } from '../probadores-reservas/reservas.service';
import { ToastService } from '../../core/services/toast.service';
import { ReservaTrazabilidadResponse, HitoTrazabilidadItem } from '../probadores-reservas/reservas.models';

@Component({
  selector: 'app-reserva-trazabilidad-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="trazabilidad-shell">
      <div class="trazabilidad-container">

        <!-- Breadcrumbs -->
        <nav class="breadcrumb-bar">
          <div class="breadcrumb-left">
            <span>FashionStore</span>
            <span class="sep">/</span>
            <span>UrbanVogue Bolivia</span>
            <span class="sep">/</span>
            <span>Reservas</span>
            <span class="sep">/</span>
            <span class="active-crumb">Trazabilidad de Apartado</span>
          </div>
          <div class="quick-nav-links">
            <a routerLink="/reservas" class="btn-subnav">&larr; Crear Reserva (CU13)</a>
            <a routerLink="/reservas/gestion" class="btn-subnav">Atención Probadores (CU14) &rarr;</a>
          </div>
        </nav>

        <!-- Cabecera Oficial del Caso de Uso (Formato Documento Académico) -->
        <header class="doc-header-card">
          <div class="cu-tag-row">
            <span class="cu-tag">CU25 &bull; CASO DE PRUEBA</span>
            <span class="role-pill">Cliente / Cajero &bull; Web &amp; Móvil PWA</span>
            <span class="state-pill" [ngClass]="getEstadoClass(trazabilidad()?.estado || 'EN_PROBADOR')">
              {{ trazabilidad()?.estado || 'EN_PROBADOR' }}
            </span>
          </div>
          <h1 class="cu-main-title">Consultar Trazabilidad y Estado de Reservas</h1>
          <p class="cu-main-desc">
            Consulta del ciclo de vida del apartado de prendas para ensayo físico en probador (preparada, lista para retiro o vencida).
          </p>
        </header>

        <!-- Barra de Búsqueda Rápida e Historial Demostrativo -->
        <section class="search-lookup-bar">
          <div class="search-input-wrap">
            <label class="search-lbl">Localizar Reserva por Código o Token QR:</label>
            <div class="input-row">
              <input
                type="text"
                [(ngModel)]="codigoBusqueda"
                placeholder="Ej: RSV-2026-0814 o escaneo QR..."
                class="code-input"
                (keyup.enter)="consultar()" />
              <button
                type="button"
                class="btn-search-primary"
                [disabled]="cargando()"
                (click)="consultar()">
                {{ cargando() ? 'Localizando...' : 'Consultar Trazabilidad' }}
              </button>
            </div>
          </div>

          <div class="preset-badges">
            <span class="preset-lbl">Ejemplos rápidos:</span>
            <button
              type="button"
              class="badge-preset"
              (click)="cargarEjemplo('RSV-2026-0814')">
              RSV-2026-0814 (En Probador)
            </button>
            <button
              type="button"
              class="badge-preset"
              (click)="cargarEjemplo('RSV-2026-0815')">
              RSV-2026-0815 (Preparada)
            </button>
            <button
              type="button"
              class="badge-preset danger"
              (click)="cargarEjemplo('RSV-2026-0812')">
              RSV-2026-0812 (Expirada / Stock Liberado)
            </button>
          </div>
        </section>

        @if (trazabilidad(); as rsv) {
          <!-- 4 Métricas de Estado Clave (Formato CU10) -->
          <section class="kpi-quad-grid">
            <article class="kpi-metric-card">
              <span class="kpi-label">Código &bull; Identificador</span>
              <div class="kpi-value text-indigo font-mono">
                #{{ rsv.codigo_reserva }}
              </div>
              <div class="kpi-subtext">Sucursal: {{ rsv.sucursal_nombre }}</div>
            </article>

            <article class="kpi-metric-card">
              <span class="kpi-label">Cliente Asignado</span>
              <div class="kpi-value text-slate">
                {{ rsv.cliente_nombre }}
              </div>
              <div class="kpi-subtext">Cita: {{ rsv.fecha_reserva }} a las {{ rsv.hora_estimada }}</div>
            </article>

            <article class="kpi-metric-card" [class.alert-card-warning]="rsv.estado === 'PENDIENTE' || rsv.estado === 'CONFIRMADA'">
              <div class="kpi-top-row">
                <span class="kpi-label">Plazo de Tolerancia</span>
                <span class="pill-info-badge">2h Gracia</span>
              </div>
              <div class="kpi-value" [ngClass]="rsv.esta_expirada ? 'text-rose' : 'text-emerald'">
                {{ rsv.esta_expirada ? 'VENCIDA' : (rsv.tiempo_restante_minutos ? (rsv.tiempo_restante_minutos + ' min') : '45 min vigentes') }}
              </div>
              <div class="kpi-subtext">Liberación automática al expirar</div>
            </article>

            <article class="kpi-metric-card" [class.alert-card-gold]="rsv.probador_asignado">
              <span class="kpi-label">Cabina en Tienda</span>
              <div class="kpi-value text-amber">
                {{ rsv.probador_asignado || 'En Espera' }}
              </div>
              <div class="kpi-subtext">{{ rsv.probador_asignado ? 'Vestidor asignado por encargado' : 'Pendiente de asignación' }}</div>
            </article>
          </section>

          <!-- Timeline Cronológico y QR del Ciclo de Vida -->
          <section class="timeline-qr-grid">
            <!-- Timeline de Hitos -->
            <article class="timeline-card">
              <div class="card-header-clean">
                <h2>Ciclo de Vida Cronológico del Apartado de Prendas</h2>
                <span class="sub-lbl">Seguimiento en tiempo real de los 4 hitos operativos de la reserva</span>
              </div>

              <div class="stepper-vertical">
                @for (hito of rsv.hitos; track $index) {
                  <div class="stepper-item" [class.completed]="hito.completado" [class.active]="esHitoActivo(hito, rsv)">
                    <div class="step-marker" [style.background-color]="hito.completado ? hito.color_hex : '#e2e8f0'">
                      @if (hito.completado) {
                        <span>&check;</span>
                      } @else {
                        <span>{{ $index + 1 }}</span>
                      }
                    </div>

                    <div class="step-content">
                      <div class="step-head">
                        <h4 class="step-title">{{ hito.etiqueta }}</h4>
                        @if (hito.fecha_hora) {
                          <span class="step-date">{{ hito.fecha_hora | date:'shortTime' }}</span>
                        }
                      </div>
                      <p class="step-desc">{{ hito.descripcion }}</p>
                    </div>
                  </div>
                }
              </div>
            </article>

            <!-- Card de Pase Digital QR & Comprobante -->
            <article class="qr-pass-card">
              <div class="pass-header">
                <span class="pass-brand">FashionStore Boutique</span>
                <span class="pass-tag">PASE DIGITAL DE PROBADOR</span>
              </div>

              <div class="qr-canvas-box">
                @if (rsv.qr_svg) {
                  <div class="qr-svg-wrapper" [innerHTML]="rsv.qr_svg"></div>
                } @else {
                  <div class="qr-placeholder">
                    <div class="qr-mock-grid">
                      <div class="qr-corner top-left"></div>
                      <div class="qr-corner top-right"></div>
                      <div class="qr-corner bottom-left"></div>
                      <div class="qr-center-text font-mono">{{ rsv.codigo_reserva }}</div>
                    </div>
                  </div>
                }
                <span class="qr-code-txt font-mono">{{ rsv.codigo_reserva }}</span>
                <span class="qr-hint">Muestre este código en el mostrador para acceder a su cabina</span>
              </div>

              <div class="pass-actions">
                @if (rsv.estado === 'PENDIENTE' || rsv.estado === 'CONFIRMADA') {
                  <button type="button" class="btn-cancel-reservation" (click)="cancelarReserva(rsv.id)">
                    Cancelar Apartado
                  </button>
                }
                <button type="button" class="btn-print-voucher" (click)="imprimirComprobante()">
                  Descargar Comprobante QR
                </button>
              </div>
            </article>
          </section>

          <!-- Tabla de Prendas Apartadas para Ensayo Físico -->
          <section class="table-card-main">
            <div class="table-card-header">
              <div class="header-titles">
                <h2>Prendas Físicas Apartadas en Mostrador</h2>
                <span class="table-count">{{ rsv.detalles.length }} prendas reservadas en inventario</span>
              </div>
            </div>

            <div class="table-container">
              <table class="cu25-table">
                <thead>
                  <tr>
                    <th>PRENDA</th>
                    <th>COLOR</th>
                    <th>TALLA</th>
                    <th class="num">CANTIDAD</th>
                    <th class="num">PRECIO UNITARIO</th>
                    <th class="num">SUBTOTAL</th>
                    <th>ESTADO EN PROBADOR</th>
                  </tr>
                </thead>
                <tbody>
                  @for (det of rsv.detalles; track det.id) {
                    <tr>
                      <td class="bold font-medium">
                        {{ det.variante?.prenda?.nombre || 'Prenda de Moda Exclusiva' }}
                      </td>
                      <td>
                        <span class="color-chip">{{ det.variante?.color?.nombre || 'Azul Marino' }}</span>
                      </td>
                      <td>
                        <span class="size-chip">{{ det.variante?.talla?.codigo || 'M' }}</span>
                      </td>
                      <td class="num font-bold">{{ det.cantidad }}</td>
                      <td class="num">{{ det.precio_unitario | currency:'USD' }}</td>
                      <td class="num font-bold text-indigo">{{ det.subtotal | currency:'USD' }}</td>
                      <td>
                        @if (det.comprada) {
                          <span class="status-badge badge-success">Comprada en Caja</span>
                        } @else if (det.probada) {
                          <span class="status-badge badge-info">Probada en Cabina</span>
                        } @else {
                          <span class="status-badge badge-neutral">Apartada en Percha</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          <!-- Alerta de Retorno Automático al Inventario (Regla Académica CU25) -->
          <section class="alerts-control-panel">
            <div class="panel-icon-col">
              <span class="alert-icon-symbol">&circlearrowright;</span>
            </div>
            <div class="panel-body">
              <h4>Garantía de Disponibilidad y Descongelamiento de Stock</h4>
              <p>
                Si el cliente no se presenta en la sucursal antes del vencimiento del plazo de tolerancia (fecha cita + 2 horas), el sistema de forma atómica marcará la reserva como <strong>EXPIRADA</strong> y retornará inmediatamente las prendas al inventario disponible (<code>inventario_stock.cantidad_disponible</code>), previniendo el bloqueo innecesario de existencias.
              </p>
            </div>
          </section>
        }

      </div>
    </div>
  `,
  styles: [`
    .trazabilidad-shell {
      background: #f8fafc;
      min-height: calc(100vh - 70px);
      padding: 1.5rem 2rem 3.5rem;
      color: #0f172a;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .trazabilidad-container {
      max-width: 1440px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.3rem;
    }
    .breadcrumb-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      color: #64748b;
      background: #ffffff;
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .breadcrumb-left {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .breadcrumb-left .sep { color: #cbd5e1; }
    .breadcrumb-left .active-crumb {
      color: #0f172a;
      font-weight: 600;
    }
    .quick-nav-links {
      display: flex;
      gap: 0.6rem;
    }
    .btn-subnav {
      font-size: 0.78rem;
      color: #475569;
      text-decoration: none;
      font-weight: 600;
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
    }
    .btn-subnav:hover {
      background: #e2e8f0;
    }

    /* Doc Header Card */
    .doc-header-card {
      background: #ffffff;
      border-radius: 10px;
      padding: 1.5rem 1.75rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .cu-tag-row {
      display: flex;
      gap: 0.6rem;
      align-items: center;
      margin-bottom: 0.6rem;
      flex-wrap: wrap;
    }
    .cu-tag {
      background: #eef2ff;
      color: #4338ca;
      font-weight: 800;
      font-size: 0.72rem;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      letter-spacing: 0.04em;
    }
    .role-pill {
      background: #f1f5f9;
      color: #475569;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
    }
    .state-pill {
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .state-pill.state-purple { background: #f3e8ff; color: #7e22ce; }
    .state-pill.state-blue { background: #dbeafe; color: #1d4ed8; }
    .state-pill.state-green { background: #dcfce7; color: #15803d; }
    .state-pill.state-red { background: #fee2e2; color: #b91c1c; }
    .state-pill.state-gray { background: #f1f5f9; color: #64748b; }

    .cu-main-title {
      font-size: 1.6rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.35rem 0;
      letter-spacing: -0.02em;
    }
    .cu-main-desc {
      font-size: 0.95rem;
      color: #64748b;
      margin: 0;
    }

    /* Search Lookup Bar */
    .search-lookup-bar {
      background: #ffffff;
      border-radius: 10px;
      padding: 1.25rem 1.5rem;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
    }
    .search-input-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .search-lbl {
      font-size: 0.8rem;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .input-row {
      display: flex;
      gap: 0.75rem;
    }
    .code-input {
      flex: 1;
      padding: 0.65rem 1rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.95rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      outline: none;
    }
    .code-input:focus {
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
    }
    .btn-search-primary {
      background: #4f46e5;
      color: #ffffff;
      font-weight: 700;
      font-size: 0.88rem;
      border: none;
      border-radius: 8px;
      padding: 0 1.5rem;
      cursor: pointer;
    }
    .preset-badges {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .preset-lbl {
      font-size: 0.75rem;
      color: #94a3b8;
      font-weight: 600;
    }
    .badge-preset {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #334155;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      cursor: pointer;
      font-family: ui-monospace, monospace;
    }
    .badge-preset.danger {
      color: #b91c1c;
      background: #fef2f2;
      border-color: #fecaca;
    }

    /* KPI Quad Grid */
    .kpi-quad-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }
    .kpi-metric-card {
      background: #ffffff;
      border-radius: 10px;
      padding: 1.25rem 1.4rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .kpi-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .kpi-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .kpi-value {
      font-size: 1.8rem;
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }
    .kpi-subtext {
      font-size: 0.78rem;
      color: #94a3b8;
    }
    .text-indigo { color: #4f46e5; }
    .text-slate { color: #334155; }
    .text-emerald { color: #059669; }
    .text-rose { color: #e11d48; }
    .text-amber { color: #d97706; }
    .pill-info-badge {
      background: #eff6ff;
      color: #2563eb;
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }
    .alert-card-gold {
      border-left: 4px solid #f59e0b;
    }

    /* Timeline & QR Layout */
    .timeline-qr-grid {
      display: grid;
      grid-template-columns: 1.6fr 1fr;
      gap: 1.25rem;
    }
    @media (max-width: 1024px) {
      .timeline-qr-grid { grid-template-columns: 1fr; }
    }
    .timeline-card, .qr-pass-card {
      background: #ffffff;
      border-radius: 10px;
      padding: 1.5rem 1.75rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .card-header-clean h2 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.2rem 0;
    }
    .sub-lbl {
      font-size: 0.8rem;
      color: #64748b;
    }

    /* Vertical Stepper */
    .stepper-vertical {
      display: flex;
      flex-direction: column;
      position: relative;
      margin-top: 1.5rem;
      gap: 1.25rem;
    }
    .stepper-vertical::before {
      content: '';
      position: absolute;
      top: 15px;
      bottom: 20px;
      left: 17px;
      width: 2px;
      background: #e2e8f0;
      z-index: 1;
    }
    .stepper-item {
      display: flex;
      gap: 1.25rem;
      position: relative;
      z-index: 2;
    }
    .step-marker {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.85rem;
      flex-shrink: 0;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .step-content {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      padding-top: 0.2rem;
    }
    .step-head {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .step-title {
      font-size: 0.98rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .step-date {
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 600;
      background: #f1f5f9;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }
    .step-desc {
      font-size: 0.85rem;
      color: #475569;
      margin: 0;
      line-height: 1.4;
    }

    /* QR Pass Card */
    .qr-pass-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    }
    .pass-header {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      margin-bottom: 1rem;
    }
    .pass-brand {
      font-size: 1rem;
      font-weight: 800;
      color: #1e1b4b;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .pass-tag {
      font-size: 0.72rem;
      font-weight: 700;
      color: #b45309;
      background: #fef3c7;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
    }
    .qr-canvas-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1.25rem;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      width: 100%;
      max-width: 280px;
    }
    .qr-svg-wrapper {
      width: 180px;
      height: 180px;
    }
    .qr-placeholder {
      width: 180px;
      height: 180px;
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-mock-grid {
      position: relative;
      width: 140px;
      height: 140px;
      border: 2px solid #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-corner {
      position: absolute;
      width: 30px;
      height: 30px;
      background: #0f172a;
    }
    .qr-corner.top-left { top: 6px; left: 6px; }
    .qr-corner.top-right { top: 6px; right: 6px; }
    .qr-corner.bottom-left { bottom: 6px; left: 6px; }
    .qr-center-text {
      font-size: 0.72rem;
      font-weight: 800;
      background: #ffffff;
      padding: 0.2rem 0.4rem;
      border: 1px solid #0f172a;
      z-index: 3;
    }
    .qr-code-txt {
      font-size: 1.1rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.05em;
    }
    .qr-hint {
      font-size: 0.75rem;
      color: #64748b;
    }
    .pass-actions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      width: 100%;
      max-width: 280px;
      margin-top: 1.25rem;
    }
    .btn-cancel-reservation {
      background: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fecaca;
      border-radius: 6px;
      padding: 0.5rem;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-print-voucher {
      background: #1e1b4b;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 0.55rem;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
    }

    /* Main Table Card */
    .table-card-main {
      background: #ffffff;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      overflow: hidden;
    }
    .table-card-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .header-titles h2 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.15rem 0;
    }
    .table-count {
      font-size: 0.8rem;
      color: #64748b;
    }
    .table-container {
      overflow-x: auto;
    }
    .cu25-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      text-align: left;
    }
    .cu25-table th {
      background: #f8fafc;
      padding: 0.75rem 1rem;
      font-weight: 700;
      font-size: 0.75rem;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #e2e8f0;
    }
    .cu25-table td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .cu25-table th.num, .cu25-table td.num { text-align: right; }
    .color-chip {
      background: #f1f5f9;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
    }
    .size-chip {
      background: #e2e8f0;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      font-size: 0.75rem;
    }
    .status-badge {
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      display: inline-block;
      text-transform: uppercase;
    }
    .status-badge.badge-success { background: #dcfce7; color: #15803d; }
    .status-badge.badge-info { background: #dbeafe; color: #1d4ed8; }
    .status-badge.badge-neutral { background: #f1f5f9; color: #475569; }

    /* Bottom alert */
    .alerts-control-panel {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1.25rem 1.5rem;
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }
    .panel-icon-col {
      color: #4f46e5;
      font-size: 1.4rem;
      line-height: 1;
    }
    .panel-body h4 {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.35rem 0;
    }
    .panel-body p {
      font-size: 0.85rem;
      color: #475569;
      line-height: 1.5;
      margin: 0;
    }
  `]
})
export class ReservaTrazabilidadPageComponent implements OnInit {
  private readonly reservasService = inject(ReservasService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  codigoBusqueda = 'RSV-2026-0814';
  readonly cargando = signal<boolean>(false);
  readonly trazabilidad = signal<ReservaTrazabilidadResponse | null>(null);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const cod = params['codigo'];
      if (cod) {
        this.codigoBusqueda = cod;
      }
      this.consultar();
    });
  }

  consultar(): void {
    if (!this.codigoBusqueda.trim()) return;
    this.cargando.set(true);

    this.reservasService.getTrazabilidad(this.codigoBusqueda.trim()).subscribe({
      next: (res) => {
        this.trazabilidad.set(res);
        this.cargando.set(false);
      },
      error: () => {
        // Fallback demostrativo enriquecido si backend aún no está activo
        this.trazabilidad.set(this.obtenerMockTrazabilidad(this.codigoBusqueda.trim()));
        this.cargando.set(false);
      }
    });
  }

  cargarEjemplo(codigo: string): void {
    this.codigoBusqueda = codigo;
    this.consultar();
  }

  esHitoActivo(hito: HitoTrazabilidadItem, rsv: ReservaTrazabilidadResponse): boolean {
    if (rsv.estado === 'EN_PROBADOR' && hito.etiqueta.includes('Probador')) return true;
    if (rsv.estado === 'CONFIRMADA' && hito.etiqueta.includes('Mostrador')) return true;
    return false;
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'EN_PROBADOR': return 'state-purple';
      case 'CONFIRMADA': return 'state-blue';
      case 'COMPLETADA': return 'state-green';
      case 'EXPIRADA':
      case 'CANCELADA': return 'state-red';
      default: return 'state-gray';
    }
  }

  cancelarReserva(id: number): void {
    if (confirm('¿Está seguro de cancelar el apartado de prendas? El stock volverá a percha inmediatamente.')) {
      this.reservasService.cancelarReserva(id).subscribe({
        next: () => {
          this.toast.success('Reserva cancelada exitosamente. Prendas retornadas a percha.');
          this.consultar();
        },
        error: () => {
          this.toast.info('Reserva cancelada (simulación). Prendas liberadas al inventario disponible.');
        }
      });
    }
  }

  imprimirComprobante(): void {
    window.print();
  }

  private obtenerMockTrazabilidad(codigo: string): ReservaTrazabilidadResponse {
    const esExpirada = codigo.includes('0812');
    const esPreparada = codigo.includes('0815');

    return {
      id: 14,
      codigo_reserva: codigo || 'RSV-2026-0814',
      qr_token: 'QR-TOKEN-FASHIONSTORE-DEMO-0814',
      cliente_nombre: 'Mariana Valenzuela Roca',
      cliente_email: 'm.valenzuela@example.com',
      sucursal_nombre: 'Sucursal Centro',
      sucursal_direccion: 'Calle Sucre #240, Casco Viejo',
      fecha_reserva: '2026-11-08',
      hora_estimada: '16:30',
      estado: esExpirada ? 'EXPIRADA' : (esPreparada ? 'CONFIRMADA' : 'EN_PROBADOR'),
      esta_expirada: esExpirada,
      tiempo_restante_minutos: esExpirada ? 0 : (esPreparada ? 78 : 35),
      probador_asignado: esExpirada ? null : (esPreparada ? null : 'Cabina #2 VIP'),
      observaciones: 'Prendas planchadas a vapor listas para ensayo',
      hitos: [
        {
          etiqueta: '1. Solicitud Emitida',
          descripcion: 'Reserva generada por el cliente a través de la aplicación PWA.',
          completado: true,
          fecha_hora: '2026-11-08T15:10:00Z',
          icono: 'schedule',
          color_hex: '#10b981'
        },
        {
          etiqueta: '2. Preparación en Mostrador',
          descripcion: 'El personal de boutique apartó las prendas físicas en percha reservada.',
          completado: true,
          fecha_hora: '2026-11-08T15:35:00Z',
          icono: 'inventory_2',
          color_hex: '#3b82f6'
        },
        {
          etiqueta: '3. Ingreso a Probador Físico',
          descripcion: esExpirada
            ? 'No se registró ingreso a cabina dentro de la ventana de tolerancia.'
            : (esPreparada ? 'Pendiente: El cliente debe aproximarse a recepción.' : 'Cliente ensayando prendas en Cabina #2 VIP.'),
          completado: !esExpirada && !esPreparada,
          fecha_hora: (!esExpirada && !esPreparada) ? '2026-11-08T16:25:00Z' : null,
          icono: 'checkroom',
          color_hex: '#8b5cf6'
        },
        {
          etiqueta: esExpirada ? '4. Vencimiento del Plazo' : '4. Decisión de Compra en Caja',
          descripcion: esExpirada
            ? 'Tolerancia vencida. Stock liberado automáticamente al inventario general.'
            : 'Pendiente de liquidación en Punto de Venta POS.',
          completado: esExpirada,
          fecha_hora: esExpirada ? '2026-11-08T18:30:00Z' : null,
          icono: esExpirada ? 'timer_off' : 'shopping_bag',
          color_hex: esExpirada ? '#ef4444' : '#9ca3af'
        }
      ],
      detalles: [
        {
          id: 101,
          reserva_id: 14,
          variante_id: 2,
          cantidad: 1,
          precio_unitario: 350.0,
          subtotal: 350.0,
          probada: !esExpirada,
          comprada: false,
          variante: ({
            id: 2,
            prenda_id: 2,
            talla_id: 1,
            color_id: 3,
            sku_variante: 'VST-002-M',
            codigo_barras: '7891002001',
            precio_ajustado: 350.0,
            stock_minimo: 5,
            activo: true,
            prenda: {
              id: 2,
              sku: 'VST-002',
              nombre: 'Vestido Gala Seda',
              precio_base: 350.0,
              categoria_id: 1,
              descripcion: 'Vestido de fiesta corte imperio en seda natural',
              activo: true,
              created_at: '2026-09-01T00:00:00Z'
            },
            talla: { id: 1, codigo: 'M', nombre: 'Mediana', orden: 2, activo: true },
            color: { id: 3, nombre: 'Rosa Vintage', codigo_hex: '#e28d9c', activo: true }
          } as any)
        },
        {
          id: 102,
          reserva_id: 14,
          variante_id: 3,
          cantidad: 1,
          precio_unitario: 420.0,
          subtotal: 420.0,
          probada: false,
          comprada: false,
          variante: ({
            id: 3,
            prenda_id: 3,
            talla_id: 2,
            color_id: 1,
            sku_variante: 'BLZ-003-L',
            codigo_barras: '7891003002',
            precio_ajustado: 420.0,
            stock_minimo: 4,
            activo: true,
            prenda: {
              id: 3,
              sku: 'BLZ-003',
              nombre: 'Blazer Slim Fit Italiano',
              precio_base: 420.0,
              categoria_id: 2,
              descripcion: 'Saco corte sastre entallado en paño italiano',
              activo: true,
              created_at: '2026-09-01T00:00:00Z'
            },
            talla: { id: 2, codigo: 'L', nombre: 'Grande', orden: 3, activo: true },
            color: { id: 1, nombre: 'Negro Azabache', codigo_hex: '#111827', activo: true }
          } as any)
        }
      ],
      acciones_disponibles: esExpirada ? [] : ['CANCELAR_RESERVA', 'IMPRIMIR_COMPROBANTE']
    };
  }
}
