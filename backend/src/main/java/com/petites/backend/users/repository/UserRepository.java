package com.petites.backend.users.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.petites.backend.users.entity.User;

public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @Query("""
            SELECT DISTINCT u FROM User u
            LEFT JOIN u.roles r
            WHERE (CAST(:name AS String) IS NULL OR LOWER(u.name) LIKE LOWER(CONCAT('%', CAST(:name AS String), '%')))
              AND (CAST(:role AS String) IS NULL OR r.name = CAST(:role AS String))
            """)
    Page<User> findAllFiltered(
            @Param("name") String name,
            @Param("role") String role,
            Pageable pageable);
}
