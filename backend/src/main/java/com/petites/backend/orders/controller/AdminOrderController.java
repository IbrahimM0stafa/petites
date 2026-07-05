package com.petites.backend.orders.controller;

import com.petites.backend.orders.dto.OrderResponse;
import com.petites.backend.orders.enums.OrderStatus;
import com.petites.backend.orders.enums.OrderType;
import com.petites.backend.orders.service.OrderService;
import com.petites.backend.common.enums.DeliveryMode;
import java.time.LocalDate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/orders")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'STAFF')")
public class AdminOrderController {

    private final OrderService orderService;

    public AdminOrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public Page<OrderResponse> listAll(
            @RequestParam(value = "status", required = false) OrderStatus status,
            @RequestParam(value = "orderType", required = false) OrderType orderType,
            @RequestParam(value = "deliveryMode", required = false) DeliveryMode deliveryMode,
            @RequestParam(value = "scheduledDate", required = false) LocalDate scheduledDate,
            @RequestParam(value = "placedDate", required = false) LocalDate placedDate,
            @RequestParam(value = "orderNumber", required = false) String orderNumber,
            @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return orderService.listAllOrders(status, orderType, deliveryMode, scheduledDate, placedDate, orderNumber, pageable);
    }

    @GetMapping("/{id}")
    public OrderResponse get(@PathVariable String id) {
        return orderService.getAdminOrder(id);
    }
}
