-- =============================================
-- Restaurant SaaS Platform - Reviews System
-- Migration: reviews-migration.sql
-- Description: Comprehensive customer reviews and ratings system
-- =============================================

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- REVIEWS SYSTEM ENUMS AND TYPES
-- =============================================

-- Review status for moderation
CREATE TYPE review_status AS ENUM (
    'pending',      -- Awaiting moderation
    'approved',     -- Approved and visible
    'rejected',     -- Rejected and hidden
    'flagged'       -- Flagged for review
);

-- Review target types (restaurant or menu item)
CREATE TYPE review_target_type AS ENUM (
    'restaurant',   -- Overall restaurant review
    'menu_item'     -- Specific menu item review
);

-- Review vote types for helpfulness
CREATE TYPE review_vote_type AS ENUM (
    'helpful',      -- Helpful vote
    'not_helpful'   -- Not helpful vote
);

-- =============================================
-- REVIEWS CORE TABLES
-- =============================================

-- Main reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Allow anonymous reviews
    
    -- Review target (restaurant or menu item)
    target_type review_target_type NOT NULL,
    target_id UUID NOT NULL, -- References tenants.id for restaurant or menu_items.id for item
    
    -- Review content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    content TEXT,
    
    -- Review metadata
    status review_status DEFAULT 'pending',
    is_verified_purchase BOOLEAN DEFAULT false,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL, -- Link to verified order
    
    -- Reviewer information (for anonymous reviews)
    reviewer_name VARCHAR(255), -- For non-registered users
    reviewer_email VARCHAR(255), -- For follow-up if needed
    
    -- Moderation fields
    moderation_notes TEXT,
    moderated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    moderated_at TIMESTAMP WITH TIME ZONE,
    
    -- Helpfulness tracking
    helpful_votes INTEGER DEFAULT 0,
    not_helpful_votes INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    
    -- Response tracking
    has_response BOOLEAN DEFAULT false,
    response_count INTEGER DEFAULT 0,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}', -- Store additional review data
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Review photos table
CREATE TABLE review_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    
    -- Photo details
    photo_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    
    -- Photo metadata
    file_size INTEGER, -- Size in bytes
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    
    -- Display settings
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    
    -- Moderation
    is_approved BOOLEAN DEFAULT true,
    moderation_notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Review votes table (helpfulness voting)
CREATE TABLE review_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Vote details
    vote_type review_vote_type NOT NULL,
    
    -- Session tracking for anonymous users
    session_id VARCHAR(255), -- For anonymous voting
    ip_address INET, -- For fraud prevention
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate votes
    UNIQUE(review_id, user_id),
    UNIQUE(review_id, session_id) -- For anonymous users
);

-- Review responses table (restaurant owner responses)
CREATE TABLE review_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    responder_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Response content
    content TEXT NOT NULL,
    
    -- Response metadata
    is_official BOOLEAN DEFAULT true, -- Official restaurant response
    
    -- Moderation
    status review_status DEFAULT 'approved',
    moderation_notes TEXT,
    moderated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    moderated_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Review aggregations table for performance
CREATE TABLE review_aggregations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Aggregation target
    target_type review_target_type NOT NULL,
    target_id UUID NOT NULL,
    
    -- Rating statistics
    total_reviews INTEGER DEFAULT 0,
    approved_reviews INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (average_rating >= 0 AND average_rating <= 5),
    
    -- Rating distribution
    rating_1_count INTEGER DEFAULT 0,
    rating_2_count INTEGER DEFAULT 0,
    rating_3_count INTEGER DEFAULT 0,
    rating_4_count INTEGER DEFAULT 0,
    rating_5_count INTEGER DEFAULT 0,
    
    -- Additional metrics
    verified_reviews INTEGER DEFAULT 0,
    reviews_with_photos INTEGER DEFAULT 0,
    total_helpfulness_votes INTEGER DEFAULT 0,
    
    -- Recency metrics
    recent_reviews_30d INTEGER DEFAULT 0,
    recent_average_rating_30d DECIMAL(3, 2) DEFAULT 0.00,
    
    -- Last update tracking
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint for target
    UNIQUE(tenant_id, target_type, target_id)
);

