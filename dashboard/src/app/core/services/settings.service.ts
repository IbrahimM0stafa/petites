import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

export interface AdminSetting {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private apiClient = inject(ApiClientService);

  list(): Observable<AdminSetting[]> {
    return this.apiClient.get<AdminSetting[]>('/api/admin/settings');
  }

    update(key: string, value: string): Observable < AdminSetting > {
      return this.apiClient.put<AdminSetting>('/api/admin/settings', { key, value });
    }
  }
