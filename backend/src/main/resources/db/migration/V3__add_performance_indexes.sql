-- Migration V3: Add performance and foreign key indexes for scale
-- Orders & Order Items
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_guest_created ON orders (guest_session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_scheduled_date ON orders (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);

-- Cart Items
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items (cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items (product_id);

-- Products & Inventory
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_avail_feat ON products (is_available, is_featured);
CREATE INDEX IF NOT EXISTS idx_products_price ON products (price);
CREATE INDEX IF NOT EXISTS idx_idi_prod_active_avail ON instant_delivery_inventory (product_id, is_active, available_until);
CREATE INDEX IF NOT EXISTS idx_pdcu_production_date ON product_daily_capacity_usage (production_date);
