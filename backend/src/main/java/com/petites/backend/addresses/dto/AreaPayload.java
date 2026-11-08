package com.petites.backend.addresses.dto;

import java.math.BigDecimal;

public record AreaPayload(
        String cityId,
        String name,
        BigDecimal deliveryFee,
        Boolean courierDelivery,
        Boolean active,
        Integer sortOrder
) {}

