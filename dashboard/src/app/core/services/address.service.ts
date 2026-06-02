import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';
import { AddressResponse } from '../models/address.model';

@Injectable({ providedIn: 'root' })
export class AddressService {
  private api = inject(ApiClientService);

  getAddress(id: string): Observable<AddressResponse> {
    return this.api.get<AddressResponse>(`/api/addresses/${id}`);
  }

  listMyAddresses(): Observable<AddressResponse[]> {
    return this.api.get<AddressResponse[]>('/api/addresses');
  }
}
