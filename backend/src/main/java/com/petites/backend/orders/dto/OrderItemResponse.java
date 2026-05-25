package com.petites.backend.orders.dto;

import java.math.BigDecimal;

public record OrderItemResponse(
        String itemId,
        String productId,
        String productName,
        String productImage,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal
) {
}
