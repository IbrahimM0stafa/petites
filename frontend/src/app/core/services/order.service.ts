import { Injectable } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

import { ApiClientService } from './api-client.service';
import { PurchaseSessionService } from './purchase-session.service';
import { OrderResponse } from '../models/order.models';

@Injectable({
	providedIn: 'root'
})
export class OrderService {
	constructor(
		private readonly apiClient: ApiClientService,
		private readonly purchaseSession: PurchaseSessionService
	) {}

	listOrders(): Observable<OrderResponse[]> {
		return this.purchaseSession.ensureGuestSessionIfAnonymous().pipe(switchMap(() => this.apiClient.get<OrderResponse[]>('/api/orders')));
	}

	getOrder(id: string): Observable<OrderResponse> {
		return this.purchaseSession.ensureGuestSessionIfAnonymous().pipe(
			switchMap(() => this.apiClient.get<OrderResponse>(`/api/orders/${id}`))
		);
	}
}