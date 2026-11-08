import { Routes } from '@angular/router';

export const REPORTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./reportes-dashboard-page.component').then(
        m => m.ReportesDashboardPageComponent
      )
  },
  {
    path: 'ia-reportes',
    loadComponent: () =>
      import('./ai-report-assistant-page.component').then(
        m => m.AiReportAssistantComponent
      )
  },
  {
    path: 'machine-learning',
    loadComponent: () =>
      import('../predicciones-ml/ml-dashboard-page.component').then(
        m => m.MlDashboardComponent
      )
  }
];
