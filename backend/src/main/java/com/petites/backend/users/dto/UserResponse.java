package com.petites.backend.users.dto;

import java.time.Instant;
import java.util.Set;

public record UserResponse(
        String id,
        String name,
        String phone,
        String email,
        int completedOrdersCount,
        boolean active,
        Set<String> roles,
        Instant createdAt,
        Instant updatedAt
) {
}
