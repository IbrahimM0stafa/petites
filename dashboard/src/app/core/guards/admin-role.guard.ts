import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { hasAdminRole } from '../auth/admin-roles';
import { AuthService } from '../services/auth.service';
import { AuthStateService } from '../services/auth-state.service';

export const adminRoleGuard: CanActivateFn = () => {
	const authState = inject(AuthStateService);
	const authService = inject(AuthService);
	const router = inject(Router);

	if (hasAdminRole(authState.roles())) {
		return true;
	}

	authService.logout();
	return router.createUrlTree(['/login'], { queryParams: { unauthorized: '1' } });
};
