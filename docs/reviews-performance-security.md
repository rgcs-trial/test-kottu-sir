# Reviews System - Performance Optimization & Security Guide

## Overview

This document outlines performance optimizations and security measures implemented in the restaurant reviews system, along with best practices for production deployment.

## Performance Optimizations

### 1. Database Optimizations

#### Indexes
```sql
-- Core indexes for fast queries
CREATE INDEX idx_reviews_tenant_id ON reviews(tenant_id);
CREATE INDEX idx_reviews_target ON reviews(target_type, target_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX idx_reviews_tenant_target_status ON reviews(tenant_id, target_type, target_id, status);
CREATE INDEX idx_reviews_helpful_votes ON reviews(helpful_votes DESC);
```

#### Query Optimization
- **Pagination**: Implemented cursor-based pagination for large datasets
- **Aggregations**: Pre-calculated review statistics in `review_aggregations` table
- **Selective Loading**: Only fetch required fields in API responses
- **Connection Pooling**: Supabase handles connection pooling automatically

### 2. Frontend Optimizations

#### Component Performance
```typescript
// Lazy loading for review components
const ReviewList = lazy(() => import('@/components/reviews/review-list'));
const ReviewForm = lazy(() => import('@/components/reviews/review-form'));

// Memoized expensive calculations
const averageRating = useMemo(() => {
  if (reviews.length === 0) return 0;
  return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
}, [reviews]);

// Virtual scrolling for large review lists
import { FixedSizeList as List } from 'react-window';
```

#### Image Optimization
```typescript
// Optimized image loading with Next.js
<Image
  src={photo.photo_url}
  alt="Review photo"
  width={200}
  height={200}
  className="object-cover"
  loading="lazy"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

#### Bundle Optimization
- **Code Splitting**: Reviews components are lazily loaded
- **Tree Shaking**: Only import used functions from utility libraries
- **Dynamic Imports**: Load moderation tools only for admin users

### 3. API Performance

#### Caching Strategy
```typescript
// Server-side caching with revalidation
export const revalidate = 300; // 5 minutes

// Client-side caching with SWR pattern
const { data, error } = useSWR(
  `/api/reviews?tenant_id=${tenantId}`,
  fetcher,
  {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 60000, // 1 minute
  }
);
```

#### Rate Limiting
```typescript
// Implement rate limiting for review submissions
const rateLimit = {
  reviews: { max: 5, window: '1h' }, // 5 reviews per hour
  votes: { max: 100, window: '1h' }, // 100 votes per hour
  reports: { max: 10, window: '1d' }, // 10 reports per day
};
```

### 4. Real-time Updates

#### Optimistic Updates
```typescript
// Update UI immediately for better UX
const handleVote = async (reviewId: string, voteType: string) => {
  // Optimistic update
  setReviews(prev => prev.map(review => 
    review.id === reviewId 
      ? { ...review, helpful_votes: review.helpful_votes + 1 }
      : review
  ));

  try {
    await voteOnReview(reviewId, voteType);
  } catch (error) {
    // Revert on error
    setReviews(prev => prev.map(review => 
      review.id === reviewId 
        ? { ...review, helpful_votes: review.helpful_votes - 1 }
        : review
    ));
  }
};
```

## Security Measures

### 1. Input Validation

#### Server-side Validation
```typescript
// Zod schemas for type-safe validation
const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  content: z.string().min(10).max(2000),
  target_type: z.enum(['restaurant', 'menu_item']),
  target_id: z.string().uuid(),
});

// Validate all inputs
const validatedData = reviewSchema.parse(requestData);
```

#### Content Sanitization
```typescript
// Sanitize user content on display
import DOMPurify from 'dompurify';

const sanitizedContent = DOMPurify.sanitize(review.content, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
  ALLOWED_ATTR: [],
});
```

### 2. Authentication & Authorization

#### Row Level Security (RLS)
```sql
-- Enable RLS on all review tables
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;

-- Policies for reviews
CREATE POLICY "Users can view approved reviews" ON reviews
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can insert their own reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Restaurant staff can respond to reviews
CREATE POLICY "Staff can respond to reviews" ON review_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN tenants t ON p.tenant_id = t.id
      JOIN reviews r ON r.tenant_id = t.id
      WHERE p.id = auth.uid()
        AND p.role IN ('restaurant_owner', 'restaurant_staff')
        AND r.id = review_id
    )
  );
```

#### Permission Checks
```typescript
// Server-side permission validation
async function checkRespondPermissions(userId: string, tenantId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', userId)
    .single();

  return profile?.tenant_id === tenantId && 
         ['restaurant_owner', 'restaurant_staff'].includes(profile.role);
}
```

### 3. Data Protection

#### Sensitive Data Handling
```typescript
// Never expose sensitive user data
const publicReviewData = {
  id: review.id,
  rating: review.rating,
  content: review.content,
  reviewer_name: review.reviewer_name, // Never email or other PII
  created_at: review.created_at,
  // Exclude: user_id, reviewer_email, internal notes
};
```

#### Encryption
- All data encrypted in transit (HTTPS)
- Database encryption at rest (Supabase default)
- Session tokens encrypted and HTTP-only

### 4. Abuse Prevention

#### Spam Detection
```typescript
// Basic spam detection
const spamIndicators = [
  /\b(buy now|click here|free money)\b/i,
  /(.)\1{4,}/, // Repeated characters
  /https?:\/\/[^\s]+/g, // URLs (limit to verified users)
];

