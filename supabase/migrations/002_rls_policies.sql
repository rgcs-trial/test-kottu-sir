-- =============================================
-- Restaurant SaaS Platform - Row Level Security
-- Migration: 002_rls_policies.sql
-- =============================================

-- Enable Row Level Security on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_hourly ENABLE ROW LEVEL SECURITY;

-- =============================================
-- UTILITY FUNCTIONS FOR RLS
-- =============================================

-- Function to get current user's profile
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS TABLE (
    user_id UUID,
    tenant_id UUID,
    role user_role,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.tenant_id, p.role, p.is_active
    FROM profiles p
    WHERE p.id = auth.uid()
    AND p.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is platform admin
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'platform_admin'
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user belongs to tenant
CREATE OR REPLACE FUNCTION user_belongs_to_tenant(target_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND tenant_id = target_tenant_id
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has restaurant access (owner or staff)
CREATE OR REPLACE FUNCTION has_restaurant_access(target_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND tenant_id = target_tenant_id
        AND role IN ('restaurant_owner', 'restaurant_staff')
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TENANTS TABLE RLS POLICIES
-- =============================================

-- Platform admins can see all tenants
CREATE POLICY "Platform admins can view all tenants" ON tenants
    FOR SELECT USING (is_platform_admin());

-- Restaurant owners/staff can view their own tenant
CREATE POLICY "Restaurant users can view own tenant" ON tenants
    FOR SELECT USING (user_belongs_to_tenant(id));

-- Only platform admins can insert new tenants
CREATE POLICY "Platform admins can create tenants" ON tenants
    FOR INSERT WITH CHECK (is_platform_admin());

-- Restaurant owners and platform admins can update tenant info
CREATE POLICY "Restaurant owners can update own tenant" ON tenants
    FOR UPDATE USING (
        is_platform_admin() OR 
        (user_belongs_to_tenant(id) AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'restaurant_owner'
        ))
    );

-- Only platform admins can delete tenants (soft delete)
CREATE POLICY "Platform admins can delete tenants" ON tenants
    FOR UPDATE USING (is_platform_admin())
    WITH CHECK (deleted_at IS NOT NULL);

-- =============================================
-- PROFILES TABLE RLS POLICIES
-- =============================================

-- Users can always view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

-- Platform admins can view all profiles
CREATE POLICY "Platform admins can view all profiles" ON profiles
    FOR SELECT USING (is_platform_admin());

-- Restaurant owners can view profiles in their tenant
CREATE POLICY "Restaurant owners can view tenant profiles" ON profiles
    FOR SELECT USING (
        has_restaurant_access(tenant_id) AND EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() 
            AND p.role = 'restaurant_owner'
        )
    );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Platform admins can update any profile
CREATE POLICY "Platform admins can update profiles" ON profiles
    FOR UPDATE USING (is_platform_admin());

-- Restaurant owners can update staff profiles in their tenant
CREATE POLICY "Restaurant owners can update staff profiles" ON profiles
    FOR UPDATE USING (
        has_restaurant_access(tenant_id) AND EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() 
            AND p.role = 'restaurant_owner'
        )
    );

-- Profile creation is handled by triggers and functions
CREATE POLICY "Allow profile creation" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- =============================================
-- MENU TABLES RLS POLICIES
-- =============================================

-- Menu categories policies
CREATE POLICY "Public can view active menu categories" ON menu_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Restaurant users can manage own menu categories" ON menu_categories
    FOR ALL USING (has_restaurant_access(tenant_id));

-- Menu items policies
CREATE POLICY "Public can view available menu items" ON menu_items
    FOR SELECT USING (
        is_available = true AND 
        deleted_at IS NULL AND
        EXISTS (
            SELECT 1 FROM menu_categories mc
            WHERE mc.id = category_id AND mc.is_active = true
        )
    );

CREATE POLICY "Restaurant users can manage own menu items" ON menu_items
    FOR ALL USING (has_restaurant_access(tenant_id));

-- Menu item variants policies
CREATE POLICY "Public can view available variants" ON menu_item_variants
    FOR SELECT USING (
        is_available = true AND
        EXISTS (
            SELECT 1 FROM menu_items mi
            WHERE mi.id = menu_item_id 
            AND mi.is_available = true 
            AND mi.deleted_at IS NULL
        )
    );

