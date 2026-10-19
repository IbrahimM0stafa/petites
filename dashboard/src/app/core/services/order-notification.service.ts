import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { OrderResponse } from '../models/order.model';
import { AudioNotificationService } from './audio-notification.service';
import { WebSocketService } from './websocket.service';

export interface OrderToast {
  id: string;
  order: OrderResponse;
  receivedAt: Date;
}

export interface OrderNotificationItem {
  id: string;
  order: OrderResponse;
  receivedAt: Date;
  isRead: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OrderNotificationService implements OnDestroy {
  private readonly webSocketService = inject(WebSocketService);
  private readonly audioService = inject(AudioNotificationService);
  private readonly router = inject(Router);

  private orderSubscription: Subscription | null = null;
  private autoDismissTimers = new Map<string, any>();

  readonly activeToasts = signal<OrderToast[]>([]);
  readonly unreadCount = signal<number>(0);
  readonly recentNotifications = signal<OrderNotificationItem[]>([]);
  readonly notificationPermission = signal<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  constructor() {
    this.startListening();
  }

  private startListening(): void {
    if (this.orderSubscription) {
      return;
    }

    this.orderSubscription = this.webSocketService.newOrders$.subscribe((order) => {
      this.handleNewOrder(order);
    });
  }

  private handleNewOrder(order: OrderResponse): void {
    const id = `order-notif-${order.orderId || Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const receivedAt = new Date();

    // 1. Play chime alert
    this.audioService.playChime();

    // 2. Increment unread orders counter
    this.unreadCount.update((count) => count + 1);

    // 3. Add to recent notifications history (keep top 20)
    const newHistoryItem: OrderNotificationItem = {
      id,
      order,
      receivedAt,
      isRead: false
    };
    this.recentNotifications.update((list) => [newHistoryItem, ...list.slice(0, 19)]);

    // 4. Create floating toast notification (keep up to 4 concurrent toasts)
    const newToast: OrderToast = { id, order, receivedAt };
    this.activeToasts.update((toasts) => [newToast, ...toasts.slice(0, 3)]);

    // 5. Setup auto-dismiss timer for toast (8 seconds)
    const timer = setTimeout(() => {
      this.dismissToast(id);
    }, 8000);
    this.autoDismissTimers.set(id, timer);

    // 6. Trigger desktop browser notification if allowed
    this.triggerBrowserNotification(order);
  }

  private triggerBrowserNotification(order: OrderResponse): void {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }

    try {
      const customer = order.customerName ? `${order.customerName} • ` : '';
      const amount = typeof order.totalAmount === 'number' ? `$${order.totalAmount.toFixed(2)}` : '';
      const mode = order.deliveryMode ? ` (${order.deliveryMode})` : '';

      const notification = new Notification(`New Order #${order.orderNumber || ''}`, {
        body: `${customer}${amount}${mode}`,
        icon: '/favicon.ico',
        tag: `order-${order.orderId || Date.now()}`
      });

      notification.onclick = () => {
        try {
          window.focus();
        } catch {
          // Window focus might be restricted by browser
        }
        this.viewOrder(order);
        notification.close();
      };
    } catch (err) {
      console.warn('Browser desktop notification failed to display:', err);
    }
  }

  requestBrowserPermission(): Promise<NotificationPermission> {
    if (typeof Notification === 'undefined') {
      return Promise.resolve('denied');
    }

    return Notification.requestPermission().then((permission) => {
      this.notificationPermission.set(permission);
      return permission;
    });
  }

  dismissToast(toastId: string): void {
    const timer = this.autoDismissTimers.get(toastId);
    if (timer) {
      clearTimeout(timer);
      this.autoDismissTimers.delete(toastId);
    }
    this.activeToasts.update((toasts) => toasts.filter((t) => t.id !== toastId));
  }

  dismissAllToasts(): void {
    for (const timer of this.autoDismissTimers.values()) {
      clearTimeout(timer);
    }
    this.autoDismissTimers.clear();
    this.activeToasts.set([]);
  }

  markAllAsRead(): void {
    this.unreadCount.set(0);
    this.recentNotifications.update((items) =>
      items.map((item) => ({ ...item, isRead: true }))
    );
  }

  markAsRead(id: string): void {
    this.recentNotifications.update((items) =>
      items.map((item) => {
        if (item.id === id && !item.isRead) {
          this.unreadCount.update((count) => Math.max(0, count - 1));
          return { ...item, isRead: true };
        }
        return item;
      })
    );
  }

  viewOrder(order: OrderResponse, toastId?: string): void {
    if (toastId) {
      this.dismissToast(toastId);
    }
    this.markAllAsRead();

    if (order.orderId) {
      void this.router.navigate(['/orders', order.orderId]);
    } else {
      void this.router.navigate(['/orders']);
    }
  }

  clearHistory(): void {
    this.recentNotifications.set([]);
    this.unreadCount.set(0);
  }

  ngOnDestroy(): void {
    if (this.orderSubscription) {
      this.orderSubscription.unsubscribe();
      this.orderSubscription = null;
    }
    this.dismissAllToasts();
  }
}
