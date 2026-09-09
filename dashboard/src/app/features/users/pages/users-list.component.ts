import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { readApiErrorMessage } from '../../../core/models/api-error.model';
import { UserResponse } from '../../../core/models/user.models';
import { AuthService } from '../../../core/services/auth.service';

@Component({
	selector: 'app-users-list',
	standalone: true,
	imports: [CommonModule, RouterLink, FormsModule],
	templateUrl: './users-list.component.html',
	styleUrl: './users-list.component.css'
})
export class UsersListComponent implements OnInit, OnDestroy {
	private readonly authService = inject(AuthService);
	private readonly destroy$ = new Subject<void>();
	private readonly searchInput$ = new Subject<string>();

	users: UserResponse[] = [];
	loading = true;
	error = '';

	// Search & Filter
	searchName = '';
	selectedRole = '';

	// Available roles for the dropdown (well-known static list)
	readonly availableRoles = ['USER', 'STAFF', 'SUPER_ADMIN'];

	// Pagination (server-side)
	page = 0;
	readonly size = 10;
	totalPages = 0;
	totalElements = 0;

	ngOnInit(): void {
		// Debounce name search so we don't fire a request on every keystroke
		this.searchInput$.pipe(
			debounceTime(350),
			distinctUntilChanged(),
			takeUntil(this.destroy$)
		).subscribe(() => {
			this.page = 0;
			this.loadUsers();
		});

		this.loadUsers();
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}

	loadUsers(): void {
		this.loading = true;
		this.error = '';

		this.authService.listUsers({
			name: this.searchName || undefined,
			role: this.selectedRole || undefined,
			page: this.page,
			size: this.size,
			sort: 'name,asc'
		}).subscribe({
			next: (res) => {
				this.users = res.content;
				this.totalElements = res.totalElements;
				this.totalPages = res.totalPages;
				this.loading = false;
			},
			error: (err) => {
				this.error = readApiErrorMessage(err, 'Failed to load users.');
				this.loading = false;
			}
		});
	}

	onNameInput(): void {
		this.searchInput$.next(this.searchName);
	}

	onFilterChange(): void {
		this.page = 0;
		this.loadUsers();
	}

	setPage(pageIndex: number): void {
		if (pageIndex >= 0 && pageIndex < this.totalPages) {
			this.page = pageIndex;
			this.loadUsers();
		}
	}

	mathMin(a: number, b: number): number {
		return Math.min(a, b);
	}
}
