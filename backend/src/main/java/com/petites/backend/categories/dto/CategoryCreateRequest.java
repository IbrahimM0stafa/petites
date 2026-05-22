package com.petites.backend.categories.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CategoryCreateRequest(
        @NotBlank @Size(max = 100) String name,
        String imageUrl,
        Integer sortOrder
) {
}
