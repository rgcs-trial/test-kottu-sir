-- =============================================
-- Restaurant SaaS Platform - Performance Indexes
-- Migration: 004_indexes.sql
-- =============================================

-- =============================================
-- PRIMARY ENTITY INDEXES
-- =============================================

-- Tenants table indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_location ON tenants USING GIST(point(longitude, latitude)) WHERE deleted_at IS NULL AND longitude IS NOT NULL AND latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_subscription ON tenants(subscription_plan, subscription_expires_at) WHERE deleted_at IS NULL;

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_role ON profiles(tenant_id, role) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_profiles_last_login ON profiles(last_login_at DESC) WHERE is_active = true;

-- =============================================
-- MENU SYSTEM INDEXES
-- =============================================

-- Menu categories indexes
CREATE INDEX IF NOT EXISTS idx_menu_categories_tenant ON menu_categories(tenant_id, is_active, sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_menu_categories_availability ON menu_categories(tenant_id, available_days) WHERE is_active = true;

-- Menu items indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_tenant_category ON menu_items(tenant_id, category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_menu_items_availability ON menu_items(tenant_id, is_available, is_featured) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_menu_items_search ON menu_items USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, ''))) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_menu_items_featured ON menu_items(tenant_id, is_featured, sort_order) WHERE is_featured = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_menu_items_price ON menu_items(tenant_id, base_price) WHERE is_available = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_menu_items_dietary ON menu_items USING GIN(dietary_tags) WHERE is_available = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_menu_items_ingredients ON menu_items USING GIN(ingredients) WHERE is_available = true AND deleted_at IS NULL;

-- Menu item variants indexes
CREATE INDEX IF NOT EXISTS idx_menu_item_variants_item ON menu_item_variants(menu_item_id, is_available, sort_order);
CREATE INDEX IF NOT EXISTS idx_menu_item_variants_default ON menu_item_variants(menu_item_id, is_default) WHERE is_default = true;

-- Menu item modifiers indexes
CREATE INDEX IF NOT EXISTS idx_menu_item_modifiers_item ON menu_item_modifiers(menu_item_id, is_available, sort_order);
CREATE INDEX IF NOT EXISTS idx_menu_item_modifiers_required ON menu_item_modifiers(menu_item_id, is_required) WHERE is_required = true;

-- =============================================
-- CART AND ORDER SYSTEM INDEXES
-- =============================================

