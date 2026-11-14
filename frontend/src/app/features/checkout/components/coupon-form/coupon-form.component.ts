import { CurrencyPipe } from '@angular/common';
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CouponValidationResponse } from '../../../../core/models/coupon.models';

@Component({
	selector: 'app-coupon-form',
	standalone: true,
	imports: [CurrencyPipe, ReactiveFormsModule],
	templateUrl: './coupon-form.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './coupon-form.component.css'
})
export class CouponFormComponent {
	readonly checkoutForm = input.required<FormGroup>();
	readonly validatingCoupon = input.required<boolean>();
	readonly couponPreview = input.required<CouponValidationResponse | null>();
	readonly subtotal = input.required<number>();

	readonly validate = output<void>();
}
