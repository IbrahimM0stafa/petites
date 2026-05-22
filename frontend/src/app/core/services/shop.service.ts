import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';
import { Category, Product, PagedResponse } from '../models/shop.models';

@Injectable({
  providedIn: 'root'
})
export class ShopService {
  constructor(private readonly apiClient: ApiClientService) {}

  getCategories(page = 0, size = 10, sort = 'sortOrder,asc'): Observable<PagedResponse<Category>> {
    return this.apiClient.get<PagedResponse<Category>>('/api/categories', {
      params: { page, size, sort }
    });
  }

  getProducts(categoryId?: string, available = true, page = 0, size = 20, sort = 'createdAt,desc'): Observable<PagedResponse<Product>> {
    const params: Record<string, string | number | boolean> = { available, page, size, sort };
    if (categoryId !== undefined && categoryId !== null) {
      params['categoryId'] = categoryId;
    }
    return this.apiClient.get<PagedResponse<Product>>('/api/products', { params });
  }

  getFeaturedProducts(page = 0, size = 8, sort = 'createdAt,desc'): Observable<PagedResponse<Product>> {
    return this.apiClient.get<PagedResponse<Product>>('/api/products/featured', {
      params: { page, size, sort }
    });
  }

  getProductDetail(id: string): Observable<Product> {
    return this.apiClient.get<Product>(`/api/products/${id}`);
  }
}
