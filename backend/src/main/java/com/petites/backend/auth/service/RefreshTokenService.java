package com.petites.backend.auth.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.petites.backend.auth.entity.RefreshToken;
import com.petites.backend.auth.repository.RefreshTokenRepository;
import com.petites.backend.users.entity.User;

@Service
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final long refreshTtlDays;

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository,
                               @Value("${app.jwt.refresh-expiration-days:30}") long refreshTtlDays) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTtlDays = refreshTtlDays;
    }

    @Transactional
    public void revokeAllActiveForUser(User user) {
        refreshTokenRepository.revokeAllActiveForUser(user, Instant.now());
    }

    @Transactional
    public RefreshTokenResult issue(User user) {
        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setExpiresAt(Instant.now().plus(refreshTtlDays, ChronoUnit.DAYS));

        String rawToken = UUID.randomUUID().toString();
        token.setTokenHash(hash(rawToken));

        RefreshToken saved = refreshTokenRepository.save(token);
        return new RefreshTokenResult(rawToken, saved.getExpiresAt(), user.getId());
    }

    @Transactional
    public RefreshTokenResult rotate(String rawToken) {
        String tokenHash = hash(rawToken);
        RefreshToken token = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));

        if (token.getRevokedAt() != null) {
            throw new IllegalArgumentException("Refresh token revoked");
        }

        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Refresh token expired");
        }

        token.setRevokedAt(Instant.now());
        refreshTokenRepository.save(token);

        return issue(token.getUser());
    }

    private String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    public record RefreshTokenResult(String token, Instant expiresAt, String userId) {
    }
}
