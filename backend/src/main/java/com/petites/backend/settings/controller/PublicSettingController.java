package com.petites.backend.settings.controller;

import com.petites.backend.settings.service.SettingService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class PublicSettingController {

    private final SettingService settingService;

    public PublicSettingController(SettingService settingService) {
        this.settingService = settingService;
    }

    @GetMapping("/delivery-fee")
    public Map<String, Object> getDeliveryFee() {
        String feeStr = settingService.getSetting("delivery_fee", "50");
        double fee = 50.0;
        try {
            fee = Double.parseDouble(feeStr);
        } catch (NumberFormatException e) {
            // fallback
        }
        return Map.of("deliveryFee", fee);
    }

    @GetMapping("/blocked-days")
    public Map<String, java.util.List<String>> getBlockedDays() {
        String blockedDaysStr = settingService.getSetting("blocked_days", "");
        if (blockedDaysStr.trim().isEmpty()) {
            return Map.of("blockedDays", java.util.List.of());
        }
        java.util.List<String> blockedDays = java.util.Arrays.stream(blockedDaysStr.split(","))
                .map(String::trim)
                .map(String::toUpperCase)
                .toList();
        return Map.of("blockedDays", blockedDays);
    }
}
