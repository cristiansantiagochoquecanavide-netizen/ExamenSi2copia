import { Routes } from '@angular/router';
import { CatalogoPageComponent } from './pages/catalogo-page.component';
import { ParametrosModaPageComponent } from './pages/parametros-moda-page.component';
import { GestionPrendasPageComponent } from './pages/gestion-prendas-page.component';

export const CATALOGO_ROUTES: Routes = [
  {
    path: '',
    component: CatalogoPageComponent
  },
  {
    path: 'gestion',
    component: GestionPrendasPageComponent
  },
  {
    path: 'parametros',
    component: ParametrosModaPageComponent
  }
];

