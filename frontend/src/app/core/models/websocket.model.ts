import { OrderResponse } from './order.models';

export type OrderWebSocketEventType = 'ORDER_CREATED' | 'ORDER_STATUS_UPDATED';

export interface OrderWebSocketEvent {
  eventType: OrderWebSocketEventType;
  order: OrderResponse;
  timestamp: string;
}
