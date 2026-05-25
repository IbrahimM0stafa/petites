package com.petites.backend.carts.controller;

import com.petites.backend.carts.dto.CartOwnerRef;
import com.petites.backend.carts.dto.CheckoutRequest;
import com.petites.backend.carts.dto.CheckoutResponse;
import com.petites.backend.carts.service.CartAccessService;
import com.petites.backend.carts.service.CartService;
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

    private final CartService cartService;
    private final CartAccessService cartAccessService;

    public CheckoutController(CartService cartService, CartAccessService cartAccessService) {
        this.cartService = cartService;
        this.cartAccessService = cartAccessService;
    }

    @PostMapping
    public CheckoutResponse checkout(
            @RequestHeader(value = "X-Guest-Token", required = false) String headerToken,
            @RequestParam(value = "token", required = false) String token,
            @Valid @RequestBody CheckoutRequest request) {
        return cartService.checkout(resolveOwner(headerToken, token), request);
    }

    private CartOwnerRef resolveOwner(String headerToken, String token) {
        String actualToken = headerToken != null && !headerToken.isBlank() ? headerToken : token;
        return cartAccessService.resolveOwner(actualToken);
    }
}
