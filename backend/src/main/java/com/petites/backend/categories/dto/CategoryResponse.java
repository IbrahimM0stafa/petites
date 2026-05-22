package com.petites.backend.categories.dto;

public record CategoryResponse(
        String id,
        String name,
        String imageUrl,
        Integer sortOrder
) {
}
