import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AddressCreateRequest, AddressResponse, AddressUpdateRequest } from '../models/address.models';
import { ApiClientService } from './api-client.service';

@Injectable({
	providedIn: 'root'
})
export class AddressService {
	constructor(private readonly apiClient: ApiClientService) {}

	listAddresses(): Observable<AddressResponse[]> {
		return this.apiClient.get<AddressResponse[]>('/api/addresses');
	}

	createAddress(request: AddressCreateRequest): Observable<AddressResponse> {
		return this.apiClient.post<AddressResponse>('/api/addresses', request);
	}

	updateAddress(id: string, request: AddressUpdateRequest): Observable<AddressResponse> {
		return this.apiClient.put<AddressResponse>(`/api/addresses/${id}`, request);
	}

	deleteAddress(id: string): Observable<void> {
		return this.apiClient.delete<void>(`/api/addresses/${id}`);
	}
}