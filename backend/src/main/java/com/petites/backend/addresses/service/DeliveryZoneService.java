package com.petites.backend.addresses.service;

import com.petites.backend.addresses.dto.DeliveryZoneTreeDto.AreaNode;
import com.petites.backend.addresses.dto.DeliveryZoneTreeDto.CityNode;
import com.petites.backend.addresses.dto.DeliveryZoneTreeDto.GovernorateNode;
import com.petites.backend.addresses.entity.Area;
import com.petites.backend.addresses.entity.City;
import com.petites.backend.addresses.entity.Governorate;
import com.petites.backend.addresses.repository.AreaRepository;
import com.petites.backend.addresses.repository.CityRepository;
import com.petites.backend.addresses.repository.GovernorateRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DeliveryZoneService {

    private final GovernorateRepository governorateRepository;
    private final CityRepository cityRepository;
    private final AreaRepository areaRepository;

    public DeliveryZoneService(
            GovernorateRepository governorateRepository,
            CityRepository cityRepository,
            AreaRepository areaRepository
    ) {
        this.governorateRepository = governorateRepository;
        this.cityRepository = cityRepository;
        this.areaRepository = areaRepository;
    }

    // ── Public Storefront Methods ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<GovernorateNode> getPublicZoneTree() {
        List<Governorate> activeGovs = governorateRepository.findByActiveTrueOrderBySortOrderAscNameAsc();
        List<City> activeCities = cityRepository.findByActiveTrueOrderBySortOrderAscNameAsc();
        List<Area> activeAreas = areaRepository.findByActiveTrueOrderBySortOrderAscNameAsc();

        Map<String, List<Area>> areasByCity = activeAreas.stream()
                .collect(Collectors.groupingBy(Area::getCityId));

        Map<String, List<City>> citiesByGov = activeCities.stream()
                .collect(Collectors.groupingBy(City::getGovernorateId));

        List<GovernorateNode> result = new ArrayList<>();
        for (Governorate gov : activeGovs) {
            List<City> cities = citiesByGov.getOrDefault(gov.getId(), List.of());
            List<CityNode> cityNodes = new ArrayList<>();

            for (City city : cities) {
                List<Area> areas = areasByCity.getOrDefault(city.getId(), List.of());
                List<AreaNode> areaNodes = areas.stream()
                        .map(a -> new AreaNode(
                                a.getId(),
                                a.getCityId(),
                                a.getName(),
                                a.isActive(),
                                a.getDeliveryFee(),
                                a.isCourierDelivery(),
                                a.getSortOrder()
                        ))
                        .toList();

                cityNodes.add(new CityNode(
                        city.getId(),
                        city.getGovernorateId(),
                        city.getName(),
                        city.isActive(),
                        city.getSortOrder(),
                        areaNodes
                ));
            }

            result.add(new GovernorateNode(
                    gov.getId(),
                    gov.getName(),
                    gov.isActive(),
                    gov.getSortOrder(),
                    cityNodes
            ));
        }

        return result;
    }

    @Transactional(readOnly = true)
    public Area getArea(String areaId) {
        return areaRepository.findById(areaId)
                .orElseThrow(() -> new IllegalArgumentException("Area not found: " + areaId));
    }

    @Transactional(readOnly = true)
    public City getCity(String cityId) {
        return cityRepository.findById(cityId)
                .orElseThrow(() -> new IllegalArgumentException("City not found: " + cityId));
    }

    @Transactional(readOnly = true)
    public Governorate getGovernorate(String governorateId) {
        return governorateRepository.findById(governorateId)
                .orElseThrow(() -> new IllegalArgumentException("Governorate not found: " + governorateId));
    }

    // ── Admin Governorate Methods ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Governorate> getAllGovernorates() {
        return governorateRepository.findAllByOrderBySortOrderAscNameAsc();
    }

    @Transactional
    public Governorate createGovernorate(String name, boolean active, int sortOrder) {
        Governorate gov = new Governorate(name.trim(), active, sortOrder);
        return governorateRepository.save(gov);
    }

    @Transactional
    public Governorate updateGovernorate(String id, String name, Boolean active, Integer sortOrder) {
        Governorate gov = getGovernorate(id);
        if (name != null && !name.isBlank()) {
            gov.setName(name.trim());
        }
        if (active != null) {
            gov.setActive(active);
        }
        if (sortOrder != null) {
            gov.setSortOrder(sortOrder);
        }
        return governorateRepository.save(gov);
    }

    @Transactional
    public Governorate toggleGovernorateActive(String id) {
        Governorate gov = getGovernorate(id);
        gov.setActive(!gov.isActive());
        return governorateRepository.save(gov);
    }

    @Transactional
    public void deleteGovernorate(String id) {
        Governorate gov = getGovernorate(id);
        // Cascade delete child cities and areas
        List<City> cities = cityRepository.findByGovernorateIdOrderBySortOrderAscNameAsc(id);
        for (City c : cities) {
            deleteCity(c.getId());
        }
        governorateRepository.delete(gov);
    }

    // ── Admin City Methods ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<City> getCities(String governorateId) {
        if (governorateId != null && !governorateId.isBlank()) {
            return cityRepository.findByGovernorateIdOrderBySortOrderAscNameAsc(governorateId);
        }
        return cityRepository.findAllByOrderBySortOrderAscNameAsc();
    }

    @Transactional
    public City createCity(String governorateId, String name, boolean active, int sortOrder) {
        getGovernorate(governorateId); // validate governorate exists
        City city = new City(governorateId, name.trim(), active, sortOrder);
        return cityRepository.save(city);
    }

    @Transactional
    public City updateCity(String id, String name, Boolean active, Integer sortOrder) {
        City city = getCity(id);
        if (name != null && !name.isBlank()) {
            city.setName(name.trim());
        }
        if (active != null) {
            city.setActive(active);
        }
        if (sortOrder != null) {
            city.setSortOrder(sortOrder);
        }
        return cityRepository.save(city);
    }

    @Transactional
    public City toggleCityActive(String id) {
        City city = getCity(id);
        city.setActive(!city.isActive());
        return cityRepository.save(city);
    }

    @Transactional
    public void deleteCity(String id) {
        City city = getCity(id);
        List<Area> areas = areaRepository.findByCityIdOrderBySortOrderAscNameAsc(id);
        areaRepository.deleteAll(areas);
        cityRepository.delete(city);
    }

    // ── Admin Area Methods ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Area> getAreas(String cityId) {
        if (cityId != null && !cityId.isBlank()) {
            return areaRepository.findByCityIdOrderBySortOrderAscNameAsc(cityId);
        }
        return areaRepository.findAllByOrderBySortOrderAscNameAsc();
    }

    @Transactional
    public Area createArea(String cityId, String name, BigDecimal deliveryFee, boolean courierDelivery, boolean active, int sortOrder) {
        getCity(cityId); // validate city exists
        Area area = new Area(cityId, name.trim(), deliveryFee, courierDelivery, active, sortOrder);
        return areaRepository.save(area);
    }

    @Transactional
    public Area updateArea(String id, String name, BigDecimal deliveryFee, Boolean courierDelivery, Boolean active, Integer sortOrder) {
        Area area = getArea(id);
        if (name != null && !name.isBlank()) {
            area.setName(name.trim());
        }
        if (deliveryFee != null) {
            area.setDeliveryFee(deliveryFee);
        }
        if (courierDelivery != null) {
            area.setCourierDelivery(courierDelivery);
        }
        if (active != null) {
            area.setActive(active);
        }
        if (sortOrder != null) {
            area.setSortOrder(sortOrder);
        }
        return areaRepository.save(area);
    }

    @Transactional
    public Area toggleAreaActive(String id) {
        Area area = getArea(id);
        area.setActive(!area.isActive());
        return areaRepository.save(area);
    }

    @Transactional
    public Area toggleAreaCourier(String id) {
        Area area = getArea(id);
        area.setCourierDelivery(!area.isCourierDelivery());
        return areaRepository.save(area);
    }

    @Transactional
    public void deleteArea(String id) {
        Area area = getArea(id);
        areaRepository.delete(area);
    }
}
