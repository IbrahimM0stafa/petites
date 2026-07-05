import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { LoyaltyService } from '../../../../core/services/loyalty.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { LoyaltyResponse } from '../../../../core/models/loyalty.models';

@Component({
	selector: 'app-loyalty-promo',
	standalone: true,
	imports: [CommonModule, RouterLink],
	templateUrl: './loyalty-promo.component.html',
	styleUrl: './loyalty-promo.component.css'
})
export class LoyaltyPromoComponent implements OnInit {
	private readonly loyaltyService = inject(LoyaltyService);
	readonly authState = inject(AuthStateService);

	loyalty: LoyaltyResponse | null = null;
	loading = false;

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

	get targetStamps(): number[] {
		const target = this.loyalty?.rewardOrderTarget || 5;
		return Array.from({ length: target }, (_, i) => i + 1);
	}

	ngOnInit(): void {
		if (this.authState.isAuthenticated()) {
			this.loading = true;
			this.loyaltyService.getMyLoyalty().subscribe({
				next: (loyalty) => {
					this.loyalty = loyalty;
					this.loading = false;
				},
				error: () => {
					this.loading = false;
				}
			});
		}
	}
}
