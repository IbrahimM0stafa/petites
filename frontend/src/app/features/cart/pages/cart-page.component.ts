import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { readApiErrorMessage } from '../../../core/models/api-error.model';
import { CartItemResponse, CartResponse, DeliveryMode } from '../../../core/models/cart.models';
import { CartService } from '../../../core/services/cart.service';

@Component({
	selector: 'app-cart-page',
	standalone: true,
	imports: [CommonModule, RouterLink],
	templateUrl: './cart-page.component.html',
	styleUrl: './cart-page.component.css'
})
export class CartPageComponent implements OnInit {
	loading = true;
	errorMessage = '';
	statusMessage = '';
	updatingItemId = '';
	private readonly cartService = inject(CartService);

	ngOnInit(): void {
		this.refreshCart();
	}

	get cart(): CartResponse | null {
		return this.cartService.cart();
	}

	refreshCart(): void {
		this.loading = true;
		this.errorMessage = '';

		this.cartService.loadCart().subscribe({
			next: () => {
				this.loading = false;
			},
			error: (error) => {
				this.loading = false;
				this.errorMessage = readApiErrorMessage(error, 'Unable to load your cart.');
			}
		});
	}

	changeQuantity(item: CartItemResponse, delta: number): void {
		const nextQuantity = item.quantity + delta;
		if (nextQuantity < 1) {
			return;
		}

		this.updateItem(item, { quantity: nextQuantity, deliveryMode: item.deliveryMode });
	}

	changeDeliveryMode(item: CartItemResponse, deliveryMode: DeliveryMode): void {
		this.updateItem(item, { quantity: item.quantity, deliveryMode });
	}

	removeItem(item: CartItemResponse): void {
		this.updatingItemId = item.itemId;
		this.cartService.removeItem(item.itemId).subscribe({
			next: () => {
				this.updatingItemId = '';
				this.statusMessage = 'Item removed from cart.';
			},
			error: (error) => {
				this.updatingItemId = '';
				this.errorMessage = readApiErrorMessage(error, 'Unable to remove cart item.');
			}
		});
	}

	clearCart(): void {
		this.updatingItemId = 'clear';
		this.cartService.clearCart().subscribe({
			next: () => {
				this.updatingItemId = '';
				this.statusMessage = 'Cart cleared.';
			},
			error: (error) => {
				this.updatingItemId = '';
				this.errorMessage = readApiErrorMessage(error, 'Unable to clear the cart.');
			}
		});
	}

	private updateItem(item: CartItemResponse, request: { quantity: number; deliveryMode: DeliveryMode }): void {
		this.updatingItemId = item.itemId;
		this.errorMessage = '';
		this.cartService.updateItem(item.itemId, request).subscribe({
			next: () => {
				this.updatingItemId = '';
				this.statusMessage = 'Cart updated.';
			},
			error: (error) => {
				this.updatingItemId = '';
				this.errorMessage = readApiErrorMessage(error, 'Unable to update cart item.');
			}
		});
	}
}