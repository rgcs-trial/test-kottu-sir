-- =====================================================
-- LOYALTY PROGRAM AND REWARDS SYSTEM MIGRATION
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. LOYALTY PROGRAMS TABLE
-- =====================================================
CREATE TABLE loyalty_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    program_type VARCHAR(20) NOT NULL CHECK (program_type IN ('points', 'visits', 'spending', 'tiered')),
    
    -- Points configuration
    points_per_dollar DECIMAL(5,2) DEFAULT 1.00, -- Points earned per dollar spent
    welcome_bonus INTEGER DEFAULT 0, -- Bonus points for joining
    
    -- Program settings
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_restaurant_program UNIQUE(restaurant_id, name)
);

-- =====================================================
-- 2. LOYALTY TIERS TABLE
-- =====================================================
CREATE TABLE loyalty_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    tier_name VARCHAR(50) NOT NULL, -- Bronze, Silver, Gold, Platinum
    tier_level INTEGER NOT NULL, -- 1, 2, 3, 4 for ordering
    
    -- Point requirements
    min_points INTEGER NOT NULL DEFAULT 0,
    max_points INTEGER, -- NULL for highest tier
    
    -- Tier benefits (stored as JSONB for flexibility)
    benefits JSONB DEFAULT '{}', -- {"free_delivery": true, "priority_support": true}
    
    -- Tier rewards
    discount_percentage DECIMAL(5,2) DEFAULT 0.00, -- General discount percentage
    multiplier DECIMAL(3,2) DEFAULT 1.00, -- Points earning multiplier
    
    -- Perks description
    perks TEXT[], -- Array of perk descriptions
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_program_tier_name UNIQUE(program_id, tier_name),
    CONSTRAINT unique_program_tier_level UNIQUE(program_id, tier_level),
    CONSTRAINT valid_point_range CHECK (min_points >= 0 AND (max_points IS NULL OR max_points > min_points))
);

-- =====================================================
-- 3. CUSTOMER LOYALTY ACCOUNTS TABLE
-- =====================================================
CREATE TABLE customer_loyalty_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_email VARCHAR(255) NOT NULL, -- Using email as customer identifier
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    
    -- Points tracking
    current_points INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0,
    
    -- Tier information
    current_tier_id UUID REFERENCES loyalty_tiers(id),
    
    -- Membership details
    join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Referral system
    referral_code VARCHAR(20) UNIQUE, -- Generated unique code for this customer
    referred_by UUID REFERENCES customer_loyalty_accounts(id), -- Who referred this customer
    
    -- Metadata
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_customer_program UNIQUE(customer_email, program_id)
);

-- =====================================================
-- 4. LOYALTY TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES customer_loyalty_accounts(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'bonus', 'referral', 'birthday', 'adjustment')),
    
    -- Transaction details
    points INTEGER NOT NULL, -- Positive for earned, negative for redeemed/expired
    description TEXT NOT NULL,
    order_id UUID REFERENCES orders(id), -- Link to order if applicable
    
    -- Expiry management
    expires_at TIMESTAMP WITH TIME ZONE, -- When these points expire (if applicable)
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID, -- Staff member who created adjustment, if applicable
    
    -- Indexing for performance
    INDEX idx_loyalty_transactions_account_date (account_id, created_at),
    INDEX idx_loyalty_transactions_type (transaction_type),
    INDEX idx_loyalty_transactions_expiry (expires_at) WHERE expires_at IS NOT NULL
);

-- =====================================================
-- 5. REWARDS TABLE
-- =====================================================
CREATE TABLE rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Reward configuration
    points_cost INTEGER NOT NULL CHECK (points_cost > 0),
    reward_type VARCHAR(20) NOT NULL CHECK (reward_type IN ('discount', 'free_item', 'cashback', 'free_delivery', 'percentage_off')),
    
    -- Reward value
    value DECIMAL(10,2) NOT NULL, -- Dollar value for discounts/cashback, percentage for percentage_off
    
    -- Usage limits
    max_redemptions_per_customer INTEGER, -- NULL for unlimited
    max_total_redemptions INTEGER, -- NULL for unlimited
    current_total_redemptions INTEGER DEFAULT 0,
    
    -- Validity period
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Category/item restrictions (JSONB for flexibility)
    restrictions JSONB DEFAULT '{}', -- {"categories": ["appetizers"], "min_order": 25.00}
    
    -- Display settings
    image_url VARCHAR(500),
    is_featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_rewards_restaurant_active (restaurant_id, is_active),
    INDEX idx_rewards_points_cost (points_cost),
    INDEX idx_rewards_validity (valid_from, valid_until)
);

