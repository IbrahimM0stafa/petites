package com.petites.backend.auth.service;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.petites.backend.auth.dto.ResetPasswordRequest;
import com.petites.backend.auth.dto.VerifyOtpRequest;
import com.petites.backend.auth.entity.PasswordResetOtp;
import com.petites.backend.auth.repository.PasswordResetOtpRepository;
import com.petites.backend.users.entity.User;
import com.petites.backend.users.service.UserService;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserService userService;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @Mock
    private RefreshTokenService refreshTokenService;
    @Mock
    private PasswordResetOtpRepository passwordResetOtpRepository;
    @Mock
    private EmailService emailService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userService,
                passwordEncoder,
                jwtService,
                refreshTokenService,
                passwordResetOtpRepository,
                emailService);
    }

    private User createActiveUser(String email) {
        User user = new User();
        assignId(user, "usr-100");
        user.setEmail(email);
        user.setActive(true);
        return user;
    }

    private PasswordResetOtp createOtp(User user, String otpCode, int failedAttempts) {
        PasswordResetOtp otp = new PasswordResetOtp();
        assignId(otp, "otp-100");
        otp.setUser(user);
        otp.setOtp(otpCode);
        otp.setFailedAttempts(failedAttempts);
        otp.setExpiresAt(Instant.now().plusSeconds(600));
        return otp;
    }

    private void assignId(Object entity, String id) {
        Class<?> currentType = entity.getClass();
        Field field = null;
        while (currentType != null && field == null) {
            try {
                field = currentType.getDeclaredField("id");
            } catch (NoSuchFieldException ignored) {
                currentType = currentType.getSuperclass();
            }
        }
        if (field != null) {
            field.setAccessible(true);
            try {
                field.set(entity, id);
            } catch (IllegalAccessException e) {
                throw new RuntimeException(e);
            }
        }
    }

    @Test
    @DisplayName("Verify OTP returns true when user and OTP are valid")
    void testVerifyOtp_Success() {
        User user = createActiveUser("customer@example.com");
        PasswordResetOtp otp = createOtp(user, "123456", 0);

        when(userService.findByEmail("customer@example.com")).thenReturn(Optional.of(user));
        when(passwordResetOtpRepository.findActiveForUpdateByUser(eq(user), any(Instant.class)))
                .thenReturn(List.of(otp));

        boolean result = authService.verifyOtp(new VerifyOtpRequest("customer@example.com", "123456"));
        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("Verify OTP throws when email does not exist")
    void testVerifyOtp_UserNotFound() {
        when(userService.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.verifyOtp(new VerifyOtpRequest("unknown@example.com", "123456")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid or expired OTP");
    }

    @Test
    @DisplayName("Verify OTP throws when user is inactive")
    void testVerifyOtp_InactiveUser() {
        User user = createActiveUser("inactive@example.com");
        user.setActive(false);

        when(userService.findByEmail("inactive@example.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.verifyOtp(new VerifyOtpRequest("inactive@example.com", "123456")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid or expired OTP");
    }

    @Test
    @DisplayName("Verify OTP throws when no active OTP exists")
    void testVerifyOtp_NoActiveOtp() {
        User user = createActiveUser("customer@example.com");
        when(userService.findByEmail("customer@example.com")).thenReturn(Optional.of(user));
        when(passwordResetOtpRepository.findActiveForUpdateByUser(eq(user), any(Instant.class)))
                .thenReturn(List.of());

        assertThatThrownBy(() -> authService.verifyOtp(new VerifyOtpRequest("customer@example.com", "123456")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid or expired OTP");
    }

    @Test
    @DisplayName("Verify OTP invalidates and throws when OTP already reached failed attempt limit")
    void testVerifyOtp_AlreadyLocked() {
        User user = createActiveUser("customer@example.com");
        PasswordResetOtp otp = createOtp(user, "123456", 5);

        when(userService.findByEmail("customer@example.com")).thenReturn(Optional.of(user));
        when(passwordResetOtpRepository.findActiveForUpdateByUser(eq(user), any(Instant.class)))
                .thenReturn(List.of(otp));

        assertThatThrownBy(() -> authService.verifyOtp(new VerifyOtpRequest("customer@example.com", "123456")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Too many failed attempts. OTP has been invalidated.");

        assertThat(otp.getUsedAt()).isNotNull();
        verify(passwordResetOtpRepository).saveAndFlush(otp);
    }

    @Test
    @DisplayName("Verify OTP increments failed attempts on code mismatch")
    void testVerifyOtp_WrongCode_IncrementsAttempts() {
        User user = createActiveUser("customer@example.com");
        PasswordResetOtp otp = createOtp(user, "123456", 1);

        when(userService.findByEmail("customer@example.com")).thenReturn(Optional.of(user));
        when(passwordResetOtpRepository.findActiveForUpdateByUser(eq(user), any(Instant.class)))
                .thenReturn(List.of(otp));

        assertThatThrownBy(() -> authService.verifyOtp(new VerifyOtpRequest("customer@example.com", "999999")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid or expired OTP");

        assertThat(otp.getFailedAttempts()).isEqualTo(2);
        verify(passwordResetOtpRepository).saveAndFlush(otp);
    }

    @Test
    @DisplayName("Verify OTP locks code when wrong code causes attempt count to reach 5")
    void testVerifyOtp_WrongCode_ReachesLockThreshold() {
        User user = createActiveUser("customer@example.com");
        PasswordResetOtp otp = createOtp(user, "123456", 4);

        when(userService.findByEmail("customer@example.com")).thenReturn(Optional.of(user));
        when(passwordResetOtpRepository.findActiveForUpdateByUser(eq(user), any(Instant.class)))
                .thenReturn(List.of(otp));

        assertThatThrownBy(() -> authService.verifyOtp(new VerifyOtpRequest("customer@example.com", "999999")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Too many failed attempts. OTP has been invalidated.");

        assertThat(otp.getFailedAttempts()).isEqualTo(5);
        assertThat(otp.getUsedAt()).isNotNull();
        verify(passwordResetOtpRepository).saveAndFlush(otp);
    }

    @Test
    @DisplayName("Reset password validates OTP, marks as used, updates password, and revokes tokens")
    void testResetPassword_Success() {
        User user = createActiveUser("customer@example.com");
        PasswordResetOtp otp = createOtp(user, "123456", 0);

        when(userService.findByEmail("customer@example.com")).thenReturn(Optional.of(user));
        when(passwordResetOtpRepository.findActiveForUpdateByUser(eq(user), any(Instant.class)))
                .thenReturn(List.of(otp));

        authService.resetPassword(new ResetPasswordRequest("customer@example.com", "123456", "NewSecurePassword123!"));

        assertThat(otp.getUsedAt()).isNotNull();
        verify(passwordResetOtpRepository).saveAndFlush(otp);
        verify(userService).updatePassword("usr-100", "NewSecurePassword123!");
        verify(refreshTokenService).revokeAllActiveForUser(user);
    }
}