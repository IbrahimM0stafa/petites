package com.petites.backend.products.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record ProductResponse(
        String id,
        String categoryId,
        String categoryName,
        String name,
        String description,
        BigDecimal price,
        String mainImage,
        boolean isAvailable,
        boolean isFeatured,
        List<ProductImageResponse> images,
        Instant createdAt,
        Instant updatedAt,
        boolean scheduledEligible,
        LocalDate earliestScheduledDate,
        boolean instantAvailableToday,
        Integer instantQuantityToday,
        Instant instantAvailableUntil
) {
}
