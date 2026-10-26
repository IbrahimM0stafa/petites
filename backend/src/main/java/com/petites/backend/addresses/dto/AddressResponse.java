package com.petites.backend.addresses.dto;

public record AddressResponse(
        String id,
        String userId,
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
    public AddressResponse(String id, String userId, String city, String area, String street, String building, String notes) {
        this(id, userId, null, null, null, city, null, area, street, building, notes);
    }
}