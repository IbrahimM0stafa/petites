package com.petites.backend.products.repository;

import com.petites.backend.products.entity.InstantDeliveryInventory;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface InstantDeliveryInventoryRepository extends JpaRepository<InstantDeliveryInventory, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<InstantDeliveryInventory> findFirstByProductIdAndActiveTrueAndAvailableUntilAfterOrderByCreatedAtDesc(String productId, Instant now);

    List<InstantDeliveryInventory> findByActiveTrueAndAvailableUntilAfter(Instant now);

    Optional<InstantDeliveryInventory> findByProductId(String productId);
}
