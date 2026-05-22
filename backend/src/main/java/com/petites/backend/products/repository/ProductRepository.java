package com.petites.backend.products.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.petites.backend.products.entity.Product;

@Repository
public interface ProductRepository extends JpaRepository<Product, String> {

    Page<Product> findByCategoryId(String categoryId, Pageable pageable);

    Page<Product> findByAvailable(boolean available, Pageable pageable);

    Page<Product> findByCategoryIdAndAvailable(String categoryId, boolean available, Pageable pageable);

    Page<Product> findByFeaturedTrueAndAvailableTrue(Pageable pageable);
}
