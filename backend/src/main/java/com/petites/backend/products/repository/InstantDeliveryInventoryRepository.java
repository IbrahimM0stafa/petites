package com.petites.backend.products.repository;

import com.petites.backend.products.entity.InstantDeliveryInventory;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface InstantDeliveryInventoryRepository extends JpaRepository<InstantDeliveryInventory, String> {

    Optional<InstantDeliveryInventory> findFirstByProductIdAndActiveTrueAndAvailableUntilAfterOrderByCreatedAtDesc(String productId, Instant now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT idi FROM InstantDeliveryInventory idi WHERE idi.product.id = :productId AND idi.active = true AND idi.availableUntil > :now ORDER BY idi.createdAt DESC")
    List<InstantDeliveryInventory> findForUpdateByProductId(@Param("productId") String productId, @Param("now") Instant now);

    List<InstantDeliveryInventory> findByActiveTrueAndAvailableUntilAfter(Instant now);

    List<InstantDeliveryInventory> findByProductIdInAndActiveTrueAndAvailableUntilAfter(java.util.Collection<String> productIds, Instant now);

    Optional<InstantDeliveryInventory> findByProductId(String productId);
}
