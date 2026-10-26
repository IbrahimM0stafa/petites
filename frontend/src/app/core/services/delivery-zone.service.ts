import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { ApiClientService } from './api-client.service';
import { GovernorateNode } from '../models/delivery-zone.model';

@Injectable({
	providedIn: 'root'
})
export class DeliveryZoneService {
	private tree$?: Observable<GovernorateNode[]>;

	constructor(private readonly apiClient: ApiClientService) {}

	getTree(forceRefresh = false): Observable<GovernorateNode[]> {
		if (!this.tree$ || forceRefresh) {
			this.tree$ = this.apiClient.get<GovernorateNode[]>('/api/delivery-zones/tree').pipe(
				shareReplay(1)
			);
		}
		return this.tree$;
	}
}
