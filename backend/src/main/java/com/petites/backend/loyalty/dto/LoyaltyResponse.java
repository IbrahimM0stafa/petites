package com.petites.backend.loyalty.dto;

public record LoyaltyResponse(
        String userId,
        int completedOrdersCount,
        int rewardOrderTarget,
        int ordersUntilNextReward,
        boolean rewardAvailable
) {
}