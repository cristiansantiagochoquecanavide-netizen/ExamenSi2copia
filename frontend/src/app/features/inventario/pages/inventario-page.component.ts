import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventarioService } from '../services/inventario.service';

@Component({
  selector: 'app-inventario-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="feature-container">
      <div class="header-section">
        <h2 class="editorial-heading">Inventario</h2>
        <p class="subtitle">Stock multitienda, gestion de sucursales, proveedores y movimientos</p>
      </div>
      <div class="status-card">
        <span class="status-indicator">MODULO CARGADO VIA LAZY LOADING</span>
        <p>Estado de sincronizacion con el backend FastAPI: <strong>{{ domainStatus() }}</strong></p>
      </div>
    </div>
  `,
  styles: [`
    .feature-container {
      padding: 1rem 0;
    }
    .editorial-heading {
      font-size: 2.2rem;
      margin-bottom: 0.5rem;
      color: var(--color-primary);
    }
    .subtitle {
      color: var(--color-on-surface-muted);
      font-size: 0.95rem;
      margin-bottom: 2rem;
    }
    .status-card {
      background: var(--color-surface);
      border: var(--border-hairline);
      padding: 1.5rem;
      max-width: 600px;
    }
    .status-indicator {
      display: inline-block;
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      color: var(--color-gold);
      border: 1px solid var(--color-gold);
      padding: 2px 8px;
      margin-bottom: 0.75rem;
    }
  `]
})
export class InventarioPageComponent implements OnInit {
  private readonly service = inject(InventarioService);
  domainStatus = signal<string>('Inicializando...');

  ngOnInit(): void {
    this.service.getStatus().subscribe({
      next: (res: any) => this.domainStatus.set(res.message || 'Operativo'),
      error: () => this.domainStatus.set('Pendiente de conexion con backend')
    });
  }
}
