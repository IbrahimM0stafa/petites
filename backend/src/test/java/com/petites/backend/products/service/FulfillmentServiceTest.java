package com.petites.backend.products.service;

import com.petites.backend.products.entity.InstantDeliveryInventory;
import com.petites.backend.products.entity.ProductDailyCapacityUsage;
import com.petites.backend.products.entity.ProductFulfillment;
import com.petites.backend.products.repository.InstantDeliveryInventoryRepository;
import com.petites.backend.products.repository.ProductDailyCapacityUsageRepository;
import com.petites.backend.products.repository.ProductFulfillmentRepository;
import com.petites.backend.products.repository.ProductRepository;
import com.petites.backend.settings.service.SettingService;
import com.petites.backend.users.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.*;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class FulfillmentServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductFulfillmentRepository productFulfillmentRepository;

    @Mock
    private ProductDailyCapacityUsageRepository productDailyCapacityUsageRepository;

    @Mock
    private InstantDeliveryInventoryRepository instantDeliveryInventoryRepository;

    @Mock
    private SettingService settingService;

    @Mock
    private UserService userService;

    @InjectMocks
    private FulfillmentService fulfillmentService;

    private static final String PRODUCT_ID = "test-product-uuid";
    private static final ZoneId CAIRO_ZONE = ZoneId.of("Africa/Cairo");

    @BeforeEach
    public void setUp() {
    }

    @Test
    public void testCalculateEarliestScheduledDate() {
        when(settingService.getSetting("delivery_cutoff_time", "19:00")).thenReturn("19:00");

        ZonedDateTime nowCairo = ZonedDateTime.now(CAIRO_ZONE);
        LocalDate todayCairo = nowCairo.toLocalDate();
        LocalTime cutoffTime = LocalTime.of(19, 0);

        LocalDate expected;
        if (nowCairo.toLocalTime().isAfter(cutoffTime)) {
            expected = todayCairo.plusDays(2);
        } else {
            expected = todayCairo.plusDays(1);
        }

        LocalDate actual = fulfillmentService.calculateEarliestScheduledDate();
        assertEquals(expected, actual);
    }

    @Test
    public void testIsScheduledAvailable_WithinCapacity() {
        LocalDate tomorrow = LocalDate.now(CAIRO_ZONE).plusDays(1);

        ProductFulfillment fulfillment = new ProductFulfillment();
        fulfillment.setDailyCapacity(10);
        when(productFulfillmentRepository.findByProductId(PRODUCT_ID)).thenReturn(Optional.of(fulfillment));

        ProductDailyCapacityUsage usage = new ProductDailyCapacityUsage();
        usage.setReservedQuantity(5);
        when(productDailyCapacityUsageRepository.findByProductIdAndProductionDate(PRODUCT_ID, tomorrow))
                .thenReturn(Optional.of(usage));

        when(settingService.getSetting("delivery_cutoff_time", "19:00")).thenReturn("19:00");

        // Requested 3: 5 + 3 = 8 <= 10 -> should be true
        assertTrue(fulfillmentService.isScheduledAvailable(PRODUCT_ID, tomorrow, 3));

        // Requested 6: 5 + 6 = 11 > 10 -> should be false
        assertFalse(fulfillmentService.isScheduledAvailable(PRODUCT_ID, tomorrow, 6));
    }

    @Test
    public void testIsInstantAvailable_Success() {
        InstantDeliveryInventory inventory = new InstantDeliveryInventory();
        inventory.setAvailableQuantity(15);
        inventory.setAvailableUntil(Instant.now().plus(Duration.ofHours(2)));

        when(instantDeliveryInventoryRepository
                .findFirstByProductIdAndActiveTrueAndAvailableUntilAfterOrderByCreatedAtDesc(eq(PRODUCT_ID), any(Instant.class)))
                .thenReturn(Optional.of(inventory));

        assertTrue(fulfillmentService.isInstantAvailable(PRODUCT_ID, 5));
        assertFalse(fulfillmentService.isInstantAvailable(PRODUCT_ID, 20));
    }

    @Test
    public void testIsInstantAvailable_ExpiredOrInactive() {
        when(instantDeliveryInventoryRepository
                .findFirstByProductIdAndActiveTrueAndAvailableUntilAfterOrderByCreatedAtDesc(eq(PRODUCT_ID), any(Instant.class)))
                .thenReturn(Optional.empty());

        assertFalse(fulfillmentService.isInstantAvailable(PRODUCT_ID, 1));
    }
}
