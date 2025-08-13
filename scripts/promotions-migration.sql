-- =============================================
-- Restaurant SaaS Platform - Promotions System
-- Migration: promotions-migration.sql
-- =============================================

-- =============================================
-- PROMOTION SYSTEM ENUMS
-- =============================================

-- Promotion types for different discount strategies
CREATE TYPE promotion_type AS ENUM (
    'percentage',           -- Percentage discount (10%, 20%)
    'fixed_amount',        -- Fixed amount discount ($5 off)
    'buy_x_get_y',        -- Buy X get Y free/discounted
    'free_delivery',      -- Free delivery promotion
    'happy_hour',         -- Time-based discounts
    'first_time_customer', -- New customer discount
    'loyalty_reward',     -- Repeat customer rewards
    'category_discount',  -- Specific category discounts
    'bundle_deal'         -- Package deals
);

-- Promotion status lifecycle
CREATE TYPE promotion_status AS ENUM (
    'draft',              -- Created but not active
    'active',             -- Currently active
    'paused',             -- Temporarily disabled
    'expired',            -- Past expiry date
    'exhausted',          -- Usage limit reached
    'cancelled'           -- Manually cancelled
);

-- Discount application scope
CREATE TYPE discount_scope AS ENUM (
    'order_total',        -- Apply to entire order
    'subtotal',           -- Apply to subtotal before tax/fees
    'delivery_fee',       -- Apply to delivery charges
    'category',           -- Apply to specific categories
    'item',               -- Apply to specific items
    'first_item',         -- Apply to first qualifying item
    'cheapest_item'       -- Apply to cheapest qualifying item
);

-- Customer segment targeting
CREATE TYPE customer_segment AS ENUM (
    'all_customers',      -- Available to all customers
    'new_customers',      -- First-time customers only
    'returning_customers',-- Customers with previous orders
    'vip_customers',      -- High-value customers
    'inactive_customers', -- Customers who haven't ordered recently
    'birthday_customers', -- Customers on their birthday
    'specific_customers'  -- Manually selected customers
);

-- Usage frequency limits
CREATE TYPE usage_frequency AS ENUM (
    'once_per_customer',  -- One-time use per customer
    'daily',              -- Once per day per customer
    'weekly',             -- Once per week per customer
    'monthly',            -- Once per month per customer
    'unlimited'           -- No frequency restrictions
);

-- =============================================
-- PROMOTIONS CORE TABLES
-- =============================================

