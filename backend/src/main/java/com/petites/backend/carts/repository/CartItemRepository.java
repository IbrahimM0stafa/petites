package com.petites.backend.carts.repository;

import com.petites.backend.carts.entity.CartItem;
import com.petites.backend.common.enums.DeliveryMode;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, String> {

    List<CartItem> findByCartIdOrderByCreatedAtAsc(String cartId);

    Optional<CartItem> findByIdAndCartId(String id, String cartId);

    Optional<CartItem> findByCartIdAndProductIdAndDeliveryMode(String cartId, String productId, DeliveryMode deliveryMode);

    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM CartItem ci WHERE ci.cart.id = :cartId")
    void deleteByCartId(@Param("cartId") String cartId);
}
