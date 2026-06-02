import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CouponValidationResponse } from '../models/coupon.models';
import { ApiClientService } from './api-client.service';

@Injectable({
	providedIn: 'root'
})
export class CouponService {
	constructor(private readonly apiClient: ApiClientService) {}

	validateCoupon(code: string, subtotal: number): Observable<CouponValidationResponse> {
		return this.apiClient.get<CouponValidationResponse>('/api/coupons/validate', {
			params: { code, subtotal }
		});
	}
}