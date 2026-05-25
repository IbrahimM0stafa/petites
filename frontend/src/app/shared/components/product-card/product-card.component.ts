import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../../core/models/shop.models';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css']
})
export class ProductCardComponent implements OnChanges {
  @Input() product?: Product;
  @Input() fulfillmentMode: 'scheduled' | 'instant' = 'scheduled';
  @Input() name = '';
  @Input() price: string | number = '';
  @Input() artClass = '';
  @Input() imageUrl?: string;
  @Input() ctaText = 'Add to Cart';
  @Input() ctaLink = '/cart';

  ngOnChanges(): void {
    if (this.product) {
      this.name = this.product.name;
      this.price = this.product.price;
      this.imageUrl = this.product.mainImage || undefined;
      this.ctaLink = '/cart';
      this.ctaText = 'Add to Cart';
    }
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
