import { Routes } from '@angular/router';
import { ReservasPageComponent } from './pages/reservas-page.component';
import { ReservasGestionPageComponent } from './pages/reservas-gestion-page.component';

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
      import('./pages/reserva-trazabilidad-page.component').then(
        m => m.ReservaTrazabilidadPageComponent
      )
  }
];
