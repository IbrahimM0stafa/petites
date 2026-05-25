package com.petites.backend.products.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.petites.backend.products.entity.Product;
import java.time.Instant;

@Repository
public interface ProductRepository extends JpaRepository<Product, String> {

    Page<Product> findByCategoryId(String categoryId, Pageable pageable);

    Page<Product> findByAvailable(boolean available, Pageable pageable);

    Page<Product> findByCategoryIdAndAvailable(String categoryId, boolean available, Pageable pageable);

    Page<Product> findByFeaturedTrueAndAvailableTrue(Pageable pageable);

    // Instant delivery queries (active and has stock)
    @Query("SELECT p FROM Product p WHERE (:available IS NULL OR p.available = :available) AND (:categoryId IS NULL OR p.category.id = :categoryId) AND p.id IN (SELECT idi.product.id FROM InstantDeliveryInventory idi WHERE idi.active = true AND idi.availableQuantity > 0 AND idi.availableUntil > :now)")
    Page<Product> findInstantAvailable(@Param("categoryId") String categoryId, @Param("available") Boolean available, @Param("now") Instant now, Pageable pageable);

    // Scheduled eligible queries
    @Query("SELECT p FROM Product p WHERE (:available IS NULL OR p.available = :available) AND (:categoryId IS NULL OR p.category.id = :categoryId)")
    Page<Product> findScheduledEligible(@Param("categoryId") String categoryId, @Param("available") Boolean available, Pageable pageable);
}
