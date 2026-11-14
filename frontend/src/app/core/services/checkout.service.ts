import { Injectable, inject } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';

import { CheckoutRequest, CheckoutResponse } from '../models/order.models';
import { ApiClientService } from './api-client.service';
import { CartService } from './cart.service';
import { PurchaseSessionService } from './purchase-session.service';

@Injectable({
	providedIn: 'root'
})
export class CheckoutService {
	private readonly apiClient = inject(ApiClientService);
	private readonly cartService = inject(CartService);
	private readonly purchaseSession = inject(PurchaseSessionService);

	submitCheckout(request: CheckoutRequest): Observable<CheckoutResponse> {
		const payload: CheckoutRequest = {
			...request,
			orderType: request.orderType ?? 'DELIVERY'
		};

		return this.purchaseSession.ensureGuestSessionIfAnonymous().pipe(
			switchMap(() => this.apiClient.post<CheckoutResponse>('/api/checkout', payload)),
			tap(() => this.cartService.clearCartState())
		);
	}
}