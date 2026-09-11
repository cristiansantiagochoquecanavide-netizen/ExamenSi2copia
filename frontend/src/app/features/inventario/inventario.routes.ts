import { Routes } from '@angular/router';
import { InventarioPageComponent } from './pages/inventario-page.component';
import { RecepcionMercaderiaPageComponent } from './pages/recepcion-mercaderia-page.component';
import { TransferenciasPageComponent } from './pages/transferencias-page.component';

export const INVENTARIO_ROUTES: Routes = [
  {
    path: '',
    component: InventarioPageComponent
  },
  {
    path: 'recepcion',
    component: RecepcionMercaderiaPageComponent
  },
  {
    path: 'transferencias',
    component: TransferenciasPageComponent
  }
];

