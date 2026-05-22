import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { readApiErrorMessage } from '../../../core/models/api-error.model';
import { Category } from '../../../core/models/category.model';
import { CategoryService } from '../../../core/services/category.service';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './category-list.component.html',
  styleUrl: './category-list.component.css'
})
export class CategoryListComponent implements OnInit {
  private readonly categoryService = inject(CategoryService);

  categories: Category[] = [];
  loading = true;
  error = '';

  // Pagination state
  page = 0;
  size = 10;
  totalPages = 0;
  totalElements = 0;

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading = true;
    this.error = '';

    this.categoryService.list(this.page, this.size).subscribe({
      next: (res) => {
        this.categories = res.content;
        this.totalPages = res.totalPages;
        this.totalElements = res.totalElements;
        this.loading = false;
      },
      error: (err) => {
        this.error = readApiErrorMessage(err, 'Failed to load categories.');
        this.loading = false;
      }
    });
  }

  onDelete(id: string): void {
    if (confirm('Are you sure you want to delete this category? This operation will fail if it contains products.')) {
      this.categoryService.delete(id).subscribe({
        next: () => {
          this.loadCategories();
        },
        error: (err) => {
          alert(readApiErrorMessage(err, 'Failed to delete category.'));
        }
      });
    }
  }

  setPage(pageIndex: number): void {
    if (pageIndex >= 0 && pageIndex < this.totalPages) {
      this.page = pageIndex;
      this.loadCategories();
    }
  }

  mathMin(a: number, b: number): number {
    return Math.min(a, b);
  }
}
