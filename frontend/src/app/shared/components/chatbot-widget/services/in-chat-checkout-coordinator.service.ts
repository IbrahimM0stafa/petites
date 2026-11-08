import { Injectable, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { SavedAddressResponse } from '../../../../core/models/address.models';
import { CartResponse } from '../../../../core/models/cart.models';
import { InChatCheckoutState } from '../../../../core/models/chatbot.models';
import { GovernorateNode } from '../../../../core/models/delivery-zone.model';
import { CheckoutRequest } from '../../../../core/models/order.models';
import { ShopService } from '../../../../core/services/shop.service';
import { DeliveryZoneUtil } from '../../../../core/utils/delivery-zone.util';
import { CheckoutDateUtil } from '../../../../features/checkout/utils/checkout-date.util';

@Injectable({
	providedIn: 'root'
})
export class InChatCheckoutCoordinator {
	private readonly shopService = inject(ShopService);

	/**
	 * Creates an initial InChatCheckoutState for a new checkout card.
	 */
	createInitialCard(
		defaultAddress: SavedAddressResponse | null,
		deliveryFeeRate: number,
		zoneTree: GovernorateNode[]
	): InChatCheckoutState {
		const card: InChatCheckoutState = {
			orderType: 'DELIVERY',
			addressId: defaultAddress?.id,
			deliveryGovernorateId: defaultAddress?.governorateId || undefined,
			deliveryGovernorate: defaultAddress?.governorate || undefined,
			deliveryCityId: defaultAddress?.cityId || undefined,
			deliveryCity: defaultAddress?.city || '',
			deliveryAreaId: defaultAddress?.areaId || undefined,
			deliveryArea: defaultAddress?.area || '',
			deliveryStreet: defaultAddress?.street || '',
			deliveryBuilding: defaultAddress?.building || '',
			deliveryNotes: defaultAddress?.notes || '',
			customerName: '',
			customerPhone: '',
			scheduledDate: '',
			minScheduledDate: '',
			couponCode: '',
			couponPreview: null,
			validatingCoupon: false,
			couponError: undefined,
			notes: '',
			isSubmitting: false,
			deliveryFee: deliveryFeeRate,
			isCourierDelivery: false
		};

		if (defaultAddress?.areaId) {
			const matched = DeliveryZoneUtil.findArea(zoneTree, defaultAddress.areaId);
			if (matched) {
				card.deliveryFee = matched.courierDelivery ? 0 : matched.deliveryFee;
				card.isCourierDelivery = matched.courierDelivery;
			}
		}

		return card;
	}

	/**
	 * Resolves earliest scheduling constraints for scheduled items in the cart.
	 */
	updateCardMinScheduledDate(
		card: InChatCheckoutState,
		cart: CartResponse | null,
		blockedDays: string[],
		onResolved?: () => void
	): void {
		const scheduledItems = cart?.items?.filter((item) => item.deliveryMode === 'SCHEDULED') ?? [];
		if (scheduledItems.length === 0) {
			card.minScheduledDate = '';
			onResolved?.();
			return;
		}

		const requests = scheduledItems.map((item) => this.shopService.getProductDetail(item.productId));
		forkJoin(requests).subscribe({
			next: (products) => {
				const dates = products.map((p) => p.earliestScheduledDate).filter(Boolean);
				if (dates.length > 0) {
					dates.sort();
					card.minScheduledDate = dates[dates.length - 1];
				} else {
					card.minScheduledDate = CheckoutDateUtil.getTodayCairoFormatted();
				}

				if (
					!card.scheduledDate ||
					card.scheduledDate < card.minScheduledDate ||
					CheckoutDateUtil.isDateBlocked(card.scheduledDate, blockedDays)
				) {
					card.scheduledDate = this.findNextAvailableDate(card.minScheduledDate, blockedDays);
				}
				onResolved?.();
			},
			error: () => {
				card.minScheduledDate = CheckoutDateUtil.getTodayCairoFormatted();
				if (
					!card.scheduledDate ||
					card.scheduledDate < card.minScheduledDate ||
					CheckoutDateUtil.isDateBlocked(card.scheduledDate, blockedDays)
				) {
					card.scheduledDate = this.findNextAvailableDate(card.minScheduledDate, blockedDays);
				}
				onResolved?.();
			}
		});
	}

	/**
	 * Finds the next unblocked date starting from startDateStr within a 21-day window.
	 */
	findNextAvailableDate(startDateStr: string, blockedDays: string[]): string {
		if (!startDateStr) return '';
		const parts = startDateStr.split('-');
		let date =
			parts.length === 3
				? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
				: new Date();

		for (let i = 0; i < 21; i++) {
			const y = date.getFullYear();
			const m = (date.getMonth() + 1).toString().padStart(2, '0');
			const d = date.getDate().toString().padStart(2, '0');
			const str = `${y}-${m}-${d}`;
			if (!CheckoutDateUtil.isDateBlocked(str, blockedDays)) {
				return str;
			}
			date.setDate(date.getDate() + 1);
		}
		return startDateStr;
	}

	/**
	 * Validates an in-chat checkout card. Returns an error message or null if valid.
	 */
	validateCard(
		card: InChatCheckoutState,
		cart: CartResponse | null,
		isAuthenticated: boolean,
		blockedDays: string[]
	): string | null {
		if (!isAuthenticated) {
			if (!card.customerName.trim() || card.customerName.trim().length < 2) {
				return 'Please enter your full name (minimum 2 characters).';
			}
			if (!card.customerPhone.trim() || card.customerPhone.trim().length < 7) {
				return 'Please enter a valid phone number.';
			}
		}

		const isUsingSavedAddress = isAuthenticated && Boolean(card.addressId && card.addressId !== 'NEW');
		if (card.orderType === 'DELIVERY' && !isUsingSavedAddress) {
			if (
				!card.deliveryStreet.trim() ||
				!card.deliveryAreaId ||
				!card.deliveryCityId ||
				!card.deliveryGovernorateId
			) {
				return 'Please select governorate, city, area and enter street for delivery.';
			}
		}

		const hasScheduled = cart?.items?.some((i) => i.deliveryMode === 'SCHEDULED');
		if (hasScheduled) {
			if (!card.scheduledDate) {
				return 'Please choose a scheduled delivery date for scheduled bakery items.';
			}
			if (card.minScheduledDate && card.scheduledDate < card.minScheduledDate) {
				return `Selected scheduled date cannot be earlier than ${card.minScheduledDate}.`;
			}
			if (CheckoutDateUtil.isDateBlocked(card.scheduledDate, blockedDays)) {
				return 'Selected date falls on a blocked bakery delivery day. Please choose another date.';
			}
		}

		return null;
	}

	/**
	 * Builds a CheckoutRequest payload from the in-chat checkout state.
	 */
	buildCheckoutPayload(
		card: InChatCheckoutState,
		cart: CartResponse | null,
		isAuthenticated: boolean
	): CheckoutRequest {
		const isUsingSavedAddress = isAuthenticated && Boolean(card.addressId && card.addressId !== 'NEW');
		const hasScheduled = cart?.items?.some((i) => i.deliveryMode === 'SCHEDULED');
		const couponCode = card.couponCode?.trim() || '';

		return {
			customerName: card.customerName.trim() || undefined,
			customerPhone: card.customerPhone.trim() || undefined,
			orderType: card.orderType,
			addressId: isUsingSavedAddress ? card.addressId : null,
			governorateId:
				card.orderType === 'DELIVERY' && !isUsingSavedAddress ? card.deliveryGovernorateId : undefined,
			deliveryGovernorate:
				card.orderType === 'DELIVERY' && !isUsingSavedAddress ? card.deliveryGovernorate : undefined,
			cityId: card.orderType === 'DELIVERY' && !isUsingSavedAddress ? card.deliveryCityId : undefined,
			deliveryCity:
				card.orderType === 'DELIVERY' && !isUsingSavedAddress ? card.deliveryCity.trim() : undefined,
			areaId: card.orderType === 'DELIVERY' && !isUsingSavedAddress ? card.deliveryAreaId : undefined,
			deliveryArea:
				card.orderType === 'DELIVERY' && !isUsingSavedAddress ? card.deliveryArea.trim() : undefined,
			deliveryStreet:
				card.orderType === 'DELIVERY' && !isUsingSavedAddress ? card.deliveryStreet.trim() : undefined,
			deliveryBuilding:
				card.orderType === 'DELIVERY' && !isUsingSavedAddress ? card.deliveryBuilding.trim() : undefined,
			deliveryNotes:
				card.orderType === 'DELIVERY' && !isUsingSavedAddress ? card.deliveryNotes.trim() : undefined,
			notes: card.notes.trim() || undefined,
			couponId: card.couponPreview?.valid ? card.couponPreview.couponId : null,
			couponCode: card.couponPreview?.valid ? null : couponCode || null,
			scheduledDate: hasScheduled ? card.scheduledDate || null : null
		};
	}

	/**
	 * Computes total checkout price for the card.
	 */
	calculateCheckoutTotal(
		card: InChatCheckoutState,
		cart: CartResponse | null,
		fallbackDeliveryFee: number
	): number {
		if (!cart) return 0;
		const itemsTotal = cart.subtotal || 0;
		const discount = card.couponPreview && card.couponPreview.valid ? card.couponPreview.discountAmount : 0;
		const delivery =
			card.orderType === 'DELIVERY' && !card.isCourierDelivery
				? (card.deliveryFee ?? fallbackDeliveryFee)
				: 0;
		return Math.max(0, itemsTotal - discount) + delivery;
	}

	/**
	 * Formats monetary amounts to EGP currency string.
	 */
	formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-EG', {
			style: 'currency',
			currency: 'EGP'
		}).format(amount);
	}
}

