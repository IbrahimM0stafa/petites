package com.petites.backend.products.repository;

import com.petites.backend.products.entity.ProductFulfillment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProductFulfillmentRepository extends JpaRepository<ProductFulfillment, String> {
    Optional<ProductFulfillment> findByProductId(String productId);
}
