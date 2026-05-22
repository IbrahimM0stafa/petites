package com.petites.backend.products.dto;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record ProductCreateRequest(
        String categoryId,

        @NotBlank @Size(max = 150) String name,

        String description,

        @NotNull @PositiveOrZero BigDecimal price,

        String mainImage,

        Boolean isAvailable,

        Boolean isFeatured,

        List<String> imageUrls
) {
}
