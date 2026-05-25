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
    size: number = 20
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

    return this.http.get<any>(`/api/products`, { params });
  }
}
