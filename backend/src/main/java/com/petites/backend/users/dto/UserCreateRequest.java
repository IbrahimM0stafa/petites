package com.petites.backend.users.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserCreateRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Size(max = 20) String phone,
        @Email @Size(max = 120) String email,
        @NotBlank @Size(min = 8, max = 255) String password
) {
}
