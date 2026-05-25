import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { readApiErrorMessage } from '../../../core/models/api-error.model';
import { LoyaltyService } from '../../../core/services/loyalty.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { OrderResponse } from '../../../core/models/order.models';
import { OrderService } from '../../../core/services/order.service';

@Component({
	selector: 'app-orders-page',
	standalone: true,
	imports: [CommonModule, RouterLink],
	templateUrl: './orders-page.component.html',
	styleUrl: './orders-page.component.css'
})
export class OrdersPageComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly orderService = inject(OrderService);
	private readonly loyaltyService = inject(LoyaltyService);
	readonly authState = inject(AuthStateService);

	loading = true;
	detailLoading = false;
	errorMessage = '';
	orders: OrderResponse[] = [];
	selectedOrder: OrderResponse | null = null;

	ngOnInit(): void {
		this.loadOrders();
		this.route.paramMap.subscribe((params) => {
			const orderId = params.get('id');
			if (orderId) {
				this.loadOrder(orderId);
			} else {
				this.selectedOrder = null;
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