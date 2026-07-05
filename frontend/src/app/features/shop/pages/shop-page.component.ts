import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { ShopService } from '../../../core/services/shop.service';
import { Category, Product } from '../../../core/models/shop.models';

@Component({
  selector: 'app-shop-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductCardComponent],
  templateUrl: './shop-page.component.html',
  styleUrls: ['./shop-page.component.css']
})
export class ShopPageComponent implements OnInit, OnDestroy {
  isFilterOpen = false;
  priceRangeMax = 50;
  private hasPriceFilterBeenTouched = false;

  // Active / Applied filter states
  selectedCategory: Category | null = null;
  appliedPrice = 50;

  // Temp / Draft filter states (before user clicks APPLY)
  tempCategory: Category | null = null;
  tempPrice = 50;

  currentFulfillmentMode: 'scheduled' | 'instant' = 'scheduled';

  products: Product[] = [];
  categories: Category[] = [];
  
  // Search state
  searchQuery = '';
  private readonly searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  // Pagination state
  page = 0;
  size = 20;
  totalPages = 0;
  totalElements = 0;

  constructor(
    private readonly shopService: ShopService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Set up search debouncing
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      this.page = 0;
      this.loadProducts();
    });

    // 1. Load Categories
    this.shopService.getCategories().subscribe({
      next: (catResponse) => {
        const allOption: Category = { id: null as any, name: 'All', sortOrder: -1 };
        this.categories = [allOption, ...catResponse.content];

        // 2. Listen to query params for pre-selecting a category and fulfillment mode
        this.route.queryParams.subscribe((params) => {
          const categoryIdParam = params['category'];
          if (categoryIdParam) {
            const foundCat = this.categories.find(c => c.id === categoryIdParam);
            if (foundCat) {
              this.selectedCategory = foundCat;
              this.tempCategory = foundCat;
            }
          }

          const fulfillmentParam = params['fulfillment'];
          if (fulfillmentParam === 'instant' || fulfillmentParam === 'scheduled') {
            this.currentFulfillmentMode = fulfillmentParam;
          } else {
            this.currentFulfillmentMode = 'scheduled';
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

  ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  loadProducts(): void {
    const catId = this.selectedCategory && this.selectedCategory.id !== null ? this.selectedCategory.id : undefined;
    const maxPriceParam = this.hasPriceFilterBeenTouched ? this.appliedPrice : undefined;
    const searchParam = this.searchQuery.trim() !== '' ? this.searchQuery.trim() : undefined;

    this.shopService.getProducts(catId, this.currentFulfillmentMode, this.page, this.size, 'createdAt,desc', maxPriceParam, searchParam, true).subscribe({
      next: (prodResponse) => {
        this.products = prodResponse.content;
        this.syncPriceRangeDefaults();
        // Normalize pagination information from backend. Some APIs return totals
        // at the top-level (totalPages/totalElements) while others nest under
        // a `page` object ({ number, size, totalElements, totalPages }).
        const pageObj = (prodResponse as any).page ?? null;
        // serverPageNumber: prefer server-provided page index if present
        const serverPageNumber = pageObj?.number ?? (prodResponse as any).number ?? null;
        const serverTotalPages = (prodResponse as any).totalPages ?? pageObj?.totalPages ?? 0;
        const serverTotalElements = (prodResponse as any).totalElements ?? pageObj?.totalElements ?? 0;

        this.totalPages = serverTotalPages;
        this.totalElements = serverTotalElements;

        if (serverPageNumber !== null && serverPageNumber !== undefined) {
          this.page = serverPageNumber;
        }
      },
      error: (err) => {
        console.error('Error loading products', err);
      }
    });
  }

  changeFulfillmentMode(mode: 'scheduled' | 'instant'): void {
    if (this.currentFulfillmentMode !== mode) {
      this.currentFulfillmentMode = mode;
      this.page = 0; // Reset page on mode change
      this.loadProducts();
    }
  }

  get filteredProducts(): Product[] {
    // The backend now handles the filtering for available and price range.
    return this.products;
  }

  private syncPriceRangeDefaults(): void {
    if (!this.hasPriceFilterBeenTouched) {
      const highestProductPrice = this.products.reduce((max, product) => Math.max(max, product.price ?? 0), 50);
      this.priceRangeMax = Math.max(50, highestProductPrice);
      this.appliedPrice = this.priceRangeMax;
      this.tempPrice = this.priceRangeMax;
    }
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
    this.hasPriceFilterBeenTouched = true;
  }

  applyFilters(): void {
    this.selectedCategory = this.tempCategory;
    this.appliedPrice = this.tempPrice;

    if (this.appliedPrice >= this.priceRangeMax) {
      this.hasPriceFilterBeenTouched = false;
    } else {
      this.hasPriceFilterBeenTouched = true;
    }

    this.isFilterOpen = false;
    // Reset to first page when filters change
    this.page = 0;
    this.loadProducts();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value;
    this.searchSubject.next(this.searchQuery);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchSubject.next('');
  }

  goToPage(pageNum: number): void {
    if (pageNum < 0 || (this.totalPages && pageNum >= this.totalPages)) return;
    this.page = pageNum;
    this.loadProducts();
  }

  nextPage(): void {
    if (this.page + 1 < this.totalPages) {
      this.page += 1;
      this.loadProducts();
    }
  }

  prevPage(): void {
    if (this.page > 0) {
      this.page -= 1;
      this.loadProducts();
    }
  }
}
