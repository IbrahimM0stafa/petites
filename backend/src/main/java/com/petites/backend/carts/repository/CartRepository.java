package com.petites.backend.carts.repository;

import com.petites.backend.carts.entity.Cart;
import com.petites.backend.carts.enums.CartStatus;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CartRepository extends JpaRepository<Cart, String> {

    Optional<Cart> findByUserIdAndStatus(String userId, CartStatus status);

    Optional<Cart> findByGuestSessionIdAndStatus(String guestSessionId, CartStatus status);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM Cart c WHERE c.guestSessionId IS NOT NULL AND c.status = :status AND c.createdAt < :cutoff")
    int deleteAbandonedGuestCarts(@Param("status") CartStatus status, @Param("cutoff") Instant cutoff);
}
