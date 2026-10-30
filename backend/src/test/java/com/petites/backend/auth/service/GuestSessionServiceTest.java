package com.petites.backend.auth.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.petites.backend.auth.dto.GuestSessionCreateRequest;
import com.petites.backend.auth.dto.GuestSessionResponse;
import com.petites.backend.auth.entity.GuestSession;
import com.petites.backend.auth.repository.GuestSessionRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GuestSessionServiceTest {

    @Mock
    private GuestSessionRepository guestSessionRepository;

    private GuestSessionService guestSessionService;

    private static final long TTL_HOURS = 168L;

    @BeforeEach
    void setUp() {
        guestSessionService = new GuestSessionService(guestSessionRepository, TTL_HOURS);
    }

    @Test
    @DisplayName("create() calculates expiration strictly on server according to configured TTL")
    void testCreate_WithoutRequest_SetsServerTtl() {
        when(guestSessionRepository.save(any(GuestSession.class))).thenAnswer(inv -> inv.getArgument(0));

        Instant before = Instant.now().plus(TTL_HOURS, ChronoUnit.HOURS).minus(5, ChronoUnit.SECONDS);
        GuestSessionResponse response = guestSessionService.create();
        Instant after = Instant.now().plus(TTL_HOURS, ChronoUnit.HOURS).plus(5, ChronoUnit.SECONDS);

        assertNotNull(response);
        assertNotNull(response.expiresAt());
        assertTrue(response.expiresAt().isAfter(before));
        assertTrue(response.expiresAt().isBefore(after));

        ArgumentCaptor<GuestSession> captor = ArgumentCaptor.forClass(GuestSession.class);
        verify(guestSessionRepository).save(captor.capture());
        GuestSession captured = captor.getValue();
        assertNotNull(captured.getExpiresAt());
        assertTrue(captured.getExpiresAt().isAfter(before));
        assertTrue(captured.getExpiresAt().isBefore(after));
    }

    @Test
    @DisplayName("create(request) ignores arbitrary client-provided expiresAt in the future")
    void testCreate_WithClientSuppliedExpiresAt_IgnoresClientValue() {
        when(guestSessionRepository.save(any(GuestSession.class))).thenAnswer(inv -> inv.getArgument(0));

        // Malicious or misconfigured client sends year 2099
        Instant arbitraryFuture = Instant.now().plus(3650, ChronoUnit.DAYS);
        GuestSessionCreateRequest request = new GuestSessionCreateRequest(arbitraryFuture);

        Instant before = Instant.now().plus(TTL_HOURS, ChronoUnit.HOURS).minus(5, ChronoUnit.SECONDS);
        GuestSessionResponse response = guestSessionService.create(request);
        Instant after = Instant.now().plus(TTL_HOURS, ChronoUnit.HOURS).plus(5, ChronoUnit.SECONDS);

        assertNotNull(response);
        // Expiration MUST be bounded to server TTL, NOT the arbitrary future date
        assertTrue(response.expiresAt().isBefore(after), "Server must not honor client arbitrary future date");
        assertTrue(response.expiresAt().isAfter(before));
    }

    @Test
    @DisplayName("getCurrent: returns active session when not expired")
    void testGetCurrent_ValidActiveSession() {
        GuestSession session = new GuestSession();
        session.setSessionToken("token-active");
        session.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));

        when(guestSessionRepository.findBySessionToken("token-active")).thenReturn(Optional.of(session));

        GuestSessionResponse response = guestSessionService.getCurrent("token-active");
        assertNotNull(response);
        assertEquals("token-active", response.sessionToken());
    }

    @Test
    @DisplayName("getCurrent: throws IllegalArgumentException when session is expired")
    void testGetCurrent_ExpiredSession_Throws() {
        GuestSession session = new GuestSession();
        session.setSessionToken("token-expired");
        session.setExpiresAt(Instant.now().minus(1, ChronoUnit.HOURS));

        when(guestSessionRepository.findBySessionToken("token-expired")).thenReturn(Optional.of(session));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            guestSessionService.getCurrent("token-expired");
        });
        assertEquals("Guest session expired", ex.getMessage());
    }

    @Test
    @DisplayName("getCurrent: session with null expiresAt but recent createdAt is permitted")
    void testGetCurrent_NullExpiresAt_RecentCreatedAt_Permitted() {
        GuestSession session = new GuestSession();
        session.setSessionToken("token-null-expiry-recent");
        session.setExpiresAt(null);
        try {
            java.lang.reflect.Field createdAtField = GuestSession.class.getDeclaredField("createdAt");
            createdAtField.setAccessible(true);
            createdAtField.set(session, Instant.now().minus(1, ChronoUnit.HOURS));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        when(guestSessionRepository.findBySessionToken("token-null-expiry-recent")).thenReturn(Optional.of(session));

        GuestSessionResponse response = guestSessionService.getCurrent("token-null-expiry-recent");
        assertNotNull(response);
    }

    @Test
    @DisplayName("getCurrent: session with null expiresAt and ancient createdAt is rejected")
    void testGetCurrent_NullExpiresAt_AncientCreatedAt_Rejected() {
        GuestSession session = new GuestSession();
        session.setSessionToken("token-null-expiry-old");
        session.setExpiresAt(null);
        try {
            java.lang.reflect.Field createdAtField = GuestSession.class.getDeclaredField("createdAt");
            createdAtField.setAccessible(true);
            createdAtField.set(session, Instant.now().minus(200, ChronoUnit.HOURS));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        when(guestSessionRepository.findBySessionToken("token-null-expiry-old")).thenReturn(Optional.of(session));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            guestSessionService.getCurrent("token-null-expiry-old");
        });
        assertEquals("Guest session expired", ex.getMessage());
    }

    @Test
    @DisplayName("getCurrent: session with null expiresAt and null createdAt is rejected")
    void testGetCurrent_NullExpiresAt_NullCreatedAt_Rejected() {
        GuestSession session = new GuestSession();
        session.setSessionToken("token-null-all");
        session.setExpiresAt(null);

        when(guestSessionRepository.findBySessionToken("token-null-all")).thenReturn(Optional.of(session));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            guestSessionService.getCurrent("token-null-all");
        });
        assertEquals("Guest session expired", ex.getMessage());
    }

    @Test
    @DisplayName("getCurrent: session not found throws IllegalArgumentException")
    void testGetCurrent_NotFound_Throws() {
        when(guestSessionRepository.findBySessionToken("unknown")).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            guestSessionService.getCurrent("unknown");
        });
        assertEquals("Guest session not found", ex.getMessage());
    }

    @Test
    @DisplayName("cleanupExpiredSessions: calls repository deleteExpired")
    void testCleanupExpiredSessions() {
        guestSessionService.cleanupExpiredSessions();
        verify(guestSessionRepository).deleteExpired(any(Instant.class));
    }
}

