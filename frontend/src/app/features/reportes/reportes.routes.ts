import { Routes } from '@angular/router';

export const REPORTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/reportes-dashboard-page.component').then(
        m => m.ReportesDashboardPageComponent
      )
  }
];
