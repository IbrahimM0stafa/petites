import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HeroComponent } from '../components/hero/hero.component';
import { InstantDeliveryComponent } from '../components/instant-delivery/instant-delivery.component';
import { CategoriesComponent } from '../components/categories/categories.component';
import { FeaturedTreatsComponent } from '../components/featured-treats/featured-treats.component';
import { HomeInfoPanelComponent } from '../components/home-info-panel/home-info-panel.component';
import { LoyaltyPromoComponent } from '../components/loyalty-promo/loyalty-promo.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    HeroComponent,
    InstantDeliveryComponent,
    CategoriesComponent,
    FeaturedTreatsComponent,
    HomeInfoPanelComponent,
    LoyaltyPromoComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {}
