import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { readApiErrorMessage } from '../../../core/models/api-error.model';
import { UserResponse } from '../../../core/models/user.models';
import { AuthService } from '../../../core/services/auth.service';

@Component({
	selector: 'app-users-list',
	standalone: true,
	imports: [CommonModule, RouterLink],
	templateUrl: './users-list.component.html',
	styleUrl: './users-list.component.css'
})
export class UsersListComponent implements OnInit {
	private readonly authService = inject(AuthService);

	users: UserResponse[] = [];
	loading = true;
	error = '';

	ngOnInit(): void {
		this.loadUsers();
	}

	loadUsers(): void {
		this.loading = true;
		this.error = '';

		this.authService.listUsers().subscribe({
			next: (users) => {
				this.users = users;
				this.loading = false;
			},
			error: (err) => {
				this.error = readApiErrorMessage(err, 'Failed to load users.');
				this.loading = false;
			}
		});
	}
}
