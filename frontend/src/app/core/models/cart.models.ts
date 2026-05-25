export type DeliveryMode = 'INSTANT' | 'SCHEDULED';

export interface CartItemResponse {
	itemId: string;
	productId: string;
	productName: string;
	productImage: string | null;
	quantity: number;
	unitPrice: number;
	deliveryMode: DeliveryMode;
	lineTotal: number;
}

export interface CartResponse {
	cartId: string;
	userId: string | null;
	guestSessionId: string | null;
	status: string;
	createdAt: string;
	subtotal: number;
	items: CartItemResponse[];
}

export interface AddCartItemRequest {
	productId: string;
	quantity: number;
	deliveryMode: DeliveryMode;
}

export interface UpdateCartItemRequest {
	quantity: number;
	deliveryMode: DeliveryMode;
}