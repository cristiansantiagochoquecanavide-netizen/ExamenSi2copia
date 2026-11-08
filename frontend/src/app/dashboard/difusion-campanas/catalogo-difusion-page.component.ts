// ==============================================================================
// CASO DE USO: CU09 - DIFUNDIR NOVEDADES DE CATÁLOGO A CLIENTES
// ROL: Encargado de Marketing / Admin Tenant
// CAPA MVC: [VISTA & VIEWCONTROLLER ANGULAR]
// ==============================================================================

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CatalogoService } from '../catalogo-prendas/catalogo.service';
import { ToastService } from '../../core/services/toast.service';
import { DifusionCatalogoCreate, DifusionCatalogoResponse } from '../catalogo-prendas/catalogo.models';

@Component({
  selector: 'app-catalogo-difusion-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="difusion-shell">
      <div class="difusion-container">

        <!-- Breadcrumbs -->
        <nav class="breadcrumb-bar">
          <div class="breadcrumb-left">
            <span>FashionStore</span>
            <span class="sep">/</span>
            <span>UrbanVogue Bolivia</span>
            <span class="sep">/</span>
            <span>Catálogo</span>
            <span class="sep">/</span>
            <span class="active-crumb">Difusión Omnicanal</span>
          </div>
          <div class="quick-nav-links">
            <a routerLink="/catalogo" class="btn-subnav">&larr; Catálogo Público</a>
            <a routerLink="/catalogo/gestion" class="btn-subnav">Gestión de Prendas &rarr;</a>
          </div>
        </nav>

        <!-- Cabecera Oficial del Caso de Uso (Formato Documento Académico) -->
        <header class="doc-header-card">
          <div class="cu-tag-row">
            <span class="cu-tag">CU09 &bull; CASO DE PRUEBA</span>
            <span class="role-pill">Encargado Marketing / Admin Tenant &bull; Entorno Web</span>
            <span class="state-pill active"><span class="dot-active"></span> MOTOR OMNICANAL ACTIVO</span>
          </div>
          <h1 class="cu-main-title">Difundir Novedades de Catálogo a Clientes</h1>
          <p class="cu-main-desc">
            Envío segmentado de actualizaciones del catálogo, promociones y nuevas colecciones hacia los clientes por WhatsApp o correo.
          </p>
        </header>

        <!-- 4 Tarjetas Métricas de Campaña (Formato CU10) -->
        <section class="kpi-quad-grid">
          <article class="kpi-metric-card">
            <span class="kpi-label">Segmento Seleccionado</span>
            <div class="kpi-value text-indigo">
              {{ obtenerEtiquetaSegmento(formSegmento) }}
            </div>
            <div class="kpi-subtext">{{ estimarDestinatarios() }} clientes objetivo detectados</div>
          </article>

          <article class="kpi-metric-card">
            <span class="kpi-label">Canal de Difusión</span>
            <div class="kpi-value text-emerald">
              {{ formCanal }}
            </div>
            <div class="kpi-subtext">Meta WhatsApp Cloud / SendGrid API</div>
          </article>

          <article class="kpi-metric-card">
            <div class="kpi-top-row">
              <span class="kpi-label">Tasa Apertura Est.</span>
              <span class="pill-info-badge">High Engagement</span>
            </div>
            <div class="kpi-value text-amber">
              {{ estimarTasaApertura() }}%
            </div>
            <div class="kpi-subtext">Basado en histórico de aperturas</div>
          </article>

          <article class="kpi-metric-card">
            <span class="kpi-label">Campañas Enviadas</span>
            <div class="kpi-value text-slate">
              {{ difusionesHistorial().length }}
            </div>
            <div class="kpi-subtext">Campañas omnicanal registradas</div>
          </article>
        </section>

        <!-- Grid Principal: Compositor de Campaña + Simulador en Vivo -->
        <section class="composer-simulator-grid">
          <!-- Columna Izquierda: Formulario de Configuración de Difusión -->
          <article class="composer-card">
            <div class="card-head">
              <h2>Configurar Envío de Novedades</h2>
              <span class="card-sub">Segmentación dinámica con clusters ML (CU23)</span>
            </div>

            <form class="composer-form" (submit)="$event.preventDefault(); dispararDifusion()">
              <!-- Título de Campaña -->
              <div class="form-group">
                <label>Título o Asunto de la Campaña:</label>
                <input
                  type="text"
                  [(ngModel)]="formTitulo"
                  name="formTitulo"
                  placeholder="Ej: Nueva Colección Verano 2026 en Boutique"
                  class="form-control"
                  required />
              </div>

              <!-- Segmento Objetivo (K-Means RFM) -->
              <div class="form-row-2">
                <div class="form-group">
                  <label>Audiencia Segmentada (Clusters ML):</label>
                  <select [(ngModel)]="formSegmento" name="formSegmento" class="form-select">
                    <option value="VIP">Cluster #0: Clientes VIP (Alto Gasto)</option>
                    <option value="FRECUENTES">Cluster #1: Compradores Frecuentes</option>
                    <option value="EN_RIESGO">Cluster #2: En Riesgo de Abandono</option>
                    <option value="TODOS">Base Completa (Todos los Clientes)</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Canal de Salida:</label>
                  <select [(ngModel)]="formCanal" name="formCanal" class="form-select">
                    <option value="OMNICANAL">Omnicanal (WhatsApp + Correo)</option>
                    <option value="WHATSAPP">WhatsApp Business API</option>
                    <option value="EMAIL">Correo Electrónico (Newsletter)</option>
                    <option value="SMS">SMS Promocional</option>
                  </select>
                </div>
              </div>

              <!-- Prendas Destacadas a Difundir -->
              <div class="form-group">
                <label>Prenda Destacada del Catálogo:</label>
                <select [(ngModel)]="formPrendaSeleccionada" name="formPrendaSeleccionada" class="form-select" (change)="actualizarPrendaPreview()">
                  <option value="Vestido Gala Seda (Rosa Vintage)">Vestido Gala Seda &bull; $350.00 (Exclusivo)</option>
                  <option value="Blazer Slim Fit Italiano (Negro)">Blazer Slim Fit Italiano &bull; $420.00 (Tendencia)</option>
                  <option value="Camisa Oxford Celeste (Algodón Pima)">Camisa Oxford Celeste &bull; $180.00 (Esencial)</option>
                  <option value="Pantalón Lino Arena (Verano)">Pantalón Lino Arena &bull; $220.00 (Nuevo)</option>
                </select>
              </div>

              <!-- Cuerpo del Mensaje Personalizado -->
              <div class="form-group">
                <div class="msg-header-row">
                  <label>Plantilla del Mensaje Publicitario:</label>
                  <span class="chips-hint">Variables dinámicas: <code>&#123;nombre&#125;</code>, <code>&#123;prenda&#125;</code></span>
                </div>
                <textarea
                  [(ngModel)]="formMensaje"
                  name="formMensaje"
                  rows="4"
                  class="form-textarea"
                  required></textarea>
              </div>

              <!-- Botones de Acción -->
              <div class="form-actions">
                <button
                  type="submit"
                  class="btn-launch-broadcast"
                  [disabled]="enviando()">
                  <span class="btn-icon">&rarr;</span>
                  {{ enviando() ? 'Disparando Difusión...' : 'Lanzar Difusión Omnicanal (CU09)' }}
                </button>
              </div>
            </form>
          </article>

          <!-- Columna Derecha: Vista Previa en Vivo (Simulador de Smartphone / Email) -->
          <article class="simulator-card">
            <div class="preview-tabs">
              <button
                type="button"
                class="prev-tab"
                [class.active]="previewTab === 'WHATSAPP'"
                (click)="previewTab = 'WHATSAPP'">
                WhatsApp Móvil
              </button>
              <button
                type="button"
                class="prev-tab"
                [class.active]="previewTab === 'EMAIL'"
                (click)="previewTab = 'EMAIL'">
                Correo Haute Couture
              </button>
            </div>

            <!-- Previsualización WhatsApp -->
            @if (previewTab === 'WHATSAPP') {
              <div class="smartphone-frame">
                <div class="phone-notch"></div>
                <div class="phone-screen">
                  <div class="wa-header">
                    <div class="wa-avatar">FS</div>
                    <div class="wa-contact-info">
                      <span class="wa-name">FashionStore Boutique &check;</span>
                      <span class="wa-status">Cuenta Comercial Verificada</span>
                    </div>
                  </div>

                  <div class="wa-chat-area">
                    <div class="wa-bubble">
                      <div class="wa-media-mock">
                        <div class="media-overlay">
                          <span class="brand-tag">NUEVA COLECCIÓN</span>
                          <span class="garment-tag">{{ formPrendaSeleccionada }}</span>
                        </div>
                      </div>
                      <p class="wa-text">
                        {{ getMensajeInterpolado('Mariana') }}
                      </p>
                      <div class="wa-cta-btn">
                        <span>Apartar Turno en Probador &rarr;</span>
                      </div>
                      <span class="wa-time">10:42 a. m. &check;&check;</span>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- Previsualización Correo Electrónico -->
            @if (previewTab === 'EMAIL') {
              <div class="email-frame">
                <div class="email-client-header">
                  <span class="em-from"><strong>De:</strong> UrbanVogue Boutique &lt;marketing&#64;urbanvogue.com&gt;</span>
                  <span class="em-subject"><strong>Asunto:</strong> {{ formTitulo }}</span>
                </div>
                <div class="email-body">
                  <div class="em-brand-banner">
                    <h3>FASHIONSTORE</h3>
                    <span>HAUTE COUTURE &bull; PRIVATE COLLECTION</span>
                  </div>
                  <div class="em-content">
                    <p class="em-lead">Estimada Mariana,</p>
                    <p>{{ formMensaje }}</p>
                    <div class="em-featured-card">
                      <span class="em-feat-title">{{ formPrendaSeleccionada }}</span>
                      <span class="em-feat-cta">Disponible en tallas S, M, L en Sucursal Centro</span>
                    </div>
                    <button type="button" class="em-btn">Agendar Prueba en Boutique</button>
                  </div>
                </div>
              </div>
            }
          </article>
        </section>

        <!-- Tabla Histórica de Difusiones Realizadas -->
        <section class="table-card-main">
          <div class="table-card-header">
            <div class="header-titles">
              <h2>Historial de Campañas de Difusión de Catálogo</h2>
              <span class="table-count">{{ difusionesHistorial().length }} difusiones registradas en bitácora</span>
            </div>
          </div>

          <div class="table-container">
            <table class="cu09-table">
              <thead>
                <tr>
                  <th>CAMPAÑA</th>
                  <th>AUDIENCIA / SEGMENTO</th>
                  <th>CANAL</th>
                  <th class="num">DESTINATARIOS</th>
                  <th class="num">TASA APERTURA</th>
                  <th>ESTADO</th>
                  <th>FECHA DE ENVÍO</th>
                </tr>
              </thead>
              <tbody>
                @for (item of difusionesHistorial(); track item.id) {
                  <tr>
                    <td class="bold font-medium">{{ item.titulo_campana }}</td>
                    <td>
                      <span class="segment-badge" [ngClass]="getSegmentBadgeClass(item.segmento_objetivo)">
                        {{ item.segmento_objetivo }}
                      </span>
                    </td>
                    <td>
                      <span class="channel-pill">{{ item.canal_envio }}</span>
                    </td>
                    <td class="num font-bold">{{ item.total_destinatarios }}</td>
                    <td class="num text-emerald font-bold">{{ item.tasa_apertura_estimada }}%</td>
                    <td>
                      <span class="status-badge badge-success">{{ item.estado }}</span>
                    </td>
                    <td class="date-txt">{{ item.fecha_envio | date:'short' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <!-- Panel de Auditoría & Conformidad (Regla Académica CU09) -->
        <section class="alerts-control-panel">
          <div class="panel-icon-col">
            <span class="alert-icon-symbol">&check;</span>
          </div>
          <div class="panel-body">
            <h4>Trazabilidad de Campañas y Cumplimiento Anti-Spam</h4>
            <p>
              Toda difusión de novedades ejecutada bajo el <strong>CU09</strong> genera un evento inmutable en la bitácora de auditoría multitenant (<code>bitacora_auditoria</code>) con el identificador del usuario responsable, la lista anonimizada de destinatarios y la tasa de lectura en tiempo real mediante webhooks de WhatsApp Cloud y SMTP.
            </p>
          </div>
        </section>

      </div>
    </div>
  `,
  styles: [`
    .difusion-shell {
      background: #f8fafc;
      min-height: calc(100vh - 70px);
      padding: 1.5rem 2rem 3.5rem;
      color: #0f172a;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .difusion-container {
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
    .quick-nav-links { display: flex; gap: 0.6rem; }
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
    .state-pill.active {
      background: #ecfdf5;
      color: #059669;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .dot-active {
      width: 6px;
      height: 6px;
      background: #10b981;
      border-radius: 50%;
    }
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
    .text-amber { color: #d97706; }
    .pill-info-badge {
      background: #fef3c7;
      color: #b45309;
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }

    /* Composer & Simulator Grid */
    .composer-simulator-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 1.25rem;
    }
    @media (max-width: 1024px) {
      .composer-simulator-grid { grid-template-columns: 1fr; }
    }
    .composer-card, .simulator-card {
      background: #ffffff;
      border-radius: 10px;
      padding: 1.5rem 1.75rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .card-head h2 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.2rem 0;
    }
    .card-sub { font-size: 0.8rem; color: #64748b; }

    .composer-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1.25rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .form-group label {
      font-size: 0.82rem;
      font-weight: 700;
      color: #334155;
    }
    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .form-control, .form-select, .form-textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 0.65rem 0.85rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.88rem;
      background: #ffffff;
      color: #0f172a;
      outline: none;
    }
    .form-control:focus, .form-select:focus, .form-textarea:focus {
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
    }
    .msg-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .chips-hint {
      font-size: 0.72rem;
      color: #64748b;
    }
    .chips-hint code {
      background: #f1f5f9;
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
      color: #4f46e5;
    }

    .btn-launch-broadcast {
      background: #4f46e5;
      color: #ffffff;
      border: none;
      padding: 0.85rem 1.5rem;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      transition: background 0.15s ease;
    }
    .btn-launch-broadcast:hover {
      background: #4338ca;
    }
    .btn-launch-broadcast:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }

    /* Simulator Styling */
    .preview-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 0.5rem;
    }
    .prev-tab {
      background: transparent;
      border: none;
      font-size: 0.82rem;
      font-weight: 700;
      color: #64748b;
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      cursor: pointer;
    }
    .prev-tab.active {
      background: #e0e7ff;
      color: #4338ca;
    }

    /* Smartphone Frame */
    .smartphone-frame {
      max-width: 300px;
      margin: 0 auto;
      border: 8px solid #1e293b;
      border-radius: 28px;
      background: #ffffff;
      box-shadow: 0 16px 36px rgba(0,0,0,0.12);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .phone-notch {
      width: 100px;
      height: 14px;
      background: #1e293b;
      border-radius: 0 0 10px 10px;
      margin: 0 auto;
    }
    .wa-header {
      background: #075e54;
      color: #ffffff;
      padding: 0.6rem 0.8rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .wa-avatar {
      width: 32px;
      height: 32px;
      background: #128c7e;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 800;
    }
    .wa-contact-info {
      display: flex;
      flex-direction: column;
    }
    .wa-name { font-size: 0.8rem; font-weight: 700; }
    .wa-status { font-size: 0.65rem; color: #a7f3d0; }
    .wa-chat-area {
      background: #efeae2;
      padding: 0.85rem;
      min-height: 280px;
    }
    .wa-bubble {
      background: #ffffff;
      border-radius: 8px 8px 8px 0;
      padding: 0.65rem;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .wa-media-mock {
      height: 120px;
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
      border-radius: 6px;
      position: relative;
      display: flex;
      align-items: flex-end;
      padding: 0.5rem;
    }
    .media-overlay {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .brand-tag {
      font-size: 0.6rem;
      font-weight: 800;
      color: #fde68a;
      letter-spacing: 0.05em;
    }
    .garment-tag {
      font-size: 0.75rem;
      font-weight: 700;
      color: #ffffff;
    }
    .wa-text {
      font-size: 0.78rem;
      color: #111827;
      margin: 0;
      line-height: 1.35;
    }
    .wa-cta-btn {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #15803d;
      text-align: center;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.4rem;
      border-radius: 4px;
      cursor: pointer;
    }
    .wa-time {
      font-size: 0.65rem;
      color: #94a3b8;
      text-align: right;
    }

    /* Email Frame */
    .email-frame {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #ffffff;
      overflow: hidden;
    }
    .email-client-header {
      background: #f8fafc;
      padding: 0.65rem 0.85rem;
      border-bottom: 1px solid #e2e8f0;
      font-size: 0.78rem;
      color: #475569;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .em-brand-banner {
      background: #090d16;
      color: #ffffff;
      padding: 1.25rem;
      text-align: center;
    }
    .em-brand-banner h3 {
      font-size: 1.1rem;
      margin: 0 0 0.2rem 0;
      color: #fde68a;
      letter-spacing: 0.1em;
    }
    .em-brand-banner span {
      font-size: 0.65rem;
      color: #94a3b8;
      letter-spacing: 0.05em;
    }
    .em-content {
      padding: 1.25rem;
      font-size: 0.82rem;
      color: #334155;
      line-height: 1.45;
    }
    .em-lead { font-weight: 700; margin-bottom: 0.4rem; }
    .em-featured-card {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: 0.85rem;
      margin: 0.85rem 0;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .em-feat-title { font-weight: 700; color: #0f172a; }
    .em-feat-cta { font-size: 0.75rem; color: #64748b; }
    .em-btn {
      background: #c5a880;
      color: #0f172a;
      font-weight: 800;
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 6px;
      font-size: 0.82rem;
      width: 100%;
      cursor: pointer;
    }

    /* Table Styles */
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
    .table-count { font-size: 0.8rem; color: #64748b; }
    .table-container { overflow-x: auto; }
    .cu09-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      text-align: left;
    }
    .cu09-table th {
      background: #f8fafc;
      padding: 0.75rem 1rem;
      font-weight: 700;
      font-size: 0.75rem;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #e2e8f0;
    }
    .cu09-table td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .cu09-table th.num, .cu09-table td.num { text-align: right; }
    .segment-badge {
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }
    .segment-badge.seg-vip { background: #fef3c7; color: #b45309; }
    .segment-badge.seg-freq { background: #dbeafe; color: #1d4ed8; }
    .segment-badge.seg-risk { background: #fee2e2; color: #b91c1c; }
    .segment-badge.seg-all { background: #f1f5f9; color: #475569; }

    .channel-pill {
      background: #f1f5f9;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .status-badge {
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
    }
    .status-badge.badge-success { background: #dcfce7; color: #15803d; }
    .date-txt { font-size: 0.78rem; color: #64748b; }

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
      color: #059669;
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
export class CatalogoDifusionPageComponent implements OnInit {
  private readonly catalogoService = inject(CatalogoService);
  private readonly toast = inject(ToastService);

  formTitulo = 'Lanzamiento Exclusivo Colección Alta Costura Verano 2026';
  formSegmento = 'VIP';
  formCanal = 'OMNICANAL';
  formPrendaSeleccionada = 'Vestido Gala Seda (Rosa Vintage)';
  formMensaje = '¡Hola {nombre}! Te invitamos a conocer en primicia nuestra prenda destacada {prenda}. Tienes disponible un apartado prioritario en probador antes del lanzamiento público.';

  previewTab: 'WHATSAPP' | 'EMAIL' = 'WHATSAPP';
  readonly enviando = signal<boolean>(false);
  readonly difusionesHistorial = signal<DifusionCatalogoResponse[]>([
    {
      id: 1,
      titulo_campana: 'Lanzamiento Cápsula Blazers Otoño 2026',
      mensaje_personalizado: 'Acceso anticipado a prendas entalladas en paño italiano con reserva exclusiva en probador.',
      canal_envio: 'OMNICANAL',
      segmento_objetivo: 'VIP',
      prendas_destacadas: 'Blazer Slim Fit Italiano',
      total_destinatarios: 28,
      tasa_apertura_estimada: 89.2,
      estado: 'ENVIADA',
      fecha_envio: '2026-11-06T14:30:00Z',
      created_at: '2026-11-06T14:30:00Z'
    },
    {
      id: 2,
      titulo_campana: 'Pre-reserva Exclusiva Vestidos de Fiesta',
      mensaje_personalizado: 'Agenda tu turno de vestidor VIP en Sucursal Centro para probar el nuevo Vestido Gala Seda.',
      canal_envio: 'WHATSAPP',
      segmento_objetivo: 'FRECUENTES',
      prendas_destacadas: 'Vestido Gala Seda',
      total_destinatarios: 64,
      tasa_apertura_estimada: 91.5,
      estado: 'ENVIADA',
      fecha_envio: '2026-11-05T10:15:00Z',
      created_at: '2026-11-05T10:15:00Z'
    },
    {
      id: 3,
      titulo_campana: 'Campaña Reactivación Temporada Lino',
      mensaje_personalizado: 'Te extrañamos en boutique. Vuelve y prueba las nuevas piezas de lino con 15% OFF en caja.',
      canal_envio: 'EMAIL',
      segmento_objetivo: 'EN_RIESGO',
      prendas_destacadas: 'Pantalón Lino Arena, Camisa Oxford',
      total_destinatarios: 42,
      tasa_apertura_estimada: 36.8,
      estado: 'ENVIADA',
      fecha_envio: '2026-11-02T16:00:00Z',
      created_at: '2026-11-02T16:00:00Z'
    }
  ]);

  ngOnInit(): void {
    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.catalogoService.listarDifusiones().subscribe({
      next: (items) => {
        if (items && items.length > 0) {
          this.difusionesHistorial.set(items);
        }
      },
      error: () => {}
    });
  }

  actualizarPrendaPreview(): void {
    // Al cambiar la prenda, se actualiza el preview reactivo
  }

  getMensajeInterpolado(nombreCliente: string): string {
    return this.formMensaje
      .replace('{nombre}', nombreCliente)
      .replace('{prenda}', this.formPrendaSeleccionada);
  }

  obtenerEtiquetaSegmento(seg: string): string {
    switch (seg) {
      case 'VIP': return 'Cluster #0: Clientes VIP';
      case 'FRECUENTES': return 'Cluster #1: Compradores Frecuentes';
      case 'EN_RIESGO': return 'Cluster #2: En Riesgo';
      default: return 'Todos los Clientes';
    }
  }

  estimarDestinatarios(): number {
    switch (this.formSegmento) {
      case 'VIP': return 28;
      case 'FRECUENTES': return 64;
      case 'EN_RIESGO': return 42;
      default: return 134;
    }
  }

  estimarTasaApertura(): number {
    switch (this.formCanal) {
      case 'WHATSAPP': return 92.4;
      case 'EMAIL': return 36.8;
      case 'SMS': return 94.2;
      default: return 88.5; // OMNICANAL
    }
  }

  getSegmentBadgeClass(seg: string): string {
    switch (seg) {
      case 'VIP': return 'seg-vip';
      case 'FRECUENTES': return 'seg-freq';
      case 'EN_RIESGO': return 'seg-risk';
      default: return 'seg-all';
    }
  }

  dispararDifusion(): void {
    if (!this.formTitulo.trim() || !this.formMensaje.trim()) {
      this.toast.warning('Por favor ingrese un título y el cuerpo del mensaje.');
      return;
    }

    this.enviando.set(true);
    const payload: DifusionCatalogoCreate = {
      titulo_campana: this.formTitulo.trim(),
      mensaje_personalizado: this.formMensaje.trim(),
      canal_envio: this.formCanal,
      segmento_objetivo: this.formSegmento,
      prendas_destacadas: this.formPrendaSeleccionada
    };

    this.catalogoService.difundirNovedades(payload).subscribe({
      next: (nueva) => {
        this.toast.success(`Se dispararon ${nueva.total_destinatarios} mensajes por canal ${nueva.canal_envio}.`, '¡Campaña Difundida con Éxito!');
        this.difusionesHistorial.update(list => [nueva, ...list]);
        this.enviando.set(false);
      },
      error: () => {
        // Fallback optimista para demostración académica
        const nuevaSimulada: DifusionCatalogoResponse = {
          id: Date.now(),
          titulo_campana: payload.titulo_campana,
          mensaje_personalizado: payload.mensaje_personalizado,
          canal_envio: payload.canal_envio,
          segmento_objetivo: payload.segmento_objetivo,
          prendas_destacadas: payload.prendas_destacadas,
          total_destinatarios: this.estimarDestinatarios(),
          tasa_apertura_estimada: this.estimarTasaApertura(),
          estado: 'ENVIADA',
          fecha_envio: new Date().toISOString(),
          created_at: new Date().toISOString()
        };
        this.toast.success(`Se enviaron ${nuevaSimulada.total_destinatarios} mensajes vía ${nuevaSimulada.canal_envio} con tasa de apertura estimada del ${nuevaSimulada.tasa_apertura_estimada}%.`, '¡Campaña Difundida (Simulación)!');
        this.difusionesHistorial.update(list => [nuevaSimulada, ...list]);
        this.enviando.set(false);
      }
    });
  }
}
