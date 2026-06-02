import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from './api-client.service';
import { DeliveryMode, OrderResponse, OrderStatus, OrderType } from '../models/order.model';
import { PaginatedResponse } from '../models/paginated-response.model';

export interface AdminOrderListFilters {
  page?: number;
  size?: number;
  sort?: string;
  status?: OrderStatus | '';
  orderType?: OrderType | '';
  deliveryMode?: DeliveryMode | '';
  scheduledDate?: string;
  placedDate?: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private apiClient = inject(ApiClientService);

  listAdminOrders(filters: AdminOrderListFilters = {}): Observable<PaginatedResponse<OrderResponse>> {
    let params = new HttpParams();

    if (filters.page !== undefined) params = params.set('page', `${filters.page}`);
    if (filters.size !== undefined) params = params.set('size', `${filters.size}`);
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.orderType) params = params.set('orderType', filters.orderType);
    if (filters.deliveryMode) params = params.set('deliveryMode', filters.deliveryMode);
    if (filters.scheduledDate) params = params.set('scheduledDate', filters.scheduledDate);
    if (filters.placedDate) params = params.set('placedDate', filters.placedDate);

    return this.apiClient.get<PaginatedResponse<OrderResponse>>('/api/admin/orders', { params });
  }

  getAdminOrder(id: string): Observable<OrderResponse> {
    return this.apiClient.get<OrderResponse>(`/api/admin/orders/${id}`);
  }

  updateOrderStatus(id: string, status: OrderStatus): Observable<OrderResponse> {
    return this.apiClient.put<OrderResponse>(`/api/orders/${id}/status`, { status });
  }
}
