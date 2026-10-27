package com.petites.backend.chatbot.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ChatMessageDto(
    @NotBlank(message = "Role is required")
    @Pattern(regexp = "^(?i)(user|model|assistant|system)$", message = "Role must be user, model, assistant, or system")
    String role,

    @NotBlank(message = "Content cannot be blank")
    @Size(max = 2500, message = "Content cannot exceed 2500 characters")
    String content
) {}
