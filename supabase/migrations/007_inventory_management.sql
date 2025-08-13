-- =============================================
-- Restaurant SaaS Platform - Inventory Management System
-- Migration: 007_inventory_management.sql
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- INVENTORY ENUMS AND TYPES
-- =============================================

-- Unit of measurement for inventory items
CREATE TYPE unit_of_measure AS ENUM (
    'piece',
    'kg',
    'gram',
    'liter',
    'ml',
    'dozen',
    'pack',
    'box',
    'bottle',
    'can',
    'cup',
    'tablespoon',
    'teaspoon',
    'ounce',
    'pound'
);

-- Transaction types for inventory movements
CREATE TYPE inventory_transaction_type AS ENUM (
    'restock',        -- Adding stock
    'sale',           -- Deduction from order
    'adjustment',     -- Manual adjustment (positive/negative)
    'waste',          -- Stock loss due to spoilage/damage
    'return',         -- Returned items
    'transfer_in',    -- Stock transferred from another location
    'transfer_out',   -- Stock transferred to another location
    'theft',          -- Stock loss due to theft
    'damage'          -- Stock loss due to damage
);

-- Purchase order status
CREATE TYPE purchase_order_status AS ENUM (
    'draft',
    'pending',
    'approved',
    'sent',
    'received',
    'partially_received',
    'cancelled',
    'disputed'
);

-- Supplier status
CREATE TYPE supplier_status AS ENUM (
    'active',
    'inactive',
    'suspended',
    'pending_approval'
);

-- Stock alert levels
CREATE TYPE stock_alert_level AS ENUM (
    'out_of_stock',
    'critically_low',
    'low_stock',
    'normal',
    'overstocked'
);

-- =============================================
-- SUPPLIERS TABLE
-- =============================================

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Basic supplier information
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    business_registration VARCHAR(100),
    
    -- Contact details
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    fax VARCHAR(50),
    
    -- Address information
    address_line_1 VARCHAR(255),
    address_line_2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Sri Lanka',
    
    -- Business terms
    payment_terms TEXT, -- e.g., "Net 30", "COD", etc.
    credit_limit DECIMAL(12, 2) DEFAULT 0,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    tax_id VARCHAR(100),
    
    -- Delivery information
    delivery_days TEXT[], -- Days they deliver (monday, tuesday, etc.)
    min_order_amount DECIMAL(10, 2) DEFAULT 0,
    delivery_fee DECIMAL(8, 2) DEFAULT 0,
    lead_time_days INTEGER DEFAULT 7, -- How many days to deliver
    
    -- Banking details
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(100),
    bank_routing_number VARCHAR(50),
    
    -- Status and ratings
    status supplier_status DEFAULT 'pending_approval',
    rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    
    -- Additional information
    notes TEXT,
    website VARCHAR(500),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    
    UNIQUE(tenant_id, name)
);

-- =============================================
-- INVENTORY ITEMS TABLE
-- =============================================

CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL, -- Optional link to menu item
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL, -- Primary supplier
    
    -- Item identification
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100), -- Stock Keeping Unit
    barcode VARCHAR(100),
    internal_code VARCHAR(100),
    
    -- Current stock levels
    current_stock DECIMAL(10, 3) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    reserved_stock DECIMAL(10, 3) DEFAULT 0 CHECK (reserved_stock >= 0), -- Stock allocated for pending orders
    available_stock DECIMAL(10, 3) GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
    
    -- Stock thresholds
    min_stock_level DECIMAL(10, 3) NOT NULL DEFAULT 0 CHECK (min_stock_level >= 0),
    max_stock_level DECIMAL(10, 3) CHECK (max_stock_level IS NULL OR max_stock_level >= min_stock_level),
    reorder_point DECIMAL(10, 3) NOT NULL DEFAULT 0 CHECK (reorder_point >= 0),
    reorder_quantity DECIMAL(10, 3) NOT NULL DEFAULT 1 CHECK (reorder_quantity > 0),
    
    -- Measurement and costing
    unit_of_measure unit_of_measure NOT NULL DEFAULT 'piece',
    cost_per_unit DECIMAL(10, 4) DEFAULT 0,
    selling_price_per_unit DECIMAL(10, 4) DEFAULT 0,
    
    -- Product details
    category VARCHAR(100), -- Category like "Vegetables", "Meat", "Dairy"
    brand VARCHAR(100),
    
    -- Perishable item tracking
    is_perishable BOOLEAN DEFAULT false,
    shelf_life_days INTEGER, -- How many days before expiry
    storage_requirements TEXT, -- Temperature, humidity requirements
    
    -- Stock alerts
    low_stock_alert_enabled BOOLEAN DEFAULT true,
    out_of_stock_alert_enabled BOOLEAN DEFAULT true,
    expiry_alert_enabled BOOLEAN DEFAULT false,
    expiry_alert_days INTEGER DEFAULT 3, -- Alert X days before expiry
    
    -- Auto-ordering
    auto_reorder_enabled BOOLEAN DEFAULT false,
    auto_reorder_supplier_id UUID REFERENCES suppliers(id),
    
    -- Inventory status
    is_active BOOLEAN DEFAULT true,
    is_tracked BOOLEAN DEFAULT true, -- Whether to track inventory for this item
    
    -- Menu integration
    affects_menu_availability BOOLEAN DEFAULT true, -- If out of stock, disable menu item
    recipe_yield DECIMAL(10, 3), -- How many portions this inventory item yields
    
    -- Location tracking (for multi-location restaurants)
    storage_location VARCHAR(255), -- "Main Kitchen", "Prep Area", "Dry Storage"
    
    -- Last activity tracking
    last_restocked_at TIMESTAMP WITH TIME ZONE,
    last_counted_at TIMESTAMP WITH TIME ZONE,
    last_ordered_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    
    UNIQUE(tenant_id, sku) DEFERRABLE INITIALLY DEFERRED,
    UNIQUE(tenant_id, internal_code) DEFERRABLE INITIALLY DEFERRED
);

-- =============================================
-- INVENTORY TRANSACTIONS TABLE
-- =============================================

CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_type inventory_transaction_type NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL, -- Can be negative for deductions
    unit_cost DECIMAL(10, 4) DEFAULT 0,
    total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (ABS(quantity) * unit_cost) STORED,
    
    -- Stock levels before and after transaction
    stock_before DECIMAL(10, 3) NOT NULL,
    stock_after DECIMAL(10, 3) NOT NULL,
    
    -- Reference information
    reference_type VARCHAR(50), -- 'order', 'purchase_order', 'manual', etc.
    reference_id UUID, -- ID of the related record (order_id, purchase_order_id, etc.)
    reference_number VARCHAR(100), -- Human-readable reference (order number, PO number, etc.)
    
    -- Additional details
    notes TEXT,
    batch_number VARCHAR(100), -- For batch tracking
    expiry_date DATE, -- For perishable items
    lot_number VARCHAR(100),
    
    -- Location tracking
    from_location VARCHAR(255),
    to_location VARCHAR(255),
    
    -- Approval workflow
    requires_approval BOOLEAN DEFAULT false,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES profiles(id),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES profiles(id)
);

