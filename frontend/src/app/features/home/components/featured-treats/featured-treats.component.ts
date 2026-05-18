import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card.component';

type FeaturedTreat = {
  name: string;
  price: string;
  artClass: string;
};

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

      <div class="treat-grid">
        <ng-container *ngFor="let treat of treats">
          <app-product-card
            [name]="treat.name"
            [price]="treat.price"
            [artClass]="treat.artClass"
            ctaText="Add to Cart"
            ctaLink="/cart">
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
export class FeaturedTreatsComponent {
  readonly treats: FeaturedTreat[] = [
    { name: 'Mini Choco Caramel Cake', price: '$6.50', artClass: 'cake' },
    { name: 'Blueberry Crumble Muffin', price: '$3.25', artClass: 'muffin' },
    { name: 'Mini Tiramisu Cup', price: '$5.25', artClass: 'tiramisu' },
    { name: 'Fudgy Brownie Bites (2pcs)', price: '$3.75', artClass: 'brownie' },
  ];
}