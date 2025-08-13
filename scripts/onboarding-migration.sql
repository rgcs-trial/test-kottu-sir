-- =====================================================
-- Restaurant SaaS - Onboarding System Migration
-- =====================================================

-- Add missing columns to restaurants table for onboarding
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_accepting_orders BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS temporary_closure_reason TEXT,
ADD COLUMN IF NOT EXISTS accepts_delivery BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS accepts_takeout BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS accepts_dine_in BOOLEAN DEFAULT false;

-- Create operating_hours table
CREATE TABLE IF NOT EXISTS operating_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
    is_open BOOLEAN DEFAULT true,
    open_time TIME,
    close_time TIME,
    is_overnight BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(restaurant_id, day_of_week)
);

-- Create onboarding_status table
CREATE TABLE IF NOT EXISTS onboarding_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
    is_complete BOOLEAN DEFAULT false,
    current_step VARCHAR(20) DEFAULT 'restaurant' CHECK (current_step IN ('restaurant', 'menu', 'payment', 'complete')),
    steps JSONB NOT NULL DEFAULT '{
        "restaurant": {"status": "pending"},
        "menu": {"status": "pending"},
        "payment": {"status": "pending"},
        "complete": {"status": "pending"}
    }',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_operating_hours_restaurant_id ON operating_hours(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_operating_hours_day ON operating_hours(day_of_week);
CREATE INDEX IF NOT EXISTS idx_onboarding_status_user_id ON onboarding_status(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_status_restaurant_id ON onboarding_status(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_status_current_step ON onboarding_status(current_step);
CREATE INDEX IF NOT EXISTS idx_onboarding_status_is_complete ON onboarding_status(is_complete);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_operating_hours_updated_at ON operating_hours;
CREATE TRIGGER update_operating_hours_updated_at
    BEFORE UPDATE ON operating_hours
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_onboarding_status_updated_at ON onboarding_status;
CREATE TRIGGER update_onboarding_status_updated_at
    BEFORE UPDATE ON onboarding_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default operating hours for existing restaurants
INSERT INTO operating_hours (restaurant_id, day_of_week, is_open, open_time, close_time)
SELECT 
    r.id,
    day_name,
    CASE 
        WHEN day_name IN ('saturday', 'sunday') THEN true
        ELSE true
    END as is_open,
    CASE 
        WHEN day_name = 'sunday' THEN '10:00'::TIME
        WHEN day_name IN ('friday', 'saturday') THEN '09:00'::TIME
        ELSE '09:00'::TIME
    END as open_time,
    CASE 
        WHEN day_name = 'sunday' THEN '20:00'::TIME
        WHEN day_name IN ('friday', 'saturday') THEN '22:00'::TIME
        ELSE '21:00'::TIME
    END as close_time
FROM restaurants r
CROSS JOIN (
    VALUES 
    ('monday'),
    ('tuesday'),
    ('wednesday'), 
    ('thursday'),
    ('friday'),
    ('saturday'),
    ('sunday')
) AS days(day_name)
WHERE NOT EXISTS (
    SELECT 1 FROM operating_hours oh 
    WHERE oh.restaurant_id = r.id AND oh.day_of_week = day_name
);

-- Update existing restaurants with default service options
UPDATE restaurants 
SET 
    is_online = COALESCE(is_online, true),
    is_accepting_orders = COALESCE(is_accepting_orders, true),
    accepts_delivery = COALESCE(accepts_delivery, true),
    accepts_takeout = COALESCE(accepts_takeout, true),
    accepts_dine_in = COALESCE(accepts_dine_in, false)
WHERE is_online IS NULL OR is_accepting_orders IS NULL OR accepts_delivery IS NULL OR accepts_takeout IS NULL OR accepts_dine_in IS NULL;

-- Row Level Security (RLS) Policies

-- Operating Hours policies
ALTER TABLE operating_hours ENABLE ROW LEVEL SECURITY;

-- Users can view operating hours for any restaurant (public data)
CREATE POLICY "Operating hours are viewable by everyone" ON operating_hours
    FOR SELECT USING (true);

-- Only restaurant owners/admins can manage operating hours
CREATE POLICY "Restaurant owners can manage operating hours" ON operating_hours
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM restaurants r
            WHERE r.id = restaurant_id
            AND r.owner_id = auth.uid()
        )
    );

-- Onboarding Status policies
ALTER TABLE onboarding_status ENABLE ROW LEVEL SECURITY;

-- Users can only see their own onboarding status
CREATE POLICY "Users can view their own onboarding status" ON onboarding_status
    FOR SELECT USING (user_id = auth.uid());

-- Users can only manage their own onboarding status
CREATE POLICY "Users can manage their own onboarding status" ON onboarding_status
    FOR ALL USING (user_id = auth.uid());

-- Platform admins can view all onboarding statuses (for analytics)
CREATE POLICY "Platform admins can view all onboarding statuses" ON onboarding_status
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('super_admin', 'platform_admin')
        )
    );

-- Create helpful views
CREATE OR REPLACE VIEW restaurant_onboarding_overview AS
SELECT 
    r.id as restaurant_id,
    r.name as restaurant_name,
    r.owner_id,
    os.is_complete,
    os.current_step,
    os.started_at,
    os.completed_at,
    EXTRACT(EPOCH FROM (COALESCE(os.completed_at, NOW()) - os.started_at))/3600 as hours_to_complete,
    os.steps
FROM restaurants r
LEFT JOIN onboarding_status os ON os.restaurant_id = r.id;

-- Create function to get onboarding analytics
CREATE OR REPLACE FUNCTION get_onboarding_analytics()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_started', (SELECT COUNT(*) FROM onboarding_status),
        'total_completed', (SELECT COUNT(*) FROM onboarding_status WHERE is_complete = true),
        'completion_rate', (
            CASE 
                WHEN (SELECT COUNT(*) FROM onboarding_status) = 0 THEN 0
                ELSE ROUND(
                    (SELECT COUNT(*)::DECIMAL FROM onboarding_status WHERE is_complete = true) / 
                    (SELECT COUNT(*)::DECIMAL FROM onboarding_status) * 100, 2
                )
            END
        ),
        'average_time_hours', (
            SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/3600), 0)
            FROM onboarding_status 
            WHERE is_complete = true AND completed_at IS NOT NULL
        ),
        'dropoff_by_step', (
            SELECT json_object_agg(current_step, step_count)
            FROM (
                SELECT current_step, COUNT(*) as step_count
                FROM onboarding_status
                WHERE is_complete = false
                GROUP BY current_step
            ) step_counts
        ),
        'completions_by_day', (
            SELECT json_object_agg(completion_date, daily_count)
            FROM (
                SELECT DATE(completed_at) as completion_date, COUNT(*) as daily_count
                FROM onboarding_status
                WHERE is_complete = true AND completed_at >= NOW() - INTERVAL '30 days'
                GROUP BY DATE(completed_at)
                ORDER BY completion_date
            ) daily_completions
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_onboarding_analytics() TO authenticated;

COMMIT;