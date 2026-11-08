import { Routes } from '@angular/router';
import { ReservasPageComponent } from './reservas-page.component';
import { ReservasGestionPageComponent } from './reservas-gestion-page.component';

export const RESERVAS_ROUTES: Routes = [
  {
    path: '',
    component: ReservasPageComponent
  },
  {
    path: 'gestion',
    component: ReservasGestionPageComponent
  },
  {
    path: 'trazabilidad',
    loadComponent: () =>
      import('../trazabilidad-reservas/reserva-trazabilidad-page.component').then(
        m => m.ReservaTrazabilidadPageComponent
      )
  }
];
