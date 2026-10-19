import { OrderResponse } from './order.model';

export type OrderWebSocketEventType = 'ORDER_CREATED' | 'ORDER_STATUS_UPDATED';

export interface OrderWebSocketEvent {
  eventType: OrderWebSocketEventType;
  order: OrderResponse;
  timestamp: string;
}
