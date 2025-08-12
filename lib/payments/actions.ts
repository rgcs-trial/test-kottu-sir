'use server'

import { z } from 'zod'
import { createOrderPaymentIntent, getOrCreateCustomer, confirmPaymentIntent, createRefund } from '@/lib/stripe/server'
import { formatAmountForStripe, formatAmountFromStripe } from '@/lib/stripe/client'

// Validation schemas
const CreatePaymentIntentSchema = z.object({
  amount: z.number().min(0.5, 'Minimum amount is $0.50'),
  currency: z.string().default('usd'),
  restaurantStripeAccountId: z.string().min(1, 'Restaurant Stripe account is required'),
  orderId: z.string().min(1, 'Order ID is required'),
  customerEmail: z.string().email('Valid email is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().optional(),
  savePaymentMethod: z.boolean().default(false),
  metadata: z.record(z.string()).default({}),
})

const ConfirmPaymentSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
  paymentMethodId: z.string().optional(),
})

const CreateRefundSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
  amount: z.number().positive().optional(),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
})

// Types
export type CreatePaymentIntentInput = z.infer<typeof CreatePaymentIntentSchema>
export type ConfirmPaymentInput = z.infer<typeof ConfirmPaymentSchema>
export type CreateRefundInput = z.infer<typeof CreateRefundSchema>

export interface PaymentActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

/**
 * Create a payment intent for an order
 */
export async function createOrderPaymentAction(
  input: CreatePaymentIntentInput
): Promise<PaymentActionResult<{
  paymentIntentId: string
  clientSecret: string
  customerId: string
  platformFee: number
}>> {
  try {
    // Validate input
    const validatedInput = CreatePaymentIntentSchema.parse(input)
    
    // Convert amount to cents
    const amountInCents = formatAmountForStripe(validatedInput.amount, validatedInput.currency)
    
    // Get or create customer
    const customer = await getOrCreateCustomer({
      email: validatedInput.customerEmail,
      name: validatedInput.customerName,
      phone: validatedInput.customerPhone,
      metadata: {
        orderId: validatedInput.orderId,
        ...validatedInput.metadata,
      },
    })

    // Create payment intent
    const paymentIntent = await createOrderPaymentIntent({
      amount: amountInCents,
      currency: validatedInput.currency,
      restaurantStripeAccountId: validatedInput.restaurantStripeAccountId,
      orderId: validatedInput.orderId,
      customerId: customer.id,
      metadata: {
        customerEmail: validatedInput.customerEmail,
        customerName: validatedInput.customerName,
        savePaymentMethod: validatedInput.savePaymentMethod.toString(),
        ...validatedInput.metadata,
      },
    })

    if (!paymentIntent.client_secret) {
      throw new Error('Failed to create payment intent client secret')
    }

    const platformFee = paymentIntent.application_fee_amount || 0

    return {
      success: true,
      data: {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        customerId: customer.id,
        platformFee: formatAmountFromStripe(platformFee, validatedInput.currency),
      },
    }
  } catch (error) {
    console.error('Error creating payment intent:', error)
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || 'Invalid input data',
        code: 'VALIDATION_ERROR',
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment intent',
      code: 'PAYMENT_INTENT_ERROR',
    }
  }
}

/**
 * Confirm a payment intent
 */
export async function confirmPaymentAction(
  input: ConfirmPaymentInput
): Promise<PaymentActionResult<{
  status: string
  requiresAction: boolean
  nextAction?: any
}>> {
  try {
    // Validate input
    const validatedInput = ConfirmPaymentSchema.parse(input)
    
    // Confirm payment intent
    const paymentIntent = await confirmPaymentIntent(
      validatedInput.paymentIntentId,
      validatedInput.paymentMethodId
    )

    const requiresAction = paymentIntent.status === 'requires_action' ||
                          paymentIntent.status === 'requires_source_action'

    return {
      success: true,
      data: {
        status: paymentIntent.status,
        requiresAction,
        nextAction: requiresAction ? paymentIntent.next_action : undefined,
      },
    }
  } catch (error) {
    console.error('Error confirming payment:', error)
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || 'Invalid input data',
        code: 'VALIDATION_ERROR',
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to confirm payment',
      code: 'PAYMENT_CONFIRMATION_ERROR',
    }
  }
}

/**
 * Create a refund for a payment
 */
