import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createConnectAccount, createAccountLink } from '@/lib/stripe/connect'
import { createClient } from '@/lib/supabase/server'

// Request validation schema
const OnboardRequestSchema = z.object({
  restaurantId: z.string().uuid('Invalid restaurant ID'),
  businessName: z.string().min(1, 'Business name is required'),
  email: z.string().email('Valid email is required'),
  country: z.string().default('US'),
  returnUrl: z.string().url('Valid return URL is required'),
  refreshUrl: z.string().url('Valid refresh URL is required'),
})

type OnboardRequest = z.infer<typeof OnboardRequestSchema>

interface OnboardResponse {
  success: boolean
  data?: {
    accountId: string
    onboardingUrl: string
  }
  error?: string
  code?: string
}

/**
 * POST /api/stripe/connect/onboard
 * Create a Stripe Connect account and onboarding link for a restaurant
 */
export async function POST(request: NextRequest): Promise<NextResponse<OnboardResponse>> {
  try {
    // Get request body
    const body = await request.json()
    
    // Validate request
    const validatedData = OnboardRequestSchema.parse(body)
    
    // Get Supabase client
    const supabase = createClient()
    
    // Verify user authentication and restaurant ownership
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json<OnboardResponse>(
        {
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      )
    }
    
    // Check if user owns the restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, owner_id, name, email, stripe_connect_account_id')
      .eq('id', validatedData.restaurantId)
      .eq('owner_id', user.id)
      .single()
    
    if (restaurantError || !restaurant) {
      return NextResponse.json<OnboardResponse>(
        {
          success: false,
          error: 'Restaurant not found or access denied',
          code: 'RESTAURANT_ACCESS_DENIED',
        },
        { status: 403 }
      )
    }
    
    // Check if restaurant already has a Stripe Connect account
    if (restaurant.stripe_connect_account_id) {
      return NextResponse.json<OnboardResponse>(
        {
          success: false,
          error: 'Restaurant already has a Stripe Connect account',
          code: 'ACCOUNT_EXISTS',
        },
        { status: 409 }
      )
    }
    
    // Create Stripe Connect account
    const connectAccount = await createConnectAccount({
      email: validatedData.email,
      businessName: validatedData.businessName,
      country: validatedData.country,
      metadata: {
        restaurantId: validatedData.restaurantId,
        restaurantName: restaurant.name,
        ownerId: user.id,
      },
    })
    
    // Create onboarding link
    const accountLink = await createAccountLink({
      accountId: connectAccount.id,
      refreshUrl: validatedData.refreshUrl,
      returnUrl: validatedData.returnUrl,
      type: 'account_onboarding',
    })
    
    // Save Stripe Connect account ID to restaurant record
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({
        stripe_connect_account_id: connectAccount.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validatedData.restaurantId)
    
    if (updateError) {
      console.error('Error updating restaurant with Stripe account:', updateError)
      // Continue anyway - the account was created successfully
    }
    
    // Return success response
    return NextResponse.json<OnboardResponse>(
      {
        success: true,
        data: {
          accountId: connectAccount.id,
          onboardingUrl: accountLink.url,
        },
      },
      { status: 201 }
    )
    
  } catch (error) {
    console.error('Error creating Stripe Connect onboarding:', error)
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json<OnboardResponse>(
        {
          success: false,
          error: error.errors[0]?.message || 'Invalid request data',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }
    
    // Handle Stripe errors
    if (error instanceof Error && error.message.includes('Stripe')) {
      return NextResponse.json<OnboardResponse>(
        {
          success: false,
          error: 'Failed to create Stripe account',
          code: 'STRIPE_ERROR',
        },
        { status: 500 }
      )
    }
    
    // Handle unknown errors
    return NextResponse.json<OnboardResponse>(
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
 * Rate limiting middleware (in production, use Redis or similar)
 */
const rateLimitMap = new Map<string, { count: number; timestamp: number }>()

function checkRateLimit(key: string, maxRequests = 5, windowMs = 60000): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(key)
  
  if (!record || (now - record.timestamp) > windowMs) {
    rateLimitMap.set(key, { count: 1, timestamp: now })
    return true
  }
  
  if (record.count >= maxRequests) {
    return false
  }
  
  record.count++
  return true
}

/**
 * Helper function to get client IP (for rate limiting)
 */
function getClientIP(request: NextRequest): string {
  return request.ip || 
         request.headers.get('x-forwarded-for')?.split(',')[0] || 
         request.headers.get('x-real-ip') || 
         'unknown'
}