-- Table Reservation System Migration
-- Create comprehensive reservation management system

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tables table for restaurant seating layout
CREATE TABLE IF NOT EXISTS tables (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_number VARCHAR(20) NOT NULL,
    table_name VARCHAR(100),
    capacity INTEGER NOT NULL CHECK (capacity >= 1 AND capacity <= 20),
    table_type VARCHAR(20) NOT NULL DEFAULT 'standard' CHECK (table_type IN ('standard', 'booth', 'outdoor', 'bar', 'private', 'vip')),
    location_details JSONB DEFAULT '{}',
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 100,
    height INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique table number per restaurant
    UNIQUE(restaurant_id, table_number)
);

-- Restaurant operating hours
CREATE TABLE IF NOT EXISTS restaurant_hours (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN DEFAULT FALSE,
    break_start TIME,
    break_end TIME,
    accept_reservations BOOLEAN DEFAULT TRUE,
    max_party_size INTEGER DEFAULT 8,
    advance_booking_days INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One record per day per restaurant
    UNIQUE(restaurant_id, day_of_week)
);

-- Time slots configuration
CREATE TABLE IF NOT EXISTS time_slots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    slot_name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 15 AND duration_minutes <= 480),
    buffer_minutes INTEGER DEFAULT 15 CHECK (buffer_minutes >= 0 AND buffer_minutes <= 60),
    max_reservations_per_slot INTEGER DEFAULT 10,
    days_of_week INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6],
    is_active BOOLEAN DEFAULT TRUE,
    price_multiplier DECIMAL(3,2) DEFAULT 1.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main reservations table
CREATE TABLE IF NOT EXISTS reservations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    time_slot_id UUID REFERENCES time_slots(id) ON DELETE SET NULL,
    
    -- Customer information
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Reservation details
    party_size INTEGER NOT NULL CHECK (party_size >= 1 AND party_size <= 50),
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 90,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show', 'waitlisted')),
    
    -- Additional information
    special_requests TEXT,
    occasion VARCHAR(50), -- birthday, anniversary, business, date_night, etc.
    dietary_requirements TEXT,
    seating_preference VARCHAR(50), -- window, outdoor, quiet, etc.
    
    -- System fields
    confirmation_code VARCHAR(10) UNIQUE,
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    deposit_paid BOOLEAN DEFAULT FALSE,
    reminder_sent BOOLEAN DEFAULT FALSE,
    check_in_time TIMESTAMPTZ,
    departure_time TIMESTAMPTZ,
    notes TEXT,
    
    -- Metadata
    source VARCHAR(50) DEFAULT 'online', -- online, phone, walk-in, third-party
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_reservation_time CHECK (reservation_date >= CURRENT_DATE),
    CONSTRAINT valid_party_size_table CHECK (
        table_id IS NULL OR 
        NOT EXISTS (
            SELECT 1 FROM tables t 
            WHERE t.id = table_id AND t.capacity < party_size
        )
    )
);

-- Blackout dates for holidays/events
CREATE TABLE IF NOT EXISTS blackout_dates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    reason VARCHAR(200) NOT NULL,
    all_day BOOLEAN DEFAULT TRUE,
    start_time TIME,
    end_time TIME,
    affects_reservations BOOLEAN DEFAULT TRUE,
    affects_walk_ins BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One blackout per day per restaurant
    UNIQUE(restaurant_id, date)
);

-- Waitlist for when no tables available
CREATE TABLE IF NOT EXISTS waitlist (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    party_size INTEGER NOT NULL CHECK (party_size >= 1),
    preferred_date DATE NOT NULL,
    preferred_time TIME NOT NULL,
    flexible_time BOOLEAN DEFAULT TRUE,
    max_wait_minutes INTEGER DEFAULT 60,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'seated', 'expired', 'cancelled')),
    priority INTEGER DEFAULT 0,
    special_requests TEXT,
    notification_sent BOOLEAN DEFAULT FALSE,
    notified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reservation modifications log
CREATE TABLE IF NOT EXISTS reservation_modifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    modification_type VARCHAR(50) NOT NULL, -- created, updated, cancelled, confirmed, etc.
    old_values JSONB,
    new_values JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table availability cache for performance
