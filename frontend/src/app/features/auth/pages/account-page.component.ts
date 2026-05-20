import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { isRefreshTokenRejected, readApiErrorMessage } from '../../../core/models/api-error.model';
import { UserResponse } from '../../../core/models/user.models';
import { AuthService } from '../../../core/services/auth.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { environment } from '../../../../environments/environment';

@Component({
	selector: 'app-account-page',
	standalone: true,
	imports: [CommonModule, RouterLink],
	templateUrl: './account-page.component.html',
	styleUrl: './account-page.component.css'
})
export class AccountPageComponent implements OnInit {
	readonly isDev = !environment.production;

	user: UserResponse | null = null;
	loading = true;
	refreshTesting = false;
	errorMessage = '';
	message = '';

	get userInitials(): string {
		const name = this.user?.name?.trim();
		if (!name) {
			return 'P';
		}

		const parts = name.split(/\s+/).filter(Boolean);
		if (parts.length === 1) {
			return parts[0].slice(0, 2).toUpperCase();
		}

		return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
	}

	constructor(
		readonly authState: AuthStateService,
		private readonly authService: AuthService,
		private readonly router: Router
	) {}

	ngOnInit(): void {
		this.loadProfile();
	}

	refreshNow(): void {
		this.refreshTesting = true;
		this.errorMessage = '';
		this.message = '';

		this.authService.refreshSession().subscribe({
			next: () => {
				this.refreshTesting = false;
				this.message = 'Your session was renewed successfully.';
				this.loadProfile();
			},
			error: (error) => {
				this.refreshTesting = false;
				this.errorMessage = this.refreshErrorMessage(error);
			}
		});
	}

	simulateExpiredAccessToken(): void {
		const userId = this.authState.userId();
		if (!userId) {
			return;
		}

		this.refreshTesting = true;
		this.errorMessage = '';
		this.message = '';

		this.authState.invalidateAccessTokenForTesting();
		this.authService.getUser(userId).subscribe({
			next: (profile) => {
				this.refreshTesting = false;
				this.user = profile;
				this.message = 'Session refreshed automatically — you\'re all set.';
			},
			error: (error) => {
				this.refreshTesting = false;
				this.errorMessage = this.refreshErrorMessage(error, 'Auto-refresh failed after simulating an expired access token.');
			}
		});
	}

	private refreshErrorMessage(error: unknown, fallback = 'Refresh token request failed.'): string {
		if (isRefreshTokenRejected(error)) {
			return 'This refresh token was already used. Sign in again to get a new session.';
		}

		return readApiErrorMessage(error, fallback);
	}

	private loadProfile(): void {
		const userId = this.authState.userId();
		if (!userId) {
			this.loading = false;
			return;
		}

		this.loading = true;
		this.errorMessage = '';

		this.authService.getUser(userId).subscribe({
			next: (user) => {
				this.user = user;
				this.loading = false;
			},
			error: (error) => {
				this.errorMessage = readApiErrorMessage(error, 'Unable to load your profile.');
				this.loading = false;
			}
		});
	}

	logout(): void {
		this.authService.clearAuthSession();
		this.authService.ensureGuestSession().subscribe({
			next: async () => {
				await this.router.navigateByUrl('/');
			},
			error: async () => {
				await this.router.navigateByUrl('/');
			}
		});
	}
}
