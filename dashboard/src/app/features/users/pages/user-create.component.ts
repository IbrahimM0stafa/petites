import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { readApiErrorMessage } from '../../../core/models/api-error.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
	selector: 'app-user-create',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, RouterLink],
	templateUrl: './user-create.component.html',
	styleUrl: './user-create.component.css'
})
export class UserCreateComponent {
	private readonly authService = inject(AuthService);
	private readonly router = inject(Router);
	private readonly fb = inject(FormBuilder);

	userForm: FormGroup = this.fb.group({
		name: ['', [Validators.required, Validators.maxLength(100)]],
		phone: ['', [Validators.required, Validators.maxLength(20)]],
		email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
		password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(255)]],
		role: ['STAFF', Validators.required]
	});

	loading = false;
	errorMessage = '';
	fieldErrors: Record<string, string[]> = {};

	// Confirmation popup state
	showConfirmPopup = false;
	confirmLoading = false;
	confirmError = '';

	get selectedRole(): string {
		return this.userForm.get('role')?.value ?? 'STAFF';
	}

	get enteredEmail(): string {
		return this.userForm.get('email')?.value ?? '';
	}

	onSubmit(): void {
		if (this.userForm.invalid) {
			this.userForm.markAllAsTouched();
			return;
		}

		this.loading = true;
		this.errorMessage = '';
		this.fieldErrors = {};

		this.authService.createAdminUser(this.userForm.value).subscribe({
			next: () => {
				this.loading = false;
				void this.router.navigate(['/users']);
			},
			error: (err) => {
				this.loading = false;
				const msg = readApiErrorMessage(err, 'Failed to create user.');
				// Detect the duplicate-email case and show confirmation popup
				if (msg.toLowerCase().includes('email is already registered')) {
					this.showConfirmPopup = true;
				} else {
					this.errorMessage = msg;
				}
				if (err.error && typeof err.error === 'object' && err.error.errors) {
					this.fieldErrors = err.error.errors;
				}
			}
		});
	}

	cancelConfirm(): void {
		this.showConfirmPopup = false;
		this.confirmError = '';
	}

	confirmAssignRole(): void {
		this.confirmLoading = true;
		this.confirmError = '';

		this.authService.assignRoleByEmail(this.enteredEmail, this.selectedRole).subscribe({
			next: () => {
				this.confirmLoading = false;
				this.showConfirmPopup = false;
				void this.router.navigate(['/users']);
			},
			error: (err) => {
				this.confirmLoading = false;
				this.confirmError = readApiErrorMessage(err, 'Failed to assign role.');
			}
		});
	}
}
