import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, Subscription, takeUntil } from 'rxjs';

import { readApiErrorMessage } from '../../../core/models/api-error.model';
import { LoyaltyService } from '../../../core/services/loyalty.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { formatAddressShort } from '../../../core/models/address.models';
import { OrderResponse } from '../../../core/models/order.models';
import { OrderService } from '../../../core/services/order.service';
import { CustomerWebSocketService } from '../../../core/services/websocket.service';

@Component({
	selector: 'app-orders-page',
	standalone: true,
	imports: [CommonModule, RouterLink],
	templateUrl: './orders-page.component.html',
	styleUrl: './orders-page.component.css'
})
export class OrdersPageComponent implements OnInit, OnDestroy {
	private readonly route = inject(ActivatedRoute);
	private readonly orderService = inject(OrderService);
	private readonly loyaltyService = inject(LoyaltyService);
	readonly authState = inject(AuthStateService);
	readonly webSocketService = inject(CustomerWebSocketService);
	readonly formatAddressShort = formatAddressShort;

	private readonly destroy$ = new Subject<void>();
	private currentOrderWatchSub: Subscription | null = null;

	loading = true;
	detailLoading = false;
	errorMessage = '';
	orders: OrderResponse[] = [];
	selectedOrder: OrderResponse | null = null;

	ngOnInit(): void {
		this.loadOrders();
		this.setupCustomerRealtimeListener();

		this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
			const orderId = params.get('id');
			if (orderId) {
				this.loadOrder(orderId);
				this.watchSelectedOrder(orderId);
			} else {
				this.selectedOrder = null;
				this.currentOrderWatchSub?.unsubscribe();
				this.currentOrderWatchSub = null;
			}
		});
	}

	ngOnDestroy(): void {
		this.currentOrderWatchSub?.unsubscribe();
		this.destroy$.next();
		this.destroy$.complete();
	}

	private setupCustomerRealtimeListener(): void {
		this.webSocketService.myOrderUpdates$
			.pipe(takeUntil(this.destroy$))
			.subscribe((updated) => {
				// 1. Update in the customer orders list
				const index = this.orders.findIndex((o) => o.orderId === updated.orderId);
				if (index !== -1) {
					this.orders = [
						...this.orders.slice(0, index),
						{ ...this.orders[index], ...updated, status: updated.status },
						...this.orders.slice(index + 1)
					];
				} else {
					this.orders = [updated, ...this.orders];
				}

				// 2. Update selected order view if currently open
				if (this.selectedOrder && this.selectedOrder.orderId === updated.orderId) {
					this.selectedOrder = { ...this.selectedOrder, ...updated, status: updated.status };
					if (this.authState.isAuthenticated() && updated.status === 'COMPLETED') {
						this.loyaltyService.getMyLoyalty().subscribe({ error: () => undefined });
					}
				}
			});
	}

	private watchSelectedOrder(orderId: string): void {
		this.currentOrderWatchSub?.unsubscribe();
		this.currentOrderWatchSub = this.webSocketService
			.watchOrder(orderId)
			.pipe(takeUntil(this.destroy$))
			.subscribe((updated) => {
				if (this.selectedOrder && this.selectedOrder.orderId === updated.orderId) {
					this.selectedOrder = { ...this.selectedOrder, ...updated, status: updated.status };
					if (this.authState.isAuthenticated() && updated.status === 'COMPLETED') {
						this.loyaltyService.getMyLoyalty().subscribe({ error: () => undefined });
					}
				}
			});
	}

	loadOrders(): void {
		this.loading = true;
		this.errorMessage = '';
		this.orderService.listOrders().subscribe({
			next: (orders) => {
				this.orders = orders;
				this.loading = false;
			},
			error: (error) => {
				this.loading = false;
				this.errorMessage = readApiErrorMessage(error, 'Unable to load orders.');
			}
		});
	}

	loadOrder(orderId: string): void {
		this.detailLoading = true;
		this.errorMessage = '';
		this.orderService.getOrder(orderId).subscribe({
			next: (order) => {
				this.selectedOrder = order;
				this.detailLoading = false;
				if (this.authState.isAuthenticated() && order.status === 'COMPLETED') {
					this.loyaltyService.getMyLoyalty().subscribe({ error: () => undefined });
				}
			},
			error: (error) => {
				this.detailLoading = false;
				this.errorMessage = readApiErrorMessage(error, 'Unable to load order details.');
			}
		});
	}

	statusClass(status: string): string {
		return `status-${status.toLowerCase().replace(/_/g, '-')}`;
	}
}