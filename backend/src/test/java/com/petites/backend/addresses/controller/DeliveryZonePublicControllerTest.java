package com.petites.backend.addresses.controller;

import com.petites.backend.addresses.dto.AreaResponse;
import com.petites.backend.addresses.dto.DeliveryZoneTreeDto.GovernorateNode;
import com.petites.backend.addresses.entity.Area;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class DeliveryZonePublicControllerTest {

    @Mock
    private DeliveryZoneService deliveryZoneService;

    @InjectMocks
    private DeliveryZonePublicController controller;

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
    @DisplayName("GET /api/delivery-zones/tree returns public tree DTOs")
    void getActiveTreeReturnsDtoList() throws Exception {
        GovernorateNode gov = new GovernorateNode("gov-1", "Cairo", true, 1, List.of());
        when(deliveryZoneService.getPublicZoneTree()).thenReturn(List.of(gov));

        mockMvc.perform(get("/api/delivery-zones/tree"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("gov-1"))
                .andExpect(jsonPath("$[0].name").value("Cairo"));
    }

    @Test
    @DisplayName("GET /api/delivery-zones/area/{id} returns AreaResponse DTO")
    void getAreaReturnsDto() throws Exception {
        Area area = new Area("city-1", "Nasr City Zone 1", BigDecimal.valueOf(45), false, true, 1);
        assignId(area, "area-1");

        when(deliveryZoneService.getArea("area-1")).thenReturn(area);

        mockMvc.perform(get("/api/delivery-zones/area/area-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("area-1"))
                .andExpect(jsonPath("$.name").value("Nasr City Zone 1"))
                .andExpect(jsonPath("$.cityId").value("city-1"))
                .andExpect(jsonPath("$.deliveryFee").value(45))
                .andExpect(jsonPath("$.courierDelivery").value(false));
    }
}
