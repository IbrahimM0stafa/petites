export interface LoyaltyResponse {
  userId: string;
  completedOrdersCount: number;
  rewardOrderTarget: number;
  ordersUntilNextReward: number;
  rewardAvailable: boolean;
  rewardProductId?: string | null;
  rewardProductName?: string | null;
  rewardProductImage?: string | null;
}
