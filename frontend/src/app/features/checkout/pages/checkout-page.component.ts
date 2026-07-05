import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, switchMap } from 'rxjs';
import { ShopService } from '../../../core/services/shop.service';
import { SettingService } from '../../../core/services/setting.service';

import { AddressCreateRequest, SavedAddressResponse } from '../../../core/models/address.models';
import { CartResponse } from '../../../core/models/cart.models';
import { CouponValidationResponse } from '../../../core/models/coupon.models';
import { LoyaltyResponse } from '../../../core/models/loyalty.models';
import { CheckoutResponse, OrderResponse, OrderType } from '../../../core/models/order.models';
import { readApiErrorMessage, readApiFieldErrors } from '../../../core/models/api-error.model';
import { AddressService } from '../../../core/services/address.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { CartService } from '../../../core/services/cart.service';
import { CheckoutService } from '../../../core/services/checkout.service';
import { CouponService } from '../../../core/services/coupon.service';
import { LoyaltyService } from '../../../core/services/loyalty.service';
import { PurchaseSessionService } from '../../../core/services/purchase-session.service';

import { AddressFormComponent } from '../components/address-form/address-form.component';
import { CouponFormComponent } from '../components/coupon-form/coupon-form.component';
import { CheckoutSummaryComponent } from '../components/checkout-summary/checkout-summary.component';
import { SuccessOrdersComponent } from '../components/success-orders/success-orders.component';
import { PaymentFormComponent } from '../components/payment-form/payment-form.component';

@Component({
	selector: 'app-checkout-page',
	standalone: true,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		RouterLink,
		AddressFormComponent,
		CouponFormComponent,
		CheckoutSummaryComponent,
		SuccessOrdersComponent,
		PaymentFormComponent
	],
	templateUrl: './checkout-page.component.html',
	styleUrl: './checkout-page.component.css'
})
export class CheckoutPageComponent implements OnInit {
	readonly instapayPaymentLink = 'https://ipn.eg/S/renadkd29/instapay/3BqRUg';
	readonly instapayHandle = 'renadkd29@instapay';

	private readonly formBuilder = inject(FormBuilder);
	private readonly cartService = inject(CartService);
	private readonly authState = inject(AuthStateService);
	private readonly addressService = inject(AddressService);
	private readonly couponService = inject(CouponService);
	private readonly checkoutService = inject(CheckoutService);
	private readonly loyaltyService = inject(LoyaltyService);
	private readonly purchaseSession = inject(PurchaseSessionService);
	private readonly shopService = inject(ShopService);
	private readonly settingService = inject(SettingService);

	deliveryFeeRate = 50;
	minScheduledDate = '';
	blockedDays: string[] = [];

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
	showErrorPopup = false;
	errorPopupMode: 'checkout' | 'basket' = 'checkout';
	statusMessage = '';
	showInstapayPopup = false;
	totalAmountToTransfer = '';
	showGuestPrompt = false;
	loyalty: LoyaltyResponse | null = null;
	addresses: SavedAddressResponse[] = [];
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
		this.loadDeliveryFeeSetting();
		this.loadBlockedDaysSetting();
		this.showGuestPrompt = !this.isAuthenticated;
		this.syncCheckoutValidation();

		this.checkoutForm.controls.addressId.valueChanges.subscribe(() => {
			this.syncCheckoutValidation();
		});

