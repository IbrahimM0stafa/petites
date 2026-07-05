import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { CartService } from '../../core/services/cart.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { SOCIAL_LINKS } from '../../core/constants/social-links';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  readonly socialLinks = SOCIAL_LINKS;

  constructor(
    readonly authState: AuthStateService,
    readonly cartService: CartService
  ) {}

  menuOpen = false;
  isScrolled = false;

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.isScrolled = window.scrollY > 12;
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }
}