export async function createRefundAction(
  input: CreateRefundInput
): Promise<PaymentActionResult<{
  refundId: string
  amount: number
  status: string
  currency: string
}>> {
  try {
    // Validate input
    const validatedInput = CreateRefundSchema.parse(input)
    
    // Convert amount to cents if provided
    const amountInCents = validatedInput.amount 
      ? formatAmountForStripe(validatedInput.amount)
      : undefined

    // Create refund
    const refund = await createRefund(
      validatedInput.paymentIntentId,
      amountInCents,
      validatedInput.reason
    )

    return {
      success: true,
      data: {
        refundId: refund.id,
        amount: formatAmountFromStripe(refund.amount, refund.currency),
        status: refund.status,
        currency: refund.currency,
      },
    }
  } catch (error) {
    console.error('Error creating refund:', error)
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || 'Invalid input data',
        code: 'VALIDATION_ERROR',
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create refund',
      code: 'REFUND_ERROR',
    }
  }
}

/**
 * Calculate order totals including fees
 */
export function calculateOrderTotals({
  subtotal,
  taxRate = 0,
  deliveryFee = 0,
  tipAmount = 0,
  discountAmount = 0,
}: {
  subtotal: number
  taxRate?: number
  deliveryFee?: number
  tipAmount?: number
  discountAmount?: number
}) {
  const taxAmount = subtotal * taxRate
  const total = subtotal + taxAmount + deliveryFee + tipAmount - discountAmount
  const platformFeeRate = 0.03
  const platformFee = total * platformFeeRate
  
  return {
    subtotal,
    taxAmount,
    deliveryFee,
    tipAmount,
    discountAmount,
    platformFee,
    total,
  }
}

/**
 * Validate payment amount against order total
 */
export function validatePaymentAmount(
  paymentAmount: number,
  orderTotal: number,
  tolerance = 0.01
): boolean {
  const difference = Math.abs(paymentAmount - orderTotal)
  return difference <= tolerance
}

/**
 * Format payment status for display
 */
export function formatPaymentStatus(status: string): {
  label: string
  color: 'success' | 'warning' | 'error' | 'info'
  description: string
} {
  switch (status) {
    case 'succeeded':
      return {
        label: 'Paid',
        color: 'success',
        description: 'Payment completed successfully',
      }
    case 'requires_payment_method':
      return {
        label: 'Pending',
        color: 'warning',
        description: 'Waiting for payment method',
      }
    case 'requires_confirmation':
      return {
        label: 'Confirming',
        color: 'info',
        description: 'Payment being confirmed',
      }
    case 'requires_action':
      return {
        label: 'Action Required',
        color: 'warning',
        description: '3D Secure or additional verification needed',
      }
    case 'processing':
      return {
        label: 'Processing',
        color: 'info',
        description: 'Payment is being processed',
      }
    case 'requires_capture':
      return {
        label: 'Authorized',
        color: 'info',
        description: 'Payment authorized, waiting for capture',
      }
    case 'canceled':
      return {
        label: 'Canceled',
        color: 'error',
        description: 'Payment was canceled',
      }
    default:
      return {
        label: 'Unknown',
        color: 'error',
        description: 'Unknown payment status',
      }
  }
}

/**
 * Get payment processing fee information
 */
export function getPaymentFeeInfo(amount: number, currency = 'usd') {
  // Stripe fees: 2.9% + $0.30 for US cards
  const stripePercentageFee = 0.029
  const stripeFixedFee = 0.30
  const platformFeePercentage = 0.03
  
  const stripeFee = (amount * stripePercentageFee) + stripeFixedFee
  const platformFee = amount * platformFeePercentage
  const totalFees = stripeFee + platformFee
  const netAmount = amount - totalFees
  
  return {
    amount,
    stripeFee,
    platformFee,
    totalFees,
    netAmount,
    currency,
  }
}

/**
 * Retry payment with exponential backoff
 */
export async function retryPaymentAction<T>(
  action: () => Promise<PaymentActionResult<T>>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<PaymentActionResult<T>> {
  let lastError: PaymentActionResult<T> | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await action()
      
      if (result.success) {
        return result
      }
      
      // Don't retry validation errors
      if (result.code === 'VALIDATION_ERROR') {
        return result
      }
      
      lastError = result
      
      if (attempt < maxRetries) {
        // Exponential backoff: baseDelay * 2^attempt
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    } catch (error) {
      lastError = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'RETRY_ERROR',
      }
    }
  }
  
  return lastError || {
    success: false,
    error: 'Maximum retry attempts exceeded',
    code: 'MAX_RETRIES_EXCEEDED',
  }
}