package com.petites.backend.addresses.controller;

import com.petites.backend.addresses.entity.Area;
import com.petites.backend.addresses.entity.City;
import com.petites.backend.addresses.entity.Governorate;
import com.petites.backend.addresses.service.DeliveryZoneService;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/delivery-zones")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'STAFF')")
public class AdminDeliveryZoneController {

    private final DeliveryZoneService deliveryZoneService;

    public AdminDeliveryZoneController(DeliveryZoneService deliveryZoneService) {
        this.deliveryZoneService = deliveryZoneService;
    }

    // ── Governorates ─────────────────────────────────────────────────────────

    @GetMapping("/governorates")
    public List<Governorate> listGovernorates() {
        return deliveryZoneService.getAllGovernorates();
    }

    public record GovernoratePayload(String name, Boolean active, Integer sortOrder) {}

    @PostMapping("/governorates")
    public ResponseEntity<Governorate> createGovernorate(@RequestBody GovernoratePayload payload) {
        Governorate created = deliveryZoneService.createGovernorate(
                payload.name(),
                payload.active() != null ? payload.active() : true,
                payload.sortOrder() != null ? payload.sortOrder() : 0
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/governorates/{id}")
    public Governorate updateGovernorate(@PathVariable String id, @RequestBody GovernoratePayload payload) {
        return deliveryZoneService.updateGovernorate(id, payload.name(), payload.active(), payload.sortOrder());
    }

    @PatchMapping("/governorates/{id}/toggle-active")
    public Governorate toggleGovernorate(@PathVariable String id) {
        return deliveryZoneService.toggleGovernorateActive(id);
    }

    @DeleteMapping("/governorates/{id}")
    public ResponseEntity<Void> deleteGovernorate(@PathVariable String id) {
        deliveryZoneService.deleteGovernorate(id);
        return ResponseEntity.noContent().build();
    }

    // ── Cities ───────────────────────────────────────────────────────────────

    @GetMapping("/cities")
    public List<City> listCities(@RequestParam(required = false) String governorateId) {
        return deliveryZoneService.getCities(governorateId);
    }

    public record CityPayload(String governorateId, String name, Boolean active, Integer sortOrder) {}

    @PostMapping("/cities")
    public ResponseEntity<City> createCity(@RequestBody CityPayload payload) {
        City created = deliveryZoneService.createCity(
                payload.governorateId(),
                payload.name(),
                payload.active() != null ? payload.active() : true,
                payload.sortOrder() != null ? payload.sortOrder() : 0
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/cities/{id}")
    public City updateCity(@PathVariable String id, @RequestBody CityPayload payload) {
        return deliveryZoneService.updateCity(id, payload.name(), payload.active(), payload.sortOrder());
    }

    @PatchMapping("/cities/{id}/toggle-active")
    public City toggleCity(@PathVariable String id) {
        return deliveryZoneService.toggleCityActive(id);
    }

    @DeleteMapping("/cities/{id}")
    public ResponseEntity<Void> deleteCity(@PathVariable String id) {
        deliveryZoneService.deleteCity(id);
        return ResponseEntity.noContent().build();
    }

    // ── Areas ────────────────────────────────────────────────────────────────

    @GetMapping("/areas")
    public List<Area> listAreas(@RequestParam(required = false) String cityId) {
        return deliveryZoneService.getAreas(cityId);
    }

    public record AreaPayload(
            String cityId,
            String name,
            BigDecimal deliveryFee,
            Boolean courierDelivery,
            Boolean active,
            Integer sortOrder
    ) {}

    @PostMapping("/areas")
    public ResponseEntity<Area> createArea(@RequestBody AreaPayload payload) {
        Area created = deliveryZoneService.createArea(
                payload.cityId(),
                payload.name(),
                payload.deliveryFee() != null ? payload.deliveryFee() : BigDecimal.ZERO,
                payload.courierDelivery() != null ? payload.courierDelivery() : false,
                payload.active() != null ? payload.active() : true,
                payload.sortOrder() != null ? payload.sortOrder() : 0
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/areas/{id}")
    public Area updateArea(@PathVariable String id, @RequestBody AreaPayload payload) {
        return deliveryZoneService.updateArea(
                id,
                payload.name(),
                payload.deliveryFee(),
                payload.courierDelivery(),
                payload.active(),
                payload.sortOrder()
        );
    }

    @PatchMapping("/areas/{id}/toggle-active")
    public Area toggleArea(@PathVariable String id) {
        return deliveryZoneService.toggleAreaActive(id);
    }

    @PatchMapping("/areas/{id}/toggle-courier")
    public Area toggleAreaCourier(@PathVariable String id) {
        return deliveryZoneService.toggleAreaCourier(id);
    }

    @DeleteMapping("/areas/{id}")
    public ResponseEntity<Void> deleteArea(@PathVariable String id) {
        deliveryZoneService.deleteArea(id);
        return ResponseEntity.noContent().build();
    }
}
