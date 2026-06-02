package com.petites.backend.orders.service;

import com.petites.backend.addresses.repository.AddressRepository;
import com.petites.backend.common.enums.DeliveryMode;
import com.petites.backend.coupons.service.CouponService;
import com.petites.backend.orders.entity.Order;
import com.petites.backend.orders.enums.OrderStatus;
import com.petites.backend.orders.enums.OrderType;
import com.petites.backend.orders.enums.PaymentMethod;
import com.petites.backend.orders.repository.OrderItemRepository;
import com.petites.backend.orders.repository.OrderRepository;
import com.petites.backend.loyalty.service.LoyaltyService;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
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
        verify(couponService, times(1)).recordUsage(couponId, userId);
        assertTrue(order.isCompletionRecorded());
        verify(orderRepository, times(3)).save(order);
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