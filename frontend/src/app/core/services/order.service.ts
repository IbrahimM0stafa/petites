import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

import { ApiClientService } from './api-client.service';
import { PurchaseSessionService } from './purchase-session.service';
import { OrderResponse } from '../models/order.models';

@Injectable({
	providedIn: 'root'
})
export class OrderService {
	private readonly apiClient = inject(ApiClientService);
	private readonly purchaseSession = inject(PurchaseSessionService);

	listOrders(): Observable<OrderResponse[]> {
		return this.purchaseSession.ensureGuestSessionIfAnonymous().pipe(switchMap(() => this.apiClient.get<OrderResponse[]>('/api/orders')));
	}

	getOrder(id: string): Observable<OrderResponse> {
		return this.purchaseSession.ensureGuestSessionIfAnonymous().pipe(
			switchMap(() => this.apiClient.get<OrderResponse>(`/api/orders/${id}`))
		);
	}
}