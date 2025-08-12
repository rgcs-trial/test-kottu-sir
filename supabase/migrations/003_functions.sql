-- =============================================
-- Restaurant SaaS Platform - Functions & Triggers
-- Migration: 003_functions.sql
-- =============================================

-- =============================================
-- ORDER MANAGEMENT FUNCTIONS
-- =============================================

-- Function to generate unique order numbers
CREATE OR REPLACE FUNCTION generate_order_number(tenant_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    tenant_slug VARCHAR(100);
    date_part VARCHAR(8);
    sequence_num INTEGER;
    order_number VARCHAR(50);
BEGIN
    -- Get tenant slug
    SELECT slug INTO tenant_slug
    FROM tenants
    WHERE id = tenant_id;
    
    -- Generate date part (YYYYMMDD)
    date_part := to_char(NOW(), 'YYYYMMDD');
    
    -- Get next sequence number for today
    SELECT COALESCE(MAX(
        CAST(SPLIT_PART(order_number, '-', 3) AS INTEGER)
    ), 0) + 1 INTO sequence_num
    FROM orders
    WHERE tenant_id = tenant_id
    AND order_number LIKE tenant_slug || '-' || date_part || '-%';
    
    -- Format as SLUG-YYYYMMDD-NNN
    order_number := tenant_slug || '-' || date_part || '-' || LPAD(sequence_num::TEXT, 3, '0');
    
    RETURN order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate order total
CREATE OR REPLACE FUNCTION calculate_order_total(
    p_subtotal DECIMAL(10,2),
    p_tax_rate DECIMAL(5,4) DEFAULT 0.0,
    p_delivery_fee DECIMAL(8,2) DEFAULT 0.0,
    p_service_fee DECIMAL(8,2) DEFAULT 0.0,
    p_discount_amount DECIMAL(8,2) DEFAULT 0.0
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    tax_amount DECIMAL(10,2);
    total_amount DECIMAL(10,2);
BEGIN
    -- Calculate tax
    tax_amount := p_subtotal * p_tax_rate;
    
    -- Calculate total
    total_amount := p_subtotal + tax_amount + p_delivery_fee + p_service_fee - p_discount_amount;
    
    -- Ensure total is not negative
    total_amount := GREATEST(total_amount, 0);
    
    RETURN total_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to create order from cart
CREATE OR REPLACE FUNCTION create_order_from_cart(
    p_cart_id UUID,
    p_fulfillment_type fulfillment_type,
    p_customer_name VARCHAR(255) DEFAULT NULL,
    p_customer_phone VARCHAR(50) DEFAULT NULL,
    p_customer_email VARCHAR(255) DEFAULT NULL,
    p_delivery_address JSONB DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_tax_rate DECIMAL(5,4) DEFAULT 0.0
)
RETURNS UUID AS $$
DECLARE
    cart_record RECORD;
    order_id UUID;
    subtotal DECIMAL(10,2) := 0;
    tax_amount DECIMAL(10,2) := 0;
    delivery_fee DECIMAL(10,2) := 0;
    total_amount DECIMAL(10,2) := 0;
    order_number VARCHAR(50);
BEGIN
    -- Get cart information
    SELECT * INTO cart_record
    FROM carts
    WHERE id = p_cart_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cart not found';
    END IF;
    
    -- Calculate subtotal from cart items
    SELECT SUM(ci.quantity * ci.unit_price) INTO subtotal
    FROM cart_items ci
    WHERE ci.cart_id = p_cart_id;
    
    IF subtotal IS NULL THEN
        RAISE EXCEPTION 'Cart is empty';
    END IF;
    
    -- Get delivery fee if applicable
    IF p_fulfillment_type = 'delivery' THEN
        SELECT t.delivery_fee INTO delivery_fee
        FROM tenants t
        WHERE t.id = cart_record.tenant_id;
    END IF;
    
    -- Generate order number
    order_number := generate_order_number(cart_record.tenant_id);
    
    -- Calculate totals
    tax_amount := subtotal * p_tax_rate;
    total_amount := subtotal + tax_amount + delivery_fee;
    
    -- Create order
    INSERT INTO orders (
        tenant_id,
        user_id,
        order_number,
        status,
        fulfillment_type,
        subtotal,
        tax_amount,
        delivery_fee,
        total_amount,
        customer_name,
        customer_phone,
        customer_email,
        delivery_address,
        notes
    ) VALUES (
        cart_record.tenant_id,
        cart_record.user_id,
        order_number,
        'pending',
        p_fulfillment_type,
        subtotal,
        tax_amount,
        delivery_fee,
        total_amount,
        p_customer_name,
        p_customer_phone,
        p_customer_email,
        p_delivery_address,
        p_notes
    )
    RETURNING id INTO order_id;
    
    -- Copy cart items to order items
    INSERT INTO order_items (
        order_id,
        menu_item_id,
        variant_id,
        item_name,
        variant_name,
        quantity,
        unit_price,
        total_price,
        modifiers,
        special_instructions
    )
    SELECT 
        order_id,
        ci.menu_item_id,
        ci.variant_id,
        mi.name,
        miv.name,
        ci.quantity,
        ci.unit_price,
        ci.quantity * ci.unit_price,
        ci.modifiers,
        ci.special_instructions
    FROM cart_items ci
    JOIN menu_items mi ON mi.id = ci.menu_item_id
    LEFT JOIN menu_item_variants miv ON miv.id = ci.variant_id
    WHERE ci.cart_id = p_cart_id;
    
    -- Create initial status history
    INSERT INTO order_status_history (order_id, status, notes, changed_by)
    VALUES (order_id, 'pending', 'Order created', auth.uid());
    
    -- Clear the cart
    DELETE FROM cart_items WHERE cart_id = p_cart_id;
    DELETE FROM carts WHERE id = p_cart_id;
    
    RETURN order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update order status
CREATE OR REPLACE FUNCTION update_order_status(
    p_order_id UUID,
    p_new_status order_status,
    p_notes TEXT DEFAULT NULL,
    p_estimated_time TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    current_status order_status;
    order_tenant_id UUID;
BEGIN
    -- Get current order status and tenant
    SELECT status, tenant_id INTO current_status, order_tenant_id
    FROM orders
    WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;
    
    -- Validate status transition
    IF current_status = p_new_status THEN
        RETURN; -- No change needed
    END IF;
    
    -- Update order status and relevant timestamps
    UPDATE orders SET
        status = p_new_status,
        confirmed_at = CASE WHEN p_new_status = 'confirmed' THEN NOW() ELSE confirmed_at END,
        prepared_at = CASE WHEN p_new_status = 'preparing' THEN NOW() ELSE prepared_at END,
        ready_at = CASE WHEN p_new_status = 'ready' THEN NOW() ELSE ready_at END,
        delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END,
        cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END,
        estimated_delivery_time = COALESCE(p_estimated_time, estimated_delivery_time)
    WHERE id = p_order_id;
    
    -- Add status history entry
    INSERT INTO order_status_history (
        order_id,
        status,
        notes,
        changed_by,
        estimated_time
    ) VALUES (
        p_order_id,
        p_new_status,
        p_notes,
        auth.uid(),
        p_estimated_time
    );
    
    -- Create audit log
    PERFORM create_audit_log(
        'orders',
        'UPDATE',
        order_tenant_id,
        p_order_id,
        jsonb_build_object('old_status', current_status),
        jsonb_build_object('new_status', p_new_status, 'notes', p_notes)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- MENU MANAGEMENT FUNCTIONS
-- =============================================

-- Function to calculate menu item price with variants and modifiers
CREATE OR REPLACE FUNCTION calculate_item_price(
    p_menu_item_id UUID,
    p_variant_id UUID DEFAULT NULL,
    p_modifiers UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    base_price DECIMAL(10,2);
    variant_adjustment DECIMAL(10,2) := 0;
    modifier_total DECIMAL(10,2) := 0;
    final_price DECIMAL(10,2);
BEGIN
    -- Get base price
    SELECT base_price INTO base_price
    FROM menu_items
    WHERE id = p_menu_item_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Menu item not found';
    END IF;
    
    -- Add variant price adjustment
    IF p_variant_id IS NOT NULL THEN
        SELECT COALESCE(price_adjustment, 0) INTO variant_adjustment
        FROM menu_item_variants
        WHERE id = p_variant_id AND menu_item_id = p_menu_item_id;
    END IF;
    
    -- Add modifier prices
    IF array_length(p_modifiers, 1) > 0 THEN
        SELECT COALESCE(SUM(price_adjustment), 0) INTO modifier_total
        FROM menu_item_modifiers
        WHERE id = ANY(p_modifiers) AND menu_item_id = p_menu_item_id;
    END IF;
    
    final_price := base_price + variant_adjustment + modifier_total;
    
    RETURN GREATEST(final_price, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to check menu item availability
CREATE OR REPLACE FUNCTION check_item_availability(
    p_menu_item_id UUID,
    p_variant_id UUID DEFAULT NULL,
    p_quantity INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    item_available BOOLEAN;
    item_stock INTEGER;
    variant_stock INTEGER;
    category_active BOOLEAN;
    current_time TIME;
    current_day day_of_week;
BEGIN
    -- Get current time and day
    current_time := CURRENT_TIME;
    current_day := LOWER(to_char(CURRENT_DATE, 'day'))::day_of_week;
    
    -- Check menu item availability
    SELECT 
        is_available,
        stock_quantity,
        (available_from IS NULL OR current_time >= available_from),
        (available_until IS NULL OR current_time <= available_until),
        (current_day = ANY(available_days))
    INTO item_available, item_stock
    FROM menu_items
    WHERE id = p_menu_item_id
    AND deleted_at IS NULL;
    
    IF NOT FOUND OR NOT item_available THEN
        RETURN FALSE;
    END IF;
    
    -- Check category is active
    SELECT mc.is_active INTO category_active
    FROM menu_categories mc
    JOIN menu_items mi ON mi.category_id = mc.id
    WHERE mi.id = p_menu_item_id;
    
    IF NOT category_active THEN
        RETURN FALSE;
    END IF;
    
    -- Check stock if limited
    IF item_stock IS NOT NULL AND item_stock < p_quantity THEN
        RETURN FALSE;
    END IF;
    
    -- Check variant availability and stock
    IF p_variant_id IS NOT NULL THEN
        SELECT stock_quantity INTO variant_stock
        FROM menu_item_variants
        WHERE id = p_variant_id 
        AND menu_item_id = p_menu_item_id
        AND is_available = true;
        
        IF NOT FOUND THEN
            RETURN FALSE;
        END IF;
        
        IF variant_stock IS NOT NULL AND variant_stock < p_quantity THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ANALYTICS FUNCTIONS
-- =============================================

-- Function to update daily analytics
CREATE OR REPLACE FUNCTION update_daily_analytics(p_tenant_id UUID, p_date DATE)
RETURNS VOID AS $$
DECLARE
    analytics_data RECORD;
BEGIN
    -- Calculate daily metrics
    WITH order_metrics AS (
        SELECT 
            COUNT(*) as total_orders,
            COUNT(*) FILTER (WHERE status IN ('delivered', 'completed')) as completed_orders,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders,
            COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('cancelled', 'refunded')), 0) as gross_revenue,
            COALESCE(SUM(total_amount - tax_amount) FILTER (WHERE status NOT IN ('cancelled', 'refunded')), 0) as net_revenue,
            COALESCE(SUM(tax_amount) FILTER (WHERE status NOT IN ('cancelled', 'refunded')), 0) as tax_collected,
            COALESCE(AVG(total_amount) FILTER (WHERE status NOT IN ('cancelled', 'refunded')), 0) as avg_order_value,
            COUNT(*) FILTER (WHERE fulfillment_type = 'dine_in') as dine_in_orders,
            COUNT(*) FILTER (WHERE fulfillment_type = 'takeaway') as takeaway_orders,
            COUNT(*) FILTER (WHERE fulfillment_type = 'delivery') as delivery_orders,
            COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_customers
        FROM orders
        WHERE tenant_id = p_tenant_id
        AND DATE(created_at) = p_date
    ),
    item_metrics AS (
        SELECT COALESCE(SUM(oi.quantity), 0) as total_items_sold
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.tenant_id = p_tenant_id
        AND DATE(o.created_at) = p_date
        AND o.status NOT IN ('cancelled', 'refunded')
    )
    SELECT om.*, im.total_items_sold
    INTO analytics_data
    FROM order_metrics om
    CROSS JOIN item_metrics im;
    
    -- Upsert daily analytics
    INSERT INTO analytics_daily (
        tenant_id,
        date,
        total_orders,
        completed_orders,
        cancelled_orders,
        gross_revenue,
        net_revenue,
        tax_collected,
        total_items_sold,
        average_order_value,
        unique_customers,
        dine_in_orders,
        takeaway_orders,
        delivery_orders
    ) VALUES (
        p_tenant_id,
        p_date,
        analytics_data.total_orders,
        analytics_data.completed_orders,
        analytics_data.cancelled_orders,
        analytics_data.gross_revenue,
        analytics_data.net_revenue,
        analytics_data.tax_collected,
        analytics_data.total_items_sold,
        analytics_data.avg_order_value,
        analytics_data.unique_customers,
        analytics_data.dine_in_orders,
        analytics_data.takeaway_orders,
        analytics_data.delivery_orders
    )
    ON CONFLICT (tenant_id, date)
    DO UPDATE SET
        total_orders = EXCLUDED.total_orders,
        completed_orders = EXCLUDED.completed_orders,
        cancelled_orders = EXCLUDED.cancelled_orders,
        gross_revenue = EXCLUDED.gross_revenue,
        net_revenue = EXCLUDED.net_revenue,
        tax_collected = EXCLUDED.tax_collected,
        total_items_sold = EXCLUDED.total_items_sold,
        average_order_value = EXCLUDED.average_order_value,
        unique_customers = EXCLUDED.unique_customers,
        dine_in_orders = EXCLUDED.dine_in_orders,
        takeaway_orders = EXCLUDED.takeaway_orders,
        delivery_orders = EXCLUDED.delivery_orders,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update hourly analytics
CREATE OR REPLACE FUNCTION update_hourly_analytics(
    p_tenant_id UUID, 
    p_date DATE, 
    p_hour INTEGER
)
RETURNS VOID AS $$
DECLARE
    analytics_data RECORD;
BEGIN
    -- Calculate hourly metrics
    SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status IN ('delivered', 'completed')) as completed_orders,
        COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('cancelled', 'refunded')), 0) as gross_revenue,
        COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(ready_at, delivered_at) - created_at)) / 60), 0) as avg_prep_time
    INTO analytics_data
    FROM orders
    WHERE tenant_id = p_tenant_id
    AND DATE(created_at) = p_date
    AND EXTRACT(HOUR FROM created_at) = p_hour;
    
    -- Upsert hourly analytics
    INSERT INTO analytics_hourly (
        tenant_id,
        date,
        hour,
        total_orders,
        completed_orders,
        gross_revenue,
        average_prep_time_minutes
    ) VALUES (
        p_tenant_id,
        p_date,
        p_hour,
        analytics_data.total_orders,
        analytics_data.completed_orders,
        analytics_data.gross_revenue,
        analytics_data.avg_prep_time
    )
    ON CONFLICT (tenant_id, date, hour)
    DO UPDATE SET
        total_orders = EXCLUDED.total_orders,
        completed_orders = EXCLUDED.completed_orders,
        gross_revenue = EXCLUDED.gross_revenue,
        average_prep_time_minutes = EXCLUDED.average_prep_time_minutes;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, role, created_at)
    VALUES (NEW.id, NEW.email, 'customer', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger to update analytics when orders change
CREATE OR REPLACE FUNCTION trigger_analytics_update()
RETURNS TRIGGER AS $$
DECLARE
    order_date DATE;
    order_hour INTEGER;
BEGIN
    -- Determine the order date and hour
    IF TG_OP = 'DELETE' THEN
        order_date := DATE(OLD.created_at);
        order_hour := EXTRACT(HOUR FROM OLD.created_at);
        -- Update analytics for the old date
        PERFORM update_daily_analytics(OLD.tenant_id, order_date);
        PERFORM update_hourly_analytics(OLD.tenant_id, order_date, order_hour);
    ELSE
        order_date := DATE(NEW.created_at);
        order_hour := EXTRACT(HOUR FROM NEW.created_at);
        -- Update analytics for the new date
        PERFORM update_daily_analytics(NEW.tenant_id, order_date);
        PERFORM update_hourly_analytics(NEW.tenant_id, order_date, order_hour);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_order_analytics
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION trigger_analytics_update();

-- Trigger to ensure order number is set
CREATE OR REPLACE FUNCTION ensure_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := generate_order_number(NEW.tenant_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION ensure_order_number();

-- Trigger to validate cart item pricing
CREATE OR REPLACE FUNCTION validate_cart_item_price()
RETURNS TRIGGER AS $$
DECLARE
    calculated_price DECIMAL(10,2);
    modifiers_array UUID[];
BEGIN
    -- Extract modifier IDs from JSONB
    SELECT ARRAY(
        SELECT (value->>'id')::UUID
        FROM jsonb_array_elements(NEW.modifiers)
    ) INTO modifiers_array;
    
    -- Calculate expected price
    calculated_price := calculate_item_price(
        NEW.menu_item_id,
        NEW.variant_id,
        modifiers_array
    );
    
    -- Validate price (allow small rounding differences)
    IF ABS(NEW.unit_price - calculated_price) > 0.01 THEN
        RAISE EXCEPTION 'Invalid item price. Expected: %, Got: %', calculated_price, NEW.unit_price;
    END IF;
    
    -- Check availability
    IF NOT check_item_availability(NEW.menu_item_id, NEW.variant_id, NEW.quantity) THEN
        RAISE EXCEPTION 'Item is not available';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_cart_item
    BEFORE INSERT OR UPDATE ON cart_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_cart_item_price();

-- Trigger to clean up expired carts
CREATE OR REPLACE FUNCTION cleanup_expired_carts()
RETURNS VOID AS $$
BEGIN
    -- Delete expired carts and their items
    DELETE FROM cart_items 
    WHERE cart_id IN (
        SELECT id FROM carts 
        WHERE expires_at < NOW()
    );
    
    DELETE FROM carts 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to get restaurant operating status
CREATE OR REPLACE FUNCTION get_restaurant_status(p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    current_day day_of_week;
    current_time TIME;
    is_open_now BOOLEAN := false;
    next_open_time TIMESTAMP WITH TIME ZONE;
BEGIN
    current_day := LOWER(to_char(CURRENT_DATE, 'day'))::day_of_week;
    current_time := CURRENT_TIME;
    
    -- Check if restaurant is open now
    SELECT EXISTS (
        SELECT 1 FROM restaurant_hours rh
        JOIN restaurant_settings rs ON rs.tenant_id = rh.tenant_id
        WHERE rh.tenant_id = p_tenant_id
        AND rh.day_of_week = current_day
        AND rh.is_open = true
        AND rs.is_open = true
        AND rs.accepts_orders = true
        AND current_time BETWEEN rh.open_time AND rh.close_time
        AND (
            rh.break_start_time IS NULL OR 
            rh.break_end_time IS NULL OR
            current_time NOT BETWEEN rh.break_start_time AND rh.break_end_time
        )
    ) INTO is_open_now;
    
    -- Get next opening time if closed
    IF NOT is_open_now THEN
        -- Implementation for next opening time would go here
        -- This is a simplified version
        next_open_time := (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE;
    END IF;
    
    result := jsonb_build_object(
        'is_open', is_open_now,
        'next_open_time', next_open_time,
        'current_time', CURRENT_TIME,
        'current_day', current_day
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to search menu items
CREATE OR REPLACE FUNCTION search_menu_items(
    p_tenant_id UUID,
    p_search_term TEXT,
    p_category_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    description TEXT,
    base_price DECIMAL(10,2),
    image_url TEXT,
    category_name VARCHAR(255),
    is_available BOOLEAN,
    is_featured BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mi.id,
        mi.name,
        mi.description,
        mi.base_price,
        mi.image_url,
        mc.name as category_name,
        mi.is_available,
        mi.is_featured
    FROM menu_items mi
    JOIN menu_categories mc ON mc.id = mi.category_id
    WHERE mi.tenant_id = p_tenant_id
    AND mi.deleted_at IS NULL
    AND mi.is_available = true
    AND mc.is_active = true
    AND (p_category_id IS NULL OR mi.category_id = p_category_id)
    AND (
        p_search_term IS NULL OR
        mi.name ILIKE '%' || p_search_term || '%' OR
        mi.description ILIKE '%' || p_search_term || '%' OR
        EXISTS (
            SELECT 1 FROM unnest(mi.ingredients) AS ingredient
            WHERE ingredient ILIKE '%' || p_search_term || '%'
        ) OR
        EXISTS (
            SELECT 1 FROM unnest(mi.dietary_tags) AS tag
            WHERE tag ILIKE '%' || p_search_term || '%'
        )
    )
    ORDER BY 
        mi.is_featured DESC,
        mi.sort_order ASC,
        mi.name ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;