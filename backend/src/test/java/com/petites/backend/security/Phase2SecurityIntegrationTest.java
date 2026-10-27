package com.petites.backend.security;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.petites.backend.auth.dto.ForgotPasswordRequest;
import com.petites.backend.auth.dto.ResetPasswordRequest;
import com.petites.backend.auth.dto.VerifyOtpRequest;
import com.petites.backend.auth.entity.PasswordResetOtp;
import com.petites.backend.auth.repository.PasswordResetOtpRepository;
import com.petites.backend.auth.repository.RefreshTokenRepository;
import com.petites.backend.auth.service.AuthService;
import com.petites.backend.auth.service.RefreshTokenService;
import com.petites.backend.users.dto.UserResponse;
import com.petites.backend.users.dto.UserUpdateRequest;
import com.petites.backend.users.entity.Role;
import com.petites.backend.users.entity.User;
import com.petites.backend.users.repository.RoleRepository;
import com.petites.backend.users.repository.UserRepository;
import com.petites.backend.users.service.UserService;

@SpringBootTest
class Phase2SecurityIntegrationTest {

    @Autowired
    private UserService userService;

    @Autowired
    private AuthService authService;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordResetOtpRepository otpRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User superAdminUser;
    private User staffUser;
    private User staffUser2;
    private User customerUser;

    @BeforeEach
    void setUpUsers() {
        cleanUp();

        Role superAdminRole = roleRepository.findByName("SUPER_ADMIN")
                .orElseGet(() -> roleRepository.save(new Role("SUPER_ADMIN")));
        Role staffRole = roleRepository.findByName("STAFF")
                .orElseGet(() -> roleRepository.save(new Role("STAFF")));
        Role userRole = roleRepository.findByName("USER")
                .orElseGet(() -> roleRepository.save(new Role("USER")));

        superAdminUser = createUser("superadmin-test@petites.com", "Super Admin", Set.of(superAdminRole));
        staffUser = createUser("staff-test@petites.com", "Staff One", Set.of(staffRole));
        staffUser2 = createUser("staff2-test@petites.com", "Staff Two", Set.of(staffRole));
        customerUser = createUser("customer-p2@petites.com", "Customer Test", Set.of(userRole));
    }

    @AfterEach
    void tearDown() {
        cleanUp();
    }

    private void cleanUp() {
        List<String> emails = List.of(
                "superadmin-test@petites.com",
                "staff-test@petites.com",
                "staff2-test@petites.com",
                "customer-p2@petites.com"
        );
        for (String email : emails) {
            userRepository.findByEmail(email).ifPresent(user -> {
                refreshTokenRepository.findAll().stream()
                        .filter(t -> t.getUser().getId().equals(user.getId()))
                        .forEach(refreshTokenRepository::delete);
                otpRepository.findAll().stream()
                        .filter(o -> o.getUser().getId().equals(user.getId()))
                        .forEach(otpRepository::delete);
                userRepository.delete(user);
            });
        }
    }

    private User createUser(String email, String name, Set<Role> roles) {
        User user = new User();
        user.setEmail(email);
        user.setName(name);
        user.setPhone("01000000000");
        user.setPasswordHash(passwordEncoder.encode("Password123!"));
        user.setActive(true);
        user.getRoles().addAll(roles);
        return userRepository.save(user);
    }

    // --- SEC-05: Administrative Security & Permission Guardrails ---

    @Test
    @DisplayName("SEC-05: Staff cannot deactivate a Super Admin account")
    void testStaffCannotDeactivateSuperAdmin() {
        AccessDeniedException ex = Assertions.assertThrows(
                AccessDeniedException.class,
                () -> userService.setActive(superAdminUser.getId(), false, staffUser.getId())
        );
        Assertions.assertTrue(ex.getMessage().contains("Superadmin accounts cannot be deactivated"));
    }

