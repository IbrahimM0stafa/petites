package com.petites.backend.carts.dto;

import com.petites.backend.orders.enums.OrderType;
import java.time.LocalDate;

public record CheckoutRequest(
        String customerName,
        String customerPhone,
        OrderType orderType,
        String addressId,
        String notes,
        String couponId,
        String couponCode,
        LocalDate scheduledDate,
        String governorateId,
        String deliveryGovernorate,
        String cityId,
        String deliveryCity,
        String areaId,
        String deliveryArea,
        String deliveryStreet,
        String deliveryBuilding,
        String deliveryNotes
) {
    public CheckoutRequest(
            String customerName,
            String customerPhone,
            OrderType orderType,
            String addressId,
            String notes,
            String couponId,
            String couponCode,
            LocalDate scheduledDate,
            String deliveryCity,
            String deliveryArea,
            String deliveryStreet,
            String deliveryBuilding,
            String deliveryNotes
    ) {
        this(
                customerName,
                customerPhone,
                orderType,
                addressId,
                notes,
                couponId,
                couponCode,
                scheduledDate,
                null,
                null,
                null,
                deliveryCity,
                null,
                deliveryArea,
                deliveryStreet,
                deliveryBuilding,
                deliveryNotes
        );
    }
}
