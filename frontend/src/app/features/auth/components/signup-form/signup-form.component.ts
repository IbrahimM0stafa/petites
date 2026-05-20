import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { readApiErrorMessage, readApiFieldErrors } from '../../../../core/models/api-error.model';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
	selector: 'app-signup-form',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, RouterLink],
	templateUrl: './signup-form.component.html',
	styleUrl: './signup-form.component.css'
})
export class SignupFormComponent {
	private readonly formBuilder = inject(FormBuilder);

	readonly signupForm = this.formBuilder.group({
		name: ['', [Validators.required, Validators.minLength(2)]],
		phone: ['', [Validators.required, Validators.minLength(7)]],
		email: ['', [Validators.required, Validators.email]],
		password: ['', [Validators.required, Validators.minLength(8)]]
	});

	loading = false;
	serverError = '';
	serverFieldErrors: Record<string, string[]> = {};

	constructor(
		private readonly authService: AuthService,
		private readonly router: Router
	) {}

	submit(): void {
		if (this.signupForm.invalid) {
			this.signupForm.markAllAsTouched();
			return;
		}

		this.loading = true;
		this.serverError = '';
		this.serverFieldErrors = {};

		const { name, phone, email, password } = this.signupForm.getRawValue();
		const credentials = { email: email ?? '', password: password ?? '' };

		this.authService
			.signup({ name: name ?? '', phone: phone ?? '', email: credentials.email, password: credentials.password })
			.pipe(switchMap(() => this.authService.login(credentials)))
			.subscribe({
				next: async () => {
					this.loading = false;
					await this.router.navigateByUrl('/');
				},
				error: (error) => {
					this.loading = false;
					this.serverError = readApiErrorMessage(error, 'Unable to create account.');
					this.serverFieldErrors = readApiFieldErrors(error) ?? {};
				}
			});
	}
}