    @Test
    @DisplayName("SEC-05: Super Admin cannot deactivate their own account")
    void testSuperAdminCannotDeactivateSelf() {
        IllegalArgumentException ex = Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> userService.setActive(superAdminUser.getId(), false, superAdminUser.getId())
        );
        Assertions.assertTrue(ex.getMessage().contains("Superadmin cannot deactivate their own account"));
    }

    @Test
    @DisplayName("SEC-05: Staff cannot deactivate other Staff accounts")
    void testStaffCannotDeactivateOtherStaff() {
        AccessDeniedException ex = Assertions.assertThrows(
                AccessDeniedException.class,
                () -> userService.setActive(staffUser2.getId(), false, staffUser.getId())
        );
        Assertions.assertTrue(ex.getMessage().contains("Only superadmin can deactivate staff accounts"));
    }

    @Test
    @DisplayName("SEC-05: Staff can deactivate a customer account")
    void testStaffCanDeactivateCustomer() {
        UserResponse response = userService.setActive(customerUser.getId(), false, staffUser.getId());
        Assertions.assertFalse(response.active());

        User updated = userRepository.findById(customerUser.getId()).orElseThrow();
        Assertions.assertFalse(updated.isActive());
    }

    @Test
    @DisplayName("SEC-05: Staff cannot reactivate administrative accounts")
    void testStaffCannotReactivateAdministrativeAccounts() {
        // First deactivate staffUser2 via Super Admin
        userService.setActive(staffUser2.getId(), false, superAdminUser.getId());

        AccessDeniedException ex = Assertions.assertThrows(
                AccessDeniedException.class,
                () -> userService.setActive(staffUser2.getId(), true, staffUser.getId())
        );
        Assertions.assertTrue(ex.getMessage().contains("Only superadmin can reactivate administrative accounts"));
    }

    @Test
    @DisplayName("SEC-05: Staff cannot modify Super Admin or other Staff accounts")
    void testStaffCannotModifyAdministrativeAccounts() {
        UserUpdateRequest updateRequest = new UserUpdateRequest("Hacked Name", "9999999999", null);

        AccessDeniedException ex1 = Assertions.assertThrows(
                AccessDeniedException.class,
                () -> userService.update(superAdminUser.getId(), updateRequest, staffUser.getId())
        );
        Assertions.assertTrue(ex1.getMessage().contains("Staff cannot modify other staff or superadmin accounts"));

        AccessDeniedException ex2 = Assertions.assertThrows(
                AccessDeniedException.class,
                () -> userService.update(staffUser2.getId(), updateRequest, staffUser.getId())
        );
        Assertions.assertTrue(ex2.getMessage().contains("Staff cannot modify other staff or superadmin accounts"));
    }

    @Test
    @DisplayName("SEC-05: Staff can modify their own profile")
    void testStaffCanModifyOwnProfile() {
        UserUpdateRequest updateRequest = new UserUpdateRequest("Updated Staff Name", "1112223333", null);
        UserResponse response = userService.update(staffUser.getId(), updateRequest, staffUser.getId());
        Assertions.assertEquals("Updated Staff Name", response.name());
    }

    // --- SEC-03: OTP Brute-Force Rate Limiting & Lockout ---

    @Test
    @DisplayName("SEC-03: OTP is locked and invalidated after 5 failed verification attempts")
    void testOtpInvalidatedAfterFiveFailedAttempts() {
        authService.forgotPassword(new ForgotPasswordRequest(customerUser.getEmail()));

        List<PasswordResetOtp> otps = otpRepository.findAll().stream()
                .filter(o -> o.getUser().getId().equals(customerUser.getId()) && o.getUsedAt() == null && o.getExpiresAt().isAfter(Instant.now()))
                .toList();
        Assertions.assertFalse(otps.isEmpty());
        PasswordResetOtp initialOtp = otps.get(0);
        String correctOtp = initialOtp.getOtp();
        String wrongOtp = correctOtp.equals("123456") ? "654321" : "123456";

        // Attempts 1 to 4: fail with "Invalid or expired OTP"
        for (int i = 1; i <= 4; i++) {
            final int attempt = i;
            IllegalArgumentException ex = Assertions.assertThrows(
                    IllegalArgumentException.class,
                    () -> authService.verifyOtp(new VerifyOtpRequest(customerUser.getEmail(), wrongOtp))
            );
            Assertions.assertEquals("Invalid or expired OTP", ex.getMessage());

            PasswordResetOtp currentOtp = otpRepository.findById(initialOtp.getId()).orElseThrow();
            Assertions.assertEquals(attempt, currentOtp.getFailedAttempts());
            Assertions.assertNull(currentOtp.getUsedAt());
        }

        // 5th attempt: triggers invalidation and lockout message
        IllegalArgumentException lockoutEx = Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> authService.verifyOtp(new VerifyOtpRequest(customerUser.getEmail(), wrongOtp))
        );
        Assertions.assertEquals("Too many failed attempts. OTP has been invalidated.", lockoutEx.getMessage());

        // Verify row is marked used
        PasswordResetOtp invalidatedOtp = otpRepository.findById(initialOtp.getId()).orElseThrow();
        Assertions.assertEquals(5, invalidatedOtp.getFailedAttempts());
        Assertions.assertNotNull(invalidatedOtp.getUsedAt(), "OTP must be marked used/invalidated");

        // Now even providing the CORRECT OTP should be rejected
        IllegalArgumentException correctAfterLockout = Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> authService.verifyOtp(new VerifyOtpRequest(customerUser.getEmail(), correctOtp))
        );
        Assertions.assertEquals("Invalid or expired OTP", correctAfterLockout.getMessage());
    }

    @Test
    @DisplayName("SEC-03: Correct OTP verification and reset succeeds within attempt limit")
    void testSuccessfulOtpVerificationAndReset() {
        authService.forgotPassword(new ForgotPasswordRequest(customerUser.getEmail()));

        List<PasswordResetOtp> otps = otpRepository.findAll().stream()
                .filter(o -> o.getUser().getId().equals(customerUser.getId()) && o.getUsedAt() == null && o.getExpiresAt().isAfter(Instant.now()))
                .toList();
        Assertions.assertFalse(otps.isEmpty());
        String correctOtp = otps.get(0).getOtp();

        // 1 wrong attempt
        String wrongOtp = correctOtp.equals("111111") ? "222222" : "111111";
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                authService.verifyOtp(new VerifyOtpRequest(customerUser.getEmail(), wrongOtp))
        );

        // Correct OTP succeeds
        boolean verified = authService.verifyOtp(new VerifyOtpRequest(customerUser.getEmail(), correctOtp));
        Assertions.assertTrue(verified);

        // Reset password succeeds
        authService.resetPassword(new ResetPasswordRequest(customerUser.getEmail(), correctOtp, "BrandNewPassword123!"));
        User updated = userRepository.findById(customerUser.getId()).orElseThrow();
        Assertions.assertTrue(passwordEncoder.matches("BrandNewPassword123!", updated.getPasswordHash()));
    }

    // --- SEC-04: Refresh Token Rotation & Single-Use Serialization ---

    @Test
    @DisplayName("SEC-04: Refresh token rotation serializes correctly and rejects revoked tokens")
    void testRefreshTokenRotationRejectsRevocation() {
        var issueResult = refreshTokenService.issue(customerUser);
        String rawToken = issueResult.token();

        // First rotation succeeds
        var rotatedResult = refreshTokenService.rotate(rawToken);
        Assertions.assertNotNull(rotatedResult);
        Assertions.assertNotEquals(rawToken, rotatedResult.token());

        // Reusing the rotated (revoked) token must immediately fail
        IllegalArgumentException ex = Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> refreshTokenService.rotate(rawToken)
        );
        Assertions.assertEquals("Refresh token revoked", ex.getMessage());
    }
}
