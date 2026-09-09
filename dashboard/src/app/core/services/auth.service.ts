import { HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, finalize, shareReplay, tap, throwError } from 'rxjs';

import { isRefreshTokenRejected } from '../models/api-error.model';
import { SKIP_AUTH_HEADER, SKIP_AUTH_REFRESH } from '../http/http-context.tokens';
import { AuthRefreshRequest, AuthRequest, AuthResponse } from '../models/auth.models';
import { PaginatedResponse } from '../models/paginated-response.model';
import { UserResponse, UserUpdateRequest } from '../models/user.models';
import { ApiClientService } from './api-client.service';
import { AuthStateService } from './auth-state.service';

@Injectable({
	providedIn: 'root'
})
export class AuthService {
	private refreshSessionRequest?: Observable<AuthResponse>;

	constructor(
		private readonly apiClient: ApiClientService,
		private readonly authState: AuthStateService
	) {}

	login(request: AuthRequest): Observable<AuthResponse> {
		return this.apiClient.post<AuthResponse>('/api/auth/login', request, { context: this.publicContext() }).pipe(
			tap((session) => {
				this.authState.setAuthSession(session, request.email);
			})
		);
	}

	refreshSession(): Observable<AuthResponse> {
		if (this.refreshSessionRequest) {
			return this.refreshSessionRequest;
		}

		const refreshToken = this.authState.refreshToken() ?? '';
		if (!refreshToken) {
			return throwError(() => new Error('Missing refresh token.'));
		}

		const request: AuthRefreshRequest = { refreshToken };
		this.refreshSessionRequest = this.apiClient
			.post<AuthResponse>('/api/auth/refresh', request, { context: this.publicContext() })
			.pipe(
				tap((session) => this.authState.setAuthSession(session)),
				catchError((error) => {
					if (this.isRefreshTokenRejected(error)) {
						this.authState.clearAuthSession();
					}

					return throwError(() => error);
				}),
				finalize(() => {
					this.refreshSessionRequest = undefined;
				}),
				shareReplay({ bufferSize: 1, refCount: false })
			);

		return this.refreshSessionRequest;
	}

	listUsers(params: {
		name?: string;
		role?: string;
		page?: number;
		size?: number;
		sort?: string;
	} = {}): Observable<PaginatedResponse<UserResponse>> {
		const query: Record<string, string | number> = {
			page: params.page ?? 0,
			size: params.size ?? 10,
			sort: params.sort ?? 'name,asc'
		};
		if (params.name) query['name'] = params.name;
		if (params.role) query['role'] = params.role;
		return this.apiClient.get<PaginatedResponse<UserResponse>>('/api/users', { params: query });
	}

	createAdminUser(request: any): Observable<UserResponse> {
		return this.apiClient.post<UserResponse>('/api/users/admin', request);
	}

	assignRoleByEmail(email: string, role: string): Observable<UserResponse> {
		return this.apiClient.post<UserResponse>('/api/users/admin/assign-role', { email, role });
	}

	getUser(id: string): Observable<UserResponse> {
		return this.apiClient.get<UserResponse>(`/api/users/${id}`);
	}

	updateUser(id: string, request: UserUpdateRequest): Observable<UserResponse> {
		return this.apiClient.put<UserResponse>(`/api/users/${id}`, request);
	}

	deactivateUser(id: string): Observable<UserResponse> {
		return this.apiClient.patch<UserResponse>(`/api/users/${id}/deactivate`, {});
	}

	reactivateUser(id: string): Observable<UserResponse> {
		return this.apiClient.patch<UserResponse>(`/api/users/${id}/reactivate`, {});
	}

	logout(): void {
		this.authState.clearAuthSession();
	}

	forgotPassword(email: string): Observable<{ message: string }> {
		return this.apiClient.post<{ message: string }>('/api/auth/forgot-password', { email }, { context: this.publicContext() });
	}

	verifyOtp(email: string, otp: string): Observable<{ success: boolean; message: string }> {
		return this.apiClient.post<{ success: boolean; message: string }>('/api/auth/verify-otp', { email, otp }, { context: this.publicContext() });
	}

	resetPassword(email: string, otp: string, newPassword: string): Observable<{ success: boolean; message: string }> {
		return this.apiClient.post<{ success: boolean; message: string }>('/api/auth/reset-password', { email, otp, newPassword }, { context: this.publicContext() });
	}

	private isRefreshTokenRejected(error: unknown): boolean {
		return isRefreshTokenRejected(error);
	}

	private publicContext(): HttpContext {
		return new HttpContext().set(SKIP_AUTH_HEADER, true).set(SKIP_AUTH_REFRESH, true);
	}
}
