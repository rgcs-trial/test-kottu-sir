# Restaurant SaaS Database Setup Guide

This guide explains how to set up the comprehensive Supabase database schema for the restaurant SaaS platform with multi-tenant architecture and Row Level Security.

## 🏗️ Architecture Overview

The database implements:
- **Multi-tenant architecture** with complete tenant isolation
- **Role-based access control** (platform_admin, restaurant_owner, restaurant_staff, customer)
- **Row Level Security (RLS)** policies for data security
- **Comprehensive analytics** with daily and hourly aggregations
- **Guest user support** for anonymous cart/order operations
- **Optimized performance** with strategic indexing

## 📁 Files Structure

```
supabase/
├── migrations/
│   ├── 001_initial_schema.sql    # Core tables, types, and constraints
│   ├── 002_rls_policies.sql      # Row Level Security policies
│   ├── 003_functions.sql         # Database functions and triggers
│   └── 004_indexes.sql           # Performance indexes
├── seed.sql                      # Sample data for development
lib/supabase/
└── admin.ts                      # Admin client for migrations
scripts/
└── setup-database.ts             # Automated setup script
```

## 🚀 Quick Start

### Prerequisites

1. **Supabase Project**: Create a new Supabase project
2. **Environment Variables**: Set up required environment variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Automated Setup (Recommended)

Run the automated setup script:

```bash
# Full setup with migrations and sample data
tsx scripts/setup-database.ts

# Migrations only (no sample data)
tsx scripts/setup-database.ts --migrations-only

# Force re-run (if already exists)
tsx scripts/setup-database.ts --force

# Verbose logging
tsx scripts/setup-database.ts --verbose
```

### Manual Setup

If you prefer to run migrations manually:

```bash
# 1. Run migrations in order
npx supabase db reset --linked
npx supabase db push

# 2. Or run individual migrations
psql -h your-host -U postgres -d your-db -f supabase/migrations/001_initial_schema.sql
psql -h your-host -U postgres -d your-db -f supabase/migrations/002_rls_policies.sql
psql -h your-host -U postgres -d your-db -f supabase/migrations/003_functions.sql
psql -h your-host -U postgres -d your-db -f supabase/migrations/004_indexes.sql

# 3. Seed with sample data (optional)
psql -h your-host -U postgres -d your-db -f supabase/seed.sql
```

## 🏢 Multi-Tenant Architecture

### Tenant Isolation

Each restaurant is a separate tenant with complete data isolation:

```sql
-- Every tenant-related table includes tenant_id
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    -- ... other fields
);
```

### Row Level Security

RLS policies ensure users can only access their tenant's data:

```sql
-- Users can only see menu items from their tenant
CREATE POLICY "Restaurant users can manage own menu items" ON menu_items
    FOR ALL USING (has_restaurant_access(tenant_id));
```

## 👥 User Roles & Permissions

### Role Hierarchy

1. **platform_admin**: Full platform access, can manage all tenants
2. **restaurant_owner**: Full access to their restaurant's data
3. **restaurant_staff**: Limited access to their restaurant's operations
4. **customer**: Public menu access, own orders only

### Permission Examples

```typescript
// Check user permissions
const hasAccess = await supabase.rpc('has_restaurant_access', {
  target_tenant_id: 'restaurant-uuid'
});

// Get current user profile with role
const profile = await supabase.rpc('get_current_user_profile');
```

## 📊 Database Schema

### Core Tables

- **tenants**: Restaurant information and settings
- **profiles**: Extended user profiles with roles
- **menu_categories**: Menu organization
- **menu_items**: Menu items with variants and modifiers
- **orders**: Complete order lifecycle tracking
- **analytics_daily/hourly**: Performance analytics

### Key Features

- **UUID Primary Keys**: For security and scalability
- **JSONB Fields**: Flexible data storage for settings and metadata
- **Audit Trails**: Complete order status history
- **Soft Deletes**: Safe data removal with recovery options
- **Timestamping**: Automatic created_at/updated_at tracking

## 🔐 Security Features

