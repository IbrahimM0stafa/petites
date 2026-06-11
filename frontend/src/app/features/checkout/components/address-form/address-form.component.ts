import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SavedAddressResponse } from '../../../../core/models/address.models';

@Component({
	selector: 'app-address-form',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule],
	templateUrl: './address-form.component.html',
	styleUrl: './address-form.component.css'
})
export class AddressFormComponent {
	@Input({ required: true }) checkoutForm!: FormGroup;
	@Input({ required: true }) isAuthenticated!: boolean;
	@Input({ required: true }) addresses!: SavedAddressResponse[];
	@Input({ required: true }) addressesLoading!: boolean;
	@Input({ required: true }) showRewardTeaser!: boolean;
	@Input({ required: true }) rewardProductName!: string;
	@Input({ required: true }) rewardProductImage!: string | null;
	@Input({ required: true }) hasScheduledItems!: boolean;
	@Input({ required: true }) minScheduledDate!: string;
	@Input({ required: true }) showGuestDeliveryFields!: boolean;
	@Input() blockedDays: string[] = [];

	@Output() orderTypeChange = new EventEmitter<void>();

	get orderType(): string {
		return this.checkoutForm.get('orderType')?.value ?? 'DELIVERY';
	}

	getFormattedBlockedDays(): string {
		if (!this.blockedDays || this.blockedDays.length === 0) return '';
		return this.blockedDays.map(d => this.capitalize(d)).join(' and ');
	}

	private capitalize(s: string): string {
		return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
	}
}