const isSpam = spamIndicators.some(pattern => pattern.test(content));
if (isSpam) {
  // Flag for manual review
  await flagReviewForModeration(reviewId, 'potential_spam');
}
```

#### Rate Limiting Implementation
```typescript
// Redis-based rate limiting
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, '1h'), // 5 reviews per hour
});

export async function POST(request: Request) {
  const identifier = getClientIP(request);
  const { success } = await ratelimit.limit(identifier);
  
  if (!success) {
    return new Response('Too Many Requests', { status: 429 });
  }
  
  // Process review...
}
```

## Production Deployment Checklist

### 1. Environment Configuration

```bash
# Production environment variables
NEXT_PUBLIC_SUPABASE_URL=your-production-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key
REVIEWS_ENCRYPTION_KEY=your-encryption-key
CLOUDFLARE_IMAGES_TOKEN=your-images-token
REDIS_URL=your-redis-url
```

### 2. Database Setup

```sql
-- Run migration scripts
\i scripts/reviews-migration.sql

-- Verify indexes are created
SELECT indexname, tablename FROM pg_indexes 
WHERE tablename LIKE 'review%';

-- Check RLS policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename LIKE 'review%';
```

### 3. Monitoring Setup

#### Error Tracking
```typescript
// Sentry integration for error tracking
import * as Sentry from '@sentry/nextjs';

Sentry.captureException(error, {
  tags: {
    component: 'reviews',
    action: 'create_review',
  },
  extra: {
    reviewId: review.id,
    tenantId: review.tenant_id,
  },
});
```

#### Performance Monitoring
```typescript
// Track key metrics
const metrics = {
  review_submission_time: Date.now() - startTime,
  review_approval_rate: approvedReviews / totalReviews,
  average_response_time: responseTime,
  user_engagement_rate: votesCount / reviewsCount,
};

// Send to analytics service
analytics.track('review_metrics', metrics);
```

### 4. Content Moderation

#### Auto-moderation Rules
```typescript
const moderationRules = {
  autoApprove: {
    verifiedUser: true,
    rating: [4, 5],
    contentLength: { min: 50, max: 500 },
    noSpamIndicators: true,
  },
  autoReject: {
    spamScore: { threshold: 0.8 },
    toxicityScore: { threshold: 0.7 },
    duplicateContent: true,
  },
  flagForReview: {
    rating: [1, 2],
    contentLength: { min: 10, max: 50 },
    hasAttachments: true,
  },
};
```

#### Human Moderation Queue
```typescript
// Prioritize reviews for human moderation
const moderationPriority = {
  high: ['reported_reviews', 'low_ratings', 'long_content'],
  medium: ['first_time_reviewers', 'photo_reviews'],
  low: ['regular_reviews', 'verified_purchases'],
};
```

## Performance Metrics & KPIs

### 1. Technical Metrics
- **API Response Time**: < 200ms for GET requests
- **Database Query Time**: < 50ms for indexed queries
- **Page Load Time**: < 2s for reviews page
- **Image Load Time**: < 1s for review photos

### 2. Business Metrics
- **Review Submission Rate**: Target 15% of orders
- **Response Rate**: Target 80% of reviews responded to
- **Moderation Efficiency**: < 2 hours average review time
- **User Engagement**: 5% of reviews receive votes

### 3. Security Metrics
- **Spam Detection Rate**: > 95% accuracy
- **False Positive Rate**: < 2%
- **Incident Response Time**: < 30 minutes
- **Data Breach Incidents**: 0 tolerance

## Troubleshooting Guide

### Common Issues

#### 1. High Database Load
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE query LIKE '%reviews%' 
ORDER BY mean_time DESC;

-- Optimize with additional indexes
CREATE INDEX CONCURRENTLY idx_reviews_performance 
ON reviews(tenant_id, status, created_at) 
WHERE deleted_at IS NULL;
```

#### 2. Memory Issues
```typescript
// Implement pagination for large datasets
const REVIEW_PAGE_SIZE = 20; // Reduce if memory issues persist

// Use virtual scrolling for long lists
import { VariableSizeList } from 'react-window';
```

#### 3. Rate Limiting False Positives
```typescript
// Implement user-based rate limiting
const getUserRateLimit = (user: User) => {
  if (user.verified) return { max: 10, window: '1h' };
  if (user.tenure > 30) return { max: 7, window: '1h' };
  return { max: 3, window: '1h' }; // New users
};
```

## Future Enhancements

### 1. Machine Learning Integration
- **Sentiment Analysis**: Automatic sentiment scoring
- **Spam Detection**: ML-based spam classification
- **Review Quality Scoring**: Helpful review identification

### 2. Advanced Features
- **Review Templates**: Guided review forms
- **Bulk Operations**: Batch moderation tools
- **Analytics Dashboard**: Advanced review insights
- **A/B Testing**: Review form optimization

### 3. Scalability Improvements
- **CDN Integration**: Cached review data
- **Read Replicas**: Separate read/write databases
- **Microservices**: Dedicated review service
- **Event Streaming**: Real-time review updates

## Conclusion

This comprehensive reviews system provides enterprise-grade performance, security, and scalability. Regular monitoring, testing, and optimization ensure continued reliability and user satisfaction.

For additional support or questions, refer to:
- API Documentation: `/docs/api/reviews.md`
- Component Documentation: `/docs/components/reviews.md`
- Database Schema: `/docs/database/reviews-schema.md`