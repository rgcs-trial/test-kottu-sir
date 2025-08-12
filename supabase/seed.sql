-- =============================================
-- Restaurant SaaS Platform - Development Seed Data
-- File: seed.sql
-- =============================================

-- Insert sample tenants (restaurants)
INSERT INTO tenants (
    id,
    name,
    slug,
    description,
    email,
    phone,
    address_line_1,
    city,
    state,
    postal_code,
    latitude,
    longitude,
    cuisine_types,
    delivery_radius_km,
    minimum_order_amount,
    delivery_fee,
    status,
    subscription_plan,
    features,
    settings
) VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    'Spice Garden',
    'spice-garden',
    'Authentic Sri Lankan cuisine with traditional flavors and modern presentation',
    'info@spicegarden.lk',
    '+94771234567',
    '123 Galle Road',
    'Colombo',
    'Western Province',
    '00300',
    6.9271,
    79.8612,
    ARRAY['sri_lankan', 'asian', 'vegetarian'],
    8.0,
    500.00,
    150.00,
    'active',
    'premium',
    '{"online_ordering": true, "table_booking": true, "loyalty_program": true}',
    '{"auto_accept_orders": false, "estimated_prep_time": 25, "tax_rate": 0.0}'
),
(
    '22222222-2222-2222-2222-222222222222',
    'Pizza Palace',
    'pizza-palace',
    'Wood-fired pizzas and Italian classics in the heart of the city',
    'orders@pizzapalace.lk',
    '+94777654321',
    '456 Marine Drive',
    'Colombo',
    'Western Province',
    '00400',
    6.9322,
    79.8554,
    ARRAY['italian', 'pizza', 'pasta'],
    5.0,
    800.00,
    200.00,
    'active',
    'basic',
    '{"online_ordering": true, "table_booking": false, "loyalty_program": false}',
    '{"auto_accept_orders": true, "estimated_prep_time": 20, "tax_rate": 0.0}'
),
(
    '33333333-3333-3333-3333-333333333333',
    'Burger Junction',
    'burger-junction',
    'Gourmet burgers and comfort food made fresh daily',
    'hello@burgerjunction.lk',
    '+94701112233',
    '789 Duplication Road',
    'Colombo',
    'Western Province',
    '00600',
    6.8935,
    79.8588,
    ARRAY['american', 'burgers', 'fast_food'],
    10.0,
    300.00,
    100.00,
    'active',
    'premium',
    '{"online_ordering": true, "table_booking": false, "loyalty_program": true}',
    '{"auto_accept_orders": false, "estimated_prep_time": 15, "tax_rate": 0.0}'
);

-- Insert sample user profiles (these would normally be created via auth)
-- Note: In real implementation, these would be created through Supabase Auth
INSERT INTO profiles (
    id,
    tenant_id,
    email,
    first_name,
    last_name,
    phone,
    role,
    is_active
) VALUES
-- Platform Admin
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NULL,
    'admin@restaurantsaas.com',
    'Platform',
    'Admin',
    '+94701234567',
    'platform_admin',
    true
),
-- Spice Garden Owner
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    'owner@spicegarden.lk',
    'Rajesh',
    'Perera',
    '+94771234567',
    'restaurant_owner',
    true
),
-- Spice Garden Staff
(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '11111111-1111-1111-1111-111111111111',
    'staff@spicegarden.lk',
    'Priya',
    'Fernando',
    '+94771234568',
    'restaurant_staff',
    true
),
-- Pizza Palace Owner
(
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '22222222-2222-2222-2222-222222222222',
    'mario@pizzapalace.lk',
    'Mario',
    'Silva',
    '+94777654321',
    'restaurant_owner',
    true
),
-- Customer
(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    NULL,
    'customer@example.com',
    'John',
    'Doe',
    '+94701112234',
    'customer',
    true
);

-- Insert restaurant settings
INSERT INTO restaurant_settings (
    tenant_id,
    is_open,
    accepts_orders,
    auto_accept_orders,
    estimated_prep_time_minutes,
    max_orders_per_hour,
    notification_settings
) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    true,
    true,
    false,
    25,
    20,
    '{"email": true, "sms": true, "push": true}'
),
(
    '22222222-2222-2222-2222-222222222222',
    true,
    true,
    true,
    20,
    30,
    '{"email": true, "sms": false, "push": true}'
),
(
    '33333333-3333-3333-3333-333333333333',
    true,
    true,
    false,
    15,
    40,
    '{"email": true, "sms": true, "push": true}'
);

