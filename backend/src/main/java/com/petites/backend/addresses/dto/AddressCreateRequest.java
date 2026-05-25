package com.petites.backend.addresses.dto;

import jakarta.validation.constraints.NotBlank;

public record AddressCreateRequest(
        @NotBlank String city,
        @NotBlank String area,
        @NotBlank String street,
        String building,
        String notes
) {
}