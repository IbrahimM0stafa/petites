package com.petites.backend.settings.service;

import com.petites.backend.settings.entity.Setting;
import com.petites.backend.settings.repository.SettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SettingService {

    private final SettingRepository settingRepository;

    public SettingService(SettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    @Transactional(readOnly = true)
    public String getSetting(String key, String defaultValue) {
        return settingRepository.findByKey(key)
                .map(Setting::getValue)
                .orElse(defaultValue);
    }

    @Transactional(readOnly = true)
    public List<Setting> getAllSettings() {
        return settingRepository.findAll();
    }

    @Transactional
    public void saveSetting(String key, String value) {
        Setting setting = settingRepository.findByKey(key)
                .orElseGet(() -> {
                    Setting s = new Setting();
                    s.setKey(key);
                    return s;
                });
        setting.setValue(value);
        settingRepository.save(setting);
    }
}
