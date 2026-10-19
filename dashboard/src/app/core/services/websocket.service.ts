import { Injectable, OnDestroy, effect, inject, signal } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { OrderResponse } from '../models/order.model';
import { OrderWebSocketEvent } from '../models/websocket.model';
import { AuthStateService } from './auth-state.service';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private readonly authState = inject(AuthStateService);

  private client: Client | null = null;
  private orderSubscription: StompSubscription | null = null;
  private readonly orderEventSubject = new Subject<OrderWebSocketEvent>();

  readonly isConnected = signal<boolean>(false);

  readonly orderEvents$: Observable<OrderWebSocketEvent> = this.orderEventSubject.asObservable();

  readonly newOrders$: Observable<OrderResponse> = this.orderEvents$.pipe(
    filter((event) => event.eventType === 'ORDER_CREATED'),
    map((event) => event.order)
  );

  readonly orderStatusUpdates$: Observable<OrderResponse> = this.orderEvents$.pipe(
    filter((event) => event.eventType === 'ORDER_STATUS_UPDATED'),
    map((event) => event.order)
  );

  constructor() {
    this.initClient();

    effect(() => {
      const token = this.authState.accessToken();
      if (this.client) {
        this.client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
        if (token && !this.client.active) {
          this.client.activate();
        }
      }
    });
  }

  private initClient(): void {
    const token = this.authState.accessToken();
    const brokerUrl = this.getBrokerUrl();

    this.client = new Client({
      brokerURL: brokerUrl,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        this.isConnected.set(true);
        this.subscribeToOrders();
      },
      onDisconnect: () => {
        this.isConnected.set(false);
      },
      onWebSocketClose: () => {
        this.isConnected.set(false);
      },
      onStompError: (frame) => {
        console.warn('STOMP broker reported error:', frame.headers['message']);
      }
    });

    this.client.activate();
  }

  private subscribeToOrders(): void {
    if (!this.client || !this.client.connected) {
      return;
    }

    if (this.orderSubscription) {
      this.orderSubscription.unsubscribe();
    }

    this.orderSubscription = this.client.subscribe('/topic/admin/orders', (message: IMessage) => {
      try {
        const payload: OrderWebSocketEvent = JSON.parse(message.body);
        this.orderEventSubject.next(payload);
      } catch (err) {
        console.error('Failed to parse incoming order event:', err);
      }
    });
  }

  private getBrokerUrl(): string {
    const baseUrl = environment.apiBaseUrl.replace(/\/+$/, '');
    const wsProtocol = baseUrl.startsWith('https://') ? 'wss://' : 'ws://';
    const hostAndPath = baseUrl.replace(/^https?:\/\//, '');
    return `${wsProtocol}${hostAndPath}/ws`;
  }

  reconnectWithFreshToken(): void {
    const token = this.authState.accessToken();
    if (this.client) {
      this.client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      if (this.client.active) {
        void this.client.deactivate().then(() => {
          this.client?.activate();
        });
      } else {
        this.client.activate();
      }
    } else {
      this.initClient();
    }
  }

  ngOnDestroy(): void {
    if (this.orderSubscription) {
      this.orderSubscription.unsubscribe();
      this.orderSubscription = null;
    }
    if (this.client) {
      void this.client.deactivate();
      this.client = null;
    }
  }
}
