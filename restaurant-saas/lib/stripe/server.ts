import Stripe from 'stripe'

// Environment variables validation
const stripeSecretKey = process.env.STRIPE_SECRET_KEY!
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

if (!stripeWebhookSecret) {
  throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable')
}

/**
 * Server-side Stripe client instance
 * Used for server-side operations like creating payment intents, customers, etc.
 */
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
  typescript: true,
})

/**
 * Subscription price IDs for different tiers
 * These should match the prices created in your Stripe dashboard
 */
export const SUBSCRIPTION_PRICES = {
  basic: process.env.STRIPE_PRICE_ID_BASIC!,
  premium: process.env.STRIPE_PRICE_ID_PREMIUM!,
  enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE!,
} as const

/**
 * Platform fee percentage (3%)
 */
const PLATFORM_FEE_PERCENTAGE = 0.03

/**
 * Calculate platform fee for an order
 */
export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * PLATFORM_FEE_PERCENTAGE)
}

/**
 * Create a payment intent for restaurant orders with platform fee
 */
export async function createOrderPaymentIntent({
  amount,
  currency = 'usd',
  restaurantStripeAccountId,
  orderId,
  customerId,
  metadata = {},
}: {
  amount: number
  currency?: string
  restaurantStripeAccountId: string
  orderId: string
  customerId?: string
  metadata?: Record<string, string>
}): Promise<Stripe.PaymentIntent> {
  try {
    const platformFee = calculatePlatformFee(amount)
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      application_fee_amount: platformFee,
      transfer_data: {
        destination: restaurantStripeAccountId,
      },
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId,
        restaurantStripeAccountId,
        platformFee: platformFee.toString(),
        ...metadata,
      },
    })

    return paymentIntent
  } catch (error) {
    console.error('Error creating order payment intent:', error)
    throw new Error('Failed to create payment intent')
  }
}

/**
 * Create a payment intent for a one-time payment
 */
export async function createPaymentIntent(
  amount: number,
  currency: string = 'usd',
  metadata?: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata,
    })

    return paymentIntent
  } catch (error) {
    console.error('Error creating payment intent:', error)
    throw new Error('Failed to create payment intent')
  }
}

/**
 * Create a Stripe customer
 */
export async function createCustomer(
  email: string,
  name?: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    })

    return customer
  } catch (error) {
    console.error('Error creating Stripe customer:', error)
    throw new Error('Failed to create customer')
  }
}

/**
 * Create a subscription for a customer
 */
export async function createSubscription(
  customerId: string,
  priceId: string,
  metadata?: Record<string, string>
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: priceId,
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata,
    })

    return subscription
  } catch (error) {
    console.error('Error creating subscription:', error)
    throw new Error('Failed to create subscription')
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: !immediately,
      ...(immediately && { cancel_at: Math.floor(Date.now() / 1000) }),
    })

    return subscription
  } catch (error) {
    console.error('Error canceling subscription:', error)
    throw new Error('Failed to cancel subscription')
  }
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  metadata?: Record<string, string>
): Promise<Stripe.Checkout.Session> {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    })

    return session
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw new Error('Failed to create checkout session')
  }
}

/**
 * Create a billing portal session
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return session
  } catch (error) {
    console.error('Error creating billing portal session:', error)
    throw new Error('Failed to create billing portal session')
  }
}

/**
 * Retrieve a customer by ID
 */
export async function getCustomer(customerId: string): Promise<Stripe.Customer | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId)
    return customer as Stripe.Customer
  } catch (error) {
    console.error('Error retrieving customer:', error)
    return null
  }
}

/**
 * Retrieve a subscription by ID
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    return subscription
  } catch (error) {
    console.error('Error retrieving subscription:', error)
    return null
  }
}

/**
 * Verify webhook signature
 */
export function constructWebhookEvent(
  body: string,
  signature: string,
  webhookSecret?: string
): Stripe.Event {
  try {
    const secret = webhookSecret || stripeWebhookSecret
    return stripe.webhooks.constructEvent(body, signature, secret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    throw new Error('Invalid webhook signature')
  }
}

/**
 * Confirm a payment intent
 */
export async function confirmPaymentIntent(
  paymentIntentId: string,
  paymentMethodId?: string
): Promise<Stripe.PaymentIntent> {
  try {
    const confirmed = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    })
    return confirmed
  } catch (error) {
    console.error('Error confirming payment intent:', error)
    throw new Error('Failed to confirm payment')
  }
}

