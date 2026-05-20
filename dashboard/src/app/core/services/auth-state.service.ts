import { Injectable, computed, signal } from '@angular/core';

import { AuthResponse } from '../models/auth.models';

interface StoredAuthSession {
	token: string | null;
	expiresAt: string | null;
	refreshToken: string | null;
	refreshExpiresAt: string | null;
	userId: string | null;
	roles: string[];
	email: string | null;
}

const AUTH_STORAGE_KEY = 'petites.admin.auth.session';

@Injectable({
	providedIn: 'root'
})
export class AuthStateService {
	private readonly authSessionState = signal<StoredAuthSession>(this.readAuthSession());

	readonly accessToken = computed(() => this.authSessionState().token);
	readonly refreshToken = computed(() => this.authSessionState().refreshToken);
	readonly userId = computed(() => this.authSessionState().userId);
	readonly email = computed(() => this.authSessionState().email);
	readonly roles = computed(() => this.authSessionState().roles);
	readonly isAuthenticated = computed(() => Boolean(this.authSessionState().token));

	setAuthSession(session: AuthResponse, email?: string): void {
		const nextSession: StoredAuthSession = {
			token: session.token,
			expiresAt: session.expiresAt,
			refreshToken: session.refreshToken,
			refreshExpiresAt: session.refreshExpiresAt,
			userId: session.userId,
			roles: [...session.roles],
			email: email ?? this.authSessionState().email
		};

		this.authSessionState.set(nextSession);
		localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
	}

	setEmail(email: string): void {
		const current = this.authSessionState();
		const nextSession: StoredAuthSession = { ...current, email };
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
			roles: [],
			email: null
		});
		localStorage.removeItem(AUTH_STORAGE_KEY);
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
				roles: [],
				email: null
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
				roles: Array.isArray(parsed.roles) ? parsed.roles : [],
				email: parsed.email ?? null
			};
		} catch {
			return {
				token: null,
				expiresAt: null,
				refreshToken: null,
				refreshExpiresAt: null,
				userId: null,
				roles: [],
				email: null
			};
		}
	}
}