CREATE POLICY "Restaurant users can manage variants" ON menu_item_variants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM menu_items mi
            WHERE mi.id = menu_item_id 
            AND has_restaurant_access(mi.tenant_id)
        )
    );

-- Menu item modifiers policies
CREATE POLICY "Public can view available modifiers" ON menu_item_modifiers
    FOR SELECT USING (
        is_available = true AND
        EXISTS (
            SELECT 1 FROM menu_items mi
            WHERE mi.id = menu_item_id 
            AND mi.is_available = true 
            AND mi.deleted_at IS NULL
        )
    );

CREATE POLICY "Restaurant users can manage modifiers" ON menu_item_modifiers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM menu_items mi
            WHERE mi.id = menu_item_id 
            AND has_restaurant_access(mi.tenant_id)
        )
    );

-- =============================================
-- CART AND ORDER RLS POLICIES
-- =============================================

-- Cart policies
-- Users can manage their own carts
CREATE POLICY "Users can manage own carts" ON carts
    FOR ALL USING (user_id = auth.uid());

-- Anonymous users can manage carts by session_id
CREATE POLICY "Anonymous users can manage session carts" ON carts
    FOR ALL USING (
        user_id IS NULL AND 
        session_id IS NOT NULL AND
        current_setting('app.session_id', true) = session_id
    );

-- Restaurant staff can view carts for their tenant (for order processing)
CREATE POLICY "Restaurant staff can view tenant carts" ON carts
    FOR SELECT USING (has_restaurant_access(tenant_id));

-- Cart items policies
CREATE POLICY "Users can manage cart items" ON cart_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM carts c
            WHERE c.id = cart_id
            AND (
                c.user_id = auth.uid() OR
                (c.user_id IS NULL AND c.session_id = current_setting('app.session_id', true))
            )
        )
    );

-- Restaurant staff can view cart items for processing
CREATE POLICY "Restaurant staff can view cart items" ON cart_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM carts c
            WHERE c.id = cart_id 
            AND has_restaurant_access(c.tenant_id)
        )
    );

-- =============================================
-- ORDER RLS POLICIES
-- =============================================

-- Orders policies
-- Users can view their own orders
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (user_id = auth.uid());

-- Restaurant staff can manage orders for their tenant
CREATE POLICY "Restaurant staff can manage tenant orders" ON orders
    FOR ALL USING (has_restaurant_access(tenant_id));

-- Platform admins can view all orders
CREATE POLICY "Platform admins can view all orders" ON orders
    FOR SELECT USING (is_platform_admin());

-- Users can create orders
CREATE POLICY "Users can create orders" ON orders
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR 
        (user_id IS NULL AND customer_phone IS NOT NULL)
    );

-- Order items policies
CREATE POLICY "Users can view own order items" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_id 
            AND o.user_id = auth.uid()
        )
    );

CREATE POLICY "Restaurant staff can manage order items" ON order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_id 
            AND has_restaurant_access(o.tenant_id)
        )
    );

-- Order status history policies
CREATE POLICY "Users can view own order history" ON order_status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_id 
            AND o.user_id = auth.uid()
        )
    );

CREATE POLICY "Restaurant staff can manage order status" ON order_status_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_id 
            AND has_restaurant_access(o.tenant_id)
        )
    );

-- =============================================
-- PAYMENT RLS POLICIES
-- =============================================

-- Payment transactions policies
CREATE POLICY "Users can view own payments" ON payment_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_id 
            AND o.user_id = auth.uid()
        )
    );

CREATE POLICY "Restaurant staff can manage payments" ON payment_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_id 
            AND has_restaurant_access(o.tenant_id)
        )
    );

-- =============================================
-- RESTAURANT MANAGEMENT RLS POLICIES
-- =============================================

-- Restaurant settings policies
CREATE POLICY "Restaurant users can manage settings" ON restaurant_settings
    FOR ALL USING (has_restaurant_access(tenant_id));

-- Restaurant hours policies
CREATE POLICY "Public can view restaurant hours" ON restaurant_hours
    FOR SELECT USING (true);

CREATE POLICY "Restaurant users can manage hours" ON restaurant_hours
    FOR INSERT WITH CHECK (has_restaurant_access(tenant_id));

CREATE POLICY "Restaurant users can update hours" ON restaurant_hours
    FOR UPDATE USING (has_restaurant_access(tenant_id));

CREATE POLICY "Restaurant users can delete hours" ON restaurant_hours
    FOR DELETE USING (has_restaurant_access(tenant_id));

