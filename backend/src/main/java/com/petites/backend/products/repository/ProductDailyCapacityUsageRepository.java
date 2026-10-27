package com.petites.backend.products.repository;

import com.petites.backend.products.entity.ProductDailyCapacityUsage;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface ProductDailyCapacityUsageRepository extends JpaRepository<ProductDailyCapacityUsage, String> {

    Optional<ProductDailyCapacityUsage> findByProductIdAndProductionDate(String productId, LocalDate productionDate);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM ProductDailyCapacityUsage u WHERE u.product.id = :productId AND u.productionDate = :productionDate")
    Optional<ProductDailyCapacityUsage> findForUpdateByProductIdAndProductionDate(@Param("productId") String productId, @Param("productionDate") LocalDate productionDate);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "INSERT INTO product_daily_capacity_usage (id, product_id, production_date, reserved_quantity, created_at) " +
                   "VALUES (:id, :productId, :date, 0, CURRENT_TIMESTAMP) " +
                   "ON CONFLICT (product_id, production_date) DO NOTHING", nativeQuery = true)
    int insertIgnoreConflict(@Param("id") String id, @Param("productId") String productId, @Param("date") LocalDate date);
}
