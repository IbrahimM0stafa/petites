package com.petites.backend.products.service;

import com.petites.backend.products.entity.InstantDeliveryInventory;
import com.petites.backend.products.entity.Product;
import com.petites.backend.products.entity.ProductDailyCapacityUsage;
import com.petites.backend.products.entity.ProductFulfillment;
import com.petites.backend.products.repository.InstantDeliveryInventoryRepository;
import com.petites.backend.products.repository.ProductDailyCapacityUsageRepository;
import com.petites.backend.products.repository.ProductFulfillmentRepository;
import com.petites.backend.products.repository.ProductRepository;
import com.petites.backend.settings.service.SettingService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.time.*;
import java.util.Optional;
import com.petites.backend.users.service.UserService;
import com.petites.backend.products.dto.FulfillmentStatusResponse;

@Service
public class FulfillmentService {

    private final ProductRepository productRepository;
    private final ProductFulfillmentRepository productFulfillmentRepository;
    private final ProductDailyCapacityUsageRepository productDailyCapacityUsageRepository;
    private final InstantDeliveryInventoryRepository instantDeliveryInventoryRepository;
    private final SettingService settingService;
    private final UserService userService;

    public FulfillmentService(ProductRepository productRepository,
                              ProductFulfillmentRepository productFulfillmentRepository,
                              ProductDailyCapacityUsageRepository productDailyCapacityUsageRepository,
                              InstantDeliveryInventoryRepository instantDeliveryInventoryRepository,
                              SettingService settingService,
                              UserService userService) {
        this.productRepository = productRepository;
        this.productFulfillmentRepository = productFulfillmentRepository;
        this.productDailyCapacityUsageRepository = productDailyCapacityUsageRepository;
        this.instantDeliveryInventoryRepository = instantDeliveryInventoryRepository;
        this.settingService = settingService;
        this.userService = userService;
    }

    private static final ZoneId CAIRO_ZONE = ZoneId.of("Africa/Cairo");

    /**
     * Calculates the earliest scheduled date for Cairo timezone based on global settings.
     * Default cutoff is 19:00 (7 PM).
     */
    public LocalDate calculateEarliestScheduledDate() {
        ZonedDateTime nowCairo = ZonedDateTime.now(CAIRO_ZONE);
        LocalDate todayCairo = nowCairo.toLocalDate();

        String cutoffStr = settingService.getSetting("delivery_cutoff_time", "19:00");
        LocalTime cutoffTime = LocalTime.parse(cutoffStr.trim());

        ZonedDateTime cutoffToday = todayCairo.atTime(cutoffTime).atZone(CAIRO_ZONE);

        if (nowCairo.isAfter(cutoffToday)) {
            return todayCairo.plusDays(2);
        } else {
            return todayCairo.plusDays(1);
        }
    }

    /**
     * Checks if a product is eligible for scheduled preorders on a given date.
     */
    @Transactional(readOnly = true)
    public boolean isScheduledAvailable(String productId, LocalDate requestedDate, int quantity) {
        LocalDate earliestAllowed = calculateEarliestScheduledDate();
        if (requestedDate.isBefore(earliestAllowed)) {
            return false;
        }

        // Get daily capacity (default to 100 if not specified)
        int dailyCapacity = productFulfillmentRepository.findByProductId(productId)
                .map(ProductFulfillment::getDailyCapacity)
                .orElse(100);

        int reserved = productDailyCapacityUsageRepository.findByProductIdAndProductionDate(productId, requestedDate)
                .map(ProductDailyCapacityUsage::getReservedQuantity)
                .orElse(0);

        return (reserved + quantity) <= dailyCapacity;
    }

