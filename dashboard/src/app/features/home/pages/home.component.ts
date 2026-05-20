import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HeroComponent } from '../components/hero/hero.component';
import { CategoriesComponent } from '../components/categories/categories.component';
import { FeaturedTreatsComponent } from '../components/featured-treats/featured-treats.component';
import { HomeInfoPanelComponent } from '../components/home-info-panel/home-info-panel.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HeroComponent, CategoriesComponent, FeaturedTreatsComponent, HomeInfoPanelComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {}
