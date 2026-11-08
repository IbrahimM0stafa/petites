import { CartResponse } from '../../../core/models/cart.models';
import { CouponValidationResponse } from '../../../core/models/coupon.models';
import { OrderType } from '../../../core/models/order.models';
import { GovernorateNode, AreaNode } from '../../../core/models/delivery-zone.model';
import { DeliveryZoneUtil } from '../../../core/utils/delivery-zone.util';

export class CheckoutPricingUtil {
	static isMixedOrder(cart: CartResponse | null): boolean {
		const items = cart?.items ?? [];
		const hasInstant = items.some((item) => item.deliveryMode === 'INSTANT');
		const hasScheduled = items.some((item) => item.deliveryMode === 'SCHEDULED');
		return hasInstant && hasScheduled;
	}

	static calculateDeliveryFee(
		orderType: OrderType,
		isCourierDelivery: boolean,
		isMixedOrder: boolean,
		deliveryFeeRate: number
	): number {
		if (orderType === 'DELIVERY') {
			if (isCourierDelivery) {
				return 0;
			}
			return isMixedOrder ? deliveryFeeRate * 2 : deliveryFeeRate;
		}
		return 0;
	}

	static calculateFinalAmount(
		subtotal: number,
		deliveryFee: number,
		couponPreview: CouponValidationResponse | null
	): number {
		const baseAmount = couponPreview?.finalAmount ?? subtotal;
		return baseAmount + deliveryFee;
	}

	static getInstantDiscount(
		instantSubtotal: number,
		instantDeliveryFee: number,
		couponPreview: CouponValidationResponse | null
	): number {
		if (!couponPreview?.valid) return 0;
		const totalDiscount = couponPreview.discountAmount;
		return Math.min(totalDiscount, instantSubtotal + instantDeliveryFee);
	}

	static getScheduledDiscount(
		instantDiscount: number,
		couponPreview: CouponValidationResponse | null
	): number {
		if (!couponPreview?.valid) return 0;
		const totalDiscount = couponPreview.discountAmount;
		return Math.max(0, totalDiscount - instantDiscount);
	}

	static findAreaInTree(zoneTree: GovernorateNode[], areaId?: string | null): AreaNode | null {
		return DeliveryZoneUtil.findArea(zoneTree, areaId);
	}
}