/**
 * Retrieve a payment intent
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    return paymentIntent
  } catch (error) {
    console.error('Error retrieving payment intent:', error)
    throw new Error('Failed to retrieve payment intent')
  }
}

/**
 * Create or retrieve a customer
 */
export async function getOrCreateCustomer({
  email,
  name,
  phone,
  metadata = {},
}: {
  email: string
  name?: string
  phone?: string
  metadata?: Record<string, string>
}): Promise<Stripe.Customer> {
  try {
    // Try to find existing customer by email
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0]
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name,
      phone,
      metadata,
    })

    return customer
  } catch (error) {
    console.error('Error creating/retrieving customer:', error)
    throw new Error('Failed to process customer')
  }
}

/**
 * Save payment method to customer
 */
export async function savePaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  try {
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    })
    return paymentMethod
  } catch (error) {
    console.error('Error saving payment method:', error)
    throw new Error('Failed to save payment method')
  }
}

/**
 * List customer payment methods
 */
export async function getCustomerPaymentMethods(
  customerId: string,
  type: 'card' | 'sepa_debit' | 'ideal' = 'card'
): Promise<Stripe.PaymentMethod[]> {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type,
    })
    return paymentMethods.data
  } catch (error) {
    console.error('Error retrieving payment methods:', error)
    throw new Error('Failed to retrieve payment methods')
  }
}

/**
 * Create a refund
 */
export async function createRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
): Promise<Stripe.Refund> {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
      reason,
    })
    return refund
  } catch (error) {
    console.error('Error creating refund:', error)
    throw new Error('Failed to create refund')
  }
}

/**
 * Handle common webhook events
 */
export const webhookHandlers = {
  'payment_intent.succeeded': async (paymentIntent: Stripe.PaymentIntent) => {
    console.log('Payment succeeded:', paymentIntent.id)
    const { orderId } = paymentIntent.metadata
    if (orderId) {
      // TODO: Update order status to paid in database
      console.log(`Order ${orderId} payment confirmed`)
    }
  },

  'payment_intent.payment_failed': async (paymentIntent: Stripe.PaymentIntent) => {
    console.log('Payment failed:', paymentIntent.id)
    const { orderId } = paymentIntent.metadata
    if (orderId) {
      // TODO: Update order status to payment failed in database
      console.log(`Order ${orderId} payment failed`)
    }
  },

  'payment_intent.requires_action': async (paymentIntent: Stripe.PaymentIntent) => {
    console.log('Payment requires action:', paymentIntent.id)
    const { orderId } = paymentIntent.metadata
    if (orderId) {
      // TODO: Handle 3D Secure or other payment actions
      console.log(`Order ${orderId} requires payment action`)
    }
  },

  'account.updated': async (account: Stripe.Account) => {
    console.log('Connect account updated:', account.id)
    // TODO: Update restaurant account status in database
  },

  'capability.updated': async (capability: Stripe.Capability) => {
    console.log('Account capability updated:', capability.id)
    // TODO: Update restaurant capabilities in database
  },

  'customer.subscription.created': async (subscription: Stripe.Subscription) => {
    console.log('Subscription created:', subscription.id)
    // Handle new subscription
  },

  'customer.subscription.updated': async (subscription: Stripe.Subscription) => {
    console.log('Subscription updated:', subscription.id)
    // Handle subscription changes
  },

  'customer.subscription.deleted': async (subscription: Stripe.Subscription) => {
    console.log('Subscription canceled:', subscription.id)
    // Handle subscription cancellation
  },

  'invoice.payment_succeeded': async (invoice: Stripe.Invoice) => {
    console.log('Invoice payment succeeded:', invoice.id)
    // Handle successful invoice payment
  },

  'invoice.payment_failed': async (invoice: Stripe.Invoice) => {
    console.log('Invoice payment failed:', invoice.id)
    // Handle failed invoice payment
  },

  'transfer.paid': async (transfer: Stripe.Transfer) => {
    console.log('Transfer paid:', transfer.id)
    // Handle successful payout to restaurant
  },

  'payout.paid': async (payout: Stripe.Payout) => {
    console.log('Payout completed:', payout.id)
    // Handle successful payout
  },
}

// Export types for convenience
export type { 
  Stripe,
  PaymentIntent,
  Customer,
  Subscription,
  CheckoutSession,
  BillingPortalSession,
} from 'stripe'