package com.petites.backend.auth.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.petites.backend.auth.entity.GuestSession;

public interface GuestSessionRepository extends JpaRepository<GuestSession, String> {

    Optional<GuestSession> findBySessionToken(String sessionToken);
}
