import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { readApiErrorMessage } from '../../../core/models/api-error.model';
import { OrderResponse, OrderStatus } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';
import { formatAddressShort, formatAddressLine2 } from '../../../core/models/address.model';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.css'
})
export class OrderDetailComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly route = inject(ActivatedRoute);

  order: OrderResponse | null = null;
  loading = true;
  error = '';
  actionLoading = false;
  selectedStatus: OrderStatus | '' = '';

  readonly statuses: OrderStatus[] = [
    'PENDING',
    'CONFIRMED',
    'IN_PREPARATION',
    'OUT_FOR_DELIVERY',
    'READY_FOR_PICKUP',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED'
  ];

  // expose formatter to template
  formatAddressShort = formatAddressShort;
  formatAddressLine2 = formatAddressLine2;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Order not found.';
      this.loading = false;
      return;
    }

    this.loadOrder(id);
  }

  loadOrder(id: string): void {
    this.loading = true;
    this.error = '';

    this.orderService.getAdminOrder(id).subscribe({
      next: (order) => {
        this.order = order;
        this.selectedStatus = order.status;
        this.loading = false;
      },
      error: (err) => {
        this.error = readApiErrorMessage(err, 'Failed to load order.');
        this.loading = false;
      }
    });
  }

  updateStatus(): void {
    if (!this.order || !this.selectedStatus) {
      return;
    }

    if (this.selectedStatus === this.order.status) {
      return;
    }

    this.actionLoading = true;
    this.error = '';

    this.orderService.updateOrderStatus(this.order.orderId, this.selectedStatus).subscribe({
      next: (order) => {
        this.order = { ...this.order!, ...order, status: order.status };
        this.selectedStatus = order.status;
        this.actionLoading = false;
      },
      error: (err) => {
        this.error = readApiErrorMessage(err, 'Failed to update order status.');
        this.actionLoading = false;
      }
    });
  }
}
