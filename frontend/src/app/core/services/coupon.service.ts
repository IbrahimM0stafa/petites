import { HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { SKIP_AUTH_HEADER, SKIP_AUTH_REFRESH, SKIP_GUEST_HEADER } from '../http/http-context.tokens';
import { CouponValidationResponse } from '../models/coupon.models';
import { ApiClientService } from './api-client.service';

@Injectable({
	providedIn: 'root'
})
export class CouponService {
	constructor(private readonly apiClient: ApiClientService) {}

	validateCoupon(code: string, subtotal: number): Observable<CouponValidationResponse> {
		return this.apiClient.get<CouponValidationResponse>('/api/coupons/validate', {
			params: { code, subtotal },
			context: this.publicContext()
		});
	}

	private publicContext(): HttpContext {
		return new HttpContext().set(SKIP_AUTH_HEADER, true).set(SKIP_AUTH_REFRESH, true).set(SKIP_GUEST_HEADER, true);
	}
}