package com.petites.backend.carts.dto;

import com.petites.backend.orders.dto.OrderResponse;
import java.math.BigDecimal;
import java.util.List;

public record CheckoutResponse(
        String cartId,
        List<OrderResponse> orders,
        BigDecimal totalAmount
) {
}
