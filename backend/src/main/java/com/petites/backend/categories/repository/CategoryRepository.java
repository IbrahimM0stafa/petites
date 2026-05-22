package com.petites.backend.categories.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.petites.backend.categories.entity.Category;

@Repository
public interface CategoryRepository extends JpaRepository<Category, String> {

    @Query(value = "SELECT EXISTS (SELECT 1 FROM products WHERE category_id = :categoryId)", nativeQuery = true)
    boolean hasProducts(@Param("categoryId") String categoryId);
}
