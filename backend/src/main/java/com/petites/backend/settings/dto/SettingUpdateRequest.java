package com.petites.backend.settings.dto;

import jakarta.validation.constraints.NotBlank;

public record SettingUpdateRequest(
    @NotBlank(message = "Setting key is required")
    String key,

    @NotBlank(message = "Setting value is required")
    String value
) {}

