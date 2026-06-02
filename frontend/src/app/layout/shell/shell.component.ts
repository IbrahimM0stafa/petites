import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { FooterComponent } from '../footer/footer.component';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, RouterOutlet],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css'
})
export class ShellComponent implements OnInit {
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);

	ngOnInit(): void {
    this.cartService.loadCart().subscribe({ error: () => undefined });
    // Ensure a guest session exists for anonymous users (creates one if missing/expired)
    this.authService.ensureGuestSession().subscribe({ error: () => undefined });
	}
}