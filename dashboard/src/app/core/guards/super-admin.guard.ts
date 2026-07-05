import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStateService } from '../services/auth-state.service';

export const superAdminGuard: CanActivateFn = () => {
	const authState = inject(AuthStateService);
	const router = inject(Router);

	if (authState.isAuthenticated() && authState.roles().includes('SUPER_ADMIN')) {
		return true;
	}

	return router.createUrlTree(['/']);
};
