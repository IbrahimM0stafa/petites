import { Product } from './product.model';
import { CartResponse } from './cart.models';
import { CheckoutResponse, OrderResponse } from './order.models';

import { CouponValidationResponse } from './coupon.models';

export interface ChatAction {
  type: 'ADD_TO_CART' | 'VIEW_CART' | 'CLEAR_CART' | 'INITIATE_CHECKOUT' | 'TRACK_ORDER' | 'NAVIGATE';
  productId?: string;
  productName?: string;
  quantity?: number;
  deliveryMode?: 'INSTANT' | 'SCHEDULED';
  price?: number;
  targetUrl?: string;
}

export interface InChatCheckoutState {
  customerName: string;
  customerPhone: string;
  orderType: 'DELIVERY' | 'PICKUP';
  addressId?: string;
  deliveryCity: string;
  deliveryArea: string;
  deliveryStreet: string;
  deliveryBuilding: string;
  deliveryNotes: string;
  scheduledDate: string;
  minScheduledDate?: string;
  couponCode: string;
  couponPreview?: CouponValidationResponse | null;
  validatingCoupon?: boolean;
  couponError?: string;
  notes: string;
  isSubmitting: boolean;
  error?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  products?: Product[];
  action?: ChatAction;
  quickReplies?: string[];
  timestamp?: Date;
  cartPreview?: CartResponse | null;
  checkoutCard?: InChatCheckoutState;
  orderConfirmation?: {
    orderReference: CheckoutResponse;
    orders: OrderResponse[];
    totalAmountToTransfer: string;
  };
  trackedOrders?: OrderResponse[];
}

export interface ChatRequest {
  messages: { role: string; content: string }[];
}

export interface ChatResponse {
  reply: string;
  products?: Product[];
  action?: ChatAction | null;
  quickReplies?: string[];
}
