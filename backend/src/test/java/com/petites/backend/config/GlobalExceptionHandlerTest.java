package com.petites.backend.config;

import com.petites.backend.checkout.exception.CheckoutAvailabilityException;
import com.petites.backend.chatbot.exception.RateLimitExceededException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler exceptionHandler;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
    }

    @Test
    @DisplayName("IllegalStateException is translated to HTTP 400 Bad Request with exception message")
    void testHandleIllegalState() {
        IllegalStateException ex = new IllegalStateException("Cannot cancel an already completed order");

        ResponseEntity<GlobalExceptionHandler.ApiError> response = exceptionHandler.handleIllegalState(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(400, response.getBody().status());
        assertEquals("Cannot cancel an already completed order", response.getBody().message());
    }

    @Test
    @DisplayName("IllegalArgumentException is translated to HTTP 400 Bad Request with exception message")
    void testHandleIllegalArgument() {
        IllegalArgumentException ex = new IllegalArgumentException("Invalid product id");

        ResponseEntity<GlobalExceptionHandler.ApiError> response = exceptionHandler.handleIllegalArgument(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(400, response.getBody().status());
        assertEquals("Invalid product id", response.getBody().message());
    }

    @Test
    @DisplayName("CheckoutAvailabilityException is translated to HTTP 400 with field errors")
    void testHandleCheckoutAvailability() {
        CheckoutAvailabilityException ex = new CheckoutAvailabilityException("Insufficient stock",
                Map.of("productId", "Only 2 units left"));

        ResponseEntity<GlobalExceptionHandler.ApiError> response = exceptionHandler.handleCheckoutAvailability(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(400, response.getBody().status());
        assertEquals("Insufficient stock", response.getBody().message());
        assertEquals("Only 2 units left", response.getBody().fields().get("productId"));
    }

    @Test
    @DisplayName("RateLimitExceededException is translated to HTTP 429 Too Many Requests")
    void testHandleRateLimitExceeded() {
        RateLimitExceededException ex = new RateLimitExceededException("Too many requests");

        ResponseEntity<GlobalExceptionHandler.ApiError> response = exceptionHandler.handleRateLimitExceeded(ex);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(429, response.getBody().status());
        assertEquals("Too many requests", response.getBody().message());
    }

    @Test
    @DisplayName("AccessDeniedException is translated to HTTP 403 Forbidden")
    void testHandleAccessDenied() {
        AccessDeniedException ex = new AccessDeniedException("Forbidden");

        ResponseEntity<GlobalExceptionHandler.ApiError> response = exceptionHandler.handleAccessDenied(ex);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(403, response.getBody().status());
    }

    @Test
    @DisplayName("AuthenticationException is translated to HTTP 401 Unauthorized")
    void testHandleAuthentication() {
        BadCredentialsException ex = new BadCredentialsException("Bad credentials");

        ResponseEntity<GlobalExceptionHandler.ApiError> response = exceptionHandler.handleAuthentication(ex);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(401, response.getBody().status());
    }

    @Test
    @DisplayName("MaxUploadSizeExceededException is translated to HTTP 400 Bad Request")
    void testHandleMaxUploadSize() {
        MaxUploadSizeExceededException ex = new MaxUploadSizeExceededException(10 * 1024 * 1024);

        ResponseEntity<GlobalExceptionHandler.ApiError> response = exceptionHandler.handleMaxUploadSize(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(400, response.getBody().status());
    }

    @Test
    @DisplayName("NoHandlerFoundException is translated to HTTP 404 Not Found")
    void testHandleNoHandlerFound() {
        NoHandlerFoundException ex = new NoHandlerFoundException("GET", "/api/orders/123/status", new HttpHeaders());

        ResponseEntity<GlobalExceptionHandler.ApiError> response = exceptionHandler.handleNotFound(ex);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(404, response.getBody().status());
    }

    @Test
    @DisplayName("NoResourceFoundException is translated to HTTP 404 Not Found")
    void testHandleNoResourceFound() {
        NoResourceFoundException ex = new NoResourceFoundException(HttpMethod.GET, "/api/nonexistent");

        ResponseEntity<GlobalExceptionHandler.ApiError> response = exceptionHandler.handleNotFound(ex);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(404, response.getBody().status());
    }

    @Test
    @DisplayName("HttpRequestMethodNotSupportedException is translated to HTTP 405 Method Not Allowed")
    void testHandleMethodNotSupported() {
        HttpRequestMethodNotSupportedException ex = new HttpRequestMethodNotSupportedException("POST", Set.of("GET"));

        ResponseEntity<GlobalExceptionHandler.ApiError> response = exceptionHandler.handleMethodNotSupported(ex);

        assertEquals(HttpStatus.METHOD_NOT_ALLOWED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(405, response.getBody().status());
    }

    @Test
    @DisplayName("Unhandled Exception is translated to HTTP 500 Internal Server Error")
    void testHandleUnhandled() {
        RuntimeException ex = new RuntimeException("Unexpected database glitch");

        ResponseEntity<GlobalExceptionHandler.ApiError> response = exceptionHandler.handleUnhandled(ex);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(500, response.getBody().status());
        assertEquals("Unexpected error", response.getBody().message());
    }
}
