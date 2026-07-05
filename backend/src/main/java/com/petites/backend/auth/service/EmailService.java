package com.petites.backend.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final String fromEmail;
    private final boolean isDev;

    public EmailService(JavaMailSender mailSender,
                        @Value("${app.mail.from:noreply@petites.com}") String fromEmail,
                        @Value("${spring.profiles.active:dev}") String activeProfile) {
        this.mailSender = mailSender;
        this.fromEmail = fromEmail;
        this.isDev = activeProfile != null && activeProfile.toLowerCase().contains("dev");
    }

    public void sendOtpEmail(String toEmail, String otp) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Password Reset OTP - Petites");
            message.setText("Hello,\n\n"
                    + "You requested a password reset. Please use the following One-Time Password (OTP) to complete the verification:\n\n"
                    + otp + "\n\n"
                    + "This OTP is valid for 10 minutes. If you did not request a password reset, you can safely ignore this email.\n\n"
                    + "Best regards,\n"
                    + "Petites Team");
            mailSender.send(message);
            log.info("OTP email successfully sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}", toEmail, e);
            if (isDev) {
                log.warn("\n==================================================\n"
                       + "  DEVELOPER NOTICE (SMTP CONNECTION FAILED)\n"
                       + "  Failed to send SMTP email, but dev bypass is active.\n"
                       + "  Use the following OTP code to test your reset wizard:\n"
                       + "  === OTP CODE: {} ===\n"
                       + "==================================================\n", otp);
                return; // Suppress exception to allow local developer testing without mail server
            }
            throw new RuntimeException("Failed to send email verification code", e);
        }
    }
}
