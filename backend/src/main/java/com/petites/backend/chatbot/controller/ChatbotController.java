package com.petites.backend.chatbot.controller;

import com.petites.backend.chatbot.dto.ChatRequest;
import com.petites.backend.chatbot.dto.ChatResponse;
import com.petites.backend.chatbot.service.ChatRateLimiterService;
import com.petites.backend.chatbot.service.ChatbotService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat")
public class ChatbotController {

    private final ChatbotService chatbotService;
    private final ChatRateLimiterService chatRateLimiterService;

    public ChatbotController(ChatbotService chatbotService, ChatRateLimiterService chatRateLimiterService) {
        this.chatbotService = chatbotService;
        this.chatRateLimiterService = chatRateLimiterService;
    }

    @PostMapping
    public ResponseEntity<ChatResponse> chat(@Valid @RequestBody ChatRequest request, HttpServletRequest httpRequest) {
        String clientIp = chatRateLimiterService.resolveClientIp(httpRequest);
        chatRateLimiterService.checkRateLimit(clientIp);

        ChatResponse response = chatbotService.processChat(request);
        return ResponseEntity.ok(response);
    }
}
