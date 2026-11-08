import { OrderResponse } from '../../../core/models/order.models';

export class CheckoutRewardUtil {
	static findRewardSummary(
		orders: OrderResponse[],
		rewardProductId: string,
		rewardProductName: string
	): { productName: string } | null {
		for (const order of orders) {
			if (order.rewardApplied) {
				return { productName: rewardProductName };
			}

			const rewardItem = order.items.find((item) =>
				this.isRewardItem(item, rewardProductId, rewardProductName)
			);
			if (rewardItem) {
				return { productName: rewardItem.productName?.trim() || rewardProductName };
			}
		}

		return null;
	}

	private static isRewardItem(
		item: OrderResponse['items'][number],
		rewardProductId: string,
		rewardProductName: string
	): boolean {
		if (item.unitPrice !== 0) {
			return false;
		}

		const targetProductId = rewardProductId.toLowerCase();
		const productId = item.productId?.trim().toLowerCase() ?? '';
		if (targetProductId && productId === targetProductId) {
			return true;
		}

		const targetProductName = rewardProductName.toLowerCase();
		const productName = item.productName?.trim().toLowerCase() ?? '';
		return Boolean(targetProductName && productName === targetProductName);
	}
}