### Row Level Security Policies

```sql
-- Tenant isolation
CREATE POLICY "Tenant data isolation" ON orders
    FOR ALL USING (has_restaurant_access(tenant_id));

-- Guest cart access
CREATE POLICY "Guest cart access" ON carts
    FOR ALL USING (
        user_id IS NULL AND 
        session_id = current_setting('app.session_id', true)
    );
```

### Data Protection

- **Input Validation**: SQL constraints and triggers
- **Audit Logging**: Track all sensitive operations
- **Session Management**: Secure guest user sessions
- **Data Encryption**: Sensitive fields protection

## ⚡ Performance Optimization

### Strategic Indexing

```sql
-- Composite indexes for common queries
CREATE INDEX idx_menu_browse ON menu_items(
    tenant_id, category_id, is_available, sort_order
) WHERE deleted_at IS NULL;

-- BRIN indexes for time-series data
CREATE INDEX idx_analytics_daily_date_brin ON analytics_daily 
    USING BRIN(date) WITH (pages_per_range = 128);
```

### Query Optimization

- **Covering Indexes**: Include frequently accessed columns
- **Partial Indexes**: Filter for active data only
- **GIN Indexes**: Full-text search and JSONB queries
- **Function Indexes**: Optimized computed values

## 🧪 Development & Testing

### Sample Data

The seed file includes:
- 3 sample restaurants with different cuisines
- Menu categories and items with variants/modifiers
- Sample orders in different states
- User profiles for all roles
- Analytics data for testing dashboards

### Testing Functions

```typescript
import { getAdminClient } from './lib/supabase/admin';

const admin = getAdminClient();

// Test tenant creation
const result = await admin.createTenant({
  name: 'Test Restaurant',
  slug: 'test-restaurant',
  email: 'test@example.com'
});

// Check database health
const health = await admin.checkDatabaseHealth();
```

## 📈 Analytics & Reporting

### Daily Analytics

Automatic aggregation of:
- Order counts and revenue
- Customer metrics
- Item sales data
- Fulfillment type breakdown

### Hourly Analytics

Detailed metrics for:
- Peak hour identification
- Preparation time analysis
- Revenue patterns
- Order volume tracking

### Custom Reports

```sql
-- Revenue by day
SELECT date, SUM(gross_revenue) as daily_revenue
FROM analytics_daily
WHERE tenant_id = 'your-tenant-id'
AND date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date
ORDER BY date;
```

## 🛠️ Administration

### Admin Client Usage

```typescript
import { getAdminClient } from './lib/supabase/admin';

const admin = getAdminClient();

// Run migrations
await admin.runAllMigrations();

// Create tenant
await admin.createTenant({
  name: 'New Restaurant',
  slug: 'new-restaurant',
  email: 'owner@newrestaurant.com'
});

// Backup tenant data
await admin.backupTenantData('tenant-uuid');

// Cleanup expired data
await admin.cleanupExpiredData();
```

### Maintenance Tasks

Regular maintenance functions:
- Expired cart cleanup
- Analytics aggregation
- Index optimization
- Backup creation

## 🚨 Troubleshooting

### Common Issues

1. **RLS Policy Errors**
   - Check user role and tenant association
   - Verify session settings for guest users

2. **Migration Failures**
   - Run with `--force` flag to override
   - Check database permissions

3. **Performance Issues**
   - Analyze slow queries with `EXPLAIN ANALYZE`
   - Check index usage statistics

### Debug Functions

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Monitor index usage
SELECT * FROM index_usage_stats;

-- Check connection count
SELECT get_connection_count();
```

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)
- [Multi-tenant Architecture Patterns](https://docs.microsoft.com/en-us/azure/sql-database/saas-tenancy-app-design-patterns)

## 🤝 Contributing

When modifying the database schema:

1. Create new migration files with incremental numbers
2. Update RLS policies accordingly
3. Add appropriate indexes for new queries
4. Update seed data if needed
5. Run tests to ensure compatibility

---

**Need Help?** Check the setup script logs or create an issue with detailed error information.