package com.petites.backend.addresses.entity;

import com.petites.backend.common.model.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "addresses")
public class Address extends BaseEntity {

    @Column(name = "user_id", length = 36)
    private String userId;

    @Column(name = "guest_session_id", length = 36)
    private String guestSessionId;

    @Column(name = "city", length = 100, nullable = false)
    private String city;

    @Column(name = "area", length = 100, nullable = false)
    private String area;

    @Column(name = "street", length = 255, nullable = false)
    private String street;

    @Column(name = "building", length = 50)
    private String building;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getGuestSessionId() {
        return guestSessionId;
    }

    public void setGuestSessionId(String guestSessionId) {
        this.guestSessionId = guestSessionId;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getArea() {
        return area;
    }

    public void setArea(String area) {
        this.area = area;
    }

    public String getStreet() {
        return street;
    }

    public void setStreet(String street) {
        this.street = street;
    }

    public String getBuilding() {
        return building;
    }

    public void setBuilding(String building) {
        this.building = building;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}