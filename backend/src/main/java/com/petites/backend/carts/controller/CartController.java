package com.petites.backend.carts.controller;

import com.petites.backend.carts.dto.CartItemRequest;
import com.petites.backend.carts.dto.CartItemUpdateRequest;
import com.petites.backend.carts.dto.CartResponse;
import com.petites.backend.carts.dto.CartOwnerRef;
import com.petites.backend.carts.service.CartAccessService;
import com.petites.backend.carts.service.CartService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cart")
@Validated
public class CartController {

    private final CartService cartService;
    private final CartAccessService cartAccessService;

    public CartController(CartService cartService, CartAccessService cartAccessService) {
        this.cartService = cartService;
        this.cartAccessService = cartAccessService;
    }

    @GetMapping
    public CartResponse getCurrentCart(
            @RequestHeader(value = "X-Guest-Token", required = false) String headerToken,
            @RequestParam(value = "token", required = false) String token) {
        return cartService.getCart(resolveOwner(headerToken, token));
    }

    @PostMapping("/items")
    public CartResponse addItem(
            @RequestHeader(value = "X-Guest-Token", required = false) String headerToken,
            @RequestParam(value = "token", required = false) String token,
            @Valid @RequestBody CartItemRequest request) {
        return cartService.addItem(resolveOwner(headerToken, token), request);
    }

    @PutMapping("/items/{itemId}")
    public CartResponse updateItem(
            @RequestHeader(value = "X-Guest-Token", required = false) String headerToken,
            @RequestParam(value = "token", required = false) String token,
            @PathVariable String itemId,
            @Valid @RequestBody CartItemUpdateRequest request) {
        return cartService.updateItem(resolveOwner(headerToken, token), itemId, request);
    }

    @DeleteMapping("/items/{itemId}")
    public CartResponse removeItem(
            @RequestHeader(value = "X-Guest-Token", required = false) String headerToken,
            @RequestParam(value = "token", required = false) String token,
            @PathVariable String itemId) {
        return cartService.removeItem(resolveOwner(headerToken, token), itemId);
    }

    @DeleteMapping("/items")
    public CartResponse clearCart(
            @RequestHeader(value = "X-Guest-Token", required = false) String headerToken,
            @RequestParam(value = "token", required = false) String token) {
        return cartService.clearCart(resolveOwner(headerToken, token));
    }

    private CartOwnerRef resolveOwner(String headerToken, String token) {
        String actualToken = headerToken != null && !headerToken.isBlank() ? headerToken : token;
        return cartAccessService.resolveOwner(actualToken);
    }
}
