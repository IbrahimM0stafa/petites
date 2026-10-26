package com.petites.backend.addresses.repository;

import com.petites.backend.addresses.entity.Area;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AreaRepository extends JpaRepository<Area, String> {
    List<Area> findByCityIdOrderBySortOrderAscNameAsc(String cityId);
    List<Area> findByCityIdAndActiveTrueOrderBySortOrderAscNameAsc(String cityId);
    List<Area> findAllByOrderBySortOrderAscNameAsc();
    List<Area> findByActiveTrueOrderBySortOrderAscNameAsc();
}
