import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { readApiErrorMessage } from '../../../core/models/api-error.model';
import { CouponResponse, CouponValidationResponse } from '../../../core/models/coupon.model';
import { CouponService } from '../../../core/services/coupon.service';

@Component({
  selector: 'app-coupons-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './coupons-list.component.html',
  styleUrl: './coupons-list.component.css'
})
export class CouponsListComponent implements OnInit {
  private readonly couponService = inject(CouponService);

  coupons: CouponResponse[] = [];
  loading = true;
  error = '';

  testCode = '';
  testSubtotal: number | null = null;
  validating = false;
  validationResult: CouponValidationResponse | null = null;
  validationError = '';

  ngOnInit(): void {
    this.loadCoupons();
  }

  loadCoupons(): void {
    this.loading = true;
    this.error = '';

    this.couponService.listAdminCoupons().subscribe({
      next: (coupons) => {
        this.coupons = coupons;
        this.loading = false;
      },
      error: (err) => {
        this.error = readApiErrorMessage(err, 'Failed to load coupons.');
        this.loading = false;
      }
    });
  }

  onDelete(id: string): void {
    if (confirm('Delete this coupon? This will disable it immediately.')) {
      this.couponService.deleteAdminCoupon(id).subscribe({
        next: () => {
          this.loadCoupons();
        },
        error: (err) => {
          alert(readApiErrorMessage(err, 'Failed to delete coupon.'));
        }
      });
    }
  }

  validateCoupon(): void {
    if (!this.testCode.trim()) {
      this.validationError = 'Enter a coupon code to validate.';
      return;
    }

    this.validating = true;
    this.validationError = '';
    this.validationResult = null;

    this.couponService.validateCoupon(this.testCode.trim(), this.testSubtotal).subscribe({
      next: (result) => {
        this.validationResult = result;
        this.validating = false;
      },
      error: (err) => {
        this.validationError = readApiErrorMessage(err, 'Failed to validate coupon.');
        this.validating = false;
      }
    });
  }
}