CREATE TABLE IF NOT EXISTS table_availability_cache (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_slot TIME NOT NULL,
    available_tables INTEGER NOT NULL DEFAULT 0,
    total_tables INTEGER NOT NULL DEFAULT 0,
    capacity_available INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(restaurant_id, date, time_slot)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_id ON tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_tables_active ON tables(restaurant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_tables_capacity ON tables(restaurant_id, capacity);

CREATE INDEX IF NOT EXISTS idx_restaurant_hours_restaurant_day ON restaurant_hours(restaurant_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_time_slots_restaurant_id ON time_slots(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_active ON time_slots(restaurant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_reservations_restaurant_id ON reservations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_date_time ON reservations(restaurant_id, reservation_date, reservation_time);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_table_date ON reservations(table_id, reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_customer ON reservations(customer_email, customer_phone);
CREATE INDEX IF NOT EXISTS idx_reservations_confirmation ON reservations(confirmation_code);

CREATE INDEX IF NOT EXISTS idx_blackout_dates_restaurant_date ON blackout_dates(restaurant_id, date);

CREATE INDEX IF NOT EXISTS idx_waitlist_restaurant_date ON waitlist(restaurant_id, preferred_date, status);
CREATE INDEX IF NOT EXISTS idx_waitlist_priority ON waitlist(restaurant_id, priority DESC, created_at);

CREATE INDEX IF NOT EXISTS idx_availability_cache_lookup ON table_availability_cache(restaurant_id, date, time_slot);

-- RLS Policies
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE blackout_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_availability_cache ENABLE ROW LEVEL SECURITY;

-- Tables policies
CREATE POLICY "Tables are viewable by restaurant staff and customers" ON tables
    FOR SELECT USING (
        restaurant_id IN (
            SELECT id FROM restaurants 
            WHERE id = restaurant_id AND (
                auth.uid() = owner_id OR 
                auth.uid() IN (SELECT user_id FROM restaurant_staff WHERE restaurant_id = tables.restaurant_id)
            )
        )
    );

CREATE POLICY "Tables are manageable by restaurant staff" ON tables
    FOR ALL USING (
        restaurant_id IN (
            SELECT id FROM restaurants 
            WHERE id = restaurant_id AND (
                auth.uid() = owner_id OR 
                auth.uid() IN (SELECT user_id FROM restaurant_staff WHERE restaurant_id = tables.restaurant_id AND role IN ('owner', 'manager'))
            )
        )
    );

-- Restaurant hours policies
CREATE POLICY "Restaurant hours are publicly viewable" ON restaurant_hours
    FOR SELECT USING (TRUE);

CREATE POLICY "Restaurant hours are manageable by restaurant staff" ON restaurant_hours
    FOR ALL USING (
        restaurant_id IN (
            SELECT id FROM restaurants 
            WHERE id = restaurant_id AND (
                auth.uid() = owner_id OR 
                auth.uid() IN (SELECT user_id FROM restaurant_staff WHERE restaurant_id = restaurant_hours.restaurant_id AND role IN ('owner', 'manager'))
            )
        )
    );

-- Time slots policies
CREATE POLICY "Time slots are publicly viewable" ON time_slots
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Time slots are manageable by restaurant staff" ON time_slots
    FOR ALL USING (
        restaurant_id IN (
            SELECT id FROM restaurants 
            WHERE id = restaurant_id AND (
                auth.uid() = owner_id OR 
                auth.uid() IN (SELECT user_id FROM restaurant_staff WHERE restaurant_id = time_slots.restaurant_id AND role IN ('owner', 'manager'))
            )
        )
    );

-- Reservations policies
CREATE POLICY "Reservations are viewable by customers and staff" ON reservations
    FOR SELECT USING (
        customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
        customer_id = auth.uid() OR
        restaurant_id IN (
            SELECT id FROM restaurants 
            WHERE id = restaurant_id AND (
                auth.uid() = owner_id OR 
                auth.uid() IN (SELECT user_id FROM restaurant_staff WHERE restaurant_id = reservations.restaurant_id)
            )
        )
    );

CREATE POLICY "Customers can create reservations" ON reservations
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Reservations are manageable by owners and customers" ON reservations
    FOR UPDATE USING (
        customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
        customer_id = auth.uid() OR
        restaurant_id IN (
            SELECT id FROM restaurants 
            WHERE id = restaurant_id AND (
                auth.uid() = owner_id OR 
                auth.uid() IN (SELECT user_id FROM restaurant_staff WHERE restaurant_id = reservations.restaurant_id)
            )
        )
    );

-- Blackout dates policies
CREATE POLICY "Blackout dates are publicly viewable" ON blackout_dates
    FOR SELECT USING (TRUE);

CREATE POLICY "Blackout dates are manageable by restaurant staff" ON blackout_dates
    FOR ALL USING (
        restaurant_id IN (
            SELECT id FROM restaurants 
            WHERE id = restaurant_id AND (
                auth.uid() = owner_id OR 
                auth.uid() IN (SELECT user_id FROM restaurant_staff WHERE restaurant_id = blackout_dates.restaurant_id AND role IN ('owner', 'manager'))
            )
        )
    );

-- Waitlist policies
CREATE POLICY "Waitlist is viewable by customers and staff" ON waitlist
    FOR SELECT USING (
        customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
        customer_id = auth.uid() OR
        restaurant_id IN (
            SELECT id FROM restaurants 
            WHERE id = restaurant_id AND (
                auth.uid() = owner_id OR 
                auth.uid() IN (SELECT user_id FROM restaurant_staff WHERE restaurant_id = waitlist.restaurant_id)
            )
        )
    );

CREATE POLICY "Customers can join waitlist" ON waitlist
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Waitlist is manageable by staff" ON waitlist
    FOR ALL USING (
        restaurant_id IN (
            SELECT id FROM restaurants 
            WHERE id = restaurant_id AND (
                auth.uid() = owner_id OR 
                auth.uid() IN (SELECT user_id FROM restaurant_staff WHERE restaurant_id = waitlist.restaurant_id)
            )
        )
    );

-- Reservation modifications policies
CREATE POLICY "Reservation modifications are viewable by staff" ON reservation_modifications
    FOR SELECT USING (
        reservation_id IN (
            SELECT id FROM reservations 
            WHERE restaurant_id IN (
                SELECT id FROM restaurants 
                WHERE id = restaurant_id AND (
                    auth.uid() = owner_id OR 
                    auth.uid() IN (SELECT user_id FROM restaurant_staff WHERE restaurant_id = reservations.restaurant_id)
                )
            )
        )
    );

CREATE POLICY "Staff can log modifications" ON reservation_modifications
    FOR INSERT WITH CHECK (
        reservation_id IN (
            SELECT id FROM reservations 
            WHERE restaurant_id IN (
                SELECT id FROM restaurants 
                WHERE id = restaurant_id AND (
                    auth.uid() = owner_id OR 
                    auth.uid() IN (SELECT user_id FROM restaurant_staff WHERE restaurant_id = reservations.restaurant_id)
                )
            )
        )
    );

-- Table availability cache policies
CREATE POLICY "Availability cache is publicly viewable" ON table_availability_cache
    FOR SELECT USING (TRUE);

CREATE POLICY "Staff can manage availability cache" ON table_availability_cache
    FOR ALL USING (
        restaurant_id IN (
            SELECT id FROM restaurants 
            WHERE id = restaurant_id AND (
                auth.uid() = owner_id OR 
                auth.uid() IN (SELECT user_id FROM restaurant_staff WHERE restaurant_id = table_availability_cache.restaurant_id)
            )
        )
    );

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurant_hours_updated_at BEFORE UPDATE ON restaurant_hours
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_slots_updated_at BEFORE UPDATE ON time_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blackout_dates_updated_at BEFORE UPDATE ON blackout_dates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_waitlist_updated_at BEFORE UPDATE ON waitlist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Functions for business logic

-- Generate unique confirmation code
CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS VARCHAR(10) AS $$
DECLARE
    code VARCHAR(10);
    exists_check INTEGER;
BEGIN
    LOOP
        code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6));
        SELECT COUNT(*) INTO exists_check FROM reservations WHERE confirmation_code = code;
        EXIT WHEN exists_check = 0;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate confirmation code on reservation insert
CREATE OR REPLACE FUNCTION set_confirmation_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.confirmation_code IS NULL THEN
        NEW.confirmation_code := generate_confirmation_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_reservation_confirmation_code 
    BEFORE INSERT ON reservations
    FOR EACH ROW EXECUTE FUNCTION set_confirmation_code();

-- Check table availability function
CREATE OR REPLACE FUNCTION check_table_availability(
    p_restaurant_id UUID,
    p_date DATE,
    p_time TIME,
    p_duration INTEGER DEFAULT 90,
    p_party_size INTEGER DEFAULT 2,
    p_exclude_reservation UUID DEFAULT NULL
) RETURNS TABLE (
    table_id UUID,
    table_number VARCHAR(20),
    table_name VARCHAR(100),
    capacity INTEGER,
    table_type VARCHAR(20),
    is_available BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.table_number,
        t.table_name,
        t.capacity,
        t.table_type,
        NOT EXISTS (
            SELECT 1 FROM reservations r 
            WHERE r.table_id = t.id 
            AND r.reservation_date = p_date
            AND r.status NOT IN ('cancelled', 'no_show')
            AND (
                -- Check for time overlap
                (r.reservation_time, r.reservation_time + (r.duration_minutes || ' minutes')::INTERVAL) OVERLAPS
                (p_time, p_time + (p_duration || ' minutes')::INTERVAL)
            )
            AND (p_exclude_reservation IS NULL OR r.id != p_exclude_reservation)
        ) as is_available
    FROM tables t
    WHERE t.restaurant_id = p_restaurant_id
    AND t.is_active = TRUE
    AND t.capacity >= p_party_size
    ORDER BY t.capacity, t.table_number;
END;
$$ LANGUAGE plpgsql;

-- Get available time slots function
CREATE OR REPLACE FUNCTION get_available_time_slots(
    p_restaurant_id UUID,
    p_date DATE,
    p_party_size INTEGER DEFAULT 2
) RETURNS TABLE (
    slot_time TIME,
    available_tables INTEGER,
    slot_name VARCHAR(50)
) AS $$
DECLARE
    day_of_week INTEGER;
BEGIN
    -- Get day of week (0 = Sunday)
    day_of_week := EXTRACT(DOW FROM p_date);
    
    RETURN QUERY
    WITH available_slots AS (
        SELECT 
            ts.start_time,
            ts.slot_name,
            COUNT(t.id) as total_available
        FROM time_slots ts
        CROSS JOIN tables t
        WHERE ts.restaurant_id = p_restaurant_id
        AND t.restaurant_id = p_restaurant_id
        AND ts.is_active = TRUE
        AND t.is_active = TRUE
        AND t.capacity >= p_party_size
        AND day_of_week = ANY(ts.days_of_week)
        -- Check restaurant is open
        AND EXISTS (
            SELECT 1 FROM restaurant_hours rh 
            WHERE rh.restaurant_id = p_restaurant_id 
            AND rh.day_of_week = EXTRACT(DOW FROM p_date)
            AND rh.is_closed = FALSE
            AND ts.start_time >= rh.open_time
            AND ts.end_time <= rh.close_time
        )
        -- Check not blackout date
        AND NOT EXISTS (
            SELECT 1 FROM blackout_dates bd
            WHERE bd.restaurant_id = p_restaurant_id
            AND bd.date = p_date
            AND bd.affects_reservations = TRUE
            AND (bd.all_day = TRUE OR (ts.start_time >= bd.start_time AND ts.end_time <= bd.end_time))
        )
        -- Check table not reserved
        AND NOT EXISTS (
            SELECT 1 FROM reservations r 
            WHERE r.table_id = t.id 
            AND r.reservation_date = p_date
            AND r.reservation_time = ts.start_time
            AND r.status NOT IN ('cancelled', 'no_show')
        )
        GROUP BY ts.start_time, ts.slot_name
    )
    SELECT 
        a.start_time,
        a.total_available::INTEGER,
        a.slot_name
    FROM available_slots a
    WHERE a.total_available > 0
    ORDER BY a.start_time;
END;
$$ LANGUAGE plpgsql;

-- Update availability cache function
CREATE OR REPLACE FUNCTION update_availability_cache(
    p_restaurant_id UUID,
    p_date DATE DEFAULT CURRENT_DATE,
    p_days_ahead INTEGER DEFAULT 30
) RETURNS VOID AS $$
DECLARE
    cache_date DATE;
    end_date DATE;
BEGIN
    end_date := p_date + (p_days_ahead || ' days')::INTERVAL;
    cache_date := p_date;
    
    WHILE cache_date <= end_date LOOP
        -- Delete existing cache for this date
        DELETE FROM table_availability_cache 
        WHERE restaurant_id = p_restaurant_id AND date = cache_date;
        
        -- Insert fresh cache data
        INSERT INTO table_availability_cache (restaurant_id, date, time_slot, available_tables, total_tables, capacity_available)
        SELECT 
            p_restaurant_id,
            cache_date,
            slot_time,
            available_tables,
            (SELECT COUNT(*) FROM tables WHERE restaurant_id = p_restaurant_id AND is_active = TRUE),
            (SELECT COALESCE(SUM(capacity), 0) FROM tables WHERE restaurant_id = p_restaurant_id AND is_active = TRUE)
        FROM get_available_time_slots(p_restaurant_id, cache_date, 1);
        
        cache_date := cache_date + INTERVAL '1 day';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update cache when reservations change
CREATE OR REPLACE FUNCTION invalidate_availability_cache()
RETURNS TRIGGER AS $$
BEGIN
    -- Update cache for the affected date
    PERFORM update_availability_cache(
        COALESCE(NEW.restaurant_id, OLD.restaurant_id),
        COALESCE(NEW.reservation_date, OLD.reservation_date),
        1
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reservation_cache_invalidation
    AFTER INSERT OR UPDATE OR DELETE ON reservations
    FOR EACH ROW EXECUTE FUNCTION invalidate_availability_cache();

-- Waitlist notification function
CREATE OR REPLACE FUNCTION notify_waitlist_customers()
RETURNS VOID AS $$
DECLARE
    waitlist_record RECORD;
    available_table UUID;
BEGIN
    FOR waitlist_record IN 
        SELECT * FROM waitlist 
        WHERE status = 'waiting' 
        AND preferred_date >= CURRENT_DATE
        AND expires_at > NOW()
        ORDER BY priority DESC, created_at ASC
    LOOP
        -- Check if table is now available
        SELECT table_id INTO available_table
        FROM check_table_availability(
            waitlist_record.restaurant_id,
            waitlist_record.preferred_date,
            waitlist_record.preferred_time,
            90,
            waitlist_record.party_size
        )
        WHERE is_available = TRUE
        LIMIT 1;
        
        IF available_table IS NOT NULL THEN
            -- Update waitlist status
            UPDATE waitlist 
            SET status = 'notified', 
                notified_at = NOW(),
                notification_sent = TRUE
            WHERE id = waitlist_record.id;
            
            -- Here you would trigger external notification (email/SMS)
            -- This would be handled by the application layer
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired waitlist entries
CREATE OR REPLACE FUNCTION cleanup_expired_waitlist()
RETURNS VOID AS $$
BEGIN
    UPDATE waitlist 
    SET status = 'expired'
    WHERE status = 'waiting'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Views for easy querying
CREATE OR REPLACE VIEW reservation_summary AS
SELECT 
    r.*,
    t.table_number,
    t.table_name,
    t.capacity as table_capacity,
    t.table_type,
    rest.name as restaurant_name,
    rest.subdomain
FROM reservations r
LEFT JOIN tables t ON r.table_id = t.id
LEFT JOIN restaurants rest ON r.restaurant_id = rest.id;

CREATE OR REPLACE VIEW daily_reservations AS
SELECT 
    restaurant_id,
    reservation_date,
    COUNT(*) as total_reservations,
    SUM(party_size) as total_guests,
    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_reservations,
    COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_shows,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancellations
FROM reservations
GROUP BY restaurant_id, reservation_date;

-- Initial data seeding function
CREATE OR REPLACE FUNCTION seed_restaurant_hours(p_restaurant_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Insert default hours (closed on Mondays, open Tue-Sun 11:30-22:00)
    INSERT INTO restaurant_hours (restaurant_id, day_of_week, open_time, close_time, is_closed) VALUES
    (p_restaurant_id, 0, '11:30', '22:00', FALSE), -- Sunday
    (p_restaurant_id, 1, NULL, NULL, TRUE),         -- Monday (closed)
    (p_restaurant_id, 2, '11:30', '22:00', FALSE), -- Tuesday
    (p_restaurant_id, 3, '11:30', '22:00', FALSE), -- Wednesday
    (p_restaurant_id, 4, '11:30', '22:00', FALSE), -- Thursday
    (p_restaurant_id, 5, '11:30', '22:00', FALSE), -- Friday
    (p_restaurant_id, 6, '11:30', '22:00', FALSE)  -- Saturday
    ON CONFLICT (restaurant_id, day_of_week) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Seed default time slots
CREATE OR REPLACE FUNCTION seed_time_slots(p_restaurant_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO time_slots (restaurant_id, slot_name, start_time, end_time, duration_minutes, days_of_week) VALUES
    (p_restaurant_id, 'Lunch Early', '11:30', '13:00', 90, ARRAY[0,2,3,4,5,6]),
    (p_restaurant_id, 'Lunch Late', '13:15', '14:45', 90, ARRAY[0,2,3,4,5,6]),
    (p_restaurant_id, 'Dinner Early', '17:30', '19:00', 90, ARRAY[0,2,3,4,5,6]),
    (p_restaurant_id, 'Dinner Prime', '19:15', '20:45', 90, ARRAY[0,2,3,4,5,6]),
    (p_restaurant_id, 'Dinner Late', '21:00', '22:30', 90, ARRAY[0,2,3,4,5,6])
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMIT;