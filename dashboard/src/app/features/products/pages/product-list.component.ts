import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { readApiErrorMessage } from '../../../core/models/api-error.model';
import { Category } from '../../../core/models/category.model';
import { Product } from '../../../core/models/product.model';
import { CategoryService } from '../../../core/services/category.service';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.css'
})
export class ProductListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);

  products: Product[] = [];
  categories: Category[] = [];
  loading = true;
  error = '';

  // Pagination & Filtering state
  page = 0;
  size = 10;
  totalPages = 0;
  totalElements = 0;
  
  // Filters
  selectedCategoryId = '';
  selectedAvailability = ''; // '', 'true', 'false'

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  loadCategories(): void {
    // Load categories for the filter dropdown
    this.categoryService.list(0, 100).subscribe({
      next: (res) => {
        this.categories = res.content;
      },
      error: () => {
        // Silently fail or log, non-blocking for product listing
      }
    });
  }

  loadProducts(): void {
    this.loading = true;
    this.error = '';

    const filters: {
      categoryId?: string;
      available?: boolean;
      page: number;
      size: number;
      sort: string;
    } = {
      page: this.page,
      size: this.size,
      sort: 'createdAt,desc'
    };

    if (this.selectedCategoryId) {
      filters.categoryId = this.selectedCategoryId;
    }

    if (this.selectedAvailability !== '') {
      filters.available = this.selectedAvailability === 'true';
    }

    this.productService.list(filters).subscribe({
      next: (res) => {
        this.products = res.content;
        this.totalPages = res.totalPages;
        this.totalElements = res.totalElements;
        this.loading = false;
      },
      error: (err) => {
        this.error = readApiErrorMessage(err, 'Failed to load products.');
        this.loading = false;
      }
    });
  }

  onFilterChange(): void {
    this.page = 0; // reset to first page when filter changes
    this.loadProducts();
  }

  onDelete(id: string): void {
    if (confirm('Are you sure you want to delete this product? All its images will be automatically removed from Cloudinary.')) {
      this.productService.delete(id).subscribe({
        next: () => {
          this.loadProducts();
        },
        error: (err) => {
          alert(readApiErrorMessage(err, 'Failed to delete product.'));
        }
      });
    }
  }

  setPage(pageIndex: number): void {
    if (pageIndex >= 0 && pageIndex < this.totalPages) {
      this.page = pageIndex;
      this.loadProducts();
    }
  }

  mathMin(a: number, b: number): number {
    return Math.min(a, b);
  }
}
