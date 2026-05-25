package com.petites.backend.coupons.dto;

import java.math.BigDecimal;

public record CouponValidationResponse(
        boolean valid,
        String couponId,
        String code,
        BigDecimal discountAmount,
        BigDecimal finalAmount,
        String message
) {
}