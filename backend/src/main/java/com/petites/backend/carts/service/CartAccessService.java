package com.petites.backend.carts.service;

import com.petites.backend.auth.service.GuestSessionService;
import com.petites.backend.carts.dto.CartOwnerRef;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CartAccessService {

    private final GuestSessionService guestSessionService;

    public CartAccessService(GuestSessionService guestSessionService) {
        this.guestSessionService = guestSessionService;
    }

    public CartOwnerRef resolveOwner(String guestToken) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() != null && authentication.isAuthenticated()) {
            Object principal = authentication.getPrincipal();
            if (!(principal instanceof String principalId) || principalId.isBlank() || "anonymousUser".equals(principalId)) {
                throw new IllegalArgumentException("Authenticated user is required");
            }
            return CartOwnerRef.forUser(principalId);
        }

        if (guestToken == null || guestToken.isBlank()) {
            throw new IllegalArgumentException("Guest token is required");
        }

        return CartOwnerRef.forGuest(guestSessionService.getCurrent(guestToken).id());
    }
}