-- Review reports table (for inappropriate content reporting)
CREATE TABLE review_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Report details
    reason VARCHAR(100) NOT NULL, -- spam, inappropriate, fake, etc.
    description TEXT,
    
    -- Report metadata
    reporter_ip INET,
    session_id VARCHAR(255),
    
    -- Resolution
    status VARCHAR(50) DEFAULT 'pending', -- pending, reviewed, resolved, dismissed
    resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Reviews table indexes
CREATE INDEX idx_reviews_tenant_id ON reviews(tenant_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_target ON reviews(target_type, target_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX idx_reviews_verified_purchase ON reviews(is_verified_purchase);
CREATE INDEX idx_reviews_helpful_votes ON reviews(helpful_votes DESC);

-- Composite indexes for common queries
CREATE INDEX idx_reviews_tenant_target_status ON reviews(tenant_id, target_type, target_id, status);
CREATE INDEX idx_reviews_tenant_rating_created ON reviews(tenant_id, rating, created_at DESC);

-- Review photos indexes
CREATE INDEX idx_review_photos_review_id ON review_photos(review_id);
CREATE INDEX idx_review_photos_sort_order ON review_photos(review_id, sort_order);

-- Review votes indexes
CREATE INDEX idx_review_votes_review_id ON review_votes(review_id);
CREATE INDEX idx_review_votes_user_id ON review_votes(user_id);

-- Review responses indexes
CREATE INDEX idx_review_responses_review_id ON review_responses(review_id);
CREATE INDEX idx_review_responses_responder_id ON review_responses(responder_id);

-- Review aggregations indexes
CREATE INDEX idx_review_aggregations_tenant_target ON review_aggregations(tenant_id, target_type, target_id);
CREATE INDEX idx_review_aggregations_average_rating ON review_aggregations(average_rating DESC);

-- Review reports indexes
CREATE INDEX idx_review_reports_review_id ON review_reports(review_id);
CREATE INDEX idx_review_reports_status ON review_reports(status);

-- =============================================
-- TRIGGERS AND FUNCTIONS
-- =============================================

-- Function to update review aggregations
CREATE OR REPLACE FUNCTION update_review_aggregations()
RETURNS TRIGGER AS $$
DECLARE
    target_tenant_id UUID;
    target_type_val review_target_type;
    target_id_val UUID;
BEGIN
    -- Get target information from the review
    IF TG_OP = 'DELETE' THEN
        target_tenant_id := OLD.tenant_id;
        target_type_val := OLD.target_type;
        target_id_val := OLD.target_id;
    ELSE
        target_tenant_id := NEW.tenant_id;
        target_type_val := NEW.target_type;
        target_id_val := NEW.target_id;
    END IF;
    
    -- Update or insert aggregation record
    INSERT INTO review_aggregations (
        tenant_id, 
        target_type, 
        target_id,
        total_reviews,
        approved_reviews,
        average_rating,
        rating_1_count,
        rating_2_count,
        rating_3_count,
        rating_4_count,
        rating_5_count,
        verified_reviews,
        reviews_with_photos,
        recent_reviews_30d,
        recent_average_rating_30d,
        last_updated
    )
    SELECT 
        target_tenant_id,
        target_type_val,
        target_id_val,
        COUNT(*) as total_reviews,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_reviews,
        ROUND(AVG(rating) FILTER (WHERE status = 'approved'), 2) as average_rating,
        COUNT(*) FILTER (WHERE rating = 1 AND status = 'approved') as rating_1_count,
        COUNT(*) FILTER (WHERE rating = 2 AND status = 'approved') as rating_2_count,
        COUNT(*) FILTER (WHERE rating = 3 AND status = 'approved') as rating_3_count,
        COUNT(*) FILTER (WHERE rating = 4 AND status = 'approved') as rating_4_count,
        COUNT(*) FILTER (WHERE rating = 5 AND status = 'approved') as rating_5_count,
        COUNT(*) FILTER (WHERE is_verified_purchase = true AND status = 'approved') as verified_reviews,
        COUNT(DISTINCT r.id) FILTER (WHERE EXISTS(SELECT 1 FROM review_photos p WHERE p.review_id = r.id) AND status = 'approved') as reviews_with_photos,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days' AND status = 'approved') as recent_reviews_30d,
        ROUND(AVG(rating) FILTER (WHERE created_at > NOW() - INTERVAL '30 days' AND status = 'approved'), 2) as recent_average_rating_30d,
        NOW() as last_updated
    FROM reviews r
    WHERE r.tenant_id = target_tenant_id 
      AND r.target_type = target_type_val 
      AND r.target_id = target_id_val
      AND r.deleted_at IS NULL
    ON CONFLICT (tenant_id, target_type, target_id)
    DO UPDATE SET
        total_reviews = EXCLUDED.total_reviews,
        approved_reviews = EXCLUDED.approved_reviews,
        average_rating = EXCLUDED.average_rating,
        rating_1_count = EXCLUDED.rating_1_count,
        rating_2_count = EXCLUDED.rating_2_count,
        rating_3_count = EXCLUDED.rating_3_count,
        rating_4_count = EXCLUDED.rating_4_count,
        rating_5_count = EXCLUDED.rating_5_count,
        verified_reviews = EXCLUDED.verified_reviews,
        reviews_with_photos = EXCLUDED.reviews_with_photos,
        recent_reviews_30d = EXCLUDED.recent_reviews_30d,
        recent_average_rating_30d = EXCLUDED.recent_average_rating_30d,
        last_updated = EXCLUDED.last_updated,
        updated_at = NOW();
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update review vote counts
CREATE OR REPLACE FUNCTION update_review_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    review_id_val UUID;
BEGIN
    -- Get review ID from vote
    IF TG_OP = 'DELETE' THEN
        review_id_val := OLD.review_id;
    ELSE
        review_id_val := NEW.review_id;
    END IF;
    
    -- Update vote counts on the review
    UPDATE reviews SET
        helpful_votes = (
            SELECT COUNT(*) FROM review_votes 
            WHERE review_id = review_id_val AND vote_type = 'helpful'
        ),
        not_helpful_votes = (
            SELECT COUNT(*) FROM review_votes 
            WHERE review_id = review_id_val AND vote_type = 'not_helpful'
        ),
        total_votes = (
            SELECT COUNT(*) FROM review_votes 
            WHERE review_id = review_id_val
        ),
        updated_at = NOW()
    WHERE id = review_id_val;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update response count
CREATE OR REPLACE FUNCTION update_review_response_count()
RETURNS TRIGGER AS $$
DECLARE
    review_id_val UUID;
BEGIN
    -- Get review ID from response
    IF TG_OP = 'DELETE' THEN
        review_id_val := OLD.review_id;
    ELSE
        review_id_val := NEW.review_id;
    END IF;
    
    -- Update response count and flag on the review
    UPDATE reviews SET
        response_count = (
            SELECT COUNT(*) FROM review_responses 
            WHERE review_id = review_id_val AND deleted_at IS NULL
        ),
        has_response = (
            SELECT COUNT(*) > 0 FROM review_responses 
            WHERE review_id = review_id_val AND deleted_at IS NULL
        ),
        updated_at = NOW()
    WHERE id = review_id_val;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply triggers for review aggregations
CREATE TRIGGER trigger_update_review_aggregations_insert
    AFTER INSERT ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_review_aggregations();

CREATE TRIGGER trigger_update_review_aggregations_update
    AFTER UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_review_aggregations();

CREATE TRIGGER trigger_update_review_aggregations_delete
    AFTER DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_review_aggregations();

-- Apply triggers for vote counts
CREATE TRIGGER trigger_update_review_vote_counts_insert
    AFTER INSERT ON review_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_review_vote_counts();

CREATE TRIGGER trigger_update_review_vote_counts_delete
    AFTER DELETE ON review_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_review_vote_counts();

-- Apply triggers for response counts
CREATE TRIGGER trigger_update_review_response_count_insert
    AFTER INSERT ON review_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_review_response_count();

CREATE TRIGGER trigger_update_review_response_count_delete
    AFTER DELETE ON review_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_review_response_count();

-- Apply updated_at triggers to reviews tables
CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON reviews 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_photos_updated_at 
    BEFORE UPDATE ON review_photos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_votes_updated_at 
    BEFORE UPDATE ON review_votes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_responses_updated_at 
    BEFORE UPDATE ON review_responses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_aggregations_updated_at 
    BEFORE UPDATE ON review_aggregations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_reports_updated_at 
    BEFORE UPDATE ON review_reports 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- CONSTRAINTS AND VALIDATIONS
-- =============================================

-- Ensure target references are valid
ALTER TABLE reviews ADD CONSTRAINT check_target_reference 
CHECK (
    (target_type = 'restaurant' AND target_id IS NOT NULL) OR
    (target_type = 'menu_item' AND target_id IS NOT NULL)
);

-- Ensure reviewer info is provided (either user_id or reviewer details)
ALTER TABLE reviews ADD CONSTRAINT check_reviewer_info 
CHECK (
    user_id IS NOT NULL OR 
    (reviewer_name IS NOT NULL AND reviewer_email IS NOT NULL)
);

-- Ensure photo count per review is reasonable
ALTER TABLE review_photos ADD CONSTRAINT check_photos_per_review
CHECK ((SELECT COUNT(*) FROM review_photos WHERE review_id = review_photos.review_id) <= 10);

-- Ensure vote type is valid
ALTER TABLE review_votes ADD CONSTRAINT check_vote_type_valid
CHECK (vote_type IN ('helpful', 'not_helpful'));

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE reviews IS 'Customer reviews and ratings for restaurants and menu items';
COMMENT ON TABLE review_photos IS 'Photos attached to customer reviews';
COMMENT ON TABLE review_votes IS 'Helpfulness votes on reviews from other customers';
COMMENT ON TABLE review_responses IS 'Restaurant owner responses to customer reviews';
COMMENT ON TABLE review_aggregations IS 'Pre-calculated review statistics for performance';
COMMENT ON TABLE review_reports IS 'Reports of inappropriate or fraudulent reviews';

COMMENT ON COLUMN reviews.target_type IS 'Type of entity being reviewed (restaurant or menu_item)';
COMMENT ON COLUMN reviews.target_id IS 'ID of the restaurant or menu item being reviewed';
COMMENT ON COLUMN reviews.is_verified_purchase IS 'Whether review is from a verified order';
COMMENT ON COLUMN reviews.helpful_votes IS 'Count of helpful votes from other users';
COMMENT ON COLUMN review_aggregations.average_rating IS 'Weighted average rating for the target';
COMMENT ON COLUMN review_aggregations.recent_reviews_30d IS 'Number of reviews in the last 30 days';

-- =============================================
-- INITIAL DATA SETUP
-- =============================================

-- Create initial review aggregation records for existing restaurants
INSERT INTO review_aggregations (tenant_id, target_type, target_id)
SELECT id, 'restaurant'::review_target_type, id
FROM tenants
WHERE status = 'active'
ON CONFLICT DO NOTHING;

-- Create initial review aggregation records for existing menu items
INSERT INTO review_aggregations (tenant_id, target_type, target_id)
SELECT tenant_id, 'menu_item'::review_target_type, id
FROM menu_items
WHERE deleted_at IS NULL
ON CONFLICT DO NOTHING;