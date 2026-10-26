import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';
import { Governorate, City, Area } from '../models/delivery-zone.model';

@Injectable({
  providedIn: 'root'
})
export class DeliveryZoneService {
  private readonly apiClient = inject(ApiClientService);

  // Governorates
  getGovernorates(): Observable<Governorate[]> {
    return this.apiClient.get<Governorate[]>('/api/admin/delivery-zones/governorates');
  }

  createGovernorate(data: { name: string; active?: boolean; sortOrder?: number }): Observable<Governorate> {
    return this.apiClient.post<Governorate>('/api/admin/delivery-zones/governorates', data);
  }

  updateGovernorate(id: string, data: { name?: string; active?: boolean; sortOrder?: number }): Observable<Governorate> {
    return this.apiClient.put<Governorate>(`/api/admin/delivery-zones/governorates/${id}`, data);
  }

  toggleGovernorate(id: string): Observable<Governorate> {
    return this.apiClient.patch<Governorate>(`/api/admin/delivery-zones/governorates/${id}/toggle-active`, {});
  }

  deleteGovernorate(id: string): Observable<void> {
    return this.apiClient.delete<void>(`/api/admin/delivery-zones/governorates/${id}`);
  }

  // Cities
  getCities(governorateId?: string): Observable<City[]> {
    const params = governorateId ? { governorateId } : undefined;
    return this.apiClient.get<City[]>('/api/admin/delivery-zones/cities', { params });
  }

  createCity(data: { governorateId: string; name: string; active?: boolean; sortOrder?: number }): Observable<City> {
    return this.apiClient.post<City>('/api/admin/delivery-zones/cities', data);
  }

  updateCity(id: string, data: { name?: string; active?: boolean; sortOrder?: number }): Observable<City> {
    return this.apiClient.put<City>(`/api/admin/delivery-zones/cities/${id}`, data);
  }

  toggleCity(id: string): Observable<City> {
    return this.apiClient.patch<City>(`/api/admin/delivery-zones/cities/${id}/toggle-active`, {});
  }

  deleteCity(id: string): Observable<void> {
    return this.apiClient.delete<void>(`/api/admin/delivery-zones/cities/${id}`);
  }

  // Areas
  getAreas(cityId?: string): Observable<Area[]> {
    const params = cityId ? { cityId } : undefined;
    return this.apiClient.get<Area[]>('/api/admin/delivery-zones/areas', { params });
  }

  createArea(data: { cityId: string; name: string; deliveryFee: number; courierDelivery?: boolean; active?: boolean; sortOrder?: number }): Observable<Area> {
    return this.apiClient.post<Area>('/api/admin/delivery-zones/areas', data);
  }

  updateArea(id: string, data: { name?: string; deliveryFee?: number; courierDelivery?: boolean; active?: boolean; sortOrder?: number }): Observable<Area> {
    return this.apiClient.put<Area>(`/api/admin/delivery-zones/areas/${id}`, data);
  }

  toggleArea(id: string): Observable<Area> {
    return this.apiClient.patch<Area>(`/api/admin/delivery-zones/areas/${id}/toggle-active`, {});
  }

  toggleAreaCourier(id: string): Observable<Area> {
    return this.apiClient.patch<Area>(`/api/admin/delivery-zones/areas/${id}/toggle-courier`, {});
  }

  deleteArea(id: string): Observable<void> {
    return this.apiClient.delete<void>(`/api/admin/delivery-zones/areas/${id}`);
  }
}
