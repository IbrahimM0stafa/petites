package com.petites.backend.auth.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.petites.backend.auth.entity.PasswordResetOtp;
import com.petites.backend.users.entity.User;

import jakarta.persistence.LockModeType;

public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, String> {

    Optional<PasswordResetOtp> findByUserAndOtpAndUsedAtIsNullAndExpiresAtAfter(User user, String otp, Instant now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT otp FROM PasswordResetOtp otp WHERE otp.user = :user AND otp.usedAt IS NULL AND otp.expiresAt > :now ORDER BY otp.createdAt DESC")
    List<PasswordResetOtp> findActiveForUpdateByUser(@Param("user") User user, @Param("now") Instant now);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE PasswordResetOtp otp SET otp.usedAt = :now WHERE otp.user = :user AND otp.usedAt IS NULL")
    int invalidateAllActiveForUser(@Param("user") User user, @Param("now") Instant now);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM PasswordResetOtp otp WHERE otp.expiresAt < :now OR otp.usedAt IS NOT NULL")
    int deleteExpiredOrUsed(@Param("now") Instant now);
}
