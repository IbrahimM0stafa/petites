import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/coupons-list.component').then((m) => m.CouponsListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./pages/coupon-form.component').then((m) => m.CouponFormComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./pages/coupon-form.component').then((m) => m.CouponFormComponent)
  }
];
