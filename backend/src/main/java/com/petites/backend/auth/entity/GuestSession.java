package com.petites.backend.auth.entity;

import java.time.Instant;
import java.util.UUID;

import com.petites.backend.common.model.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "guest_sessions",
    indexes = {
        @Index(name = "idx_guest_sessions_expires_at", columnList = "expires_at")
    },
    uniqueConstraints = {
        @UniqueConstraint(columnNames = "session_token")
    })
public class GuestSession extends BaseEntity {

    @Column(name = "session_token", length = 255, nullable = false)
    private String sessionToken;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "created_at")
    private Instant createdAt;

    @PrePersist
    protected void ensureDefaults() {
        if (sessionToken == null || sessionToken.isBlank()) {
            sessionToken = UUID.randomUUID().toString();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public String getSessionToken() {
        return sessionToken;
    }

    public void setSessionToken(String sessionToken) {
        this.sessionToken = sessionToken;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
