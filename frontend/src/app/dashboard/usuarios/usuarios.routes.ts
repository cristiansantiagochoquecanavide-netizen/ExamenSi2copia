import { Routes } from '@angular/router';
import { UsuariosPageComponent } from './usuarios-page.component';

export const USUARIOS_ROUTES: Routes = [
  {
    path: '',
    component: UsuariosPageComponent
  },
  {
    path: 'login',
    loadComponent: () => import('../seguridad-login/login-page.component').then(m => m.LoginPageComponent)
  },
  {
    path: 'roles',
    loadComponent: () => import('../roles/roles-page.component').then(m => m.RolesPageComponent)
  },
  {
    path: 'gestion',
    component: UsuariosPageComponent
  },
  {
    path: 'admin',
    component: UsuariosPageComponent
  },
  {
    path: 'auditoria',
    loadComponent: () => import('../bitacora/auditoria-page.component').then(m => m.AuditoriaPageComponent)
  }
];
