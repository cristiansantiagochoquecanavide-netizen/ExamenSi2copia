import { Routes } from '@angular/router';
import { VentasPosPageComponent } from './ventas-pos-page.component';

export const VENTAS_ROUTES: Routes = [
  {
    path: '',
    component: VentasPosPageComponent
  },
  {
    path: 'pos',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'checkout',
    loadComponent: () => import('../checkout-ecommerce/checkout-ecommerce-page.component').then(m => m.CheckoutEcommercePageComponent)
  },
  {
    path: 'promociones',
    loadComponent: () => import('../checkout-ecommerce/promociones-page.component').then(m => m.PromocionesPageComponent)
  },
  {
    path: 'devoluciones',
    loadComponent: () => import('../devoluciones-garantias/devoluciones-page.component').then(m => m.DevolucionesPageComponent)
  },
  {
    path: 'pagos',
    loadComponent: () => import('../checkout-ecommerce/pagos-page.component').then(m => m.PagosPageComponent)
  }
];
