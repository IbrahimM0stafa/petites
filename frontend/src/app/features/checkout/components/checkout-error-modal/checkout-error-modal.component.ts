
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
	selector: 'app-checkout-error-modal',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './checkout-error-modal.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './checkout-error-modal.component.css'
})
export class CheckoutErrorModalComponent {
	readonly errorMessage = input.required<string>();
	readonly errorPopupMode = input<'basket' | 'checkout'>('checkout');

	readonly dismiss = output<void>();
}
