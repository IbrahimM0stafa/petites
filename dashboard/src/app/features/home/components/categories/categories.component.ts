import { AfterViewInit, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.css']
})
export class CategoriesComponent implements AfterViewInit {
  readonly categories = [
    { label: 'Mini Cakes', art: 'mini-cakes' },
    { label: 'Muffins', art: 'muffins' },
    { label: 'Brownies', art: 'brownies' },
    { label: 'Dessert Cups', art: 'dessert-cups' },
    { label: 'Pastries', art: 'pastries' },
    { label: 'Gift Boxes', art: 'gift-boxes' },
  ];
  @ViewChild('categoriesContainer', { static: false }) categoriesContainer?: ElementRef<HTMLDivElement>;

  pages: number[] = [];
  activePage = 0;
  canScrollLeft = false;
  canScrollRight = false;

  private readonly mobileBreakpoint = 560;
  private readonly visibleCardsMobile = 3;

  ngAfterViewInit(): void {
    this.computePagination();
    this.onCategoriesScroll();
  }

  private getCardStep(): number {
    const el = this.categoriesContainer?.nativeElement;
    if (!el) return 0;

    const firstCard = el.querySelector<HTMLElement>('.category');
    const styles = getComputedStyle(el);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0;

    if (firstCard) {
      return firstCard.getBoundingClientRect().width + gap;
    }

    return el.clientWidth;
  }

  private computePagination(): void {
    const isMobile = window.innerWidth <= this.mobileBreakpoint;

    if (!isMobile) {
      this.pages = [];
      this.activePage = 0;
      this.canScrollLeft = false;
      this.canScrollRight = false;
      return;
    }

    const maxStartIndex = Math.max(0, this.categories.length - this.visibleCardsMobile);
    this.pages = Array.from({ length: maxStartIndex + 1 }, (_, i) => i);
    this.activePage = Math.min(this.activePage, this.pages.length - 1);
  }

  onCategoriesScroll(): void {
    const el = this.categoriesContainer?.nativeElement;
    if (!el || this.pages.length === 0) return;

    const step = this.getCardStep();
    if (!step) return;

    const currentPage = Math.round(el.scrollLeft / step);
    this.activePage = Math.min(Math.max(currentPage, 0), this.pages.length - 1);

    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    this.canScrollLeft = el.scrollLeft > 4;
    this.canScrollRight = el.scrollLeft < maxScrollLeft - 4;
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.computePagination();
    this.onCategoriesScroll();
  }

  scrollToPage(idx: number) {
    const el = this.categoriesContainer?.nativeElement;
    if (!el) return;
    const left = idx * this.getCardStep();
    el.scrollTo({ left, behavior: 'smooth' });
  }
}

