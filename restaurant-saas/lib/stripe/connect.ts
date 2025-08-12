import Stripe from 'stripe'
import { stripe } from './server'

/**
 * Create a Stripe Connect Express account for a restaurant
 */
export async function createConnectAccount({
  email,
  businessName,
  country = 'US',
  metadata = {},
}: {
  email: string
  businessName: string
  country?: string
  metadata?: Record<string, string>
}): Promise<Stripe.Account> {
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country,
      email,
      business_type: 'company',
      company: {
        name: businessName,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        businessName,
        ...metadata,
      },
    })

    return account
  } catch (error) {
    console.error('Error creating Connect account:', error)
    throw new Error('Failed to create Stripe Connect account')
  }
}

/**
 * Create an onboarding link for a Connect account
 */
export async function createAccountLink({
  accountId,
  refreshUrl,
  returnUrl,
  type = 'account_onboarding',
}: {
  accountId: string
  refreshUrl: string
  returnUrl: string
  type?: 'account_onboarding' | 'account_update'
}): Promise<Stripe.AccountLink> {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type,
    })

    return accountLink
  } catch (error) {
    console.error('Error creating account link:', error)
    throw new Error('Failed to create onboarding link')
  }
}

/**
 * Get Connect account details and capabilities
 */
export async function getConnectAccount(accountId: string): Promise<Stripe.Account> {
  try {
    const account = await stripe.accounts.retrieve(accountId)
    return account
  } catch (error) {
    console.error('Error retrieving Connect account:', error)
    throw new Error('Failed to retrieve account details')
  }
}

/**
 * Check if Connect account is fully onboarded
 */
export async function isAccountOnboarded(accountId: string): Promise<{
  isOnboarded: boolean
  canAcceptPayments: boolean
  requirements: string[]
  pendingVerification: string[]
}> {
  try {
    const account = await getConnectAccount(accountId)
    
    const requirements = account.requirements?.currently_due || []
    const pendingVerification = account.requirements?.pending_verification || []
    
    const canAcceptPayments = account.capabilities?.card_payments === 'active' &&
                            account.capabilities?.transfers === 'active'
    
    const isOnboarded = requirements.length === 0 && 
                       pendingVerification.length === 0 &&
                       canAcceptPayments

    return {
      isOnboarded,
      canAcceptPayments,
      requirements,
      pendingVerification,
    }
  } catch (error) {
    console.error('Error checking account onboarding status:', error)
    return {
      isOnboarded: false,
      canAcceptPayments: false,
      requirements: ['account_retrieval_failed'],
      pendingVerification: [],
    }
  }
}

/**
 * Create a login link for Connect account dashboard
 */
export async function createDashboardLink(accountId: string): Promise<Stripe.LoginLink> {
  try {
    const loginLink = await stripe.accounts.createLoginLink(accountId)
    return loginLink
  } catch (error) {
    console.error('Error creating dashboard link:', error)
    throw new Error('Failed to create dashboard link')
  }
}

/**
 * Update Connect account information
 */
export async function updateConnectAccount(
  accountId: string,
  updates: Stripe.AccountUpdateParams
): Promise<Stripe.Account> {
  try {
    const account = await stripe.accounts.update(accountId, updates)
    return account
  } catch (error) {
    console.error('Error updating Connect account:', error)
    throw new Error('Failed to update account')
  }
}

/**
 * Delete/deactivate a Connect account
 */
export async function deactivateConnectAccount(accountId: string): Promise<Stripe.Account> {
  try {
    const account = await stripe.accounts.update(accountId, {
      metadata: {
        deactivated: 'true',
        deactivated_at: new Date().toISOString(),
      },
    })
    return account
  } catch (error) {
    console.error('Error deactivating Connect account:', error)
    throw new Error('Failed to deactivate account')
  }
}

/**
 * Get account balance and payouts
 */
export async function getAccountBalance(accountId: string): Promise<{
  available: Stripe.Balance.Available[]
  pending: Stripe.Balance.Pending[]
}> {
  try {
    const balance = await stripe.balance.retrieve({
      stripeAccount: accountId,
    })
    
    return {
      available: balance.available,
      pending: balance.pending,
    }
  } catch (error) {
    console.error('Error retrieving account balance:', error)
    return {
      available: [],
      pending: [],
    }
  }
}

/**
 * List payouts for an account
 */
export async function getAccountPayouts(
  accountId: string,
  limit = 10
): Promise<Stripe.Payout[]> {
  try {
    const payouts = await stripe.payouts.list(
      { limit },
      { stripeAccount: accountId }
    )
    return payouts.data
  } catch (error) {
    console.error('Error retrieving payouts:', error)
    return []
  }
}

/**
 * Create a manual payout (if supported)
 */
export async function createPayout(
  accountId: string,
  amount: number,
  currency = 'usd'
): Promise<Stripe.Payout> {
  try {
    const payout = await stripe.payouts.create(
      {
        amount,
        currency,
      },
      { stripeAccount: accountId }
    )
    return payout
  } catch (error) {
    console.error('Error creating payout:', error)
    throw new Error('Failed to create payout')
  }
}

/**
 * Get Connect account capabilities status
 */
export function getCapabilitiesStatus(account: Stripe.Account): {
  cardPayments: string
  transfers: string
  allActive: boolean
} {
  const cardPayments = account.capabilities?.card_payments || 'inactive'
  const transfers = account.capabilities?.transfers || 'inactive'
  
  return {
    cardPayments,
    transfers,
    allActive: cardPayments === 'active' && transfers === 'active',
  }
}

/**
 * Format account requirements for display
 */
export function formatAccountRequirements(account: Stripe.Account): {
  currentlyDue: string[]
  eventuallyDue: string[]
  pastDue: string[]
  pendingVerification: string[]
} {
  const requirements = account.requirements || {}
  
  return {
    currentlyDue: requirements.currently_due || [],
    eventuallyDue: requirements.eventually_due || [],
    pastDue: requirements.past_due || [],
    pendingVerification: requirements.pending_verification || [],
  }
}

/**
 * Check if account can process payments
 */
export function canProcessPayments(account: Stripe.Account): boolean {
  const { allActive } = getCapabilitiesStatus(account)
  const requirements = account.requirements?.currently_due || []
  const pastDue = account.requirements?.past_due || []
  
  return allActive && requirements.length === 0 && pastDue.length === 0
}

// Export types for convenience
export type {
  Account,
  AccountLink,
  LoginLink,
  Payout,
  Balance,
} from 'stripe'