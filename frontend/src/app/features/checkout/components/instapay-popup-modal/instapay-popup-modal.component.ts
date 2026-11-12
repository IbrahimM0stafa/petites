
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
	selector: 'app-instapay-popup-modal',
	standalone: true,
	imports: [],
	templateUrl: './instapay-popup-modal.component.html',
	styleUrl: './instapay-popup-modal.component.css'
})
export class InstapayPopupModalComponent {
	@Input({ required: true }) totalAmount!: string;
	@Input({ required: true }) paymentLink!: string;
	@Input() isCourierDelivery: boolean = false;

	@Output() dismiss = new EventEmitter<void>();
}

