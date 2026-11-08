import { FormGroup, Validators } from '@angular/forms';
import { AddressCreateRequest } from '../../../core/models/address.models';
import { CouponValidationResponse } from '../../../core/models/coupon.models';
import { OrderType } from '../../../core/models/order.models';

export class CheckoutFormUtil {
	static syncCheckoutValidation(
		form: FormGroup,
		isAuthenticated: boolean,
		orderType: OrderType,
		showGuestDeliveryFields: boolean
	): void {
		const controls = form.controls;

		if (isAuthenticated) {
			controls['customerName'].clearValidators();
			controls['customerPhone'].clearValidators();
		} else {
			controls['customerName'].setValidators([Validators.required, Validators.minLength(2)]);
			controls['customerPhone'].setValidators([Validators.required, Validators.minLength(7)]);
		}

		if (isAuthenticated && orderType === 'DELIVERY') {
			controls['addressId'].setValidators([Validators.required]);
		} else {
			controls['addressId'].clearValidators();
		}

		const guestSelectValidators = showGuestDeliveryFields ? [Validators.required] : [];
		const guestStreetValidators = showGuestDeliveryFields ? [Validators.required, Validators.minLength(2)] : [];

		controls['guestDeliveryGovernorateId'].setValidators(guestSelectValidators);
		controls['guestDeliveryCityId'].setValidators(guestSelectValidators);
		controls['guestDeliveryAreaId'].setValidators(guestSelectValidators);
		controls['guestDeliveryStreet'].setValidators(guestStreetValidators);

		controls['customerName'].updateValueAndValidity({ emitEvent: false });
		controls['customerPhone'].updateValueAndValidity({ emitEvent: false });
		controls['addressId'].updateValueAndValidity({ emitEvent: false });
		controls['guestDeliveryGovernorateId'].updateValueAndValidity({ emitEvent: false });
		controls['guestDeliveryCityId'].updateValueAndValidity({ emitEvent: false });
		controls['guestDeliveryAreaId'].updateValueAndValidity({ emitEvent: false });
		controls['guestDeliveryStreet'].updateValueAndValidity({ emitEvent: false });
	}

	static hasGuestDeliveryAddress(form: FormGroup): boolean {
		const controls = form.controls;
		return Boolean(
			controls['guestDeliveryGovernorateId'].value?.trim() &&
			controls['guestDeliveryCityId'].value?.trim() &&
			controls['guestDeliveryAreaId'].value?.trim() &&
			controls['guestDeliveryStreet'].value?.trim()
		);
	}

	static buildGuestDeliveryAddress(form: FormGroup): AddressCreateRequest | null {
		if (!this.hasGuestDeliveryAddress(form)) {
			return null;
		}
		const controls = form.controls;
		return {
			governorateId: controls['guestDeliveryGovernorateId'].value?.trim() || undefined,
			governorate: controls['guestDeliveryGovernorate'].value?.trim() || undefined,
			cityId: controls['guestDeliveryCityId'].value?.trim() || undefined,
			city: controls['guestDeliveryCity'].value?.trim() ?? '',
			areaId: controls['guestDeliveryAreaId'].value?.trim() || undefined,
			area: controls['guestDeliveryArea'].value?.trim() ?? '',
			street: controls['guestDeliveryStreet'].value?.trim() ?? '',
			building: controls['guestDeliveryBuilding'].value?.trim() || undefined,
			notes: controls['guestDeliveryNotes'].value?.trim() || undefined
		};
	}

	static buildCheckoutRequest(
		form: FormGroup,
		orderType: OrderType,
		couponPreview: CouponValidationResponse | null,
		hasScheduledItems: boolean,
		addressId: string | null,
		inlineAddress?: AddressCreateRequest | null
	) {
		const controls = form.controls;
		const couponCode = controls['couponCode'].value?.trim() ?? '';

		return {
			customerName: controls['customerName'].value?.trim() || undefined,
			customerPhone: controls['customerPhone'].value?.trim() || undefined,
			orderType,
			addressId,
			governorateId: inlineAddress?.governorateId,
			deliveryGovernorate: inlineAddress?.governorate,
			cityId: inlineAddress?.cityId,
			deliveryCity: inlineAddress?.city,
			areaId: inlineAddress?.areaId,
			deliveryArea: inlineAddress?.area,
			deliveryStreet: inlineAddress?.street,
			deliveryBuilding: inlineAddress?.building,
			deliveryNotes: inlineAddress?.notes,
			notes: controls['notes'].value?.trim() || undefined,
			couponId: couponPreview?.valid ? couponPreview.couponId : null,
			couponCode: couponPreview?.valid ? null : couponCode || null,
			scheduledDate: hasScheduledItems ? controls['scheduledDate'].value || null : null
		};
	}
}

