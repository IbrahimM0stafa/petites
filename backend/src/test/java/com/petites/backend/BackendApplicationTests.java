package com.petites.backend;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.petites.backend.auth.dto.AuthRequest;
import com.petites.backend.auth.dto.AuthResponse;
import com.petites.backend.auth.dto.ForgotPasswordRequest;
import com.petites.backend.auth.dto.ResetPasswordRequest;
import com.petites.backend.auth.dto.VerifyOtpRequest;
import com.petites.backend.auth.entity.PasswordResetOtp;
import com.petites.backend.auth.repository.RefreshTokenRepository;
import com.petites.backend.auth.repository.PasswordResetOtpRepository;
import com.petites.backend.users.dto.UserCreateRequest;
import com.petites.backend.users.entity.User;
import com.petites.backend.users.repository.UserRepository;
import com.petites.backend.users.service.UserService;
import com.petites.backend.auth.service.AuthService;

import java.time.Instant;
import java.util.List;

@SpringBootTest
class BackendApplicationTests {

	@Autowired
	private UserService userService;
	@Autowired
	private AuthService authService;
	@Autowired
	private PasswordResetOtpRepository otpRepository;
	@Autowired
	private RefreshTokenRepository refreshTokenRepository;
	@Autowired
	private UserRepository userRepository;
	@Autowired
	private PasswordEncoder passwordEncoder;

	@Test
	void contextLoads() {
	}

	@Test
	void testPasswordResetFlow() {
		String email = "customer-test@petites.com";
		userRepository.findByEmail(email).ifPresent(user -> {
			refreshTokenRepository.findAll().stream()
					.filter(t -> t.getUser().getId().equals(user.getId()))
					.forEach(refreshTokenRepository::delete);
			otpRepository.findAll().stream()
					.filter(o -> o.getUser().getId().equals(user.getId()))
					.forEach(otpRepository::delete);
			userRepository.delete(user);
		});

		UserCreateRequest createRequest = new UserCreateRequest(
				"Customer Test",
				"1234567890",
				email,
				"oldPassword123"
		);
		userService.create(createRequest);

		// Request OTP
		authService.forgotPassword(new ForgotPasswordRequest(email));

		User user = userRepository.findByEmail(email).get();
		List<PasswordResetOtp> otps = otpRepository.findAll().stream()
				.filter(o -> o.getUser().getId().equals(user.getId()) && o.getUsedAt() == null && o.getExpiresAt().isAfter(Instant.now()))
				.toList();
		Assertions.assertFalse(otps.isEmpty(), "OTP should have been created");
		String otpCode = otps.get(0).getOtp();

		// Verify OTP
		boolean verified = authService.verifyOtp(new VerifyOtpRequest(email, otpCode));
		Assertions.assertTrue(verified, "OTP should be verified");

		// Reset password
		authService.resetPassword(new ResetPasswordRequest(email, otpCode, "newPassword123"));

		// Try logging in with the new password
		AuthResponse loginResponse = authService.login(new AuthRequest(email, "newPassword123"));
		Assertions.assertNotNull(loginResponse, "Login should succeed with the new password");

		// Clean up
		refreshTokenRepository.findAll().stream()
				.filter(t -> t.getUser().getId().equals(user.getId()))
				.forEach(refreshTokenRepository::delete);
		otpRepository.findAll().stream()
				.filter(o -> o.getUser().getId().equals(user.getId()))
				.forEach(otpRepository::delete);
		userRepository.delete(user);
	}

}

