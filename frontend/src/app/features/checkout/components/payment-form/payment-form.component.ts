import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { OrderResponse } from '../../../../core/models/order.models';

@Component({
	selector: 'app-payment-form',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './payment-form.component.html',
	styleUrl: './payment-form.component.css'
})
export class PaymentFormComponent {
	@Input({ required: true }) orders!: OrderResponse[];
	@Input({ required: true }) instapayPaymentLink!: string;
	@Input({ required: true }) instapayHandle!: string;

	get totalAmount(): string {
		const amount = this.orders.reduce((sum, order) => sum + (order.totalAmount ?? 0), 0);
		return new Intl.NumberFormat('en-EG', {
			style: 'currency',
			currency: 'EGP'
		}).format(amount);
	}
}
