import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { AddressCreateRequest, AddressResponse } from '../../../core/models/address.models';
import { CartResponse } from '../../../core/models/cart.models';
import { CouponValidationResponse } from '../../../core/models/coupon.models';
import { LoyaltyResponse } from '../../../core/models/loyalty.models';
import { CheckoutResponse, OrderResponse, OrderType } from '../../../core/models/order.models';
import { readApiErrorMessage } from '../../../core/models/api-error.model';
import { AddressService } from '../../../core/services/address.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { CartService } from '../../../core/services/cart.service';
import { CheckoutService } from '../../../core/services/checkout.service';
import { CouponService } from '../../../core/services/coupon.service';
import { LoyaltyService } from '../../../core/services/loyalty.service';
import { PurchaseSessionService } from '../../../core/services/purchase-session.service';

@Component({
	selector: 'app-checkout-page',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, RouterLink],
	templateUrl: './checkout-page.component.html',
	styleUrl: './checkout-page.component.css'
})
export class CheckoutPageComponent implements OnInit {
	private readonly instapayPaymentLink = 'https://ipn.eg/S/renadkd29/instapay/3BqRUg';
	private readonly instapayHandle = 'renadkd29@instapay';

	private readonly formBuilder = inject(FormBuilder);
	private readonly cartService = inject(CartService);
	private readonly authState = inject(AuthStateService);
	private readonly addressService = inject(AddressService);
	private readonly couponService = inject(CouponService);
	private readonly checkoutService = inject(CheckoutService);
	private readonly loyaltyService = inject(LoyaltyService);
	private readonly purchaseSession = inject(PurchaseSessionService);

	readonly checkoutForm = this.formBuilder.group({
		customerName: ['', [Validators.minLength(2)]],
		customerPhone: ['', [Validators.minLength(7)]],
		orderType: ['DELIVERY' as OrderType],
		addressId: [''],
		guestDeliveryCity: [''],
		guestDeliveryArea: [''],
		guestDeliveryStreet: [''],
		guestDeliveryBuilding: [''],
		guestDeliveryNotes: [''],
		notes: [''],
		scheduledDate: [''],
		couponCode: ['']
	});

	loading = true;
	loyaltyLoading = false;
	addressesLoading = false;
	validatingCoupon = false;
	placingOrder = false;
	errorMessage = '';
	statusMessage = '';
	showGuestPrompt = false;
	loyalty: LoyaltyResponse | null = null;
	addresses: AddressResponse[] = [];
	couponPreview: CouponValidationResponse | null = null;
	orders: OrderResponse[] = [];
	orderReference: CheckoutResponse | null = null;

	ngOnInit(): void {
		const savedCheckout = sessionStorage.getItem('petites_last_checkout');
		if (savedCheckout) {
			try {
				const response = JSON.parse(savedCheckout);
				this.orderReference = response;
				this.orders = response.orders;
			} catch (e) {
				sessionStorage.removeItem('petites_last_checkout');
			}
		}
		this.loadCart();
		this.loadAddresses();
		this.loadLoyalty();
		this.showGuestPrompt = !this.isAuthenticated;
		this.syncCheckoutValidation();
	}

	get cart(): CartResponse | null {
		return this.cartService.cart();
	}

	get subtotal(): number {
		return this.cart?.subtotal ?? 0;
	}

	get isMixedOrder(): boolean {
		const items = this.cart?.items ?? [];
		const hasInstant = items.some((item) => item.deliveryMode === 'INSTANT');
		const hasScheduled = items.some((item) => item.deliveryMode === 'SCHEDULED');
		return hasInstant && hasScheduled;
	}

	get deliveryFee(): number {
		if (this.orderType === 'DELIVERY') {
			return this.isMixedOrder ? 100 : 50;
		}
		return 0;
	}

	get finalAmount(): number {
		const baseAmount = this.couponPreview?.finalAmount ?? this.subtotal;
		return baseAmount + this.deliveryFee;
	}

