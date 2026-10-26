package com.petites.backend.orders.dto;

import com.petites.backend.addresses.dto.AddressResponse;
import com.petites.backend.common.enums.DeliveryMode;
import com.petites.backend.orders.enums.OrderStatus;
import com.petites.backend.orders.enums.OrderType;
import com.petites.backend.orders.enums.PaymentMethod;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record OrderResponse(
        String orderId,
        String orderNumber,
        String userId,
        String guestSessionId,
        String addressId,
        AddressResponse address,
        DeliveryMode deliveryMode,
        OrderType orderType,
        OrderStatus status,
        PaymentMethod paymentMethod,
        BigDecimal subtotal,
        BigDecimal deliveryFee,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        String customerName,
        String customerPhone,
        LocalDate scheduledDate,
        String notes,
        String couponId,
        boolean rewardApplied,
        Instant createdAt,
        List<OrderItemResponse> items,
        boolean isCourierDelivery
) {
    public OrderResponse(
            String orderId,
            String orderNumber,
            String userId,
            String guestSessionId,
            String addressId,
            AddressResponse address,
            DeliveryMode deliveryMode,
            OrderType orderType,
            OrderStatus status,
            PaymentMethod paymentMethod,
            BigDecimal subtotal,
            BigDecimal deliveryFee,
            BigDecimal discountAmount,
            BigDecimal totalAmount,
            String customerName,
            String customerPhone,
            LocalDate scheduledDate,
            String notes,
            String couponId,
            boolean rewardApplied,
            Instant createdAt,
            List<OrderItemResponse> items
    ) {
        this(
                orderId,
                orderNumber,
                userId,
                guestSessionId,
                addressId,
                address,
                deliveryMode,
                orderType,
                status,
                paymentMethod,
                subtotal,
                deliveryFee,
                discountAmount,
                totalAmount,
                customerName,
                customerPhone,
                scheduledDate,
                notes,
                couponId,
                rewardApplied,
                createdAt,
                items,
                false
        );
    }
}
