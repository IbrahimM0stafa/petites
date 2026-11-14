import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';

import { AuthService } from './auth.service';
import { AuthStateService } from './auth-state.service';

@Injectable({
	providedIn: 'root'
})
export class PurchaseSessionService {
	private readonly authService = inject(AuthService);
	private readonly authState = inject(AuthStateService);

	ensureGuestSessionIfAnonymous(): Observable<void> {
		if (this.authState.isAuthenticated()) {
			return of(void 0);
		}

		return this.authService.ensureGuestSession().pipe(map(() => void 0));
	}
}