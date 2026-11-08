import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
	selector: 'app-guest-prompt-modal',
	standalone: true,
	imports: [CommonModule, RouterLink],
	templateUrl: './guest-prompt-modal.component.html',
	styleUrl: './guest-prompt-modal.component.css'
})
export class GuestPromptModalComponent {
	@Output() dismiss = new EventEmitter<void>();
}

