
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
	selector: 'app-instapay-popup-modal',
	standalone: true,
	imports: [],
	templateUrl: './instapay-popup-modal.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './instapay-popup-modal.component.css'
})
export class InstapayPopupModalComponent {
	readonly totalAmount = input.required<string>();
	readonly paymentLink = input.required<string>();
	readonly isCourierDelivery = input<boolean>(false);

	readonly dismiss = output<void>();
}

