package com.petites.backend.auth.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.petites.backend.auth.dto.GuestSessionCreateRequest;
import com.petites.backend.auth.dto.GuestSessionResponse;
import com.petites.backend.auth.entity.GuestSession;
import com.petites.backend.auth.repository.GuestSessionRepository;

@Service
public class GuestSessionService {

    private final GuestSessionRepository guestSessionRepository;
    private final long ttlHours;

    public GuestSessionService(GuestSessionRepository guestSessionRepository,
                               @Value("${app.guest-session.ttl-hours:168}") long ttlHours) {
        this.guestSessionRepository = guestSessionRepository;
        this.ttlHours = ttlHours;
    }

    @Transactional
    public GuestSessionResponse create(GuestSessionCreateRequest request) {
        GuestSession session = new GuestSession();
        Instant expiresAt = request == null ? null : request.expiresAt();
        if (expiresAt == null) {
            expiresAt = Instant.now().plus(ttlHours, ChronoUnit.HOURS);
        }
        session.setExpiresAt(expiresAt);

        return toResponse(guestSessionRepository.save(session));
    }

    @Transactional(readOnly = true)
    public GuestSessionResponse getCurrent(String token) {
        GuestSession session = guestSessionRepository.findBySessionToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Guest session not found"));

        if (session.getExpiresAt() != null && session.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Guest session expired");
        }

        return toResponse(session);
    }

    private GuestSessionResponse toResponse(GuestSession session) {
        return new GuestSessionResponse(
                session.getId(),
                session.getSessionToken(),
                session.getExpiresAt(),
                session.getCreatedAt()
        );
    }
}
