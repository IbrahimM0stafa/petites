import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, switchMap } from 'rxjs';
import { ShopService } from '../../../core/services/shop.service';
import { SettingService } from '../../../core/services/setting.service';

import { SavedAddressResponse } from '../../../core/models/address.models';
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
import { DeliveryZoneService } from '../../../core/services/delivery-zone.service';
import { GovernorateNode, AreaNode } from '../../../core/models/delivery-zone.model';

import { AddressFormComponent } from '../components/address-form/address-form.component';
import { CouponFormComponent } from '../components/coupon-form/coupon-form.component';
import { CheckoutSummaryComponent } from '../components/checkout-summary/checkout-summary.component';
import { SuccessOrdersComponent } from '../components/success-orders/success-orders.component';
import { PaymentFormComponent } from '../components/payment-form/payment-form.component';
import { GuestPromptModalComponent } from '../components/guest-prompt-modal/guest-prompt-modal.component';
import { CheckoutErrorModalComponent } from '../components/checkout-error-modal/checkout-error-modal.component';
import { InstapayPopupModalComponent } from '../components/instapay-popup-modal/instapay-popup-modal.component';

import { CheckoutDateUtil } from '../utils/checkout-date.util';
import { CheckoutPricingUtil } from '../utils/checkout-pricing.util';
import { CheckoutFormUtil } from '../utils/checkout-form.util';
import { CheckoutErrorUtil } from '../utils/checkout-error.util';
import { CheckoutRewardUtil } from '../utils/checkout-reward.util';

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
		PaymentFormComponent,
		GuestPromptModalComponent,
		CheckoutErrorModalComponent,
		InstapayPopupModalComponent
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
	private readonly deliveryZoneService = inject(DeliveryZoneService);
	private readonly destroyRef = inject(DestroyRef);

	deliveryFeeRate = 0;
	isCourierDelivery = false;
	zoneTree: GovernorateNode[] = [];
	minScheduledDate = '';
	blockedDays: string[] = [];

	readonly checkoutForm = this.formBuilder.group({
		customerName: ['', [Validators.minLength(2)]],
		customerPhone: ['', [Validators.minLength(7)]],
		orderType: ['DELIVERY' as OrderType],
		addressId: [''],
		guestDeliveryGovernorateId: [''],
		guestDeliveryGovernorate: [''],
		guestDeliveryCityId: [''],
		guestDeliveryCity: [''],
		guestDeliveryAreaId: [''],
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
		this.loadDeliveryZones();
		this.loadBlockedDaysSetting();
		this.showGuestPrompt = !this.isAuthenticated;
		this.syncCheckoutValidation();

		this.checkoutForm.controls.addressId.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				this.syncCheckoutValidation();
				this.syncFeeForCurrentAddress();
			});

		this.checkoutForm.controls.scheduledDate.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((dateStr) => {
				this.validateSelectedDate(dateStr);
			});
	}

	loadDeliveryZones(): void {
		this.deliveryZoneService.getTree().subscribe({
			next: (tree) => {
				this.zoneTree = tree;
				this.syncFeeForCurrentAddress();
			},
			error: () => {
				this.deliveryFeeRate = 0;
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
		if (this.isDateBlocked(dateStr)) {
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
		return CheckoutDateUtil.isDateBlocked(dateStr, this.blockedDays);
	}

	get cart(): CartResponse | null {
		return this.cartService.cart();
	}

	get subtotal(): number {
		return this.cart?.subtotal ?? 0;
	}

	get isMixedOrder(): boolean {
		return CheckoutPricingUtil.isMixedOrder(this.cart);
	}

	get deliveryFee(): number {
		return CheckoutPricingUtil.calculateDeliveryFee(
			this.orderType,
			this.isCourierDelivery,
			this.isMixedOrder,
			this.deliveryFeeRate
		);
	}

	get selectedSavedAddress(): SavedAddressResponse | null {
		const addressId = this.checkoutForm.controls.addressId.value;
		if (addressId && addressId !== 'new') {
			return this.addresses.find((a) => a.id === addressId) || null;
		}
		return null;
	}

	get selectedSavedAddressNeedsUpdate(): boolean {
		const saved = this.selectedSavedAddress;
		return !!saved && (!saved.areaId || !saved.governorateId || !saved.cityId);
	}

	get hasAreaSelected(): boolean {
		if (this.selectedSavedAddress) {
			return !this.selectedSavedAddressNeedsUpdate;
		}
		return !!this.checkoutForm.controls.guestDeliveryAreaId.value;
	}

	onAreaSelected(area: AreaNode | null): void {
		if (area) {
			this.deliveryFeeRate = area.courierDelivery ? 0 : area.deliveryFee;
			this.isCourierDelivery = area.courierDelivery;
		} else {
			this.deliveryFeeRate = 0;
			this.isCourierDelivery = false;
		}
	}

	syncFeeForCurrentAddress(): void {
		const saved = this.selectedSavedAddress;
		if (saved) {
			if (saved.areaId && this.zoneTree.length > 0) {
				const matched = CheckoutPricingUtil.findAreaInTree(this.zoneTree, saved.areaId);
				if (matched) {
					this.deliveryFeeRate = matched.courierDelivery ? 0 : matched.deliveryFee;
					this.isCourierDelivery = matched.courierDelivery;
					return;
				}
			}
			this.deliveryFeeRate = 0;
			this.isCourierDelivery = false;
			return;
		}

		const areaId = this.checkoutForm.controls.guestDeliveryAreaId.value;
		if (areaId) {
			const matched = CheckoutPricingUtil.findAreaInTree(this.zoneTree, areaId);
			if (matched) {
				this.deliveryFeeRate = matched.courierDelivery ? 0 : matched.deliveryFee;
				this.isCourierDelivery = matched.courierDelivery;
				return;
			}
		}

		this.deliveryFeeRate = 0;
		this.isCourierDelivery = false;
	}

	get finalAmount(): number {
		return CheckoutPricingUtil.calculateFinalAmount(this.subtotal, this.deliveryFee, this.couponPreview);
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
		return CheckoutPricingUtil.getInstantDiscount(this.instantSubtotal, this.instantDeliveryFee, this.couponPreview);
	}

	get scheduledDiscount(): number {
		return CheckoutPricingUtil.getScheduledDiscount(this.instantDiscount, this.couponPreview);
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
					this.minScheduledDate = CheckoutDateUtil.getTodayCairoFormatted();
				}
			},
			error: () => {
				this.minScheduledDate = CheckoutDateUtil.getTodayCairoFormatted();
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

		if (this.isAuthenticated && this.orderType === 'DELIVERY') {
			if (!this.checkoutForm.controls.addressId.value) {
				this.showCheckoutError('Select a delivery address.');
				return;
			}
			if (this.selectedSavedAddressNeedsUpdate) {
				this.showCheckoutError('Please update your selected address with your Governorate, City, and Area to proceed.');
				return;
			}
		}

		if (this.showGuestDeliveryFields && !CheckoutFormUtil.hasGuestDeliveryAddress(this.checkoutForm)) {
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
				this.showCheckoutError(`Scheduled date cannot be earlier than ${CheckoutDateUtil.formatCheckoutDate(this.minScheduledDate)}.`);
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
		const newAddress = CheckoutFormUtil.buildGuestDeliveryAddress(this.checkoutForm);
		if (!newAddress) {
			return;
		}

		this.placingOrder = true;
		this.errorMessage = '';
		this.showErrorPopup = false;
		this.statusMessage = '';

		this.addressService.createAddress(newAddress).pipe(
			switchMap((address) => this.checkoutService.submitCheckout(this.buildCheckoutPayload(address.id)))
		).subscribe({
			next: (response) => this.handleCheckoutSuccess(response),
			error: (error) => {
				this.placingOrder = false;
				this.showCheckoutError(
					CheckoutErrorUtil.readCheckoutErrorMessage(error),
					CheckoutErrorUtil.isCheckoutAvailabilityError(error) ? 'basket' : 'checkout'
				);
			}
		});
	}

	private submitGuestDeliveryCheckout(): void {
		const guestAddress = CheckoutFormUtil.buildGuestDeliveryAddress(this.checkoutForm);
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
				switchMap(() => this.checkoutService.submitCheckout(this.buildCheckoutPayload(null, guestAddress)))
			)
			.subscribe({
				next: (response) => this.handleCheckoutSuccess(response),
				error: (error) => {
					this.placingOrder = false;
					this.showCheckoutError(
						CheckoutErrorUtil.readCheckoutErrorMessage(error),
						CheckoutErrorUtil.isCheckoutAvailabilityError(error) ? 'basket' : 'checkout'
					);
				}
			});
	}

	private submitCheckoutWithAddressId(addressId: string | null): void {
		this.placingOrder = true;
		this.errorMessage = '';
		this.showErrorPopup = false;
		this.statusMessage = '';

		this.checkoutService.submitCheckout(this.buildCheckoutPayload(addressId)).subscribe({
			next: (response) => this.handleCheckoutSuccess(response),
			error: (error) => {
				this.placingOrder = false;
				this.showCheckoutError(
					CheckoutErrorUtil.readCheckoutErrorMessage(error),
					CheckoutErrorUtil.isCheckoutAvailabilityError(error) ? 'basket' : 'checkout'
				);
			}
		});
	}

	private buildCheckoutPayload(addressId: string | null, inlineAddress?: any) {
		return CheckoutFormUtil.buildCheckoutRequest(
			this.checkoutForm,
			this.orderType,
			this.couponPreview,
			this.hasScheduledItems,
			addressId,
			inlineAddress
		);
	}

	private showCheckoutError(message: string, mode: 'checkout' | 'basket' = 'checkout'): void {
		this.errorMessage = message;
		this.errorPopupMode = mode;
		this.showErrorPopup = true;
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
		const rewardSummary = CheckoutRewardUtil.findRewardSummary(response.orders, this.rewardProductId, this.rewardProductName);
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

	private syncCheckoutValidation(): void {
		CheckoutFormUtil.syncCheckoutValidation(
			this.checkoutForm,
			this.isAuthenticated,
			this.orderType,
			this.showGuestDeliveryFields
		);
	}
}