-- =====================================================
-- 6. REWARD REDEMPTIONS TABLE
-- =====================================================
CREATE TABLE reward_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES customer_loyalty_accounts(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id), -- Link to order where reward was used
    
    -- Redemption details
    points_used INTEGER NOT NULL,
    discount_applied DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'expired', 'cancelled')),
    
    -- Timing
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- When this redemption expires if not used
    applied_at TIMESTAMP WITH TIME ZONE, -- When reward was actually applied to order
    
    -- Metadata
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_reward_redemptions_account (account_id),
    INDEX idx_reward_redemptions_reward (reward_id),
    INDEX idx_reward_redemptions_order (order_id),
    INDEX idx_reward_redemptions_status_expiry (status, expires_at)
);

-- =====================================================
-- 7. LOYALTY EVENTS TABLE (for gamification)
-- =====================================================
CREATE TABLE loyalty_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    event_name VARCHAR(100) NOT NULL,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('double_points', 'bonus_points', 'free_reward', 'tier_upgrade')),
    
    -- Event configuration
    multiplier DECIMAL(3,2) DEFAULT 1.00, -- For double points events
    bonus_points INTEGER DEFAULT 0,
    
    -- Targeting
    target_tiers UUID[], -- Array of tier IDs this event applies to
    target_customers UUID[], -- Array of customer account IDs (for specific targeting)
    
    -- Validity
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Conditions
    min_order_amount DECIMAL(10,2),
    valid_days INTEGER[], -- Array of days of week (0=Sunday, 1=Monday, etc.)
    valid_hours_start TIME,
    valid_hours_end TIME,
    
    -- Status and usage
    is_active BOOLEAN DEFAULT true,
    max_uses_per_customer INTEGER,
    total_uses INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_loyalty_events_restaurant_active (restaurant_id, is_active),
    INDEX idx_loyalty_events_dates (start_date, end_date)
);

-- =====================================================
-- 8. LOYALTY ACHIEVEMENTS/BADGES TABLE
-- =====================================================
CREATE TABLE loyalty_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    badge_icon VARCHAR(100), -- Icon name or URL
    badge_color VARCHAR(7), -- Hex color code
    
    -- Achievement criteria (stored as JSONB for flexibility)
    criteria JSONB NOT NULL, -- {"type": "orders_count", "threshold": 10}
    
    -- Rewards for earning this achievement
    reward_points INTEGER DEFAULT 0,
    reward_description TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_achievements_restaurant (restaurant_id)
);

-- =====================================================
-- 9. CUSTOMER ACHIEVEMENTS TABLE (many-to-many)
-- =====================================================
CREATE TABLE customer_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES customer_loyalty_accounts(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES loyalty_achievements(id) ON DELETE CASCADE,
    
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    points_awarded INTEGER DEFAULT 0,
    
    CONSTRAINT unique_customer_achievement UNIQUE(account_id, achievement_id)
);

