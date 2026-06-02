package com.petites.backend.auth.repository;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.petites.backend.auth.entity.RefreshToken;
import com.petites.backend.users.entity.User;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE RefreshToken token SET token.revokedAt = :revokedAt WHERE token.user = :user AND token.revokedAt IS NULL")
    int revokeAllActiveForUser(@Param("user") User user, @Param("revokedAt") Instant revokedAt);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM RefreshToken token WHERE token.expiresAt < :now OR token.revokedAt < :now")
    int deleteExpiredOrRevoked(@Param("now") Instant now);
}
