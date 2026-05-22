import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';
import {
  Product,
  ProductCreateRequest,
  ProductUpdateRequest
} from '../models/product.model';
import { PaginatedResponse } from '../models/paginated-response.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private apiClient = inject(ApiClientService);

  list(filters: {
    categoryId?: string;
    available?: boolean;
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<PaginatedResponse<Product>> {
    let params = new HttpParams();
    if (filters.categoryId) params = params.set('categoryId', filters.categoryId);
    if (filters.available !== undefined) params = params.set('available', `${filters.available}`);
    if (filters.page !== undefined) params = params.set('page', `${filters.page}`);
    if (filters.size !== undefined) params = params.set('size', `${filters.size}`);
    if (filters.sort) params = params.set('sort', filters.sort);
    return this.apiClient.get<PaginatedResponse<Product>>('/api/products', { params });
  }

  get(id: string): Observable<Product> {
    return this.apiClient.get<Product>(`/api/products/${id}`);
  }

  create(req: ProductCreateRequest): Observable<Product> {
    return this.apiClient.post<Product>('/api/products', req);
  }

  update(id: string, req: ProductUpdateRequest): Observable<Product> {
    return this.apiClient.put<Product>(`/api/products/${id}`, req);
  }

  delete(id: string): Observable<void> {
    return this.apiClient.delete<void>(`/api/products/${id}`);
  }
}
