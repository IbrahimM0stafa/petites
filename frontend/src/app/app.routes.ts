import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
	{ path: '', loadComponent: () => import('./features/home/pages/home.component').then((m) => m.HomeComponent) },
	{ path: 'login', loadComponent: () => import('./features/auth/pages/login-page.component').then((m) => m.LoginPageComponent) },
	{ path: 'signup', loadComponent: () => import('./features/auth/pages/signup-page.component').then((m) => m.SignupPageComponent) },
	{
		path: 'account',
		canActivate: [authGuard],
		loadComponent: () => import('./features/auth/pages/account-page.component').then((m) => m.AccountPageComponent)
	},
	{ path: '**', redirectTo: '' }
];
