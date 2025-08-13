-- Advanced Analytics Functions and Views

-- Revenue analytics view
CREATE OR REPLACE VIEW analytics_revenue AS
SELECT 
  DATE(o.created_at) as date,
  r.id as restaurant_id,
  r.name as restaurant_name,
  COUNT(DISTINCT o.id) as order_count,
  SUM(o.total_amount) as gross_revenue,
  SUM(o.total_amount * 0.03) as platform_fee,
  SUM(o.total_amount * 0.97) as restaurant_revenue,
  AVG(o.total_amount) as avg_order_value,
  COUNT(DISTINCT o.customer_email) as unique_customers
FROM orders o
JOIN restaurants r ON o.restaurant_id = r.id
WHERE o.status = 'delivered'
GROUP BY DATE(o.created_at), r.id, r.name;

-- Customer analytics view
CREATE OR REPLACE VIEW analytics_customers AS
SELECT 
  r.id as restaurant_id,
  o.customer_email,
  o.customer_name,
  COUNT(o.id) as order_count,
  SUM(o.total_amount) as total_spent,
  AVG(o.total_amount) as avg_order_value,
  MIN(o.created_at) as first_order,
  MAX(o.created_at) as last_order,
  MAX(o.created_at) - MIN(o.created_at) as customer_lifetime,
  COUNT(DISTINCT DATE(o.created_at)) as days_ordered
FROM orders o
JOIN restaurants r ON o.restaurant_id = r.id
WHERE o.status = 'delivered'
GROUP BY r.id, o.customer_email, o.customer_name;

-- Menu performance view
CREATE OR REPLACE VIEW analytics_menu_performance AS
SELECT 
  r.id as restaurant_id,
  mi.id as menu_item_id,
  mi.name as item_name,
  mc.name as category_name,
  COUNT(oi.id) as times_ordered,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.subtotal) as total_revenue,
  AVG(oi.price) as avg_price,
  SUM(oi.subtotal) / NULLIF(SUM(oi.quantity), 0) as revenue_per_unit
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN menu_items mi ON oi.menu_item_id = mi.id
JOIN menu_categories mc ON mi.category_id = mc.id
JOIN restaurants r ON o.restaurant_id = r.id
WHERE o.status = 'delivered'
GROUP BY r.id, mi.id, mi.name, mc.name;

-- Hourly order patterns
CREATE OR REPLACE VIEW analytics_hourly_patterns AS
SELECT 
  r.id as restaurant_id,
  EXTRACT(HOUR FROM o.created_at) as hour,
  EXTRACT(DOW FROM o.created_at) as day_of_week,
  COUNT(o.id) as order_count,
  AVG(o.total_amount) as avg_order_value,
  SUM(o.total_amount) as total_revenue
FROM orders o
JOIN restaurants r ON o.restaurant_id = r.id
WHERE o.status = 'delivered'
GROUP BY r.id, EXTRACT(HOUR FROM o.created_at), EXTRACT(DOW FROM o.created_at);

-- Payment method distribution
CREATE OR REPLACE VIEW analytics_payment_methods AS
SELECT 
  r.id as restaurant_id,
  o.payment_method,
  COUNT(o.id) as transaction_count,
  SUM(o.total_amount) as total_amount,
  AVG(o.total_amount) as avg_transaction
FROM orders o
JOIN restaurants r ON o.restaurant_id = r.id
WHERE o.status = 'delivered'
GROUP BY r.id, o.payment_method;

-- Customer retention cohorts
CREATE OR REPLACE FUNCTION get_retention_cohorts(restaurant_uuid UUID)
RETURNS TABLE(
  cohort_month DATE,
  months_since_first_order INT,
  customers_retained INT,
  retention_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH first_orders AS (
    SELECT 
      customer_email,
      DATE_TRUNC('month', MIN(created_at))::DATE as cohort_month,
      MIN(created_at) as first_order_date
    FROM orders
    WHERE restaurant_id = restaurant_uuid AND status = 'delivered'
    GROUP BY customer_email
  ),
  cohort_sizes AS (
    SELECT cohort_month, COUNT(DISTINCT customer_email) as cohort_size
    FROM first_orders
    GROUP BY cohort_month
  ),
  retention_data AS (
    SELECT 
      fo.cohort_month,
      EXTRACT(MONTH FROM AGE(DATE_TRUNC('month', o.created_at), fo.cohort_month))::INT as months_since,
      COUNT(DISTINCT o.customer_email) as retained_customers
    FROM orders o
    JOIN first_orders fo ON o.customer_email = fo.customer_email
    WHERE o.restaurant_id = restaurant_uuid AND o.status = 'delivered'
    GROUP BY fo.cohort_month, DATE_TRUNC('month', o.created_at)
  )
  SELECT 
    rd.cohort_month,
    rd.months_since as months_since_first_order,
    rd.retained_customers as customers_retained,
    ROUND((rd.retained_customers::DECIMAL / cs.cohort_size) * 100, 2) as retention_rate
  FROM retention_data rd
  JOIN cohort_sizes cs ON rd.cohort_month = cs.cohort_month
  ORDER BY rd.cohort_month, rd.months_since;
END;
$$ LANGUAGE plpgsql;

-- Predictive demand forecasting function
CREATE OR REPLACE FUNCTION predict_demand(
  restaurant_uuid UUID,
  target_date DATE,
  lookback_days INT DEFAULT 30
)
RETURNS TABLE(
  hour INT,
  predicted_orders DECIMAL,
  confidence_interval_low DECIMAL,
  confidence_interval_high DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH historical_data AS (
    SELECT 
      EXTRACT(HOUR FROM created_at)::INT as hour,
      EXTRACT(DOW FROM created_at)::INT as day_of_week,
      COUNT(*) as order_count
    FROM orders
    WHERE 
      restaurant_id = restaurant_uuid 
      AND status = 'delivered'
      AND created_at >= target_date - INTERVAL '1 day' * lookback_days
      AND created_at < target_date
    GROUP BY EXTRACT(HOUR FROM created_at), EXTRACT(DOW FROM created_at)
  ),
  hourly_stats AS (
    SELECT 
      hour,
      AVG(order_count) as avg_orders,
      STDDEV(order_count) as stddev_orders
    FROM historical_data
    WHERE day_of_week = EXTRACT(DOW FROM target_date)
    GROUP BY hour
  )
  SELECT 
    hs.hour,
    ROUND(hs.avg_orders, 2) as predicted_orders,
    ROUND(GREATEST(0, hs.avg_orders - (1.96 * hs.stddev_orders)), 2) as confidence_interval_low,
    ROUND(hs.avg_orders + (1.96 * hs.stddev_orders), 2) as confidence_interval_high
  FROM hourly_stats hs
  ORDER BY hs.hour;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON analytics_revenue TO authenticated;
GRANT SELECT ON analytics_customers TO authenticated;
GRANT SELECT ON analytics_menu_performance TO authenticated;
GRANT SELECT ON analytics_hourly_patterns TO authenticated;
GRANT SELECT ON analytics_payment_methods TO authenticated;
GRANT EXECUTE ON FUNCTION get_retention_cohorts TO authenticated;
GRANT EXECUTE ON FUNCTION predict_demand TO authenticated;