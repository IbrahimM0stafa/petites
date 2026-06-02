export type CouponDiscountType = 'PERCENTAGE' | 'FIXED';

export interface CouponCreateRequest {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minimumOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  active: boolean;
}

export interface CouponUpdateRequest {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minimumOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  usedCount?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  active: boolean;
}

export interface CouponResponse {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minimumOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  usedCount: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  active: boolean;
  updatedAt: string;
}

export interface CouponValidationResponse {
  valid: boolean;
  couponId?: string | null;
  code?: string | null;
  discountAmount?: number | null;
  finalAmount?: number | null;
  message?: string | null;
}
