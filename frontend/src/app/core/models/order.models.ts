import { DeliveryMode } from './cart.models';

export type OrderType = 'DELIVERY' | 'PICKUP';

export type OrderStatus =
	| 'PENDING'
	| 'CONFIRMED'
	| 'IN_PREPARATION'
	| 'OUT_FOR_DELIVERY'
	| 'READY_FOR_PICKUP'
	| 'DELIVERED'
	| 'COMPLETED'
	| 'CANCELLED';

export interface OrderItemResponse {
	itemId?: string;
	productId?: string;
	productName?: string;
	productImage?: string | null;
	quantity: number;
	unitPrice: number;
	deliveryMode?: DeliveryMode;
	lineTotal: number;
}

export interface OrderResponse {
	orderId: string;
	orderNumber: string;
	userId: string | null;
	guestSessionId: string | null;
	addressId: string | null;
	deliveryMode: DeliveryMode | null;
	orderType: OrderType;
	status: OrderStatus;
	paymentMethod: string;
	subtotal: number;
	deliveryFee: number;
	discountAmount: number;
	totalAmount: number;
	customerName: string;
	customerPhone: string;
	scheduledDate: string | null;
	notes: string | null;
	couponId: string | null;
	rewardApplied: boolean;
	createdAt: string;
	items: OrderItemResponse[];
}

export interface CheckoutRequest {
	customerName?: string;
	customerPhone?: string;
	orderType?: OrderType;
	addressId?: string | null;
	notes?: string;
	couponId?: string | null;
	couponCode?: string | null;
	scheduledDate?: string | null;
}

export interface CheckoutResponse {
	cartId: string;
	orders: OrderResponse[];
	totalAmount: number;
}