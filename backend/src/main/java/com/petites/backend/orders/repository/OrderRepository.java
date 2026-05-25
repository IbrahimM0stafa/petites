package com.petites.backend.orders.repository;

import com.petites.backend.orders.entity.Order;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrderRepository extends JpaRepository<Order, String> {

    List<Order> findByUserIdOrderByCreatedAtDesc(String userId);

    List<Order> findByGuestSessionIdOrderByCreatedAtDesc(String guestSessionId);

    Optional<Order> findByIdAndUserId(String id, String userId);

    Optional<Order> findByIdAndGuestSessionId(String id, String guestSessionId);
}
