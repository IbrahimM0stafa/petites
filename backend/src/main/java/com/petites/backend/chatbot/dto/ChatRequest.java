package com.petites.backend.chatbot.dto;

import java.util.List;

public record ChatRequest(
    List<ChatMessageDto> messages
) {}
