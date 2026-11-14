import { CurrencyPipe } from '@angular/common';
import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartItemResponse, CartResponse } from '../../../../core/models/cart.models';
import { CouponValidationResponse } from '../../../../core/models/coupon.models';
import { OrderType } from '../../../../core/models/order.models';

@Component({
	selector: 'app-checkout-summary',
	standalone: true,
	imports: [CurrencyPipe, RouterLink],
	templateUrl: './checkout-summary.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './checkout-summary.component.css'
})
export class CheckoutSummaryComponent {
	readonly cart = input.required<CartResponse | null>();
	readonly couponPreview = input.required<CouponValidationResponse | null>();
	readonly orderType = input.required<OrderType>();
	readonly subtotal = input.required<number>();
	readonly deliveryFee = input.required<number>();
	readonly finalAmount = input.required<number>();
	readonly isMixedOrder = input.required<boolean>();
	readonly instantItems = input.required<CartItemResponse[]>();
	readonly scheduledItems = input.required<CartItemResponse[]>();
	readonly instantSubtotal = input.required<number>();
	readonly scheduledSubtotal = input.required<number>();
	readonly instantDeliveryFee = input.required<number>();
	readonly scheduledDeliveryFee = input.required<number>();
	readonly instantDiscount = input.required<number>();
	readonly scheduledDiscount = input.required<number>();
	readonly instantTotal = input.required<number>();
	readonly scheduledTotal = input.required<number>();
	readonly isCourierDelivery = input<boolean>(false);
	readonly hasAreaSelected = input<boolean>(false);
}
