package com.petites.backend.carts.service;

import com.petites.backend.carts.dto.CartItemRequest;
import com.petites.backend.carts.dto.CartItemResponse;
import com.petites.backend.carts.dto.CartItemUpdateRequest;
import com.petites.backend.carts.dto.CartOwnerRef;
import com.petites.backend.carts.dto.CartResponse;
import com.petites.backend.carts.dto.CheckoutRequest;
import com.petites.backend.carts.dto.CheckoutResponse;
import com.petites.backend.carts.entity.Cart;
import com.petites.backend.carts.entity.CartItem;
import com.petites.backend.carts.enums.CartStatus;
import com.petites.backend.carts.exception.CheckoutAvailabilityException;
import com.petites.backend.carts.repository.CartItemRepository;
import com.petites.backend.carts.repository.CartRepository;
import com.petites.backend.common.enums.DeliveryMode;
import com.petites.backend.coupons.entity.Coupon;
import com.petites.backend.coupons.service.CouponService;
import com.petites.backend.orders.dto.OrderResponse;
import com.petites.backend.orders.entity.Order;
import com.petites.backend.orders.entity.OrderItem;
import com.petites.backend.orders.enums.OrderStatus;
import com.petites.backend.orders.enums.OrderType;
import com.petites.backend.orders.enums.PaymentMethod;
import com.petites.backend.orders.repository.OrderRepository;
import com.petites.backend.orders.service.OrderService;
import com.petites.backend.products.entity.Product;
import com.petites.backend.products.repository.ProductRepository;
import com.petites.backend.products.service.FulfillmentService;
import com.petites.backend.loyalty.dto.LoyaltyResponse;
import com.petites.backend.loyalty.service.LoyaltyService;
import com.petites.backend.settings.service.SettingService;
import com.petites.backend.users.entity.User;
import com.petites.backend.users.service.UserService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final FulfillmentService fulfillmentService;
    private final SettingService settingService;
    private final UserService userService;
    private final LoyaltyService loyaltyService;
    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final CouponService couponService;

    public CartService(CartRepository cartRepository,
                       CartItemRepository cartItemRepository,
                       ProductRepository productRepository,
                       FulfillmentService fulfillmentService,
                       SettingService settingService,
                       UserService userService,
                       LoyaltyService loyaltyService,
                       OrderRepository orderRepository,
                       OrderService orderService,
                       CouponService couponService) {
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.fulfillmentService = fulfillmentService;
        this.settingService = settingService;
        this.userService = userService;
        this.loyaltyService = loyaltyService;
        this.orderRepository = orderRepository;
        this.orderService = orderService;
        this.couponService = couponService;
    }

    @Transactional(readOnly = true)
    public CartResponse getCart(CartOwnerRef owner) {
        return toResponse(getOrCreateActiveCart(owner));
    }

    @Transactional
    public CartResponse addItem(CartOwnerRef owner, CartItemRequest request) {
        Cart cart = getOrCreateActiveCart(owner);
        Product product = getProduct(request.productId());
        DeliveryMode deliveryMode = request.deliveryMode();
        validateItemAvailability(product.getId(), request.quantity(), deliveryMode);

        CartItem item = cartItemRepository
            .findByCartIdAndProductIdAndDeliveryMode(cart.getId(), product.getId(), deliveryMode)
            .orElseGet(() -> createCartItem(cart, product, deliveryMode));

        item.setQuantity(item.getQuantity() + request.quantity());
        item.setUnitPrice(product.getPrice());
        cartItemRepository.save(item);
        return toResponse(cart);
    }

    @Transactional
    public CartResponse updateItem(CartOwnerRef owner, String itemId, CartItemUpdateRequest request) {
        Cart cart = getOrCreateActiveCart(owner);
        CartItem item = cartItemRepository.findByIdAndCartId(itemId, cart.getId())
                .orElseThrow(() -> new IllegalArgumentException("Cart item not found"));

        Product product = item.getProduct();
        DeliveryMode deliveryMode = request.deliveryMode();
        validateItemAvailability(product.getId(), request.quantity(), deliveryMode);

        item.setQuantity(request.quantity());
        item.setDeliveryMode(deliveryMode);
        item.setUnitPrice(product.getPrice());
        cartItemRepository.save(item);
        return toResponse(cart);
    }

    @Transactional
    public CartResponse removeItem(CartOwnerRef owner, String itemId) {
        Cart cart = getOrCreateActiveCart(owner);
        CartItem item = cartItemRepository.findByIdAndCartId(itemId, cart.getId())
                .orElseThrow(() -> new IllegalArgumentException("Cart item not found"));
        cartItemRepository.delete(item);
        return toResponse(cart);
    }

    @Transactional
    public CartResponse clearCart(CartOwnerRef owner) {
        Cart cart = getOrCreateActiveCart(owner);
        cartItemRepository.deleteByCartId(cart.getId());
        return toResponse(cart);
    }

    @Transactional
    public CheckoutResponse checkout(CartOwnerRef owner, CheckoutRequest request) {
        Cart cart = getOrCreateActiveCart(owner);
        List<CartItem> items = cartItemRepository.findByCartIdOrderByCreatedAtAsc(cart.getId());
        if (items.isEmpty()) {
            throw new IllegalArgumentException("Cart is empty");
        }

        BigDecimal cartSubtotal = items.stream()
                .map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String customerName = resolveCustomerName(owner, request.customerName());
        String customerPhone = resolveCustomerPhone(owner, request.customerPhone());
        OrderType orderType = request.orderType() == null ? OrderType.DELIVERY : request.orderType();
        BigDecimal deliveryFee = resolveDeliveryFee(orderType);
        String notes = blankToNull(request.notes());
        Coupon coupon = couponService.resolveForCheckout(blankToNull(request.couponId()), blankToNull(request.couponCode()), cartSubtotal);
        BigDecimal discountAmount = coupon == null ? BigDecimal.ZERO : couponService.calculateDiscountAmount(coupon, cartSubtotal);
        String couponId = coupon == null ? null : coupon.getId();
        LocalDate scheduledDate = request.scheduledDate() != null ? request.scheduledDate() : fulfillmentService.calculateEarliestScheduledDate();

        Map<DeliveryMode, List<CartItem>> groupedItems = new LinkedHashMap<>();
        for (CartItem item : items) {
            groupedItems.computeIfAbsent(item.getDeliveryMode(), key -> new ArrayList<>()).add(item);
        }

        // Attempt automatic loyalty reward redemption for authenticated users.
        Product rewardProduct = null;
        DeliveryMode rewardAttachMode = null;
        boolean rewardClaimed = false;
        if (owner.isUser()) {
            try {
                LoyaltyResponse loyalty = loyaltyService.getMyStatus(owner.userId());
                if (loyalty.rewardAvailable() && loyalty.rewardProductId() != null) {
                    String rewardProductId = loyalty.rewardProductId();
                    // choose attach mode: prefer INSTANT if present, otherwise first group
                    DeliveryMode attachMode = groupedItems.containsKey(DeliveryMode.INSTANT)
                            ? DeliveryMode.INSTANT
                            : (groupedItems.keySet().stream().findFirst().orElse(null));
                    if (attachMode != null) {
                        // try reserve inventory for reward according to attach mode
                        if (attachMode == DeliveryMode.INSTANT) {
                            // ensure product is still available
                            Product maybeReward = productRepository.findById(rewardProductId).orElse(null);
                            if (maybeReward != null && maybeReward.isAvailable() && fulfillmentService.isInstantAvailable(rewardProductId, 1)) {
                                fulfillmentService.reserveInstantQuantity(rewardProductId, 1);
                                rewardProduct = maybeReward;
                                rewardAttachMode = attachMode;
                                userService.incrementRewardRedeemedCount(owner.userId());
                                rewardClaimed = true;
                            }
                        } else {
                            Product maybeReward = productRepository.findById(rewardProductId).orElse(null);
                            if (maybeReward != null && maybeReward.isAvailable() && fulfillmentService.isScheduledAvailable(rewardProductId, scheduledDate, 1)) {
                                fulfillmentService.reserveScheduledCapacity(rewardProductId, scheduledDate, 1);
                                rewardProduct = maybeReward;
                                rewardAttachMode = attachMode;
                                userService.incrementRewardRedeemedCount(owner.userId());
                                rewardClaimed = true;
                            }
                        }
                    }
                }
            } catch (Exception ignored) {
                // if anything goes wrong, skip reward silently
            }
        }

        List<Order> savedOrders = new ArrayList<>();
        boolean discountApplied = false;
        boolean rewardAppliedToOrder = false;
        for (Map.Entry<DeliveryMode, List<CartItem>> entry : groupedItems.entrySet()) {
            DeliveryMode deliveryMode = entry.getKey();
            List<CartItem> groupItems = entry.getValue();
            BigDecimal subtotal = BigDecimal.ZERO;

            for (CartItem cartItem : groupItems) {
                // ensure product wasn't disabled after it was added to cart
                if (!cartItem.getProduct().isAvailable()) {
                    throw new IllegalArgumentException("Product is not available");
                }
                if (deliveryMode == DeliveryMode.INSTANT) {
                    fulfillmentService.reserveInstantQuantity(cartItem.getProduct().getId(), cartItem.getQuantity());
                } else {
                    reserveScheduledCapacityForCheckout(cartItem, scheduledDate);
                }
                subtotal = subtotal.add(cartItem.getUnitPrice().multiply(BigDecimal.valueOf(cartItem.getQuantity())));
            }

            Order order = new Order();
            order.setUserId(owner.userId());
            order.setGuestSessionId(owner.guestSessionId());
            order.setAddressId(blankToNull(request.addressId()));
            order.setDeliveryMode(deliveryMode);
            order.setOrderType(orderType);
            order.setStatus(OrderStatus.PENDING);
            order.setPaymentMethod(PaymentMethod.INSTAPAY);
            order.setSubtotal(subtotal);
            order.setDeliveryFee(deliveryFee);
            BigDecimal orderDiscount = BigDecimal.ZERO;
            if (!discountApplied && discountAmount.signum() > 0) {
                orderDiscount = discountAmount.min(subtotal.add(deliveryFee));
                discountApplied = true;
            }
            order.setDiscountAmount(orderDiscount);
            order.setTotalAmount(subtotal.add(deliveryFee).subtract(orderDiscount).max(BigDecimal.ZERO));
            order.setCustomerName(customerName);
            order.setCustomerPhone(customerPhone);
            order.setScheduledDate(deliveryMode == DeliveryMode.SCHEDULED ? scheduledDate : null);
            order.setNotes(notes);
            order.setCouponId(orderDiscount.signum() > 0 ? couponId : null);
            order.setRewardApplied(false);

            for (CartItem cartItem : groupItems) {
                OrderItem orderItem = new OrderItem();
                orderItem.setOrder(order);
                orderItem.setProductId(cartItem.getProduct().getId());
                orderItem.setProductName(cartItem.getProduct().getName());
                orderItem.setProductImage(cartItem.getProduct().getMainImage());
                orderItem.setQuantity(cartItem.getQuantity());
                orderItem.setUnitPrice(cartItem.getUnitPrice());
                orderItem.setLineTotal(cartItem.getUnitPrice().multiply(BigDecimal.valueOf(cartItem.getQuantity())));
                order.getItems().add(orderItem);
            }

            // attach reward product to the first matching order if claimed
            if (rewardClaimed && !rewardAppliedToOrder && rewardAttachMode == deliveryMode && rewardProduct != null) {
                OrderItem rewardItem = new OrderItem();
                rewardItem.setOrder(order);
                rewardItem.setProductId(rewardProduct.getId());
                rewardItem.setProductName(rewardProduct.getName());
                rewardItem.setProductImage(rewardProduct.getMainImage());
                rewardItem.setQuantity(1);
                rewardItem.setUnitPrice(BigDecimal.ZERO);
                rewardItem.setLineTotal(BigDecimal.ZERO);
                order.getItems().add(rewardItem);
                order.setRewardApplied(true);
                rewardAppliedToOrder = true;
            }

            savedOrders.add(orderRepository.save(order));
        }

        cartItemRepository.deleteByCartId(cart.getId());
        cart.setStatus(CartStatus.ORDERED);
        cartRepository.save(cart);

        List<OrderResponse> responses = savedOrders.stream().map(orderService::toResponse).toList();
        BigDecimal totalAmount = responses.stream()
                .map(OrderResponse::totalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new CheckoutResponse(cart.getId(), responses, totalAmount);
    }

    @Transactional(readOnly = true)
    public CartResponse toResponse(Cart cart) {
        List<CartItemResponse> items = cartItemRepository.findByCartIdOrderByCreatedAtAsc(cart.getId())
                .stream()
                .map(this::toResponse)
                .toList();

        BigDecimal subtotal = items.stream()
                .map(CartItemResponse::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new CartResponse(
                cart.getId(),
                cart.getUserId(),
                cart.getGuestSessionId(),
                cart.getStatus(),
                cart.getCreatedAt(),
                subtotal,
                items
        );
    }

    @Transactional(readOnly = true)
    public CartItemResponse toResponse(CartItem item) {
        BigDecimal lineTotal = item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
        return new CartItemResponse(
                item.getId(),
                item.getProduct().getId(),
                item.getProduct().getName(),
                item.getProduct().getMainImage(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getDeliveryMode(),
                lineTotal
        );
    }

    private Cart getOrCreateActiveCart(CartOwnerRef owner) {
        Cart cart = findActiveCart(owner).orElseGet(() -> {
            Cart created = new Cart();
            created.setUserId(owner.userId());
            created.setGuestSessionId(owner.guestSessionId());
            created.setStatus(CartStatus.ACTIVE);
            return cartRepository.save(created);
        });

        if (cart.getStatus() != CartStatus.ACTIVE) {
            cart.setStatus(CartStatus.ACTIVE);
            cart = cartRepository.save(cart);
        }

        return cart;
    }

    private java.util.Optional<Cart> findActiveCart(CartOwnerRef owner) {
        if (owner.isUser()) {
            return cartRepository.findByUserIdAndStatus(owner.userId(), CartStatus.ACTIVE);
        }
        if (owner.isGuest()) {
            return cartRepository.findByGuestSessionIdAndStatus(owner.guestSessionId(), CartStatus.ACTIVE);
        }
        throw new IllegalArgumentException("Cart owner is required");
    }

    private CartItem createCartItem(Cart cart, Product product, DeliveryMode deliveryMode) {
        CartItem item = new CartItem();
        item.setCart(cart);
        item.setProduct(product);
        item.setQuantity(0);
        item.setUnitPrice(product.getPrice());
        item.setDeliveryMode(deliveryMode);
        return item;
    }

    private Product getProduct(String productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));
    }

    private void validateItemAvailability(String productId, int quantity, DeliveryMode deliveryMode) {
        // ensure product is still marked available by admin
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));
        if (!product.isAvailable()) {
            throw new IllegalArgumentException("Product is not available");
        }

        if (deliveryMode == DeliveryMode.INSTANT) {
            if (!fulfillmentService.isInstantAvailable(productId, quantity)) {
                throw new IllegalArgumentException("Instant delivery inventory is not sufficient");
            }
        }
    }

    private void reserveScheduledCapacityForCheckout(CartItem cartItem, LocalDate scheduledDate) {
        Product product = cartItem.getProduct();
        int availableQuantity = fulfillmentService.getScheduledAvailableQuantity(product.getId(), scheduledDate);
        if (availableQuantity < cartItem.getQuantity()) {
            throw scheduledCapacityException(product, scheduledDate, cartItem.getQuantity(), availableQuantity);
        }

        try {
            fulfillmentService.reserveScheduledCapacity(product.getId(), scheduledDate, cartItem.getQuantity());
        } catch (IllegalArgumentException ex) {
            int latestAvailableQuantity = fulfillmentService.getScheduledAvailableQuantity(product.getId(), scheduledDate);
            throw scheduledCapacityException(product, scheduledDate, cartItem.getQuantity(), latestAvailableQuantity);
        }
    }

    private CheckoutAvailabilityException scheduledCapacityException(
            Product product,
            LocalDate scheduledDate,
            int requestedQuantity,
            int availableQuantity
    ) {
        String message = "%s has only %d available for %s. Requested quantity: %d."
                .formatted(product.getName(), availableQuantity, scheduledDate, requestedQuantity);
        int dailyCapacity = fulfillmentService.getScheduledDailyCapacity(product.getId());

        return new CheckoutAvailabilityException(message, Map.of(
                "productId", product.getId(),
                "productName", product.getName(),
                "scheduledDate", scheduledDate.toString(),
                "requestedQuantity", String.valueOf(requestedQuantity),
                "availableQuantity", String.valueOf(availableQuantity),
                "dailyCapacity", String.valueOf(dailyCapacity)
        ));
    }

    private String resolveCustomerName(CartOwnerRef owner, String customerName) {
        if (customerName != null && !customerName.isBlank()) {
            return customerName.trim();
        }
        if (owner.isUser()) {
            return userService.findById(owner.userId())
                    .map(User::getName)
                    .orElseThrow(() -> new IllegalArgumentException("Customer name is required"));
        }
        throw new IllegalArgumentException("Customer name is required");
    }

    private String resolveCustomerPhone(CartOwnerRef owner, String customerPhone) {
        if (customerPhone != null && !customerPhone.isBlank()) {
            return customerPhone.trim();
        }
        if (owner.isUser()) {
            return userService.findById(owner.userId())
                    .map(User::getPhone)
                    .orElseThrow(() -> new IllegalArgumentException("Customer phone is required"));
        }
        throw new IllegalArgumentException("Customer phone is required");
    }

    private BigDecimal resolveDeliveryFee(OrderType orderType) {
        if (orderType == OrderType.PICKUP) {
            return BigDecimal.ZERO;
        }
        return new BigDecimal(settingService.getSetting("delivery_fee", "50"));
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
