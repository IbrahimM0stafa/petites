package com.petites.backend.migration;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.sql.DataSource;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.output.MigrateResult;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.hibernate.tool.schema.spi.SchemaManagementToolCoordinator;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class FlywayMigrationIntegrationTest {

    private static final String TEST_SCHEMA = "petites_migration_test_empty";

    @Autowired
    private DataSource dataSource;

    @BeforeEach
    void setUpIsolatedEmptySchema() throws Exception {
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute("DROP SCHEMA IF EXISTS " + TEST_SCHEMA + " CASCADE");
            stmt.execute("CREATE SCHEMA " + TEST_SCHEMA);
        }
    }

    @AfterEach
    void tearDownIsolatedSchema() throws Exception {
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute("DROP SCHEMA IF EXISTS " + TEST_SCHEMA + " CASCADE");
        }
    }

    @Test
    @DisplayName("Verify clean Flyway migration on an empty PostgreSQL database and validate with Hibernate schema validator")
    void testFlywayMigrationOnEmptyDatabaseAndValidateHibernateSchema() throws Exception {
        // 1. Configure Flyway targeting the isolated empty schema
        Flyway flyway = Flyway.configure()
                .dataSource(dataSource)
                .schemas(TEST_SCHEMA)
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .baselineVersion("1")
                .load();

        // 2. Execute migration against the empty schema
        MigrateResult result = flyway.migrate();
        Assertions.assertTrue(result.success, "Flyway migration should succeed on empty schema");
        Assertions.assertTrue(result.migrationsExecuted > 0, "Flyway migrations should have been executed");

        var infoService = flyway.info();
        Assertions.assertEquals(0, infoService.pending().length, "There should be no pending migrations after migrate()");
        var applied = infoService.applied();
        Assertions.assertTrue(applied.length > 0, "At least one migration should be applied");
        for (var info : applied) {
            Assertions.assertTrue(info.getState().isApplied(), "Migration " + info.getScript() + " should be in applied state");
            Assertions.assertFalse(info.getState().isFailed(), "Migration " + info.getScript() + " should not be failed");
        }

        // 3. Verify all 23 tables exist in the migrated schema
        List<String> tables = new ArrayList<>();
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(
                     "SELECT table_name FROM information_schema.tables WHERE table_schema = '" + TEST_SCHEMA + "' AND table_type = 'BASE TABLE'")) {
            while (rs.next()) {
                tables.add(rs.getString("table_name"));
            }
        }

        Assertions.assertTrue(tables.contains("flyway_schema_history"), "flyway_schema_history must exist");
        Assertions.assertTrue(tables.contains("users"), "users table must exist");
        Assertions.assertTrue(tables.contains("roles"), "roles table must exist");
        Assertions.assertTrue(tables.contains("user_roles"), "user_roles table must exist");
        Assertions.assertTrue(tables.contains("categories"), "categories table must exist");
        Assertions.assertTrue(tables.contains("products"), "products table must exist");
        Assertions.assertTrue(tables.contains("product_images"), "product_images table must exist");
        Assertions.assertTrue(tables.contains("product_fulfillment"), "product_fulfillment table must exist");
        Assertions.assertTrue(tables.contains("instant_delivery_inventory"), "instant_delivery_inventory table must exist");
        Assertions.assertTrue(tables.contains("product_daily_capacity_usage"), "product_daily_capacity_usage table must exist");
        Assertions.assertTrue(tables.contains("orders"), "orders table must exist");
        Assertions.assertTrue(tables.contains("order_items"), "order_items table must exist");
        Assertions.assertTrue(tables.contains("carts"), "carts table must exist");
        Assertions.assertTrue(tables.contains("cart_items"), "cart_items table must exist");
        Assertions.assertTrue(tables.contains("coupons"), "coupons table must exist");
        Assertions.assertTrue(tables.contains("coupon_usage"), "coupon_usage table must exist");
        Assertions.assertTrue(tables.contains("settings"), "settings table must exist");
        Assertions.assertTrue(tables.contains("addresses"), "addresses table must exist");
        Assertions.assertTrue(tables.contains("governorates"), "governorates table must exist");
        Assertions.assertTrue(tables.contains("cities"), "cities table must exist");
        Assertions.assertTrue(tables.contains("areas"), "areas table must exist");
        Assertions.assertTrue(tables.contains("guest_sessions"), "guest_sessions table must exist");
        Assertions.assertTrue(tables.contains("refresh_tokens"), "refresh_tokens table must exist");
        Assertions.assertTrue(tables.contains("password_reset_otps"), "password_reset_otps table must exist");

        // Verify V2 column failed_attempts exists on password_reset_otps
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(
                     "SELECT column_name FROM information_schema.columns WHERE table_schema = '" + TEST_SCHEMA + "' AND table_name = 'password_reset_otps' AND column_name = 'failed_attempts'")) {
            Assertions.assertTrue(rs.next(), "failed_attempts column must exist on password_reset_otps");
        }

        // 4. Verify default roles seeded idempotently
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM " + TEST_SCHEMA + ".roles")) {
            Assertions.assertTrue(rs.next());
            Assertions.assertEquals(3, rs.getInt(1), "3 default roles should be seeded");
        }

        // 5. Run Hibernate SchemaValidator (ddl-auto=validate) against the migrated schema
        Map<String, Object> settings = new HashMap<>();
        settings.put("hibernate.connection.datasource", dataSource);
        settings.put("hibernate.default_schema", TEST_SCHEMA);
        settings.put("hibernate.hbm2ddl.auto", "validate");

        StandardServiceRegistry registry = new StandardServiceRegistryBuilder()
                .applySettings(settings)
                .build();

        try {
            MetadataSources metadataSources = new MetadataSources(registry);
            // Scan entity packages
            metadataSources.addPackage("com.petites.backend.users.entity");
            metadataSources.addPackage("com.petites.backend.products.entity");
            metadataSources.addPackage("com.petites.backend.orders.entity");
            metadataSources.addPackage("com.petites.backend.carts.entity");
            metadataSources.addPackage("com.petites.backend.coupons.entity");
            metadataSources.addPackage("com.petites.backend.categories.entity");
            metadataSources.addPackage("com.petites.backend.auth.entity");
            metadataSources.addPackage("com.petites.backend.addresses.entity");
            metadataSources.addPackage("com.petites.backend.settings.entity");

            metadataSources.addAnnotatedClass(com.petites.backend.users.entity.User.class);
            metadataSources.addAnnotatedClass(com.petites.backend.users.entity.Role.class);
            metadataSources.addAnnotatedClass(com.petites.backend.products.entity.Product.class);
            metadataSources.addAnnotatedClass(com.petites.backend.products.entity.ProductImage.class);
            metadataSources.addAnnotatedClass(com.petites.backend.products.entity.ProductFulfillment.class);
            metadataSources.addAnnotatedClass(com.petites.backend.products.entity.InstantDeliveryInventory.class);
            metadataSources.addAnnotatedClass(com.petites.backend.products.entity.ProductDailyCapacityUsage.class);
            metadataSources.addAnnotatedClass(com.petites.backend.orders.entity.Order.class);
            metadataSources.addAnnotatedClass(com.petites.backend.orders.entity.OrderItem.class);
            metadataSources.addAnnotatedClass(com.petites.backend.carts.entity.Cart.class);
            metadataSources.addAnnotatedClass(com.petites.backend.carts.entity.CartItem.class);
            metadataSources.addAnnotatedClass(com.petites.backend.coupons.entity.Coupon.class);
            metadataSources.addAnnotatedClass(com.petites.backend.coupons.entity.CouponUsage.class);
            metadataSources.addAnnotatedClass(com.petites.backend.categories.entity.Category.class);
            metadataSources.addAnnotatedClass(com.petites.backend.auth.entity.GuestSession.class);
            metadataSources.addAnnotatedClass(com.petites.backend.auth.entity.RefreshToken.class);
            metadataSources.addAnnotatedClass(com.petites.backend.auth.entity.PasswordResetOtp.class);
            metadataSources.addAnnotatedClass(com.petites.backend.addresses.entity.Governorate.class);
            metadataSources.addAnnotatedClass(com.petites.backend.addresses.entity.City.class);
            metadataSources.addAnnotatedClass(com.petites.backend.addresses.entity.Area.class);
            metadataSources.addAnnotatedClass(com.petites.backend.addresses.entity.Address.class);
            metadataSources.addAnnotatedClass(com.petites.backend.settings.entity.Setting.class);

            var metadata = metadataSources.buildMetadata();
            // Validate schema - throws SchemaManagementException if validation fails
            SchemaManagementToolCoordinator.process(
                    metadata,
                    registry,
                    settings,
                    null
            );
        } finally {
            StandardServiceRegistryBuilder.destroy(registry);
        }
    }
}
