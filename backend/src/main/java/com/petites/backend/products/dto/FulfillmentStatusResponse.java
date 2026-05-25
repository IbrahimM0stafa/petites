package com.petites.backend.products.dto;

import java.time.Instant;

public record FulfillmentStatusResponse(
        String productId,
        int dailyCapacity,
        int reservedQuantityTomorrow,
        int instantQuantity,
        boolean instantActive,
        Instant instantAvailableUntil
) {
}
