import { Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login-page.component';
import { UsuariosPageComponent } from './pages/usuarios-page.component';

export const USUARIOS_ROUTES: Routes = [
  {
    path: '',
    component: LoginPageComponent
  },
  {
    path: 'login',
    component: LoginPageComponent
  },
  {
    path: 'admin',
    component: UsuariosPageComponent
  }
];
