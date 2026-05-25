import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { LoyaltyResponse } from '../models/loyalty.models';
import { ApiClientService } from './api-client.service';

@Injectable({
	providedIn: 'root'
})
export class LoyaltyService {
	constructor(private readonly apiClient: ApiClientService) {}

	getMyLoyalty(): Observable<LoyaltyResponse> {
		return this.apiClient.get<LoyaltyResponse>('/api/loyalty/me');
	}
}