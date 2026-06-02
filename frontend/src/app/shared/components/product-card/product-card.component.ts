import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../../core/models/shop.models';
import { AddCartItemRequest, DeliveryMode } from '../../../core/models/cart.models';
import { CartService } from '../../../core/services/cart.service';
import { readApiErrorMessage } from '../../../core/models/api-error.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css']
})
export class ProductCardComponent implements OnChanges {
  private readonly cartService = inject(CartService);

  @Input() product?: Product;
  @Input() fulfillmentMode: 'scheduled' | 'instant' = 'scheduled';
  @Input() name = '';
  @Input() price: string | number = '';
  @Input() artClass = '';
  @Input() imageUrl?: string;
  @Input() ctaText = 'Add to Cart';
  @Input() ctaLink = '/products';

  adding = false;
  statusMessage = '';

  ngOnChanges(): void {
    if (this.product) {
      this.name = this.product.name;
      this.price = this.product.price;
      this.imageUrl = this.product.mainImage || undefined;
      this.ctaText = 'Add to Cart';
      this.statusMessage = '';
    }
  }

  get productLink(): string {
    return this.product ? `/products/${this.product.id}` : this.ctaLink;
  }

  get cartDeliveryMode(): DeliveryMode {
    return this.fulfillmentMode === 'instant' ? 'INSTANT' : 'SCHEDULED';
  }

  get canAddToCart(): boolean {
    if (!this.product) {
      return false;
    }

    if (this.product.isAvailable === false) {
      return false;
    }

    if (this.cartDeliveryMode === 'INSTANT') {
      return this.product.instantAvailableToday && this.product.instantQuantityToday > 0;
    }

    return this.product.scheduledEligible;
  }

  addToCart(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.product || !this.canAddToCart) {
      return;
    }

    this.adding = true;
    this.statusMessage = '';

    const request: AddCartItemRequest = {
      productId: this.product.id,
      quantity: 1,
      deliveryMode: this.cartDeliveryMode
    };

    this.cartService.addItem(request).subscribe({
      next: () => {
        this.adding = false;
        this.statusMessage = 'Added to cart.';
      },
      error: (error: unknown) => {
        this.adding = false;
        this.statusMessage = readApiErrorMessage(error, 'Unable to add item to cart.');
      }
    });
  }

  getArtClass(): string {
    if (this.artClass) {
      return this.artClass;
    }
    const nameLower = this.name.toLowerCase();
    if (nameLower.includes('cake')) return 'cake';
    if (nameLower.includes('muffin')) return 'muffin';
    if (nameLower.includes('tiramisu')) return 'tiramisu';
    if (nameLower.includes('brownie') || nameLower.includes('cookie')) return 'brownie';
    return 'cake'; // fallback default
  }

  get formattedPrice(): string {
    if (typeof this.price === 'number') {
      return `$${this.price.toFixed(2)}`;
    }
    return this.price;
  }
}
