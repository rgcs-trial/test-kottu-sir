-- =============================================
-- Advanced Analytics Functions
-- Migration: 005_analytics_functions.sql  
-- =============================================

-- Enable required extensions for analytics
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =============================================
-- ANALYTICS UTILITY FUNCTIONS
-- =============================================

-- Function to calculate growth rate between two periods
CREATE OR REPLACE FUNCTION calculate_growth_rate(current_value NUMERIC, previous_value NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
    IF previous_value = 0 OR previous_value IS NULL THEN
        RETURN CASE WHEN current_value > 0 THEN 100 ELSE 0 END;
    END IF;
    RETURN ((current_value - previous_value) / previous_value) * 100;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get date range for specific period
CREATE OR REPLACE FUNCTION get_date_range(period TEXT, base_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(start_date DATE, end_date DATE) AS $$
BEGIN
    CASE period
        WHEN 'today' THEN
            RETURN QUERY SELECT base_date, base_date;
        WHEN 'yesterday' THEN
            RETURN QUERY SELECT base_date - INTERVAL '1 day'::INTERVAL, base_date - INTERVAL '1 day'::INTERVAL;
        WHEN 'week' THEN
            RETURN QUERY SELECT 
                date_trunc('week', base_date)::DATE,
                (date_trunc('week', base_date) + INTERVAL '6 days')::DATE;
        WHEN 'last_week' THEN
            RETURN QUERY SELECT 
                (date_trunc('week', base_date) - INTERVAL '7 days')::DATE,
                (date_trunc('week', base_date) - INTERVAL '1 day')::DATE;
        WHEN 'month' THEN
            RETURN QUERY SELECT 
                date_trunc('month', base_date)::DATE,
                (date_trunc('month', base_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        WHEN 'last_month' THEN
            RETURN QUERY SELECT 
                (date_trunc('month', base_date) - INTERVAL '1 month')::DATE,
                (date_trunc('month', base_date) - INTERVAL '1 day')::DATE;
        WHEN 'year' THEN
            RETURN QUERY SELECT 
                date_trunc('year', base_date)::DATE,
                (date_trunc('year', base_date) + INTERVAL '1 year' - INTERVAL '1 day')::DATE;
        WHEN 'last_year' THEN
            RETURN QUERY SELECT 
                (date_trunc('year', base_date) - INTERVAL '1 year')::DATE,
                (date_trunc('year', base_date) - INTERVAL '1 day')::DATE;
        ELSE
            RETURN QUERY SELECT base_date - INTERVAL '30 days'::INTERVAL, base_date;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- REVENUE ANALYTICS FUNCTIONS
-- =============================================

-- Get revenue analytics for a restaurant over time period
CREATE OR REPLACE FUNCTION get_revenue_analytics(
    restaurant_id UUID,
    time_period TEXT DEFAULT 'month',
    granularity TEXT DEFAULT 'day'
)
RETURNS TABLE(
    period_date DATE,
    gross_revenue NUMERIC,
    net_revenue NUMERIC,
    order_count BIGINT,
    average_order_value NUMERIC,
    tax_collected NUMERIC,
    delivery_fees NUMERIC,
    discount_amount NUMERIC
) AS $$
DECLARE
    date_range RECORD;
BEGIN
    SELECT * INTO date_range FROM get_date_range(time_period);
    
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            date_range.start_date,
            date_range.end_date,
            CASE granularity
                WHEN 'hour' THEN INTERVAL '1 hour'
                WHEN 'day' THEN INTERVAL '1 day'
                WHEN 'week' THEN INTERVAL '7 days'
                WHEN 'month' THEN INTERVAL '1 month'
                ELSE INTERVAL '1 day'
            END
        )::DATE as period_date
    ),
    order_stats AS (
        SELECT 
            DATE(o.created_at) as order_date,
            SUM(o.total_amount) as gross_rev,
            SUM(o.total_amount - COALESCE(o.discount_amount, 0)) as net_rev,
            COUNT(*) as order_cnt,
            AVG(o.total_amount) as avg_order_val,
            SUM(COALESCE(o.tax_amount, 0)) as tax_coll,
            SUM(COALESCE(o.delivery_fee, 0)) as delivery_rev,
            SUM(COALESCE(o.discount_amount, 0)) as discount_amt
        FROM orders o
        WHERE o.tenant_id = restaurant_id
            AND o.status IN ('delivered', 'completed')
            AND o.payment_status = 'completed'
            AND DATE(o.created_at) BETWEEN date_range.start_date AND date_range.end_date
        GROUP BY DATE(o.created_at)
    )
    SELECT 
        ds.period_date,
        COALESCE(os.gross_rev, 0),
        COALESCE(os.net_rev, 0),
        COALESCE(os.order_cnt, 0),
        COALESCE(os.avg_order_val, 0),
        COALESCE(os.tax_coll, 0),
        COALESCE(os.delivery_rev, 0),
        COALESCE(os.discount_amt, 0)
    FROM date_series ds
    LEFT JOIN order_stats os ON ds.period_date = os.order_date
    ORDER BY ds.period_date;
END;
$$ LANGUAGE plpgsql;

-- Get hourly peak analysis for orders
CREATE OR REPLACE FUNCTION get_peak_hours_analysis(
    restaurant_id UUID,
    time_period TEXT DEFAULT 'month'
)
RETURNS TABLE(
    hour_of_day INTEGER,
    avg_orders NUMERIC,
    avg_revenue NUMERIC,
    peak_day_orders BIGINT,
    peak_day_revenue NUMERIC
) AS $$
DECLARE
    date_range RECORD;
BEGIN
    SELECT * INTO date_range FROM get_date_range(time_period);
    
    RETURN QUERY
    SELECT 
        EXTRACT(HOUR FROM o.created_at)::INTEGER as hour_of_day,
        AVG(hourly_stats.order_count) as avg_orders,
        AVG(hourly_stats.hourly_revenue) as avg_revenue,
        MAX(hourly_stats.order_count) as peak_day_orders,
        MAX(hourly_stats.hourly_revenue) as peak_day_revenue
    FROM orders o
    JOIN (
        SELECT 
            DATE(created_at) as order_date,
            EXTRACT(HOUR FROM created_at) as hour,
            COUNT(*) as order_count,
            SUM(total_amount) as hourly_revenue
        FROM orders
        WHERE tenant_id = restaurant_id
            AND status IN ('delivered', 'completed')
            AND DATE(created_at) BETWEEN date_range.start_date AND date_range.end_date
        GROUP BY DATE(created_at), EXTRACT(HOUR FROM created_at)
    ) hourly_stats ON EXTRACT(HOUR FROM o.created_at) = hourly_stats.hour
    WHERE o.tenant_id = restaurant_id
        AND o.status IN ('delivered', 'completed')
        AND DATE(o.created_at) BETWEEN date_range.start_date AND date_range.end_date
    GROUP BY EXTRACT(HOUR FROM o.created_at)
    ORDER BY hour_of_day;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- MENU PERFORMANCE ANALYTICS FUNCTIONS
-- =============================================

-- Get menu item performance analytics
CREATE OR REPLACE FUNCTION get_menu_performance(
    restaurant_id UUID,
    time_period TEXT DEFAULT 'month',
    limit_items INTEGER DEFAULT 20
)
RETURNS TABLE(
    item_id UUID,
    item_name TEXT,
    category_name TEXT,
    total_orders BIGINT,
    total_revenue NUMERIC,
    avg_rating NUMERIC,
    profit_margin NUMERIC,
    trend_direction TEXT
) AS $$
DECLARE
    date_range RECORD;
    prev_date_range RECORD;
BEGIN
    SELECT * INTO date_range FROM get_date_range(time_period);
    SELECT * INTO prev_date_range FROM get_date_range('last_' || time_period);
    
    RETURN QUERY
    WITH item_performance AS (
        SELECT 
            mi.id as item_id,
            mi.name as item_name,
            mc.name as category_name,
            COUNT(oi.id) as total_orders,
            SUM(oi.total_price) as total_revenue,
            mi.base_price as item_price,
            (SUM(oi.total_price) - (COUNT(oi.id) * mi.base_price * 0.3)) as profit_margin
        FROM menu_items mi
        JOIN menu_categories mc ON mi.category_id = mc.id
        LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
        LEFT JOIN orders o ON oi.order_id = o.id
        WHERE mi.tenant_id = restaurant_id
            AND (o.id IS NULL OR (
                o.status IN ('delivered', 'completed')
                AND DATE(o.created_at) BETWEEN date_range.start_date AND date_range.end_date
            ))
        GROUP BY mi.id, mi.name, mc.name, mi.base_price
    ),
    previous_performance AS (
        SELECT 
            mi.id as item_id,
            COUNT(oi.id) as prev_orders
        FROM menu_items mi
        LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
        LEFT JOIN orders o ON oi.order_id = o.id
        WHERE mi.tenant_id = restaurant_id
            AND (o.id IS NULL OR (
                o.status IN ('delivered', 'completed')
                AND DATE(o.created_at) BETWEEN prev_date_range.start_date AND prev_date_range.end_date
            ))
        GROUP BY mi.id
    )
    SELECT 
        ip.item_id,
        ip.item_name,
        ip.category_name,
        ip.total_orders,
        ip.total_revenue,
        4.2 as avg_rating, -- Placeholder - would come from reviews
        ip.profit_margin,
        CASE 
            WHEN ip.total_orders > COALESCE(pp.prev_orders, 0) THEN 'up'
            WHEN ip.total_orders < COALESCE(pp.prev_orders, 0) THEN 'down'
            ELSE 'stable'
        END as trend_direction
    FROM item_performance ip
    LEFT JOIN previous_performance pp ON ip.item_id = pp.item_id
    ORDER BY ip.total_revenue DESC
    LIMIT limit_items;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CUSTOMER ANALYTICS FUNCTIONS
-- =============================================

-- Get customer behavior analytics
CREATE OR REPLACE FUNCTION get_customer_analytics(
    restaurant_id UUID,
    time_period TEXT DEFAULT 'month'
)
RETURNS TABLE(
    total_customers BIGINT,
    new_customers BIGINT,
    returning_customers BIGINT,
    avg_order_frequency NUMERIC,
    customer_lifetime_value NUMERIC,
    retention_rate NUMERIC,
    churn_rate NUMERIC
) AS $$
DECLARE
    date_range RECORD;
    prev_date_range RECORD;
BEGIN
    SELECT * INTO date_range FROM get_date_range(time_period);
    SELECT * INTO prev_date_range FROM get_date_range('last_' || time_period);
    
    RETURN QUERY
    WITH customer_stats AS (
        SELECT 
            COUNT(DISTINCT o.user_id) FILTER (WHERE o.user_id IS NOT NULL) as total_customers,
            COUNT(DISTINCT o.user_id) FILTER (
                WHERE o.user_id IS NOT NULL 
                AND o.user_id NOT IN (
                    SELECT DISTINCT user_id 
                    FROM orders 
                    WHERE tenant_id = restaurant_id 
                        AND user_id IS NOT NULL
                        AND DATE(created_at) < date_range.start_date
                )
            ) as new_customers,
            COUNT(DISTINCT o.user_id) FILTER (
                WHERE o.user_id IS NOT NULL 
                AND o.user_id IN (
                    SELECT DISTINCT user_id 
                    FROM orders 
                    WHERE tenant_id = restaurant_id 
                        AND user_id IS NOT NULL
                        AND DATE(created_at) < date_range.start_date
                )
            ) as returning_customers,
            AVG(customer_orders.order_count) as avg_order_frequency,
            AVG(customer_orders.total_spent) as customer_lifetime_value
        FROM orders o
        JOIN (
            SELECT 
                user_id,
                COUNT(*) as order_count,
                SUM(total_amount) as total_spent
            FROM orders
            WHERE tenant_id = restaurant_id
                AND user_id IS NOT NULL
                AND status IN ('delivered', 'completed')
                AND DATE(created_at) BETWEEN date_range.start_date AND date_range.end_date
            GROUP BY user_id
        ) customer_orders ON o.user_id = customer_orders.user_id
        WHERE o.tenant_id = restaurant_id
            AND o.status IN ('delivered', 'completed')
            AND DATE(o.created_at) BETWEEN date_range.start_date AND date_range.end_date
    ),
    retention_stats AS (
        SELECT 
            COUNT(DISTINCT prev_customers.user_id) as prev_period_customers,
            COUNT(DISTINCT curr_customers.user_id) as retained_customers
        FROM (
            SELECT DISTINCT user_id
            FROM orders
            WHERE tenant_id = restaurant_id
                AND user_id IS NOT NULL
                AND status IN ('delivered', 'completed')
                AND DATE(created_at) BETWEEN prev_date_range.start_date AND prev_date_range.end_date
        ) prev_customers
        LEFT JOIN (
            SELECT DISTINCT user_id
            FROM orders
            WHERE tenant_id = restaurant_id
                AND user_id IS NOT NULL
                AND status IN ('delivered', 'completed')
                AND DATE(created_at) BETWEEN date_range.start_date AND date_range.end_date
        ) curr_customers ON prev_customers.user_id = curr_customers.user_id
    )
    SELECT 
        cs.total_customers,
        cs.new_customers,
        cs.returning_customers,
        cs.avg_order_frequency,
        cs.customer_lifetime_value,
        CASE 
            WHEN rs.prev_period_customers > 0 
            THEN (rs.retained_customers::NUMERIC / rs.prev_period_customers::NUMERIC) * 100
            ELSE 0 
        END as retention_rate,
        CASE 
            WHEN rs.prev_period_customers > 0 
            THEN ((rs.prev_period_customers - rs.retained_customers)::NUMERIC / rs.prev_period_customers::NUMERIC) * 100
            ELSE 0 
        END as churn_rate
    FROM customer_stats cs, retention_stats rs;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PREDICTIVE ANALYTICS FUNCTIONS
-- =============================================

-- Simple demand forecasting based on historical data
CREATE OR REPLACE FUNCTION forecast_demand(
    restaurant_id UUID,
    forecast_days INTEGER DEFAULT 7
)
RETURNS TABLE(
    forecast_date DATE,
    predicted_orders INTEGER,
    predicted_revenue NUMERIC,
    confidence_level NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH historical_data AS (
        SELECT 
            DATE(created_at) as order_date,
            COUNT(*) as daily_orders,
            SUM(total_amount) as daily_revenue,
            EXTRACT(DOW FROM created_at) as day_of_week
        FROM orders
        WHERE tenant_id = restaurant_id
            AND status IN ('delivered', 'completed')
            AND DATE(created_at) >= CURRENT_DATE - INTERVAL '60 days'
        GROUP BY DATE(created_at), EXTRACT(DOW FROM created_at)
    ),
    dow_averages AS (
        SELECT 
            day_of_week,
            AVG(daily_orders) as avg_orders,
            AVG(daily_revenue) as avg_revenue,
            STDDEV(daily_orders) as stddev_orders,
            COUNT(*) as sample_size
        FROM historical_data
        GROUP BY day_of_week
    ),
    forecast_dates AS (
        SELECT 
            (CURRENT_DATE + generate_series(1, forecast_days))::DATE as forecast_date
    )
    SELECT 
        fd.forecast_date,
        ROUND(da.avg_orders)::INTEGER as predicted_orders,
        ROUND(da.avg_revenue, 2) as predicted_revenue,
        CASE 
            WHEN da.sample_size >= 4 THEN 0.8
            WHEN da.sample_size >= 2 THEN 0.6
            ELSE 0.4
        END as confidence_level
    FROM forecast_dates fd
    JOIN dow_averages da ON EXTRACT(DOW FROM fd.forecast_date) = da.day_of_week
    ORDER BY fd.forecast_date;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- GEOGRAPHIC ANALYTICS FUNCTIONS
-- =============================================

-- Get delivery zone performance
CREATE OR REPLACE FUNCTION get_delivery_zone_analytics(
    restaurant_id UUID,
    time_period TEXT DEFAULT 'month'
)
RETURNS TABLE(
    zone_name TEXT,
    total_orders BIGINT,
    total_revenue NUMERIC,
    avg_delivery_time NUMERIC,
    customer_satisfaction NUMERIC
) AS $$
DECLARE
    date_range RECORD;
BEGIN
    SELECT * INTO date_range FROM get_date_range(time_period);
    
    RETURN QUERY
    WITH delivery_stats AS (
        SELECT 
            -- Extract city from delivery address JSON
            COALESCE(o.delivery_address->>'city', 'Unknown') as zone_name,
            COUNT(*) as total_orders,
            SUM(o.total_amount) as total_revenue,
            AVG(
                EXTRACT(EPOCH FROM (o.delivered_at - o.confirmed_at)) / 60
            ) as avg_delivery_minutes
        FROM orders o
        WHERE o.tenant_id = restaurant_id
            AND o.fulfillment_type = 'delivery'
            AND o.status = 'delivered'
            AND DATE(o.created_at) BETWEEN date_range.start_date AND date_range.end_date
        GROUP BY COALESCE(o.delivery_address->>'city', 'Unknown')
    )
    SELECT 
        ds.zone_name,
        ds.total_orders,
        ds.total_revenue,
        ds.avg_delivery_minutes,
        4.3 as customer_satisfaction -- Placeholder - would come from reviews
    FROM delivery_stats ds
    WHERE ds.total_orders > 0
    ORDER BY ds.total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- =============================================

-- Indexes for better analytics query performance
CREATE INDEX IF NOT EXISTS idx_orders_analytics_composite 
ON orders (tenant_id, status, payment_status, created_at);

CREATE INDEX IF NOT EXISTS idx_orders_analytics_date 
ON orders (DATE(created_at), tenant_id) WHERE status IN ('delivered', 'completed');

CREATE INDEX IF NOT EXISTS idx_orders_analytics_hour 
ON orders (tenant_id, EXTRACT(HOUR FROM created_at), DATE(created_at));

CREATE INDEX IF NOT EXISTS idx_order_items_analytics 
ON order_items (menu_item_id, created_at);

CREATE INDEX IF NOT EXISTS idx_menu_items_tenant 
ON menu_items (tenant_id, status) WHERE status = 'active';

-- Partial index for recent analytics data (last 90 days)
CREATE INDEX IF NOT EXISTS idx_orders_recent_analytics 
ON orders (tenant_id, created_at, status, total_amount) 
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days';

-- =============================================
-- ANALYTICS AGGREGATION TRIGGERS
-- =============================================

-- Update analytics_daily table when orders are completed
CREATE OR REPLACE FUNCTION update_daily_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process completed/delivered orders
    IF NEW.status IN ('delivered', 'completed') AND 
       OLD.status NOT IN ('delivered', 'completed') THEN
        
        INSERT INTO analytics_daily (
            tenant_id, 
            date,
            total_orders,
            completed_orders,
            gross_revenue,
            net_revenue,
            tax_collected
        )
        VALUES (
            NEW.tenant_id,
            DATE(NEW.created_at),
            1,
            1,
            NEW.total_amount,
            NEW.total_amount - COALESCE(NEW.discount_amount, 0),
            COALESCE(NEW.tax_amount, 0)
        )
        ON CONFLICT (tenant_id, date)
        DO UPDATE SET
            total_orders = analytics_daily.total_orders + 1,
            completed_orders = analytics_daily.completed_orders + 1,
            gross_revenue = analytics_daily.gross_revenue + NEW.total_amount,
            net_revenue = analytics_daily.net_revenue + (NEW.total_amount - COALESCE(NEW.discount_amount, 0)),
            tax_collected = analytics_daily.tax_collected + COALESCE(NEW.tax_amount, 0),
            updated_at = NOW();
            
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for daily analytics updates
DROP TRIGGER IF EXISTS trigger_update_daily_analytics ON orders;
CREATE TRIGGER trigger_update_daily_analytics
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_analytics();

-- Comments for documentation
COMMENT ON FUNCTION get_revenue_analytics IS 'Get detailed revenue analytics for a restaurant over specified time period';
COMMENT ON FUNCTION get_peak_hours_analysis IS 'Analyze peak ordering hours and revenue patterns';
COMMENT ON FUNCTION get_menu_performance IS 'Get performance metrics for menu items including profit margins and trends';
COMMENT ON FUNCTION get_customer_analytics IS 'Comprehensive customer behavior and retention analytics';
COMMENT ON FUNCTION forecast_demand IS 'Simple demand forecasting based on historical order patterns';
COMMENT ON FUNCTION get_delivery_zone_analytics IS 'Geographic performance analytics for delivery zones';