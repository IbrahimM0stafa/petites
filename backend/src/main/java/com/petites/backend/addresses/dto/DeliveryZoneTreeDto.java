package com.petites.backend.addresses.dto;

import java.math.BigDecimal;
import java.util.List;

public class DeliveryZoneTreeDto {

    public record GovernorateNode(
            String id,
            String name,
            boolean active,
            int sortOrder,
            List<CityNode> cities
    ) {}

    public record CityNode(
            String id,
            String governorateId,
            String name,
            boolean active,
            int sortOrder,
            List<AreaNode> areas
    ) {}

    public record AreaNode(
            String id,
            String cityId,
            String name,
            boolean active,
            BigDecimal deliveryFee,
            boolean courierDelivery,
            int sortOrder
    ) {}
}
