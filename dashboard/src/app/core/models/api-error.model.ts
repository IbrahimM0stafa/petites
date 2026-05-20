export interface ApiFieldErrors {
	[field: string]: string[];
}

export interface ApiErrorResponse {
	timestamp: string;
	status: number;
	message: string;
	fields?: Record<string, string | string[]>;
}

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
	return typeof value === 'object' && value !== null && 'message' in value && 'status' in value;
}

export function readApiErrorMessage(error: unknown, fallback = 'Request failed.'): string {
	if (isApiErrorResponse(error)) {
		return error.message || fallback;
	}

	if (typeof error === 'object' && error !== null && 'error' in error) {
		const payload = (error as { error?: unknown }).error;
		if (isApiErrorResponse(payload)) {
			return payload.message || fallback;
		}
	}

	return fallback;
}

function normalizeFieldErrors(fields: Record<string, string | string[]>): ApiFieldErrors {
	return Object.fromEntries(
		Object.entries(fields).map(([field, message]) => [field, Array.isArray(message) ? message : [message]])
	);
}

export function isRefreshTokenRejected(error: unknown): boolean {
	const message = readApiErrorMessage(error, '').toLowerCase();
	return (
		message.includes('refresh token revoked') ||
		message.includes('invalid refresh token') ||
		message.includes('refresh token expired')
	);
}

export function readApiFieldErrors(error: unknown): ApiFieldErrors | null {
	if (isApiErrorResponse(error) && error.fields) {
		return normalizeFieldErrors(error.fields);
	}

	if (typeof error === 'object' && error !== null && 'error' in error) {
		const payload = (error as { error?: unknown }).error;
		if (isApiErrorResponse(payload) && payload.fields) {
			return normalizeFieldErrors(payload.fields);
		}
	}

	return null;
}
