package com.petites.backend.loyalty.service;

import com.petites.backend.loyalty.dto.LoyaltyResponse;
import com.petites.backend.products.dto.ProductResponse;
import com.petites.backend.products.service.ProductService;
import com.petites.backend.settings.service.SettingService;
import com.petites.backend.users.entity.User;
import com.petites.backend.users.service.UserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LoyaltyService {

    private final UserService userService;
    private final SettingService settingService;
    private final ProductService productService;

    public LoyaltyService(UserService userService, SettingService settingService, ProductService productService) {
        this.userService = userService;
        this.settingService = settingService;
        this.productService = productService;
    }

    @Transactional
    public LoyaltyResponse recordCompletedOrder(String userId) {
        userService.incrementCompletedOrdersCount(userId);
        return getMyStatus(userId);
    }

    @Transactional(readOnly = true)
    public LoyaltyResponse getMyStatus(String userId) {
        User user = userService.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        int target = rewardTarget();
        int completed = user.getCompletedOrdersCount();
        int remainder = target == 0 ? 0 : completed % target;
        int untilNext = remainder == 0 ? 0 : target - remainder;
        int redeemed = user.getRewardsRedeemedCount();
        boolean rewardAvailable = target > 0 && completed > 0 && completed % target == 0 && (completed / target) > redeemed;

        // read optional reward product id from settings
        String rewardProductId = settingService.getSetting("reward_product_id", "").trim();
        String rewardProductName = null;
        String rewardProductImage = null;
        if (!rewardProductId.isBlank()) {
            try {
                ProductResponse p = productService.get(rewardProductId);
                rewardProductName = p.name();
                rewardProductImage = p.mainImage();
            } catch (Exception ignored) {
                // if product not found or any error, leave reward fields null
            }
        } else {
            rewardProductId = null;
        }

        return new LoyaltyResponse(user.getId(), completed, target, untilNext, rewardAvailable,
                rewardProductId, rewardProductName, rewardProductImage);
    }

    private int rewardTarget() {
        String value = settingService.getSetting("reward_order_target", "5");
        try {
            return Math.max(1, Integer.parseInt(value.trim()));
        } catch (Exception ignored) {
            return 5;
        }
    }
}