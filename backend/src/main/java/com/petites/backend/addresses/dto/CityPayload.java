package com.petites.backend.addresses.dto;

public record CityPayload(
        String governorateId,
        String name,
        Boolean active,
        Integer sortOrder
) {}

