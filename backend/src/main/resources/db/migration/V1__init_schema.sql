-- ============================================================================
-- Petites E-Commerce Platform - V1 Schema Baseline
-- Covers all 23 JPA Entities, Relationships, Constraints, and Indexes
-- ============================================================================

-- 1. Administrative & Geographic Tables
CREATE TABLE IF NOT EXISTS governorates (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cities (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    governorate_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS areas (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    city_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_courier_delivery BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS addresses (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    governorate_id VARCHAR(36),
    governorate VARCHAR(100),
    city_id VARCHAR(36),
    city VARCHAR(100) NOT NULL,
    area_id VARCHAR(36),
    area VARCHAR(100) NOT NULL,
    street VARCHAR(255) NOT NULL,
    building VARCHAR(50),
    notes TEXT
);

-- 2. Identity, Authentication & Roles
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP(6) WITH TIME ZONE,
    updated_at TIMESTAMP(6) WITH TIME ZONE,
    CONSTRAINT uk_roles_name UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(120),
    password_hash VARCHAR(255),
    completed_orders_count INTEGER NOT NULL DEFAULT 0,
    rewards_redeemed_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(6) WITH TIME ZONE,
    updated_at TIMESTAMP(6) WITH TIME ZONE,
    CONSTRAINT uk_users_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id VARCHAR(36) NOT NULL,
    role_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP(6) WITH TIME ZONE,
    created_at TIMESTAMP(6) WITH TIME ZONE,
    updated_at TIMESTAMP(6) WITH TIME ZONE,
    CONSTRAINT uk_refresh_tokens_hash UNIQUE (token_hash),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_revoked ON refresh_tokens (user_id, revoked_at);

CREATE TABLE IF NOT EXISTS password_reset_otps (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP(6) WITH TIME ZONE,
    created_at TIMESTAMP(6) WITH TIME ZONE,
    updated_at TIMESTAMP(6) WITH TIME ZONE,
    CONSTRAINT fk_password_reset_otps_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pwd_reset_otps_user ON password_reset_otps (user_id);

CREATE TABLE IF NOT EXISTS guest_sessions (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    session_token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP(6) WITH TIME ZONE,
    created_at TIMESTAMP(6) WITH TIME ZONE,
    CONSTRAINT uk_guest_sessions_token UNIQUE (session_token)
);

CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires_at ON guest_sessions (expires_at);

-- 3. Settings & Configuration
CREATE TABLE IF NOT EXISTS settings (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP(6) WITH TIME ZONE,
    CONSTRAINT uk_settings_key UNIQUE (setting_key)
);

-- 4. Product Catalog & Inventory
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    image_url TEXT,
    sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    category_id VARCHAR(36),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    main_image TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP(6) WITH TIME ZONE,
    updated_at TIMESTAMP(6) WITH TIME ZONE,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS product_images (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL,
    image_url TEXT NOT NULL,
    CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_fulfillment (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL,
    daily_capacity INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP(6) WITH TIME ZONE,
    CONSTRAINT uk_product_fulfillment_product UNIQUE (product_id),
    CONSTRAINT fk_product_fulfillment_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS instant_delivery_inventory (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL,
    available_quantity INTEGER NOT NULL DEFAULT 0,
    available_until TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(36),
    created_at TIMESTAMP(6) WITH TIME ZONE,
    updated_at TIMESTAMP(6) WITH TIME ZONE,
    CONSTRAINT uk_instant_delivery_product UNIQUE (product_id),
    CONSTRAINT fk_instant_delivery_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT fk_instant_delivery_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS product_daily_capacity_usage (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL,
    production_date DATE NOT NULL,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) WITH TIME ZONE,
    CONSTRAINT uk_capacity_product_date UNIQUE (product_id, production_date),
    CONSTRAINT fk_capacity_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);

-- 5. Coupons & Discounts
CREATE TABLE IF NOT EXISTS coupons (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    discount_type VARCHAR(20) NOT NULL,
    discount_value NUMERIC(10, 2) NOT NULL,
    minimum_order_amount NUMERIC(10, 2) DEFAULT 0.00,
    max_discount_amount NUMERIC(10, 2),
    usage_limit INTEGER,
    per_user_limit INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    starts_at TIMESTAMP(6) WITH TIME ZONE,
    expires_at TIMESTAMP(6) WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP(6) WITH TIME ZONE,
    CONSTRAINT uk_coupons_code UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS coupon_usage (
    coupon_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    used_count INTEGER NOT NULL DEFAULT 0,
    last_used_at TIMESTAMP(6) WITH TIME ZONE,
    PRIMARY KEY (coupon_id, user_id)
);

-- 6. Shopping Cart
CREATE TABLE IF NOT EXISTS carts (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36),
    guest_session_id VARCHAR(36),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS cart_items (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    cart_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    delivery_mode VARCHAR(20) NOT NULL,
    created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts (id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);

-- 7. Orders & Order Items
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    order_number VARCHAR(30) NOT NULL,
    user_id VARCHAR(36),
    guest_session_id VARCHAR(36),
    address_id VARCHAR(36),
    governorate_id VARCHAR(36),
    delivery_governorate VARCHAR(100),
    city_id VARCHAR(36),
    delivery_city VARCHAR(100),
    area_id VARCHAR(36),
    delivery_area VARCHAR(100),
    delivery_street VARCHAR(255),
    delivery_building VARCHAR(50),
    delivery_notes TEXT,
    is_courier_delivery BOOLEAN DEFAULT false,
    delivery_mode VARCHAR(20) NOT NULL,
    order_type VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    payment_method VARCHAR(20) NOT NULL DEFAULT 'INSTAPAY',
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    scheduled_date DATE,
    notes TEXT,
    coupon_id VARCHAR(36),
    reward_applied BOOLEAN NOT NULL DEFAULT false,
    completion_recorded BOOLEAN DEFAULT false,
    created_at TIMESTAMP(6) WITH TIME ZONE,
    updated_at TIMESTAMP(6) WITH TIME ZONE,
    CONSTRAINT uk_orders_order_number UNIQUE (order_number)
);

CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    product_image TEXT,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    line_total NUMERIC(10, 2) NOT NULL,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
);

-- 8. Seed Default Roles (Idempotent)
INSERT INTO roles (id, name, created_at, updated_at)
VALUES 
    ('role-super-admin-01', 'SUPER_ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('role-staff-01', 'STAFF', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('role-user-01', 'USER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;
