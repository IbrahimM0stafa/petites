import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { AudioNotificationService } from '../../core/services/audio-notification.service';
import { OrderNotificationService } from '../../core/services/order-notification.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { OrderResponse } from '../../core/models/order.model';

@Component({
	selector: 'app-admin-shell',
	standalone: true,
	imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
	templateUrl: './admin-shell.component.html',
	styleUrl: './admin-shell.component.css'
})
export class AdminShellComponent implements OnInit, OnDestroy {
	private readonly authService = inject(AuthService);
	private readonly router = inject(Router);
	readonly authState = inject(AuthStateService);
	readonly orderNotification = inject(OrderNotificationService);
	readonly audioService = inject(AudioNotificationService);
	readonly webSocketService = inject(WebSocketService);

	readonly sidebarOpen = signal(false);
	readonly notificationMenuOpen = signal(false);

	private routerSub?: Subscription;

	ngOnInit(): void {
		// Ensure WebSocket has current auth token and is active
		this.webSocketService.reconnectWithFreshToken();

		// Auto-clear notification badge when viewing orders page
		this.routerSub = this.router.events
			.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
			.subscribe((event) => {
				if (event.urlAfterRedirects.startsWith('/orders')) {
					this.orderNotification.markAllAsRead();
				}
				this.notificationMenuOpen.set(false);
			});
	}

	toggleSidebar(): void {
		this.sidebarOpen.update((open) => !open);
	}

	closeSidebar(): void {
		this.sidebarOpen.set(false);
	}

	toggleNotificationMenu(event?: MouseEvent): void {
		if (event) {
			event.stopPropagation();
		}
		this.notificationMenuOpen.update((open) => !open);
	}

	closeNotificationMenu(): void {
		this.notificationMenuOpen.set(false);
	}

	markAllRead(): void {
		this.orderNotification.markAllAsRead();
	}

	viewOrder(order: OrderResponse, toastId?: string): void {
		this.orderNotification.viewOrder(order, toastId);
		this.closeNotificationMenu();
		this.closeSidebar();
	}

	requestDesktopPermission(): void {
		void this.orderNotification.requestBrowserPermission();
	}

	logout(): void {
		this.authService.logout();
		void this.router.navigateByUrl('/login');
	}

	@HostListener('document:click', ['$event'])
	onDocumentClick(event: MouseEvent): void {
		const target = event.target as HTMLElement;
		if (this.notificationMenuOpen() && !target.closest('.notification-dropdown-wrapper')) {
			this.notificationMenuOpen.set(false);
		}
	}

	ngOnDestroy(): void {
		if (this.routerSub) {
			this.routerSub.unsubscribe();
		}
	}
}
