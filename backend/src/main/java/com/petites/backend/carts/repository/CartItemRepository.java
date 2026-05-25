package com.petites.backend.carts.repository;

import com.petites.backend.carts.entity.CartItem;
import com.petites.backend.common.enums.DeliveryMode;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, String> {

    List<CartItem> findByCartIdOrderByCreatedAtAsc(String cartId);

    Optional<CartItem> findByIdAndCartId(String id, String cartId);

    Optional<CartItem> findByCartIdAndProductIdAndDeliveryMode(String cartId, String productId, DeliveryMode deliveryMode);

    void deleteByCartId(String cartId);
}
