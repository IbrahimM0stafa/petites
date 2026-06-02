package com.petites.backend.coupons.dto;

import com.petites.backend.coupons.enums.DiscountType;
import java.math.BigDecimal;
import java.time.Instant;

public record CouponUpdateRequest(
        String code,
        DiscountType discountType,
        BigDecimal discountValue,
        BigDecimal minimumOrderAmount,
        BigDecimal maxDiscountAmount,
        Integer usageLimit,
        Integer perUserLimit,
        Integer usedCount,
        Instant startsAt,
        Instant expiresAt,
        Boolean active
) {
}