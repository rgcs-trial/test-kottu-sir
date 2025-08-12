import { loadStripe, type Stripe } from '@stripe/stripe-js'

// Environment variables validation
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!

if (!stripePublishableKey) {
  throw new Error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable')
}

// Stripe client singleton
let stripePromise: Promise<Stripe | null>

/**
 * Get the Stripe client instance
 * This function creates a singleton instance of Stripe for client-side usage
 */
export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey)
  }
  return stripePromise
}

/**
 * Format amount for Stripe (converts dollars to cents)
 * Stripe expects amounts in the smallest currency unit (cents for USD)
 */
export const formatAmountForStripe = (amount: number, currency: string = 'usd'): number => {
  const formatters = {
    usd: (amt: number) => Math.round(amt * 100), // Convert dollars to cents
    eur: (amt: number) => Math.round(amt * 100), // Convert euros to cents
    gbp: (amt: number) => Math.round(amt * 100), // Convert pounds to pence
    // Add more currencies as needed
  }
  
  const formatter = formatters[currency.toLowerCase() as keyof typeof formatters]
  if (!formatter) {
    throw new Error(`Unsupported currency: ${currency}`)
  }
  
  return formatter(amount)
}

/**
 * Format amount from Stripe (converts cents to dollars)
 */
export const formatAmountFromStripe = (amount: number, currency: string = 'usd'): number => {
  const formatters = {
    usd: (amt: number) => amt / 100, // Convert cents to dollars
    eur: (amt: number) => amt / 100, // Convert cents to euros
    gbp: (amt: number) => amt / 100, // Convert pence to pounds
  }
  
  const formatter = formatters[currency.toLowerCase() as keyof typeof formatters]
  if (!formatter) {
    throw new Error(`Unsupported currency: ${currency}`)
  }
  
  return formatter(amount)
}

/**
 * Format currency for display
 */
export const formatCurrency = (
  amount: number, 
  currency: string = 'usd',
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)
}