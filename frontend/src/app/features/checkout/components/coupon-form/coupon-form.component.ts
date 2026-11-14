import { CurrencyPipe } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CouponValidationResponse } from '../../../../core/models/coupon.models';

@Component({
	selector: 'app-coupon-form',
	standalone: true,
	imports: [CurrencyPipe, ReactiveFormsModule],
	templateUrl: './coupon-form.component.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	styleUrl: './coupon-form.component.css'
})
export class CouponFormComponent {
	@Input({ required: true }) checkoutForm!: FormGroup;
	@Input({ required: true }) validatingCoupon!: boolean;
	@Input({ required: true }) couponPreview!: CouponValidationResponse | null;
	@Input({ required: true }) subtotal!: number;

	@Output() validate = new EventEmitter<void>();
}
