package com.petites.backend.coupons.controller;

import com.petites.backend.coupons.dto.CouponValidationResponse;
import com.petites.backend.coupons.service.CouponService;
import java.math.BigDecimal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/coupons")
public class CouponController {

    private final CouponService couponService;

    public CouponController(CouponService couponService) {
        this.couponService = couponService;
    }

    @GetMapping("/validate")
    public CouponValidationResponse validate(
            @RequestParam String code,
            @RequestParam(required = false) BigDecimal subtotal) {
        return couponService.validate(code, subtotal == null ? BigDecimal.ZERO : subtotal);
    }
}