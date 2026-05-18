import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HeroComponent } from '../components/hero/hero.component';
import { CategoriesComponent } from '../components/categories/categories.component';
import { FeaturedTreatsComponent } from '../components/featured-treats/featured-treats.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HeroComponent, CategoriesComponent, FeaturedTreatsComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {}
