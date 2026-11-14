import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SavedAddressResponse } from '../../../../core/models/address.models';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker.component';
import { DeliveryZoneService } from '../../../../core/services/delivery-zone.service';
import { GovernorateNode, CityNode, AreaNode } from '../../../../core/models/delivery-zone.model';
import { DeliveryZoneUtil } from '../../../../core/utils/delivery-zone.util';

import { RouterLink } from '@angular/router';

@Component({
	selector: 'app-address-form',
	standalone: true,
	imports: [DecimalPipe, ReactiveFormsModule, DatePickerComponent, RouterLink],
	templateUrl: './address-form.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './address-form.component.css'
})
export class AddressFormComponent implements OnInit {
	private readonly zoneService = inject(DeliveryZoneService);

	readonly checkoutForm = input.required<FormGroup>();
	readonly isAuthenticated = input.required<boolean>();
	readonly addresses = input.required<SavedAddressResponse[]>();
	readonly addressesLoading = input.required<boolean>();
	readonly showRewardTeaser = input.required<boolean>();
	readonly rewardProductName = input.required<string>();
	readonly rewardProductImage = input.required<string | null>();
	readonly hasScheduledItems = input.required<boolean>();
	readonly minScheduledDate = input.required<string>();
	readonly showGuestDeliveryFields = input.required<boolean>();
	readonly blockedDays = input<string[]>([]);

	readonly orderTypeChange = output<void>();
	readonly areaChange = output<AreaNode | null>();

	governorates: GovernorateNode[] = [];
	availableCities: CityNode[] = [];
	availableAreas: AreaNode[] = [];
	selectedArea: AreaNode | null = null;
	zonesLoading = false;

	get selectedSavedAddress(): SavedAddressResponse | null {
		const addressId = this.checkoutForm().get('addressId')?.value;
		if (addressId && addressId !== 'new') {
			return this.addresses().find(a => a.id === addressId) || null;
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
		const govId = this.checkoutForm().get('guestDeliveryGovernorateId')?.value;
		const cityId = this.checkoutForm().get('guestDeliveryCityId')?.value;
		const areaId = this.checkoutForm().get('guestDeliveryAreaId')?.value;

		this.availableCities = DeliveryZoneUtil.getCities(this.governorates, govId);
		this.availableAreas = DeliveryZoneUtil.getAreas(this.governorates, cityId);
		this.selectedArea = DeliveryZoneUtil.findArea(this.governorates, areaId);
		if (this.selectedArea) {
			this.areaChange.emit(this.selectedArea);
		}
	}

	onGovernorateChange(event: Event): void {
		const selectEl = event.target as HTMLSelectElement;
		const govId = selectEl.value;
		const gov = DeliveryZoneUtil.findGovernorate(this.governorates, govId);

		this.checkoutForm().patchValue({
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
		const city = DeliveryZoneUtil.findCity(this.governorates, cityId);

		this.checkoutForm().patchValue({
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
		const area = DeliveryZoneUtil.findArea(this.governorates, areaId);

		this.checkoutForm().patchValue({
			guestDeliveryAreaId: areaId,
			guestDeliveryArea: area ? area.name : ''
		});

		this.selectedArea = area || null;
		this.areaChange.emit(this.selectedArea);
	}

	get orderType(): string {
		return this.checkoutForm().get('orderType')?.value ?? 'DELIVERY';
	}

	getFormattedBlockedDays(): string {
		const days = this.blockedDays();
		if (!days || days.length === 0) return '';
		return days.map(d => this.capitalize(d)).join(' and ');
	}

	private capitalize(s: string): string {
		return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
	}
}