-- Carts table indexes
CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id, tenant_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carts_session ON carts(session_id, tenant_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carts_expiry ON carts(expires_at) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_carts_tenant ON carts(tenant_id, created_at DESC);

-- Cart items indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_menu_item ON cart_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant ON cart_items(variant_id) WHERE variant_id IS NOT NULL;

-- Orders table indexes - Critical for performance
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number) WHERE order_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment ON orders(tenant_id, fulfillment_type, status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone, created_at DESC) WHERE customer_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_date_range ON orders(tenant_id, created_at) INCLUDE (total_amount, status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery ON orders(tenant_id, fulfillment_type, estimated_delivery_time) WHERE fulfillment_type = 'delivery';

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item ON order_items(menu_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_variant ON order_items(variant_id) WHERE variant_id IS NOT NULL;

-- Order status history indexes
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_by ON order_status_history(changed_by, created_at DESC) WHERE changed_by IS NOT NULL;

-- =============================================
-- PAYMENT SYSTEM INDEXES
-- =============================================

-- Payment transactions indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider ON payment_transactions(payment_provider, provider_transaction_id) WHERE provider_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_transactions_method ON payment_transactions(payment_method, created_at DESC);

-- =============================================
-- RESTAURANT MANAGEMENT INDEXES
-- =============================================

-- Restaurant settings indexes
CREATE INDEX IF NOT EXISTS idx_restaurant_settings_tenant ON restaurant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_settings_status ON restaurant_settings(tenant_id, is_open, accepts_orders);

-- Restaurant hours indexes
CREATE INDEX IF NOT EXISTS idx_restaurant_hours_tenant ON restaurant_hours(tenant_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_restaurant_hours_open ON restaurant_hours(tenant_id, is_open, day_of_week) WHERE is_open = true;

-- =============================================
-- ANALYTICS AND REPORTING INDEXES
-- =============================================

-- Daily analytics indexes - BRIN for time-series data
CREATE INDEX IF NOT EXISTS idx_analytics_daily_tenant_date ON analytics_daily(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_date_brin ON analytics_daily USING BRIN(date) WITH (pages_per_range = 128);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_revenue ON analytics_daily(tenant_id, gross_revenue DESC, date DESC);

-- Hourly analytics indexes - BRIN for time-series data  
CREATE INDEX IF NOT EXISTS idx_analytics_hourly_tenant_date_hour ON analytics_hourly(tenant_id, date DESC, hour);
CREATE INDEX IF NOT EXISTS idx_analytics_hourly_date_brin ON analytics_hourly USING BRIN(date) WITH (pages_per_range = 128);

-- =============================================
-- AUDIT AND SECURITY INDEXES
-- =============================================

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name, operation, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(table_name, record_id) WHERE record_id IS NOT NULL;

-- =============================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- =============================================

-- Menu browsing - most common query pattern
CREATE INDEX IF NOT EXISTS idx_menu_browse ON menu_items(tenant_id, category_id, is_available, is_featured, sort_order) 
    WHERE deleted_at IS NULL;

-- Order management dashboard
CREATE INDEX IF NOT EXISTS idx_order_dashboard ON orders(tenant_id, status, created_at DESC) 
    INCLUDE (order_number, customer_name, total_amount, fulfillment_type);

-- Customer order history
CREATE INDEX IF NOT EXISTS idx_customer_orders ON orders(user_id, created_at DESC) 
    INCLUDE (order_number, status, total_amount, fulfillment_type)
    WHERE user_id IS NOT NULL;

-- Revenue analytics
CREATE INDEX IF NOT EXISTS idx_revenue_analysis ON orders(tenant_id, status, created_at) 
    INCLUDE (total_amount, subtotal, tax_amount)
    WHERE status NOT IN ('cancelled', 'refunded');

-- Popular items analysis
CREATE INDEX IF NOT EXISTS idx_popular_items ON order_items(menu_item_id, created_at DESC) 
    INCLUDE (quantity, total_price);

-- Delivery tracking
CREATE INDEX IF NOT EXISTS idx_delivery_tracking ON orders(tenant_id, fulfillment_type, status, estimated_delivery_time) 
    WHERE fulfillment_type = 'delivery';

-- =============================================
-- PARTIAL INDEXES FOR FILTERED QUERIES
-- =============================================

-- Active items only
CREATE INDEX IF NOT EXISTS idx_menu_items_active ON menu_items(tenant_id, category_id, sort_order) 
    WHERE is_available = true AND deleted_at IS NULL;

-- Pending orders only
CREATE INDEX IF NOT EXISTS idx_orders_pending ON orders(tenant_id, created_at DESC) 
    WHERE status = 'pending';

-- Today's orders
CREATE INDEX IF NOT EXISTS idx_orders_today ON orders(tenant_id, created_at DESC) 
    WHERE created_at >= CURRENT_DATE;

-- Failed payments
CREATE INDEX IF NOT EXISTS idx_payments_failed ON payment_transactions(order_id, created_at DESC) 
    WHERE status = 'failed';

-- Expired carts cleanup
CREATE INDEX IF NOT EXISTS idx_carts_expired ON carts(expires_at) 
    WHERE expires_at < NOW();

-- =============================================
-- FUNCTIONAL INDEXES
-- =============================================

-- Search functionality
CREATE INDEX IF NOT EXISTS idx_menu_items_name_lower ON menu_items(tenant_id, LOWER(name)) 
    WHERE is_available = true AND deleted_at IS NULL;

-- Date-based queries
CREATE INDEX IF NOT EXISTS idx_orders_date_only ON orders(tenant_id, DATE(created_at)) 
    INCLUDE (status, total_amount);

-- Phone number lookup (normalized)
CREATE INDEX IF NOT EXISTS idx_orders_phone_normalized ON orders(REGEXP_REPLACE(customer_phone, '[^\d]', '', 'g'))
    WHERE customer_phone IS NOT NULL;

-- =============================================
-- JSONB INDEXES FOR FLEXIBLE DATA
-- =============================================

-- Settings and features JSONB indexes
CREATE INDEX IF NOT EXISTS idx_tenants_features ON tenants USING GIN(features);
CREATE INDEX IF NOT EXISTS idx_tenants_settings ON tenants USING GIN(settings);

-- Cart item modifiers
CREATE INDEX IF NOT EXISTS idx_cart_items_modifiers ON cart_items USING GIN(modifiers);

-- Order item modifiers
CREATE INDEX IF NOT EXISTS idx_order_items_modifiers ON order_items USING GIN(modifiers);

-- Delivery address search
CREATE INDEX IF NOT EXISTS idx_orders_delivery_address ON orders USING GIN(delivery_address);

-- User preferences
CREATE INDEX IF NOT EXISTS idx_profiles_preferences ON profiles USING GIN(preferences) WHERE preferences IS NOT NULL;

-- Analytics metrics
CREATE INDEX IF NOT EXISTS idx_analytics_daily_metrics ON analytics_daily USING GIN(metrics);

-- Payment gateway responses
CREATE INDEX IF NOT EXISTS idx_payment_gateway_response ON payment_transactions USING GIN(gateway_response) WHERE gateway_response IS NOT NULL;

-- =============================================
-- COVERING INDEXES FOR HOT QUERIES
-- =============================================

-- Menu listing with all required data
CREATE INDEX IF NOT EXISTS idx_menu_complete ON menu_items(tenant_id, category_id, is_available, sort_order) 
    INCLUDE (name, description, base_price, image_url, is_featured)
    WHERE deleted_at IS NULL;

-- Order summary for dashboards
CREATE INDEX IF NOT EXISTS idx_order_summary ON orders(tenant_id, created_at DESC) 
    INCLUDE (order_number, status, customer_name, total_amount, fulfillment_type);

-- =============================================
-- MAINTENANCE AND MONITORING
-- =============================================

-- Create statistics for better query planning
ANALYZE tenants;
ANALYZE profiles;
ANALYZE menu_categories;
ANALYZE menu_items;
ANALYZE orders;
ANALYZE order_items;
ANALYZE analytics_daily;
ANALYZE analytics_hourly;

-- =============================================
-- INDEX USAGE MONITORING
-- =============================================

-- View to monitor index usage
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'RARELY_USED'
        WHEN idx_scan < 1000 THEN 'MODERATELY_USED'
        ELSE 'HEAVILY_USED'
    END as usage_category
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Function to identify missing indexes based on slow queries
CREATE OR REPLACE FUNCTION suggest_missing_indexes()
RETURNS TABLE (
    table_name TEXT,
    suggested_columns TEXT,
    reason TEXT
) AS $$
BEGIN
    -- This is a placeholder for index suggestion logic
    -- In practice, you'd analyze pg_stat_statements or slow query logs
    RETURN QUERY
    SELECT 
        'orders'::TEXT as table_name,
        'tenant_id, customer_phone'::TEXT as suggested_columns,
        'Frequent customer phone lookups'::TEXT as reason
    WHERE NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'orders' 
        AND indexdef LIKE '%customer_phone%'
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON INDEX idx_orders_tenant_status IS 'Primary index for restaurant order management dashboard queries';
COMMENT ON INDEX idx_menu_items_search IS 'Full-text search index for menu items using name and description';
COMMENT ON INDEX idx_analytics_daily_date_brin IS 'BRIN index for time-series analytics queries with excellent compression';
COMMENT ON INDEX idx_menu_browse IS 'Optimized composite index for menu browsing - covers most menu display queries';
COMMENT ON INDEX idx_order_dashboard IS 'Covering index for order management dashboard with all required fields';

-- Set maintenance work memory for better index creation performance
-- This should be done in postgresql.conf for production
-- maintenance_work_mem = '512MB'

-- Enable auto-explain for monitoring slow queries
-- ALTER SYSTEM SET auto_explain.log_min_duration = '1s';
-- ALTER SYSTEM SET auto_explain.log_analyze = true;