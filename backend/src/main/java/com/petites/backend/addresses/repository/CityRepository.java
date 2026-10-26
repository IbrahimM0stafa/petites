package com.petites.backend.addresses.repository;

import com.petites.backend.addresses.entity.City;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CityRepository extends JpaRepository<City, String> {
    List<City> findByGovernorateIdOrderBySortOrderAscNameAsc(String governorateId);
    List<City> findByGovernorateIdAndActiveTrueOrderBySortOrderAscNameAsc(String governorateId);
    List<City> findAllByOrderBySortOrderAscNameAsc();
    List<City> findByActiveTrueOrderBySortOrderAscNameAsc();
}
