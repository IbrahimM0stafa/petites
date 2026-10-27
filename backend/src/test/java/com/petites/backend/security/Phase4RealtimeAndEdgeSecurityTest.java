package com.petites.backend.security;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petites.backend.chatbot.dto.ChatMessageDto;
import com.petites.backend.chatbot.dto.ChatRequest;
import com.petites.backend.chatbot.service.ChatRateLimiterService;
import com.petites.backend.websocket.config.WebSocketConfig;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;

@SpringBootTest
@AutoConfigureMockMvc
class Phase4RealtimeAndEdgeSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ChatRateLimiterService rateLimiterService;

    @Autowired
    private Validator validator;

    @Autowired
    private WebSocketConfig webSocketConfig;

    @BeforeEach
    void setUp() {
        rateLimiterService.reset();
    }

    // ─────────────────────────────────────────────────────────────
    // SEC-02: AI Chatbot Input Validation
    // ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("SEC-02: Valid ChatRequest passes bean validation")
    void testChatRequest_Valid() {
        ChatRequest req = new ChatRequest(List.of(
                new ChatMessageDto("user", "Hello, do you have croissants?")
        ));
        Set<ConstraintViolation<ChatRequest>> violations = validator.validate(req);
        Assertions.assertTrue(violations.isEmpty(), "Valid request should have no violations");
    }

    @Test
    @DisplayName("SEC-02: Null messages list triggers validation error")
    void testChatRequest_NullMessages() {
        ChatRequest req = new ChatRequest(null);
        Set<ConstraintViolation<ChatRequest>> violations = validator.validate(req);
        Assertions.assertFalse(violations.isEmpty(), "Null messages should fail validation");
    }

    @Test
    @DisplayName("SEC-02: Blank content or invalid role triggers validation error")
    void testChatMessage_InvalidFields() {
        ChatMessageDto blankContent = new ChatMessageDto("user", "   ");
        Set<ConstraintViolation<ChatMessageDto>> v1 = validator.validate(blankContent);
        Assertions.assertFalse(v1.isEmpty(), "Blank content should fail validation");

        ChatMessageDto invalidRole = new ChatMessageDto("hacker", "valid content");
        Set<ConstraintViolation<ChatMessageDto>> v2 = validator.validate(invalidRole);
        Assertions.assertFalse(v2.isEmpty(), "Invalid role should fail validation");
    }

    @Test
    @DisplayName("SEC-02: Content exceeding 2500 characters triggers validation error")
    void testChatMessage_OversizedContent() {
        String longText = "a".repeat(2501);
        ChatMessageDto oversized = new ChatMessageDto("user", longText);
        Set<ConstraintViolation<ChatMessageDto>> violations = validator.validate(oversized);
        Assertions.assertFalse(violations.isEmpty(), "Oversized content should fail validation");
    }

    @Test
    @DisplayName("SEC-02: More than 50 messages triggers validation error")
    void testChatRequest_TooManyMessages() {
        List<ChatMessageDto> messages = new ArrayList<>();
        for (int i = 0; i < 51; i++) {
            messages.add(new ChatMessageDto("user", "msg " + i));
        }
        ChatRequest req = new ChatRequest(messages);
        Set<ConstraintViolation<ChatRequest>> violations = validator.validate(req);
        Assertions.assertFalse(violations.isEmpty(), "More than 50 messages should fail validation");
    }

    @Test
    @DisplayName("SEC-02: Controller rejects invalid request with HTTP 400")
    void testChatbotController_RejectsInvalidPayload() throws Exception {
        ChatRequest invalidReq = new ChatRequest(List.of(
                new ChatMessageDto("invalid_role", "")
        ));

        mockMvc.perform(MockMvcRequestBuilders.post("/api/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidReq)))
                .andExpect(MockMvcResultMatchers.status().isBadRequest())
                .andExpect(MockMvcResultMatchers.jsonPath("$.status").value(400))
                .andExpect(MockMvcResultMatchers.jsonPath("$.message").value("Validation failed"));
    }

    // ─────────────────────────────────────────────────────────────
    // SEC-02: AI Chatbot Rate Limiting (DoS Protection)
    // ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("SEC-02: Rate limiter enforces 20 req/min limit per IP and responds with HTTP 429")
    void testChatbotRateLimiting_EnforcesLimit() throws Exception {
        ChatRequest validReq = new ChatRequest(List.of(
                new ChatMessageDto("user", "Hello")
        ));
        String json = objectMapper.writeValueAsString(validReq);
        String testIp = "192.168.1.100";

        // Perform 20 requests under the limit
        for (int i = 0; i < 20; i++) {
            mockMvc.perform(MockMvcRequestBuilders.post("/api/chat")
                    .header("X-Forwarded-For", testIp)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json))
                    .andExpect(MockMvcResultMatchers.status().isOk());
        }

        // The 21st request should be rejected with 429 Too Many Requests
        mockMvc.perform(MockMvcRequestBuilders.post("/api/chat")
                .header("X-Forwarded-For", testIp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(MockMvcResultMatchers.status().isTooManyRequests())
                .andExpect(MockMvcResultMatchers.jsonPath("$.status").value(429))
                .andExpect(MockMvcResultMatchers.jsonPath("$.message").value("Too many chat requests. Please wait a moment before sending another message."));

        // A different IP should NOT be blocked
        mockMvc.perform(MockMvcRequestBuilders.post("/api/chat")
                .header("X-Forwarded-For", "192.168.1.200")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(MockMvcResultMatchers.status().isOk());
    }

    // ─────────────────────────────────────────────────────────────
    // OPS-01: STOMP Subscription Authorization Rules
    // ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("OPS-01: Anonymous user cannot subscribe to /topic/admin/orders")
    void testStompAuth_AdminOrders_AnonymousForbidden() {
        ChannelInterceptor interceptor = getInboundChannelInterceptor();

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/admin/orders");
        accessor.setSessionId("session-1");
        // No user set (anonymous)

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Assertions.assertThrows(AccessDeniedException.class, () -> {
            interceptor.preSend(message, null);
        });
    }

    @Test
    @DisplayName("OPS-01: Customer user cannot subscribe to /topic/admin/orders")
    void testStompAuth_AdminOrders_CustomerForbidden() {
        ChannelInterceptor interceptor = getInboundChannelInterceptor();

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/admin/orders");
        accessor.setSessionId("session-2");
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                "cust-1", null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Assertions.assertThrows(AccessDeniedException.class, () -> {
            interceptor.preSend(message, null);
        });
    }

    @Test
    @DisplayName("OPS-01: Admin user can subscribe to /topic/admin/orders")
    void testStompAuth_AdminOrders_AdminPermitted() {
        ChannelInterceptor interceptor = getInboundChannelInterceptor();

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/admin/orders");
        accessor.setSessionId("session-3");
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                "admin-1", null, List.of(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN"))));

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, null);
        Assertions.assertNotNull(result, "Admin subscription should succeed");
    }

    @Test
    @DisplayName("OPS-01: Customer cannot subscribe to other user's order topic")
    void testStompAuth_UserOrders_OtherCustomerForbidden() {
        ChannelInterceptor interceptor = getInboundChannelInterceptor();

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/users/user-target/orders");
        accessor.setSessionId("session-4");
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                "user-attacker", null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Assertions.assertThrows(AccessDeniedException.class, () -> {
            interceptor.preSend(message, null);
        });
    }

    @Test
    @DisplayName("OPS-01: Customer can subscribe to their own user order topic")
    void testStompAuth_UserOrders_SelfPermitted() {
        ChannelInterceptor interceptor = getInboundChannelInterceptor();

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/users/user-target/orders");
        accessor.setSessionId("session-5");
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                "user-target", null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, null);
        Assertions.assertNotNull(result, "Self subscription should succeed");
    }

    @Test
    @DisplayName("OPS-01: Guest can subscribe to individual order topic for order tracking")
    void testStompAuth_GuestOrderTracking_Permitted() {
        ChannelInterceptor interceptor = getInboundChannelInterceptor();

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/orders/ord-uuid-12345");
        accessor.setSessionId("session-6");
        // Anonymous guest

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, null);
        Assertions.assertNotNull(result, "Guest order tracking topic should be permitted");
    }

    private ChannelInterceptor getInboundChannelInterceptor() {
        org.springframework.messaging.simp.config.ChannelRegistration registration =
                new org.springframework.messaging.simp.config.ChannelRegistration();
        webSocketConfig.configureClientInboundChannel(registration);

        try {
            java.lang.reflect.Field interceptorsField =
                    org.springframework.messaging.simp.config.ChannelRegistration.class.getDeclaredField("interceptors");
            interceptorsField.setAccessible(true);
            @SuppressWarnings("unchecked")
            List<ChannelInterceptor> interceptors = (List<ChannelInterceptor>) interceptorsField.get(registration);
            return interceptors.get(0);
        } catch (Exception e) {
            throw new RuntimeException("Failed to extract channel interceptor from registration", e);
        }
    }
}
