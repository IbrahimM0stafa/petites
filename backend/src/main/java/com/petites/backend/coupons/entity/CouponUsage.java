package com.petites.backend.coupons.entity;

import com.petites.backend.common.model.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@IdClass(CouponUsageId.class)
@Table(name = "coupon_usage")
public class CouponUsage {

    @Id
    @Column(name = "coupon_id", nullable = false)
    private String couponId;

    @Id
    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "used_count", nullable = false)
    private int usedCount = 0;

    @Column(name = "last_used_at")
    private Instant lastUsedAt;

    public CouponUsage() {}

    public CouponUsage(String couponId, String userId) {
        this.couponId = couponId;
        this.userId = userId;
    }

    public String getCouponId() { return couponId; }
    public void setCouponId(String couponId) { this.couponId = couponId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public int getUsedCount() { return usedCount; }
    public void setUsedCount(int usedCount) { this.usedCount = usedCount; }

    public Instant getLastUsedAt() { return lastUsedAt; }
    public void setLastUsedAt(Instant lastUsedAt) { this.lastUsedAt = lastUsedAt; }
}
