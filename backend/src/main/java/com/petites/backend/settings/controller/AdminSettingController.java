package com.petites.backend.settings.controller;

import com.petites.backend.settings.entity.Setting;
import com.petites.backend.settings.service.SettingService;
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
    public List<Setting> getAll() {
        return settingService.getAllSettings();
    }

    @PutMapping
    public void updateSetting(@RequestParam String key, @RequestParam String value) {
        settingService.saveSetting(key, value);
    }
}
