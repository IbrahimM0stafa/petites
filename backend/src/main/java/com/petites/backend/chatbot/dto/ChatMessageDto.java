package com.petites.backend.chatbot.dto;

public record ChatMessageDto(
    String role,
    String content
) {}
