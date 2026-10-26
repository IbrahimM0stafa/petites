import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SavedAddressResponse } from '../../../../core/models/address.models';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker.component';
import { DeliveryZoneService } from '../../../../core/services/delivery-zone.service';
import { GovernorateNode, CityNode, AreaNode } from '../../../../core/models/delivery-zone.model';

import { RouterLink } from '@angular/router';

@Component({
	selector: 'app-address-form',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, DatePickerComponent, RouterLink],
	templateUrl: './address-form.component.html',
	styleUrl: './address-form.component.css'
})
export class AddressFormComponent implements OnInit {
	private readonly zoneService = inject(DeliveryZoneService);

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
	@Output() areaChange = new EventEmitter<AreaNode | null>();

	governorates: GovernorateNode[] = [];
	availableCities: CityNode[] = [];
	availableAreas: AreaNode[] = [];
	selectedArea: AreaNode | null = null;
	zonesLoading = false;

	get selectedSavedAddress(): SavedAddressResponse | null {
		const addressId = this.checkoutForm.get('addressId')?.value;
		if (addressId && addressId !== 'new') {
			return this.addresses.find(a => a.id === addressId) || null;
		}
		return null;
	}

	get selectedSavedAddressNeedsUpdate(): boolean {
		const saved = this.selectedSavedAddress;
		return !!saved && (!saved.areaId || !saved.governorateId || !saved.cityId);
	}

	ngOnInit(): void {
		this.loadDeliveryZones();
	}

	loadDeliveryZones(): void {
		this.zonesLoading = true;
		this.zoneService.getTree().subscribe({
			next: (tree) => {
				this.governorates = tree;
				this.zonesLoading = false;
				this.syncDropdownsFromForm();
			},
			error: () => {
				this.zonesLoading = false;
			}
		});
	}

	syncDropdownsFromForm(): void {
		const govId = this.checkoutForm.get('guestDeliveryGovernorateId')?.value;
		const cityId = this.checkoutForm.get('guestDeliveryCityId')?.value;
		const areaId = this.checkoutForm.get('guestDeliveryAreaId')?.value;

		if (govId) {
			const gov = this.governorates.find(g => g.id === govId);
			this.availableCities = gov ? gov.cities : [];
		}

		if (cityId) {
			const city = this.availableCities.find(c => c.id === cityId);
			this.availableAreas = city ? city.areas : [];
		}

		if (areaId) {
			this.selectedArea = this.availableAreas.find(a => a.id === areaId) || null;
			if (this.selectedArea) {
				this.areaChange.emit(this.selectedArea);
			}
		}
	}

	onGovernorateChange(event: Event): void {
		const selectEl = event.target as HTMLSelectElement;
		const govId = selectEl.value;
		const gov = this.governorates.find(g => g.id === govId);

		this.checkoutForm.patchValue({
			guestDeliveryGovernorateId: govId,
			guestDeliveryGovernorate: gov ? gov.name : '',
			guestDeliveryCityId: '',
			guestDeliveryCity: '',
			guestDeliveryAreaId: '',
			guestDeliveryArea: ''
		});

		this.availableCities = gov ? gov.cities : [];
		this.availableAreas = [];
		this.selectedArea = null;
		this.areaChange.emit(null);
	}

	onCityChange(event: Event): void {
		const selectEl = event.target as HTMLSelectElement;
		const cityId = selectEl.value;
		const city = this.availableCities.find(c => c.id === cityId);

		this.checkoutForm.patchValue({
			guestDeliveryCityId: cityId,
			guestDeliveryCity: city ? city.name : '',
			guestDeliveryAreaId: '',
			guestDeliveryArea: ''
		});

		this.availableAreas = city ? city.areas : [];
		this.selectedArea = null;
		this.areaChange.emit(null);
	}

	onAreaChange(event: Event): void {
		const selectEl = event.target as HTMLSelectElement;
		const areaId = selectEl.value;
		const area = this.availableAreas.find(a => a.id === areaId);

		this.checkoutForm.patchValue({
			guestDeliveryAreaId: areaId,
			guestDeliveryArea: area ? area.name : ''
		});

		this.selectedArea = area || null;
		this.areaChange.emit(this.selectedArea);
	}

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