	get hasScheduledItems(): boolean {
		return Boolean(this.cart?.items.some((item) => item.deliveryMode === 'SCHEDULED'));
	}

	get instantItems() {
		return this.cart?.items.filter((item) => item.deliveryMode === 'INSTANT') ?? [];
	}

	get scheduledItems() {
		return this.cart?.items.filter((item) => item.deliveryMode === 'SCHEDULED') ?? [];
	}

	get instantSubtotal(): number {
		return this.instantItems.reduce((sum, item) => sum + item.lineTotal, 0);
	}

	get scheduledSubtotal(): number {
		return this.scheduledItems.reduce((sum, item) => sum + item.lineTotal, 0);
	}

	get instantDeliveryFee(): number {
		return this.orderType === 'DELIVERY' ? 50 : 0;
	}

	get scheduledDeliveryFee(): number {
		return this.orderType === 'DELIVERY' ? 50 : 0;
	}

	get instantDiscount(): number {
		if (!this.couponPreview?.valid) return 0;
		const totalDiscount = this.couponPreview.discountAmount;
		return Math.min(totalDiscount, this.instantSubtotal + this.instantDeliveryFee);
	}

	get scheduledDiscount(): number {
		if (!this.couponPreview?.valid) return 0;
		const totalDiscount = this.couponPreview.discountAmount;
		return Math.max(0, totalDiscount - this.instantDiscount);
	}

	get instantTotal(): number {
		return Math.max(0, this.instantSubtotal + this.instantDeliveryFee - this.instantDiscount);
	}

	get scheduledTotal(): number {
		return Math.max(0, this.scheduledSubtotal + this.scheduledDeliveryFee - this.scheduledDiscount);
	}

	get isAuthenticated(): boolean {
		return this.authState.isAuthenticated();
	}

	get showRewardTeaser(): boolean {
		return this.isAuthenticated && Boolean(this.loyalty?.rewardAvailable && this.rewardProductId);
	}

	get rewardProductId(): string {
		return this.loyalty?.rewardProductId?.trim() ?? '';
	}

	get rewardProductName(): string {
		return this.loyalty?.rewardProductName?.trim() || 'Free item';
	}

	get rewardProductImage(): string | null {
		return this.loyalty?.rewardProductImage?.trim() || null;
	}

	get orderType(): OrderType {
		return (this.checkoutForm.controls.orderType.value as OrderType) ?? 'DELIVERY';
	}

	get showGuestDeliveryFields(): boolean {
		return !this.isAuthenticated && this.orderType === 'DELIVERY';
	}

