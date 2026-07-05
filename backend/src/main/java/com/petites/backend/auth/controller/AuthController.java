package com.petites.backend.auth.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.petites.backend.auth.dto.AuthRequest;
import com.petites.backend.auth.dto.AuthRefreshRequest;
import com.petites.backend.auth.dto.AuthResponse;
import com.petites.backend.auth.dto.ForgotPasswordRequest;
import com.petites.backend.auth.dto.VerifyOtpRequest;
import com.petites.backend.auth.dto.ResetPasswordRequest;
import com.petites.backend.auth.service.AuthService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody AuthRequest request) {
        return authService.login(request);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody AuthRefreshRequest request) {
        return authService.refresh(request.refreshToken());
    }

    @PostMapping("/forgot-password")
    public Map<String, String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return Map.of("message", "If the email is associated with an account, an OTP has been sent.");
    }

    @PostMapping("/verify-otp")
    public Map<String, Object> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        authService.verifyOtp(request);
        return Map.of("success", true, "message", "OTP verified successfully");
    }

    @PostMapping("/reset-password")
    public Map<String, Object> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return Map.of("success", true, "message", "Password has been reset successfully");
    }
}

