import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AddressUpdateRequest, SavedAddressResponse } from '../../../core/models/address.models';
import { isRefreshTokenRejected, readApiErrorMessage } from '../../../core/models/api-error.model';
import { AreaNode, CityNode, GovernorateNode } from '../../../core/models/delivery-zone.model';
import { DeliveryZoneUtil } from '../../../core/utils/delivery-zone.util';
import { LoyaltyResponse } from '../../../core/models/loyalty.models';
import { UserResponse } from '../../../core/models/user.models';
import { AddressService } from '../../../core/services/address.service';
import { AuthService } from '../../../core/services/auth.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { CartService } from '../../../core/services/cart.service';
import { DeliveryZoneService } from '../../../core/services/delivery-zone.service';
import { LoyaltyService } from '../../../core/services/loyalty.service';
import { environment } from '../../../../environments/environment';

@Component({
	selector: 'app-account-page',
	standalone: true,
	imports: [CurrencyPipe, ReactiveFormsModule, RouterLink],
	templateUrl: './account-page.component.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	styleUrl: './account-page.component.css'
})
export class AccountPageComponent implements OnInit {
	private readonly formBuilder = inject(FormBuilder);
	private readonly deliveryZoneService = inject(DeliveryZoneService);

	readonly isDev = !environment.production;
	readonly addressForm = this.formBuilder.group({
		governorateId: ['', [Validators.required]],
		governorate: [''],
		cityId: ['', [Validators.required]],
		city: ['', [Validators.required]],
		areaId: ['', [Validators.required]],
		area: ['', [Validators.required]],
		street: ['', [Validators.required, Validators.minLength(2)]],
		building: [''],
		notes: ['']
	});

	zoneTree: GovernorateNode[] = [];

	user: UserResponse | null = null;
	addresses: SavedAddressResponse[] = [];
	loyalty: LoyaltyResponse | null = null;
	loading = true;
	addressesLoading = false;
	addressSaving = false;
	refreshTesting = false;
	errorMessage = '';
	message = '';
	addressMessage = '';
	addressError = '';
	editingAddressId: string | null = null;

	get userInitials(): string {
		const name = this.user?.name?.trim();
		if (!name) {
			return 'P';
		}

		const parts = name.split(/\s+/).filter(Boolean);
		if (parts.length === 1) {
			return parts[0].slice(0, 2).toUpperCase();
		}

		return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
	}

	constructor(
		readonly authState: AuthStateService,
		private readonly authService: AuthService,
		private readonly addressService: AddressService,
		private readonly cartService: CartService,
		private readonly loyaltyService: LoyaltyService,
		private readonly router: Router
	) { }

	ngOnInit(): void {
		this.loadProfile();
		this.loadAddresses();
		this.loadLoyalty();
		this.loadDeliveryZones();
	}

	loadDeliveryZones(): void {
		this.deliveryZoneService.getTree().subscribe({
			next: (tree) => {
				this.zoneTree = tree;
			},
			error: () => {
				this.zoneTree = [];
			}
		});
	}

	get availableCities(): CityNode[] {
		return DeliveryZoneUtil.getCities(this.zoneTree, this.addressForm.controls.governorateId.value);
	}

	get availableAreas(): AreaNode[] {
		return DeliveryZoneUtil.getAreas(this.zoneTree, this.addressForm.controls.cityId.value);
	}

	onGovernorateChange(): void {
		const govId = this.addressForm.controls.governorateId.value;
		const gov = DeliveryZoneUtil.findGovernorate(this.zoneTree, govId);
		this.addressForm.patchValue({
			governorate: gov?.name ?? '',
			cityId: '',
			city: '',
			areaId: '',
			area: ''
		});
	}

	onCityChange(): void {
		const cityId = this.addressForm.controls.cityId.value;
		const city = DeliveryZoneUtil.findCity(this.zoneTree, cityId);
		this.addressForm.patchValue({
			city: city?.name ?? '',
			areaId: '',
			area: ''
		});
	}

	onAreaChange(): void {
		const areaId = this.addressForm.controls.areaId.value;
		const area = DeliveryZoneUtil.findArea(this.zoneTree, areaId);
		this.addressForm.patchValue({
			area: area?.name ?? ''
		});
	}

	refreshNow(): void {
		this.refreshTesting = true;
		this.errorMessage = '';
		this.message = '';

		this.authService.refreshSession().subscribe({
			next: () => {
				this.refreshTesting = false;
				this.message = 'Your session was renewed successfully.';
				this.loadProfile();
			},
			error: (error) => {
				this.refreshTesting = false;
				this.errorMessage = this.refreshErrorMessage(error);
			}
		});
	}

