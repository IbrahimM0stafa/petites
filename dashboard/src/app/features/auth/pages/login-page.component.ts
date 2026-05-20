import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { hasAdminRole } from '../../../core/auth/admin-roles';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { LoginFormComponent } from '../components/login-form/login-form.component';

@Component({
	selector: 'app-login-page',
	standalone: true,
	imports: [LoginFormComponent],
	templateUrl: './login-page.component.html',
	styleUrl: './login-page.component.css'
})
export class LoginPageComponent implements OnInit {
	private readonly authState = inject(AuthStateService);
	private readonly router = inject(Router);

	ngOnInit(): void {
		if (this.authState.isAuthenticated() && hasAdminRole(this.authState.roles())) {
			void this.router.navigateByUrl('/');
		}
	}
}
