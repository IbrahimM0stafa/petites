import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { readApiErrorMessage } from '../../../core/models/api-error.model';
import { DeliveryMode, OrderResponse, OrderStatus, OrderType } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';
import { formatAddressShort } from '../../../core/models/address.model';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './orders-list.component.html',
  styleUrl: './orders-list.component.css'
})
export class OrdersListComponent implements OnInit {
  private readonly orderService = inject(OrderService);

  orders: OrderResponse[] = [];
  loading = true;
  error = '';
  page = 0;
  size = 10;
  totalPages = 0;
  totalElements = 0;
  selectedStatus: OrderStatus | '' = '';
  selectedOrderType: OrderType | '' = '';
  selectedDeliveryMode: DeliveryMode | '' = '';
  scheduledDateFilter = '';
  placedDateFilter = '';
  orderNumberFilter = '';
  sort = 'createdAt,desc';

  readonly statusOptions: Array<{ value: OrderStatus | ''; label: string }> = [
	{ value: '', label: 'All statuses' },
	{ value: 'PENDING', label: 'Pending' },
	{ value: 'CONFIRMED', label: 'Confirmed' },
	{ value: 'IN_PREPARATION', label: 'In preparation' },
	{ value: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
	{ value: 'READY_FOR_PICKUP', label: 'Ready for pickup' },
	{ value: 'DELIVERED', label: 'Delivered' },
	{ value: 'COMPLETED', label: 'Completed' },
	{ value: 'CANCELLED', label: 'Cancelled' }
  ];

  readonly orderTypeOptions: Array<{ value: OrderType | ''; label: string }> = [
  { value: '', label: 'All types' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'PICKUP', label: 'Pickup' }
  ];

  readonly deliveryModeOptions: Array<{ value: DeliveryMode | ''; label: string }> = [
  { value: '', label: 'All delivery modes' },
  { value: 'INSTANT', label: 'Instant' },
  { value: 'SCHEDULED', label: 'Scheduled' }
  ];

  readonly sortOptions = [
	{ value: 'createdAt,desc', label: 'Newest first' },
	{ value: 'createdAt,asc', label: 'Oldest first' },
	{ value: 'scheduledDate,asc', label: 'Scheduled date, earliest first' },
	{ value: 'scheduledDate,desc', label: 'Scheduled date, latest first' },
	{ value: 'totalAmount,desc', label: 'Highest total first' },
	{ value: 'totalAmount,asc', label: 'Lowest total first' }
  ];

  ngOnInit(): void {
    this.loadOrders();
  }

  // expose formatter to template
  formatAddressShort = formatAddressShort;

  loadOrders(): void {
    this.loading = true;
    this.error = '';

    this.orderService.listAdminOrders({
		page: this.page,
		size: this.size,
		sort: this.sort,
		status: this.selectedStatus,
      orderType: this.selectedOrderType,
    deliveryMode: this.selectedDeliveryMode,
		scheduledDate: this.scheduledDateFilter || undefined,
      placedDate: this.placedDateFilter || undefined,
      orderNumber: this.orderNumberFilter || undefined
	}).subscribe({
      next: (response) => {
        this.orders = response.content;
        this.applyPaginationMeta(response as {
      totalPages?: number;
      totalElements?: number;
      size?: number;
      number?: number;
      page?: {
        totalPages?: number;
        totalElements?: number;
        size?: number;
        number?: number;
      };
      meta?: {
        totalPages?: number;
        totalElements?: number;
        size?: number;
        number?: number;
        total?: number;
        totalCount?: number;
        total_pages?: number;
      };
      total?: number;
      totalCount?: number;
      total_pages?: number;
    });
        this.loading = false;
      },
      error: (err) => {
        this.error = readApiErrorMessage(err, 'Failed to load orders.');
        this.loading = false;
      }
    });
  }

  onFilterChange(): void {
	this.page = 0;
	this.loadOrders();
  }

  clearFilters(): void {
	this.selectedStatus = '';
  this.selectedOrderType = '';
  this.selectedDeliveryMode = '';
	this.scheduledDateFilter = '';
  this.placedDateFilter = '';
  this.orderNumberFilter = '';
	this.sort = 'createdAt,desc';
	this.page = 0;
	this.loadOrders();
  }

  setPage(pageIndex: number): void {
	if (pageIndex < 0 || pageIndex >= this.totalPages || pageIndex === this.page) {
		return;
	}

	this.page = pageIndex;
	this.loadOrders();
  }

  mathMin(a: number, b: number): number {
	return Math.min(a, b);
  }

  private applyPaginationMeta(meta: {
    totalPages?: number;
    totalElements?: number;
    size?: number;
    number?: number;
    page?: {
      totalPages?: number;
      totalElements?: number;
      size?: number;
      number?: number;
    };
    meta?: {
      totalPages?: number;
      totalElements?: number;
      size?: number;
      number?: number;
      total?: number;
      totalCount?: number;
      total_pages?: number;
    };
    total?: number;
    totalCount?: number;
    total_pages?: number;
  }): void {
  const pageMeta = meta.page ?? {};
  const altMeta = meta.meta ?? {};
  const totalElements =
    meta.totalElements ??
    meta.total ??
    meta.totalCount ??
    pageMeta.totalElements ??
    altMeta.totalElements ??
    altMeta.total ??
    altMeta.totalCount ??
    0;
  const size = meta.size ?? pageMeta.size ?? altMeta.size ?? this.size;
  const totalPages =
    meta.totalPages ??
    meta.total_pages ??
    pageMeta.totalPages ??
    altMeta.totalPages ??
    altMeta.total_pages ??
    (size ? Math.ceil(totalElements / size) : 0);
  const pageNumber = meta.number ?? pageMeta.number ?? altMeta.number;

  this.totalElements = totalElements;
  this.totalPages = totalPages;
  this.size = size;
  if (pageNumber !== undefined) {
    this.page = pageNumber;
  }
  }

  statusClass(status: OrderStatus): string {
    const normalized = status.toLowerCase().replace(/_/g, '-');
    return `status-badge status-${normalized}`;
  }
}
