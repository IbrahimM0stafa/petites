package com.petites.backend.addresses.dto;

public record AddressResponse(
        String id,
        String userId,
        String city,
        String area,
        String street,
        String building,
        String notes
) {
}