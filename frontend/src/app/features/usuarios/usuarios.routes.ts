import { Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login-page.component';
import { RolesPageComponent } from './pages/roles-page.component';
import { UsuariosPageComponent } from './pages/usuarios-page.component';
import { AuditoriaPageComponent } from './pages/auditoria-page.component';

export const USUARIOS_ROUTES: Routes = [
  {
    path: '',
    component: UsuariosPageComponent
  },
  {
    path: 'login',
    component: LoginPageComponent
  },
  {
    path: 'roles',
    component: RolesPageComponent
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
    component: AuditoriaPageComponent
  }
];
