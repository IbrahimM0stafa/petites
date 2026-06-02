package com.petites.backend.coupons.entity;

import java.io.Serializable;
import java.util.Objects;

public class CouponUsageId implements Serializable {
    private String couponId;
    private String userId;

    public CouponUsageId() {}

    public CouponUsageId(String couponId, String userId) {
        this.couponId = couponId;
        this.userId = userId;
    }

    public String getCouponId() { return couponId; }
    public void setCouponId(String couponId) { this.couponId = couponId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CouponUsageId that = (CouponUsageId) o;
        return Objects.equals(couponId, that.couponId) && Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(couponId, userId);
    }
}
