import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
	selector: 'app-overview',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './overview.component.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	styleUrl: './overview.component.css'
})
export class OverviewComponent {}
