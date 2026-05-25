import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
	{ path: '', loadComponent: () => import('./features/home/pages/home.component').then((m) => m.HomeComponent) },
	{ path: 'login', loadComponent: () => import('./features/auth/pages/login-page.component').then((m) => m.LoginPageComponent) },
	{ path: 'signup', loadComponent: () => import('./features/auth/pages/signup-page.component').then((m) => m.SignupPageComponent) },
	{ path: 'shop', loadComponent: () => import('./features/shop/pages/shop-page.component').then((m) => m.ShopPageComponent) },
	{ path: 'products/:id', loadComponent: () => import('./features/shop/pages/product-detail/product-detail.component').then((m) => m.ProductDetailComponent) },
	{ path: 'cart', loadComponent: () => import('./features/cart/pages/cart-page.component').then((m) => m.CartPageComponent) },
	{ path: 'checkout', loadComponent: () => import('./features/checkout/pages/checkout-page.component').then((m) => m.CheckoutPageComponent) },
	{ path: 'orders', loadComponent: () => import('./features/orders/pages/orders-page.component').then((m) => m.OrdersPageComponent) },
	{ path: 'orders/:id', loadComponent: () => import('./features/orders/pages/orders-page.component').then((m) => m.OrdersPageComponent) },
	{
		path: 'account',
		canActivate: [authGuard],
		loadComponent: () => import('./features/auth/pages/account-page.component').then((m) => m.AccountPageComponent)
	},
	{ path: '**', redirectTo: '' }
];
