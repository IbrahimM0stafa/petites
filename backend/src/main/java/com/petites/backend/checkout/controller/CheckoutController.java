package com.petites.backend.checkout.controller;

import com.petites.backend.carts.service.CartAccessService;
import com.petites.backend.checkout.dto.CheckoutRequest;
import com.petites.backend.checkout.dto.CheckoutResponse;
import com.petites.backend.checkout.service.CheckoutService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/checkout")
public class CheckoutController {

    private final CheckoutService checkoutService;
    private final CartAccessService cartAccessService;

    public CheckoutController(CheckoutService checkoutService, CartAccessService cartAccessService) {
        this.checkoutService = checkoutService;
        this.cartAccessService = cartAccessService;
    }

    @PostMapping
    public CheckoutResponse checkout(
            @RequestHeader(value = "X-Guest-Token", required = false) String headerToken,
            @RequestParam(value = "token", required = false) String token,
            @Valid @RequestBody CheckoutRequest request) {
        return checkoutService.checkout(cartAccessService.resolveOwner(headerToken, token), request);
    }
}
