import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { readApiErrorMessage } from '../../../core/models/api-error.model';
import { AuthService } from '../../../core/services/auth.service';

const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
	const password = control.get('newPassword');
	const confirmPassword = control.get('confirmPassword');
	return password && confirmPassword && password.value === confirmPassword.value ? null : { passwordMismatch: true };
};

@Component({
	selector: 'app-forgot-password-page',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, RouterLink],
	templateUrl: './forgot-password-page.component.html',
	styleUrl: './forgot-password-page.component.css'
})
export class ForgotPasswordPageComponent {
	private readonly formBuilder = inject(FormBuilder);
	private readonly authService = inject(AuthService);
	private readonly router = inject(Router);

	step: 'request' | 'verify' | 'reset' = 'request';
	loading = false;
	errorMessage = '';
	email = '';
	otp = '';

	readonly forgotForm = this.formBuilder.group({
		email: ['', [Validators.required, Validators.email]]
	});

	readonly verifyForm = this.formBuilder.group({
		otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
	});

	readonly resetForm = this.formBuilder.group({
		newPassword: ['', [Validators.required, Validators.minLength(8)]],
		confirmPassword: ['', [Validators.required]]
	}, { validators: passwordMatchValidator });

	requestOtp(isResend = false): void {
		if (this.forgotForm.invalid) {
			this.forgotForm.markAllAsTouched();
			return;
		}

		this.loading = true;
		this.errorMessage = '';

		const emailInput = this.forgotForm.controls.email.value ?? '';

		this.authService.forgotPassword(emailInput).subscribe({
			next: () => {
				this.loading = false;
				this.email = emailInput;
				if (!isResend) {
					this.step = 'verify';
				} else {
					this.errorMessage = 'A new verification code has been sent!';
				}
			},
			error: (error: any) => {
				this.loading = false;
				this.errorMessage = readApiErrorMessage(error, 'Failed to send OTP. Please try again.');
			}
		});
	}

	submitOtp(): void {
		if (this.verifyForm.invalid) {
			this.verifyForm.markAllAsTouched();
			return;
		}

		this.loading = true;
		this.errorMessage = '';

		const otpInput = this.verifyForm.controls.otp.value ?? '';

		this.authService.verifyOtp(this.email, otpInput).subscribe({
			next: () => {
				this.loading = false;
				this.otp = otpInput;
				this.step = 'reset';
			},
			error: (error: any) => {
				this.loading = false;
				this.errorMessage = readApiErrorMessage(error, 'Invalid or expired OTP code.');
			}
		});
	}

	submitPassword(): void {
		if (this.resetForm.invalid) {
			this.resetForm.markAllAsTouched();
			return;
		}

		this.loading = true;
		this.errorMessage = '';

		const newPasswordVal = this.resetForm.controls.newPassword.value ?? '';

		this.authService.resetPassword(this.email, this.otp, newPasswordVal).subscribe({
			next: async () => {
				this.loading = false;
				// Successfully reset, redirect to login page
				await this.router.navigate(['/login'], {
					queryParams: { resetSuccess: 'true' }
				});
			},
			error: (error: any) => {
				this.loading = false;
				this.errorMessage = readApiErrorMessage(error, 'Failed to reset password. Please request a new OTP.');
			}
		});
	}
}
