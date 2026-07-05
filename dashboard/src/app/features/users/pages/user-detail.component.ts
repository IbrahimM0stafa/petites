import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { readApiErrorMessage } from '../../../core/models/api-error.model';
import { UserResponse } from '../../../core/models/user.models';
import { AuthService } from '../../../core/services/auth.service';
import { AuthStateService } from '../../../core/services/auth-state.service';

@Component({
	selector: 'app-user-detail',
	standalone: true,
	imports: [CommonModule, RouterLink],
	templateUrl: './user-detail.component.html',
	styleUrl: './user-detail.component.css'
})
export class UserDetailComponent implements OnInit {
	private readonly authService = inject(AuthService);
	private readonly route = inject(ActivatedRoute);
	readonly authState = inject(AuthStateService);

	user: UserResponse | null = null;
	loading = true;
	error = '';
	actionLoading = false;

	ngOnInit(): void {
		const id = this.route.snapshot.paramMap.get('id');
		if (!id) {
			this.error = 'User not found.';
			this.loading = false;
			return;
		}

		this.loadUser(id);
	}

	loadUser(id: string): void {
		this.loading = true;
		this.error = '';

		this.authService.getUser(id).subscribe({
			next: (user) => {
				this.user = user;
				this.loading = false;
			},
			error: (err) => {
				this.error = readApiErrorMessage(err, 'Failed to load user.');
				this.loading = false;
			}
		});
	}

	deactivate(): void {
		if (!this.user) {
			return;
		}

		this.runAction(() => this.authService.deactivateUser(this.user!.id));
	}

	reactivate(): void {
		if (!this.user) {
			return;
		}

		this.runAction(() => this.authService.reactivateUser(this.user!.id));
	}

	private runAction(action: () => ReturnType<AuthService['deactivateUser']>): void {
		this.actionLoading = true;
		this.error = '';

		action().subscribe({
			next: (user) => {
				this.user = user;
				this.actionLoading = false;
			},
			error: (err) => {
				this.error = readApiErrorMessage(err, 'Action failed.');
				this.actionLoading = false;
			}
		});
	}
}
