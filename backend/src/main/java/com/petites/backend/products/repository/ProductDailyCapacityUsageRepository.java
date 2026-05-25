package com.petites.backend.products.repository;

import com.petites.backend.products.entity.ProductDailyCapacityUsage;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface ProductDailyCapacityUsageRepository extends JpaRepository<ProductDailyCapacityUsage, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<ProductDailyCapacityUsage> findByProductIdAndProductionDate(String productId, LocalDate productionDate);
}
