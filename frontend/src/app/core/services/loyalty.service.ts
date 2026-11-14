import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { LoyaltyResponse } from '../models/loyalty.models';
import { ApiClientService } from './api-client.service';

@Injectable({
	providedIn: 'root'
})
export class LoyaltyService {
	private readonly apiClient = inject(ApiClientService);

	getMyLoyalty(): Observable<LoyaltyResponse> {
		return this.apiClient.get<LoyaltyResponse>('/api/loyalty/me');
	}
}