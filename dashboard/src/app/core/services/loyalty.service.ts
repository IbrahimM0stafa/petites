import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from './api-client.service';
import { LoyaltyResponse } from '../models/loyalty.model';

@Injectable({ providedIn: 'root' })
export class LoyaltyService {
  private apiClient = inject(ApiClientService);

  getMyStatus(): Observable<LoyaltyResponse> {
    return this.apiClient.get<LoyaltyResponse>('/api/loyalty/me');
  }
}
