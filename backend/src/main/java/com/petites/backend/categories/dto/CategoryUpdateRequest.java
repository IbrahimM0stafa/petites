package com.petites.backend.categories.dto;

import jakarta.validation.constraints.Size;

public record CategoryUpdateRequest(
        @Size(max = 100) String name,
        String imageUrl,
        Integer sortOrder
) {
}
