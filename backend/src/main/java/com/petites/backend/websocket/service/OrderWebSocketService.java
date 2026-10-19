package com.petites.backend.websocket.service;

import com.petites.backend.orders.dto.OrderResponse;
import com.petites.backend.websocket.dto.OrderWebSocketEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class OrderWebSocketService {

    private static final Logger log = LoggerFactory.getLogger(OrderWebSocketService.class);
    public static final String ADMIN_ORDERS_TOPIC = "/topic/admin/orders";

    private final SimpMessagingTemplate messagingTemplate;

    public OrderWebSocketService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void notifyOrderCreated(OrderResponse order) {
        if (order == null) {
            return;
        }
        OrderWebSocketEvent event = OrderWebSocketEvent.created(order);
        log.info("Broadcasting ORDER_CREATED event for order {} to {}", order.orderNumber(), ADMIN_ORDERS_TOPIC);
        messagingTemplate.convertAndSend(ADMIN_ORDERS_TOPIC, event);
        messagingTemplate.convertAndSend("/topic/orders/" + order.orderId(), event);
        if (order.userId() != null && !order.userId().isBlank()) {
            messagingTemplate.convertAndSend("/topic/users/" + order.userId() + "/orders", event);
        }
    }

    public void notifyOrderStatusUpdated(OrderResponse order) {
        if (order == null) {
            return;
        }
        OrderWebSocketEvent event = OrderWebSocketEvent.statusUpdated(order);
        log.info("Broadcasting ORDER_STATUS_UPDATED event for order {} to {}", order.orderNumber(), ADMIN_ORDERS_TOPIC);
        messagingTemplate.convertAndSend(ADMIN_ORDERS_TOPIC, event);
        messagingTemplate.convertAndSend("/topic/orders/" + order.orderId(), event);
        if (order.userId() != null && !order.userId().isBlank()) {
            messagingTemplate.convertAndSend("/topic/users/" + order.userId() + "/orders", event);
        }
    }
}
