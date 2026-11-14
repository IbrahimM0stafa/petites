import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DeliveryZoneService } from '../../../core/services/delivery-zone.service';
import { Governorate, City, Area } from '../../../core/models/delivery-zone.model';
import { readApiErrorMessage } from '../../../core/models/api-error.model';

@Component({
  selector: 'app-delivery-zones',
  standalone: true,
  imports: [DecimalPipe, FormsModule, ReactiveFormsModule],
  templateUrl: './delivery-zones.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './delivery-zones.component.css'
})
export class DeliveryZonesComponent implements OnInit {
  private readonly zoneService = inject(DeliveryZoneService);
  private readonly fb = inject(FormBuilder);

  governorates: Governorate[] = [];
  cities: City[] = [];
  areas: Area[] = [];

  selectedGov: Governorate | null = null;
  selectedCity: City | null = null;

  loadingGovs = false;
  loadingCities = false;
  loadingAreas = false;

  actionLoading = false;
  errorMessage = '';
  successMessage = '';

  // Modals
  showGovModal = false;
  showCityModal = false;
  showAreaModal = false;

  editingGov: Governorate | null = null;
  editingCity: City | null = null;
  editingArea: Area | null = null;

  govForm!: FormGroup;
  cityForm!: FormGroup;
  areaForm!: FormGroup;

  ngOnInit(): void {
    this.initForms();
    this.loadGovernorates();
  }

