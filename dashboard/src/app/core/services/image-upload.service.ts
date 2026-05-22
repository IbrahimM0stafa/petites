import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class ImageUploadService {
  private apiClient = inject(ApiClientService);

  /**
   * Upload a single file.
   * Returns an observable that emits the Cloudinary URL when the upload finishes.
   */
  upload(file: File): Observable<string> {
    const form = new FormData();
    form.append('file', file);
    return this.apiClient.post<{ url: string }>('/api/images/upload', form).pipe(
      map(res => res.url)
    );
  }

  deleteByUrl(imageUrl: string): Observable<void> {
    return this.apiClient.delete<void>('/api/images', {
      params: { imageUrl }
    });
  }
}
