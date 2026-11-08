package com.petites.backend.addresses.controller;

import com.petites.backend.addresses.dto.AreaPayload;
import com.petites.backend.addresses.dto.AreaResponse;
import com.petites.backend.addresses.dto.CityPayload;
import com.petites.backend.addresses.dto.CityResponse;
import com.petites.backend.addresses.dto.GovernoratePayload;
import com.petites.backend.addresses.dto.GovernorateResponse;
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

    public List<GovernorateResponse> listGovernorates() {
        return deliveryZoneService.getAllGovernorates().stream()
                .map(GovernorateResponse::from)
                .toList();
    }

    @PostMapping("/governorates")

    public ResponseEntity<GovernorateResponse> createGovernorate(@RequestBody GovernoratePayload payload) {
        Governorate created = deliveryZoneService.createGovernorate(
                payload.name(),
                payload.active() != null ? payload.active() : true,
                payload.sortOrder() != null ? payload.sortOrder() : 0);
        return ResponseEntity.status(HttpStatus.CREATED).body(GovernorateResponse.from(created));
    }

    @PutMapping("/governorates/{id}")

    public GovernorateResponse updateGovernorate(@PathVariable String id, @RequestBody GovernoratePayload payload) {
        Governorate updated = deliveryZoneService.updateGovernorate(id, payload.name(), payload.active(),
                payload.sortOrder());
        return GovernorateResponse.from(updated);
    }

    @PatchMapping("/governorates/{id}/toggle-active")

    public GovernorateResponse toggleGovernorate(@PathVariable String id) {
        return GovernorateResponse.from(deliveryZoneService.toggleGovernorateActive(id));
    }

    @DeleteMapping("/governorates/{id}")
    public ResponseEntity<Void> deleteGovernorate(@PathVariable String id) {
        deliveryZoneService.deleteGovernorate(id);
        return ResponseEntity.noContent().build();
    }

    // ── Cities ───────────────────────────────────────────────────────────────

    @GetMapping("/cities")

    public List<CityResponse> listCities(@RequestParam(required = false) String governorateId) {
        return deliveryZoneService.getCities(governorateId).stream()
                .map(CityResponse::from)
                .toList();
    }

    @PostMapping("/cities")

    public ResponseEntity<CityResponse> createCity(@RequestBody CityPayload payload) {
        City created = deliveryZoneService.createCity(
                payload.governorateId(),
                payload.name(),
                payload.active() != null ? payload.active() : true,
                payload.sortOrder() != null ? payload.sortOrder() : 0);
        return ResponseEntity.status(HttpStatus.CREATED).body(CityResponse.from(created));
    }

    @PutMapping("/cities/{id}")

    public CityResponse updateCity(@PathVariable String id, @RequestBody CityPayload payload) {
        City updated = deliveryZoneService.updateCity(id, payload.name(), payload.active(), payload.sortOrder());
        return CityResponse.from(updated);
    }

    @PatchMapping("/cities/{id}/toggle-active")

    public CityResponse toggleCity(@PathVariable String id) {
        return CityResponse.from(deliveryZoneService.toggleCityActive(id));
    }

    @DeleteMapping("/cities/{id}")
    public ResponseEntity<Void> deleteCity(@PathVariable String id) {
        deliveryZoneService.deleteCity(id);
        return ResponseEntity.noContent().build();
    }

    // ── Areas ────────────────────────────────────────────────────────────────

    @GetMapping("/areas")

    public List<AreaResponse> listAreas(@RequestParam(required = false) String cityId) {
        return deliveryZoneService.getAreas(cityId).stream()
                .map(AreaResponse::from)
                .toList();
    }

    @PostMapping("/areas")

    public ResponseEntity<AreaResponse> createArea(@RequestBody AreaPayload payload) {
        Area created = deliveryZoneService.createArea(
                payload.cityId(),
                payload.name(),
                payload.deliveryFee() != null ? payload.deliveryFee() : BigDecimal.ZERO,
                payload.courierDelivery() != null ? payload.courierDelivery() : false,
                payload.active() != null ? payload.active() : true,
                payload.sortOrder() != null ? payload.sortOrder() : 0);
        return ResponseEntity.status(HttpStatus.CREATED).body(AreaResponse.from(created));
    }

    @PutMapping("/areas/{id}")

    public AreaResponse updateArea(@PathVariable String id, @RequestBody AreaPayload payload) {
        Area updated = deliveryZoneService.updateArea(
                id,
                payload.name(),
                payload.deliveryFee(),
                payload.courierDelivery(),
                payload.active(),
                payload.sortOrder());
        return AreaResponse.from(updated);
    }

    @PatchMapping("/areas/{id}/toggle-active")

    public AreaResponse toggleArea(@PathVariable String id) {
        return AreaResponse.from(deliveryZoneService.toggleAreaActive(id));
    }

    @PatchMapping("/areas/{id}/toggle-courier")

    public AreaResponse toggleAreaCourier(@PathVariable String id) {
        return AreaResponse.from(deliveryZoneService.toggleAreaCourier(id));
    }

    @DeleteMapping("/areas/{id}")
    public ResponseEntity<Void> deleteArea(@PathVariable String id) {
        deliveryZoneService.deleteArea(id);
        return ResponseEntity.noContent().build();
    }
}
