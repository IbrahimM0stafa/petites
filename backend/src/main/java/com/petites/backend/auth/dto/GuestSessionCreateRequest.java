package com.petites.backend.auth.dto;

import java.time.Instant;

public record GuestSessionCreateRequest(
        Instant expiresAt
) {
}
