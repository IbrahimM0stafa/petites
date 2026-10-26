package com.petites.backend.addresses.seed;

import com.petites.backend.addresses.entity.Area;
import com.petites.backend.addresses.entity.City;
import com.petites.backend.addresses.entity.Governorate;
import com.petites.backend.addresses.repository.AreaRepository;
import com.petites.backend.addresses.repository.CityRepository;
import com.petites.backend.addresses.repository.GovernorateRepository;
import java.math.BigDecimal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Order(3)
public class DeliveryZoneSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DeliveryZoneSeeder.class);

    private final GovernorateRepository governorateRepository;
    private final CityRepository cityRepository;
    private final AreaRepository areaRepository;

    public DeliveryZoneSeeder(
            GovernorateRepository governorateRepository,
            CityRepository cityRepository,
            AreaRepository areaRepository
    ) {
        this.governorateRepository = governorateRepository;
        this.cityRepository = cityRepository;
        this.areaRepository = areaRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (governorateRepository.count() > 0) {
            return;
        }

        log.info("Seeding initial delivery zones (Governorates, Cities, and Areas)...");

        // 1. Cairo
        Governorate cairo = governorateRepository.save(new Governorate("Cairo", true, 1));

        City newCairo = cityRepository.save(new City(cairo.getId(), "New Cairo", true, 1));
        areaRepository.save(new Area(newCairo.getId(), "Fifth Settlement", new BigDecimal("50.00"), false, true, 1));
        areaRepository.save(new Area(newCairo.getId(), "First Settlement", new BigDecimal("55.00"), false, true, 2));
        areaRepository.save(new Area(newCairo.getId(), "Al Rehab", new BigDecimal("60.00"), false, true, 3));
        areaRepository.save(new Area(newCairo.getId(), "Madinaty", new BigDecimal("70.00"), false, true, 4));
        areaRepository.save(new Area(newCairo.getId(), "Choueifat", new BigDecimal("50.00"), false, true, 5));

        City maadi = cityRepository.save(new City(cairo.getId(), "Maadi", true, 2));
        areaRepository.save(new Area(maadi.getId(), "Degla", new BigDecimal("40.00"), false, true, 1));
        areaRepository.save(new Area(maadi.getId(), "Sarayat", new BigDecimal("40.00"), false, true, 2));
        areaRepository.save(new Area(maadi.getId(), "Zahraa El Maadi", new BigDecimal("45.00"), false, true, 3));
        areaRepository.save(new Area(maadi.getId(), "Old Maadi", new BigDecimal("40.00"), false, true, 4));

        City heliopolis = cityRepository.save(new City(cairo.getId(), "Heliopolis & Nasr City", true, 3));
        areaRepository.save(new Area(heliopolis.getId(), "Korba", new BigDecimal("50.00"), false, true, 1));
        areaRepository.save(new Area(heliopolis.getId(), "Roxy", new BigDecimal("50.00"), false, true, 2));
        areaRepository.save(new Area(heliopolis.getId(), "Makram Ebeid", new BigDecimal("50.00"), false, true, 3));
        areaRepository.save(new Area(heliopolis.getId(), "Abbas El Akkad", new BigDecimal("50.00"), false, true, 4));

        City downtown = cityRepository.save(new City(cairo.getId(), "Zamalek & Downtown", true, 4));
        areaRepository.save(new Area(downtown.getId(), "Zamalek", new BigDecimal("50.00"), false, true, 1));
        areaRepository.save(new Area(downtown.getId(), "Garden City", new BigDecimal("50.00"), false, true, 2));
        areaRepository.save(new Area(downtown.getId(), "Downtown", new BigDecimal("50.00"), false, true, 3));

        // 2. Giza
        Governorate giza = governorateRepository.save(new Governorate("Giza", true, 2));

        City zayed = cityRepository.save(new City(giza.getId(), "Sheikh Zayed & 6th of October", true, 1));
        areaRepository.save(new Area(zayed.getId(), "Sheikh Zayed Central", new BigDecimal("60.00"), false, true, 1));
        areaRepository.save(new Area(zayed.getId(), "Beverly Hills", new BigDecimal("70.00"), false, true, 2));
        areaRepository.save(new Area(zayed.getId(), "6th of October City", new BigDecimal("70.00"), false, true, 3));

        City dokki = cityRepository.save(new City(giza.getId(), "Dokki & Mohandessin", true, 2));
        areaRepository.save(new Area(dokki.getId(), "Dokki", new BigDecimal("45.00"), false, true, 1));
        areaRepository.save(new Area(dokki.getId(), "Mohandessin", new BigDecimal("45.00"), false, true, 2));
        areaRepository.save(new Area(dokki.getId(), "Agouza", new BigDecimal("45.00"), false, true, 3));

        // 3. Alexandria (Courier delivery partner)
        Governorate alex = governorateRepository.save(new Governorate("Alexandria", true, 3));

        City alexCity = cityRepository.save(new City(alex.getId(), "Alexandria", true, 1));
        areaRepository.save(new Area(alexCity.getId(), "Smouha", BigDecimal.ZERO, true, true, 1));
        areaRepository.save(new Area(alexCity.getId(), "San Stefano", BigDecimal.ZERO, true, true, 2));
        areaRepository.save(new Area(alexCity.getId(), "Stanley", BigDecimal.ZERO, true, true, 3));
        areaRepository.save(new Area(alexCity.getId(), "Miami", BigDecimal.ZERO, true, true, 4));

        log.info("Delivery zones successfully seeded!");
    }
}
