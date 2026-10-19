package com.petites.backend.chatbot.dto;

import java.math.BigDecimal;

public record ChatActionDto(
    String type,           // "ADD_TO_CART", "VIEW_CART", "CLEAR_CART", "INITIATE_CHECKOUT", "TRACK_ORDER", "NAVIGATE"
    String productId,
    String productName,
    Integer quantity,
    String deliveryMode,   // "INSTANT" or "SCHEDULED"
    BigDecimal price,
    String targetUrl
) {}
