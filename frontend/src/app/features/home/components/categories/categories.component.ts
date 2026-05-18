import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.css']
})
export class CategoriesComponent {
  readonly categories = [
    { label: 'Mini Cakes', art: 'mini-cakes' },
    { label: 'Muffins', art: 'muffins' },
    { label: 'Brownies', art: 'brownies' },
    { label: 'Dessert Cups', art: 'dessert-cups' },
    { label: 'Pastries', art: 'pastries' },
    { label: 'Gift Boxes', art: 'gift-boxes' },
  ];
}

