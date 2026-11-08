package com.petites.backend.settings.dto;

import com.petites.backend.settings.entity.Setting;
import java.time.Instant;

public record SettingResponse(
    String id,
    String key,
    String value,
    Instant updatedAt
) {
    public static SettingResponse from(Setting setting) {
        if (setting == null) {
            return null;
        }
        return new SettingResponse(
            setting.getId(),
            setting.getKey(),
            setting.getValue(),
            setting.getUpdatedAt()
        );
    }
}

