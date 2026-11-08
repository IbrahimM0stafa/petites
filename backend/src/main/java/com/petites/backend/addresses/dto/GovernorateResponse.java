package com.petites.backend.addresses.dto;

import com.petites.backend.addresses.entity.Governorate;

public record GovernorateResponse(
        String id,
        String name,
        boolean active,
        int sortOrder
) {
    public static GovernorateResponse from(Governorate governorate) {
        if (governorate == null) {
            return null;
        }
        return new GovernorateResponse(
                governorate.getId(),
                governorate.getName(),
                governorate.isActive(),
                governorate.getSortOrder()
        );
    }
}

