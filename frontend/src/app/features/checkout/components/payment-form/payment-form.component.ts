
import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { OrderResponse } from '../../../../core/models/order.models';

@Component({
	selector: 'app-payment-form',
	standalone: true,
	imports: [],
	templateUrl: './payment-form.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './payment-form.component.css'
})
export class PaymentFormComponent {
	readonly orders = input.required<OrderResponse[]>();
	readonly instapayPaymentLink = input.required<string>();
	readonly instapayHandle = input.required<string>();

	readonly totalAmount = computed(() => {
		const amount = this.orders().reduce((sum, order) => sum + (order.totalAmount ?? 0), 0);
		return new Intl.NumberFormat('en-EG', {
			style: 'currency',
			currency: 'EGP'
		}).format(amount);
	});
}
