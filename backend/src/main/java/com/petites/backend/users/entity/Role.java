package com.petites.backend.users.entity;

import com.petites.backend.common.model.AuditedEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "roles", uniqueConstraints = {
        @UniqueConstraint(columnNames = "name")
})
public class Role extends AuditedEntity {

    @Column(name = "name", length = 50, nullable = false)
    private String name;

    public Role() {
    }

    public Role(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Role other)) return false;
        return name != null && name.equals(other.getName());
    }

    @Override
    public int hashCode() {
        return name != null ? name.hashCode() : 0;
    }
}
