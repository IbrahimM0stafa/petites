package com.petites.backend.addresses.repository;

import com.petites.backend.addresses.entity.Governorate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GovernorateRepository extends JpaRepository<Governorate, String> {
    List<Governorate> findAllByOrderBySortOrderAscNameAsc();
    List<Governorate> findByActiveTrueOrderBySortOrderAscNameAsc();
}