-- Insert restaurant hours
INSERT INTO restaurant_hours (tenant_id, day_of_week, is_open, open_time, close_time) VALUES
-- Spice Garden - Full week operation
('11111111-1111-1111-1111-111111111111', 'monday', true, '11:00', '22:00'),
('11111111-1111-1111-1111-111111111111', 'tuesday', true, '11:00', '22:00'),
('11111111-1111-1111-1111-111111111111', 'wednesday', true, '11:00', '22:00'),
('11111111-1111-1111-1111-111111111111', 'thursday', true, '11:00', '22:00'),
('11111111-1111-1111-1111-111111111111', 'friday', true, '11:00', '23:00'),
('11111111-1111-1111-1111-111111111111', 'saturday', true, '11:00', '23:00'),
('11111111-1111-1111-1111-111111111111', 'sunday', true, '12:00', '22:00'),

-- Pizza Palace - Closed on Mondays
('22222222-2222-2222-2222-222222222222', 'monday', false, NULL, NULL),
('22222222-2222-2222-2222-222222222222', 'tuesday', true, '12:00', '23:00'),
('22222222-2222-2222-2222-222222222222', 'wednesday', true, '12:00', '23:00'),
('22222222-2222-2222-2222-222222222222', 'thursday', true, '12:00', '23:00'),
('22222222-2222-2222-2222-222222222222', 'friday', true, '12:00', '00:00'),
('22222222-2222-2222-2222-222222222222', 'saturday', true, '12:00', '00:00'),
('22222222-2222-2222-2222-222222222222', 'sunday', true, '12:00', '23:00'),

-- Burger Junction - 24/7 operation
('33333333-3333-3333-3333-333333333333', 'monday', true, '00:00', '23:59'),
('33333333-3333-3333-3333-333333333333', 'tuesday', true, '00:00', '23:59'),
('33333333-3333-3333-3333-333333333333', 'wednesday', true, '00:00', '23:59'),
('33333333-3333-3333-3333-333333333333', 'thursday', true, '00:00', '23:59'),
('33333333-3333-3333-3333-333333333333', 'friday', true, '00:00', '23:59'),
('33333333-3333-3333-3333-333333333333', 'saturday', true, '00:00', '23:59'),
('33333333-3333-3333-3333-333333333333', 'sunday', true, '00:00', '23:59');

