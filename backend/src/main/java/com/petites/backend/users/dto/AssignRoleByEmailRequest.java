package com.petites.backend.users.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AssignRoleByEmailRequest(
        @Email @NotBlank @Size(max = 120) String email,
        @NotBlank String role
) {
}
