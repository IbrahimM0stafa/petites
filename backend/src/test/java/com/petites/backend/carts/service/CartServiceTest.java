package com.petites.backend.carts.service;

import com.petites.backend.carts.dto.CartOwnerRef;
import com.petites.backend.carts.dto.CheckoutRequest;
import com.petites.backend.carts.dto.CheckoutResponse;
import com.petites.backend.carts.entity.Cart;
import com.petites.backend.carts.entity.CartItem;
import com.petites.backend.carts.enums.CartStatus;
import com.petites.backend.carts.repository.CartItemRepository;
import com.petites.backend.carts.repository.CartRepository;
import com.petites.backend.common.enums.DeliveryMode;
import com.petites.backend.orders.dto.OrderResponse;
import com.petites.backend.orders.entity.Order;
import com.petites.backend.orders.enums.OrderType;
import com.petites.backend.orders.repository.OrderRepository;
import com.petites.backend.orders.service.OrderService;
import com.petites.backend.coupons.service.CouponService;
import com.petites.backend.products.entity.Product;
import com.petites.backend.products.repository.ProductRepository;
import com.petites.backend.products.service.FulfillmentService;
import com.petites.backend.settings.service.SettingService;
import com.petites.backend.users.entity.User;
import com.petites.backend.users.service.UserService;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private CartItemRepository cartItemRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private FulfillmentService fulfillmentService;

    @Mock
    private SettingService settingService;

    @Mock
    private UserService userService;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderService orderService;

    @Mock
    private CouponService couponService;

    @InjectMocks
    private CartService cartService;

    @Test
    void checkoutSplitsMixedCartIntoSeparateOrders() throws Exception {
        String userId = "user-1";
        String cartId = "cart-1";
        LocalDate scheduledDate = LocalDate.now().plusDays(2);

        Cart cart = new Cart();
        assignId(cart, cartId);
        cart.setUserId(userId);
        cart.setStatus(CartStatus.ACTIVE);
        cart.setCreatedAt(Instant.now());

        Product instantProduct = product("instant-1", "Cupcake", "cupcake.jpg", new BigDecimal("30.00"));
        Product scheduledProduct = product("scheduled-1", "Cake", "cake.jpg", new BigDecimal("20.00"));

        CartItem instantItem = cartItem(cart, instantProduct, 2, DeliveryMode.INSTANT);
        CartItem scheduledItem = cartItem(cart, scheduledProduct, 1, DeliveryMode.SCHEDULED);

        User user = new User();
        user.setName("Mona");
        user.setPhone("01000000000");

        when(cartRepository.findByUserIdAndStatus(userId, CartStatus.ACTIVE)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findByCartIdOrderByCreatedAtAsc(cartId)).thenReturn(List.of(instantItem, scheduledItem));
        when(userService.findById(userId)).thenReturn(Optional.of(user));
        when(couponService.resolveForCheckout(null, null, new BigDecimal("80.00"))).thenReturn(null);
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            if (order.getId() == null) {
                assignId(order, UUID.randomUUID().toString());
            }
            return order;
        });
        when(orderService.toResponse(any(Order.class))).thenAnswer(invocation -> toOrderResponse(invocation.getArgument(0)));

        CheckoutResponse response = cartService.checkout(
                CartOwnerRef.forUser(userId),
            new CheckoutRequest(null, null, OrderType.PICKUP, null, "Handle carefully", null, null, scheduledDate)
        );

        assertNotNull(response);
        assertEquals(2, response.orders().size());
        assertEquals(new BigDecimal("80.00"), response.totalAmount());
        verify(fulfillmentService).reserveInstantQuantity("instant-1", 2);
        verify(fulfillmentService).reserveScheduledCapacity("scheduled-1", scheduledDate, 1);
        verify(cartItemRepository).deleteByCartId(cartId);
    }

    private Product product(String id, String name, String image, BigDecimal price) throws Exception {
        Product product = new Product();
        assignId(product, id);
        product.setName(name);
        product.setMainImage(image);
        product.setPrice(price);
        product.setAvailable(true);
        return product;
    }

    private CartItem cartItem(Cart cart, Product product, int quantity, DeliveryMode deliveryMode) throws Exception {
        CartItem item = new CartItem();
        assignId(item, UUID.randomUUID().toString());
        item.setCart(cart);
        item.setProduct(product);
        item.setQuantity(quantity);
        item.setUnitPrice(product.getPrice());
        item.setDeliveryMode(deliveryMode);
        item.setCreatedAt(Instant.now());
        return item;
    }

    private OrderResponse toOrderResponse(Order order) {
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
                List.of()
        );
    }

    private void assignId(Object entity, String id) throws Exception {
        Class<?> currentType = entity.getClass();
        Field field = null;
        while (currentType != null && field == null) {
            try {
                field = currentType.getDeclaredField("id");
            } catch (NoSuchFieldException ignored) {
                currentType = currentType.getSuperclass();
            }
        }
        if (field == null) {
            throw new IllegalStateException("Unable to locate id field");
        }
        field.setAccessible(true);
        field.set(entity, id);
    }
}
