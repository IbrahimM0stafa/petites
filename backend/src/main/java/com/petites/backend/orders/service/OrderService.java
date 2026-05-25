package com.petites.backend.orders.service;

import com.petites.backend.carts.dto.CartOwnerRef;
import com.petites.backend.orders.dto.OrderItemResponse;
import com.petites.backend.orders.enums.OrderStatus;
import com.petites.backend.orders.dto.OrderResponse;
import com.petites.backend.orders.entity.Order;
import com.petites.backend.orders.entity.OrderItem;
import com.petites.backend.orders.repository.OrderItemRepository;
import com.petites.backend.orders.repository.OrderRepository;
import com.petites.backend.loyalty.service.LoyaltyService;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final LoyaltyService loyaltyService;

    public OrderService(OrderRepository orderRepository, OrderItemRepository orderItemRepository, LoyaltyService loyaltyService) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.loyaltyService = loyaltyService;
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> listOrders(CartOwnerRef owner) {
        return findOrders(owner).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrder(CartOwnerRef owner, String orderId) {
        return toResponse(findOrder(owner, orderId));
    }

    @Transactional(readOnly = true)
    public OrderResponse toResponse(Order order) {
        List<OrderItemResponse> items = orderItemRepository.findByOrderIdOrderByIdAsc(order.getId())
                .stream()
                .map(this::toResponse)
                .toList();

        return new OrderResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getUserId(),
                order.getGuestSessionId(),
                order.getAddressId(),
                order.getDeliveryMode(),
                order.getOrderType(),
                order.getStatus(),
                order.getPaymentMethod(),
                order.getSubtotal(),
                order.getDeliveryFee(),
                order.getDiscountAmount(),
                order.getTotalAmount(),
                order.getCustomerName(),
                order.getCustomerPhone(),
                order.getScheduledDate(),
                order.getNotes(),
                order.getCouponId(),
                order.isRewardApplied(),
                order.getCreatedAt(),
                items
        );
    }

    @Transactional(readOnly = true)
    public OrderItemResponse toResponse(OrderItem item) {
        return new OrderItemResponse(
                item.getId(),
                item.getProductId(),
                item.getProductName(),
                item.getProductImage(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getLineTotal()
        );
    }

    @Transactional
    public OrderResponse updateStatus(String orderId, OrderStatus status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        OrderStatus previousStatus = order.getStatus();
        order.setStatus(status);
        Order saved = orderRepository.save(order);

        if (previousStatus != OrderStatus.COMPLETED && status == OrderStatus.COMPLETED && saved.getUserId() != null) {
            loyaltyService.recordCompletedOrder(saved.getUserId());
        }

        return toResponse(saved);
    }

    private List<Order> findOrders(CartOwnerRef owner) {
        if (owner.isUser()) {
            return orderRepository.findByUserIdOrderByCreatedAtDesc(owner.userId());
        }
        if (owner.isGuest()) {
            return orderRepository.findByGuestSessionIdOrderByCreatedAtDesc(owner.guestSessionId());
        }
        throw new IllegalArgumentException("Order owner is required");
    }

    private Order findOrder(CartOwnerRef owner, String orderId) {
        if (owner.isUser()) {
            return orderRepository.findByIdAndUserId(orderId, owner.userId())
                    .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        }
        if (owner.isGuest()) {
            return orderRepository.findByIdAndGuestSessionId(orderId, owner.guestSessionId())
                    .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        }
        throw new IllegalArgumentException("Order owner is required");
    }
}