-- =============================================
-- ANALYTICS RLS POLICIES
-- =============================================

-- Daily analytics policies
CREATE POLICY "Restaurant users can view own analytics" ON analytics_daily
    FOR SELECT USING (has_restaurant_access(tenant_id));

CREATE POLICY "Platform admins can view all analytics" ON analytics_daily
    FOR SELECT USING (is_platform_admin());

CREATE POLICY "System can manage analytics" ON analytics_daily
    FOR ALL USING (
        has_restaurant_access(tenant_id) OR 
        current_user = 'postgres'
    );

-- Hourly analytics policies
CREATE POLICY "Restaurant users can view own hourly analytics" ON analytics_hourly
    FOR SELECT USING (has_restaurant_access(tenant_id));

CREATE POLICY "Platform admins can view all hourly analytics" ON analytics_hourly
    FOR SELECT USING (is_platform_admin());

CREATE POLICY "System can manage hourly analytics" ON analytics_hourly
    FOR ALL USING (
        has_restaurant_access(tenant_id) OR 
        current_user = 'postgres'
    );

-- =============================================
-- SECURITY FUNCTIONS
-- =============================================

-- Function to set session ID for anonymous users
CREATE OR REPLACE FUNCTION set_session_id(session_id TEXT)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.session_id', session_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate tenant access
CREATE OR REPLACE FUNCTION validate_tenant_access(target_tenant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_profile RECORD;
BEGIN
    -- Get user profile
    SELECT tenant_id, role, is_active INTO user_profile
    FROM profiles
    WHERE id = auth.uid();
    
    -- No profile found
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- User not active
    IF NOT user_profile.is_active THEN
        RETURN false;
    END IF;
    
    -- Platform admin has access to all tenants
    IF user_profile.role = 'platform_admin' THEN
        RETURN true;
    END IF;
    
    -- User must belong to the target tenant
    RETURN user_profile.tenant_id = target_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- AUDIT AND LOGGING
-- =============================================

-- Create audit log table for sensitive operations
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(255) NOT NULL,
    operation VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    user_id UUID,
    tenant_id UUID,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view audit logs
CREATE POLICY "Platform admins can view audit logs" ON audit_logs
    FOR SELECT USING (is_platform_admin());

-- Restaurant owners can view audit logs for their tenant
CREATE POLICY "Restaurant owners can view tenant audit logs" ON audit_logs
    FOR SELECT USING (
        user_belongs_to_tenant(tenant_id) AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'restaurant_owner'
        )
    );

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
    p_table_name VARCHAR,
    p_operation VARCHAR,
    p_tenant_id UUID,
    p_record_id UUID,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (
        table_name,
        operation,
        user_id,
        tenant_id,
        record_id,
        old_values,
        new_values
    ) VALUES (
        p_table_name,
        p_operation,
        auth.uid(),
        p_tenant_id,
        p_record_id,
        p_old_values,
        p_new_values
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENTS AND DOCUMENTATION
-- =============================================

COMMENT ON POLICY "Platform admins can view all tenants" ON tenants IS 
'Platform administrators have full access to view all restaurant tenants';

COMMENT ON POLICY "Restaurant users can view own tenant" ON tenants IS 
'Restaurant owners and staff can view their own tenant information';

COMMENT ON POLICY "Public can view active menu categories" ON menu_categories IS 
'Public users can view active menu categories for browsing';

COMMENT ON POLICY "Restaurant users can manage own menu categories" ON menu_categories IS 
'Restaurant staff can perform all operations on their tenant menu categories';

COMMENT ON FUNCTION get_current_user_profile() IS 
'Returns current authenticated user profile with tenant and role information';

COMMENT ON FUNCTION is_platform_admin() IS 
'Checks if current user has platform administrator role';

COMMENT ON FUNCTION user_belongs_to_tenant(UUID) IS 
'Validates if current user belongs to specified tenant';

COMMENT ON FUNCTION has_restaurant_access(UUID) IS 
'Checks if current user has restaurant management access to specified tenant';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Allow anon users to insert into carts and cart_items for guest checkout
GRANT INSERT ON carts TO anon;
GRANT INSERT ON cart_items TO anon;
GRANT INSERT ON orders TO anon;
GRANT INSERT ON order_items TO anon;
GRANT INSERT ON payment_transactions TO anon;