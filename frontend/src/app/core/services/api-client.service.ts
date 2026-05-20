import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface ApiRequestOptions {
	headers?: HttpHeaders | Record<string, string | string[]>;
	params?: HttpParams | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;
	context?: HttpContext;
}

@Injectable({
	providedIn: 'root'
})
export class ApiClientService {
	constructor(private readonly httpClient: HttpClient) {}

	get<T>(path: string, options: ApiRequestOptions = {}): Observable<T> {
		return this.httpClient.get<T>(this.buildUrl(path), options);
	}

	post<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
		return this.httpClient.post<T>(this.buildUrl(path), body, options);
	}

	put<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
		return this.httpClient.put<T>(this.buildUrl(path), body, options);
	}

	patch<T>(path: string, body: unknown, options: ApiRequestOptions = {}): Observable<T> {
		return this.httpClient.patch<T>(this.buildUrl(path), body, options);
	}

	delete<T>(path: string, options: ApiRequestOptions = {}): Observable<T> {
		return this.httpClient.delete<T>(this.buildUrl(path), options);
	}

	private buildUrl(path: string): string {
		const normalizedBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');
		const normalizedPath = path.replace(/^\/+/, '');
		return `${normalizedBaseUrl}/${normalizedPath}`;
	}
}