package com.petites.backend.addresses.controller;

import com.petites.backend.addresses.entity.Area;
import com.petites.backend.addresses.entity.City;
import com.petites.backend.addresses.entity.Governorate;
import com.petites.backend.addresses.service.DeliveryZoneService;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminDeliveryZoneControllerTest {

    @Mock
    private DeliveryZoneService deliveryZoneService;

    @InjectMocks
    private AdminDeliveryZoneController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    private void assignId(Object entity, String id) {
        Class<?> currentType = entity.getClass();
        Field field = null;
        while (currentType != null && field == null) {
            try {
                field = currentType.getDeclaredField("id");
            } catch (NoSuchFieldException ignored) {
                currentType = currentType.getSuperclass();
            }
        }
        if (field != null) {
            field.setAccessible(true);
            try {
                field.set(entity, id);
            } catch (IllegalAccessException e) {
                throw new RuntimeException(e);
            }
        }
    }

    @Test
    @DisplayName("GET /api/admin/delivery-zones/governorates returns list of governorate DTOs")
    void testListGovernorates() throws Exception {
        Governorate gov = new Governorate("Cairo", true, 1);
        assignId(gov, "gov-1");

        when(deliveryZoneService.getAllGovernorates()).thenReturn(List.of(gov));

        mockMvc.perform(get("/api/admin/delivery-zones/governorates"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("gov-1"))
                .andExpect(jsonPath("$[0].name").value("Cairo"))
                .andExpect(jsonPath("$[0].active").value(true))
                .andExpect(jsonPath("$[0].sortOrder").value(1));
    }

    @Test
    @DisplayName("POST /api/admin/delivery-zones/governorates creates governorate and returns DTO")
    void testCreateGovernorate() throws Exception {
        Governorate created = new Governorate("Alexandria", true, 2);
        assignId(created, "gov-2");

        when(deliveryZoneService.createGovernorate(eq("Alexandria"), eq(true), eq(2))).thenReturn(created);

        String json = "{\"name\":\"Alexandria\",\"active\":true,\"sortOrder\":2}";

        mockMvc.perform(post("/api/admin/delivery-zones/governorates")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("gov-2"))
                .andExpect(jsonPath("$.name").value("Alexandria"))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.sortOrder").value(2));
    }

    @Test
    @DisplayName("PUT /api/admin/delivery-zones/governorates/{id} updates governorate and returns DTO")
    void testUpdateGovernorate() throws Exception {
        Governorate updated = new Governorate("Giza", false, 3);
        assignId(updated, "gov-3");

        when(deliveryZoneService.updateGovernorate(eq("gov-3"), eq("Giza"), eq(false), eq(3))).thenReturn(updated);

        String json = "{\"name\":\"Giza\",\"active\":false,\"sortOrder\":3}";

        mockMvc.perform(put("/api/admin/delivery-zones/governorates/gov-3")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("gov-3"))
                .andExpect(jsonPath("$.name").value("Giza"))
                .andExpect(jsonPath("$.active").value(false));
    }

    @Test
    @DisplayName("PATCH /api/admin/delivery-zones/governorates/{id}/toggle-active toggles status")
    void testToggleGovernorate() throws Exception {
        Governorate toggled = new Governorate("Cairo", false, 1);
        assignId(toggled, "gov-1");

        when(deliveryZoneService.toggleGovernorateActive("gov-1")).thenReturn(toggled);

        mockMvc.perform(patch("/api/admin/delivery-zones/governorates/gov-1/toggle-active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));
    }

    @Test
    @DisplayName("DELETE /api/admin/delivery-zones/governorates/{id} returns 204 No Content")
    void testDeleteGovernorate() throws Exception {
        mockMvc.perform(delete("/api/admin/delivery-zones/governorates/gov-1"))
                .andExpect(status().isNoContent());

        verify(deliveryZoneService).deleteGovernorate("gov-1");
    }

    @Test
    @DisplayName("GET /api/admin/delivery-zones/cities returns list of city DTOs")
    void testListCities() throws Exception {
        City city = new City("gov-1", "Nasr City", true, 1);
        assignId(city, "city-1");

        when(deliveryZoneService.getCities("gov-1")).thenReturn(List.of(city));

        mockMvc.perform(get("/api/admin/delivery-zones/cities?governorateId=gov-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("city-1"))
                .andExpect(jsonPath("$[0].governorateId").value("gov-1"))
                .andExpect(jsonPath("$[0].name").value("Nasr City"));
    }

    @Test
    @DisplayName("POST /api/admin/delivery-zones/cities creates city and returns DTO")
    void testCreateCity() throws Exception {
        City city = new City("gov-1", "Maadi", true, 2);
        assignId(city, "city-2");

        when(deliveryZoneService.createCity(eq("gov-1"), eq("Maadi"), eq(true), eq(2))).thenReturn(city);

        String json = "{\"governorateId\":\"gov-1\",\"name\":\"Maadi\",\"active\":true,\"sortOrder\":2}";

        mockMvc.perform(post("/api/admin/delivery-zones/cities")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("city-2"))
                .andExpect(jsonPath("$.name").value("Maadi"));
    }

    @Test
    @DisplayName("GET /api/admin/delivery-zones/areas returns list of area DTOs")
    void testListAreas() throws Exception {
        Area area = new Area("city-1", "Zone 1", new BigDecimal("45.00"), false, true, 1);
        assignId(area, "area-1");

        when(deliveryZoneService.getAreas("city-1")).thenReturn(List.of(area));

        mockMvc.perform(get("/api/admin/delivery-zones/areas?cityId=city-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("area-1"))
                .andExpect(jsonPath("$[0].cityId").value("city-1"))
                .andExpect(jsonPath("$[0].name").value("Zone 1"))
                .andExpect(jsonPath("$[0].deliveryFee").value(45.00));
    }

    @Test
    @DisplayName("POST /api/admin/delivery-zones/areas creates area and returns DTO")
    void testCreateArea() throws Exception {
        Area area = new Area("city-1", "Zone 2", new BigDecimal("50.00"), true, true, 2);
        assignId(area, "area-2");

        when(deliveryZoneService.createArea(eq("city-1"), eq("Zone 2"), eq(new BigDecimal("50.00")), eq(true), eq(true),
                eq(2)))
                .thenReturn(area);

        String json = "{\"cityId\":\"city-1\",\"name\":\"Zone 2\",\"deliveryFee\":50.00,\"courierDelivery\":true,\"active\":true,\"sortOrder\":2}";

        mockMvc.perform(post("/api/admin/delivery-zones/areas")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("area-2"))
                .andExpect(jsonPath("$.name").value("Zone 2"))
                .andExpect(jsonPath("$.courierDelivery").value(true));
    }

    @Test
    @DisplayName("PATCH /api/admin/delivery-zones/areas/{id}/toggle-courier toggles courier status")
    void testToggleAreaCourier() throws Exception {
        Area area = new Area("city-1", "Zone 1", new BigDecimal("45.00"), true, true, 1);
        assignId(area, "area-1");

        when(deliveryZoneService.toggleAreaCourier("area-1")).thenReturn(area);

        mockMvc.perform(patch("/api/admin/delivery-zones/areas/area-1/toggle-courier"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.courierDelivery").value(true));
    }
}
