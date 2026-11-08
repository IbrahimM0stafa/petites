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
import com.petites.backend.addresses.entity.Address;
import com.petites.backend.addresses.repository.AddressRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
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
    private final com.petites.backend.websocket.service.OrderWebSocketService orderWebSocketService;
    private final com.petites.backend.products.service.FulfillmentService fulfillmentService;
    private final com.petites.backend.users.service.UserService userService;

    public OrderService(OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            LoyaltyService loyaltyService,
            com.petites.backend.coupons.service.CouponService couponService,
            AddressRepository addressRepository,
            com.petites.backend.websocket.service.OrderWebSocketService orderWebSocketService,
            com.petites.backend.products.service.FulfillmentService fulfillmentService,
            com.petites.backend.users.service.UserService userService) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.loyaltyService = loyaltyService;
        this.couponService = couponService;
        this.addressRepository = addressRepository;
        this.orderWebSocketService = orderWebSocketService;
        this.fulfillmentService = fulfillmentService;
        this.userService = userService;
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> listOrders(CartOwnerRef owner) {
        return toResponses(findOrders(owner));
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrder(CartOwnerRef owner, String orderId) {
        return toResponse(findOrder(owner, orderId));
    }

    @Transactional(readOnly = true)
    public Page<OrderResponse> listAllOrders(OrderStatus status, OrderType orderType, DeliveryMode deliveryMode,
            LocalDate scheduledDate, LocalDate placedDate, String orderNumber, Pageable pageable) {
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

            if (orderNumber != null && !orderNumber.isBlank()) {
                predicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("orderNumber")),
                        "%" + orderNumber.toLowerCase().trim() + "%"));
            }

            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };

        Page<Order> orderPage = orderRepository.findAll(specification, pageable);
        List<OrderResponse> responses = toResponses(orderPage.getContent());
        return new PageImpl<>(responses, pageable, orderPage.getTotalElements());
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
        return toOrderResponse(order, items, addr);
    }

    private List<OrderResponse> toResponses(List<Order> orders) {
        if (orders == null || orders.isEmpty()) {
            return Collections.emptyList();
        }

        List<String> orderIds = orders.stream().map(Order::getId).toList();

        Map<String, List<OrderItem>> itemsByOrderId = orderItemRepository.findByOrderIdInOrderByIdAsc(orderIds)
                .stream()
                .collect(Collectors.groupingBy(item -> item.getOrder().getId()));

        Set<String> addressIdsNeeded = orders.stream()
                .filter(o -> o.getDeliveryCity() == null && o.getAddressId() != null && !o.getAddressId().isBlank())
                .map(Order::getAddressId)
                .collect(Collectors.toSet());

        Map<String, Address> addressMap = addressIdsNeeded.isEmpty()
                ? Collections.emptyMap()
                : addressRepository.findAllById(addressIdsNeeded).stream()
                        .collect(Collectors.toMap(Address::getId, a -> a, (a1, a2) -> a1));

        return orders.stream()
                .map(order -> {
                    List<OrderItemResponse> itemResponses = itemsByOrderId
                            .getOrDefault(order.getId(), Collections.emptyList())
                            .stream()
                            .map(this::toResponse)
                            .toList();

                    AddressResponse addr = buildAddressResponseFromMap(order, addressMap);
                    return toOrderResponse(order, itemResponses, addr);
                })
                .toList();
    }

    private AddressResponse buildAddressResponseFromMap(Order order, Map<String, Address> addressMap) {
        AddressResponse snapshot = buildSnapshotAddress(order);
        if (snapshot != null) {
            return snapshot;
        }

        if (order.getAddressId() != null && addressMap.containsKey(order.getAddressId())) {
            return toAddressResponse(addressMap.get(order.getAddressId()));
        }

        return null;
    }

    private OrderResponse toOrderResponse(Order order, List<OrderItemResponse> items, AddressResponse addr) {
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
                items,
                order.isCourierDelivery());
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
                item.getLineTotal());
    }

    @Transactional
    public OrderResponse updateStatus(String orderId, OrderStatus status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        if (order.getStatus() == status) {
            return toResponse(order);
        }

        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new IllegalStateException("Cannot change status of a cancelled order");
        }

        if (status == OrderStatus.CANCELLED) {
            if (order.getStatus() == OrderStatus.COMPLETED) {
                throw new IllegalStateException("Cannot cancel an already completed order");
            }

            // 1. Release reserved stock / capacity
            if (order.getItems() != null) {
                for (OrderItem item : order.getItems()) {
                    if (order.getDeliveryMode() == DeliveryMode.INSTANT) {
                        fulfillmentService.releaseInstantQuantity(item.getProductId(), item.getQuantity());
                    } else if (order.getDeliveryMode() == DeliveryMode.SCHEDULED && order.getScheduledDate() != null) {
                        fulfillmentService.releaseScheduledCapacity(item.getProductId(), order.getScheduledDate(),
                                item.getQuantity());
                    }
                }
            }

            // 2. Refund loyalty reward if applied
            if (order.isRewardApplied() && order.getUserId() != null) {
                userService.decrementRewardRedeemedCount(order.getUserId());
            }

            // 3. Release coupon usage if coupon was applied
            if (order.getCouponId() != null) {
                couponService.releaseUsage(order.getCouponId(), order.getUserId());
            }

            order.setStatus(OrderStatus.CANCELLED);
            Order saved = orderRepository.save(order);
            OrderResponse response = toResponse(saved);
            orderWebSocketService.notifyOrderStatusUpdated(response);
            return response;
        }

        boolean completionNotYetProcessed = status == OrderStatus.COMPLETED && !order.isCompletionRecorded();
        order.setStatus(status);

        if (completionNotYetProcessed) {
            if (order.getUserId() != null) {
                loyaltyService.recordCompletedOrder(order.getUserId());
            }
            order.setCompletionRecorded(true);
        }

        Order saved = orderRepository.save(order);
        OrderResponse response = toResponse(saved);
        orderWebSocketService.notifyOrderStatusUpdated(response);
        return response;
    }

    private AddressResponse buildAddressResponse(Order order) {
        AddressResponse snapshot = buildSnapshotAddress(order);
        if (snapshot != null) {
            return snapshot;
        }

        if (order.getAddressId() != null) {
            return addressRepository.findById(order.getAddressId())
                    .map(this::toAddressResponse)
                    .orElse(null);
        }

        return null;
    }

    private AddressResponse buildSnapshotAddress(Order order) {
        if (order.getDeliveryCity() == null) {
            return null;
        }
        return new AddressResponse(
                order.getAddressId(),
                order.getUserId(),
                order.getGovernorateId(),
                order.getDeliveryGovernorate(),
                order.getCityId(),
                order.getDeliveryCity(),
                order.getAreaId(),
                order.getDeliveryArea(),
                order.getDeliveryStreet(),
                order.getDeliveryBuilding(),
                order.getDeliveryNotes());
    }

    private AddressResponse toAddressResponse(Address address) {
        if (address == null) {
            return null;
        }
        return new AddressResponse(
                address.getId(),
                address.getUserId(),
                address.getGovernorateId(),
                address.getGovernorate(),
                address.getCityId(),
                address.getCity(),
                address.getAreaId(),
                address.getArea(),
                address.getStreet(),
                address.getBuilding(),
                address.getNotes());
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
