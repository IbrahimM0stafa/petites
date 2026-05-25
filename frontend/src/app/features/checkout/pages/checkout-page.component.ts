import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AddressResponse } from '../../../core/models/address.models';
import { CartResponse } from '../../../core/models/cart.models';
import { CouponValidationResponse } from '../../../core/models/coupon.models';
import { CheckoutResponse, OrderResponse, OrderType } from '../../../core/models/order.models';
import { readApiErrorMessage } from '../../../core/models/api-error.model';
import { AddressService } from '../../../core/services/address.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { CartService } from '../../../core/services/cart.service';
import { CheckoutService } from '../../../core/services/checkout.service';
import { CouponService } from '../../../core/services/coupon.service';

@Component({
	selector: 'app-checkout-page',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, RouterLink],
	templateUrl: './checkout-page.component.html',
	styleUrl: './checkout-page.component.css'
})
export class CheckoutPageComponent implements OnInit {
	private readonly formBuilder = inject(FormBuilder);
	private readonly cartService = inject(CartService);
	private readonly authState = inject(AuthStateService);
	private readonly addressService = inject(AddressService);
	private readonly couponService = inject(CouponService);
	private readonly checkoutService = inject(CheckoutService);

	readonly checkoutForm = this.formBuilder.group({
		customerName: ['', [Validators.minLength(2)]],
		customerPhone: ['', [Validators.minLength(7)]],
		orderType: ['DELIVERY' as OrderType],
		addressId: [''],
		notes: [''],
		scheduledDate: [''],
		couponCode: ['']
	});

	loading = true;
	addressesLoading = false;
	validatingCoupon = false;
	placingOrder = false;
	errorMessage = '';
	statusMessage = '';
	addresses: AddressResponse[] = [];
	couponPreview: CouponValidationResponse | null = null;
	orders: OrderResponse[] = [];
	orderReference: CheckoutResponse | null = null;

	ngOnInit(): void {
		this.loadCart();
		this.loadAddresses();
		if (!this.authState.isAuthenticated()) {
			this.checkoutForm.patchValue({ orderType: 'PICKUP' });
			this.checkoutForm.controls.customerName.addValidators([Validators.required, Validators.minLength(2)]);
			this.checkoutForm.controls.customerName.updateValueAndValidity();
			this.checkoutForm.controls.customerPhone.addValidators([Validators.required, Validators.minLength(7)]);
			this.checkoutForm.controls.customerPhone.updateValueAndValidity();
		}
	}

	get cart(): CartResponse | null {
		return this.cartService.cart();
	}

	get subtotal(): number {
		return this.cart?.subtotal ?? 0;
	}

	get finalAmount(): number {
		return this.couponPreview?.finalAmount ?? this.subtotal;
	}

	get hasScheduledItems(): boolean {
		return Boolean(this.cart?.items.some((item) => item.deliveryMode === 'SCHEDULED'));
	}

	get isAuthenticated(): boolean {
		return this.authState.isAuthenticated();
	}

	get orderType(): OrderType {
		return (this.checkoutForm.controls.orderType.value as OrderType) ?? 'DELIVERY';
	}

	loadCart(): void {
		this.loading = true;
		this.errorMessage = '';

		this.cartService.loadCart().subscribe({
			next: () => {
				this.loading = false;
			},
			error: (error) => {
				this.loading = false;
				this.errorMessage = readApiErrorMessage(error, 'Unable to load cart for checkout.');
			}
		});
	}

	loadAddresses(): void {
		if (!this.isAuthenticated) {
			return;
		}

		this.addressesLoading = true;
		this.addressService.listAddresses().subscribe({
			next: (addresses) => {
				this.addresses = addresses;
				this.addressesLoading = false;
				if (!this.checkoutForm.controls.addressId.value && addresses.length > 0) {
					this.checkoutForm.patchValue({ addressId: addresses[0].id });
				}
			},
			error: (error) => {
				this.addressesLoading = false;
				this.errorMessage = readApiErrorMessage(error, 'Unable to load addresses.');
			}
		});
	}

	validateCoupon(): void {
		const couponCode = this.checkoutForm.controls.couponCode.value?.trim();
		if (!couponCode || this.subtotal <= 0) {
			return;
		}

		this.validatingCoupon = true;
		this.errorMessage = '';
		this.couponService.validateCoupon(couponCode, this.subtotal).subscribe({
			next: (preview) => {
				this.validatingCoupon = false;
				this.couponPreview = preview.valid ? preview : null;
				this.statusMessage = preview.message;
			},
			error: (error) => {
				this.validatingCoupon = false;
				this.errorMessage = readApiErrorMessage(error, 'Unable to validate coupon.');
			}
		});
	}

	submitCheckout(): void {
		if (!this.cart?.items?.length) {
			this.errorMessage = 'Your cart is empty.';
			return;
		}

		if (this.checkoutForm.invalid) {
			this.checkoutForm.markAllAsTouched();
			return;
		}

		if (!this.isAuthenticated && this.orderType === 'DELIVERY') {
			this.errorMessage = 'Guest checkout currently supports pickup only. Sign in to deliver to a saved address.';
			return;
		}

		if (this.orderType === 'DELIVERY' && !this.checkoutForm.controls.addressId.value) {
			this.errorMessage = 'Select a delivery address.';
			return;
		}

		if (this.hasScheduledItems && !this.checkoutForm.controls.scheduledDate.value) {
			this.errorMessage = 'Choose a scheduled date for scheduled items.';
			return;
		}

		this.placingOrder = true;
		this.errorMessage = '';
		this.statusMessage = '';

		const couponCode = this.checkoutForm.controls.couponCode.value?.trim() ?? '';
		const payload = {
			customerName: this.checkoutForm.controls.customerName.value?.trim() || undefined,
			customerPhone: this.checkoutForm.controls.customerPhone.value?.trim() || undefined,
			orderType: this.orderType,
			addressId: this.orderType === 'DELIVERY' ? this.checkoutForm.controls.addressId.value || null : null,
			notes: this.checkoutForm.controls.notes.value?.trim() || undefined,
			couponId: this.couponPreview?.valid ? this.couponPreview.couponId : null,
			couponCode: this.couponPreview?.valid ? null : couponCode || null,
			scheduledDate: this.hasScheduledItems ? this.checkoutForm.controls.scheduledDate.value || null : null
		};

		this.checkoutService.submitCheckout(payload).subscribe({
			next: (response) => {
				this.placingOrder = false;
				this.orderReference = response;
				this.orders = response.orders;
				this.statusMessage = 'Checkout completed. Your cart has been cleared.';
				this.couponPreview = null;
				this.checkoutForm.patchValue({ couponCode: '' });
				this.loadCart();
			},
			error: (error) => {
				this.placingOrder = false;
				this.errorMessage = readApiErrorMessage(error, 'Unable to complete checkout.');
			}
		});
	}
}