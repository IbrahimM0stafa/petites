import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { LoyaltyResponse } from '../../../core/models/loyalty.models';
import { LoyaltyService } from '../../../core/services/loyalty.service';
import { AuthStateService } from '../../../core/services/auth-state.service';

@Component({
	selector: 'app-loyalty-page',
	standalone: true,
	imports: [CommonModule, RouterLink],
	templateUrl: './loyalty-page.component.html',
	styleUrl: './loyalty-page.component.css'
})
export class LoyaltyPageComponent implements OnInit {
	private readonly loyaltyService = inject(LoyaltyService);
	readonly authState = inject(AuthStateService);

	loyalty: LoyaltyResponse | null = null;
	loading = true;
	error = '';

	get targetStamps(): number[] {
		const target = this.loyalty?.rewardOrderTarget || 5;
		return Array.from({ length: target }, (_, i) => i + 1);
	}

	get completedCount(): number {
		if (!this.loyalty) {
			return 0;
		}
		if (this.loyalty.rewardAvailable) {
			return this.loyalty.rewardOrderTarget;
		}
		const progress = this.loyalty.rewardOrderTarget - this.loyalty.ordersUntilNextReward;
		return Math.max(0, Math.min(progress, this.loyalty.rewardOrderTarget));
	}

	ngOnInit(): void {
		this.loadLoyalty();
	}

	loadLoyalty(): void {
		if (!this.authState.isAuthenticated()) {
			this.loading = false;
			return;
		}

		this.loading = true;
		this.error = '';
		this.loyaltyService.getMyLoyalty().subscribe({
			next: (loyalty) => {
				this.loyalty = loyalty;
				this.loading = false;
			},
			error: (err) => {
				this.error = 'Failed to load your loyalty details. Please try again.';
				this.loading = false;
			}
		});
	}
}
