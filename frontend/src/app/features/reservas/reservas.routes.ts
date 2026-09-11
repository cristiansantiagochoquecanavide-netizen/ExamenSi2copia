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
  }
];

