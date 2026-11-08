package com.petites.backend.addresses.dto;

import com.petites.backend.addresses.entity.Area;
import java.math.BigDecimal;

public record AreaResponse(
        String id,
        String cityId,
        String name,
        BigDecimal deliveryFee,
        boolean courierDelivery,
        boolean active,
        int sortOrder
) {
    public static AreaResponse from(Area area) {
        if (area == null) {
            return null;
        }
        return new AreaResponse(
                area.getId(),
                area.getCityId(),
                area.getName(),
                area.getDeliveryFee(),
                area.isCourierDelivery(),
                area.isActive(),
                area.getSortOrder()
        );
    }
}

