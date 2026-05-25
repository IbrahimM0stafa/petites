package com.petites.backend.coupons.service;

import com.petites.backend.coupons.dto.CouponCreateRequest;
import com.petites.backend.coupons.dto.CouponResponse;
import com.petites.backend.coupons.dto.CouponUpdateRequest;
import com.petites.backend.coupons.dto.CouponValidationResponse;
import com.petites.backend.coupons.entity.Coupon;
import com.petites.backend.coupons.enums.DiscountType;
import com.petites.backend.coupons.repository.CouponRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CouponService {

    private final CouponRepository couponRepository;

    public CouponService(CouponRepository couponRepository) {
        this.couponRepository = couponRepository;
    }

    @Transactional(readOnly = true)
    public List<CouponResponse> list() {
        return couponRepository.findAllByOrderByCodeAsc().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public CouponResponse get(String id) {
        return toResponse(getEntity(id));
    }

    @Transactional
    public CouponResponse create(CouponCreateRequest request) {
        Coupon coupon = new Coupon();
        apply(coupon, request.code(), request.discountType(), request.discountValue(), request.minimumOrderAmount(), request.maxDiscountAmount(), request.usageLimit(), request.startsAt(), request.expiresAt(), request.active());
        return toResponse(couponRepository.save(coupon));
    }

    @Transactional
    public CouponResponse update(String id, CouponUpdateRequest request) {
        Coupon coupon = getEntity(id);
        if (request.code() != null) {
            coupon.setCode(request.code().trim());
        }
        if (request.discountType() != null) {
            coupon.setDiscountType(request.discountType());
        }
        if (request.discountValue() != null) {
            coupon.setDiscountValue(request.discountValue());
        }
        if (request.minimumOrderAmount() != null) {
            coupon.setMinimumOrderAmount(request.minimumOrderAmount());
        }
        if (request.maxDiscountAmount() != null) {
            coupon.setMaxDiscountAmount(request.maxDiscountAmount());
        }
        if (request.usageLimit() != null) {
            coupon.setUsageLimit(request.usageLimit());
        }
        if (request.usedCount() != null) {
            coupon.setUsedCount(request.usedCount());
        }
        if (request.startsAt() != null) {
            coupon.setStartsAt(request.startsAt());
        }
        if (request.expiresAt() != null) {
            coupon.setExpiresAt(request.expiresAt());
        }
        if (request.active() != null) {
            coupon.setActive(request.active());
        }
        return toResponse(couponRepository.save(coupon));
    }

    @Transactional
    public CouponResponse setActive(String id, boolean active) {
        Coupon coupon = getEntity(id);
        coupon.setActive(active);
        return toResponse(couponRepository.save(coupon));
    }

    @Transactional(readOnly = true)
    public CouponValidationResponse validate(String code, BigDecimal subtotal) {
        if (code == null || code.isBlank()) {
            return new CouponValidationResponse(false, null, null, BigDecimal.ZERO, subtotal, "Coupon code is required");
        }

        Coupon coupon = couponRepository.findByCodeIgnoreCase(code.trim())
                .orElse(null);
        if (coupon == null) {
            return new CouponValidationResponse(false, null, code.trim(), BigDecimal.ZERO, subtotal, "Coupon not found");
        }

        String validationMessage = validateCoupon(coupon, subtotal);
        if (validationMessage != null) {
            return new CouponValidationResponse(false, coupon.getId(), coupon.getCode(), BigDecimal.ZERO, subtotal, validationMessage);
        }

        BigDecimal discountAmount = calculateDiscountAmount(coupon, subtotal);
        BigDecimal finalAmount = subtotal.subtract(discountAmount).max(BigDecimal.ZERO);
        return new CouponValidationResponse(true, coupon.getId(), coupon.getCode(), discountAmount, finalAmount, "Coupon is valid");
    }

    @Transactional(readOnly = true)
    public Coupon resolveForCheckout(String couponId, String couponCode, BigDecimal subtotal) {
        if (couponId != null && !couponId.isBlank()) {
            Coupon coupon = getEntity(couponId.trim());
            if (validateCoupon(coupon, subtotal) != null) {
                throw new IllegalArgumentException("Coupon is not valid for this order");
            }
            return coupon;
        }

        if (couponCode != null && !couponCode.isBlank()) {
            Coupon coupon = couponRepository.findByCodeIgnoreCase(couponCode.trim())
                    .orElseThrow(() -> new IllegalArgumentException("Coupon not found"));
            if (validateCoupon(coupon, subtotal) != null) {
                throw new IllegalArgumentException("Coupon is not valid for this order");
            }
            return coupon;
        }

        return null;
    }

    @Transactional(readOnly = true)
    public BigDecimal calculateDiscountAmount(Coupon coupon, BigDecimal subtotal) {
        if (coupon == null || subtotal == null || subtotal.signum() <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal discountAmount;
        if (coupon.getDiscountType() == DiscountType.PERCENTAGE) {
            discountAmount = subtotal.multiply(coupon.getDiscountValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        } else {
            discountAmount = coupon.getDiscountValue();
        }

        if (coupon.getMaxDiscountAmount() != null) {
            discountAmount = discountAmount.min(coupon.getMaxDiscountAmount());
        }

        return discountAmount.min(subtotal).max(BigDecimal.ZERO);
    }

    private String validateCoupon(Coupon coupon, BigDecimal subtotal) {
        if (!coupon.isActive()) {
            return "Coupon is inactive";
        }
        Instant now = Instant.now();
        if (coupon.getStartsAt() != null && now.isBefore(coupon.getStartsAt())) {
            return "Coupon has not started yet";
        }
        if (coupon.getExpiresAt() != null && now.isAfter(coupon.getExpiresAt())) {
            return "Coupon has expired";
        }
        if (coupon.getUsageLimit() != null && coupon.getUsedCount() >= coupon.getUsageLimit()) {
            return "Coupon usage limit reached";
        }
        if (subtotal != null && coupon.getMinimumOrderAmount() != null && subtotal.compareTo(coupon.getMinimumOrderAmount()) < 0) {
            return "Order amount does not meet coupon minimum";
        }
        return null;
    }

    private Coupon getEntity(String id) {
        return couponRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Coupon not found"));
    }

    private void apply(Coupon coupon,
                       String code,
                       DiscountType discountType,
                       BigDecimal discountValue,
                       BigDecimal minimumOrderAmount,
                       BigDecimal maxDiscountAmount,
                       Integer usageLimit,
                       Instant startsAt,
                       Instant expiresAt,
                       Boolean active) {
        coupon.setCode(code.trim());
        coupon.setDiscountType(discountType);
        coupon.setDiscountValue(discountValue);
        coupon.setMinimumOrderAmount(minimumOrderAmount == null ? BigDecimal.ZERO : minimumOrderAmount);
        coupon.setMaxDiscountAmount(maxDiscountAmount);
        coupon.setUsageLimit(usageLimit);
        coupon.setStartsAt(startsAt);
        coupon.setExpiresAt(expiresAt);
        coupon.setActive(active == null || active);
    }

    private CouponResponse toResponse(Coupon coupon) {
        return new CouponResponse(
                coupon.getId(),
                coupon.getCode(),
                coupon.getDiscountType(),
                coupon.getDiscountValue(),
                coupon.getMinimumOrderAmount(),
                coupon.getMaxDiscountAmount(),
                coupon.getUsageLimit(),
                coupon.getUsedCount(),
                coupon.getStartsAt(),
                coupon.getExpiresAt(),
                coupon.isActive(),
                coupon.getUpdatedAt()
        );
    }
}