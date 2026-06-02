import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/orders-list.component').then((m) => m.OrdersListComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/order-detail.component').then((m) => m.OrderDetailComponent)
  }
];
