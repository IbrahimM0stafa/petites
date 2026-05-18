import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css']
})
export class ProductCardComponent {
  @Input() name = '';
  @Input() price = '';
  @Input() artClass = '';
  @Input() ctaText = 'Add to Cart';
  @Input() ctaLink = '/cart';
}
