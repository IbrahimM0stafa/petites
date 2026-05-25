package com.petites.backend.products.controller;

import com.petites.backend.products.service.FulfillmentService;
import com.petites.backend.products.dto.FulfillmentStatusResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/admin/fulfillment")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'STAFF')")
public class FulfillmentController {

    private final FulfillmentService fulfillmentService;

    public FulfillmentController(FulfillmentService fulfillmentService) {
        this.fulfillmentService = fulfillmentService;
    }

    @GetMapping("/status/{productId}")
    public FulfillmentStatusResponse getStatus(@PathVariable String productId) {
        return fulfillmentService.getFulfillmentStatus(productId);
    }

    @PutMapping("/scheduled-capacity")
    public void updateScheduledCapacity(@RequestParam String productId, @RequestParam int dailyCapacity) {
        fulfillmentService.updateScheduledCapacity(productId, dailyCapacity);
    }

    @PutMapping("/instant-inventory")
    public void updateInstantInventory(@RequestParam String productId,
                                       @RequestParam int availableQuantity,
                                       @RequestParam String availableUntil,
                                       @RequestParam(defaultValue = "true") boolean active) {
        String currentUserId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Instant until = Instant.parse(availableUntil);
        fulfillmentService.updateInstantInventory(productId, availableQuantity, until, active, currentUserId);
    }
}
