import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartResponse } from '../../../../core/models/cart.models';
import { CouponValidationResponse } from '../../../../core/models/coupon.models';
import { OrderType } from '../../../../core/models/order.models';

@Component({
	selector: 'app-checkout-summary',
	standalone: true,
	imports: [CommonModule, RouterLink],
	templateUrl: './checkout-summary.component.html',
	styleUrl: './checkout-summary.component.css'
})
export class CheckoutSummaryComponent {
	@Input({ required: true }) cart!: CartResponse | null;
	@Input({ required: true }) couponPreview!: CouponValidationResponse | null;
	@Input({ required: true }) orderType!: OrderType;
	@Input({ required: true }) subtotal!: number;
	@Input({ required: true }) deliveryFee!: number;
	@Input({ required: true }) finalAmount!: number;
	@Input({ required: true }) isMixedOrder!: boolean;
	@Input({ required: true }) instantItems!: any[];
	@Input({ required: true }) scheduledItems!: any[];
	@Input({ required: true }) instantSubtotal!: number;
	@Input({ required: true }) scheduledSubtotal!: number;
	@Input({ required: true }) instantDeliveryFee!: number;
	@Input({ required: true }) scheduledDeliveryFee!: number;
	@Input({ required: true }) instantDiscount!: number;
	@Input({ required: true }) scheduledDiscount!: number;
	@Input({ required: true }) instantTotal!: number;
	@Input({ required: true }) scheduledTotal!: number;
}
