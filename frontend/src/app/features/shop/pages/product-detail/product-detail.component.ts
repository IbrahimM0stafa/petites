import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ShopService } from '../../../../core/services/shop.service';
import { Product } from '../../../../core/models/shop.models';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css']
})
export class ProductDetailComponent implements OnInit {
  product?: Product;
  activeImage = '';
  quantity = 1;
  isLoading = true;
  errorMessage = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly shopService: ShopService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        this.loadProduct(idParam);
      }
    });
  }

  loadProduct(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.shopService.getProductDetail(id).subscribe({
      next: (product) => {
        this.product = product;
        this.activeImage = product.mainImage || '';
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading product details', err);
        this.errorMessage = 'Could not load product details. Please try again.';
        this.isLoading = false;
      }
    });
  }

  setActiveImage(url: string): void {
    this.activeImage = url;
  }

  resetActiveImage(): void {
    this.activeImage = this.product?.mainImage || '';
  }

  isMainImageActive(): boolean {
    return !!this.product?.mainImage && this.activeImage === this.product.mainImage;
  }

  incrementQuantity(): void {
    this.quantity++;
  }

  decrementQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  getArtClass(): string {
    if (!this.product) return '';
    const nameLower = this.product.name.toLowerCase();
    if (nameLower.includes('cake')) return 'cake';
    if (nameLower.includes('muffin')) return 'muffin';
    if (nameLower.includes('tiramisu')) return 'tiramisu';
    if (nameLower.includes('brownie') || nameLower.includes('cookie')) return 'brownie';
    return 'cake';
  }

  addToCart(): void {
    if (!this.product) return;
    alert(`Added ${this.quantity} x ${this.product.name} to cart! (Demo)`);
  }
}
