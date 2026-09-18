import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'catalogo',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/usuarios/pages/login-page.component').then(m => m.LoginPageComponent)
  },
  {
    path: 'usuarios',
    loadChildren: () => import('./features/usuarios/usuarios.routes').then(m => m.USUARIOS_ROUTES)
  },
  {
    path: 'catalogo',
    loadChildren: () => import('./features/catalogo/catalogo.routes').then(m => m.CATALOGO_ROUTES)
  },
  {
    path: 'inventario',
    loadChildren: () => import('./features/inventario/inventario.routes').then(m => m.INVENTARIO_ROUTES)
  },
  {
    path: 'reservas',
    loadChildren: () => import('./features/reservas/reservas.routes').then(m => m.RESERVAS_ROUTES)
  },
  {
    path: 'ventas',
    loadChildren: () => import('./features/ventas/ventas.routes').then(m => m.VENTAS_ROUTES)
  },
  {
    path: 'ia-asistente',
    loadChildren: () => import('./features/ia-asistente/ia-asistente.routes').then(m => m.IA_ASISTENTE_ROUTES)
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./features/reportes/reportes.routes').then(m => m.REPORTES_ROUTES)
  },
  {
    path: 'reportes',
    redirectTo: 'dashboard',
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