-- =============================================
-- PURCHASE ORDERS TABLE
-- =============================================

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    
    -- Order identification
    po_number VARCHAR(100) NOT NULL, -- Purchase Order Number
    internal_reference VARCHAR(100),
    supplier_reference VARCHAR(100), -- Supplier's reference number
    
    -- Order details
    status purchase_order_status DEFAULT 'draft',
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    
    -- Amounts
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    shipping_cost DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    
    -- Payment information
    payment_terms VARCHAR(255),
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_due_date DATE,
    
    -- Delivery information
    delivery_address JSONB,
    delivery_instructions TEXT,
    delivery_contact_person VARCHAR(255),
    delivery_contact_phone VARCHAR(50),
    
    -- Order notes
    notes TEXT,
    terms_and_conditions TEXT,
    
    -- Approval workflow
    requires_approval BOOLEAN DEFAULT true,
    approval_status VARCHAR(50) DEFAULT 'pending',
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES profiles(id),
    approval_notes TEXT,
    
    -- Receiving status
    is_fully_received BOOLEAN DEFAULT false,
    partially_received_at TIMESTAMP WITH TIME ZONE,
    fully_received_at TIMESTAMP WITH TIME ZONE,
    received_by UUID REFERENCES profiles(id),
    
    -- Cancellation details
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES profiles(id),
    cancellation_reason TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES profiles(id),
    
    UNIQUE(tenant_id, po_number)
);

-- =============================================
-- PURCHASE ORDER ITEMS TABLE
-- =============================================

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    
    -- Item details
    item_name VARCHAR(255) NOT NULL, -- Snapshot of item name at time of order
    item_sku VARCHAR(100),
    
    -- Quantities
    ordered_quantity DECIMAL(10, 3) NOT NULL CHECK (ordered_quantity > 0),
    received_quantity DECIMAL(10, 3) DEFAULT 0 CHECK (received_quantity >= 0),
    remaining_quantity DECIMAL(10, 3) GENERATED ALWAYS AS (ordered_quantity - received_quantity) STORED,
    
    -- Pricing
    unit_cost DECIMAL(10, 4) NOT NULL CHECK (unit_cost >= 0),
    line_total DECIMAL(12, 2) GENERATED ALWAYS AS (ordered_quantity * unit_cost) STORED,
    
    -- Product specifications
    specifications TEXT,
    notes TEXT,
    
    -- Receiving details
    received_at TIMESTAMP WITH TIME ZONE,
    received_by UUID REFERENCES profiles(id),
    received_notes TEXT,
    
    -- Quality control
    quality_check_passed BOOLEAN,
    quality_check_notes TEXT,
    quality_checked_by UUID REFERENCES profiles(id),
    quality_checked_at TIMESTAMP WITH TIME ZONE,
    
    -- Batch/lot tracking
    batch_numbers TEXT[], -- Array of batch numbers received
    expiry_dates DATE[], -- Array of expiry dates for batches
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INVENTORY ALERTS TABLE
-- =============================================

CREATE TABLE inventory_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    
    -- Alert details
    alert_type stock_alert_level NOT NULL,
    alert_message TEXT NOT NULL,
    current_stock DECIMAL(10, 3) NOT NULL,
    threshold_value DECIMAL(10, 3),
    
    -- Alert status
    is_active BOOLEAN DEFAULT true,
    is_read BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES profiles(id),
    resolution_notes TEXT,
    
    -- Notification tracking
    notification_sent BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    email_sent BOOLEAN DEFAULT false,
    sms_sent BOOLEAN DEFAULT false,
    
    -- Priority and escalation
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    escalated BOOLEAN DEFAULT false,
    escalated_at TIMESTAMP WITH TIME ZONE,
    escalated_to UUID REFERENCES profiles(id),
    
    -- Additional context
    suggested_action TEXT,
    estimated_stockout_date DATE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INVENTORY COUNTS TABLE (For Stocktaking)
-- =============================================

CREATE TABLE inventory_counts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Count session details
    count_name VARCHAR(255) NOT NULL,
    count_type VARCHAR(50) DEFAULT 'full', -- full, partial, cycle
    count_date DATE NOT NULL DEFAULT CURRENT_DATE,
    count_time TIME DEFAULT CURRENT_TIME,
    
    -- Status
    status VARCHAR(50) DEFAULT 'in_progress', -- in_progress, completed, cancelled
    
    -- Locations and scope
    locations TEXT[], -- Areas being counted
    categories TEXT[], -- Categories being counted
    
    -- Results summary
    total_items_counted INTEGER DEFAULT 0,
    total_discrepancies INTEGER DEFAULT 0,
    total_adjustment_value DECIMAL(12, 2) DEFAULT 0,
    
    -- Audit fields
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    started_by UUID NOT NULL REFERENCES profiles(id),
    completed_by UUID REFERENCES profiles(id),
    
    notes TEXT
);

