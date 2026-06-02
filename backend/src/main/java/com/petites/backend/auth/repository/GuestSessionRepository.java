package com.petites.backend.auth.repository;

import java.util.Optional;
import java.time.Instant;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.petites.backend.auth.entity.GuestSession;

public interface GuestSessionRepository extends JpaRepository<GuestSession, String> {

    Optional<GuestSession> findBySessionToken(String sessionToken);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM GuestSession session WHERE session.expiresAt < :now")
    int deleteExpired(@Param("now") Instant now);
}
