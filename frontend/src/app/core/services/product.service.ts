import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);

  getProducts(
    categoryId?: string,
    fulfillmentMode?: 'scheduled' | 'instant',
    page: number = 0,
    size: number = 20,
    maxPrice?: number,
    search?: string,
    available?: boolean
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (categoryId) {
      params = params.set('categoryId', categoryId);
    }
    if (fulfillmentMode) {
      params = params.set('fulfillmentMode', fulfillmentMode);
    }
    if (maxPrice !== undefined && maxPrice !== null) {
      params = params.set('maxPrice', maxPrice.toString());
    }
    if (search !== undefined && search !== null && search.trim() !== '') {
      params = params.set('search', search);
    }
    if (available !== undefined && available !== null) {
      params = params.set('available', available.toString());
    }

    return this.http.get<any>(`/api/products`, { params });
  }
}
