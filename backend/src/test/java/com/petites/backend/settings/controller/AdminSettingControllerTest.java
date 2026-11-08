package com.petites.backend.settings.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.petites.backend.config.GlobalExceptionHandler;
import com.petites.backend.settings.dto.SettingUpdateRequest;
import com.petites.backend.settings.entity.Setting;
import com.petites.backend.settings.service.SettingService;
import java.lang.reflect.Field;
import java.time.Instant;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminSettingControllerTest {

    @Mock
    private SettingService settingService;

    @InjectMocks
    private AdminSettingController controller;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private void assignId(Setting setting, String id) {
        try {
            Field field = Setting.class.getSuperclass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(setting, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    @DisplayName("GET /api/admin/settings returns list of SettingResponse DTOs")
    void getAllSettingsReturnsList() throws Exception {
        Setting s1 = new Setting("delivery_fee", "50");
        assignId(s1, "set-1");
        s1.setUpdatedAt(Instant.now());

        Setting s2 = new Setting("blocked_days", "FRIDAY");
        assignId(s2, "set-2");
        s2.setUpdatedAt(Instant.now());

        when(settingService.getAllSettings()).thenReturn(List.of(s1, s2));

        mockMvc.perform(get("/api/admin/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value("set-1"))
                .andExpect(jsonPath("$[0].key").value("delivery_fee"))
                .andExpect(jsonPath("$[0].value").value("50"))
                .andExpect(jsonPath("$[1].id").value("set-2"))
                .andExpect(jsonPath("$[1].key").value("blocked_days"))
                .andExpect(jsonPath("$[1].value").value("FRIDAY"));
    }

    @Test
    @DisplayName("PUT /api/admin/settings with JSON request body returns SettingResponse DTO")
    void updateSettingWithRequestBody() throws Exception {
        Setting saved = new Setting("delivery_fee", "60");
        assignId(saved, "set-1");
        saved.setUpdatedAt(Instant.now());

        when(settingService.saveSetting("delivery_fee", "60")).thenReturn(saved);

        SettingUpdateRequest request = new SettingUpdateRequest("delivery_fee", "60");

        mockMvc.perform(put("/api/admin/settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("set-1"))
                .andExpect(jsonPath("$.key").value("delivery_fee"))
                .andExpect(jsonPath("$.value").value("60"));

        verify(settingService).saveSetting("delivery_fee", "60");
    }

    @Test

    @DisplayName("PUT /api/admin/settings with blank key returns 400 Bad Request")
    void updateSettingWithBlankKeyReturns400() throws Exception {
        SettingUpdateRequest request = new SettingUpdateRequest("", "60");

        mockMvc.perform(put("/api/admin/settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PUT /api/admin/settings with missing key returns 400 Bad Request")
    void updateSettingWithMissingKeyThrows400() throws Exception {
        mockMvc.perform(put("/api/admin/settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isBadRequest());
    }
}
