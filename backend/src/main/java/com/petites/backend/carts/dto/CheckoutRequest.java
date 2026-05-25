package com.petites.backend.carts.dto;

import com.petites.backend.orders.enums.OrderType;
import java.time.LocalDate;

public record CheckoutRequest(
        String customerName,
        String customerPhone,
        OrderType orderType,
        String addressId,
        String notes,
        String couponId,
        String couponCode,
        LocalDate scheduledDate
) {
}
