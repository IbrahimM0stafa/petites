
import { Component, EventEmitter, Output, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
	selector: 'app-guest-prompt-modal',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './guest-prompt-modal.component.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	styleUrl: './guest-prompt-modal.component.css'
})
export class GuestPromptModalComponent {
	@Output() dismiss = new EventEmitter<void>();
}