	loadCart(): void {
		this.loading = true;
		this.errorMessage = '';

		this.cartService.loadCart().subscribe({
			next: (cart) => {
				this.loading = false;
				if (cart && cart.items && cart.items.length > 0) {
					sessionStorage.removeItem('petites_last_checkout');
					this.orders = [];
					this.orderReference = null;
				}
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

	loadLoyalty(): void {
		if (!this.isAuthenticated) {
			this.loyalty = null;
			return;
		}

		this.loyaltyLoading = true;
		this.loyaltyService.getMyLoyalty().subscribe({
			next: (loyalty) => {
				this.loyalty = loyalty;
				this.loyaltyLoading = false;
			},
			error: () => {
				this.loyalty = null;
				this.loyaltyLoading = false;
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

	onOrderTypeChange(): void {
		this.syncCheckoutValidation();
		this.errorMessage = '';
	}

	dismissGuestPrompt(): void {
		this.showGuestPrompt = false;
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

		if (this.isAuthenticated && this.orderType === 'DELIVERY' && !this.checkoutForm.controls.addressId.value) {
			this.errorMessage = 'Select a delivery address.';
			return;
		}

		if (this.showGuestDeliveryFields && !this.hasGuestDeliveryAddress()) {
			this.errorMessage = 'Enter a delivery address to place a guest delivery order.';
			this.checkoutForm.markAllAsTouched();
			return;
		}

		if (this.hasScheduledItems && !this.checkoutForm.controls.scheduledDate.value) {
			this.errorMessage = 'Choose a scheduled date for scheduled items.';
			return;
		}

		if (this.showGuestDeliveryFields) {
			this.submitGuestDeliveryCheckout();
			return;
		}

		this.submitCheckoutWithAddressId(this.orderType === 'DELIVERY' ? this.checkoutForm.controls.addressId.value || null : null);
	}

	private submitGuestDeliveryCheckout(): void {
		const guestAddress = this.buildGuestDeliveryAddress();
		if (!guestAddress) {
			return;
		}

		this.placingOrder = true;
		this.errorMessage = '';
		this.statusMessage = '';

		this.purchaseSession
			.ensureGuestSessionIfAnonymous()
			.pipe(
				switchMap(() => this.addressService.createAddress(guestAddress)),
				switchMap((address) => this.checkoutService.submitCheckout(this.buildCheckoutRequest(address.id)))
			)
			.subscribe({
				next: (response) => this.handleCheckoutSuccess(response),
				error: (error) => {
					this.placingOrder = false;
					this.errorMessage = readApiErrorMessage(error, 'Unable to complete checkout.');
				}
			});
	}

	private submitCheckoutWithAddressId(addressId: string | null): void {
		this.placingOrder = true;
		this.errorMessage = '';
		this.statusMessage = '';

		this.checkoutService.submitCheckout(this.buildCheckoutRequest(addressId)).subscribe({
			next: (response) => this.handleCheckoutSuccess(response),
			error: (error) => {
				this.placingOrder = false;
				this.errorMessage = readApiErrorMessage(error, 'Unable to complete checkout.');
			}
		});
	}

	private handleCheckoutSuccess(response: CheckoutResponse): void {
		this.placingOrder = false;
		this.orderReference = response;
		this.orders = response.orders;
		try {
			sessionStorage.setItem('petites_last_checkout', JSON.stringify(response));
		} catch (e) {
			// ignore storage quota errors
		}
		const instapayHint = this.buildInstapayHint(response.orders);
		const rewardSummary = this.findRewardSummary(response.orders);
		if (rewardSummary) {
			this.statusMessage = `Reward applied - enjoy your free ${rewardSummary.productName}! ${instapayHint}`;
		} else if (this.showRewardTeaser) {
			this.statusMessage = `We could not add the free item (out of stock). Your loyalty status remains; try again next time or contact support. ${instapayHint}`;
		} else {
			this.statusMessage = `Checkout completed. Your cart has been cleared. ${instapayHint}`;
		}
		this.couponPreview = null;
		this.checkoutForm.patchValue({ couponCode: '' });
		this.loadCart();
	}

	private buildInstapayHint(orders: OrderResponse[]): string {
		const amountToTransfer = orders.reduce((sum, order) => sum + (order.totalAmount ?? 0), 0);
		const formattedAmount = new Intl.NumberFormat('en-EG', {
			style: 'currency',
			currency: 'EGP'
		}).format(amountToTransfer);

		return `Please confirm your order by transferring ${formattedAmount} using InstaPay. Click the payment link: ${this.instapayPaymentLink}. Click the link to send money to ${this.instapayHandle}. Powered by InstaPay.`;
	}

	orderQuickDetails(order: OrderResponse): string {
		return `${order.orderType} · ${order.status} · ${new Intl.NumberFormat('en-EG', {
			style: 'currency',
			currency: 'EGP'
		}).format(order.totalAmount)}`;
	}

	private buildCheckoutRequest(addressId: string | null) {
		const couponCode = this.checkoutForm.controls.couponCode.value?.trim() ?? '';

		return {
			customerName: this.checkoutForm.controls.customerName.value?.trim() || undefined,
			customerPhone: this.checkoutForm.controls.customerPhone.value?.trim() || undefined,
			orderType: this.orderType,
			addressId,
			notes: this.checkoutForm.controls.notes.value?.trim() || undefined,
			couponId: this.couponPreview?.valid ? this.couponPreview.couponId : null,
			couponCode: this.couponPreview?.valid ? null : couponCode || null,
			scheduledDate: this.hasScheduledItems ? this.checkoutForm.controls.scheduledDate.value || null : null
		};
	}

	private buildGuestDeliveryAddress(): AddressCreateRequest | null {
		if (!this.hasGuestDeliveryAddress()) {
			return null;
		}

		return {
			city: this.checkoutForm.controls.guestDeliveryCity.value?.trim() ?? '',
			area: this.checkoutForm.controls.guestDeliveryArea.value?.trim() ?? '',
			street: this.checkoutForm.controls.guestDeliveryStreet.value?.trim() ?? '',
			building: this.checkoutForm.controls.guestDeliveryBuilding.value?.trim() || undefined,
			notes: this.checkoutForm.controls.guestDeliveryNotes.value?.trim() || undefined
		};
	}

	private hasGuestDeliveryAddress(): boolean {
		return Boolean(
			this.checkoutForm.controls.guestDeliveryCity.value?.trim() &&
			this.checkoutForm.controls.guestDeliveryArea.value?.trim() &&
			this.checkoutForm.controls.guestDeliveryStreet.value?.trim()
		);
	}

	private syncCheckoutValidation(): void {
		if (this.isAuthenticated) {
			this.checkoutForm.controls.customerName.clearValidators();
			this.checkoutForm.controls.customerPhone.clearValidators();
		} else {
			this.checkoutForm.controls.customerName.setValidators([Validators.required, Validators.minLength(2)]);
			this.checkoutForm.controls.customerPhone.setValidators([Validators.required, Validators.minLength(7)]);
		}

		if (this.isAuthenticated && this.orderType === 'DELIVERY') {
			this.checkoutForm.controls.addressId.setValidators([Validators.required]);
		} else {
			this.checkoutForm.controls.addressId.clearValidators();
		}

		const guestAddressValidators = this.showGuestDeliveryFields ? [Validators.required, Validators.minLength(2)] : [];
		this.checkoutForm.controls.guestDeliveryCity.setValidators(guestAddressValidators);
		this.checkoutForm.controls.guestDeliveryArea.setValidators(guestAddressValidators);
		this.checkoutForm.controls.guestDeliveryStreet.setValidators(guestAddressValidators);

		this.checkoutForm.controls.customerName.updateValueAndValidity({ emitEvent: false });
		this.checkoutForm.controls.customerPhone.updateValueAndValidity({ emitEvent: false });
		this.checkoutForm.controls.addressId.updateValueAndValidity({ emitEvent: false });
		this.checkoutForm.controls.guestDeliveryCity.updateValueAndValidity({ emitEvent: false });
		this.checkoutForm.controls.guestDeliveryArea.updateValueAndValidity({ emitEvent: false });
		this.checkoutForm.controls.guestDeliveryStreet.updateValueAndValidity({ emitEvent: false });
	}

	rewardLine(order: OrderResponse): string | null {
		const rewardSummary = this.findRewardSummary([order]);
		if (!rewardSummary) {
			return null;
		}

		return `Reward applied — enjoy your free ${rewardSummary.productName}!`;
	}

	private findRewardSummary(orders: OrderResponse[]): { productName: string } | null {
		for (const order of orders) {
			if (order.rewardApplied) {
				return { productName: this.rewardProductName };
			}

			const rewardItem = order.items.find((item) => this.isRewardItem(item));
			if (rewardItem) {
				return { productName: rewardItem.productName?.trim() || this.rewardProductName };
			}
		}

		return null;
	}

	private isRewardItem(item: OrderResponse['items'][number]): boolean {
		if (item.unitPrice !== 0) {
			return false;
		}

		const rewardProductId = this.rewardProductId.toLowerCase();
		const productId = item.productId?.trim().toLowerCase() ?? '';
		if (rewardProductId && productId === rewardProductId) {
			return true;
		}

		const rewardProductName = this.rewardProductName.toLowerCase();
		const productName = item.productName?.trim().toLowerCase() ?? '';
		return Boolean(rewardProductName && productName === rewardProductName);
	}
}