package com.petites.backend.coupons.service;

import com.petites.backend.coupons.dto.CouponValidationResponse;
import com.petites.backend.coupons.entity.Coupon;
import com.petites.backend.coupons.repository.CouponRepository;
import com.petites.backend.coupons.repository.CouponUsageRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CouponServiceTest {

    @Mock
    private CouponRepository couponRepository;

    @Mock
    private CouponUsageRepository couponUsageRepository;

    @Mock
    private Authentication authentication;

    @Mock
    private SecurityContext securityContext;

    @InjectMocks
    private CouponService couponService;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.setContext(securityContext);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void validate_WhenUserNotLoggedIn_ReturnsLoginRequiredMessage() throws Exception {
        // Arrange
        String code = "WELCOME10";
        BigDecimal subtotal = new BigDecimal("100.00");
        Coupon coupon = new Coupon();
        assignId(coupon, "coupon-123");
        coupon.setCode(code);
        coupon.setActive(true);

        when(couponRepository.findByCodeIgnoreCase(code)).thenReturn(Optional.of(coupon));
        when(securityContext.getAuthentication()).thenReturn(null);

        // Act
        CouponValidationResponse response = couponService.validate(code, subtotal);

        // Assert
        assertFalse(response.valid());
        assertEquals("you must login to use a coupon code", response.message());
        assertEquals(BigDecimal.ZERO, response.discountAmount());
    }

    @Test
    void validate_WhenUserLoggedIn_ReturnsValidCoupon() throws Exception {
        // Arrange
        String code = "WELCOME10";
        BigDecimal subtotal = new BigDecimal("100.00");
        Coupon coupon = new Coupon();
        assignId(coupon, "coupon-123");
        coupon.setCode(code);
        coupon.setActive(true);
        coupon.setDiscountType(com.petites.backend.coupons.enums.DiscountType.FIXED);
        coupon.setDiscountValue(new BigDecimal("10.00"));

        when(couponRepository.findByCodeIgnoreCase(code)).thenReturn(Optional.of(coupon));
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn("user-123");

        // Act
        CouponValidationResponse response = couponService.validate(code, subtotal);

        // Assert
        assertTrue(response.valid());
        assertEquals("Coupon is valid", response.message());
        assertEquals(new BigDecimal("10.00"), response.discountAmount());
    }

    private void assignId(Object entity, String id) throws Exception {
        Class<?> currentType = entity.getClass();
        Field field = null;
        while (currentType != null && field == null) {
            try {
                field = currentType.getDeclaredField("id");
            } catch (NoSuchFieldException ignored) {
                currentType = currentType.getSuperclass();
            }
        }
        if (field == null) {
            throw new IllegalStateException("Unable to locate id field");
        }
        field.setAccessible(true);
        field.set(entity, id);
    }
}
