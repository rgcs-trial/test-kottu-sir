-- =============================================
-- Restaurant SaaS Platform - Initial Schema
-- Migration: 001_initial_schema.sql
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- CUSTOM TYPES AND ENUMS
-- =============================================

-- User role types for multi-tenant access control
CREATE TYPE user_role AS ENUM (
    'platform_admin',     -- Full platform access
    'restaurant_owner',   -- Restaurant owner/manager
    'restaurant_staff',   -- Restaurant staff member
    'customer'           -- Customer/end user
);

-- Order status progression
CREATE TYPE order_status AS ENUM (
    'pending',           -- Order created, awaiting confirmation
    'confirmed',         -- Order confirmed by restaurant
    'preparing',         -- Order being prepared
    'ready',            -- Order ready for pickup/delivery
    'out_for_delivery',  -- Order out for delivery
    'delivered',         -- Order delivered/completed
    'cancelled',         -- Order cancelled
    'refunded'          -- Order refunded
);

-- Payment status tracking
CREATE TYPE payment_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled',
    'refunded'
);

-- Order fulfillment types
CREATE TYPE fulfillment_type AS ENUM (
    'dine_in',
    'takeaway',
    'delivery'
);

-- Restaurant operational status
CREATE TYPE restaurant_status AS ENUM (
    'active',
    'inactive',
    'suspended',
    'pending_approval'
);

-- Days of the week for operating hours
CREATE TYPE day_of_week AS ENUM (
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
);

-- =============================================
-- CORE TABLES
-- =============================================

-- Tenants table - Multi-tenant architecture foundation
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier
    description TEXT,
    
    -- Contact information
    email VARCHAR(255),
    phone VARCHAR(50),
    
    -- Address details
    address_line_1 VARCHAR(255),
    address_line_2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Sri Lanka',
    
    -- Location data for delivery radius
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Business details
    cuisine_types TEXT[], -- Array of cuisine types
    delivery_radius_km DECIMAL(5, 2) DEFAULT 5.0,
    minimum_order_amount DECIMAL(10, 2) DEFAULT 0,
    delivery_fee DECIMAL(8, 2) DEFAULT 0,
    
    -- Platform settings
    status restaurant_status DEFAULT 'pending_approval',
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Feature flags
    features JSONB DEFAULT '{}', -- Store enabled features
    settings JSONB DEFAULT '{}', -- Restaurant-specific settings
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- User profiles - Extended user information
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Basic profile information
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    
    -- Role and permissions
    role user_role NOT NULL DEFAULT 'customer',
    is_active BOOLEAN DEFAULT true,
    
    -- Additional profile data
    avatar_url TEXT,
    date_of_birth DATE,
    preferences JSONB DEFAULT '{}', -- User preferences
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Menu categories for organizing menu items
CREATE TABLE menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    
    -- Display settings
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    -- Availability timing
    available_from TIME,
    available_until TIME,
    available_days day_of_week[] DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday']::day_of_week[],
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, name)
);

-- Menu items - Core menu item information
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
    
    -- Item details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    
    -- Pricing
    base_price DECIMAL(10, 2) NOT NULL CHECK (base_price >= 0),
    
    -- Inventory and availability
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    stock_quantity INTEGER, -- NULL for unlimited
    
    -- Nutritional information
    calories INTEGER,
    ingredients TEXT[],
    allergens TEXT[],
    dietary_tags TEXT[], -- vegetarian, vegan, gluten-free, etc.
    
    -- Display settings
    sort_order INTEGER DEFAULT 0,
    
    -- Availability timing
    available_from TIME,
    available_until TIME,
    available_days day_of_week[] DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday']::day_of_week[],
    
    -- Additional data
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Menu item variants (sizes, different preparations)
CREATE TABLE menu_item_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL, -- Small, Medium, Large, etc.
    price_adjustment DECIMAL(10, 2) DEFAULT 0, -- Price difference from base
    
    is_default BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true,
    stock_quantity INTEGER, -- NULL for unlimited
    
    sort_order INTEGER DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menu item modifiers (add-ons, customizations)
