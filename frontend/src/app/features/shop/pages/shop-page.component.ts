import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { ShopService } from '../../../core/services/shop.service';
import { Category, Product } from '../../../core/models/shop.models';

@Component({
  selector: 'app-shop-page',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  templateUrl: './shop-page.component.html',
  styleUrls: ['./shop-page.component.css']
})
export class ShopPageComponent implements OnInit {
  isFilterOpen = false;

  // Active / Applied filter states
  selectedCategory: Category | null = null;
  appliedPrice = 50;

  // Temp / Draft filter states (before user clicks APPLY)
  tempCategory: Category | null = null;
  tempPrice = 50;

  products: Product[] = [];
  categories: Category[] = [];

  constructor(
    private readonly shopService: ShopService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // 1. Load Categories
    this.shopService.getCategories().subscribe({
      next: (catResponse) => {
        const allOption: Category = { id: null as any, name: 'All', sortOrder: -1 };
        this.categories = [allOption, ...catResponse.content];

        // 2. Listen to query params for pre-selecting a category
        this.route.queryParams.subscribe((params) => {
          const categoryIdParam = params['category'];
          if (categoryIdParam) {
            const foundCat = this.categories.find(c => c.id === categoryIdParam);
            if (foundCat) {
              this.selectedCategory = foundCat;
              this.tempCategory = foundCat;
            }
          }
          this.loadProducts();
        });
      },
      error: (err) => {
        console.error('Error loading categories', err);
        this.loadProducts(); // fallback to load products anyway
      }
    });
  }

  loadProducts(): void {
    const catId = this.selectedCategory && this.selectedCategory.id !== null ? this.selectedCategory.id : undefined;
    this.shopService.getProducts(catId).subscribe({
      next: (prodResponse) => {
        this.products = prodResponse.content;
      },
      error: (err) => {
        console.error('Error loading products', err);
      }
    });
  }

  get filteredProducts(): Product[] {
    return this.products.filter((p) => {
      // Client-side Price Filter
      return p.price <= this.appliedPrice;
    });
  }

  toggleFilters(): void {
    this.isFilterOpen = !this.isFilterOpen;
    if (this.isFilterOpen) {
      // Synchronize temporary state to applied state when opening drawer
      this.tempCategory = this.selectedCategory;
      this.tempPrice = this.appliedPrice;
    }
  }

  selectCategoryDraft(category: Category): void {
    this.tempCategory = category;
  }

  onPriceChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.tempPrice = parseFloat(target.value);
  }

  applyFilters(): void {
    this.selectedCategory = this.tempCategory;
    this.appliedPrice = this.tempPrice;
    this.isFilterOpen = false;
    this.loadProducts(); // Load new products from the backend for the newly selected category
  }
}
