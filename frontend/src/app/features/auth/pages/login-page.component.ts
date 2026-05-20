import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { LoginFormComponent } from '../components/login-form/login-form.component';

@Component({
	selector: 'app-login-page',
	standalone: true,
	imports: [CommonModule, LoginFormComponent],
	templateUrl: './login-page.component.html',
	styleUrl: './login-page.component.css'
})
export class LoginPageComponent {}