export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PREPARATION'
  | 'OUT_FOR_DELIVERY'
  | 'READY_FOR_PICKUP'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export type OrderType = 'DELIVERY' | 'PICKUP';

export type DeliveryMode = 'INSTANT' | 'SCHEDULED';

export interface OrderItem {
  itemId: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

import { AddressResponse } from './address.model';

export interface OrderResponse {
  orderId: string;
  orderNumber: string;
  userId?: string | null;
  guestSessionId?: string | null;
  addressId?: string | null;
  address?: AddressResponse | null;
  deliveryMode?: DeliveryMode | null;
  orderType?: OrderType | null;
  status: OrderStatus;
  paymentMethod?: string | null;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  customerName?: string | null;
  customerPhone?: string | null;
  scheduledDate?: string | null;
  notes?: string | null;
  couponId?: string | null;
  rewardApplied?: boolean;
  createdAt: string;
  items: OrderItem[];
}
