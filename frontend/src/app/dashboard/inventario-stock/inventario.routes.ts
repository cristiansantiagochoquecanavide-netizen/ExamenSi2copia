import { Routes } from '@angular/router';
import { InventarioPageComponent } from './inventario-page.component';

export const INVENTARIO_ROUTES: Routes = [
  {
    path: '',
    component: InventarioPageComponent
  },
  {
    path: 'recepcion',
    loadComponent: () => import('../traspasos-tiendas/recepcion-mercaderia-page.component').then(m => m.RecepcionMercaderiaPageComponent)
  },
  {
    path: 'transferencias',
    loadComponent: () => import('../traspasos-tiendas/transferencias-page.component').then(m => m.TransferenciasPageComponent)
  }
];
