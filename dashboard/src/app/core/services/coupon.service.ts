import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from './api-client.service';
import {
  CouponCreateRequest,
  CouponResponse,
  CouponUpdateRequest,
  CouponValidationResponse
} from '../models/coupon.model';

@Injectable({ providedIn: 'root' })
export class CouponService {
  private apiClient = inject(ApiClientService);

  listAdminCoupons(): Observable<CouponResponse[]> {
    return this.apiClient.get<CouponResponse[]>('/api/admin/coupons');
  }

  getAdminCoupon(id: string): Observable<CouponResponse> {
    return this.apiClient.get<CouponResponse>(`/api/admin/coupons/${id}`);
  }

  createAdminCoupon(request: CouponCreateRequest): Observable<CouponResponse> {
    return this.apiClient.post<CouponResponse>('/api/admin/coupons', request);
  }

  updateAdminCoupon(id: string, request: CouponUpdateRequest): Observable<CouponResponse> {
    return this.apiClient.put<CouponResponse>(`/api/admin/coupons/${id}`, request);
  }

  deleteAdminCoupon(id: string): Observable<CouponResponse> {
    return this.apiClient.delete<CouponResponse>(`/api/admin/coupons/${id}`);
  }

  validateCoupon(code: string, subtotal?: number | null): Observable<CouponValidationResponse> {
    const params: Record<string, string | number> = { code };
    if (subtotal !== null && subtotal !== undefined) {
      params['subtotal'] = subtotal;
    }

    return this.apiClient.get<CouponValidationResponse>('/api/coupons/validate', { params });
  }
}