		this.checkoutForm.controls.scheduledDate.valueChanges.subscribe((dateStr) => {
			this.validateSelectedDate(dateStr);
		});
	}

	loadDeliveryFeeSetting(): void {
		this.settingService.getDeliveryFee().subscribe({
			next: (res) => {
				this.deliveryFeeRate = res.deliveryFee;
			},
			error: () => {
				// Keep fallback value of 50
			}
		});
	}

	loadBlockedDaysSetting(): void {
		this.settingService.getBlockedDays().subscribe({
			next: (res) => {
				this.blockedDays = res.blockedDays || [];
				const currentVal = this.checkoutForm.controls.scheduledDate.value;
				if (currentVal) {
					this.validateSelectedDate(currentVal);
				}
			},
			error: () => {
				this.blockedDays = [];
			}
		});
	}

	validateSelectedDate(dateStr: string | null): void {
		if (!dateStr) return;
		const parts = dateStr.split('-');
		if (parts.length !== 3) return;
		
		const year = parseInt(parts[0], 10);
		const month = parseInt(parts[1], 10) - 1;
		const day = parseInt(parts[2], 10);
		const date = new Date(year, month, day);
		
		if (isNaN(date.getTime())) return;

		const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
		const selectedDayName = daysOfWeek[date.getDay()];

		if (this.blockedDays.includes(selectedDayName)) {
			this.checkoutForm.controls.scheduledDate.setErrors({ blockedDay: true });
		} else {
			const errors = this.checkoutForm.controls.scheduledDate.errors;
			if (errors && errors['blockedDay']) {
				delete errors['blockedDay'];
				this.checkoutForm.controls.scheduledDate.setErrors(Object.keys(errors).length ? errors : null);
			}
		}
	}

	isDateBlocked(dateStr: string | null): boolean {
		if (!dateStr) return false;
		const parts = dateStr.split('-');
		if (parts.length !== 3) return false;
		
		const year = parseInt(parts[0], 10);
		const month = parseInt(parts[1], 10) - 1;
		const day = parseInt(parts[2], 10);
		const date = new Date(year, month, day);
		
		if (isNaN(date.getTime())) return false;

		const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
		const selectedDayName = daysOfWeek[date.getDay()];
		return this.blockedDays.includes(selectedDayName);
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
			return this.isMixedOrder ? (this.deliveryFeeRate * 2) : this.deliveryFeeRate;
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
		return this.orderType === 'DELIVERY' ? this.deliveryFeeRate : 0;
	}

	get scheduledDeliveryFee(): number {
		return this.orderType === 'DELIVERY' ? this.deliveryFeeRate : 0;
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
		if (this.orderType !== 'DELIVERY') {
			return false;
		}
		return !this.isAuthenticated || this.checkoutForm.controls.addressId.value === 'new';
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
				this.updateMinScheduledDate(cart);
			},
			error: (error) => {
				this.loading = false;
				this.errorMessage = readApiErrorMessage(error, 'Unable to load cart for checkout.');
			}
		});
	}

	private updateMinScheduledDate(cart: CartResponse | null): void {
		const scheduledItems = cart?.items.filter((item) => item.deliveryMode === 'SCHEDULED') ?? [];
		if (scheduledItems.length === 0) {
			this.minScheduledDate = '';
			return;
		}

		const requests = scheduledItems.map((item) => this.shopService.getProductDetail(item.productId));
		forkJoin(requests).subscribe({
			next: (products) => {
				const dates = products.map((p) => p.earliestScheduledDate).filter(Boolean);
				if (dates.length > 0) {
					dates.sort();
					this.minScheduledDate = dates[dates.length - 1];
				} else {
					this.minScheduledDate = this.getTodayCairoFormatted();
				}
			},
			error: () => {
				this.minScheduledDate = this.getTodayCairoFormatted();
			}
		});
	}

	private getTodayCairoFormatted(): string {
		const options: Intl.DateTimeFormatOptions = {
			timeZone: 'Africa/Cairo',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		};
		const formatter = new Intl.DateTimeFormat('fr-CA', options);
		return formatter.format(new Date());
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
		this.couponPreview = null;
		this.couponService.validateCoupon(couponCode, this.subtotal).subscribe({
			next: (preview) => {
				this.validatingCoupon = false;
				this.couponPreview = preview;
				if (preview.valid) {
					this.statusMessage = preview.message;
				}
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
		this.showErrorPopup = false;
	}

	dismissGuestPrompt(): void {
		this.showGuestPrompt = false;
	}

	dismissErrorPopup(): void {
		this.showErrorPopup = false;
	}

	dismissInstapayPopup(): void {
		this.showInstapayPopup = false;
	}

	submitCheckout(): void {
		if (!this.cart?.items?.length) {
			this.showCheckoutError('Your cart is empty.', 'basket');
			return;
		}

		if (this.checkoutForm.invalid) {
			this.checkoutForm.markAllAsTouched();
			return;
		}

		if (this.isAuthenticated && this.orderType === 'DELIVERY' && !this.checkoutForm.controls.addressId.value) {
			this.showCheckoutError('Select a delivery address.');
			return;
		}

		if (this.showGuestDeliveryFields && !this.hasGuestDeliveryAddress()) {
			this.showCheckoutError('Enter a delivery address to place a guest delivery order.');
			this.checkoutForm.markAllAsTouched();
			return;
		}

		if (this.hasScheduledItems) {
			const selectedDateVal = this.checkoutForm.controls.scheduledDate.value;
			if (!selectedDateVal) {
				this.showCheckoutError('Choose a scheduled date for scheduled items.');
				return;
			}
			if (this.minScheduledDate && selectedDateVal < this.minScheduledDate) {
				this.showCheckoutError(`Scheduled date cannot be earlier than ${this.formatCheckoutDate(this.minScheduledDate)}.`);
				return;
			}
			if (this.isDateBlocked(selectedDateVal)) {
				this.showCheckoutError('Selected scheduled date falls on a blocked day.');
				return;
			}
		}

		if (this.orderType === 'DELIVERY' && (this.showGuestDeliveryFields || this.checkoutForm.controls.addressId.value === 'new')) {
			if (this.isAuthenticated) {
				this.submitAuthenticatedNewAddressCheckout();
			} else {
				this.submitGuestDeliveryCheckout();
			}
			return;
		}

		this.submitCheckoutWithAddressId(this.orderType === 'DELIVERY' ? this.checkoutForm.controls.addressId.value || null : null);
	}

	private submitAuthenticatedNewAddressCheckout(): void {
		const newAddress = this.buildGuestDeliveryAddress();
		if (!newAddress) {
			return;
		}

		this.placingOrder = true;
		this.errorMessage = '';
		this.showErrorPopup = false;
		this.statusMessage = '';

		this.addressService.createAddress(newAddress).pipe(
			switchMap((address) => this.checkoutService.submitCheckout(this.buildCheckoutRequest(address.id)))
		).subscribe({
			next: (response) => this.handleCheckoutSuccess(response),
			error: (error) => {
				this.placingOrder = false;
				this.showCheckoutError(this.readCheckoutErrorMessage(error), this.isCheckoutAvailabilityError(error) ? 'basket' : 'checkout');
			}
		});
	}

	private submitGuestDeliveryCheckout(): void {
		const guestAddress = this.buildGuestDeliveryAddress();
		if (!guestAddress) {
			return;
		}

		this.placingOrder = true;
		this.errorMessage = '';
		this.showErrorPopup = false;
		this.statusMessage = '';

		this.purchaseSession
			.ensureGuestSessionIfAnonymous()
			.pipe(
				switchMap(() => this.checkoutService.submitCheckout(this.buildCheckoutRequest(null, guestAddress)))
			)
			.subscribe({
				next: (response) => this.handleCheckoutSuccess(response),
				error: (error) => {
					this.placingOrder = false;
					this.showCheckoutError(this.readCheckoutErrorMessage(error), this.isCheckoutAvailabilityError(error) ? 'basket' : 'checkout');
				}
			});
	}

	private submitCheckoutWithAddressId(addressId: string | null): void {
		this.placingOrder = true;
		this.errorMessage = '';
		this.showErrorPopup = false;
		this.statusMessage = '';

		this.checkoutService.submitCheckout(this.buildCheckoutRequest(addressId)).subscribe({
			next: (response) => this.handleCheckoutSuccess(response),
			error: (error) => {
				this.placingOrder = false;
				this.showCheckoutError(this.readCheckoutErrorMessage(error), this.isCheckoutAvailabilityError(error) ? 'basket' : 'checkout');
			}
		});
	}

	private showCheckoutError(message: string, mode: 'checkout' | 'basket' = 'checkout'): void {
		this.errorMessage = message;
		this.errorPopupMode = mode;
		this.showErrorPopup = true;
	}

	private isCheckoutAvailabilityError(error: unknown): boolean {
		const fields = readApiFieldErrors(error);
		return Boolean(fields?.['productName']?.[0] && fields?.['requestedQuantity']?.[0] && fields?.['availableQuantity']?.[0]);
	}

	private readCheckoutErrorMessage(error: unknown): string {
		const fields = readApiFieldErrors(error);
		const productName = fields?.['productName']?.[0];
		const scheduledDate = fields?.['scheduledDate']?.[0];
		const requestedQuantity = fields?.['requestedQuantity']?.[0];
		const availableQuantity = fields?.['availableQuantity']?.[0];
		const dailyCapacity = fields?.['dailyCapacity']?.[0];

		if (productName && scheduledDate && requestedQuantity && availableQuantity) {
			const requested = Number(requestedQuantity);
			const capacity = Number(dailyCapacity);
			if (Number.isFinite(requested) && Number.isFinite(capacity) && requested > capacity) {
				return `${productName} can only be ordered up to ${dailyCapacity} per day. Your cart has ${requestedQuantity}. Please reduce the quantity.`;
			}

			return `${productName} has only ${availableQuantity} available on ${this.formatCheckoutDate(scheduledDate)}. Your cart has ${requestedQuantity}. Choose another date or reduce the quantity.`;
		}

		return readApiErrorMessage(error, 'Unable to complete checkout.');
	}

	private formatCheckoutDate(value: string): string {
		const date = new Date(`${value}T00:00:00`);
		if (Number.isNaN(date.getTime())) {
			return value;
		}

		return new Intl.DateTimeFormat('en-EG', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
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
		const rewardSummary = this.findRewardSummary(response.orders);
		if (rewardSummary) {
			this.statusMessage = `Reward applied - enjoy your free ${rewardSummary.productName}!`;
		} else if (this.showRewardTeaser) {
			this.statusMessage = `We could not add the free item (out of stock). Your loyalty status remains; try again next time or contact support.`;
		} else {
			this.statusMessage = `Checkout completed. Your cart has been cleared.`;
		}
		const amountToTransfer = response.orders.reduce((sum, order) => sum + (order.totalAmount ?? 0), 0);
		this.totalAmountToTransfer = new Intl.NumberFormat('en-EG', {
			style: 'currency',
			currency: 'EGP'
		}).format(amountToTransfer);

		this.showInstapayPopup = true;
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

	private buildCheckoutRequest(addressId: string | null, inlineAddress?: AddressCreateRequest | null) {
		const couponCode = this.checkoutForm.controls.couponCode.value?.trim() ?? '';

		return {
			customerName: this.checkoutForm.controls.customerName.value?.trim() || undefined,
			customerPhone: this.checkoutForm.controls.customerPhone.value?.trim() || undefined,
			orderType: this.orderType,
			addressId,
			deliveryCity: inlineAddress?.city,
			deliveryArea: inlineAddress?.area,
			deliveryStreet: inlineAddress?.street,
			deliveryBuilding: inlineAddress?.building,
			deliveryNotes: inlineAddress?.notes,
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