import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from './api-client.service';

export interface DeliveryFeeResponse {
	deliveryFee: number;
}

export interface BlockedDaysResponse {
	blockedDays: string[];
}

@Injectable({
	providedIn: 'root'
})
export class SettingService {
	constructor(private readonly apiClient: ApiClientService) {}

	getDeliveryFee(): Observable<DeliveryFeeResponse> {
		return this.apiClient.get<DeliveryFeeResponse>('/api/settings/delivery-fee');
	}

	getBlockedDays(): Observable<BlockedDaysResponse> {
		return this.apiClient.get<BlockedDaysResponse>('/api/settings/blocked-days');
	}
}
