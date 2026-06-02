package com.petites.backend.addresses.repository;

import com.petites.backend.addresses.entity.Address;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AddressRepository extends JpaRepository<Address, String> {

    List<Address> findByUserId(String userId);

    List<Address> findByGuestSessionId(String guestSessionId);

    Optional<Address> findByIdAndUserId(String id, String userId);

    Optional<Address> findByIdAndGuestSessionId(String id, String guestSessionId);
}