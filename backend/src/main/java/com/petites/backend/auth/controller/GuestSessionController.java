package com.petites.backend.auth.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.petites.backend.auth.dto.GuestSessionCreateRequest;
import com.petites.backend.auth.dto.GuestSessionResponse;
import com.petites.backend.auth.service.GuestSessionService;

@RestController
@RequestMapping("/api/guest-sessions")
@Validated
public class GuestSessionController {

    private final GuestSessionService guestSessionService;

    public GuestSessionController(GuestSessionService guestSessionService) {
        this.guestSessionService = guestSessionService;
    }

    @PostMapping
    public ResponseEntity<GuestSessionResponse> create(@RequestBody(required = false) GuestSessionCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(guestSessionService.create(request));
    }

    @GetMapping("/current")
    public GuestSessionResponse current(
            @RequestHeader(value = "X-Guest-Token", required = false) String headerToken,
            @RequestParam(value = "token", required = false) String token
    ) {
        String actualToken = headerToken != null ? headerToken : token;
        if (actualToken == null || actualToken.isBlank()) {
            throw new IllegalArgumentException("Guest token is required");
        }
        return guestSessionService.getCurrent(actualToken);
    }
}
