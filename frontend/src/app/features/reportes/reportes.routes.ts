import { Routes } from '@angular/router';

export const REPORTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/reportes-dashboard-page.component').then(
        m => m.ReportesDashboardPageComponent
      )
  },
  {
    path: 'ia-reportes',
    loadComponent: () =>
      import('./pages/ai-report-assistant-page.component').then(
        m => m.AiReportAssistantComponent
      )
  },
  {
    path: 'machine-learning',
    loadComponent: () =>
      import('./pages/ml-dashboard-page.component').then(
        m => m.MlDashboardComponent
      )
  }
];
