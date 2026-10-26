package com.petites.backend.addresses.dto;

import jakarta.validation.constraints.NotBlank;

public record AddressCreateRequest(
        @NotBlank String governorateId,
        String governorate,
        @NotBlank String cityId,
        @NotBlank String city,
        @NotBlank String areaId,
        @NotBlank String area,
        @NotBlank String street,
        String building,
        String notes
) {
}