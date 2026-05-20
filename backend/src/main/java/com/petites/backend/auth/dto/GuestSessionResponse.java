package com.petites.backend.auth.dto;

import java.time.Instant;

public record GuestSessionResponse(
        String id,
        String sessionToken,
        Instant expiresAt,
        Instant createdAt
) {
}
