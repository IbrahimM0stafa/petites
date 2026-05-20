import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { AuthStateService } from '../../core/services/auth-state.service';
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
	private readonly authService = inject(AuthService);
	private readonly authState = inject(AuthStateService);

	ngOnInit(): void {
		if (!this.authState.isAuthenticated()) {
			this.authService.ensureGuestSession().subscribe({ error: () => undefined });
		}
	}
}