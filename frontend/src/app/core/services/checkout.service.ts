import { Injectable } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';

import { CheckoutRequest, CheckoutResponse } from '../models/order.models';
import { ApiClientService } from './api-client.service';
import { CartService } from './cart.service';
import { PurchaseSessionService } from './purchase-session.service';

@Injectable({
	providedIn: 'root'
})
export class CheckoutService {
	constructor(
		private readonly apiClient: ApiClientService,
		private readonly cartService: CartService,
		private readonly purchaseSession: PurchaseSessionService
	) {}

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