package com.petites.backend.carts.dto;

import com.petites.backend.common.enums.DeliveryMode;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CartItemUpdateRequest(
        @Min(1) int quantity,
        @NotNull DeliveryMode deliveryMode
) {
}
