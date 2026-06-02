import { HttpErrorResponse } from '@angular/common/http';

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

function readApiErrorMessageUnsafe(error: unknown): string | null {
	// If this is an Angular HttpErrorResponse prefer the server-provided body
	// (error.error) before falling back to the interceptor's generic message.
	if (error instanceof HttpErrorResponse) {
		const payload = error.error;
		if (isApiErrorResponse(payload)) {
			return typeof payload.message === 'string' ? payload.message : null;
		}
		if (typeof payload === 'string') {
			return payload;
		}
		if (typeof payload === 'object' && payload !== null && 'message' in payload) {
			const msg = (payload as { message?: unknown }).message;
			return typeof msg === 'string' ? msg : null;
		}

		// Do not return HttpErrorResponse.message here because it is usually a
		// generic Angular string like "Http failure response for...".
		return null;
	}

	if (isApiErrorResponse(error)) {
		return typeof error.message === 'string' ? error.message : null;
	}

	if (typeof error === 'object' && error !== null && 'error' in error) {
		const payload = (error as { error?: unknown }).error;
		if (isApiErrorResponse(payload)) {
			return typeof payload.message === 'string' ? payload.message : null;
		}
		if (typeof payload === 'string') {
			return payload;
		}
	}

	return null;
}

function isCustomerFriendlyMessage(message: string): boolean {
	const normalized = message.trim().toLowerCase();
	if (!normalized) {
		return false;
	}

	return !(
		normalized === 'error' ||
		/^\d{3}$/.test(normalized) ||
		normalized.includes('http failure response') ||
		normalized.includes('status code') ||
		normalized.includes('status:')
	);
}

function readHttpStatusMessage(error: unknown, fallback: string): string | null {
	const status =
		error instanceof HttpErrorResponse
			? error.status
			: typeof error === 'object' && error !== null && 'status' in error
				? Number((error as { status?: unknown }).status)
				: NaN;

	if (!Number.isFinite(status)) {
		return null;
	}

	switch (status) {
		case 0:
			return 'We could not reach the server. Check your connection and try again.';
		case 400:
			return 'We could not process that request. Please check your details and try again.';
		case 401:
			return 'Please sign in again to continue.';
		case 403:
			return 'You do not have permission to do that.';
		case 404:
			return 'We could not find what you were looking for.';
		case 409:
			return 'That change could not be completed because of a conflict. Please try again.';
		case 422:
			return 'Please review the highlighted details and try again.';
		case 429:
			return 'You are doing that too quickly. Please try again in a moment.';
		default:
			return status >= 500
				? 'Something went wrong on our side. Please try again shortly.'
				: fallback;
	}
}

export function readApiErrorMessage(error: unknown, fallback = 'Request failed.'): string {
	const message = readApiErrorMessageUnsafe(error);
	if (message && isCustomerFriendlyMessage(message)) {
		return message;
	}

	return readHttpStatusMessage(error, fallback) ?? fallback;
}

function normalizeFieldErrors(fields: Record<string, string | string[]>): ApiFieldErrors {
	return Object.fromEntries(
		Object.entries(fields).map(([field, message]) => [field, Array.isArray(message) ? message : [message]])
	);
}

export function isRefreshTokenRejected(error: unknown): boolean {
	const message = (readApiErrorMessageUnsafe(error) ?? '').toLowerCase();
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