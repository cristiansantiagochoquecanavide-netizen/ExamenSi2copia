import { Routes } from '@angular/router';
import { CatalogoPageComponent } from './pages/catalogo-page.component';
import { ParametrosModaPageComponent } from './pages/parametros-moda-page.component';

export const CATALOGO_ROUTES: Routes = [
  {
    path: '',
    component: CatalogoPageComponent
  },
  {
    path: 'parametros',
    component: ParametrosModaPageComponent
  }
];

