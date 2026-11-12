
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
	selector: 'app-checkout-error-modal',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './checkout-error-modal.component.html',
	styleUrl: './checkout-error-modal.component.css'
})
export class CheckoutErrorModalComponent {
	@Input({ required: true }) errorMessage!: string;
	@Input() errorPopupMode: 'basket' | 'checkout' = 'checkout';

	@Output() dismiss = new EventEmitter<void>();
}
