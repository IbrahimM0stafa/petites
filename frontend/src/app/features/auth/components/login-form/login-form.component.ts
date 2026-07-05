import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { readApiErrorMessage, readApiFieldErrors } from '../../../../core/models/api-error.model';
import { CartService } from '../../../../core/services/cart.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
	selector: 'app-login-form',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, RouterLink],
	templateUrl: './login-form.component.html',
	styleUrl: './login-form.component.css'
})
export class LoginFormComponent implements OnInit {
	private readonly formBuilder = inject(FormBuilder);
	private readonly route = inject(ActivatedRoute);

	readonly loginForm = this.formBuilder.group({
		email: ['', [Validators.required, Validators.email]],
		password: ['', [Validators.required, Validators.minLength(8)]]
	});

	loading = false;
	serverError = '';
	successMessage = '';
	serverFieldErrors: Record<string, string[]> = {};

	constructor(
		private readonly authService: AuthService,
		private readonly cartService: CartService,
		private readonly router: Router
	) {}

	ngOnInit(): void {
		this.route.queryParams.subscribe((params) => {
			if (params['resetSuccess'] === 'true') {
				this.successMessage = 'Your password has been reset successfully. Please sign in with your new password.';
			}
		});
	}

	submit(): void {
		if (this.loginForm.invalid) {
			this.loginForm.markAllAsTouched();
			return;
		}

		this.loading = true;
		this.serverError = '';
		this.successMessage = '';
		this.serverFieldErrors = {};

		const email = this.loginForm.controls.email.value ?? '';
		const password = this.loginForm.controls.password.value ?? '';

		this.authService.login({ email, password }).subscribe({
			next: async () => {
				this.loading = false;
				this.cartService.loadCart().subscribe({ error: () => undefined });
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