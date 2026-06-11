import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AddressCreateRequest, AddressUpdateRequest, SavedAddressResponse } from '../models/address.models';
import { ApiClientService } from './api-client.service';

@Injectable({
	providedIn: 'root'
})
export class AddressService {
	constructor(private readonly apiClient: ApiClientService) {}

	listAddresses(): Observable<SavedAddressResponse[]> {
		return this.apiClient.get<SavedAddressResponse[]>('/api/addresses');
	}

	createAddress(request: AddressCreateRequest): Observable<SavedAddressResponse> {
		return this.apiClient.post<SavedAddressResponse>('/api/addresses', request);
	}

	updateAddress(id: string, request: AddressUpdateRequest): Observable<SavedAddressResponse> {
		return this.apiClient.put<SavedAddressResponse>(`/api/addresses/${id}`, request);
	}

	deleteAddress(id: string): Observable<void> {
		return this.apiClient.delete<void>(`/api/addresses/${id}`);
	}
}