-- Main promotions table
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Basic promotion details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    internal_notes TEXT, -- Staff-only notes
    
    -- Promotion configuration
    promotion_type promotion_type NOT NULL,
    status promotion_status DEFAULT 'draft',
    
    -- Discount configuration
    discount_scope discount_scope DEFAULT 'order_total',
    discount_percentage DECIMAL(5, 2) CHECK (discount_percentage BETWEEN 0 AND 100),
    discount_amount DECIMAL(10, 2) CHECK (discount_amount >= 0),
    max_discount_amount DECIMAL(10, 2), -- Cap for percentage discounts
    
    -- Buy X Get Y configuration
    buy_quantity INTEGER CHECK (buy_quantity > 0),
    get_quantity INTEGER CHECK (get_quantity > 0),
    get_discount_percentage DECIMAL(5, 2) DEFAULT 100, -- 100% = free
    
    -- Minimum requirements
    min_order_amount DECIMAL(10, 2) DEFAULT 0,
    min_items_quantity INTEGER DEFAULT 0,
    
    -- Usage limits
    total_usage_limit INTEGER, -- Total uses across all customers
    per_customer_limit INTEGER, -- Uses per individual customer
    usage_frequency usage_frequency DEFAULT 'unlimited',
    
    -- Time restrictions
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- Day/time restrictions
    valid_days day_of_week[] DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday']::day_of_week[],
    valid_hours_start TIME, -- e.g., 17:00 for happy hour
    valid_hours_end TIME,   -- e.g., 19:00 for happy hour
    
    -- Customer targeting
    target_segment customer_segment DEFAULT 'all_customers',
    
    -- Stacking rules
    can_stack_with_others BOOLEAN DEFAULT false,
    stack_priority INTEGER DEFAULT 0, -- Higher number = higher priority
    
    -- Auto-apply settings
    auto_apply BOOLEAN DEFAULT false, -- Automatically apply if conditions met
    requires_code BOOLEAN DEFAULT true, -- Requires promo code input
    
    -- Display settings
    is_featured BOOLEAN DEFAULT false,
    display_banner BOOLEAN DEFAULT false,
    banner_text TEXT,
    banner_color VARCHAR(7), -- Hex color code
    
    -- Analytics tracking
    total_uses INTEGER DEFAULT 0,
    total_discount_given DECIMAL(12, 2) DEFAULT 0,
    total_revenue_impact DECIMAL(12, 2) DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    last_modified_by UUID REFERENCES profiles(id),
    
    -- Constraints
    CONSTRAINT valid_discount_config CHECK (
        (promotion_type = 'percentage' AND discount_percentage IS NOT NULL AND discount_percentage > 0) OR
        (promotion_type = 'fixed_amount' AND discount_amount IS NOT NULL AND discount_amount > 0) OR
        (promotion_type = 'buy_x_get_y' AND buy_quantity IS NOT NULL AND get_quantity IS NOT NULL) OR
        (promotion_type IN ('free_delivery', 'happy_hour', 'first_time_customer', 'loyalty_reward'))
    ),
    
    CONSTRAINT valid_time_range CHECK (
        valid_from IS NULL OR valid_until IS NULL OR valid_from < valid_until
    ),
    
    CONSTRAINT valid_hours_range CHECK (
        valid_hours_start IS NULL OR valid_hours_end IS NULL OR valid_hours_start < valid_hours_end
    )
);

-- Promotion codes for code-based promotions
CREATE TABLE promotion_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    
    -- Code details
    code VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Individual code limits
    usage_limit INTEGER, -- NULL for unlimited
    current_usage INTEGER DEFAULT 0,
    
    -- Individual code validity
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- Code status
    is_active BOOLEAN DEFAULT true,
    is_single_use BOOLEAN DEFAULT false,
    
    -- QR code generation
    qr_code_url TEXT,
    qr_code_data TEXT,
    
    -- Code generation metadata
    generated_batch_id UUID, -- For bulk generation tracking
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint for active codes
    UNIQUE(code),
    
    CONSTRAINT valid_code_time_range CHECK (
        valid_from IS NULL OR valid_until IS NULL OR valid_from < valid_until
    )
);

-- Promotion usage tracking
CREATE TABLE promotion_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    promotion_code_id UUID REFERENCES promotion_codes(id) ON DELETE SET NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Usage details
    discount_amount DECIMAL(10, 2) NOT NULL,
    original_order_amount DECIMAL(10, 2) NOT NULL,
    final_order_amount DECIMAL(10, 2) NOT NULL,
    
    -- Applied items (for item-specific promotions)
    applied_items JSONB DEFAULT '[]', -- Array of {item_id, quantity, discount_amount}
    
    -- Usage context
    customer_segment customer_segment,
    session_id VARCHAR(255), -- For guest usage tracking
    user_agent TEXT,
    ip_address INET,
    
    -- Revenue impact tracking
    estimated_lost_revenue DECIMAL(10, 2), -- What would have been paid without promotion
    customer_lifetime_value_impact DECIMAL(10, 2), -- Long-term revenue impact
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Promotion rules for advanced targeting
CREATE TABLE promotion_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    
    -- Rule configuration
    rule_type VARCHAR(50) NOT NULL, -- 'category_include', 'category_exclude', 'item_include', etc.
    rule_value JSONB NOT NULL, -- Flexible rule data
    
    -- Rule application
    is_required BOOLEAN DEFAULT true, -- Must match vs optional match
    rule_priority INTEGER DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Promotion analytics aggregation
