package com.petites.backend.orders.service;

import com.petites.backend.addresses.repository.AddressRepository;
import com.petites.backend.common.enums.DeliveryMode;
import com.petites.backend.coupons.service.CouponService;
import com.petites.backend.orders.entity.Order;
import com.petites.backend.orders.entity.OrderItem;
import com.petites.backend.orders.enums.OrderStatus;
import com.petites.backend.orders.enums.OrderType;
import com.petites.backend.orders.enums.PaymentMethod;
import com.petites.backend.orders.repository.OrderItemRepository;
import com.petites.backend.orders.repository.OrderRepository;
import com.petites.backend.loyalty.service.LoyaltyService;
import com.petites.backend.products.service.FulfillmentService;
import com.petites.backend.users.service.UserService;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderItemRepository orderItemRepository;

    @Mock
    private LoyaltyService loyaltyService;

    @Mock
    private CouponService couponService;

    @Mock
    private AddressRepository addressRepository;

    @Mock
    private com.petites.backend.websocket.service.OrderWebSocketService orderWebSocketService;

    @Mock
    private FulfillmentService fulfillmentService;

    @Mock
    private UserService userService;

    @InjectMocks
    private OrderService orderService;

    @Test
    void updateStatusCountsCompletionOnlyOnceForSameOrder() throws Exception {
        String orderId = "order-1";
        String userId = "user-1";
        String couponId = "coupon-1";

        Order order = new Order();
        assignId(order, orderId);
        order.setUserId(userId);
        order.setCouponId(couponId);
        order.setDeliveryMode(DeliveryMode.INSTANT);
        order.setOrderType(OrderType.PICKUP);
        order.setStatus(OrderStatus.PENDING);
        order.setPaymentMethod(PaymentMethod.INSTAPAY);
        order.setSubtotal(new BigDecimal("100.00"));
        order.setDeliveryFee(BigDecimal.ZERO);
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setTotalAmount(new BigDecimal("100.00"));

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(orderItemRepository.findByOrderIdOrderByIdAsc(orderId)).thenReturn(List.of());

        orderService.updateStatus(orderId, OrderStatus.COMPLETED);
        orderService.updateStatus(orderId, OrderStatus.PENDING);
        orderService.updateStatus(orderId, OrderStatus.COMPLETED);

        verify(loyaltyService, times(1)).recordCompletedOrder(userId);
        // Per COR-03, coupon usage is recorded at checkout rather than order completion
        verify(couponService, never()).recordUsage(any(), any());
        assertTrue(order.isCompletionRecorded());
        verify(orderRepository, times(3)).save(order);
    }

    @Test
    void updateStatusToCancelledReleasesStockCouponAndReward() throws Exception {
        String orderId = "order-cancel-1";
        String userId = "user-1";
        String couponId = "coupon-1";

        Order order = new Order();
        assignId(order, orderId);
        order.setUserId(userId);
        order.setCouponId(couponId);
        order.setRewardApplied(true);
        order.setDeliveryMode(DeliveryMode.INSTANT);
        order.setStatus(OrderStatus.CONFIRMED);

        OrderItem item = new OrderItem();
        item.setProductId("prod-1");
        item.setQuantity(2);
        order.setItems(List.of(item));

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(orderItemRepository.findByOrderIdOrderByIdAsc(orderId)).thenReturn(List.of(item));

        orderService.updateStatus(orderId, OrderStatus.CANCELLED);

        assertEquals(OrderStatus.CANCELLED, order.getStatus());
        verify(fulfillmentService, times(1)).releaseInstantQuantity("prod-1", 2);
        verify(userService, times(1)).decrementRewardRedeemedCount(userId);
        verify(couponService, times(1)).releaseUsage(couponId, userId);
    }

    @Test
    void updateStatusCannotCancelCompletedOrder() throws Exception {
        String orderId = "order-comp-1";
        Order order = new Order();
        assignId(order, orderId);
        order.setStatus(OrderStatus.COMPLETED);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        assertThrows(IllegalStateException.class, () ->
                orderService.updateStatus(orderId, OrderStatus.CANCELLED)
        );
    }

    @Test
    void updateStatusCannotModifyAlreadyCancelledOrder() throws Exception {
        String orderId = "order-cancelled-1";
        Order order = new Order();
        assignId(order, orderId);
        order.setStatus(OrderStatus.CANCELLED);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        assertThrows(IllegalStateException.class, () ->
                orderService.updateStatus(orderId, OrderStatus.CONFIRMED)
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