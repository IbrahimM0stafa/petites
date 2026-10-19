import { Injectable, OnDestroy, effect, inject, signal } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { OrderResponse } from '../models/order.models';
import { OrderWebSocketEvent } from '../models/websocket.model';
import { AuthStateService } from './auth-state.service';

@Injectable({
  providedIn: 'root'
})
export class CustomerWebSocketService implements OnDestroy {
  private readonly authState = inject(AuthStateService);

  private client: Client | null = null;
  private userOrdersSubscription: StompSubscription | null = null;
  private readonly userOrderEvent$ = new Subject<OrderWebSocketEvent>();

  readonly isConnected = signal<boolean>(false);

  readonly myOrderUpdates$: Observable<OrderResponse> = this.userOrderEvent$.pipe(
    map((event) => event.order)
  );

  constructor() {
    this.initClient();

    // Re-subscribe if user logs in or switches
    effect(() => {
      const userId = this.authState.userId();
      if (this.isConnected() && userId) {
        this.subscribeToUserOrders(userId);
      } else if (!userId && this.userOrdersSubscription) {
        this.userOrdersSubscription.unsubscribe();
        this.userOrdersSubscription = null;
      }
    });
  }

  private initClient(): void {
    const brokerUrl = this.getBrokerUrl();
    const token = this.authState.accessToken();

    this.client = new Client({
      brokerURL: brokerUrl,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        this.isConnected.set(true);
        const userId = this.authState.userId();
        if (userId) {
          this.subscribeToUserOrders(userId);
        }
      },
      onDisconnect: () => {
        this.isConnected.set(false);
      },
      onWebSocketClose: () => {
        this.isConnected.set(false);
      },
      onStompError: (frame) => {
        console.warn('Customer STOMP broker reported error:', frame.headers['message']);
      }
    });

    this.client.activate();
  }

  private subscribeToUserOrders(userId: string): void {
    if (!this.client || !this.client.connected) {
      return;
    }

    if (this.userOrdersSubscription) {
      this.userOrdersSubscription.unsubscribe();
    }

    this.userOrdersSubscription = this.client.subscribe(
      `/topic/users/${userId}/orders`,
      (message: IMessage) => {
        try {
          const payload: OrderWebSocketEvent = JSON.parse(message.body);
          this.userOrderEvent$.next(payload);
        } catch (err) {
          console.error('Failed to parse customer order event:', err);
        }
      }
    );
  }

  /**
   * Watch an individual order (e.g., for guests or active order tracking screen)
   */
  watchOrder(orderId: string): Observable<OrderResponse> {
    return new Observable<OrderResponse>((subscriber) => {
      if (!this.client) {
        return;
      }

      let sub: StompSubscription | null = null;

      const performSubscription = () => {
        if (!this.client?.connected) {
          return;
        }
        sub = this.client.subscribe(`/topic/orders/${orderId}`, (message: IMessage) => {
          try {
            const payload: OrderWebSocketEvent = JSON.parse(message.body);
            subscriber.next(payload.order);
          } catch (err) {
            console.error('Failed to parse order event:', err);
          }
        });
      };

      if (this.client.connected) {
        performSubscription();
      } else {
        const intervalId = setInterval(() => {
          if (this.client?.connected) {
            clearInterval(intervalId);
            performSubscription();
          }
        }, 300);
      }

      return () => {
        if (sub) {
          sub.unsubscribe();
        }
      };
    });
  }

  private getBrokerUrl(): string {
    const baseUrl = environment.apiBaseUrl.replace(/\/+$/, '');
    const wsProtocol = baseUrl.startsWith('https://') ? 'wss://' : 'ws://';
    const hostAndPath = baseUrl.replace(/^https?:\/\//, '');
    return `${wsProtocol}${hostAndPath}/ws`;
  }

  ngOnDestroy(): void {
    if (this.userOrdersSubscription) {
      this.userOrdersSubscription.unsubscribe();
      this.userOrdersSubscription = null;
    }
    if (this.client) {
      void this.client.deactivate();
      this.client = null;
    }
  }
}
