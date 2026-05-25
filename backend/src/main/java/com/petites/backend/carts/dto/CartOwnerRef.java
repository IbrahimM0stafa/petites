package com.petites.backend.carts.dto;

public record CartOwnerRef(String userId, String guestSessionId) {

    public static CartOwnerRef forUser(String userId) {
        return new CartOwnerRef(userId, null);
    }

    public static CartOwnerRef forGuest(String guestSessionId) {
        return new CartOwnerRef(null, guestSessionId);
    }

    public boolean isGuest() {
        return guestSessionId != null && !guestSessionId.isBlank();
    }

    public boolean isUser() {
        return userId != null && !userId.isBlank();
    }
}
