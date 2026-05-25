package com.petites.backend.loyalty.controller;

import com.petites.backend.loyalty.dto.LoyaltyResponse;
import com.petites.backend.loyalty.service.LoyaltyService;
import com.petites.backend.users.service.UserService;
import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/loyalty")
public class LoyaltyController {

    private final LoyaltyService loyaltyService;
    private final UserService userService;

    public LoyaltyController(LoyaltyService loyaltyService, UserService userService) {
        this.loyaltyService = loyaltyService;
        this.userService = userService;
    }

    @GetMapping("/me")
    public LoyaltyResponse me() {
        String userId = currentUserId();
        return loyaltyService.getMyStatus(userId);
    }

    private String currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new IllegalArgumentException("Authenticated user is required");
        }
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof String userId) || userId.isBlank() || "anonymousUser".equals(userId)) {
            throw new IllegalArgumentException("Authenticated user is required");
        }
        Optional<?> user = userService.findById(userId);
        if (user.isEmpty()) {
            throw new IllegalArgumentException("Authenticated user is required");
        }
        return userId;
    }
}