    /**
     * Reserves scheduled capacity for a product on a given date.
     */
    @Transactional
    public void reserveScheduledCapacity(String productId, LocalDate date, int quantity) {
        if (!isScheduledAvailable(productId, date, quantity)) {
            throw new IllegalArgumentException("Requested scheduled quantity exceeds capacity or production date is invalid");
        }

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));

        ProductDailyCapacityUsage usage = productDailyCapacityUsageRepository
                .findByProductIdAndProductionDate(productId, date)
                .orElseGet(() -> {
                    ProductDailyCapacityUsage newUsage = new ProductDailyCapacityUsage();
                    newUsage.setProduct(product);
                    newUsage.setProductionDate(date);
                    newUsage.setReservedQuantity(0);
                    return newUsage;
                });

        usage.setReservedQuantity(usage.getReservedQuantity() + quantity);
        productDailyCapacityUsageRepository.save(usage);
    }

    /**
     * Releases scheduled capacity for a product on a given date.
     */
    @Transactional
    public void releaseScheduledCapacity(String productId, LocalDate date, int quantity) {
        productDailyCapacityUsageRepository.findByProductIdAndProductionDate(productId, date)
                .ifPresent(usage -> {
                    int nextQty = Math.max(0, usage.getReservedQuantity() - quantity);
                    usage.setReservedQuantity(nextQty);
                    productDailyCapacityUsageRepository.save(usage);
                });
    }

    /**
     * Checks same-day instant availability and quantity for a product.
     */
    @Transactional
    public boolean isInstantAvailable(String productId, int quantity) {
        return getActiveInstantInventory(productId)
                .map(inv -> inv.getAvailableQuantity() >= quantity)
                .orElse(false);
    }

    /**
     * Gets the active, non-expired instant inventory record for a product.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = false)
    public Optional<InstantDeliveryInventory> getActiveInstantInventory(String productId) {
        return instantDeliveryInventoryRepository
                .findFirstByProductIdAndActiveTrueAndAvailableUntilAfterOrderByCreatedAtDesc(productId, Instant.now());
    }

    /**
     * Reserves same-day instant quantity.
     */
    @Transactional
    public void reserveInstantQuantity(String productId, int quantity) {
        InstantDeliveryInventory inv = getActiveInstantInventory(productId)
                .orElseThrow(() -> new IllegalArgumentException("No active instant inventory available for this product"));

        if (inv.getAvailableQuantity() < quantity) {
            throw new IllegalArgumentException("Insufficient same-day instant delivery inventory");
        }

        inv.setAvailableQuantity(inv.getAvailableQuantity() - quantity);
        instantDeliveryInventoryRepository.save(inv);
    }

    /**
     * Releases same-day instant quantity.
     */
    @Transactional
    public void releaseInstantQuantity(String productId, int quantity) {
        getActiveInstantInventory(productId)
                .ifPresent(inv -> {
                    inv.setAvailableQuantity(inv.getAvailableQuantity() + quantity);
                    instantDeliveryInventoryRepository.save(inv);
                });
    }

    /**
     * Gets the full fulfillment status DTO for admin checking.
     */
        @Transactional(propagation = Propagation.REQUIRES_NEW)
    public FulfillmentStatusResponse getFulfillmentStatus(String productId) {

        int dailyCapacity = productFulfillmentRepository.findByProductId(productId)
                .map(ProductFulfillment::getDailyCapacity)
                .orElse(100);

        LocalDate tomorrow = LocalDate.now(CAIRO_ZONE).plusDays(1);
        int reservedTomorrow = productDailyCapacityUsageRepository.findByProductIdAndProductionDate(productId, tomorrow)
                .map(ProductDailyCapacityUsage::getReservedQuantity)
                .orElse(0);

        var activeInstant = getActiveInstantInventory(productId);
        int instantQty = activeInstant.map(InstantDeliveryInventory::getAvailableQuantity).orElse(0);
        boolean instantActive = activeInstant.isPresent();
        Instant instantUntil = activeInstant.map(InstantDeliveryInventory::getAvailableUntil).orElse(null);

        return new FulfillmentStatusResponse(
                productId,
                dailyCapacity,
                reservedTomorrow,
                instantQty,
                instantActive,
                instantUntil
        );
    }

    /**
     * Sets daily capacity limit for scheduled orders.
     */
    @Transactional
    public void updateScheduledCapacity(String productId, int dailyCapacity) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));

        ProductFulfillment fulfillment = productFulfillmentRepository.findByProductId(productId)
                .orElseGet(() -> {
                    ProductFulfillment pf = new ProductFulfillment();
                    pf.setProduct(product);
                    return pf;
                });

        fulfillment.setDailyCapacity(dailyCapacity);
        productFulfillmentRepository.save(fulfillment);
    }

    /**
     * Activates or updates same-day instant delivery inventory.
     */
    @Transactional
    public void updateInstantInventory(String productId, int availableQuantity, Instant availableUntil, boolean active, String adminUserId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));

        com.petites.backend.users.entity.User admin = userService.findById(adminUserId)
                .orElseThrow(() -> new IllegalArgumentException("Authenticated user not found"));

        InstantDeliveryInventory inventory = instantDeliveryInventoryRepository.findByProductId(productId)
                .orElseGet(() -> {
                    InstantDeliveryInventory idi = new InstantDeliveryInventory();
                    idi.setProduct(product);
                    return idi;
                });

        inventory.setAvailableQuantity(availableQuantity);
        inventory.setAvailableUntil(availableUntil);
        inventory.setActive(active);
        inventory.setCreatedBy(admin);

        instantDeliveryInventoryRepository.save(inventory);
    }
}
