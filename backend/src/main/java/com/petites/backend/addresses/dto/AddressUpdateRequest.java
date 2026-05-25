package com.petites.backend.addresses.dto;

public record AddressUpdateRequest(
        String city,
        String area,
        String street,
        String building,
        String notes
) {
}