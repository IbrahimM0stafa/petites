package com.petites.backend.addresses.dto;

import com.petites.backend.addresses.entity.City;

public record CityResponse(
        String id,
        String governorateId,
        String name,
        boolean active,
        int sortOrder
) {
    public static CityResponse from(City city) {
        if (city == null) {
            return null;
        }
        return new CityResponse(
                city.getId(),
                city.getGovernorateId(),
                city.getName(),
                city.isActive(),
                city.getSortOrder()
        );
    }
}

