
import { Component, output, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
	selector: 'app-guest-prompt-modal',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './guest-prompt-modal.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './guest-prompt-modal.component.css'
})
export class GuestPromptModalComponent {
	readonly dismiss = output<void>();
}

