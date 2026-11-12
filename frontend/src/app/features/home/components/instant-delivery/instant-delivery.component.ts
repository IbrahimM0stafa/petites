import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { RouterLink } from '@angular/router';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card.component';
import { ShopService } from '../../../../core/services/shop.service';
import { Product } from '../../../../core/models/shop.models';

@Component({
  selector: 'app-instant-delivery',
  standalone: true,
  imports: [RouterLink, ProductCardComponent],
  templateUrl: './instant-delivery.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./instant-delivery.component.css']
})
export class InstantDeliveryComponent implements OnInit {
  products: Product[] = [];
  loading = true;

  constructor(private readonly shopService: ShopService) {}

  ngOnInit(): void {
    this.shopService.getProducts(undefined, 'instant', 0, 4).subscribe({
      next: (response) => {
        this.products = response.content || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching instant delivery products', err);
        this.loading = false;
      }
    });
  }
}
