# Restaurant Onboarding System

A comprehensive multi-step onboarding flow for new restaurants joining the platform. This system guides restaurant owners through setting up their restaurant profile, menu, payment processing, and launching their online presence.

## 🚀 Features

### Multi-Step Onboarding Flow
- **Step 1: Restaurant Details** - Business information, address, operating hours
- **Step 2: Menu Setup** - Import/create menu with templates or CSV
- **Step 3: Payment Setup** - Stripe Connect integration
- **Step 4: Launch Checklist** - Final verification and go-live

### Key Capabilities
- ✅ **Progress Tracking** - Visual progress bar and step completion status
- ✅ **Data Persistence** - Auto-save progress and resume later functionality
- ✅ **Flexible Menu Import** - Templates, CSV upload, or manual creation
- ✅ **Payment Integration** - Stripe Connect onboarding with verification
- ✅ **Validation & Error Handling** - Comprehensive form validation
- ✅ **Responsive Design** - Mobile-first responsive interface
- ✅ **Analytics** - Onboarding completion tracking and dropoff analysis

## 📁 File Structure

```
app/(platform)/onboarding/
├── page.tsx                    # Main onboarding overview page
├── restaurant/page.tsx         # Restaurant details step
├── menu/page.tsx              # Menu setup step
├── payment/page.tsx           # Payment setup step
└── complete/page.tsx          # Launch checklist step

components/onboarding/
├── progress-bar.tsx           # Progress indicator components
├── restaurant-setup.tsx       # Restaurant setup form
└── menu-import.tsx           # Menu import with CSV/templates

hooks/
└── use-onboarding.tsx         # Onboarding state management hooks

lib/onboarding/
└── actions.ts                 # Server actions for onboarding
```

## 🛠 Implementation Guide

### 1. Database Setup

Run the migration to add required tables:

```sql
-- Execute the migration script
\i scripts/onboarding-migration.sql
```

This creates:
- `onboarding_status` - Tracks user onboarding progress
- `operating_hours` - Restaurant operating hours
- Updates `restaurants` table with onboarding fields

### 2. Add Onboarding Provider

Wrap your app with the `OnboardingProvider`:

```tsx
// app/layout.tsx or app/(platform)/layout.tsx
import { OnboardingProvider } from '@/hooks/use-onboarding'

export default function Layout({ children }) {
  return (
    <OnboardingProvider>
      {children}
    </OnboardingProvider>
  )
}
```

### 3. Protect Routes with Onboarding Check

Use the HOC to redirect incomplete onboarding:

```tsx
// app/(staff)/dashboard/page.tsx
import { withOnboardingCheck } from '@/hooks/use-onboarding'

function DashboardPage() {
  return <div>Dashboard Content</div>
}

export default withOnboardingCheck(DashboardPage)
```

### 4. Using Onboarding Hooks

```tsx
import { useOnboarding, useOnboardingStep, useOnboardingNavigation } from '@/hooks/use-onboarding'

function MyComponent() {
  const { onboardingStatus, isComplete, progressPercentage } = useOnboarding()
  const { step, updateStep } = useOnboardingStep('restaurant')
  const { getNextStep, canAccessStep } = useOnboardingNavigation()
  
  // Your component logic
}
```

## 📋 Onboarding Steps

### Step 1: Restaurant Details
**Route:** `/onboarding/restaurant`

**Collected Data:**
- Restaurant name and description
- Contact information (email, phone, website)
- Business address
- Operating hours for each day
- Service options (delivery, takeout, dine-in)
- Business settings (timezone, currency, tax rate)
- Logo upload (optional)

**Validation:**
- Required fields validation
- Email format validation
- URL format validation
- Operating hours conflict checking

### Step 2: Menu Setup
**Route:** `/onboarding/menu`

**Options:**
1. **Template Selection** - Pre-built menus by cuisine type
2. **CSV Import** - Upload existing menu data
3. **Manual Setup** - Start with blank menu

**CSV Format:**
```csv
name,description,price,category,vegetarian,vegan,glutenfree,allergens,image
Margherita Pizza,Classic pizza with tomato and mozzarella,12.99,Pizza,true,false,false,dairy;gluten,
```

**Features:**
- CSV validation and preview
- Template preview with sample items
- Category auto-creation
- Dietary restriction support
- Error handling and validation

### Step 3: Payment Setup
**Route:** `/onboarding/payment`

**Integration:**
- Stripe Connect Express account creation
- Bank account verification
- Payout schedule configuration
- Account status monitoring
- Test payment processing

**Status Tracking:**
- `pending` - Setup in progress
- `complete` - Ready to accept payments
- `restricted` - Additional verification needed

### Step 4: Launch Checklist
**Route:** `/onboarding/complete`

**Checklist Items:**
- [ ] Place a test order
- [ ] Review menu items
- [ ] Verify operating hours
- [ ] Test payment processing

**Launch Actions:**
- Enable order acceptance
- Generate restaurant URL
- Send welcome email
- Redirect to dashboard

## 🔄 State Management

### Onboarding Status Structure

```typescript
interface OnboardingStatus {
  id: string
  userId: string
  restaurantId?: string
  isComplete: boolean
  currentStep: 'restaurant' | 'menu' | 'payment' | 'complete'
  steps: {
    restaurant?: {
      status: 'pending' | 'in_progress' | 'completed'
      data?: RestaurantSetupData
      completedAt?: Date
    }
    menu?: {
      status: 'pending' | 'in_progress' | 'completed'
      data?: MenuSetupData
      completedAt?: Date
    }
    payment?: {
      status: 'pending' | 'in_progress' | 'completed'
      data?: PaymentSetupData
      completedAt?: Date
    }
    complete?: {
      status: 'pending' | 'in_progress' | 'completed'
      data?: LaunchChecklistData
      completedAt?: Date
    }
  }
  startedAt: Date
  completedAt?: Date
  updatedAt: Date
}
```

