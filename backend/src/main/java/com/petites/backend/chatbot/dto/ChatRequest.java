package com.petites.backend.chatbot.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record ChatRequest(
    @NotNull(message = "Messages list cannot be null")
    @Size(max = 50, message = "Messages history cannot exceed 50 messages")
    List<@Valid ChatMessageDto> messages
) {}
