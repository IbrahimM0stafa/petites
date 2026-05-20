export interface GuestSessionCreateRequest {
	expiresAt?: string;
}

export interface GuestSessionResponse {
	id: string;
	sessionToken: string;
	expiresAt: string;
	createdAt: string;
}