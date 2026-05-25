export interface LoyaltyResponse {
	userId: string;
	completedOrdersCount: number;
	rewardOrderTarget: number;
	ordersUntilNextReward: number;
	rewardAvailable: boolean;
}