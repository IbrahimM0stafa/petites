import { Product } from './product.model';
import { CartResponse, DeliveryMode } from './cart.models';
import { CouponValidationResponse } from './coupon.models';
import { OrderResponse } from './order.models';

export type ChatActionType =
  | 'NAVIGATE'
  | 'VIEW_PRODUCT'
  | 'VIEW_CATEGORY'
  | 'CHECKOUT'
  | 'VIEW_CART'
  | 'ADD_TO_CART'
  | 'CLEAR_CART'
  | 'INITIATE_CHECKOUT'
  | 'TRACK_ORDER';

export interface ChatAction {
  type: ChatActionType | string;
  productId?: string;
  quantity?: number;
  deliveryMode?: DeliveryMode;
  targetUrl?: string;
  payload?: any;
}

export interface InChatCheckoutState {
  customerName: string;
  customerPhone: string;
  orderType: 'DELIVERY' | 'PICKUP';
  addressId?: string;
  deliveryGovernorateId?: string;
  deliveryGovernorate?: string;
  deliveryCityId?: string;
  deliveryCity: string;
  deliveryAreaId?: string;
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
  isCourierDelivery?: boolean;
  deliveryFee?: number;
}

export interface ChatOrderConfirmation {
  orderReference: any;
  orders: OrderResponse[];
  totalAmountToTransfer: string;
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
  trackedOrders?: OrderResponse[];
  orderConfirmation?: ChatOrderConfirmation;
}

export interface ChatContext {
  currentPage?: string;
  cartItemCount?: number;
  cartTotal?: number;
  userEmail?: string;
}

export interface ChatRequest {
  message?: string;
  messages?: { role: string; content: string }[];
  conversationHistory?: { role: string; content: string }[];
  context?: ChatContext;
}

export interface ChatResponse {
  reply: string;
  products?: Product[];
  suggestedProducts?: Product[];
  action?: ChatAction;
  quickReplies?: string[];
}
