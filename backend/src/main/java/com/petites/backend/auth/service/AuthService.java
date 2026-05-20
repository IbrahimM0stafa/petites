package com.petites.backend.auth.service;

import java.util.Set;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.petites.backend.auth.dto.AuthRequest;
import com.petites.backend.auth.dto.AuthResponse;
import com.petites.backend.users.entity.User;
import com.petites.backend.users.service.UserService;

@Service
public class AuthService {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    public AuthService(UserService userService,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       RefreshTokenService refreshTokenService) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
    }

    public AuthResponse login(AuthRequest request) {
        User user = userService.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (!user.isActive()) {
            throw new IllegalArgumentException("User is inactive");
        }

        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        JwtService.JwtToken token = jwtService.issueToken(user);
        refreshTokenService.revokeAllActiveForUser(user);
        RefreshTokenService.RefreshTokenResult refresh = refreshTokenService.issue(user);
        Set<String> roles = user.getRoles().stream().map(role -> role.getName()).collect(java.util.stream.Collectors.toSet());

        return new AuthResponse(token.token(), token.expiresAt(), refresh.token(), refresh.expiresAt(), user.getId(), roles);
    }

    @Transactional
    public AuthResponse refresh(String refreshToken) {
        RefreshTokenService.RefreshTokenResult refresh = refreshTokenService.rotate(refreshToken);
        User user = userService.findById(refresh.userId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        JwtService.JwtToken token = jwtService.issueToken(user);
        Set<String> roles = user.getRoles().stream()
                .map(role -> role.getName())
                .collect(java.util.stream.Collectors.toSet());

        return new AuthResponse(token.token(), token.expiresAt(), refresh.token(), refresh.expiresAt(), user.getId(), roles);
    }
}
