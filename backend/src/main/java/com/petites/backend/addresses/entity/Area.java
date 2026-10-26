package com.petites.backend.addresses.entity;

import com.petites.backend.common.model.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "areas")
public class Area extends BaseEntity {

    @Column(name = "city_id", length = 36, nullable = false)
    private String cityId;

    @Column(name = "name", length = 100, nullable = false)
    private String name;

    @Column(name = "delivery_fee", precision = 10, scale = 2, nullable = false)
    private BigDecimal deliveryFee = BigDecimal.ZERO;

    @Column(name = "is_courier_delivery", nullable = false)
    private boolean courierDelivery = false;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    public Area() {
    }

    public Area(String cityId, String name, BigDecimal deliveryFee, boolean courierDelivery, boolean active, int sortOrder) {
        this.cityId = cityId;
        this.name = name;
        this.deliveryFee = deliveryFee != null ? deliveryFee : BigDecimal.ZERO;
        this.courierDelivery = courierDelivery;
        this.active = active;
        this.sortOrder = sortOrder;
    }

    public String getCityId() {
        return cityId;
    }

    public void setCityId(String cityId) {
        this.cityId = cityId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public BigDecimal getDeliveryFee() {
        return deliveryFee;
    }

    public void setDeliveryFee(BigDecimal deliveryFee) {
        this.deliveryFee = deliveryFee != null ? deliveryFee : BigDecimal.ZERO;
    }

    public boolean isCourierDelivery() {
        return courierDelivery;
    }

    public void setCourierDelivery(boolean courierDelivery) {
        this.courierDelivery = courierDelivery;
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
