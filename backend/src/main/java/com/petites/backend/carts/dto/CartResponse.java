package com.petites.backend.carts.dto;

import com.petites.backend.carts.enums.CartStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record CartResponse(
        String cartId,
        String userId,
        String guestSessionId,
        CartStatus status,
        Instant createdAt,
        BigDecimal subtotal,
        List<CartItemResponse> items
) {
}
