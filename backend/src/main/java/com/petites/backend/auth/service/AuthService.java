package com.petites.backend.auth.service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Scheduled;

import com.petites.backend.auth.dto.AuthRequest;
import com.petites.backend.auth.dto.AuthResponse;
import com.petites.backend.auth.dto.ForgotPasswordRequest;
import com.petites.backend.auth.dto.VerifyOtpRequest;
import com.petites.backend.auth.dto.ResetPasswordRequest;
import com.petites.backend.auth.entity.PasswordResetOtp;
import com.petites.backend.auth.repository.PasswordResetOtpRepository;
import com.petites.backend.users.entity.User;
import com.petites.backend.users.service.UserService;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final PasswordResetOtpRepository passwordResetOtpRepository;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(UserService userService,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       RefreshTokenService refreshTokenService,
                       PasswordResetOtpRepository passwordResetOtpRepository,
                       EmailService emailService) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.passwordResetOtpRepository = passwordResetOtpRepository;
        this.emailService = emailService;
    }

    public AuthResponse login(AuthRequest request) {
        String email = request.email() == null ? null : request.email().trim().toLowerCase();
        User user = userService.findByEmail(email)
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

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = request.email() == null ? null : request.email().trim().toLowerCase();
        User user = userService.findByEmail(email).orElse(null);

        // Silent return if user does not exist or is inactive to prevent enumeration
        if (user == null || !user.isActive()) {
            log.info("Password reset requested for non-existent or inactive email: {}", email);
            return;
        }

        // Invalidate older unused OTPs for the user
        passwordResetOtpRepository.invalidateAllActiveForUser(user, Instant.now());

        // Generate 6-digit OTP
        String otp = generateOtp();

        // Create new PasswordResetOtp record (expires in 10 minutes)
        PasswordResetOtp resetOtp = new PasswordResetOtp();
        resetOtp.setUser(user);
        resetOtp.setOtp(otp);
        resetOtp.setExpiresAt(Instant.now().plus(10, ChronoUnit.MINUTES));

        passwordResetOtpRepository.save(resetOtp);

        // Send OTP email
        emailService.sendOtpEmail(user.getEmail(), otp);
    }

    @Transactional(readOnly = true)
    public boolean verifyOtp(VerifyOtpRequest request) {
        String email = request.email() == null ? null : request.email().trim().toLowerCase();
        User user = userService.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired OTP"));

        if (!user.isActive()) {
            throw new IllegalArgumentException("Invalid or expired OTP");
        }

        passwordResetOtpRepository.findByUserAndOtpAndUsedAtIsNullAndExpiresAtAfter(user, request.otp(), Instant.now())
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired OTP"));

        return true;
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String email = request.email() == null ? null : request.email().trim().toLowerCase();
        User user = userService.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired OTP"));

        if (!user.isActive()) {
            throw new IllegalArgumentException("Invalid or expired OTP");
        }

        PasswordResetOtp resetOtp = passwordResetOtpRepository.findByUserAndOtpAndUsedAtIsNullAndExpiresAtAfter(user, request.otp(), Instant.now())
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired OTP"));

        // Mark OTP as used
        resetOtp.setUsedAt(Instant.now());
        passwordResetOtpRepository.saveAndFlush(resetOtp);

        // Update password
        userService.updatePassword(user.getId(), request.newPassword());

        // Revoke active sessions / refresh tokens
        refreshTokenService.revokeAllActiveForUser(user);
        log.info("Password reset successfully for user: {}", email);
    }

    @Scheduled(fixedDelayString = "${app.jwt.refresh-cleanup-interval-ms:3600000}")
    @Transactional
    public void cleanupExpiredOtps() {
        int deletedCount = passwordResetOtpRepository.deleteExpiredOrUsed(Instant.now());
        if (deletedCount > 0) {
            log.info("Cleaned up {} expired or used password reset OTPs", deletedCount);
        }
    }

    private String generateOtp() {
        int num = secureRandom.nextInt(900000) + 100000;
        return String.valueOf(num);
    }
}
