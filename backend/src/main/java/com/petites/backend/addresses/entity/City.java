package com.petites.backend.addresses.entity;

import com.petites.backend.common.model.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "cities")
public class City extends BaseEntity {

    @Column(name = "governorate_id", length = 36, nullable = false)
    private String governorateId;

    @Column(name = "name", length = 100, nullable = false)
    private String name;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    public City() {
    }

    public City(String governorateId, String name, boolean active, int sortOrder) {
        this.governorateId = governorateId;
        this.name = name;
        this.active = active;
        this.sortOrder = sortOrder;
    }

    public String getGovernorateId() {
        return governorateId;
    }

    public void setGovernorateId(String governorateId) {
        this.governorateId = governorateId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}