CREATE TABLE promotion_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    
    -- Time period
    date DATE NOT NULL,
    hour INTEGER CHECK (hour >= 0 AND hour <= 23), -- NULL for daily aggregation
    
    -- Usage metrics
    total_uses INTEGER DEFAULT 0,
    unique_customers INTEGER DEFAULT 0,
    
    -- Financial metrics
    total_discount_given DECIMAL(12, 2) DEFAULT 0,
    total_order_value DECIMAL(12, 2) DEFAULT 0,
    average_order_value DECIMAL(10, 2) DEFAULT 0,
    
    -- Customer metrics
    new_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0,
    
    -- Conversion metrics
    views INTEGER DEFAULT 0, -- Banner/promotion views
    applications INTEGER DEFAULT 0, -- Times promotion was applied
    conversion_rate DECIMAL(5, 4) DEFAULT 0, -- applications/views
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, promotion_id, date, hour)
);

-- Customer promotion eligibility cache
CREATE TABLE customer_promotion_eligibility (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    
    -- Eligibility details
    is_eligible BOOLEAN NOT NULL,
    reason TEXT, -- Why eligible/not eligible
    
    -- Customer metrics for eligibility
    customer_order_count INTEGER DEFAULT 0,
    customer_total_spent DECIMAL(12, 2) DEFAULT 0,
    days_since_last_order INTEGER,
    
    -- Cache validity
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, user_id, promotion_id)
);

-- =============================================
-- PROMOTION SYSTEM FUNCTIONS
-- =============================================

