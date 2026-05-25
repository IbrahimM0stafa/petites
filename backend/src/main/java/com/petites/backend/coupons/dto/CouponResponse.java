package com.petites.backend.coupons.dto;

import com.petites.backend.coupons.enums.DiscountType;
import java.math.BigDecimal;
import java.time.Instant;

public record CouponResponse(
        String id,
        String code,
        DiscountType discountType,
        BigDecimal discountValue,
        BigDecimal minimumOrderAmount,
        BigDecimal maxDiscountAmount,
        Integer usageLimit,
        int usedCount,
        Instant startsAt,
        Instant expiresAt,
        boolean active,
        Instant updatedAt
) {
}