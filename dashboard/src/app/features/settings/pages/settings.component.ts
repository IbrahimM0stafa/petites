import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SettingsService, AdminSetting } from '../../../core/services/settings.service';
import { readApiErrorMessage } from '../../../core/models/api-error.model';
import { Product } from '../../../core/models/product.model';
import { ProductService } from '../../../core/services/product.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);
  private readonly productService = inject(ProductService);

  settings: AdminSetting[] = [];
  rewardProduct: Product | null = null;
  rewardProductLoading = false;
  rewardProductError = '';
  productOptions: Product[] = [];
  productLoading = false;
  productError = '';
  productPage = 0;
  productSize = 20;
  productHasMore = true;
  productSearch = '';
  settingsForm!: FormGroup;
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.initForm();
    this.loadProducts(true);
    this.loadSettings();
  }

  private initForm(): void {
    this.settingsForm = this.fb.group({
      reward_order_target: [5, [Validators.required, Validators.min(1)]],
      reward_product_id: [''],
      delivery_cutoff_time: ['19:00', [Validators.required, Validators.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)]],
      delivery_fee: [0, [Validators.required, Validators.min(0)]]
    });
  }

  loadSettings(): void {
    this.loading = true;
    this.errorMessage = '';
    this.settingsService.list().subscribe({
      next: (res) => {
        this.settings = res;
        const rewardTarget = res.find(s => s.key === 'reward_order_target');
        const rewardProduct = res.find(s => s.key === 'reward_product_id');
        const cutoffSetting = res.find(s => s.key === 'delivery_cutoff_time');
        const feeSetting = res.find(s => s.key === 'delivery_fee');

        this.settingsForm.patchValue({
          reward_order_target: rewardTarget ? Number(rewardTarget.value) : 5,
          reward_product_id: rewardProduct ? rewardProduct.value : '',
          delivery_cutoff_time: cutoffSetting ? cutoffSetting.value : '19:00',
          delivery_fee: feeSetting ? Number(feeSetting.value) : 50
        });
        this.onRewardProductSelected();
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load settings from server.';
        this.loading = false;
      }
    });
  }

  loadProducts(reset = false): void {
    if (this.productLoading) {
      return;
    }

    if (reset) {
      this.productPage = 0;
      this.productHasMore = true;
      this.productOptions = [];
    }

    if (!this.productHasMore && !reset) {
      return;
    }

    this.productLoading = true;
    this.productError = '';

    this.productService.list({
      page: this.productPage,
      size: this.productSize,
      sort: 'name,asc'
    }).subscribe({
      next: (res) => {
        const incoming = res.content ?? [];
        this.productOptions = reset ? incoming : [...this.productOptions, ...incoming];
        this.productHasMore = this.productPage + 1 < res.totalPages;
        this.productPage += 1;
        this.productLoading = false;
        this.syncRewardProductFromOptions();
      },
      error: (err) => {
        this.productError = readApiErrorMessage(err, 'Failed to load products.');
        this.productLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formVal = this.settingsForm.value;

    forkJoin({
      rewardTarget: this.settingsService.update('reward_order_target', formVal.reward_order_target.toString()),
      rewardProduct: this.settingsService.update('reward_product_id', (formVal.reward_product_id || '').toString()),
      cutoff: this.settingsService.update('delivery_cutoff_time', formVal.delivery_cutoff_time),
      fee: this.settingsService.update('delivery_fee', formVal.delivery_fee.toString())
    }).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Global rules settings saved successfully!';
        this.loadSettings();
      },
      error: (err) => {
        this.errorMessage = 'Failed to save settings. Please try again.';
        this.saving = false;
      }
    });
  }

  onRewardProductSelected(): void {
    const rewardProductId = this.settingsForm.get('reward_product_id')?.value || '';
    this.rewardProductError = '';
    if (!rewardProductId) {
      this.rewardProduct = null;
      return;
    }

    const match = this.productOptions.find((product) => product.id === rewardProductId);
    if (match) {
      this.rewardProduct = match;
      return;
    }

    this.loadRewardProduct(rewardProductId);
  }

  filteredProducts(): Product[] {
    const term = this.productSearch.trim().toLowerCase();
    if (!term) {
      return this.productOptions;
    }

    return this.productOptions.filter((product) =>
      `${product.name} ${product.id}`.toLowerCase().includes(term)
    );
  }

  private loadRewardProduct(productId: string): void {
    if (!productId) {
      this.rewardProduct = null;
      this.rewardProductError = '';
      this.rewardProductLoading = false;
      return;
    }

    const match = this.productOptions.find((product) => product.id === productId);
    if (match) {
      this.rewardProduct = match;
      this.rewardProductError = '';
      this.rewardProductLoading = false;
      return;
    }

    this.rewardProductLoading = true;
    this.rewardProductError = '';

    this.productService.get(productId).subscribe({
      next: (product) => {
        this.rewardProduct = product;
        this.rewardProductLoading = false;
      },
      error: () => {
        this.rewardProduct = null;
        this.rewardProductError = 'Reward product not found. Verify the product ID.';
        this.rewardProductLoading = false;
      }
    });
  }

  private syncRewardProductFromOptions(): void {
    const rewardProductId = this.settingsForm.get('reward_product_id')?.value || '';
    if (!rewardProductId) {
      return;
    }

    const match = this.productOptions.find((product) => product.id === rewardProductId);
    if (match) {
      this.rewardProduct = match;
      this.rewardProductError = '';
    }
  }
}