-- =============================================
-- INVENTORY COUNT ITEMS TABLE
-- =============================================

CREATE TABLE inventory_count_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_count_id UUID NOT NULL REFERENCES inventory_counts(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    
    -- Count details
    system_quantity DECIMAL(10, 3) NOT NULL, -- What system shows
    counted_quantity DECIMAL(10, 3), -- What was physically counted
    variance_quantity DECIMAL(10, 3) GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
    variance_value DECIMAL(12, 2) GENERATED ALWAYS AS (
        CASE 
            WHEN counted_quantity IS NOT NULL 
            THEN (counted_quantity - system_quantity) * 
                 (SELECT cost_per_unit FROM inventory_items WHERE id = inventory_item_id)
            ELSE 0 
        END
    ) STORED,
    
    -- Count status
    is_counted BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    requires_recount BOOLEAN DEFAULT false,
    
    -- Count details
    location VARCHAR(255),
    notes TEXT,
    
    -- Audit fields
    counted_at TIMESTAMP WITH TIME ZONE,
    counted_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES profiles(id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Inventory items indexes
CREATE INDEX idx_inventory_items_tenant_id ON inventory_items(tenant_id);
CREATE INDEX idx_inventory_items_menu_item ON inventory_items(menu_item_id);
CREATE INDEX idx_inventory_items_sku ON inventory_items(tenant_id, sku);
CREATE INDEX idx_inventory_items_low_stock ON inventory_items(tenant_id) WHERE current_stock <= reorder_point;
CREATE INDEX idx_inventory_items_active ON inventory_items(tenant_id, is_active);
CREATE INDEX idx_inventory_items_category ON inventory_items(tenant_id, category);

-- Inventory transactions indexes
CREATE INDEX idx_inventory_transactions_tenant_id ON inventory_transactions(tenant_id);
CREATE INDEX idx_inventory_transactions_item ON inventory_transactions(inventory_item_id);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_transactions_date ON inventory_transactions(created_at);
CREATE INDEX idx_inventory_transactions_reference ON inventory_transactions(reference_type, reference_id);

-- Purchase orders indexes
CREATE INDEX idx_purchase_orders_tenant_id ON purchase_orders(tenant_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_date ON purchase_orders(order_date);
CREATE INDEX idx_purchase_orders_po_number ON purchase_orders(tenant_id, po_number);

-- Suppliers indexes
CREATE INDEX idx_suppliers_tenant_id ON suppliers(tenant_id);
CREATE INDEX idx_suppliers_status ON suppliers(status);
CREATE INDEX idx_suppliers_name ON suppliers(tenant_id, name);

-- Alerts indexes
CREATE INDEX idx_inventory_alerts_tenant_id ON inventory_alerts(tenant_id);
CREATE INDEX idx_inventory_alerts_active ON inventory_alerts(is_active) WHERE is_active = true;
CREATE INDEX idx_inventory_alerts_unread ON inventory_alerts(tenant_id, is_read) WHERE is_read = false;
CREATE INDEX idx_inventory_alerts_type ON inventory_alerts(alert_type);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to calculate stock alert level
CREATE OR REPLACE FUNCTION calculate_stock_alert_level(
    current_stock DECIMAL,
    min_stock_level DECIMAL,
    reorder_point DECIMAL,
    max_stock_level DECIMAL
) RETURNS stock_alert_level AS $$
BEGIN
    IF current_stock <= 0 THEN
        RETURN 'out_of_stock';
    ELSIF current_stock <= (min_stock_level * 0.5) THEN
        RETURN 'critically_low';
    ELSIF current_stock <= reorder_point THEN
        RETURN 'low_stock';
    ELSIF max_stock_level IS NOT NULL AND current_stock >= (max_stock_level * 1.2) THEN
        RETURN 'overstocked';
    ELSE
        RETURN 'normal';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update inventory stock levels
CREATE OR REPLACE FUNCTION update_inventory_stock(
    p_inventory_item_id UUID,
    p_quantity DECIMAL,
    p_transaction_type inventory_transaction_type,
    p_reference_type VARCHAR DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_reference_number VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    current_stock_val DECIMAL;
    new_stock_val DECIMAL;
    tenant_id_val UUID;
    transaction_id UUID;
BEGIN
    -- Get current stock and tenant_id
    SELECT current_stock, tenant_id 
    INTO current_stock_val, tenant_id_val
    FROM inventory_items 
    WHERE id = p_inventory_item_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory item not found: %', p_inventory_item_id;
    END IF;
    
    -- Calculate new stock level
    new_stock_val := current_stock_val + p_quantity;
    
    -- Prevent negative stock (except for adjustments)
    IF new_stock_val < 0 AND p_transaction_type != 'adjustment' THEN
        RAISE EXCEPTION 'Insufficient stock. Current: %, Requested: %', current_stock_val, ABS(p_quantity);
    END IF;
    
    -- Update inventory item stock
    UPDATE inventory_items 
    SET current_stock = new_stock_val,
        updated_at = NOW()
    WHERE id = p_inventory_item_id;
    
    -- Create transaction record
    INSERT INTO inventory_transactions (
        tenant_id,
        inventory_item_id,
        transaction_type,
        quantity,
        stock_before,
        stock_after,
        reference_type,
        reference_id,
        reference_number,
        notes,
        created_by
    ) VALUES (
        tenant_id_val,
        p_inventory_item_id,
        p_transaction_type,
        p_quantity,
        current_stock_val,
        new_stock_val,
        p_reference_type,
        p_reference_id,
        p_reference_number,
        p_notes,
        p_created_by
    ) RETURNING id INTO transaction_id;
    
    -- Check for alerts
    PERFORM check_inventory_alerts(p_inventory_item_id);
    
    RETURN transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check and create inventory alerts
CREATE OR REPLACE FUNCTION check_inventory_alerts(p_inventory_item_id UUID)
RETURNS VOID AS $$
DECLARE
    item_record RECORD;
    alert_level stock_alert_level;
    alert_message TEXT;
BEGIN
    -- Get inventory item details
    SELECT * INTO item_record
    FROM inventory_items 
    WHERE id = p_inventory_item_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Calculate alert level
    alert_level := calculate_stock_alert_level(
        item_record.current_stock,
        item_record.min_stock_level,
        item_record.reorder_point,
        item_record.max_stock_level
    );
    
    -- Only create alert if it's not normal and alerts are enabled
    IF alert_level != 'normal' THEN
        -- Create appropriate alert message
        CASE alert_level
            WHEN 'out_of_stock' THEN
                IF item_record.out_of_stock_alert_enabled THEN
                    alert_message := format('%s is out of stock', item_record.name);
                END IF;
            WHEN 'critically_low' THEN
                IF item_record.low_stock_alert_enabled THEN
                    alert_message := format('%s is critically low (%.2f %s remaining)', 
                        item_record.name, item_record.current_stock, item_record.unit_of_measure::text);
                END IF;
            WHEN 'low_stock' THEN
                IF item_record.low_stock_alert_enabled THEN
                    alert_message := format('%s is below reorder point (%.2f %s remaining)', 
                        item_record.name, item_record.current_stock, item_record.unit_of_measure::text);
                END IF;
            WHEN 'overstocked' THEN
                alert_message := format('%s is overstocked (%.2f %s available)', 
                    item_record.name, item_record.current_stock, item_record.unit_of_measure::text);
        END CASE;
        
        -- Create alert if message was set (alerts enabled)
        IF alert_message IS NOT NULL THEN
            -- Check if similar alert already exists and is active
            IF NOT EXISTS (
                SELECT 1 FROM inventory_alerts 
                WHERE inventory_item_id = p_inventory_item_id 
                AND alert_type = alert_level 
                AND is_active = true
            ) THEN
                INSERT INTO inventory_alerts (
                    tenant_id,
                    inventory_item_id,
                    alert_type,
                    alert_message,
                    current_stock,
                    threshold_value
                ) VALUES (
                    item_record.tenant_id,
                    p_inventory_item_id,
                    alert_level,
                    alert_message,
                    item_record.current_stock,
                    CASE alert_level
                        WHEN 'low_stock' THEN item_record.reorder_point
                        WHEN 'critically_low' THEN item_record.min_stock_level
                        ELSE NULL
                    END
                );
            END IF;
        END IF;
    ELSE
        -- Resolve any existing alerts for this item since stock is now normal
        UPDATE inventory_alerts 
        SET is_active = false, 
            is_resolved = true, 
            resolved_at = NOW()
        WHERE inventory_item_id = p_inventory_item_id 
        AND is_active = true;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update stock when order is completed
CREATE OR REPLACE FUNCTION handle_order_completion()
RETURNS TRIGGER AS $$
DECLARE
    item_record RECORD;
BEGIN
    -- Only process when order status changes to completed/delivered
    IF NEW.status IN ('delivered', 'completed') AND OLD.status != NEW.status THEN
        -- Process each order item
        FOR item_record IN 
            SELECT oi.menu_item_id, oi.quantity
            FROM order_items oi
            WHERE oi.order_id = NEW.id
        LOOP
            -- Find inventory items linked to this menu item
            INSERT INTO inventory_transactions (
                tenant_id,
                inventory_item_id,
                transaction_type,
                quantity,
                stock_before,
                stock_after,
                reference_type,
                reference_id,
                reference_number,
                notes,
                created_by
            )
            SELECT 
                ii.tenant_id,
                ii.id,
                'sale'::inventory_transaction_type,
                -item_record.quantity, -- Negative because it's a deduction
                ii.current_stock,
                ii.current_stock - item_record.quantity,
                'order',
                NEW.id,
                NEW.order_number,
                format('Deducted for order %s', NEW.order_number),
                NEW.user_id -- Assuming orders have user_id, adjust if different
            FROM inventory_items ii
            WHERE ii.menu_item_id = item_record.menu_item_id
            AND ii.is_tracked = true
            AND ii.is_active = true;
            
            -- Update stock levels
            UPDATE inventory_items 
            SET current_stock = current_stock - item_record.quantity,
                updated_at = NOW()
            WHERE menu_item_id = item_record.menu_item_id
            AND is_tracked = true
            AND is_active = true;
        END LOOP;
        
        -- Check alerts for all affected items
        PERFORM check_inventory_alerts(ii.id)
        FROM inventory_items ii
        JOIN order_items oi ON ii.menu_item_id = oi.menu_item_id
        WHERE oi.order_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order completion
CREATE TRIGGER trigger_order_completion
    AFTER UPDATE ON orders
    FOR EACH ROW
    WHEN (NEW.status IN ('delivered', 'completed') AND OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION handle_order_completion();

-- Trigger to auto-disable menu items when out of stock
CREATE OR REPLACE FUNCTION handle_menu_item_availability()
RETURNS TRIGGER AS $$
BEGIN
    -- If inventory item affects menu availability and is out of stock
    IF NEW.affects_menu_availability = true AND NEW.current_stock <= 0 THEN
        UPDATE menu_items 
        SET is_available = false,
            updated_at = NOW()
        WHERE id = NEW.menu_item_id;
    -- If stock is restored, re-enable menu item
    ELSIF NEW.affects_menu_availability = true AND NEW.current_stock > 0 AND OLD.current_stock <= 0 THEN
        UPDATE menu_items 
        SET is_available = true,
            updated_at = NOW()
        WHERE id = NEW.menu_item_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for menu item availability
CREATE TRIGGER trigger_menu_item_availability
    AFTER UPDATE ON inventory_items
    FOR EACH ROW
    WHEN (NEW.menu_item_id IS NOT NULL AND NEW.current_stock IS DISTINCT FROM OLD.current_stock)
    EXECUTE FUNCTION handle_menu_item_availability();

-- =============================================
-- UPDATE TRIGGERS FOR TIMESTAMPS
-- =============================================

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_order_items_updated_at BEFORE UPDATE ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_alerts_updated_at BEFORE UPDATE ON inventory_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for inventory with alert status
CREATE VIEW inventory_with_alerts AS
SELECT 
    ii.*,
    calculate_stock_alert_level(ii.current_stock, ii.min_stock_level, ii.reorder_point, ii.max_stock_level) as alert_level,
    ii.current_stock * ii.cost_per_unit as stock_value,
    s.name as supplier_name,
    mi.name as menu_item_name,
    (ii.current_stock <= ii.reorder_point) as needs_reorder
FROM inventory_items ii
LEFT JOIN suppliers s ON ii.supplier_id = s.id
LEFT JOIN menu_items mi ON ii.menu_item_id = mi.id;

-- View for purchase order summary
CREATE VIEW purchase_order_summary AS
SELECT 
    po.*,
    s.name as supplier_name,
    s.email as supplier_email,
    s.phone as supplier_phone,
    COUNT(poi.id) as item_count,
    SUM(poi.ordered_quantity) as total_ordered_quantity,
    SUM(poi.received_quantity) as total_received_quantity,
    (SUM(poi.received_quantity) >= SUM(poi.ordered_quantity)) as is_fully_received
FROM purchase_orders po
LEFT JOIN suppliers s ON po.supplier_id = s.id
LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
GROUP BY po.id, s.name, s.email, s.phone;

-- =============================================
-- CONSTRAINTS AND VALIDATIONS
-- =============================================

-- Ensure purchase order totals are reasonable
ALTER TABLE purchase_orders ADD CONSTRAINT check_po_total 
CHECK (total_amount >= 0 AND subtotal >= 0);

-- Ensure inventory quantities are reasonable
ALTER TABLE inventory_items ADD CONSTRAINT check_stock_levels
CHECK (current_stock >= 0 AND min_stock_level >= 0 AND reorder_point >= 0 AND reorder_quantity > 0);

-- Ensure purchase order items have positive quantities
ALTER TABLE purchase_order_items ADD CONSTRAINT check_po_quantities
CHECK (ordered_quantity > 0 AND received_quantity >= 0 AND received_quantity <= ordered_quantity);

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE suppliers IS 'Suppliers and vendors providing inventory items to restaurants';
COMMENT ON TABLE inventory_items IS 'Individual inventory items with stock tracking and management';
COMMENT ON TABLE inventory_transactions IS 'Complete audit trail of all inventory movements and changes';
COMMENT ON TABLE purchase_orders IS 'Purchase orders for restocking inventory from suppliers';
COMMENT ON TABLE purchase_order_items IS 'Individual line items within purchase orders';
COMMENT ON TABLE inventory_alerts IS 'Stock level alerts and notifications for inventory management';
COMMENT ON TABLE inventory_counts IS 'Physical inventory count sessions for stock verification';
COMMENT ON TABLE inventory_count_items IS 'Individual item counts during stocktaking sessions';

COMMENT ON FUNCTION update_inventory_stock(UUID, DECIMAL, inventory_transaction_type, VARCHAR, UUID, VARCHAR, TEXT, UUID) IS 'Updates inventory stock levels and creates transaction records';
COMMENT ON FUNCTION check_inventory_alerts(UUID) IS 'Checks inventory levels and creates/resolves alerts as needed';
COMMENT ON FUNCTION calculate_stock_alert_level(DECIMAL, DECIMAL, DECIMAL, DECIMAL) IS 'Calculates the stock alert level based on current stock and thresholds';