package com.petites.backend.products.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.petites.backend.products.entity.ProductImage;

@Repository
public interface ProductImageRepository extends JpaRepository<ProductImage, String> {
}
