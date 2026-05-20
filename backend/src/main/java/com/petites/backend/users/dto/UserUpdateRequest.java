package com.petites.backend.users.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record UserUpdateRequest(
        @Size(max = 100) String name,
        @Size(max = 20) String phone,
        @Email @Size(max = 120) String email
) {
}
