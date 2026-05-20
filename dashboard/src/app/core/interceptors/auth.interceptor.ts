import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { SKIP_AUTH_HEADER, SKIP_AUTH_REFRESH } from '../http/http-context.tokens';
import { AuthService } from '../services/auth.service';
import { AuthStateService } from '../services/auth-state.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
	const authState = inject(AuthStateService);
	const authService = inject(AuthService);
	const skipAuthHeader = request.context.get(SKIP_AUTH_HEADER);
	const skipAuthRefresh = request.context.get(SKIP_AUTH_REFRESH);
	const accessToken = authState.accessToken();

	let outgoingRequest = request;

	if (!skipAuthHeader && accessToken) {
		outgoingRequest = outgoingRequest.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } });
	}

	return next(outgoingRequest).pipe(
		catchError((error: unknown) => {
			const shouldAttemptRefresh =
				error instanceof HttpErrorResponse &&
				(error.status === 401 || error.status === 403) &&
				!skipAuthRefresh &&
				!skipAuthHeader &&
				Boolean(authState.refreshToken());

			if (shouldAttemptRefresh) {
				return authService.refreshSession().pipe(
					switchMap((session) => {
						const retryRequest = request.clone({
							context: request.context.set(SKIP_AUTH_REFRESH, true),
							setHeaders: { Authorization: `Bearer ${session.token}` }
						});

						return next(retryRequest);
					})
				);
			}

			return throwError(() => error);
		})
	);
};