-- =====================================================
-- 10. LOYALTY SETTINGS TABLE (per restaurant)
-- =====================================================
CREATE TABLE loyalty_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    
    -- General settings
    birthday_bonus_points INTEGER DEFAULT 100,
    referral_bonus_points INTEGER DEFAULT 50,
    points_expiry_months INTEGER DEFAULT 12, -- Points expire after X months
    
    -- Email notifications
    send_welcome_email BOOLEAN DEFAULT true,
    send_points_earned_email BOOLEAN DEFAULT true,
    send_tier_upgrade_email BOOLEAN DEFAULT true,
    send_birthday_email BOOLEAN DEFAULT true,
    send_expiry_reminder_email BOOLEAN DEFAULT true,
    
    -- Display settings
    show_points_on_receipts BOOLEAN DEFAULT true,
    show_tier_progress BOOLEAN DEFAULT true,
    show_referral_program BOOLEAN DEFAULT true,
    
    -- Advanced settings
    allow_negative_points BOOLEAN DEFAULT false,
    round_points_to_nearest INTEGER DEFAULT 1, -- Round to nearest 1, 5, 10, etc.
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_restaurant_loyalty_settings UNIQUE(restaurant_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Customer loyalty accounts indexes
CREATE INDEX idx_customer_loyalty_accounts_email ON customer_loyalty_accounts(customer_email);
CREATE INDEX idx_customer_loyalty_accounts_restaurant ON customer_loyalty_accounts(restaurant_id);
CREATE INDEX idx_customer_loyalty_accounts_referral_code ON customer_loyalty_accounts(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX idx_customer_loyalty_accounts_points ON customer_loyalty_accounts(current_points DESC);

-- Loyalty programs indexes
CREATE INDEX idx_loyalty_programs_restaurant_active ON loyalty_programs(restaurant_id, is_active);

-- Loyalty tiers indexes
CREATE INDEX idx_loyalty_tiers_program ON loyalty_tiers(program_id, tier_level);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_loyalty_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply timestamp triggers to relevant tables
CREATE TRIGGER trigger_loyalty_programs_updated_at
    BEFORE UPDATE ON loyalty_programs
    FOR EACH ROW EXECUTE FUNCTION update_loyalty_timestamp();

CREATE TRIGGER trigger_loyalty_tiers_updated_at
    BEFORE UPDATE ON loyalty_tiers
    FOR EACH ROW EXECUTE FUNCTION update_loyalty_timestamp();

CREATE TRIGGER trigger_customer_loyalty_accounts_updated_at
    BEFORE UPDATE ON customer_loyalty_accounts
    FOR EACH ROW EXECUTE FUNCTION update_loyalty_timestamp();

CREATE TRIGGER trigger_rewards_updated_at
    BEFORE UPDATE ON rewards
    FOR EACH ROW EXECUTE FUNCTION update_loyalty_timestamp();

CREATE TRIGGER trigger_reward_redemptions_updated_at
    BEFORE UPDATE ON reward_redemptions
    FOR EACH ROW EXECUTE FUNCTION update_loyalty_timestamp();

CREATE TRIGGER trigger_loyalty_events_updated_at
    BEFORE UPDATE ON loyalty_events
    FOR EACH ROW EXECUTE FUNCTION update_loyalty_timestamp();

CREATE TRIGGER trigger_loyalty_achievements_updated_at
    BEFORE UPDATE ON loyalty_achievements
    FOR EACH ROW EXECUTE FUNCTION update_loyalty_timestamp();

CREATE TRIGGER trigger_loyalty_settings_updated_at
    BEFORE UPDATE ON loyalty_settings
    FOR EACH ROW EXECUTE FUNCTION update_loyalty_settings_timestamp();

-- =====================================================
-- FUNCTIONS FOR LOYALTY PROGRAM MANAGEMENT
-- =====================================================

-- Function to calculate tier based on points
CREATE OR REPLACE FUNCTION calculate_customer_tier(p_program_id UUID, p_points INTEGER)
RETURNS UUID AS $$
DECLARE
    tier_id UUID;
BEGIN
    SELECT id INTO tier_id
    FROM loyalty_tiers
    WHERE program_id = p_program_id
    AND p_points >= min_points
    AND (max_points IS NULL OR p_points <= max_points)
    ORDER BY tier_level DESC
    LIMIT 1;
    
    RETURN tier_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add loyalty points
CREATE OR REPLACE FUNCTION add_loyalty_points(
    p_account_id UUID,
    p_points INTEGER,
    p_transaction_type VARCHAR(20),
    p_description TEXT,
    p_order_id UUID DEFAULT NULL,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    transaction_id UUID;
    new_tier_id UUID;
    current_program_id UUID;
BEGIN
    -- Insert loyalty transaction
    INSERT INTO loyalty_transactions (
        account_id,
        transaction_type,
        points,
        description,
        order_id,
        expires_at
    ) VALUES (
        p_account_id,
        p_transaction_type,
        p_points,
        p_description,
        p_order_id,
        p_expires_at
    ) RETURNING id INTO transaction_id;
    
    -- Update customer points
    UPDATE customer_loyalty_accounts 
    SET 
        current_points = current_points + p_points,
        lifetime_points = CASE WHEN p_points > 0 THEN lifetime_points + p_points ELSE lifetime_points END,
        last_activity = NOW()
    WHERE id = p_account_id;
    
    -- Check for tier upgrade
    SELECT program_id INTO current_program_id
    FROM customer_loyalty_accounts
    WHERE id = p_account_id;
    
    SELECT calculate_customer_tier(current_program_id, 
        (SELECT current_points FROM customer_loyalty_accounts WHERE id = p_account_id)
    ) INTO new_tier_id;
    
    -- Update tier if changed
    UPDATE customer_loyalty_accounts
    SET current_tier_id = new_tier_id
    WHERE id = p_account_id
    AND (current_tier_id IS NULL OR current_tier_id != new_tier_id);
    
    RETURN transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check points expiry and remove expired points
CREATE OR REPLACE FUNCTION expire_loyalty_points()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER := 0;
    expired_record RECORD;
BEGIN
    -- Find and expire points
    FOR expired_record IN
        SELECT lt.id, lt.account_id, lt.points
        FROM loyalty_transactions lt
        WHERE lt.expires_at <= NOW()
        AND lt.transaction_type = 'earned'
        AND lt.points > 0
    LOOP
        -- Create expiry transaction
        INSERT INTO loyalty_transactions (
            account_id,
            transaction_type,
            points,
            description
        ) VALUES (
            expired_record.account_id,
            'expired',
            -expired_record.points,
            'Points expired'
        );
        
        -- Update customer current points
        UPDATE customer_loyalty_accounts
        SET current_points = GREATEST(0, current_points - expired_record.points)
        WHERE id = expired_record.account_id;
        
        expired_count := expired_count + 1;
    END LOOP;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all loyalty tables
ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_settings ENABLE ROW LEVEL SECURITY;

-- Policies for loyalty_programs
CREATE POLICY "Restaurant owners can manage their loyalty programs"
ON loyalty_programs FOR ALL
USING (
    restaurant_id IN (
        SELECT id FROM restaurants 
        WHERE owner_id = auth.uid()
    )
);

-- Policies for loyalty_tiers
CREATE POLICY "Restaurant owners can manage their loyalty tiers"
ON loyalty_tiers FOR ALL
USING (
    program_id IN (
        SELECT lp.id FROM loyalty_programs lp
        JOIN restaurants r ON lp.restaurant_id = r.id
        WHERE r.owner_id = auth.uid()
    )
);

-- Policies for customer_loyalty_accounts
CREATE POLICY "Restaurant owners can view their customer accounts"
ON customer_loyalty_accounts FOR SELECT
USING (
    restaurant_id IN (
        SELECT id FROM restaurants 
        WHERE owner_id = auth.uid()
    )
);

CREATE POLICY "Customers can view their own loyalty accounts"
ON customer_loyalty_accounts FOR SELECT
USING (customer_email = auth.email());

-- Policies for loyalty_transactions
CREATE POLICY "Restaurant owners can manage loyalty transactions for their customers"
ON loyalty_transactions FOR ALL
USING (
    account_id IN (
        SELECT cla.id FROM customer_loyalty_accounts cla
        JOIN restaurants r ON cla.restaurant_id = r.id
        WHERE r.owner_id = auth.uid()
    )
);

CREATE POLICY "Customers can view their own loyalty transactions"
ON loyalty_transactions FOR SELECT
USING (
    account_id IN (
        SELECT id FROM customer_loyalty_accounts 
        WHERE customer_email = auth.email()
    )
);

-- Similar policies for other tables...
CREATE POLICY "Restaurant owners can manage their rewards"
ON rewards FOR ALL
USING (
    restaurant_id IN (
        SELECT id FROM restaurants 
        WHERE owner_id = auth.uid()
    )
);

-- =====================================================
-- INITIAL DATA FOR BASIC LOYALTY PROGRAM
-- =====================================================

-- This would be populated by the application when a restaurant sets up their loyalty program
-- Example default tiers that can be created:

-- INSERT INTO loyalty_tiers (program_id, tier_name, tier_level, min_points, max_points, discount_percentage, multiplier, perks)
-- VALUES 
--     (program_id, 'Bronze', 1, 0, 499, 0, 1.0, ARRAY['Welcome bonus']),
--     (program_id, 'Silver', 2, 500, 1499, 5, 1.2, ARRAY['5% discount', '20% more points']),
--     (program_id, 'Gold', 3, 1500, 2999, 10, 1.5, ARRAY['10% discount', '50% more points', 'Free delivery']),
--     (program_id, 'Platinum', 4, 3000, NULL, 15, 2.0, ARRAY['15% discount', '100% more points', 'Free delivery', 'Priority support']);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE loyalty_programs IS 'Main loyalty program configuration for each restaurant';
COMMENT ON TABLE loyalty_tiers IS 'Tiered membership levels with benefits and requirements';
COMMENT ON TABLE customer_loyalty_accounts IS 'Individual customer loyalty accounts with points and tier info';
COMMENT ON TABLE loyalty_transactions IS 'All point earning and spending transactions with expiry tracking';
COMMENT ON TABLE rewards IS 'Catalog of rewards that customers can redeem with points';
COMMENT ON TABLE reward_redemptions IS 'Track when customers redeem rewards';
COMMENT ON TABLE loyalty_events IS 'Special events like double points days or bonus campaigns';
COMMENT ON TABLE loyalty_achievements IS 'Gamification badges and achievements customers can earn';
COMMENT ON TABLE customer_achievements IS 'Track which achievements each customer has earned';
COMMENT ON TABLE loyalty_settings IS 'Per-restaurant configuration for loyalty program behavior';

COMMENT ON FUNCTION add_loyalty_points IS 'Safely add points to customer account and check for tier upgrades';
COMMENT ON FUNCTION expire_loyalty_points IS 'Background job function to expire old points';
COMMENT ON FUNCTION calculate_customer_tier IS 'Calculate appropriate tier based on current points';