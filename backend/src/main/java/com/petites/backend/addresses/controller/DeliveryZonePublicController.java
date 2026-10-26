package com.petites.backend.addresses.controller;

import com.petites.backend.addresses.dto.DeliveryZoneTreeDto.GovernorateNode;
import com.petites.backend.addresses.entity.Area;
import com.petites.backend.addresses.service.DeliveryZoneService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/delivery-zones")
public class DeliveryZonePublicController {

    private final DeliveryZoneService deliveryZoneService;

    public DeliveryZonePublicController(DeliveryZoneService deliveryZoneService) {
        this.deliveryZoneService = deliveryZoneService;
    }

    @GetMapping("/tree")
    public List<GovernorateNode> getActiveTree() {
        return deliveryZoneService.getPublicZoneTree();
    }

    @GetMapping("/area/{id}")
    public Area getArea(@PathVariable String id) {
        return deliveryZoneService.getArea(id);
    }
}
