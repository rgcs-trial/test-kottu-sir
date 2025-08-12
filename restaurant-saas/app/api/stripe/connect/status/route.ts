import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getConnectAccount, isAccountOnboarded, createDashboardLink, getCapabilitiesStatus, formatAccountRequirements } from '@/lib/stripe/connect'
import { createClient } from '@/lib/supabase/server'

// Request validation schema
const StatusRequestSchema = z.object({
  restaurantId: z.string().uuid('Invalid restaurant ID').optional(),
  accountId: z.string().min(1, 'Account ID is required').optional(),
}).refine(
  (data) => data.restaurantId || data.accountId,
  {
    message: 'Either restaurantId or accountId is required',
  }
)

type StatusRequest = z.infer<typeof StatusRequestSchema>

interface StatusResponse {
  success: boolean
  data?: {
    accountId: string
    isOnboarded: boolean
    canAcceptPayments: boolean
    capabilities: {
      cardPayments: string
      transfers: string
      allActive: boolean
    }
    requirements: {
      currentlyDue: string[]
      eventuallyDue: string[]
      pastDue: string[]
      pendingVerification: string[]
    }
    dashboardUrl?: string
    accountDetails?: {
      country: string
      defaultCurrency: string
      email?: string
      businessType?: string
      chargesEnabled: boolean
      payoutsEnabled: boolean
    }
  }
  error?: string
  code?: string
}

/**
 * GET /api/stripe/connect/status?restaurantId=xxx or ?accountId=xxx
 * Get the onboarding status of a Stripe Connect account
 */
export async function GET(request: NextRequest): Promise<NextResponse<StatusResponse>> {
  try {
    const searchParams = request.nextUrl.searchParams
    const restaurantId = searchParams.get('restaurantId')
    const accountId = searchParams.get('accountId')
    
    // Validate request
    const validatedData = StatusRequestSchema.parse({
      restaurantId: restaurantId || undefined,
      accountId: accountId || undefined,
    })
    
    // Get Supabase client
    const supabase = createClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json<StatusResponse>(
        {
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      )
    }
    
    let stripeAccountId: string
    
    // If restaurant ID provided, get account ID from database
    if (validatedData.restaurantId) {
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('stripe_connect_account_id, owner_id')
        .eq('id', validatedData.restaurantId)
        .eq('owner_id', user.id)
        .single()
      
      if (restaurantError || !restaurant) {
        return NextResponse.json<StatusResponse>(
          {
            success: false,
            error: 'Restaurant not found or access denied',
            code: 'RESTAURANT_ACCESS_DENIED',
          },
          { status: 403 }
        )
      }
      
      if (!restaurant.stripe_connect_account_id) {
        return NextResponse.json<StatusResponse>(
          {
            success: false,
            error: 'No Stripe Connect account found for this restaurant',
            code: 'NO_STRIPE_ACCOUNT',
          },
          { status: 404 }
        )
      }
      
      stripeAccountId = restaurant.stripe_connect_account_id
    } else {
      // Use provided account ID
      stripeAccountId = validatedData.accountId!
      
      // TODO: Verify user owns this account (requires additional database lookup)
    }
    
    // Get account details from Stripe
    const account = await getConnectAccount(stripeAccountId)
    
    // Check onboarding status
    const onboardingStatus = await isAccountOnboarded(stripeAccountId)
    
    // Get capabilities status
    const capabilities = getCapabilitiesStatus(account)
    
    // Format requirements
    const requirements = formatAccountRequirements(account)
    
    // Create dashboard link if account is active
    let dashboardUrl: string | undefined
    try {
      if (capabilities.allActive) {
        const dashboardLink = await createDashboardLink(stripeAccountId)
        dashboardUrl = dashboardLink.url
      }
    } catch (error) {
      // Dashboard link creation failed - not critical
      console.warn('Failed to create dashboard link:', error)
    }
    
    // Return status response
    return NextResponse.json<StatusResponse>(
      {
        success: true,
        data: {
          accountId: stripeAccountId,
          isOnboarded: onboardingStatus.isOnboarded,
          canAcceptPayments: onboardingStatus.canAcceptPayments,
          capabilities,
          requirements,
          dashboardUrl,
          accountDetails: {
            country: account.country || 'US',
            defaultCurrency: account.default_currency || 'usd',
            email: account.email || undefined,
            businessType: account.business_type || undefined,
            chargesEnabled: account.charges_enabled || false,
            payoutsEnabled: account.payouts_enabled || false,
          },
        },
      },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Error getting Stripe Connect status:', error)
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json<StatusResponse>(
        {
          success: false,
          error: error.errors[0]?.message || 'Invalid request parameters',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }
    
    // Handle Stripe errors
    if (error instanceof Error && error.message.includes('No such account')) {
      return NextResponse.json<StatusResponse>(
        {
          success: false,
          error: 'Stripe account not found',
          code: 'ACCOUNT_NOT_FOUND',
        },
        { status: 404 }
      )
    }
    
    if (error instanceof Error && error.message.includes('Stripe')) {
      return NextResponse.json<StatusResponse>(
        {
          success: false,
          error: 'Failed to retrieve account status',
          code: 'STRIPE_ERROR',
        },
        { status: 500 }
      )
    }
    
    // Handle unknown errors
    return NextResponse.json<StatusResponse>(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/stripe/connect/status
 * Update account requirements or trigger re-onboarding
 */
export async function POST(request: NextRequest): Promise<NextResponse<StatusResponse>> {
  try {
    const body = await request.json()
    const { restaurantId, action } = body
    
    if (action === 'refresh_requirements') {
      // Re-check account requirements
      return GET(request)
    }
    
    if (action === 'create_onboarding_link') {
      // Redirect to onboarding endpoint
      return NextResponse.json<StatusResponse>(
        {
          success: false,
          error: 'Use /api/stripe/connect/onboard for creating onboarding links',
          code: 'USE_ONBOARDING_ENDPOINT',
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json<StatusResponse>(
      {
        success: false,
        error: 'Invalid action',
        code: 'INVALID_ACTION',
      },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Error processing Stripe Connect status update:', error)
    
    return NextResponse.json<StatusResponse>(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}