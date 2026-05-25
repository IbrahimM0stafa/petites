package com.petites.backend.carts.repository;

import com.petites.backend.carts.entity.Cart;
import com.petites.backend.carts.enums.CartStatus;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CartRepository extends JpaRepository<Cart, String> {

    Optional<Cart> findByUserIdAndStatus(String userId, CartStatus status);

    Optional<Cart> findByGuestSessionIdAndStatus(String guestSessionId, CartStatus status);
}