CREATE TABLE menu_item_modifiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL, -- Extra cheese, No onions, etc.
    price_adjustment DECIMAL(10, 2) DEFAULT 0,
    
    is_required BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true,
    max_selections INTEGER DEFAULT 1, -- For grouped modifiers
    
    sort_order INTEGER DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shopping carts for guest and registered users
CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL for guest carts
    
    -- Cart identification for guests
    session_id VARCHAR(255), -- For anonymous users
    
    -- Cart metadata
    notes TEXT,
    fulfillment_type fulfillment_type DEFAULT 'takeaway',
    
    -- Delivery information (if applicable)
    delivery_address JSONB,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Cart items
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES menu_item_variants(id) ON DELETE SET NULL,
    
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    
    -- Selected modifiers stored as JSONB array
    modifiers JSONB DEFAULT '[]', -- [{id: uuid, name: string, price: decimal}]
    
    special_instructions TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders - Core order information
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Order identification
    order_number VARCHAR(50) NOT NULL UNIQUE, -- Human-readable order number
    
    -- Order details
    status order_status DEFAULT 'pending',
    fulfillment_type fulfillment_type NOT NULL,
    
    -- Pricing breakdown
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    service_fee DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    
    -- Customer information
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_email VARCHAR(255),
    
    -- Delivery information
    delivery_address JSONB,
    delivery_instructions TEXT,
    estimated_delivery_time TIMESTAMP WITH TIME ZONE,
    
    -- Order notes and special instructions
    notes TEXT,
    special_instructions TEXT,
    
    -- Timestamps
    confirmed_at TIMESTAMP WITH TIME ZONE,
    prepared_at TIMESTAMP WITH TIME ZONE,
    ready_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Cancellation details
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES profiles(id),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items - Items within each order
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id),
    variant_id UUID REFERENCES menu_item_variants(id),
    
    -- Item details at time of order
    item_name VARCHAR(255) NOT NULL, -- Snapshot of item name
    variant_name VARCHAR(255), -- Snapshot of variant name
    
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    
    -- Selected modifiers snapshot
    modifiers JSONB DEFAULT '[]',
    
    special_instructions TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order status history for tracking order progression
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    status order_status NOT NULL,
    notes TEXT,
    
    -- Who made the status change
    changed_by UUID REFERENCES profiles(id),
    
    -- Timing information
    estimated_time TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment transactions
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Payment details
    payment_method VARCHAR(100), -- cash, card, digital_wallet
    payment_provider VARCHAR(100), -- stripe, payhere, etc.
    provider_transaction_id VARCHAR(255),
    
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'LKR',
    status payment_status DEFAULT 'pending',
    
    -- Payment metadata
    gateway_response JSONB,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Restaurant settings and configuration
CREATE TABLE restaurant_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Operating settings
    is_open BOOLEAN DEFAULT true,
    accepts_orders BOOLEAN DEFAULT true,
    
    -- Order management
    auto_accept_orders BOOLEAN DEFAULT false,
    estimated_prep_time_minutes INTEGER DEFAULT 30,
    max_orders_per_hour INTEGER,
    
    -- Notifications
    notification_settings JSONB DEFAULT '{}',
    
    -- Integration settings
    pos_integration JSONB DEFAULT '{}',
    delivery_integration JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id)
);

-- Restaurant operating hours
CREATE TABLE restaurant_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    day_of_week day_of_week NOT NULL,
    is_open BOOLEAN DEFAULT true,
    
    open_time TIME,
    close_time TIME,
    
    -- Break times (optional)
    break_start_time TIME,
    break_end_time TIME,
    
    -- Special notes for the day
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, day_of_week)
);

