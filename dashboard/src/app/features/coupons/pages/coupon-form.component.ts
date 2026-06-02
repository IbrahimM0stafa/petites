import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { readApiErrorMessage, readApiFieldErrors } from '../../../core/models/api-error.model';
import {
  CouponCreateRequest,
  CouponDiscountType,
  CouponResponse,
  CouponUpdateRequest
} from '../../../core/models/coupon.model';
import { CouponService } from '../../../core/services/coupon.service';

@Component({
  selector: 'app-coupon-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './coupon-form.component.html',
  styleUrl: './coupon-form.component.css'
})
export class CouponFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly couponService = inject(CouponService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  couponForm: FormGroup;
  isEditMode = false;
  couponId: string | null = null;
  couponUsedCount: number | null = null;
  loading = false;
  errorMessage = '';
  fieldErrors: Record<string, string[]> = {};

  readonly discountTypes: CouponDiscountType[] = ['PERCENTAGE', 'FIXED'];

  constructor() {
    this.couponForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(3)]],
      discountType: ['PERCENTAGE', [Validators.required]],
      discountValue: [0, [Validators.required, Validators.min(0)]],
      minimumOrderAmount: [0, [Validators.min(0)]],
      maxDiscountAmount: [0, [Validators.min(0)]],
      usageLimit: [null, [Validators.min(0)]],
      perUserLimit: [null, [Validators.min(0)]],
      startsAt: [''],
      expiresAt: [''],
      active: [true]
    });
  }

  ngOnInit(): void {
    this.couponId = this.route.snapshot.paramMap.get('id');
    if (this.couponId) {
      this.isEditMode = true;
      this.loadCoupon(this.couponId);
    }
  }

  setNullControl(controlName: string): void {
    const control = this.couponForm.get(controlName);
    if (control) {
      control.setValue(null);
      control.markAsDirty();
    }
  }

  loadCoupon(id: string): void {
    this.loading = true;
    this.couponService.getAdminCoupon(id).subscribe({
      next: (coupon) => {
        this.patchForm(coupon);
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = readApiErrorMessage(err, 'Failed to load coupon.');
        this.loading = false;
      }
    });
  }

  private patchForm(coupon: CouponResponse): void {
    this.couponForm.patchValue({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minimumOrderAmount: coupon.minimumOrderAmount ?? 0,
      maxDiscountAmount: coupon.maxDiscountAmount ?? 0,
      usageLimit: coupon.usageLimit ?? null,
      perUserLimit: coupon.perUserLimit ?? null,
      
      startsAt: this.toLocalDateTimeInput(coupon.startsAt),
      expiresAt: this.toLocalDateTimeInput(coupon.expiresAt),
      active: coupon.active
    });
    this.couponUsedCount = coupon.usedCount ?? 0;
  }

  onSubmit(): void {
    if (this.couponForm.invalid) {
      this.couponForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.fieldErrors = {};

    const formVal = this.couponForm.value;
    const payloadBase = {
      code: (formVal.code || '').trim().toUpperCase(),
      discountType: formVal.discountType as CouponDiscountType,
      discountValue: Number(formVal.discountValue),
      minimumOrderAmount: this.toNumberOrNull(formVal.minimumOrderAmount),
      maxDiscountAmount: formVal.discountType === 'PERCENTAGE' ? this.toNumberOrNull(formVal.maxDiscountAmount) : null,
      usageLimit: this.toNumberOrNull(formVal.usageLimit),
      perUserLimit: this.toNumberOrNull(formVal.perUserLimit),
      startsAt: this.toIsoOrNull(formVal.startsAt),
      expiresAt: this.toIsoOrNull(formVal.expiresAt),
      active: !!formVal.active
    };

    const request: CouponCreateRequest | CouponUpdateRequest = payloadBase;

    const request$ = this.isEditMode && this.couponId
      ? this.couponService.updateAdminCoupon(this.couponId, request as CouponUpdateRequest)
      : this.couponService.createAdminCoupon(request as CouponCreateRequest);

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/coupons']);
      },
      error: (err) => {
        this.errorMessage = readApiErrorMessage(err, 'Failed to save coupon.');
        const parsedFieldErrors = readApiFieldErrors(err);
        if (parsedFieldErrors) {
          this.fieldErrors = parsedFieldErrors;
        }
        this.loading = false;
      }
    });
  }

  private toIsoOrNull(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private toLocalDateTimeInput(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  private toNumberOrNull(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numberValue = Number(value);
    return Number.isNaN(numberValue) ? null : numberValue;
  }
}
