package com.petites.backend.products.dto;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record ProductUpdateRequest(
        String categoryId,

        @Size(max = 150) String name,

        String description,

        @PositiveOrZero BigDecimal price,

        String mainImage,

        Boolean isAvailable,

        Boolean isFeatured,

        List<String> imageUrls
) {
}
