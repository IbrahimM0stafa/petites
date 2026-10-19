package com.petites.backend.websocket.dto;

import com.petites.backend.orders.dto.OrderResponse;
import java.time.Instant;

public record OrderWebSocketEvent(
        String eventType,
        OrderResponse order,
        Instant timestamp
) {
    public static OrderWebSocketEvent created(OrderResponse order) {
        return new OrderWebSocketEvent("ORDER_CREATED", order, Instant.now());
    }

    public static OrderWebSocketEvent statusUpdated(OrderResponse order) {
        return new OrderWebSocketEvent("ORDER_STATUS_UPDATED", order, Instant.now());
    }
}
