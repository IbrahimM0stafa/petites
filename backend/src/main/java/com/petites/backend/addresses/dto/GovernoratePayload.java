package com.petites.backend.addresses.dto;

public record GovernoratePayload(
        String name,
        Boolean active,
        Integer sortOrder
) {}

