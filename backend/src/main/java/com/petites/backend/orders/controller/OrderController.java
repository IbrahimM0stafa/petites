package com.petites.backend.orders.controller;

import com.petites.backend.carts.dto.CartOwnerRef;
import com.petites.backend.carts.service.CartAccessService;
import com.petites.backend.orders.dto.OrderStatusUpdateRequest;
import com.petites.backend.orders.dto.OrderResponse;
import com.petites.backend.orders.service.OrderService;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestHeader;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;
    private final CartAccessService cartAccessService;

    public OrderController(OrderService orderService, CartAccessService cartAccessService) {
        this.orderService = orderService;
        this.cartAccessService = cartAccessService;
    }

    @GetMapping
    public List<OrderResponse> list(
            @RequestHeader(value = "X-Guest-Token", required = false) String headerToken,
            @RequestParam(value = "token", required = false) String token) {
        return orderService.listOrders(resolveOwner(headerToken, token));
    }

    @GetMapping("/{id}")
    public OrderResponse get(
            @RequestHeader(value = "X-Guest-Token", required = false) String headerToken,
            @RequestParam(value = "token", required = false) String token,
            @PathVariable String id) {
        return orderService.getOrder(resolveOwner(headerToken, token), id);
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'STAFF')")
    public OrderResponse updateStatus(@PathVariable String id, @RequestBody OrderStatusUpdateRequest request) {
        return orderService.updateStatus(id, request.status());
    }

    private CartOwnerRef resolveOwner(String headerToken, String token) {
        String actualToken = headerToken != null && !headerToken.isBlank() ? headerToken : token;
        return cartAccessService.resolveOwner(actualToken);
    }
}
