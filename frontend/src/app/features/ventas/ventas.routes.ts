import { Routes } from '@angular/router';
import { VentasPosPageComponent } from './pages/ventas-pos-page.component';
import { DevolucionesPageComponent } from './pages/devoluciones-page.component';
import { PagosPageComponent } from './pages/pagos-page.component';

export const VENTAS_ROUTES: Routes = [
  {
    path: '',
    component: VentasPosPageComponent
  },
  {
    path: 'devoluciones',
    component: DevolucionesPageComponent
  },
  {
    path: 'pagos',
    component: PagosPageComponent
  }
];
