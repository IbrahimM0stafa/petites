import { Injectable, computed, signal } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';

import { AddCartItemRequest, CartResponse, UpdateCartItemRequest } from '../models/cart.models';
import { ApiClientService } from './api-client.service';
import { PurchaseSessionService } from './purchase-session.service';

@Injectable({
	providedIn: 'root'
})
export class CartService {
	private readonly cartState = signal<CartResponse | null>(null);

	readonly cart = this.cartState.asReadonly();
	readonly itemCount = computed(() => this.cartState()?.items.reduce((total, item) => total + item.quantity, 0) ?? 0);

	constructor(
		private readonly apiClient: ApiClientService,
		private readonly purchaseSession: PurchaseSessionService
	) {}

	loadCart(): Observable<CartResponse> {
		return this.withSession(() => this.apiClient.get<CartResponse>('/api/cart')).pipe(tap((cart) => this.cartState.set(cart)));
	}

	addItem(request: AddCartItemRequest): Observable<CartResponse> {
		return this.withSession(() => this.apiClient.post<CartResponse>('/api/cart/items', request)).pipe(
			tap((cart) => this.cartState.set(cart))
		);
	}

	updateItem(itemId: string, request: UpdateCartItemRequest): Observable<CartResponse> {
		return this.withSession(() => this.apiClient.put<CartResponse>(`/api/cart/items/${itemId}`, request)).pipe(
			tap((cart) => this.cartState.set(cart))
		);
	}

	removeItem(itemId: string): Observable<CartResponse> {
		return this.withSession(() => this.apiClient.delete<CartResponse>(`/api/cart/items/${itemId}`)).pipe(
			tap((cart) => this.cartState.set(cart))
		);
	}

	clearCart(): Observable<CartResponse> {
		return this.withSession(() => this.apiClient.delete<CartResponse>('/api/cart/items')).pipe(
			tap((cart) => this.cartState.set(cart))
		);
	}

	clearCartState(): void {
		this.cartState.set(null);
	}

	private withSession<T>(requestFactory: () => Observable<T>): Observable<T> {
		return this.purchaseSession.ensureGuestSessionIfAnonymous().pipe(switchMap(() => requestFactory()));
	}
}