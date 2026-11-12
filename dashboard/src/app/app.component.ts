import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [RouterOutlet],
	template: '<router-outlet />',
	changeDetection: ChangeDetectionStrategy.Eager,
	styleUrl: './app.component.css'
})
export class AppComponent {}
