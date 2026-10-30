package com.petites.backend.orders;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.petites.backend.carts.dto.CartItemRequest;
import com.petites.backend.carts.dto.CartOwnerRef;
import com.petites.backend.carts.dto.CheckoutRequest;
import com.petites.backend.carts.dto.CheckoutResponse;
import com.petites.backend.carts.entity.Cart;
import com.petites.backend.carts.entity.CartItem;
import com.petites.backend.carts.enums.CartStatus;
import com.petites.backend.carts.repository.CartItemRepository;
import com.petites.backend.carts.repository.CartRepository;
import com.petites.backend.carts.service.CartService;
import com.petites.backend.categories.entity.Category;
import com.petites.backend.categories.repository.CategoryRepository;
import com.petites.backend.common.enums.DeliveryMode;
import com.petites.backend.coupons.entity.Coupon;
import com.petites.backend.coupons.enums.DiscountType;
import com.petites.backend.coupons.repository.CouponRepository;
import com.petites.backend.coupons.repository.CouponUsageRepository;
import com.petites.backend.coupons.service.CouponService;
import com.petites.backend.orders.dto.OrderResponse;
import com.petites.backend.orders.entity.Order;
import com.petites.backend.orders.entity.OrderItem;
import com.petites.backend.orders.enums.OrderStatus;
import com.petites.backend.orders.enums.OrderType;
import com.petites.backend.orders.repository.OrderItemRepository;
import com.petites.backend.orders.repository.OrderRepository;
import com.petites.backend.orders.service.OrderService;
import com.petites.backend.products.entity.InstantDeliveryInventory;
import com.petites.backend.products.entity.Product;
import com.petites.backend.products.entity.ProductDailyCapacityUsage;
import com.petites.backend.products.entity.ProductFulfillment;
import com.petites.backend.products.repository.InstantDeliveryInventoryRepository;
import com.petites.backend.products.repository.ProductDailyCapacityUsageRepository;
import com.petites.backend.products.repository.ProductFulfillmentRepository;
import com.petites.backend.products.repository.ProductRepository;
import com.petites.backend.products.service.FulfillmentService;
import com.petites.backend.users.entity.Role;
import com.petites.backend.users.entity.User;
import com.petites.backend.users.repository.RoleRepository;
import com.petites.backend.users.repository.UserRepository;
import com.petites.backend.users.service.UserService;

@SpringBootTest
class Phase3BusinessIntegrityIntegrationTest {

    @Autowired
    private FulfillmentService fulfillmentService;

    @Autowired
    private ProductDailyCapacityUsageRepository capacityUsageRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductFulfillmentRepository fulfillmentRepository;

    @Autowired
    private InstantDeliveryInventoryRepository instantInventoryRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private CouponRepository couponRepository;

    @Autowired
    private CouponUsageRepository couponUsageRepository;

    @Autowired
    private CouponService couponService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private OrderService orderService;

    @Autowired
    private CartService cartService;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    private Category testCategory;
    private Product scheduledProduct;
    private Product instantProduct;
    private User testUser;
    private final List<String> createdOrderIds = new ArrayList<>();
    private final List<String> createdCouponIds = new ArrayList<>();
    private final List<String> createdCartIds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        cleanTestEntities();

        testCategory = new Category();
        testCategory.setName("Phase3 Test Category " + UUID.randomUUID());
        testCategory = categoryRepository.save(testCategory);

        scheduledProduct = new Product();
        scheduledProduct.setName("Scheduled Cake " + UUID.randomUUID());
        scheduledProduct.setPrice(BigDecimal.valueOf(100));
        scheduledProduct.setCategory(testCategory);
        scheduledProduct.setAvailable(true);
        scheduledProduct = productRepository.save(scheduledProduct);

        ProductFulfillment schedFulfillment = new ProductFulfillment();
        schedFulfillment.setProduct(scheduledProduct);
        schedFulfillment.setDailyCapacity(5);
        fulfillmentRepository.save(schedFulfillment);

        instantProduct = new Product();
        instantProduct.setName("Instant Pastry " + UUID.randomUUID());
        instantProduct.setPrice(BigDecimal.valueOf(50));
        instantProduct.setCategory(testCategory);
        instantProduct.setAvailable(true);
        instantProduct = productRepository.save(instantProduct);

        ProductFulfillment instantFulfillment = new ProductFulfillment();
        instantFulfillment.setProduct(instantProduct);
        fulfillmentRepository.save(instantFulfillment);

