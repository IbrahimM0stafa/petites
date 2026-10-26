package com.petites.backend.addresses.dto;

public record AddressUpdateRequest(
        String governorateId,
        String governorate,
        String cityId,
        String city,
        String areaId,
        String area,
        String street,
        String building,
        String notes
) {
    public AddressUpdateRequest(String city, String area, String street, String building, String notes) {
        this(null, null, null, city, null, area, street, building, notes);
    }
}