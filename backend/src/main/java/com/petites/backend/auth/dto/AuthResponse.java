package com.petites.backend.auth.dto;

import java.time.Instant;
import java.util.Set;

public record AuthResponse(
        String token,
        Instant expiresAt,
        String refreshToken,
        Instant refreshExpiresAt,
        String userId,
        Set<String> roles
) {
}
