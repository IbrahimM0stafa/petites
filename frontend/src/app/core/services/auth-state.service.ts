import { Injectable, computed, signal } from '@angular/core';

import { AuthResponse } from '../models/auth.models';
import { GuestSessionResponse } from '../models/guest-session.models';

interface StoredAuthSession {
	token: string | null;
	expiresAt: string | null;
	refreshToken: string | null;
	refreshExpiresAt: string | null;
	userId: string | null;
	roles: string[];
}

interface StoredGuestSession {
	sessionToken: string | null;
	expiresAt: string | null;
}

const AUTH_STORAGE_KEY = 'petites.auth.session';
const GUEST_STORAGE_KEY = 'petites.guest.session';

@Injectable({
	providedIn: 'root'
})
export class AuthStateService {
	private readonly authSessionState = signal<StoredAuthSession>(this.readAuthSession());
	private readonly guestSessionState = signal<StoredGuestSession>(this.readGuestSession());

	private readonly hasValidAccessToken = computed(() => {
		const token = this.authSessionState().token;
		if (!token) {
			return false;
		}

		return !this.isExpired(this.authSessionState().expiresAt);
	});

	readonly accessToken = computed(() => (this.hasValidAccessToken() ? this.authSessionState().token : null));
	readonly refreshToken = computed(() => this.authSessionState().refreshToken);
	readonly userId = computed(() => (this.hasValidAccessToken() ? this.authSessionState().userId : null));
	readonly roles = computed(() => (this.hasValidAccessToken() ? this.authSessionState().roles : []));
	readonly isAuthenticated = computed(() => this.hasValidAccessToken());
	readonly guestSessionToken = computed(() => this.guestSessionState().sessionToken);
	readonly guestSessionExpiresAt = computed(() => this.guestSessionState().expiresAt);
	readonly accessTokenExpiresAt = computed(() => this.authSessionState().expiresAt);
	readonly refreshTokenExpiresAt = computed(() => this.authSessionState().refreshExpiresAt);

	invalidateAccessTokenForTesting(): void {
		const current = this.authSessionState();
		if (!current.refreshToken) {
			return;
		}

		const nextSession: StoredAuthSession = {
			...current,
			token: 'expired-access-token-for-testing'
		};

		this.authSessionState.set(nextSession);
		localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
	}

	setAuthSession(session: AuthResponse): void {
		const nextSession: StoredAuthSession = {
			token: session.token,
			expiresAt: session.expiresAt,
			refreshToken: session.refreshToken,
			refreshExpiresAt: session.refreshExpiresAt,
			userId: session.userId,
			roles: [...session.roles]
		};

		this.authSessionState.set(nextSession);
		localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
	}

	clearAuthSession(): void {
		this.authSessionState.set({
			token: null,
			expiresAt: null,
			refreshToken: null,
			refreshExpiresAt: null,
			userId: null,
			roles: []
		});
		localStorage.removeItem(AUTH_STORAGE_KEY);
	}

	setGuestSession(session: GuestSessionResponse): void {
		const nextSession: StoredGuestSession = {
			sessionToken: session.sessionToken,
			expiresAt: session.expiresAt
		};

		this.guestSessionState.set(nextSession);
		sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(nextSession));
	}

	clearGuestSession(): void {
		this.guestSessionState.set({ sessionToken: null, expiresAt: null });
		sessionStorage.removeItem(GUEST_STORAGE_KEY);
	}

	private readAuthSession(): StoredAuthSession {
		const rawValue = localStorage.getItem(AUTH_STORAGE_KEY);

		if (!rawValue) {
			return {
				token: null,
				expiresAt: null,
				refreshToken: null,
				refreshExpiresAt: null,
				userId: null,
				roles: []
			};
		}

		try {
			const parsed = JSON.parse(rawValue) as StoredAuthSession;
			return {
				token: parsed.token ?? null,
				expiresAt: parsed.expiresAt ?? null,
				refreshToken: parsed.refreshToken ?? null,
				refreshExpiresAt: parsed.refreshExpiresAt ?? null,
				userId: parsed.userId ?? null,
				roles: Array.isArray(parsed.roles) ? parsed.roles : []
			};
		} catch {
			return {
				token: null,
				expiresAt: null,
				refreshToken: null,
				refreshExpiresAt: null,
				userId: null,
				roles: []
			};
		}
	}

	private isExpired(expiresAt: string | null): boolean {
		if (!expiresAt) {
			return true;
		}

		const timestamp = Date.parse(expiresAt);
		if (Number.isNaN(timestamp)) {
			return true;
		}

		return timestamp <= Date.now();
	}

	private readGuestSession(): StoredGuestSession {
		const rawValue = sessionStorage.getItem(GUEST_STORAGE_KEY);

		if (!rawValue) {
			return { sessionToken: null, expiresAt: null };
		}

		try {
			const parsed = JSON.parse(rawValue) as StoredGuestSession;
			return {
				sessionToken: parsed.sessionToken ?? null,
				expiresAt: parsed.expiresAt ?? null
			};
		} catch {
			return { sessionToken: null, expiresAt: null };
		}
	}
}