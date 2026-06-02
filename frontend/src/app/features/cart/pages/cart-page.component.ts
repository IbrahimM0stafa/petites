import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';

import { readApiErrorMessage } from '../../../core/models/api-error.model';
import { CartItemResponse, CartResponse, DeliveryMode } from '../../../core/models/cart.models';
import { LoyaltyResponse } from '../../../core/models/loyalty.models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { CartService } from '../../../core/services/cart.service';
import { LoyaltyService } from '../../../core/services/loyalty.service';
import { ShopService } from '../../../core/services/shop.service';

@Component({
	selector: 'app-cart-page',
	standalone: true,
	imports: [CommonModule, RouterLink],
	templateUrl: './cart-page.component.html',
	styleUrl: './cart-page.component.css'
})
export class CartPageComponent implements OnInit {
	loading = true;
	loyaltyLoading = false;
	bannerMessage = '';
	bannerVariant: 'error' | 'success' | '' = '';
	updatingItemId = '';
	loyalty: LoyaltyResponse | null = null;

	private readonly cartService = inject(CartService);
	private readonly authState = inject(AuthStateService);
	private readonly loyaltyService = inject(LoyaltyService);
	private readonly shopService = inject(ShopService);
	private productAvailabilityByProductId = new Map<string, boolean>();
	private instantAvailabilityByProductId = new Map<string, boolean>();

	ngOnInit(): void {
		this.refreshCart();
		this.loadLoyalty();
	}

	get cart(): CartResponse | null {
		return this.cartService.cart();
	}

	get showRewardTeaser(): boolean {
		return this.authState.isAuthenticated() && Boolean(this.loyalty?.rewardAvailable && this.rewardProductId);
	}

	get rewardProductId(): string {
		return this.loyalty?.rewardProductId?.trim() ?? '';
	}

	get rewardProductName(): string {
		return this.loyalty?.rewardProductName?.trim() || 'Free item';
	}

	get rewardProductImage(): string | null {
		return this.loyalty?.rewardProductImage?.trim() || null;
	}

	refreshCart(): void {
		this.loading = true;
		this.clearBanner();

		this.cartService.loadCart().subscribe({
			next: (cart) => {
				this.loading = false;
				this.loadItemAvailability(cart.items);
			},
			error: (error) => {
				this.loading = false;
				this.setBanner(readApiErrorMessage(error, 'Unable to load your cart.'), 'error');
			}
		});
	}

	private setBanner(message: string, variant: 'error' | 'success'): void {
		this.bannerMessage = message;
		this.bannerVariant = variant;
	}

	private clearBanner(): void {
		this.bannerMessage = '';
		this.bannerVariant = '';
	}

	private loadLoyalty(): void {
		if (!this.authState.isAuthenticated()) {
			this.loyalty = null;
			return;
		}

		this.loyaltyLoading = true;
		this.loyaltyService.getMyLoyalty().subscribe({
			next: (loyalty) => {
				this.loyalty = loyalty;
				this.loyaltyLoading = false;
			},
			error: () => {
				this.loyalty = null;
				this.loyaltyLoading = false;
			}
		});
	}

	changeQuantity(item: CartItemResponse, delta: number): void {
		if (!this.isProductAvailable(item)) {
			this.setBanner('This product is no longer available and should be removed from the cart.', 'error');
			return;
		}

		const nextQuantity = item.quantity + delta;
		if (nextQuantity < 1) {
			return;
		}

		this.updateItem(item, { quantity: nextQuantity, deliveryMode: item.deliveryMode });
	}

	changeDeliveryMode(item: CartItemResponse, deliveryMode: DeliveryMode): void {
		if (!this.isProductAvailable(item)) {
			this.setBanner('This product is no longer available and should be removed from the cart.', 'error');
			return;
		}

		if (deliveryMode === 'INSTANT' && !this.isInstantAvailable(item)) {
			this.setBanner('Instant delivery is currently unavailable for this item.', 'error');
			return;
		}
		this.updateItem(item, { quantity: item.quantity, deliveryMode });
	}

	removeItem(item: CartItemResponse): void {
		this.updatingItemId = item.itemId;
		this.cartService.removeItem(item.itemId).subscribe({
			next: (cart) => {
				this.updatingItemId = '';
				this.setBanner('Item removed from cart.', 'success');
				this.loadItemAvailability(cart.items);
			},
			error: (error) => {
				this.updatingItemId = '';
				this.setBanner(readApiErrorMessage(error, 'Unable to remove cart item.'), 'error');
			}
		});
	}

	clearCart(): void {
		this.updatingItemId = 'clear';
		this.cartService.clearCart().subscribe({
			next: (cart) => {
				this.updatingItemId = '';
				this.setBanner('Cart cleared.', 'success');
				this.loadItemAvailability(cart.items);
			},
			error: (error) => {
				this.updatingItemId = '';
				this.setBanner(readApiErrorMessage(error, 'Unable to clear the cart.'), 'error');
			}
		});
	}

	isInstantAvailable(item: CartItemResponse): boolean {
		return this.instantAvailabilityByProductId.get(item.productId) ?? true;
	}

	isProductAvailable(item: CartItemResponse): boolean {
		return this.productAvailabilityByProductId.get(item.productId) ?? true;
	}

	private loadItemAvailability(items: CartItemResponse[]): void {
		if (!items.length) {
			this.productAvailabilityByProductId.clear();
			this.instantAvailabilityByProductId.clear();
			return;
		}

		const productIds = Array.from(new Set(items.map((item) => item.productId)));
		const requests = productIds.map((productId) =>
			this.shopService.getProductDetail(productId).pipe(
				map((product) => ({
					productId,
					productAvailable: product.isAvailable !== false,
					instantAvailable: product.instantAvailableToday && product.instantQuantityToday > 0
				})),
				catchError(() => of({ productId, productAvailable: true, instantAvailable: true }))
			)
		);

		forkJoin(requests).subscribe({
			next: (availability) => {
				this.productAvailabilityByProductId = new Map(
					availability.map((entry) => [entry.productId, entry.productAvailable])
				);
				this.instantAvailabilityByProductId = new Map(
					availability.map((entry) => [entry.productId, entry.instantAvailable])
				);
			}
		});
	}

	private updateItem(item: CartItemResponse, request: { quantity: number; deliveryMode: DeliveryMode }): void {
		this.updatingItemId = item.itemId;
		this.clearBanner();
		this.cartService.updateItem(item.itemId, request).subscribe({
			next: (cart) => {
				this.updatingItemId = '';
				this.setBanner('Cart updated.', 'success');
				this.loadItemAvailability(cart.items);
			},
			error: (error) => {
				this.updatingItemId = '';
				this.setBanner(readApiErrorMessage(error, 'Unable to update cart item.'), 'error');
			}
		});
	}
}