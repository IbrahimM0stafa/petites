package com.petites.backend.loyalty.service;

import com.petites.backend.loyalty.dto.LoyaltyResponse;
import com.petites.backend.settings.service.SettingService;
import com.petites.backend.users.entity.User;
import com.petites.backend.users.service.UserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LoyaltyService {

    private final UserService userService;
    private final SettingService settingService;

    public LoyaltyService(UserService userService, SettingService settingService) {
        this.userService = userService;
        this.settingService = settingService;
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
        boolean rewardAvailable = target > 0 && completed > 0 && completed % target == 0;

        return new LoyaltyResponse(user.getId(), completed, target, untilNext, rewardAvailable);
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