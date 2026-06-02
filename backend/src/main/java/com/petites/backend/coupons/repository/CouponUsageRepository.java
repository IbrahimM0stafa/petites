package com.petites.backend.coupons.repository;

import com.petites.backend.coupons.entity.CouponUsage;
import com.petites.backend.coupons.entity.CouponUsageId;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CouponUsageRepository extends JpaRepository<CouponUsage, CouponUsageId> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<CouponUsage> findByCouponIdAndUserId(String couponId, String userId);
}