-- Daily analytics aggregation
CREATE TABLE analytics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    date DATE NOT NULL,
    
    -- Order metrics
    total_orders INTEGER DEFAULT 0,
    completed_orders INTEGER DEFAULT 0,
    cancelled_orders INTEGER DEFAULT 0,
    
    -- Revenue metrics
    gross_revenue DECIMAL(12, 2) DEFAULT 0,
    net_revenue DECIMAL(12, 2) DEFAULT 0,
    tax_collected DECIMAL(10, 2) DEFAULT 0,
    
    -- Item metrics
    total_items_sold INTEGER DEFAULT 0,
    average_order_value DECIMAL(10, 2) DEFAULT 0,
    
    -- Customer metrics
    unique_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0,
    
    -- Fulfillment metrics
    dine_in_orders INTEGER DEFAULT 0,
    takeaway_orders INTEGER DEFAULT 0,
    delivery_orders INTEGER DEFAULT 0,
    
    -- Additional metrics as JSON
    metrics JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, date)
);

-- Hourly analytics for detailed insights
CREATE TABLE analytics_hourly (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
    
    -- Order metrics
    total_orders INTEGER DEFAULT 0,
    completed_orders INTEGER DEFAULT 0,
    average_prep_time_minutes DECIMAL(5, 2) DEFAULT 0,
    
    -- Revenue
    gross_revenue DECIMAL(10, 2) DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, date, hour)
);

-- =============================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to relevant tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_categories_updated_at BEFORE UPDATE ON menu_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_item_variants_updated_at BEFORE UPDATE ON menu_item_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_item_modifiers_updated_at BEFORE UPDATE ON menu_item_modifiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON carts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurant_settings_updated_at BEFORE UPDATE ON restaurant_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurant_hours_updated_at BEFORE UPDATE ON restaurant_hours FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_analytics_daily_updated_at BEFORE UPDATE ON analytics_daily FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- BASIC CONSTRAINTS AND VALIDATIONS
-- =============================================

-- Ensure cart expiry is reasonable
ALTER TABLE carts ADD CONSTRAINT check_cart_expiry 
CHECK (expires_at > created_at AND expires_at <= created_at + INTERVAL '7 days');

-- Ensure order totals are consistent
ALTER TABLE orders ADD CONSTRAINT check_order_total 
CHECK (total_amount >= 0 AND subtotal >= 0);

-- Ensure menu item prices are non-negative
ALTER TABLE menu_items ADD CONSTRAINT check_base_price 
CHECK (base_price >= 0);

-- Ensure restaurant coordinates are valid
ALTER TABLE tenants ADD CONSTRAINT check_latitude 
CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE tenants ADD CONSTRAINT check_longitude 
CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- Comments for documentation
COMMENT ON TABLE tenants IS 'Multi-tenant restaurants with business details and settings';
COMMENT ON TABLE profiles IS 'Extended user profiles with role-based access control';
COMMENT ON TABLE menu_categories IS 'Menu organization categories for each restaurant';
COMMENT ON TABLE menu_items IS 'Core menu items with pricing and availability';
COMMENT ON TABLE menu_item_variants IS 'Item variations like sizes and preparations';
COMMENT ON TABLE menu_item_modifiers IS 'Item customizations and add-ons';
COMMENT ON TABLE carts IS 'Shopping carts for both guests and registered users';
COMMENT ON TABLE cart_items IS 'Items stored in shopping carts';
COMMENT ON TABLE orders IS 'Customer orders with complete order lifecycle tracking';
COMMENT ON TABLE order_items IS 'Individual items within orders with pricing snapshots';
COMMENT ON TABLE order_status_history IS 'Audit trail of order status changes';
COMMENT ON TABLE payment_transactions IS 'Payment processing and transaction records';
COMMENT ON TABLE restaurant_settings IS 'Restaurant-specific operational configurations';
COMMENT ON TABLE restaurant_hours IS 'Restaurant operating hours by day of week';
COMMENT ON TABLE analytics_daily IS 'Daily aggregated analytics and metrics';
COMMENT ON TABLE analytics_hourly IS 'Hourly analytics for detailed performance tracking';