package com.petites.backend.settings.controller;

import com.petites.backend.settings.dto.SettingResponse;
import com.petites.backend.settings.dto.SettingUpdateRequest;
import com.petites.backend.settings.entity.Setting;
import com.petites.backend.settings.service.SettingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/settings")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'STAFF')")
public class AdminSettingController {

    private final SettingService settingService;

    public AdminSettingController(SettingService settingService) {
        this.settingService = settingService;
    }

    @GetMapping

    public List<SettingResponse> getAll() {
        return settingService.getAllSettings()
                .stream()
                .map(SettingResponse::from)
                .toList();
    }

    @PutMapping

    public ResponseEntity<SettingResponse> updateSetting(@Valid @RequestBody SettingUpdateRequest request) {
        Setting saved = settingService.saveSetting(request.key(), request.value());
        return ResponseEntity.ok(SettingResponse.from(saved));
    }
}
