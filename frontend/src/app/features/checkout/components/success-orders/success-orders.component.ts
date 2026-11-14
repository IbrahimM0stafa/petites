import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrderResponse } from '../../../../core/models/order.models';

@Component({
	selector: 'app-success-orders',
	standalone: true,
	imports: [CurrencyPipe, DatePipe, RouterLink],
	templateUrl: './success-orders.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './success-orders.component.css'
})
export class SuccessOrdersComponent {
	readonly orders = input.required<OrderResponse[]>();
	readonly rewardProductName = input.required<string>();
	readonly rewardProductId = input.required<string>();

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
				return { productName: this.rewardProductName() };
			}

			const rewardItem = order.items.find((item) => this.isRewardItem(item));
			if (rewardItem) {
				return { productName: rewardItem.productName?.trim() || this.rewardProductName() };
			}
		}

		return null;
	}

	private isRewardItem(item: OrderResponse['items'][number]): boolean {
		if (item.unitPrice !== 0) {
			return false;
		}

		const rewardProductId = this.rewardProductId().toLowerCase();
		const productId = item.productId?.trim().toLowerCase() ?? '';
		if (rewardProductId && productId === rewardProductId) {
			return true;
		}

		const rewardProductName = this.rewardProductName().toLowerCase();
		const productName = item.productName?.trim().toLowerCase() ?? '';
		return Boolean(rewardProductName && productName === rewardProductName);
	}
}
