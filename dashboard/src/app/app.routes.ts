import { Routes } from '@angular/router';

export const routes: Routes = [
	{ path: '', loadComponent: () => import('./features/home/pages/home.component').then(m => m.HomeComponent) },
	// add other routes as needed (shop route removed until component exists)
];
