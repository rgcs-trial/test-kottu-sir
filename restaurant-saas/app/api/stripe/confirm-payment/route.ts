import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { confirmPaymentAction } from '@/lib/payments/actions'
import { getPaymentIntent, savePaymentMethod } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'

// Request validation schema
const ConfirmPaymentSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
  paymentMethodId: z.string().optional(),
  savePaymentMethod: z.boolean().default(false),
  orderId: z.string().optional(),
  customerDetails: z.object({
    email: z.string().email(),
    name: z.string().min(1),
    phone: z.string().optional(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zipCode: z.string(),
      country: z.string(),
      instructions: z.string().optional(),
    }).optional(),
  }).optional(),
})

type ConfirmPaymentRequest = z.infer<typeof ConfirmPaymentSchema>

interface ConfirmPaymentResponse {
  success: boolean
  data?: {
    paymentIntentId: string
    status: string
    orderId?: string
    requiresAction: boolean
    nextAction?: any
    clientSecret?: string
  }
  error?: string
  code?: string
}

/**
 * POST /api/stripe/confirm-payment
 * Confirm a payment intent and create/update the order
 */
export async function POST(request: NextRequest): Promise<NextResponse<ConfirmPaymentResponse>> {
  try {
    // Get request body
    const body = await request.json()
    
    // Validate request
    const validatedData = ConfirmPaymentSchema.parse(body)
    
    // Get Supabase client
    const supabase = createClient()
    
    // Get payment intent details from Stripe
    const paymentIntent = await getPaymentIntent(validatedData.paymentIntentId)
    
    if (!paymentIntent) {
      return NextResponse.json<ConfirmPaymentResponse>(
        {
          success: false,
          error: 'Payment intent not found',
          code: 'PAYMENT_INTENT_NOT_FOUND',
        },
        { status: 404 }
      )
    }
    
    const { orderId, restaurantId, customerEmail } = paymentIntent.metadata || {}
    
    if (!orderId || !restaurantId) {
      return NextResponse.json<ConfirmPaymentResponse>(
        {
          success: false,
          error: 'Invalid payment intent metadata',
          code: 'INVALID_METADATA',
        },
        { status: 400 }
      )
    }
    
    // For authenticated users, verify they can make this payment
    let user = null
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      user = authUser
    } catch {
      // Guest checkout - continue without authentication
    }
    
    // Get restaurant details
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, name, currency, tax_rate')
      .eq('id', restaurantId)
      .single()
    
    if (!restaurant) {
      return NextResponse.json<ConfirmPaymentResponse>(
        {
          success: false,
          error: 'Restaurant not found',
          code: 'RESTAURANT_NOT_FOUND',
        },
        { status: 404 }
      )
    }
    
    // Confirm the payment
    const confirmResult = await confirmPaymentAction({\n      paymentIntentId: validatedData.paymentIntentId,\n      paymentMethodId: validatedData.paymentMethodId,\n    })\n    \n    if (!confirmResult.success) {\n      return NextResponse.json<ConfirmPaymentResponse>(\n        {\n          success: false,\n          error: confirmResult.error || 'Payment confirmation failed',\n          code: confirmResult.code || 'PAYMENT_CONFIRMATION_ERROR',\n        },\n        { status: 400 }\n      )\n    }\n    \n    // If payment requires additional action (3D Secure), return that info\n    if (confirmResult.data!.requiresAction) {\n      return NextResponse.json<ConfirmPaymentResponse>(\n        {\n          success: true,\n          data: {\n            paymentIntentId: validatedData.paymentIntentId,\n            status: confirmResult.data!.status,\n            orderId,\n            requiresAction: true,\n            nextAction: confirmResult.data!.nextAction,\n            clientSecret: paymentIntent.client_secret || undefined,\n          },\n        },\n        { status: 200 }\n      )\n    }\n    \n    // If payment succeeded, create/update the order\n    if (confirmResult.data!.status === 'succeeded') {\n      try {\n        // Check if order already exists\n        const { data: existingOrder } = await supabase\n          .from('orders')\n          .select('id, status')\n          .eq('id', orderId)\n          .single()\n        \n        const orderData = {\n          restaurant_id: restaurantId,\n          customer_id: user?.id || null,\n          status: 'confirmed' as const,\n          payment_status: 'paid' as const,\n          payment_intent_id: validatedData.paymentIntentId,\n          customer_info: validatedData.customerDetails || {\n            email: customerEmail || paymentIntent.receipt_email,\n            name: paymentIntent.metadata.customerName || 'Guest',\n            phone: paymentIntent.metadata.customerPhone,\n          },\n          delivery_address: validatedData.customerDetails?.address,\n          subtotal: (paymentIntent.amount - (paymentIntent.application_fee_amount || 0)) / 100,\n          tax_amount: 0, // Calculate based on restaurant tax rate\n          delivery_fee: 0,\n          tip_amount: 0,\n          discount_amount: 0,\n          total: paymentIntent.amount / 100,\n          currency: paymentIntent.currency,\n          created_at: new Date().toISOString(),\n          updated_at: new Date().toISOString(),\n        }\n        \n        if (existingOrder) {\n          // Update existing order\n          await supabase\n            .from('orders')\n            .update(orderData)\n            .eq('id', orderId)\n        } else {\n          // Create new order\n          await supabase\n            .from('orders')\n            .insert({\n              id: orderId,\n              order_number: `ORDER-${Date.now()}`,\n              ...orderData,\n            })\n        }\n        \n        // Save payment method if requested and customer exists\n        if (validatedData.savePaymentMethod && validatedData.paymentMethodId && paymentIntent.customer) {\n          try {\n            await savePaymentMethod(\n              paymentIntent.customer as string,\n              validatedData.paymentMethodId\n            )\n          } catch (error) {\n            console.warn('Failed to save payment method:', error)\n            // Don't fail the entire request for this\n          }\n        }\n        \n      } catch (error) {\n        console.error('Error creating/updating order:', error)\n        // Payment succeeded but order creation failed\n        // This needs to be handled carefully in production\n      }\n    }\n    \n    // Log successful payment\n    console.log(`Payment confirmed for order ${orderId}: ${confirmResult.data!.status}`)\n    \n    // Return success response\n    return NextResponse.json<ConfirmPaymentResponse>(\n      {\n        success: true,\n        data: {\n          paymentIntentId: validatedData.paymentIntentId,\n          status: confirmResult.data!.status,\n          orderId,\n          requiresAction: confirmResult.data!.requiresAction,\n          nextAction: confirmResult.data!.nextAction,\n        },\n      },\n      { status: 200 }\n    )\n    \n  } catch (error) {\n    console.error('Error confirming payment:', error)\n    \n    // Handle validation errors\n    if (error instanceof z.ZodError) {\n      return NextResponse.json<ConfirmPaymentResponse>(\n        {\n          success: false,\n          error: error.errors[0]?.message || 'Invalid request data',\n          code: 'VALIDATION_ERROR',\n        },\n        { status: 400 }\n      )\n    }\n    \n    // Handle Stripe errors\n    if (error instanceof Error && error.message.includes('No such payment_intent')) {\n      return NextResponse.json<ConfirmPaymentResponse>(\n        {\n          success: false,\n          error: 'Payment intent not found',\n          code: 'PAYMENT_INTENT_NOT_FOUND',\n        },\n        { status: 404 }\n      )\n    }\n    \n    if (error instanceof Error && error.message.includes('Stripe')) {\n      return NextResponse.json<ConfirmPaymentResponse>(\n        {\n          success: false,\n          error: 'Payment processing error',\n          code: 'STRIPE_ERROR',\n        },\n        { status: 500 }\n      )\n    }\n    \n    // Handle unknown errors\n    return NextResponse.json<ConfirmPaymentResponse>(\n      {\n        success: false,\n        error: 'Internal server error',\n        code: 'INTERNAL_ERROR',\n      },\n      { status: 500 }\n    )\n  }\n}\n\n/**\n * GET /api/stripe/confirm-payment\n * Health check endpoint\n */\nexport async function GET(): Promise<NextResponse> {\n  return NextResponse.json(\n    {\n      message: 'Payment confirmation endpoint',\n      methods: ['POST'],\n      version: '1.0.0',\n    },\n    { status: 200 }\n  )\n}