-- Function to calculate promotion discount
CREATE OR REPLACE FUNCTION calculate_promotion_discount(
    p_promotion_id UUID,
    p_order_amount DECIMAL,
    p_items JSONB DEFAULT '[]'
) RETURNS TABLE (
    discount_amount DECIMAL(10, 2),
    applies_to JSONB,
    is_valid BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_promotion promotions%ROWTYPE;
    v_calculated_discount DECIMAL(10, 2) := 0;
    v_applies_to JSONB := '[]';
    v_is_valid BOOLEAN := true;
    v_error_message TEXT := NULL;
BEGIN
    -- Get promotion details
    SELECT * INTO v_promotion FROM promotions WHERE id = p_promotion_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0::DECIMAL(10, 2), '[]'::JSONB, false, 'Promotion not found';
        RETURN;
    END IF;
    
    -- Check if promotion is active
    IF v_promotion.status != 'active' THEN
        RETURN QUERY SELECT 0::DECIMAL(10, 2), '[]'::JSONB, false, 'Promotion is not active';
        RETURN;
    END IF;
    
    -- Check minimum order amount
    IF p_order_amount < v_promotion.min_order_amount THEN
        RETURN QUERY SELECT 0::DECIMAL(10, 2), '[]'::JSONB, false, 
            'Order amount below minimum of ' || v_promotion.min_order_amount;
        RETURN;
    END IF;
    
    -- Calculate discount based on type
    CASE v_promotion.promotion_type
        WHEN 'percentage' THEN
            v_calculated_discount := p_order_amount * (v_promotion.discount_percentage / 100);
            IF v_promotion.max_discount_amount IS NOT NULL THEN
                v_calculated_discount := LEAST(v_calculated_discount, v_promotion.max_discount_amount);
            END IF;
            
        WHEN 'fixed_amount' THEN
            v_calculated_discount := LEAST(v_promotion.discount_amount, p_order_amount);
            
        WHEN 'free_delivery' THEN
            -- This would be handled by the application layer
            v_calculated_discount := 0; -- Delivery fee removal handled separately
            
        ELSE
            v_calculated_discount := 0;
    END CASE;
    
    RETURN QUERY SELECT v_calculated_discount, v_applies_to, v_is_valid, v_error_message;
END;
$$ LANGUAGE plpgsql;

-- Function to validate promotion code
CREATE OR REPLACE FUNCTION validate_promotion_code(
    p_tenant_id UUID,
    p_code VARCHAR(50),
    p_user_id UUID DEFAULT NULL,
    p_order_amount DECIMAL DEFAULT 0
) RETURNS TABLE (
    is_valid BOOLEAN,
    promotion_id UUID,
    promotion_code_id UUID,
    error_message TEXT,
    discount_preview DECIMAL(10, 2)
) AS $$
DECLARE
    v_code promotion_codes%ROWTYPE;
    v_promotion promotions%ROWTYPE;
    v_usage_count INTEGER;
    v_customer_usage INTEGER;
    v_discount DECIMAL(10, 2);
BEGIN
    -- Find the promotion code
    SELECT pc.* INTO v_code 
    FROM promotion_codes pc 
    JOIN promotions p ON p.id = pc.promotion_id
    WHERE pc.code = p_code AND p.tenant_id = p_tenant_id AND pc.is_active = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'Invalid promotion code', 0::DECIMAL(10, 2);
        RETURN;
    END IF;
    
    -- Get promotion details
    SELECT * INTO v_promotion FROM promotions WHERE id = v_code.promotion_id;
    
    -- Check promotion status
    IF v_promotion.status != 'active' THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'Promotion is not currently active', 0::DECIMAL(10, 2);
        RETURN;
    END IF;
    
    -- Check validity dates
    IF v_promotion.valid_from IS NOT NULL AND NOW() < v_promotion.valid_from THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'Promotion has not started yet', 0::DECIMAL(10, 2);
        RETURN;
    END IF;
    
    IF v_promotion.valid_until IS NOT NULL AND NOW() > v_promotion.valid_until THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'Promotion has expired', 0::DECIMAL(10, 2);
        RETURN;
    END IF;
    
    -- Check usage limits
    IF v_promotion.total_usage_limit IS NOT NULL THEN
        SELECT COUNT(*) INTO v_usage_count FROM promotion_usage WHERE promotion_id = v_promotion.id;
        IF v_usage_count >= v_promotion.total_usage_limit THEN
            RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'Promotion usage limit reached', 0::DECIMAL(10, 2);
            RETURN;
        END IF;
    END IF;
    
    -- Check customer usage limits
    IF p_user_id IS NOT NULL AND v_promotion.per_customer_limit IS NOT NULL THEN
        SELECT COUNT(*) INTO v_customer_usage 
        FROM promotion_usage 
        WHERE promotion_id = v_promotion.id AND user_id = p_user_id;
        
        IF v_customer_usage >= v_promotion.per_customer_limit THEN
            RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'You have reached the usage limit for this promotion', 0::DECIMAL(10, 2);
            RETURN;
        END IF;
    END IF;
    
    -- Calculate discount preview if order amount provided
    IF p_order_amount > 0 THEN
        SELECT discount_amount INTO v_discount 
        FROM calculate_promotion_discount(v_promotion.id, p_order_amount);
    ELSE
        v_discount := 0;
    END IF;
    
    RETURN QUERY SELECT true, v_promotion.id, v_code.id, 'Valid promotion code'::TEXT, v_discount;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Promotions indexes
CREATE INDEX idx_promotions_tenant_id ON promotions(tenant_id);
CREATE INDEX idx_promotions_status ON promotions(status);
CREATE INDEX idx_promotions_valid_dates ON promotions(valid_from, valid_until);
CREATE INDEX idx_promotions_auto_apply ON promotions(auto_apply) WHERE auto_apply = true;
CREATE INDEX idx_promotions_featured ON promotions(is_featured) WHERE is_featured = true;

-- Promotion codes indexes
CREATE INDEX idx_promotion_codes_promotion_id ON promotion_codes(promotion_id);
CREATE INDEX idx_promotion_codes_code ON promotion_codes(code);
CREATE INDEX idx_promotion_codes_active ON promotion_codes(is_active) WHERE is_active = true;

-- Promotion usage indexes
CREATE INDEX idx_promotion_usage_promotion_id ON promotion_usage(promotion_id);
CREATE INDEX idx_promotion_usage_order_id ON promotion_usage(order_id);
CREATE INDEX idx_promotion_usage_user_id ON promotion_usage(user_id);
CREATE INDEX idx_promotion_usage_created_at ON promotion_usage(created_at);

-- Promotion rules indexes
CREATE INDEX idx_promotion_rules_promotion_id ON promotion_rules(promotion_id);
CREATE INDEX idx_promotion_rules_type ON promotion_rules(rule_type);

-- Analytics indexes
CREATE INDEX idx_promotion_analytics_tenant_date ON promotion_analytics(tenant_id, date);
CREATE INDEX idx_promotion_analytics_promotion_date ON promotion_analytics(promotion_id, date);

-- Customer eligibility indexes
CREATE INDEX idx_customer_eligibility_user_promo ON customer_promotion_eligibility(user_id, promotion_id);
CREATE INDEX idx_customer_eligibility_expires ON customer_promotion_eligibility(expires_at);

-- =============================================
-- TRIGGERS FOR AUTOMATION
-- =============================================

-- Update promotion analytics on usage
CREATE OR REPLACE FUNCTION update_promotion_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update promotion usage count and discount given
    UPDATE promotions 
    SET 
        total_uses = total_uses + 1,
        total_discount_given = total_discount_given + NEW.discount_amount,
        updated_at = NOW()
    WHERE id = NEW.promotion_id;
    
    -- Update promotion code usage if applicable
    IF NEW.promotion_code_id IS NOT NULL THEN
        UPDATE promotion_codes
        SET current_usage = current_usage + 1
        WHERE id = NEW.promotion_code_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_promotion_stats
    AFTER INSERT ON promotion_usage
    FOR EACH ROW EXECUTE FUNCTION update_promotion_stats();

-- Auto-expire promotions
CREATE OR REPLACE FUNCTION auto_expire_promotions()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if promotion should be marked as expired
    IF NEW.valid_until IS NOT NULL AND NOW() > NEW.valid_until AND NEW.status = 'active' THEN
        NEW.status := 'expired';
    END IF;
    
    -- Check if usage limit reached
    IF NEW.total_usage_limit IS NOT NULL AND NEW.total_uses >= NEW.total_usage_limit AND NEW.status = 'active' THEN
        NEW.status := 'exhausted';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_expire_promotions
    BEFORE UPDATE ON promotions
    FOR EACH ROW EXECUTE FUNCTION auto_expire_promotions();

-- Clean up expired eligibility cache
CREATE OR REPLACE FUNCTION cleanup_expired_eligibility()
RETURNS void AS $$
BEGIN
    DELETE FROM customer_promotion_eligibility 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to promotion tables
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promotion_codes_updated_at BEFORE UPDATE ON promotion_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promotion_rules_updated_at BEFORE UPDATE ON promotion_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promotion_analytics_updated_at BEFORE UPDATE ON promotion_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_promotion_eligibility_updated_at BEFORE UPDATE ON customer_promotion_eligibility FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TABLE COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE promotions IS 'Main promotions configuration with discount rules and targeting';
COMMENT ON TABLE promotion_codes IS 'Promotion codes for code-based promotions with QR support';
COMMENT ON TABLE promotion_usage IS 'Comprehensive tracking of promotion usage and revenue impact';
COMMENT ON TABLE promotion_rules IS 'Advanced targeting rules for complex promotion logic';
COMMENT ON TABLE promotion_analytics IS 'Analytics and performance metrics for promotions';
COMMENT ON TABLE customer_promotion_eligibility IS 'Cached customer eligibility for performance optimization';

-- =============================================
-- SAMPLE DATA FOR TESTING
-- =============================================

-- This would be populated by the application or separate seed scripts
-- Sample promotions will be created through the admin interface