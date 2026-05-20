import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { AuthStateService } from '../../core/services/auth-state.service';

@Component({
	selector: 'app-admin-shell',
	standalone: true,
	imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
	templateUrl: './admin-shell.component.html',
	styleUrl: './admin-shell.component.css'
})
export class AdminShellComponent {
	private readonly authService = inject(AuthService);
	private readonly router = inject(Router);
	readonly authState = inject(AuthStateService);
	readonly sidebarOpen = signal(false);

	toggleSidebar(): void {
		this.sidebarOpen.update((open) => !open);
	}

	closeSidebar(): void {
		this.sidebarOpen.set(false);
	}

	logout(): void {
		this.authService.logout();
		void this.router.navigateByUrl('/login');
	}
}
