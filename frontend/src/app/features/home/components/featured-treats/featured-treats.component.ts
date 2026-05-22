import { CommonModule } from '@angular/common';
import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card.component';
import { ShopService } from '../../../../core/services/shop.service';
import { Product } from '../../../../core/models/shop.models';

@Component({
  selector: 'app-featured-treats',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent],
  template: `
    <section class="featured-treats" aria-labelledby="featured-treats-title">
      <h2 id="featured-treats-title" class="section-title">
        <span class="title-heart" aria-hidden="true">♥</span>
        Featured Treats
        <span class="title-heart" aria-hidden="true">♥</span>
      </h2>

      <div 
        class="treat-grid" 
        #treatCarousel
        (touchstart)="onTouchStart($event)"
        (touchend)="onTouchEnd($event)">
        <ng-container *ngFor="let treat of treats">
          <app-product-card
            [product]="treat">
          </app-product-card>
        </ng-container>
      </div>

      <div class="section-footer">
        <a class="view-all" routerLink="/shop">
          View All Treats
          <span class="button-heart" aria-hidden="true">♥</span>
        </a>
      </div>
    </section>
  `,
  styleUrls: ['./featured-treats.component.css']
})
export class FeaturedTreatsComponent implements OnInit {
  @ViewChild('treatCarousel') carousel!: ElementRef<HTMLDivElement>;
  private touchStartX: number = 0;
  private touchEndX: number = 0;

  treats: Product[] = [];

  constructor(private readonly shopService: ShopService) {}

  ngOnInit(): void {
    this.shopService.getFeaturedProducts().subscribe({
      next: (response) => {
        this.treats = response.content;
      },
      error: (err) => {
        console.error('Error fetching featured treats', err);
      }
    });
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
  }

  onTouchEnd(event: TouchEvent): void {
    this.touchEndX = event.changedTouches[0].clientX;
    this.handleSwipe();
  }

  private handleSwipe(): void {
    const swipeThreshold = 50;
    const diff = this.touchStartX - this.touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
      const scrollAmount = 300;
      if (diff > 0) {
        // Swiped left - scroll right
        this.carousel.nativeElement.scrollBy({
          left: scrollAmount,
          behavior: 'smooth'
        });
      } else {
        // Swiped right - scroll left
        this.carousel.nativeElement.scrollBy({
          left: -scrollAmount,
          behavior: 'smooth'
        });
      }
    }
  }
}