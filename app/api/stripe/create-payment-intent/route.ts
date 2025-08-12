import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createOrderPaymentAction } from '@/lib/payments/actions'
import { createClient } from '@/lib/supabase/server'

// Request validation schema
const CreatePaymentIntentSchema = z.object({
  // Order details
  orderId: z.string().uuid('Invalid order ID').optional(),
  restaurantId: z.string().uuid('Invalid restaurant ID'),
  amount: z.number().min(0.5, 'Minimum amount is $0.50'),
  currency: z.string().default('usd'),
  
  // Customer details
  customerEmail: z.string().email('Valid email is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().optional(),
  
  // Order items (for metadata)
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    quantity: z.number(),
  })).optional(),
  
  // Payment options
  savePaymentMethod: z.boolean().default(false),
  
  // Additional metadata
  metadata: z.record(z.string()).default({}),
})

type CreatePaymentIntentRequest = z.infer<typeof CreatePaymentIntentSchema>

interface CreatePaymentIntentResponse {
  success: boolean
  data?: {
    paymentIntentId: string
    clientSecret: string
    customerId: string
    platformFee: number
    amount: number
    currency: string
  }
  error?: string
  code?: string
}

/**
 * POST /api/stripe/create-payment-intent
 * Create a payment intent for an order
 */
export async function POST(request: NextRequest): Promise<NextResponse<CreatePaymentIntentResponse>> {
  try {
    // Get request body
    const body = await request.json()
    
    // Validate request
    const validatedData = CreatePaymentIntentSchema.parse(body)
    
    // Get Supabase client
    const supabase = createClient()
    
    // For guest checkout, user authentication is optional
    let user = null
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      user = authUser
    } catch {
      // Guest checkout - continue without authentication
    }
    
    // Get restaurant details and verify it can accept payments
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, stripe_connect_account_id, status, is_accepting_orders')
      .eq('id', validatedData.restaurantId)
      .single()
    
    if (restaurantError || !restaurant) {
      return NextResponse.json<CreatePaymentIntentResponse>(
        {
          success: false,
          error: 'Restaurant not found',
          code: 'RESTAURANT_NOT_FOUND',
        },
        { status: 404 }
      )
    }
    
    if (restaurant.status !== 'active') {
      return NextResponse.json<CreatePaymentIntentResponse>(
        {
          success: false,
          error: 'Restaurant is not currently active',
          code: 'RESTAURANT_INACTIVE',
        },
        { status: 400 }
      )
    }
    
    if (!restaurant.is_accepting_orders) {
      return NextResponse.json<CreatePaymentIntentResponse>(
        {
          success: false,
          error: 'Restaurant is not currently accepting orders',
          code: 'RESTAURANT_NOT_ACCEPTING_ORDERS',
        },
        { status: 400 }
      )
    }
    
    if (!restaurant.stripe_connect_account_id) {
      return NextResponse.json<CreatePaymentIntentResponse>(
        {
          success: false,
          error: 'Restaurant payment processing not set up',
          code: 'PAYMENT_NOT_SETUP',
        },
        { status: 400 }
      )
    }
    
    // Generate order ID if not provided
    let orderId = validatedData.orderId
    if (!orderId) {
      orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    
    // Create order record if it doesn't exist
    if (validatedData.orderId) {
      // Verify existing order
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id, status, total')
        .eq('id', validatedData.orderId)
        .single()
      
      if (existingOrder && existingOrder.status !== 'pending') {
        return NextResponse.json<CreatePaymentIntentResponse>(
          {
            success: false,
            error: 'Order is not in pending status',
            code: 'ORDER_NOT_PENDING',
          },
          { status: 400 }
        )
      }
      
      if (existingOrder && Math.abs(existingOrder.total - validatedData.amount) > 0.01) {
        return NextResponse.json<CreatePaymentIntentResponse>(
          {
            success: false,
            error: 'Payment amount does not match order total',
            code: 'AMOUNT_MISMATCH',
          },
          { status: 400 }
        )
      }
    }
    
    // Prepare metadata
    const metadata = {
      restaurantId: validatedData.restaurantId,
      restaurantName: restaurant.name,
      customerEmail: validatedData.customerEmail,
      customerName: validatedData.customerName,
      ...(user && { userId: user.id }),
      ...(validatedData.items && { 
        itemsCount: validatedData.items.length.toString(),
        itemsJson: JSON.stringify(validatedData.items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        }))),
      }),
      ...validatedData.metadata,
    }
    
    // Create payment intent
    const result = await createOrderPaymentAction({
      amount: validatedData.amount,
      currency: validatedData.currency,
      restaurantStripeAccountId: restaurant.stripe_connect_account_id,
      orderId,
      customerEmail: validatedData.customerEmail,
      customerName: validatedData.customerName,
      customerPhone: validatedData.customerPhone,
      savePaymentMethod: validatedData.savePaymentMethod,
      metadata,
    })
    
    if (!result.success) {
      return NextResponse.json<CreatePaymentIntentResponse>(
        {
          success: false,
          error: result.error || 'Failed to create payment intent',
          code: result.code || 'PAYMENT_INTENT_ERROR',
        },
        { status: 500 }
      )
    }
    
    // Log payment intent creation for monitoring
    console.log(`Payment intent created for restaurant ${restaurant.name} (${validatedData.restaurantId}): ${result.data!.paymentIntentId}`)
    
    // Return success response
    return NextResponse.json<CreatePaymentIntentResponse>(
      {
        success: true,
        data: {
          ...result.data!,
          amount: validatedData.amount,
          currency: validatedData.currency,
        },
      },
      { status: 201 }
    )
    
  } catch (error) {
    console.error('Error creating payment intent:', error)
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json<CreatePaymentIntentResponse>(
        {
          success: false,
          error: error.errors[0]?.message || 'Invalid request data',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }
    
    // Handle known errors
    if (error instanceof Error) {
      if (error.message.includes('Stripe')) {
        return NextResponse.json<CreatePaymentIntentResponse>(
          {
            success: false,
            error: 'Payment processing error',
            code: 'STRIPE_ERROR',
          },
          { status: 500 }
        )
      }
      
      if (error.message.includes('rate limit')) {
        return NextResponse.json<CreatePaymentIntentResponse>(
          {
            success: false,
            error: 'Too many requests. Please try again later.',
            code: 'RATE_LIMITED',
          },
          { status: 429 }
        )
      }
    }
    
    // Handle unknown errors
    return NextResponse.json<CreatePaymentIntentResponse>(
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
 * GET /api/stripe/create-payment-intent
 * Health check endpoint
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      message: 'Payment intent creation endpoint',
      methods: ['POST'],
      version: '1.0.0',
    },
    { status: 200 }
  )
}