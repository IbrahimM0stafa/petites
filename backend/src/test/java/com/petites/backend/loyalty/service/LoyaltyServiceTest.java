package com.petites.backend.loyalty.service;

import com.petites.backend.loyalty.dto.LoyaltyResponse;
import com.petites.backend.products.service.ProductService;
import com.petites.backend.settings.service.SettingService;
import com.petites.backend.users.entity.User;
import com.petites.backend.users.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LoyaltyServiceTest {

    @Mock
    private UserService userService;

    @Mock
    private SettingService settingService;

    @Mock
    private ProductService productService;

    @InjectMocks
    private LoyaltyService loyaltyService;

    @Test
    void testRewardAvailableWhenCompletedExceedsTargetAndNotYetRedeemed() {
        User user = new User();
        user.setCompletedOrdersCount(6);
        user.setRewardsRedeemedCount(0);

        when(userService.findById("user-1")).thenReturn(Optional.of(user));
        when(settingService.getSetting("reward_order_target", "5")).thenReturn("5");
        when(settingService.getSetting("reward_product_id", "")).thenReturn("");

        LoyaltyResponse status = loyaltyService.getMyStatus("user-1");

        assertTrue(status.rewardAvailable(), "Reward should remain available when completed orders (6) exceeds target (5)");
        assertEquals(0, status.ordersUntilNextReward(), "When reward is available, ordersUntilNextReward should be 0");
    }

    @Test
    void testRewardNotAvailableWhenAlreadyRedeemed() {
        User user = new User();
        user.setCompletedOrdersCount(6);
        user.setRewardsRedeemedCount(1);

        when(userService.findById("user-1")).thenReturn(Optional.of(user));
        when(settingService.getSetting("reward_order_target", "5")).thenReturn("5");
        when(settingService.getSetting("reward_product_id", "")).thenReturn("");

        LoyaltyResponse status = loyaltyService.getMyStatus("user-1");

        assertFalse(status.rewardAvailable(), "Reward should not be available when completed/target equals redeemed count");
        assertEquals(4, status.ordersUntilNextReward(), "Customer at 6 orders with 1 redeemed needs 4 more orders to reach 10");
    }

    @Test
    void testNewCustomerWithZeroOrdersRequiresFullTarget() {
        User user = new User();
        user.setCompletedOrdersCount(0);
        user.setRewardsRedeemedCount(0);

        when(userService.findById("user-new")).thenReturn(Optional.of(user));
        when(settingService.getSetting("reward_order_target", "5")).thenReturn("5");
        when(settingService.getSetting("reward_product_id", "")).thenReturn("");

        LoyaltyResponse status = loyaltyService.getMyStatus("user-new");

        assertFalse(status.rewardAvailable(), "New customer has no reward available");
        assertEquals(5, status.ordersUntilNextReward(), "New customer with 0 orders must require 5 orders until next reward");
    }

    @Test
    void testCustomerWithExactTargetRedeemedRequiresFullCycle() {
        User user = new User();
        user.setCompletedOrdersCount(5);
        user.setRewardsRedeemedCount(1);

        when(userService.findById("user-redeemed")).thenReturn(Optional.of(user));
        when(settingService.getSetting("reward_order_target", "5")).thenReturn("5");
        when(settingService.getSetting("reward_product_id", "")).thenReturn("");

        LoyaltyResponse status = loyaltyService.getMyStatus("user-redeemed");

        assertFalse(status.rewardAvailable(), "Customer who already redeemed reward for 5 orders has none pending");
        assertEquals(5, status.ordersUntilNextReward(), "Customer must require full 5 orders until next reward at 10");
    }
}
