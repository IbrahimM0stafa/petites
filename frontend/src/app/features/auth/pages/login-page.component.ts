
import { Component, ChangeDetectionStrategy } from '@angular/core';

import { LoginFormComponent } from '../components/login-form/login-form.component';

@Component({
	selector: 'app-login-page',
	standalone: true,
	imports: [LoginFormComponent],
	templateUrl: './login-page.component.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	styleUrl: './login-page.component.css'
})
export class LoginPageComponent {}