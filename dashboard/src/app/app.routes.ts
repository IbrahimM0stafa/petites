import { Routes } from '@angular/router';

import { adminRoleGuard } from './core/guards/admin-role.guard';
import { authGuard } from './core/guards/auth.guard';
import { superAdminGuard } from './core/guards/super-admin.guard';

export const routes: Routes = [
	{
		path: 'login',
		loadComponent: () => import('./features/auth/pages/login-page.component').then((m) => m.LoginPageComponent)
	},
	{
		path: 'forgot-password',
		loadComponent: () => import('./features/auth/pages/forgot-password-page.component').then((m) => m.ForgotPasswordPageComponent)
	},
	{
		path: '',
		canActivate: [authGuard, adminRoleGuard],
		loadComponent: () => import('./layout/admin-shell/admin-shell.component').then((m) => m.AdminShellComponent),
		children: [
			{
				path: '',
				loadComponent: () =>
					import('./features/dashboard/pages/overview.component').then((m) => m.OverviewComponent)
			},
			{
				path: 'orders',
				loadChildren: () =>
					import('./features/orders/orders.routes').then((m) => m.routes)
			},
			{
				path: 'coupons',
				loadChildren: () =>
					import('./features/coupons/coupons.routes').then((m) => m.routes)
			},
			{
				path: 'users',
				canActivate: [superAdminGuard],
				loadComponent: () =>
					import('./features/users/pages/users-list.component').then((m) => m.UsersListComponent)
			},
			{
				path: 'users/new',
				canActivate: [superAdminGuard],
				loadComponent: () =>
					import('./features/users/pages/user-create.component').then((m) => m.UserCreateComponent)
			},
			{
				path: 'users/:id',
				canActivate: [superAdminGuard],
				loadComponent: () =>
					import('./features/users/pages/user-detail.component').then((m) => m.UserDetailComponent)
			},
			{
				path: 'categories',
				loadChildren: () =>
					import('./features/categories/categories.routes').then((m) => m.routes)
			},
			{
				path: 'products',
				loadChildren: () =>
					import('./features/products/products.routes').then((m) => m.routes)
			},
			{
				path: 'settings',
				loadComponent: () =>
					import('./features/settings/pages/settings.component').then((m) => m.SettingsComponent)
			}
		]
	},
	{ path: '**', redirectTo: '' }
];
