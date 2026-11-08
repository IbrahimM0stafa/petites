package com.petites.backend.orders.controller;

import com.petites.backend.carts.service.CartAccessService;
import com.petites.backend.config.GlobalExceptionHandler;
import com.petites.backend.orders.dto.OrderResponse;
import com.petites.backend.orders.enums.OrderStatus;
import com.petites.backend.orders.service.OrderService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminOrderControllerTest {

    @Mock
    private OrderService orderService;

    @Mock
    private CartAccessService cartAccessService;

    private MockMvc adminMockMvc;
    private MockMvc customerMockMvc;

    @BeforeEach
    void setUp() {
        adminMockMvc = MockMvcBuilders.standaloneSetup(new AdminOrderController(orderService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        customerMockMvc = MockMvcBuilders.standaloneSetup(new OrderController(orderService, cartAccessService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("Admin order status endpoint updates status and returns 200 OK")
    void testAdminUpdateStatus_Success() throws Exception {
        OrderResponse mockResponse = new OrderResponse(
                "ord-123", "ORD-2026-001", "cust-1", null, "addr-1",
                null, null, null, OrderStatus.CONFIRMED, null,
                BigDecimal.valueOf(100), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.valueOf(100),
                "Customer Name", "01000000000", null, null, null,
                false, Instant.now(), List.of(), false
        );

        when(orderService.updateStatus(eq("ord-123"), eq(OrderStatus.CONFIRMED))).thenReturn(mockResponse);

        adminMockMvc.perform(put("/api/admin/orders/ord-123/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CONFIRMED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderId").value("ord-123"))
                .andExpect(jsonPath("$.status").value("CONFIRMED"));

        verify(orderService).updateStatus("ord-123", OrderStatus.CONFIRMED);
    }

    @Test
    @DisplayName("Admin order status endpoint rejects request with null status (HTTP 400)")
    void testAdminUpdateStatus_NullStatus_BadRequest() throws Exception {
        adminMockMvc.perform(put("/api/admin/orders/ord-123/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Admin order status endpoint translates IllegalStateException into HTTP 400 Bad Request")
    void testAdminUpdateStatus_IllegalState_BadRequest() throws Exception {
        when(orderService.updateStatus(eq("ord-123"), eq(OrderStatus.CANCELLED)))
                .thenThrow(new IllegalStateException("Cannot cancel an already completed order"));

        adminMockMvc.perform(put("/api/admin/orders/ord-123/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CANCELLED\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Cannot cancel an already completed order"));
    }

    @Test
    @DisplayName("Public customer OrderController no longer exposes PUT /{id}/status (HTTP 404)")
    void testCustomerOrderController_StatusEndpointNotExposed() throws Exception {
        customerMockMvc.perform(put("/api/orders/ord-123/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CONFIRMED\"}"))
                .andExpect(status().isNotFound());
    }
}
