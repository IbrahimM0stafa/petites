package com.petites.backend.carts.dto;

import com.petites.backend.common.enums.DeliveryMode;
import java.math.BigDecimal;

public record CartItemResponse(
        String itemId,
        String productId,
        String productName,
        String productImage,
        int quantity,
        BigDecimal unitPrice,
        DeliveryMode deliveryMode,
        BigDecimal lineTotal
) {
}