        InstantDeliveryInventory inventory = new InstantDeliveryInventory();
        inventory.setProduct(instantProduct);
        inventory.setAvailableQuantity(10);
        inventory.setAvailableUntil(Instant.now().plus(2, ChronoUnit.DAYS));
        inventory.setActive(true);
        instantInventoryRepository.save(inventory);

        Role userRole = roleRepository.findByName("USER")
                .orElseGet(() -> roleRepository.save(new Role("USER")));
        testUser = new User();
        testUser.setEmail("phase3-user@petites.com");
        testUser.setName("Phase3 User");
        testUser.setPhone("01011112222");
        testUser.setPasswordHash("hashedpwd");
        testUser.setActive(true);
        testUser.getRoles().add(userRole);
        testUser = userRepository.save(testUser);
    }

    @AfterEach
    void tearDown() {
        cleanTestEntities();
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    private void cleanTestEntities() {
        for (String orderId : createdOrderIds) {
            orderItemRepository.findByOrderIdOrderByIdAsc(orderId).forEach(orderItemRepository::delete);
            orderRepository.findById(orderId).ifPresent(orderRepository::delete);
        }
        createdOrderIds.clear();

        for (String couponId : createdCouponIds) {
            couponUsageRepository.findAll().stream()
                    .filter(u -> couponId.equals(u.getCouponId()))
                    .forEach(couponUsageRepository::delete);
            couponRepository.findById(couponId).ifPresent(couponRepository::delete);
        }
        createdCouponIds.clear();

        if (testUser != null && testUser.getId() != null) {
            cartRepository.findByUserIdAndStatus(testUser.getId(), CartStatus.ACTIVE).ifPresent(c -> {
                cartItemRepository.findByCartIdOrderByCreatedAtAsc(c.getId()).forEach(cartItemRepository::delete);
                cartRepository.delete(c);
            });
        }
        for (String cartId : createdCartIds) {
            cartRepository.findById(cartId).ifPresent(c -> {
                cartItemRepository.findByCartIdOrderByCreatedAtAsc(c.getId()).forEach(cartItemRepository::delete);
                cartRepository.delete(c);
            });
        }
        createdCartIds.clear();

        if (scheduledProduct != null && scheduledProduct.getId() != null) {
            capacityUsageRepository.findAll().stream()
                    .filter(u -> u.getProduct() != null && scheduledProduct.getId().equals(u.getProduct().getId()))
                    .forEach(capacityUsageRepository::delete);
            fulfillmentRepository.findByProductId(scheduledProduct.getId()).ifPresent(fulfillmentRepository::delete);
            productRepository.findById(scheduledProduct.getId()).ifPresent(productRepository::delete);
        }
        if (instantProduct != null && instantProduct.getId() != null) {
            instantInventoryRepository.findByProductId(instantProduct.getId()).ifPresent(instantInventoryRepository::delete);
            fulfillmentRepository.findByProductId(instantProduct.getId()).ifPresent(fulfillmentRepository::delete);
            productRepository.findById(instantProduct.getId()).ifPresent(productRepository::delete);
        }
        if (testCategory != null && testCategory.getId() != null) {
            categoryRepository.findById(testCategory.getId()).ifPresent(categoryRepository::delete);
        }
        userRepository.findByEmail("phase3-user@petites.com").ifPresent(userRepository::delete);
    }

    // --- COR-01: Scheduled Capacity TOCTOU & Concurrency Tests ---

    @Test
    @DisplayName("COR-01: Concurrent reservations on uninitialized date serialize cleanly with ON CONFLICT DO NOTHING")
    void testConcurrentScheduledCapacityReservationOnUninitializedDate() throws Exception {
        LocalDate targetDate = LocalDate.now().plusDays(15);
        int threads = 5;
        ExecutorService executor = Executors.newFixedThreadPool(threads);

        List<Callable<Boolean>> tasks = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            tasks.add(() -> {
                try {
                    fulfillmentService.reserveScheduledCapacity(scheduledProduct.getId(), targetDate, 1);
                    return true;
                } catch (Exception e) {
                    return false;
                }
            });
        }

        List<Future<Boolean>> futures = executor.invokeAll(tasks);
        executor.shutdown();

        int successfulBookings = 0;
        for (Future<Boolean> future : futures) {
            if (future.get()) {
                successfulBookings++;
            }
        }

        Assertions.assertEquals(5, successfulBookings, "All 5 concurrent 1-slot bookings should succeed without duplicate key errors");

        ProductDailyCapacityUsage usage = capacityUsageRepository
                .findByProductIdAndProductionDate(scheduledProduct.getId(), targetDate)
                .orElseThrow();
        Assertions.assertEquals(5, usage.getReservedQuantity());
    }

    @Test
    @DisplayName("COR-01: Capacity overbooking is rejected under pessimistic lock")
    void testCapacityOverbookingRejected() {
        LocalDate targetDate = LocalDate.now().plusDays(20);
        // Reserve 4 slots (capacity is 5)
        fulfillmentService.reserveScheduledCapacity(scheduledProduct.getId(), targetDate, 4);

        // Try reserving 2 slots -> exceeds capacity (4 + 2 > 5)
        IllegalArgumentException ex = Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> fulfillmentService.reserveScheduledCapacity(scheduledProduct.getId(), targetDate, 2)
        );
        Assertions.assertTrue(ex.getMessage().contains("exceeds capacity"));

        ProductDailyCapacityUsage usage = capacityUsageRepository
                .findByProductIdAndProductionDate(scheduledProduct.getId(), targetDate)
                .orElseThrow();
        Assertions.assertEquals(4, usage.getReservedQuantity(), "Reserved quantity must remain 4");
    }

    // --- COR-03: Single-Use Coupon Limit Enforcement at Checkout ---

    @Test
    @DisplayName("COR-03: Single-use coupon usage is recorded at checkout in PENDING status, preventing reuse")
    void testSingleUseCouponUsageRecordedAtCheckout() {
        Coupon coupon = new Coupon();
        coupon.setCode("ONEUSE100");
        coupon.setDiscountType(DiscountType.FIXED);
        coupon.setDiscountValue(BigDecimal.valueOf(20));
        coupon.setUsageLimit(1);
        coupon.setActive(true);
        coupon.setStartsAt(Instant.now().minusSeconds(3600));
        coupon = couponRepository.save(coupon);
        createdCouponIds.add(coupon.getId());

        // Authenticate test user in security context
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(testUser.getId(), null, java.util.Collections.emptyList())
        );

        CartOwnerRef owner = CartOwnerRef.forUser(testUser.getId());
        cartService.addItem(owner, new CartItemRequest(instantProduct.getId(), 1, DeliveryMode.INSTANT));

        CheckoutRequest checkoutRequest = new CheckoutRequest(
                "Customer Test",
                "01011112222",
                OrderType.PICKUP,
                null,
                "Test notes",
                coupon.getId(),
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        CheckoutResponse checkoutResponse = cartService.checkout(owner, checkoutRequest);
        Assertions.assertNotNull(checkoutResponse);
        Assertions.assertFalse(checkoutResponse.orders().isEmpty());
        createdOrderIds.add(checkoutResponse.orders().get(0).orderId());
        Assertions.assertEquals(OrderStatus.PENDING, checkoutResponse.orders().get(0).status());

        // Coupon usedCount must be immediately 1
        Coupon usedCoupon = couponRepository.findById(coupon.getId()).orElseThrow();
        Assertions.assertEquals(1, usedCoupon.getUsedCount());

        // Attempting a second checkout with the same coupon must fail
        cartService.addItem(owner, new CartItemRequest(instantProduct.getId(), 1, DeliveryMode.INSTANT));
        IllegalArgumentException ex = Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> cartService.checkout(owner, checkoutRequest)
        );
        Assertions.assertTrue(ex.getMessage().toLowerCase().contains("coupon") || ex.getMessage().toLowerCase().contains("usage"));
    }

    // --- COR-02: Order Cancellation Resource, Stock, Capacity & Reward Release ---

    @Test
    @DisplayName("COR-02: Cancelling order releases instant inventory, coupon usage, and loyalty rewards")
    void testOrderCancellationReleasesResources() {
        Coupon coupon = new Coupon();
        coupon.setCode("REFUNDME");
        coupon.setDiscountType(DiscountType.FIXED);
        coupon.setDiscountValue(BigDecimal.valueOf(10));
        coupon.setUsageLimit(1);
        coupon.setActive(true);
        coupon = couponRepository.save(coupon);
        createdCouponIds.add(coupon.getId());

        couponService.recordUsage(coupon.getId(), testUser.getId());
        userService.incrementRewardRedeemedCount(testUser.getId());
        fulfillmentService.reserveInstantQuantity(instantProduct.getId(), 2);

        InstantDeliveryInventory invBefore = instantInventoryRepository.findByProductId(instantProduct.getId()).orElseThrow();
        Assertions.assertEquals(8, invBefore.getAvailableQuantity());

        Order order = new Order();
        order.setOrderNumber("ORD-P3-TEST-1");
        order.setUserId(testUser.getId());
        order.setStatus(OrderStatus.PENDING);
        order.setDeliveryMode(DeliveryMode.INSTANT);
        order.setOrderType(OrderType.PICKUP);
        order.setSubtotal(BigDecimal.valueOf(100));
        order.setTotalAmount(BigDecimal.valueOf(90));
        order.setCouponId(coupon.getId());
        order.setRewardApplied(true);

        OrderItem item = new OrderItem();
        item.setOrder(order);
        item.setProductId(instantProduct.getId());
        item.setProductName(instantProduct.getName());
        item.setQuantity(2);
        item.setUnitPrice(BigDecimal.valueOf(50));
        item.setLineTotal(BigDecimal.valueOf(100));
        order.getItems().add(item);

        Order savedOrder = orderRepository.save(order);
        createdOrderIds.add(savedOrder.getId());

        // Cancel the order
        OrderResponse cancelledResponse = orderService.updateStatus(savedOrder.getId(), OrderStatus.CANCELLED);
        Assertions.assertEquals(OrderStatus.CANCELLED, cancelledResponse.status());

        // 1. Instant stock refunded to 10
        InstantDeliveryInventory invAfter = instantInventoryRepository.findByProductId(instantProduct.getId()).orElseThrow();
        Assertions.assertEquals(10, invAfter.getAvailableQuantity());

        // 2. Coupon usedCount refunded to 0
        Coupon refundedCoupon = couponRepository.findById(coupon.getId()).orElseThrow();
        Assertions.assertEquals(0, refundedCoupon.getUsedCount());

        // 3. Loyalty reward refunded to 0
        User updatedUser = userRepository.findById(testUser.getId()).orElseThrow();
        Assertions.assertEquals(0, updatedUser.getRewardsRedeemedCount());
    }

    @Test
    @DisplayName("COR-02: Cancelling order releases scheduled capacity")
    void testOrderCancellationReleasesScheduledCapacity() {
        LocalDate date = LocalDate.now().plusDays(25);
        fulfillmentService.reserveScheduledCapacity(scheduledProduct.getId(), date, 3);

        ProductDailyCapacityUsage usageBefore = capacityUsageRepository
                .findByProductIdAndProductionDate(scheduledProduct.getId(), date).orElseThrow();
        Assertions.assertEquals(3, usageBefore.getReservedQuantity());

        Order order = new Order();
        order.setOrderNumber("ORD-P3-TEST-2");
        order.setStatus(OrderStatus.PENDING);
        order.setDeliveryMode(DeliveryMode.SCHEDULED);
        order.setOrderType(OrderType.PICKUP);
        order.setScheduledDate(date);
        order.setSubtotal(BigDecimal.valueOf(300));
        order.setTotalAmount(BigDecimal.valueOf(300));

        OrderItem item = new OrderItem();
        item.setOrder(order);
        item.setProductId(scheduledProduct.getId());
        item.setProductName(scheduledProduct.getName());
        item.setQuantity(3);
        item.setUnitPrice(BigDecimal.valueOf(100));
        item.setLineTotal(BigDecimal.valueOf(300));
        order.getItems().add(item);

        Order savedOrder = orderRepository.save(order);
        createdOrderIds.add(savedOrder.getId());

        // Cancel order
        orderService.updateStatus(savedOrder.getId(), OrderStatus.CANCELLED);

        ProductDailyCapacityUsage usageAfter = capacityUsageRepository
                .findByProductIdAndProductionDate(scheduledProduct.getId(), date).orElseThrow();
        Assertions.assertEquals(0, usageAfter.getReservedQuantity(), "Scheduled capacity must be released back to 0");
    }

    @Test
    @DisplayName("COR-02: Cancellation idempotency and prohibition of completed order cancellation")
    void testCancellationGuards() {
        Order order = new Order();
        order.setOrderNumber("ORD-P3-TEST-3");
        order.setStatus(OrderStatus.COMPLETED);
        order.setCompletionRecorded(true);
        order.setDeliveryMode(DeliveryMode.INSTANT);
        order.setOrderType(OrderType.PICKUP);
        Order completedOrder = orderRepository.save(order);
        createdOrderIds.add(completedOrder.getId());

        // Attempting to cancel a completed order must throw IllegalStateException
        Assertions.assertThrows(
                IllegalStateException.class,
                () -> orderService.updateStatus(completedOrder.getId(), OrderStatus.CANCELLED)
        );

        // Test idempotency on cancelled order
        Order orderToCancel = new Order();
        orderToCancel.setOrderNumber("ORD-P3-TEST-4");
        orderToCancel.setStatus(OrderStatus.PENDING);
        orderToCancel.setDeliveryMode(DeliveryMode.INSTANT);
        orderToCancel.setOrderType(OrderType.PICKUP);
        Order saved = orderRepository.save(orderToCancel);
        createdOrderIds.add(saved.getId());

        OrderResponse res1 = orderService.updateStatus(saved.getId(), OrderStatus.CANCELLED);
        Assertions.assertEquals(OrderStatus.CANCELLED, res1.status());

        // Calling cancel again on already cancelled order returns same response without error
        OrderResponse res2 = orderService.updateStatus(saved.getId(), OrderStatus.CANCELLED);
        Assertions.assertEquals(OrderStatus.CANCELLED, res2.status());

        // Attempting to transition from CANCELLED to PENDING throws IllegalStateException
        Assertions.assertThrows(
                IllegalStateException.class,
                () -> orderService.updateStatus(saved.getId(), OrderStatus.PENDING)
        );
    }

    @Test
    void testCleanupAbandonedGuestCarts_PurgesOnlyStaleActiveGuestCartsAndCascadesItems() {
        // 1. Stale active guest cart (20 days old) with an item
        Cart staleGuestCart = new Cart();
        staleGuestCart.setGuestSessionId("guest-session-stale");
        staleGuestCart.setStatus(CartStatus.ACTIVE);
        staleGuestCart.setCreatedAt(Instant.now().minus(20, java.time.temporal.ChronoUnit.DAYS));
        staleGuestCart = cartRepository.save(staleGuestCart);
        createdCartIds.add(staleGuestCart.getId());

        CartItem staleItem = new CartItem();
        staleItem.setCart(staleGuestCart);
        staleItem.setProduct(instantProduct);
        staleItem.setQuantity(2);
        staleItem.setUnitPrice(BigDecimal.valueOf(15.00));
        staleItem.setDeliveryMode(DeliveryMode.INSTANT);
        staleItem = cartItemRepository.save(staleItem);

        // 2. Recent active guest cart (2 days old) with an item
        Cart recentGuestCart = new Cart();
        recentGuestCart.setGuestSessionId("guest-session-recent");
        recentGuestCart.setStatus(CartStatus.ACTIVE);
        recentGuestCart.setCreatedAt(Instant.now().minus(2, java.time.temporal.ChronoUnit.DAYS));
        recentGuestCart = cartRepository.save(recentGuestCart);
        createdCartIds.add(recentGuestCart.getId());

        CartItem recentItem = new CartItem();
        recentItem.setCart(recentGuestCart);
        recentItem.setProduct(instantProduct);
        recentItem.setQuantity(1);
        recentItem.setUnitPrice(BigDecimal.valueOf(15.00));
        recentItem.setDeliveryMode(DeliveryMode.INSTANT);
        recentItem = cartItemRepository.save(recentItem);

        // 3. Stale ORDERED guest cart (20 days old)
        Cart orderedGuestCart = new Cart();
        orderedGuestCart.setGuestSessionId("guest-session-ordered");
        orderedGuestCart.setStatus(CartStatus.ORDERED);
        orderedGuestCart.setCreatedAt(Instant.now().minus(20, java.time.temporal.ChronoUnit.DAYS));
        orderedGuestCart = cartRepository.save(orderedGuestCart);
        createdCartIds.add(orderedGuestCart.getId());

        // 4. Stale active USER cart (20 days old)
        Cart userCart = new Cart();
        userCart.setUserId(testUser.getId());
        userCart.setStatus(CartStatus.ACTIVE);
        userCart.setCreatedAt(Instant.now().minus(20, java.time.temporal.ChronoUnit.DAYS));
        userCart = cartRepository.save(userCart);
        createdCartIds.add(userCart.getId());

        // Run cleanup
        int deletedCount = cartService.cleanupAbandonedGuestCarts();
        Assertions.assertTrue(deletedCount >= 1, "Should delete at least the stale active guest cart");

        // Verify stale guest cart and its cascaded cart items are gone
        Assertions.assertTrue(cartRepository.findById(staleGuestCart.getId()).isEmpty(), "Stale guest cart must be deleted");
        Assertions.assertTrue(cartItemRepository.findById(staleItem.getId()).isEmpty(), "Stale guest cart items must cascade delete");

        // Verify recent guest cart, ordered guest cart, and user cart are preserved
        Assertions.assertTrue(cartRepository.findById(recentGuestCart.getId()).isPresent(), "Recent guest cart must be preserved");
        Assertions.assertTrue(cartItemRepository.findById(recentItem.getId()).isPresent(), "Recent guest cart items must be preserved");
        Assertions.assertTrue(cartRepository.findById(orderedGuestCart.getId()).isPresent(), "Ordered guest cart must be preserved");
        Assertions.assertTrue(cartRepository.findById(userCart.getId()).isPresent(), "User cart must be preserved");
    }
}
