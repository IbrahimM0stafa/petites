import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { FulfillmentService, FulfillmentStatusResponse } from '../../../core/services/fulfillment.service';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-product-fulfillment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './product-fulfillment.component.html',
  styleUrl: './product-fulfillment.component.css'
})
export class ProductFulfillmentComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly fulfillmentService = inject(FulfillmentService);
  private readonly productService = inject(ProductService);

  productId!: string;
  product?: Product;
  status?: FulfillmentStatusResponse;

  loading = false;
  savingCapacity = false;
  savingInstant = false;
  errorMessage = '';
  successMessage = '';

  capacityForm!: FormGroup;
  instantForm!: FormGroup;

  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.productId) {
      this.router.navigate(['/products']);
      return;
    }
    this.initForms();
    this.loadData();
  }

  private initForms(): void {
    this.capacityForm = this.fb.group({
      dailyCapacity: [0, [Validators.required, Validators.min(0)]]
    });

    this.instantForm = this.fb.group({
      availableQuantity: [0, [Validators.required, Validators.min(0)]],
      availableUntil: ['', [Validators.required]],
      active: [true]
    });
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      product: this.productService.get(this.productId),
      status: this.fulfillmentService.getStatus(this.productId)
    }).subscribe({
      next: (res) => {
        this.product = res.product;
        this.status = res.status;

        this.capacityForm.patchValue({
          dailyCapacity: res.status.dailyCapacity
        });

        let isoUntil = '';
        if (res.status.instantAvailableUntil) {
          const date = new Date(res.status.instantAvailableUntil);
          const tzoffset = date.getTimezoneOffset() * 60000;
          const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
          isoUntil = localISOTime;
        } else {
          const now = new Date();
          now.setHours(19, 0, 0, 0);
          const tzoffset = now.getTimezoneOffset() * 60000;
          isoUntil = (new Date(now.getTime() - tzoffset)).toISOString().slice(0, 16);
        }

        this.instantForm.patchValue({
          availableQuantity: res.status.instantQuantity,
          availableUntil: isoUntil,
          active: res.status.instantActive
        });

        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load product fulfillment status.';
        this.loading = false;
      }
    });
  }

  onUpdateCapacity(): void {
    if (this.capacityForm.invalid) {
      return;
    }
    this.savingCapacity = true;
    this.errorMessage = '';
    this.successMessage = '';

    const capacity = this.capacityForm.value.dailyCapacity;
    this.fulfillmentService.updateScheduledCapacity(this.productId, capacity).subscribe({
      next: () => {
        this.savingCapacity = false;
        this.successMessage = 'Preorder capacity updated successfully!';
        this.loadData();
      },
      error: (err) => {
        this.errorMessage = 'Failed to update capacity.';
        this.savingCapacity = false;
      }
    });
  }

  onUpdateInstant(): void {
    if (this.instantForm.invalid) {
      return;
    }
    this.savingInstant = true;
    this.errorMessage = '';
    this.successMessage = '';

    const val = this.instantForm.value;
    const date = new Date(val.availableUntil);
    const isoString = date.toISOString();

    this.fulfillmentService.updateInstantInventory(
      this.productId,
      val.availableQuantity,
      isoString,
      val.active
    ).subscribe({
      next: () => {
        this.savingInstant = false;
        this.successMessage = 'Same-day instant stock updated successfully!';
        this.loadData();
      },
      error: (err) => {
        this.errorMessage = 'Failed to update instant inventory overlay.';
        this.savingInstant = false;
      }
    });
  }
}
