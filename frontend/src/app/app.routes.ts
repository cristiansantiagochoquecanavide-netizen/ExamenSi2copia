import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'catalogo',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./dashboard/seguridad-login/login-page.component').then(m => m.LoginPageComponent)
  },
  {
    path: 'saas',
    loadComponent: () => import('./dashboard/planes-saas/saas-page.component').then(m => m.SaasPageComponent)
  },
  {
    path: 'usuarios',
    loadChildren: () => import('./dashboard/usuarios/usuarios.routes').then(m => m.USUARIOS_ROUTES)
  },
  {
    path: 'catalogo',
    loadChildren: () => import('./dashboard/catalogo-prendas/catalogo.routes').then(m => m.CATALOGO_ROUTES)
  },
  {
    path: 'inventario',
    loadChildren: () => import('./dashboard/inventario-stock/inventario.routes').then(m => m.INVENTARIO_ROUTES)
  },
  {
    path: 'reservas',
    loadChildren: () => import('./dashboard/probadores-reservas/reservas.routes').then(m => m.RESERVAS_ROUTES)
  },
  {
    path: 'ventas',
    loadChildren: () => import('./dashboard/punto-venta-pos/ventas.routes').then(m => m.VENTAS_ROUTES)
  },
  {
    path: 'ia-asistente',
    loadChildren: () => import('./dashboard/reportes-ia/ia-asistente.routes').then(m => m.IA_ASISTENTE_ROUTES)
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/reportes-ia/reportes.routes').then(m => m.REPORTES_ROUTES)
  },
  {
    path: 'ia-reportes',
    redirectTo: 'dashboard/ia-reportes',
    pathMatch: 'full'
  },
  {
    path: 'machine-learning',
    redirectTo: 'dashboard/machine-learning',
    pathMatch: 'full'
  },
  {
    path: 'reportes',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'trazabilidad',
    redirectTo: 'reservas/trazabilidad',
    pathMatch: 'full'
  },
  {
    path: 'difusion',
    redirectTo: 'catalogo/difusion',
    pathMatch: 'full'
  },
  {
    path: 'predicciones',
    redirectTo: 'dashboard/machine-learning',
    pathMatch: 'full'
  },
  {
    path: 'landing',
    loadComponent: () => import('./landing-page/landing-page.component').then(m => m.LandingPageComponent)
  },
  {
    path: '**',
    redirectTo: 'catalogo'
  }
];
