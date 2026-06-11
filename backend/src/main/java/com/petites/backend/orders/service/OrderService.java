package com.petites.backend.orders.service;

import com.petites.backend.carts.dto.CartOwnerRef;
import com.petites.backend.common.enums.DeliveryMode;
import com.petites.backend.orders.dto.OrderItemResponse;
import com.petites.backend.orders.enums.OrderStatus;
import com.petites.backend.orders.enums.OrderType;
import com.petites.backend.orders.dto.OrderResponse;
import com.petites.backend.orders.entity.Order;
import com.petites.backend.orders.entity.OrderItem;
import com.petites.backend.orders.repository.OrderItemRepository;
import com.petites.backend.orders.repository.OrderRepository;
import com.petites.backend.loyalty.service.LoyaltyService;
import com.petites.backend.addresses.dto.AddressResponse;
import com.petites.backend.addresses.repository.AddressRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.criteria.Predicate;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final LoyaltyService loyaltyService;
    private final com.petites.backend.coupons.service.CouponService couponService;
    private final AddressRepository addressRepository;

    public OrderService(OrderRepository orderRepository, OrderItemRepository orderItemRepository, LoyaltyService loyaltyService, com.petites.backend.coupons.service.CouponService couponService, AddressRepository addressRepository) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.loyaltyService = loyaltyService;
        this.couponService = couponService;
        this.addressRepository = addressRepository;
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
    public Page<OrderResponse> listAllOrders(OrderStatus status, OrderType orderType, DeliveryMode deliveryMode, LocalDate scheduledDate, LocalDate placedDate, Pageable pageable) {
        Specification<Order> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new java.util.ArrayList<>();

            if (status != null) {
                predicates.add(criteriaBuilder.equal(root.get("status"), status));
            }

            if (orderType != null) {
                predicates.add(criteriaBuilder.equal(root.get("orderType"), orderType));
            }

            if (deliveryMode != null) {
                predicates.add(criteriaBuilder.equal(root.get("deliveryMode"), deliveryMode));
            }

            if (scheduledDate != null) {
                predicates.add(criteriaBuilder.equal(root.get("scheduledDate"), scheduledDate));
            }

            if (placedDate != null) {
                ZoneId zone = ZoneId.systemDefault();
                Instant start = placedDate.atStartOfDay(zone).toInstant();
                Instant end = placedDate.plusDays(1).atStartOfDay(zone).toInstant();
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), start));
                predicates.add(criteriaBuilder.lessThan(root.get("createdAt"), end));
            }

            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };

        return orderRepository.findAll(specification, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public OrderResponse getAdminOrder(String orderId) {
        return toResponse(orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found")));
    }

    @Transactional(readOnly = true)
    public OrderResponse toResponse(Order order) {
        List<OrderItemResponse> items = orderItemRepository.findByOrderIdOrderByIdAsc(order.getId())
                .stream()
                .map(this::toResponse)
                .toList();

        AddressResponse addr = buildAddressResponse(order);

        return new OrderResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getUserId(),
                order.getGuestSessionId(),
            order.getAddressId(),
            addr,
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

        boolean completionNotYetProcessed = status == OrderStatus.COMPLETED && !order.isCompletionRecorded();
        order.setStatus(status);

        if (completionNotYetProcessed) {
            if (order.getUserId() != null) {
                loyaltyService.recordCompletedOrder(order.getUserId());
            }
            // record coupon usage when order completes
            if (order.getCouponId() != null) {
                try {
                    couponService.recordUsage(order.getCouponId(), order.getUserId());
                } catch (Exception ignored) {
                }
            }
            order.setCompletionRecorded(true);
        }

        Order saved = orderRepository.save(order);

        return toResponse(saved);
    }

    private AddressResponse buildAddressResponse(Order order) {
        if (order.getDeliveryCity() != null) {
            return new AddressResponse(
                    order.getAddressId(),
                    order.getUserId(),
                    order.getDeliveryCity(),
                    order.getDeliveryArea(),
                    order.getDeliveryStreet(),
                    order.getDeliveryBuilding(),
                    order.getDeliveryNotes()
            );
        }

        if (order.getAddressId() != null) {
            return addressRepository.findById(order.getAddressId())
                    .map(saved -> new AddressResponse(
                            saved.getId(),
                            saved.getUserId(),
                            saved.getCity(),
                            saved.getArea(),
                            saved.getStreet(),
                            saved.getBuilding(),
                            saved.getNotes()
                    ))
                    .orElse(null);
        }

        return null;
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