### Server Actions

- `initializeOnboarding(userId)` - Start new onboarding
- `getOnboardingStatus(userId)` - Retrieve current status
- `updateOnboardingStep(userId, step, data, status)` - Update step progress
- `completeOnboarding(userId)` - Finalize onboarding
- `resetOnboarding(userId)` - Reset for testing
- `getOnboardingAnalytics()` - Admin analytics

## 📊 Analytics & Monitoring

### Completion Tracking
- Total users started
- Total users completed
- Completion rate percentage
- Average time to complete
- Dropoff analysis by step

### Admin Dashboard Integration

```tsx
import { getOnboardingAnalytics } from '@/lib/onboarding/actions'

async function AdminOnboardingStats() {
  const analytics = await getOnboardingAnalytics()
  
  return (
    <div>
      <h3>Onboarding Analytics</h3>
      <p>Completion Rate: {analytics.data.completionRate}%</p>
      <p>Average Time: {analytics.data.averageTimeHours}h</p>
      {/* More stats */}
    </div>
  )
}
```

### Database Views
- `restaurant_onboarding_overview` - Combined restaurant and onboarding data
- `get_onboarding_analytics()` - Function for analytics queries

## 🎨 UI Components

### Progress Bar
- **`ProgressBar`** - Full progress indicator with step labels
- **`CompactProgressBar`** - Minimal progress bar for headers
- **`StepProgressDots`** - Alternative dot-based indicator

### Form Components
- **`RestaurantSetup`** - Complete restaurant setup form
- **`MenuImport`** - CSV import with validation and preview
- **`OperatingHoursManager`** - Day-by-day hours configuration

### Styling
- Uses Tailwind CSS for styling
- Shadcn/ui components for consistency
- Responsive design with mobile-first approach
- Loading states and skeleton screens
- Error states with helpful messaging

## 🔧 Configuration

### Environment Variables
```env
# Stripe configuration (required for payment setup)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Customization Options

```typescript
// hooks/use-onboarding.tsx
const ONBOARDING_CONFIG = {
  autoSave: true,              // Auto-save progress
  allowSkipSteps: false,       // Allow skipping optional steps
  redirectOnComplete: '/dashboard', // Redirect after completion
  persistenceEnabled: true,    // Local storage persistence
  analyticsEnabled: true,      // Track completion metrics
}
```

## 🧪 Testing

### Test Scenarios
1. **Complete Flow** - Full onboarding from start to finish
2. **Progress Persistence** - Save and resume later
3. **Validation Errors** - Form validation and error handling
4. **CSV Import** - Menu import with various CSV formats
5. **Payment Integration** - Stripe Connect flow
6. **Mobile Responsiveness** - All steps on mobile devices

### Test Data
Use the provided CSV template for menu import testing:
- Download from `/onboarding/menu` page
- Includes sample data with various dietary restrictions
- Tests validation and error handling

## 🚨 Error Handling

### Common Issues
1. **Stripe Connection Timeout** - Retry mechanism implemented
2. **CSV Parse Errors** - Detailed validation messages
3. **Form Validation Failures** - Field-specific error display
4. **Network Issues** - Progress persistence prevents data loss

### Error Recovery
- Auto-save prevents data loss
- Step validation before navigation
- Graceful degradation for optional features
- Clear error messages with resolution steps

## 🔒 Security Considerations

### Data Protection
- Form data validation on client and server
- Supabase Row Level Security (RLS) policies
- User can only access their own onboarding data
- Sensitive payment data handled by Stripe

### Input Validation
- Zod schemas for type safety
- SQL injection prevention
- XSS protection via React
- File upload restrictions (CSV only, size limits)

## 📈 Performance Optimization

### Loading Strategies
- Progressive enhancement
- Skeleton loading states
- Lazy loading for non-critical components
- Optimized images with Next.js Image component

### Caching
- Server action results cached
- Local storage for form persistence
- Supabase query optimization
- Static CSV templates

## 🔧 Troubleshooting

### Common Issues

**Onboarding not initializing:**
- Check user authentication
- Verify OnboardingProvider is wrapped correctly
- Check database permissions

**Stripe integration failing:**
- Verify API keys are correct
- Check webhook endpoints
- Ensure HTTPS in production

**CSV import not working:**
- Check file format (must be CSV)
- Verify required columns exist
- Check file size limits

**Progress not saving:**
- Check network connectivity
- Verify server action permissions
- Check browser local storage

### Debug Commands

```bash
# Check onboarding status in database
psql> SELECT * FROM onboarding_status WHERE user_id = 'user-uuid';

# View restaurant data
psql> SELECT * FROM restaurants WHERE owner_id = 'user-uuid';

# Check operating hours
psql> SELECT * FROM operating_hours WHERE restaurant_id = 'restaurant-uuid';
```

## 🤝 Contributing

### Adding New Steps
1. Create new page component in `app/(platform)/onboarding/`
2. Add step to `OnboardingSteps` type
3. Update `ProgressBar` component
4. Add server action handling
5. Update validation schemas

### Custom Form Fields
1. Add field to form schema
2. Update server action validation
3. Add database migration if needed
4. Update TypeScript types

## 📝 License

This onboarding system is part of the Restaurant SaaS platform and follows the same license terms.