	startAddressEdit(address: SavedAddressResponse): void {
		this.editingAddressId = address.id;
		this.addressError = '';
		this.addressMessage = '';

		let govId = address.governorateId ?? '';
		let cityId = address.cityId ?? '';
		let areaId = address.areaId ?? '';

		if (!areaId && address.area) {
				const matched = DeliveryZoneUtil.findAreaByName(this.zoneTree, address.area);
				if (matched) {
					govId = matched.governorate.id;
					cityId = matched.city.id;
					areaId = matched.area.id;
				}
			}

			this.addressForm.reset({
				governorateId: govId,
				governorate: address.governorate ?? '',
				cityId: cityId,
				city: address.city,
				areaId: areaId,
				area: address.area,
				street: address.street,
				building: address.building ?? '',
				notes: address.notes ?? ''
			});
		}

		clearAddressForm(): void {
			this.editingAddressId = null;
			this.addressForm.reset({
				governorateId: '',
				governorate: '',
				cityId: '',
				city: '',
				areaId: '',
				area: '',
				street: '',
				building: '',
				notes: ''
			});
		}

		saveAddress(): void {
			if(this.addressForm.invalid) {
			this.addressForm.markAllAsTouched();
			return;
		}

		const rawValue = this.addressForm.getRawValue();
		const payload: AddressUpdateRequest = {
			governorateId: rawValue.governorateId || undefined,
			governorate: rawValue.governorate || undefined,
			cityId: rawValue.cityId || undefined,
			city: rawValue.city ?? undefined,
			areaId: rawValue.areaId || undefined,
			area: rawValue.area ?? undefined,
			street: rawValue.street ?? undefined,
			building: rawValue.building?.trim() || undefined,
			notes: rawValue.notes?.trim() || undefined
		};

		this.addressSaving = true;
		this.addressError = '';
		this.addressMessage = '';

		const request$ = this.editingAddressId
			? this.addressService.updateAddress(this.editingAddressId, payload)
			: this.addressService.createAddress({
				governorateId: payload.governorateId,
				governorate: payload.governorate,
				cityId: payload.cityId,
				city: payload.city ?? '',
				areaId: payload.areaId,
				area: payload.area ?? '',
				street: payload.street ?? '',
				building: payload.building,
				notes: payload.notes
			});

		request$.subscribe({
			next: () => {
				this.addressSaving = false;
				this.addressMessage = this.editingAddressId ? 'Address updated.' : 'Address saved.';
				this.clearAddressForm();
				this.loadAddresses();
			},
			error: (error) => {
				this.addressSaving = false;
				this.addressError = readApiErrorMessage(error, 'Unable to save address.');
			}
		});
	}

	removeAddress(addressId: string): void {
		if (!window.confirm('Delete this address?')) {
			return;
		}

		this.addressSaving = true;
		this.addressError = '';
		this.addressService.deleteAddress(addressId).subscribe({
			next: () => {
				this.addressSaving = false;
				this.addressMessage = 'Address deleted.';
				this.loadAddresses();
			},
			error: (error) => {
				this.addressSaving = false;
				this.addressError = readApiErrorMessage(error, 'Unable to delete address.');
			}
		});
	}

	logout(): void {
		this.authService.clearAuthSession();
		this.authService.ensureGuestSession().subscribe({
			next: () => {
				this.cartService.loadCart().subscribe({ error: () => undefined });
				this.loadAddresses();
				this.loadLoyalty();
				void this.router.navigateByUrl('/');
			},
			error: () => {
				this.cartService.loadCart().subscribe({ error: () => undefined });
				this.loadAddresses();
				this.loadLoyalty();
				void this.router.navigateByUrl('/');
			}
		});
	}

	private refreshErrorMessage(error: unknown, fallback = 'Refresh token request failed.'): string {
		if (isRefreshTokenRejected(error)) {
			return 'This refresh token was already used. Sign in again to get a new session.';
		}

		return readApiErrorMessage(error, fallback);
	}

	private loadProfile(): void {
		const userId = this.authState.userId();
		if (!userId) {
			this.loading = false;
			return;
		}

		this.loading = true;
		this.errorMessage = '';

		this.authService.getUser(userId).subscribe({
			next: (user) => {
				this.user = user;
				this.loading = false;
			},
			error: (error) => {
				this.errorMessage = readApiErrorMessage(error, 'Unable to load your profile.');
				this.loading = false;
			}
		});
	}

	private loadAddresses(): void {
		if (!this.authState.isAuthenticated()) {
			this.addresses = [];
			return;
		}

		this.addressesLoading = true;
		this.addressError = '';
		this.addressService.listAddresses().subscribe({
			next: (addresses) => {
				this.addresses = addresses;
				this.addressesLoading = false;
			},
			error: (error) => {
				this.addressError = readApiErrorMessage(error, 'Unable to load saved addresses.');
				this.addressesLoading = false;
			}
		});
	}

	private loadLoyalty(): void {
		if (!this.authState.isAuthenticated()) {
			this.loyalty = null;
			return;
		}

		this.loyaltyService.getMyLoyalty().subscribe({
			next: (loyalty) => {
				this.loyalty = loyalty;
			},
			error: () => {
				this.loyalty = null;
			}
		});
	}
}