import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CouponValidationResponse } from '../../../../core/models/coupon.models';

@Component({
	selector: 'app-coupon-form',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule],
	templateUrl: './coupon-form.component.html',
	styleUrl: './coupon-form.component.css'
})
export class CouponFormComponent {
	@Input({ required: true }) checkoutForm!: FormGroup;
	@Input({ required: true }) validatingCoupon!: boolean;
	@Input({ required: true }) couponPreview!: CouponValidationResponse | null;
	@Input({ required: true }) subtotal!: number;

	@Output() validate = new EventEmitter<void>();
}
