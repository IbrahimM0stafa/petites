import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface FulfillmentStatusResponse {
  productId: string;
  dailyCapacity: number;
  reservedQuantityTomorrow: number;
  instantQuantity: number;
  instantActive: boolean;
  instantAvailableUntil: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class FulfillmentService {
  private apiClient = inject(ApiClientService);

  getStatus(productId: string): Observable<FulfillmentStatusResponse> {
    return this.apiClient.get<FulfillmentStatusResponse>(`/api/admin/fulfillment/status/${productId}`);
  }

  updateScheduledCapacity(productId: string, dailyCapacity: number): Observable<void> {
    return this.apiClient.put<void>('/api/admin/fulfillment/scheduled-capacity', null, {
      params: { productId, dailyCapacity }
    });
  }

  updateInstantInventory(
    productId: string,
    availableQuantity: number,
    availableUntil: string,
    active: boolean = true
  ): Observable<void> {
    return this.apiClient.put<void>('/api/admin/fulfillment/instant-inventory', null, {
      params: {
        productId,
        availableQuantity,
        availableUntil,
        active
      }
    });
  }
}
