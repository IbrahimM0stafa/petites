export interface AuthRequest {
	email: string;
	password: string;
}

export interface AuthRefreshRequest {
	refreshToken: string;
}

export interface AuthResponse {
	token: string;
	expiresAt: string;
	refreshToken: string;
	refreshExpiresAt: string;
	userId: string;
	roles: string[];
}
