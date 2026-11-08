import { readApiErrorMessage, readApiFieldErrors } from '../../../core/models/api-error.model';
import { CheckoutDateUtil } from './checkout-date.util';

export class CheckoutErrorUtil {
	static isCheckoutAvailabilityError(error: unknown): boolean {
		const fields = readApiFieldErrors(error);
		return Boolean(
			fields?.['productName']?.[0] &&
			fields?.['requestedQuantity']?.[0] &&
			fields?.['availableQuantity']?.[0]
		);
	}

	static readCheckoutErrorMessage(error: unknown): string {
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

			return `${productName} has only ${availableQuantity} available on ${CheckoutDateUtil.formatCheckoutDate(scheduledDate)}. Your cart has ${requestedQuantity}. Choose another date or reduce the quantity.`;
		}

		return readApiErrorMessage(error, 'Unable to complete checkout.');
	}
}

