import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';
import {
  Category,
  CategoryCreateRequest,
  CategoryUpdateRequest
} from '../models/category.model';
import { PaginatedResponse } from '../models/paginated-response.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private apiClient = inject(ApiClientService);

  list(page = 0, size = 10, sort = 'sortOrder,asc'): Observable<PaginatedResponse<Category>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);
    return this.apiClient.get<PaginatedResponse<Category>>('/api/categories', { params });
  }

  get(id: string): Observable<Category> {
    return this.apiClient.get<Category>(`/api/categories/${id}`);
  }

  create(req: CategoryCreateRequest): Observable<Category> {
    return this.apiClient.post<Category>('/api/categories', req);
  }

  update(id: string, req: CategoryUpdateRequest): Observable<Category> {
    return this.apiClient.put<Category>(`/api/categories/${id}`, req);
  }

  delete(id: string): Observable<void> {
    return this.apiClient.delete<void>(`/api/categories/${id}`);
  }
}
