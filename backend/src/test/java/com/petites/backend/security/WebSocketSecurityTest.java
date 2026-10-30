package com.petites.backend.security;

import com.petites.backend.auth.entity.GuestSession;
import com.petites.backend.auth.repository.GuestSessionRepository;
import com.petites.backend.auth.service.JwtService;
import com.petites.backend.orders.entity.Order;
import com.petites.backend.orders.repository.OrderRepository;
import com.petites.backend.websocket.config.WebSocketConfig;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebSocketSecurityTest {

    @Mock
    private JwtService jwtService;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private GuestSessionRepository guestSessionRepository;

    private ChannelInterceptor interceptor;

    @BeforeEach
    void setUp() throws Exception {
        WebSocketConfig webSocketConfig = new WebSocketConfig(
                List.of("http://localhost:4200"),
                jwtService,
                orderRepository,
                guestSessionRepository
        );

        ChannelRegistration registration = new ChannelRegistration();
        webSocketConfig.configureClientInboundChannel(registration);

        java.lang.reflect.Field interceptorsField = ChannelRegistration.class.getDeclaredField("interceptors");
        interceptorsField.setAccessible(true);
        @SuppressWarnings("unchecked")
        List<ChannelInterceptor> interceptors = (List<ChannelInterceptor>) interceptorsField.get(registration);
        this.interceptor = interceptors.get(0);
    }

    // ─────────────────────────────────────────────────────────────
    // Order Topic Authorization Tests: /topic/orders/{orderId}
    // ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Anonymous subscriber without token to /topic/orders/{orderId} is rejected")
    void testOrderTopic_AnonymousNoToken_Rejected() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/orders/ord-12345");
        accessor.setSessionId("sess-1");

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(message, null));
    }

    @Test
    @DisplayName("Guest subscriber with expired session token is rejected")
    void testOrderTopic_GuestExpiredToken_Rejected() {
        String guestToken = "expired-token";
        GuestSession session = new GuestSession();
        session.setSessionToken(guestToken);
        session.setExpiresAt(Instant.now().minus(1, ChronoUnit.HOURS));

        when(guestSessionRepository.findBySessionToken(guestToken)).thenReturn(Optional.of(session));

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/orders/ord-12345");
        accessor.setSessionId("sess-2");
        accessor.setNativeHeader("X-Guest-Token", guestToken);

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(message, null));
    }

    @Test
    @DisplayName("Guest subscriber with mismatched order is rejected")
    void testOrderTopic_GuestMismatchedOrder_Rejected() {
        String guestToken = "valid-token-for-other-session";
        GuestSession session = new GuestSession();
        session.setSessionToken(guestToken);
        session.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));

        when(guestSessionRepository.findBySessionToken(guestToken)).thenReturn(Optional.of(session));
        when(orderRepository.findByIdAndGuestSessionId("ord-12345", session.getId())).thenReturn(Optional.empty());

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/orders/ord-12345");
        accessor.setSessionId("sess-3");
        accessor.setNativeHeader("X-Guest-Token", guestToken);

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(message, null));
    }

    @Test
    @DisplayName("Guest subscriber with valid matching token header is permitted")
    void testOrderTopic_GuestMatchingTokenHeader_Permitted() {
        String guestToken = "valid-guest-token";
        GuestSession session = new GuestSession();
        session.setSessionToken(guestToken);
        session.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));

        when(guestSessionRepository.findBySessionToken(guestToken)).thenReturn(Optional.of(session));
        when(orderRepository.findByIdAndGuestSessionId("ord-12345", session.getId())).thenReturn(Optional.of(new Order()));

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/orders/ord-12345");
        accessor.setSessionId("sess-4");
        accessor.setNativeHeader("X-Guest-Token", guestToken);

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, null);
        assertNotNull(result, "Matching guest token should be permitted");
    }

    @Test
    @DisplayName("Guest subscriber with null expiresAt but recent createdAt is permitted")
    void testOrderTopic_GuestNullExpiresAtRecentCreatedAt_Permitted() throws Exception {
        String guestToken = "guest-null-expiry-recent";
        GuestSession session = new GuestSession();
        session.setSessionToken(guestToken);
        session.setExpiresAt(null);
        java.lang.reflect.Field createdAtField = GuestSession.class.getDeclaredField("createdAt");
        createdAtField.setAccessible(true);
        createdAtField.set(session, Instant.now().minus(2, ChronoUnit.HOURS));

        when(guestSessionRepository.findBySessionToken(guestToken)).thenReturn(Optional.of(session));
        when(orderRepository.findByIdAndGuestSessionId("ord-12345", session.getId())).thenReturn(Optional.of(new Order()));

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/orders/ord-12345");
        accessor.setSessionId("sess-recent");
        accessor.setNativeHeader("X-Guest-Token", guestToken);

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, null);
        assertNotNull(result, "Recent guest token without expiresAt should be permitted");
    }

    @Test
    @DisplayName("Guest subscriber with null expiresAt and ancient createdAt is rejected")
    void testOrderTopic_GuestNullExpiresAtAncientCreatedAt_Rejected() throws Exception {
        String guestToken = "guest-null-expiry-ancient";
        GuestSession session = new GuestSession();
        session.setSessionToken(guestToken);
        session.setExpiresAt(null);
        java.lang.reflect.Field createdAtField = GuestSession.class.getDeclaredField("createdAt");
        createdAtField.setAccessible(true);
        createdAtField.set(session, Instant.now().minus(10, ChronoUnit.DAYS));

        when(guestSessionRepository.findBySessionToken(guestToken)).thenReturn(Optional.of(session));

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/orders/ord-12345");
        accessor.setSessionId("sess-ancient");
        accessor.setNativeHeader("X-Guest-Token", guestToken);

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(message, null));
    }

    @Test
    @DisplayName("Guest subscriber with token stored in session attributes from CONNECT is permitted")
    void testOrderTopic_GuestTokenFromSessionAttributes_Permitted() {
        String guestToken = "session-attr-guest-token";
        GuestSession session = new GuestSession();
        session.setSessionToken(guestToken);
        session.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));

        when(guestSessionRepository.findBySessionToken(guestToken)).thenReturn(Optional.of(session));
        when(orderRepository.findByIdAndGuestSessionId("ord-12345", session.getId())).thenReturn(Optional.of(new Order()));

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/orders/ord-12345");
        accessor.setSessionId("sess-5");
        Map<String, Object> sessionAttributes = new HashMap<>();
        sessionAttributes.put("guestToken", guestToken);
        accessor.setSessionAttributes(sessionAttributes);

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, null);
        assertNotNull(result, "Guest token from session attributes should be permitted");
    }

    @Test
    @DisplayName("Customer trying to subscribe to another customer's order is rejected")
    void testOrderTopic_OtherCustomerOrder_Rejected() {
        String orderId = "ord-victim";
        String attackerUserId = "user-attacker";

        when(orderRepository.findByIdAndUserId(orderId, attackerUserId)).thenReturn(Optional.empty());

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/orders/" + orderId);
        accessor.setSessionId("sess-6");
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                attackerUserId, null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(message, null));
    }

    @Test
    @DisplayName("Customer subscribing to their own order is permitted")
    void testOrderTopic_OwnCustomerOrder_Permitted() {
        String orderId = "ord-own";
        String customerId = "user-valid";

        when(orderRepository.findByIdAndUserId(orderId, customerId)).thenReturn(Optional.of(new Order()));

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/orders/" + orderId);
        accessor.setSessionId("sess-7");
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                customerId, null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, null);
        assertNotNull(result, "Own order subscription should be permitted");
    }

    @Test
    @DisplayName("Administrator can subscribe to any order topic")
    void testOrderTopic_Administrator_Permitted() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/orders/ord-any-123");
        accessor.setSessionId("sess-8");
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                "admin-super", null, List.of(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN"))));

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, null);
        assertNotNull(result, "Admin should be permitted to subscribe to any order");
    }

    @Test
    @DisplayName("Staff administrator can subscribe to any order topic")
    void testOrderTopic_StaffAdministrator_Permitted() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/orders/ord-any-456");
        accessor.setSessionId("sess-9");
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                "staff-1", null, List.of(new SimpleGrantedAuthority("ROLE_STAFF"))));

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, null);
        assertNotNull(result, "Staff should be permitted to subscribe to any order");
    }

    // ─────────────────────────────────────────────────────────────
    // Additional Channel Tests: Admin & User Topics
    // ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Anonymous subscriber cannot subscribe to /topic/admin/orders")
    void testAdminTopic_Anonymous_Rejected() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/admin/orders");
        accessor.setSessionId("sess-10");

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(message, null));
    }

    @Test
    @DisplayName("Regular customer cannot subscribe to /topic/admin/orders")
    void testAdminTopic_Customer_Rejected() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/admin/orders");
        accessor.setSessionId("sess-11");
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                "user-1", null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(message, null));
    }

    @Test
    @DisplayName("Customer cannot subscribe to another user's user orders topic")
    void testUserTopic_OtherUser_Rejected() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/users/target-user/orders");
        accessor.setSessionId("sess-12");
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                "attacker", null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(message, null));
    }

    @Test
    @DisplayName("Customer can subscribe to their own user orders topic")
    void testUserTopic_Self_Permitted() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/users/target-user/orders");
        accessor.setSessionId("sess-13");
        accessor.setUser(new UsernamePasswordAuthenticationToken(
                "target-user", null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, null);
        assertNotNull(result, "Customer should be permitted to subscribe to their own user orders topic");
    }
}

