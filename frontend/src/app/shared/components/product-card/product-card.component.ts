import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../../core/models/shop.models';
import { AddCartItemRequest, DeliveryMode } from '../../../core/models/cart.models';
import { CartService } from '../../../core/services/cart.service';
import { readApiErrorMessage } from '../../../core/models/api-error.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './product-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./product-card.component.css']
})
export class ProductCardComponent {
  private readonly cartService = inject(CartService);

  readonly product = input<Product | undefined>(undefined);
  readonly fulfillmentMode = input<'scheduled' | 'instant'>('scheduled');
  readonly name = input<string>('');
  readonly price = input<string | number>('');
  readonly artClass = input<string>('');
  readonly imageUrl = input<string | undefined>(undefined);
  readonly ctaText = input<string>('Add to Cart');
  readonly ctaLink = input<string>('/products');

  adding = false;
  statusMessage = '';

  readonly displayName = computed(() => this.product()?.name ?? this.name());
  readonly displayImageUrl = computed(() => this.product()?.mainImage || this.imageUrl());

  readonly productLink = computed(() => (this.product() ? `/products/${this.product()!.id}` : this.ctaLink()));

  readonly cartDeliveryMode = computed<DeliveryMode>(() => (this.fulfillmentMode() === 'instant' ? 'INSTANT' : 'SCHEDULED'));

  readonly canAddToCart = computed<boolean>(() => {
    const prod = this.product();
    if (!prod) {
      return false;
    }

    if (prod.isAvailable === false) {
      return false;
    }

    if (this.cartDeliveryMode() === 'INSTANT') {
      return Boolean(prod.instantAvailableToday && prod.instantQuantityToday > 0);
    }

    return Boolean(prod.scheduledEligible);
  });

  readonly formattedPrice = computed<string>(() => {
    const rawPrice = this.product()?.price ?? this.price();
    if (typeof rawPrice === 'number') {
      return `EGP ${rawPrice.toFixed(2)}`;
    }
    return String(rawPrice ?? '');
  });

  readonly computedArtClass = computed<string>(() => {
    const explicitClass = this.artClass();
    if (explicitClass) {
      return explicitClass;
    }
    const nameLower = (this.displayName() || '').toLowerCase();
    if (nameLower.includes('cake')) return 'cake';
    if (nameLower.includes('muffin')) return 'muffin';
    if (nameLower.includes('tiramisu')) return 'tiramisu';
    if (nameLower.includes('brownie') || nameLower.includes('cookie')) return 'brownie';
    return 'cake';
  });

  addToCart(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const prod = this.product();
    if (!prod || !this.canAddToCart()) {
      return;
    }

    this.adding = true;
    this.statusMessage = '';

    const request: AddCartItemRequest = {
      productId: prod.id,
      quantity: 1,
      deliveryMode: this.cartDeliveryMode()
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
}
