import { Routes } from '@angular/router';
import { ParametrosModaPageComponent } from './parametros-moda-page.component';
import { GestionPrendasPageComponent } from './gestion-prendas-page.component';

export const CATALOGO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../probador-vton/catalogo-page.component').then(m => m.CatalogoPageComponent)
  },
  {
    path: 'gestion',
    component: GestionPrendasPageComponent
  },
  {
    path: 'parametros',
    component: ParametrosModaPageComponent
  },
  {
    path: 'difusion',
    loadComponent: () =>
      import('../difusion-campanas/catalogo-difusion-page.component').then(
        m => m.CatalogoDifusionPageComponent
      )
  }
];
