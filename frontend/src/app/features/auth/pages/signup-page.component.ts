
import { Component, ChangeDetectionStrategy } from '@angular/core';

import { SignupFormComponent } from '../components/signup-form/signup-form.component';

@Component({
	selector: 'app-signup-page',
	standalone: true,
	imports: [SignupFormComponent],
	templateUrl: './signup-page.component.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	styleUrl: './signup-page.component.css'
})
export class SignupPageComponent {}