-- Insert menu categories
INSERT INTO menu_categories (id, tenant_id, name, description, is_active, sort_order) VALUES
-- Spice Garden Categories
('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Appetizers', 'Start your meal with our delicious appetizers', true, 1),
('c1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Rice & Curry', 'Traditional Sri Lankan rice and curry dishes', true, 2),
('c1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Kottu', 'Famous Sri Lankan street food kottu varieties', true, 3),
('c1111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'Beverages', 'Refreshing drinks to complement your meal', true, 4),

-- Pizza Palace Categories
('c2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'Pizzas', 'Wood-fired pizzas with fresh ingredients', true, 1),
('c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Pasta', 'Authentic Italian pasta dishes', true, 2),
('c2222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'Salads', 'Fresh salads with premium ingredients', true, 3),
('c2222222-2222-2222-2222-222222222224', '22222222-2222-2222-2222-222222222222', 'Desserts', 'Sweet endings to your meal', true, 4),

-- Burger Junction Categories
('c3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 'Burgers', 'Gourmet burgers made with premium ingredients', true, 1),
('c3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', 'Sides', 'Crispy fries and delicious sides', true, 2),
('c3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Shakes', 'Thick milkshakes and smoothies', true, 3),
('c3333333-3333-3333-3333-333333333334', '33333333-3333-3333-3333-333333333333', 'Wraps', 'Fresh wraps with healthy fillings', true, 4);

-- Insert menu items for Spice Garden
INSERT INTO menu_items (
    id, tenant_id, category_id, name, description, base_price, is_available, is_featured,
    calories, ingredients, allergens, dietary_tags, sort_order
) VALUES
-- Appetizers
('i1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111',
 'Fish Cutlets', 'Crispy fried fish cutlets with spices', 350.00, true, true,
 180, ARRAY['fish', 'breadcrumbs', 'spices', 'oil'], ARRAY['gluten', 'fish'], ARRAY[], 1),

('i1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111',
 'Vegetable Spring Rolls', 'Crispy spring rolls filled with fresh vegetables', 280.00, true, false,
 120, ARRAY['cabbage', 'carrots', 'spring_roll_wrapper'], ARRAY['gluten'], ARRAY['vegetarian'], 2),

-- Rice & Curry
('i1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111112',
 'Chicken Curry with Rice', 'Tender chicken curry served with fragrant rice', 850.00, true, true,
 450, ARRAY['chicken', 'coconut_milk', 'spices', 'rice'], ARRAY[], ARRAY[], 1),

('i1111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111112',
 'Vegetable Curry with Rice', 'Mixed vegetable curry with coconut gravy', 750.00, true, false,
 380, ARRAY['mixed_vegetables', 'coconut_milk', 'spices', 'rice'], ARRAY[], ARRAY['vegetarian'], 2),

-- Kottu
('i1111111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111113',
 'Chicken Kottu', 'Traditional kottu with chicken and vegetables', 950.00, true, true,
 520, ARRAY['roti', 'chicken', 'vegetables', 'egg', 'spices'], ARRAY['gluten', 'eggs'], ARRAY[], 1),

('i1111111-1111-1111-1111-111111111116', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111113',
 'Cheese Kottu', 'Kottu with melted cheese and vegetables', 850.00, true, false,
 480, ARRAY['roti', 'cheese', 'vegetables', 'spices'], ARRAY['gluten', 'dairy'], ARRAY['vegetarian'], 2);

-- Insert menu items for Pizza Palace
INSERT INTO menu_items (
    id, tenant_id, category_id, name, description, base_price, is_available, is_featured,
    calories, ingredients, allergens, dietary_tags, sort_order
) VALUES
-- Pizzas
('i2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222221',
 'Margherita Pizza', 'Classic pizza with tomato sauce, mozzarella, and basil', 1200.00, true, true,
 380, ARRAY['pizza_dough', 'tomato_sauce', 'mozzarella', 'basil'], ARRAY['gluten', 'dairy'], ARRAY['vegetarian'], 1),

('i2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222221',
 'Pepperoni Pizza', 'Spicy pepperoni with mozzarella cheese', 1450.00, true, true,
 420, ARRAY['pizza_dough', 'tomato_sauce', 'mozzarella', 'pepperoni'], ARRAY['gluten', 'dairy'], ARRAY[], 2),

-- Pasta
('i2222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222',
 'Spaghetti Carbonara', 'Creamy pasta with bacon and parmesan', 980.00, true, false,
 540, ARRAY['spaghetti', 'cream', 'bacon', 'parmesan', 'eggs'], ARRAY['gluten', 'dairy', 'eggs'], ARRAY[], 1);

-- Insert menu items for Burger Junction
INSERT INTO menu_items (
    id, tenant_id, category_id, name, description, base_price, is_available, is_featured,
    calories, ingredients, allergens, dietary_tags, sort_order
) VALUES
-- Burgers
('i3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333331',
 'Classic Beef Burger', 'Juicy beef patty with lettuce, tomato, and special sauce', 890.00, true, true,
 650, ARRAY['beef_patty', 'burger_bun', 'lettuce', 'tomato', 'special_sauce'], ARRAY['gluten'], ARRAY[], 1),

('i3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333331',
 'Chicken Burger', 'Grilled chicken breast with avocado and mayo', 820.00, true, false,
 580, ARRAY['chicken_breast', 'burger_bun', 'avocado', 'mayonnaise'], ARRAY['gluten', 'eggs'], ARRAY[], 2),

-- Sides
('i3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333332',
 'French Fries', 'Crispy golden fries with seasoning', 320.00, true, true,
 280, ARRAY['potatoes', 'oil', 'salt'], ARRAY[], ARRAY['vegetarian'], 1);

-- Insert menu item variants
INSERT INTO menu_item_variants (menu_item_id, name, price_adjustment, is_default, sort_order) VALUES
-- Pizza sizes
('i2222222-2222-2222-2222-222222222221', 'Small (8")', 0.00, true, 1),
('i2222222-2222-2222-2222-222222222221', 'Medium (12")', 400.00, false, 2),
('i2222222-2222-2222-2222-222222222221', 'Large (16")', 800.00, false, 3),

('i2222222-2222-2222-2222-222222222222', 'Small (8")', 0.00, true, 1),
('i2222222-2222-2222-2222-222222222222', 'Medium (12")', 400.00, false, 2),
('i2222222-2222-2222-2222-222222222222', 'Large (16")', 800.00, false, 3),

-- Burger sizes
('i3333333-3333-3333-3333-333333333331', 'Regular', 0.00, true, 1),
('i3333333-3333-3333-3333-333333333331', 'Large', 150.00, false, 2),

-- Fries sizes
('i3333333-3333-3333-3333-333333333333', 'Regular', 0.00, true, 1),
('i3333333-3333-3333-3333-333333333333', 'Large', 80.00, false, 2);

-- Insert menu item modifiers
INSERT INTO menu_item_modifiers (menu_item_id, name, price_adjustment, is_required, sort_order) VALUES
-- Pizza modifiers
('i2222222-2222-2222-2222-222222222221', 'Extra Cheese', 150.00, false, 1),
('i2222222-2222-2222-2222-222222222221', 'Extra Basil', 50.00, false, 2),
('i2222222-2222-2222-2222-222222222222', 'Extra Pepperoni', 200.00, false, 1),
('i2222222-2222-2222-2222-222222222222', 'Extra Cheese', 150.00, false, 2),

-- Burger modifiers
('i3333333-3333-3333-3333-333333333331', 'Extra Patty', 250.00, false, 1),
('i3333333-3333-3333-3333-333333333331', 'Bacon', 120.00, false, 2),
('i3333333-3333-3333-3333-333333333331', 'Cheese', 80.00, false, 3),
('i3333333-3333-3333-3333-333333333332', 'Avocado', 100.00, false, 1),
('i3333333-3333-3333-3333-333333333332', 'Cheese', 80.00, false, 2);

-- Insert sample orders
INSERT INTO orders (
    id, tenant_id, user_id, order_number, status, fulfillment_type,
    subtotal, tax_amount, delivery_fee, total_amount,
    customer_name, customer_phone, customer_email, notes,
    created_at, confirmed_at
) VALUES
('o1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
 'spice-garden-20240101-001', 'delivered', 'delivery',
 1200.00, 0.00, 150.00, 1350.00,
 'John Doe', '+94701112234', 'customer@example.com', 'Please add extra spice',
 NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 45 minutes'),

('o2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
 'pizza-palace-20240101-001', 'confirmed', 'takeaway',
 1600.00, 0.00, 0.00, 1600.00,
 'John Doe', '+94701112234', 'customer@example.com', NULL,
 NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '25 minutes');

-- Insert order items
INSERT INTO order_items (
    order_id, menu_item_id, item_name, quantity, unit_price, total_price,
    modifiers, special_instructions
) VALUES
('o1111111-1111-1111-1111-111111111111', 'i1111111-1111-1111-1111-111111111115', 'Chicken Kottu', 1, 950.00, 950.00,
 '[]', 'Extra spicy please'),
('o1111111-1111-1111-1111-111111111111', 'i1111111-1111-1111-1111-111111111111', 'Fish Cutlets', 1, 350.00, 350.00,
 '[]', NULL),

('o2222222-2222-2222-2222-222222222222', 'i2222222-2222-2222-2222-222222222221', 'Margherita Pizza', 1, 1600.00, 1600.00,
 '[{"id": "modifier_id", "name": "Medium (12\")", "price": 400.00}]', NULL);

-- Insert order status history
INSERT INTO order_status_history (order_id, status, notes, changed_by) VALUES
('o1111111-1111-1111-1111-111111111111', 'pending', 'Order placed', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
('o1111111-1111-1111-1111-111111111111', 'confirmed', 'Order confirmed by restaurant', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
('o1111111-1111-1111-1111-111111111111', 'preparing', 'Order is being prepared', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
('o1111111-1111-1111-1111-111111111111', 'ready', 'Order ready for delivery', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
('o1111111-1111-1111-1111-111111111111', 'delivered', 'Order delivered successfully', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),

('o2222222-2222-2222-2222-222222222222', 'pending', 'Order placed', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
('o2222222-2222-2222-2222-222222222222', 'confirmed', 'Order confirmed by restaurant', 'dddddddd-dddd-dddd-dddd-dddddddddddd');

-- Insert payment transactions
INSERT INTO payment_transactions (
    order_id, payment_method, payment_provider, amount, currency, status,
    gateway_response
) VALUES
('o1111111-1111-1111-1111-111111111111', 'card', 'stripe', 1350.00, 'LKR', 'completed',
 '{"transaction_id": "txn_1234567890", "card_last4": "4242", "card_brand": "visa"}'),
('o2222222-2222-2222-2222-222222222222', 'cash', NULL, 1600.00, 'LKR', 'pending', NULL);

-- Insert sample analytics data
INSERT INTO analytics_daily (
    tenant_id, date, total_orders, completed_orders, cancelled_orders,
    gross_revenue, net_revenue, tax_collected, total_items_sold,
    average_order_value, unique_customers, dine_in_orders, takeaway_orders, delivery_orders
) VALUES
('11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '1 day', 
 5, 4, 1, 4500.00, 4500.00, 0.00, 8, 900.00, 3, 1, 2, 2),
('22222222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '1 day',
 8, 7, 1, 12800.00, 12800.00, 0.00, 12, 1600.00, 5, 2, 4, 2),
('33333333-3333-3333-3333-333333333333', CURRENT_DATE - INTERVAL '1 day',
 15, 13, 2, 11200.00, 11200.00, 0.00, 28, 747.00, 8, 0, 8, 7);

-- Insert hourly analytics for peak hours
INSERT INTO analytics_hourly (
    tenant_id, date, hour, total_orders, completed_orders, gross_revenue, average_prep_time_minutes
) VALUES
-- Lunch peak (12 PM - 2 PM)
('11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '1 day', 12, 2, 2, 1800.00, 22.5),
('11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '1 day', 13, 1, 1, 950.00, 18.0),
('22222222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '1 day', 12, 3, 3, 4800.00, 15.5),
('22222222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '1 day', 13, 2, 2, 3200.00, 18.0),

-- Dinner peak (7 PM - 9 PM)
('11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '1 day', 19, 1, 1, 1350.00, 25.0),
('11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '1 day', 20, 1, 0, 0.00, 0.0),
('22222222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '1 day', 19, 2, 2, 3200.00, 20.0),
('22222222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '1 day', 20, 1, 1, 1600.00, 22.0);

-- Update statistics for better query performance
ANALYZE tenants;
ANALYZE profiles;
ANALYZE menu_categories;
ANALYZE menu_items;
ANALYZE menu_item_variants;
ANALYZE menu_item_modifiers;
ANALYZE orders;
ANALYZE order_items;
ANALYZE order_status_history;
ANALYZE payment_transactions;
ANALYZE restaurant_settings;
ANALYZE restaurant_hours;
ANALYZE analytics_daily;
ANALYZE analytics_hourly;

-- Create some sample carts for testing
INSERT INTO carts (
    id, tenant_id, user_id, session_id, fulfillment_type, expires_at
) VALUES
('cart1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 
 NULL, 'delivery', NOW() + INTERVAL '2 hours'),
('cart2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', NULL, 
 'guest_session_123', 'takeaway', NOW() + INTERVAL '1 hour');

-- Add items to sample carts
INSERT INTO cart_items (
    cart_id, menu_item_id, quantity, unit_price, modifiers, special_instructions
) VALUES
('cart1111-1111-1111-1111-111111111111', 'i1111111-1111-1111-1111-111111111113', 1, 850.00, '[]', 'Medium spice level'),
('cart1111-1111-1111-1111-111111111111', 'i1111111-1111-1111-1111-111111111111', 2, 350.00, '[]', NULL),

('cart2222-2222-2222-2222-222222222222', 'i2222222-2222-2222-2222-222222222221', 1, 1600.00, 
 '[{"id": "modifier_medium", "name": "Medium (12\")", "price": 400.00}, {"id": "modifier_cheese", "name": "Extra Cheese", "price": 150.00}]', 
 'Well done please');

-- Sample audit log entries
INSERT INTO audit_logs (
    table_name, operation, user_id, tenant_id, record_id, 
    old_values, new_values
) VALUES
('orders', 'UPDATE', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 
 'o1111111-1111-1111-1111-111111111111',
 '{"status": "pending"}', '{"status": "confirmed"}'),
('menu_items', 'UPDATE', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111',
 'i1111111-1111-1111-1111-111111111115',
 '{"base_price": 900.00}', '{"base_price": 950.00}');

-- Display summary of seeded data
SELECT 'Seeding completed successfully!' as message;
SELECT 
    (SELECT COUNT(*) FROM tenants) as restaurants,
    (SELECT COUNT(*) FROM profiles) as users,
    (SELECT COUNT(*) FROM menu_items) as menu_items,
    (SELECT COUNT(*) FROM orders) as orders,
    (SELECT COUNT(*) FROM analytics_daily) as daily_analytics_records;