  private initForms(): void {
    this.govForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      active: [true],
      sortOrder: [0, [Validators.required, Validators.min(0)]]
    });

    this.cityForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      active: [true],
      sortOrder: [0, [Validators.required, Validators.min(0)]]
    });

    this.areaForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      deliveryFee: [50, [Validators.required, Validators.min(0)]],
      courierDelivery: [false],
      active: [true],
      sortOrder: [0, [Validators.required, Validators.min(0)]]
    });
  }

  // ── Stats ──────────────────────────────────────────────────────────────

  get activeGovCount(): number {
    return this.governorates.filter(g => g.active).length;
  }

  get activeCityCount(): number {
    return this.cities.filter(c => c.active).length;
  }

  get inHouseAreaCount(): number {
    return this.areas.filter(a => a.active && !a.courierDelivery).length;
  }

  get courierAreaCount(): number {
    return this.areas.filter(a => a.active && a.courierDelivery).length;
  }

  // ── Governorates ───────────────────────────────────────────────────────

  loadGovernorates(): void {
    this.loadingGovs = true;
    this.errorMessage = '';
    this.zoneService.getGovernorates().subscribe({
      next: (res) => {
        this.governorates = res;
        this.loadingGovs = false;
        if (res.length > 0) {
          const currentId = this.selectedGov?.id;
          const match = res.find(g => g.id === currentId) || res[0];
          this.selectGovernorate(match);
        } else {
          this.selectedGov = null;
          this.cities = [];
          this.areas = [];
        }
      },
      error: (err) => {
        this.errorMessage = readApiErrorMessage(err, 'Failed to load governorates.');
        this.loadingGovs = false;
      }
    });
  }

  selectGovernorate(gov: Governorate): void {
    this.selectedGov = gov;
    this.selectedCity = null;
    this.areas = [];
    this.loadCities(gov.id);
  }

  openAddGovModal(): void {
    this.editingGov = null;
    this.govForm.reset({
      name: '',
      active: true,
      sortOrder: this.governorates.length + 1
    });
    this.showGovModal = true;
  }

  openEditGovModal(gov: Governorate, event: MouseEvent): void {
    event.stopPropagation();
    this.editingGov = gov;
    this.govForm.reset({
      name: gov.name,
      active: gov.active,
      sortOrder: gov.sortOrder
    });
    this.showGovModal = true;
  }

  saveGov(): void {
    if (this.govForm.invalid) {
      this.govForm.markAllAsTouched();
      return;
    }

    this.actionLoading = true;
    const val = this.govForm.value;

    if (this.editingGov) {
      this.zoneService.updateGovernorate(this.editingGov.id, val).subscribe({
        next: (updated) => {
          this.showGovModal = false;
          this.actionLoading = false;
          this.setSuccess(`Governorate "${updated.name}" updated successfully.`);
          this.loadGovernorates();
        },
        error: (err) => {
          this.errorMessage = readApiErrorMessage(err, 'Failed to update governorate.');
          this.actionLoading = false;
        }
      });
    } else {
      this.zoneService.createGovernorate(val).subscribe({
        next: (created) => {
          this.showGovModal = false;
          this.actionLoading = false;
          this.setSuccess(`Governorate "${created.name}" created successfully.`);
          this.loadGovernorates();
        },
        error: (err) => {
          this.errorMessage = readApiErrorMessage(err, 'Failed to create governorate.');
          this.actionLoading = false;
        }
      });
    }
  }

  toggleGovActive(gov: Governorate, event?: Event): void {
    if (event) event.stopPropagation();
    this.zoneService.toggleGovernorate(gov.id).subscribe({
      next: (updated) => {
        gov.active = updated.active;
        this.setSuccess(`Governorate "${gov.name}" is now ${gov.active ? 'OPERATING (Active)' : 'DISABLED'}.`);
      },
      error: (err) => {
        this.errorMessage = readApiErrorMessage(err, 'Failed to toggle governorate status.');
      }
    });
  }

  deleteGov(gov: Governorate, event: MouseEvent): void {
    event.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${gov.name}"? This will delete all cities and areas under it.`)) {
      return;
    }

    this.zoneService.deleteGovernorate(gov.id).subscribe({
      next: () => {
        this.setSuccess(`Governorate "${gov.name}" deleted.`);
        this.loadGovernorates();
      },
      error: (err) => {
        this.errorMessage = readApiErrorMessage(err, 'Failed to delete governorate.');
      }
    });
  }

  // ── Cities ─────────────────────────────────────────────────────────────

  loadCities(governorateId: string): void {
    this.loadingCities = true;
    this.zoneService.getCities(governorateId).subscribe({
      next: (res) => {
        this.cities = res;
        this.loadingCities = false;
        if (res.length > 0) {
          const currentId = this.selectedCity?.id;
          const match = res.find(c => c.id === currentId) || res[0];
          this.selectCity(match);
        } else {
          this.selectedCity = null;
          this.areas = [];
        }
      },
      error: (err) => {
        this.errorMessage = readApiErrorMessage(err, 'Failed to load cities.');
        this.loadingCities = false;
      }
    });
  }

  selectCity(city: City): void {
    this.selectedCity = city;
    this.loadAreas(city.id);
  }

  openAddCityModal(): void {
    if (!this.selectedGov) return;
    this.editingCity = null;
    this.cityForm.reset({
      name: '',
      active: true,
      sortOrder: this.cities.length + 1
    });
    this.showCityModal = true;
  }

  openEditCityModal(city: City, event: MouseEvent): void {
    event.stopPropagation();
    this.editingCity = city;
    this.cityForm.reset({
      name: city.name,
      active: city.active,
      sortOrder: city.sortOrder
    });
    this.showCityModal = true;
  }

  saveCity(): void {
    if (this.cityForm.invalid || !this.selectedGov) {
      this.cityForm.markAllAsTouched();
      return;
    }

    this.actionLoading = true;
    const val = this.cityForm.value;

    if (this.editingCity) {
      this.zoneService.updateCity(this.editingCity.id, val).subscribe({
        next: (updated) => {
          this.showCityModal = false;
          this.actionLoading = false;
          this.setSuccess(`City "${updated.name}" updated successfully.`);
          if (this.selectedGov) this.loadCities(this.selectedGov.id);
        },
        error: (err) => {
          this.errorMessage = readApiErrorMessage(err, 'Failed to update city.');
          this.actionLoading = false;
        }
      });
    } else {
      this.zoneService.createCity({
        governorateId: this.selectedGov.id,
        name: val.name,
        active: val.active,
        sortOrder: val.sortOrder
      }).subscribe({
        next: (created) => {
          this.showCityModal = false;
          this.actionLoading = false;
          this.setSuccess(`City "${created.name}" created successfully.`);
          if (this.selectedGov) this.loadCities(this.selectedGov.id);
        },
        error: (err) => {
          this.errorMessage = readApiErrorMessage(err, 'Failed to create city.');
          this.actionLoading = false;
        }
      });
    }
  }

  toggleCityActive(city: City, event?: Event): void {
    if (event) event.stopPropagation();
    this.zoneService.toggleCity(city.id).subscribe({
      next: (updated) => {
        city.active = updated.active;
        this.setSuccess(`City "${city.name}" is now ${city.active ? 'OPERATING (Active)' : 'DISABLED'}.`);
      },
      error: (err) => {
        this.errorMessage = readApiErrorMessage(err, 'Failed to toggle city status.');
      }
    });
  }

  deleteCity(city: City, event: MouseEvent): void {
    event.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${city.name}"? This will delete all areas under it.`)) {
      return;
    }

    this.zoneService.deleteCity(city.id).subscribe({
      next: () => {
        this.setSuccess(`City "${city.name}" deleted.`);
        if (this.selectedGov) this.loadCities(this.selectedGov.id);
      },
      error: (err) => {
        this.errorMessage = readApiErrorMessage(err, 'Failed to delete city.');
      }
    });
  }

  // ── Areas ──────────────────────────────────────────────────────────────

  loadAreas(cityId: string): void {
    this.loadingAreas = true;
    this.zoneService.getAreas(cityId).subscribe({
      next: (res) => {
        this.areas = res;
        this.loadingAreas = false;
      },
      error: (err) => {
        this.errorMessage = readApiErrorMessage(err, 'Failed to load areas.');
        this.loadingAreas = false;
      }
    });
  }

  openAddAreaModal(): void {
    if (!this.selectedCity) return;
    this.editingArea = null;
    this.areaForm.reset({
      name: '',
      deliveryFee: 50,
      courierDelivery: false,
      active: true,
      sortOrder: this.areas.length + 1
    });
    this.showAreaModal = true;
  }

  openEditAreaModal(area: Area): void {
    this.editingArea = area;
    this.areaForm.reset({
      name: area.name,
      deliveryFee: area.deliveryFee,
      courierDelivery: area.courierDelivery,
      active: area.active,
      sortOrder: area.sortOrder
    });
    this.showAreaModal = true;
  }

  saveArea(): void {
    if (this.areaForm.invalid || !this.selectedCity) {
      this.areaForm.markAllAsTouched();
      return;
    }

    this.actionLoading = true;
    const val = this.areaForm.value;
    const isCourier = Boolean(val.courierDelivery);
    const fee = isCourier ? 0 : (Number(val.deliveryFee) || 0);

    if (this.editingArea) {
      this.zoneService.updateArea(this.editingArea.id, {
        ...val,
        courierDelivery: isCourier,
        deliveryFee: fee
      }).subscribe({
        next: (updated) => {
          this.showAreaModal = false;
          this.actionLoading = false;
          this.setSuccess(`Area "${updated.name}" updated.`);
          if (this.selectedCity) this.loadAreas(this.selectedCity.id);
        },
        error: (err) => {
          this.errorMessage = readApiErrorMessage(err, 'Failed to update area.');
          this.actionLoading = false;
        }
      });
    } else {
      this.zoneService.createArea({
        cityId: this.selectedCity.id,
        name: val.name,
        deliveryFee: fee,
        courierDelivery: isCourier,
        active: val.active,
        sortOrder: val.sortOrder
      }).subscribe({
        next: (created) => {
          this.showAreaModal = false;
          this.actionLoading = false;
          this.setSuccess(`Area "${created.name}" created.`);
          if (this.selectedCity) this.loadAreas(this.selectedCity.id);
        },
        error: (err) => {
          this.errorMessage = readApiErrorMessage(err, 'Failed to create area.');
          this.actionLoading = false;
        }
      });
    }
  }

  toggleAreaActive(area: Area): void {
    this.zoneService.toggleArea(area.id).subscribe({
      next: (updated) => {
        area.active = updated.active;
        this.setSuccess(`Area "${area.name}" is now ${area.active ? 'ACTIVE' : 'DISABLED'}.`);
      },
      error: (err) => {
        this.errorMessage = readApiErrorMessage(err, 'Failed to toggle area status.');
      }
    });
  }

  toggleAreaCourier(area: Area): void {
    this.zoneService.toggleAreaCourier(area.id).subscribe({
      next: (updated) => {
        area.courierDelivery = updated.courierDelivery;
        this.setSuccess(`Area "${area.name}" courier delivery is now ${area.courierDelivery ? 'ENABLED (3rd-Party Courier)' : 'DISABLED (In-House Bakery Delivery)'}.`);
      },
      error: (err) => {
        this.errorMessage = readApiErrorMessage(err, 'Failed to toggle courier status.');
      }
    });
  }

  deleteArea(area: Area): void {
    if (!confirm(`Are you sure you want to delete area "${area.name}"?`)) {
      return;
    }

    this.zoneService.deleteArea(area.id).subscribe({
      next: () => {
        this.setSuccess(`Area "${area.name}" deleted.`);
        if (this.selectedCity) this.loadAreas(this.selectedCity.id);
      },
      error: (err) => {
        this.errorMessage = readApiErrorMessage(err, 'Failed to delete area.');
      }
    });
  }

  private setSuccess(msg: string): void {
    this.successMessage = msg;
    this.errorMessage = '';
    setTimeout(() => {
      if (this.successMessage === msg) {
        this.successMessage = '';
      }
    }, 4500);
  }
}
