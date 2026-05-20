import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { hasAdminRole } from '../../../../core/auth/admin-roles';
import { readApiErrorMessage, readApiFieldErrors } from '../../../../core/models/api-error.model';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
	selector: 'app-login-form',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule],
	templateUrl: './login-form.component.html',
	styleUrl: './login-form.component.css'
})
export class LoginFormComponent {
	private readonly formBuilder = inject(FormBuilder);
	private readonly route = inject(ActivatedRoute);

	readonly loginForm = this.formBuilder.group({
		email: ['', [Validators.required, Validators.email]],
		password: ['', [Validators.required, Validators.minLength(8)]]
	});

	loading = false;
	serverError = '';
	serverFieldErrors: Record<string, string[]> = {};

	constructor(
		private readonly authService: AuthService,
		private readonly router: Router
	) {
		if (this.route.snapshot.queryParamMap.get('unauthorized') === '1') {
			this.serverError = 'Your account does not have staff access.';
		}
	}

	submit(): void {
		if (this.loginForm.invalid) {
			this.loginForm.markAllAsTouched();
			return;
		}

		this.loading = true;
		this.serverError = '';
		this.serverFieldErrors = {};

		const email = this.loginForm.controls.email.value ?? '';
		const password = this.loginForm.controls.password.value ?? '';

		this.authService.login({ email, password }).subscribe({
			next: async (session) => {
				this.loading = false;

				if (!hasAdminRole(session.roles)) {
					this.authService.logout();
					this.serverError = 'Your account does not have staff access.';
					return;
				}

				await this.router.navigateByUrl('/');
			},
			error: (error) => {
				this.loading = false;
				this.serverError = readApiErrorMessage(error, 'Unable to sign in.');
				this.serverFieldErrors = readApiFieldErrors(error) ?? {};
			}
		});
	}
}
