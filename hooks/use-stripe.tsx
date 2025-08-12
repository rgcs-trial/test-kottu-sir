'use client'

import { useCallback, useEffect, useState } from 'react'
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js'
import { getStripe } from '@/lib/stripe/client'

// Stripe hook return type
interface UseStripeReturn {
  stripe: Stripe | null
  isLoading: boolean
  error: string | null
}

/**
 * Hook to load and manage Stripe instance
 */
export function useStripe(): UseStripeReturn {
  const [stripe, setStripe] = useState<Stripe | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    let isMounted = true
    
    const loadStripeInstance = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const stripeInstance = await getStripe()
        
        if (isMounted) {
          if (stripeInstance) {
            setStripe(stripeInstance)
          } else {
            setError('Failed to load Stripe')
          }
          setIsLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load Stripe')
          setIsLoading(false)
        }
      }
    }
    
    loadStripeInstance()
    
    return () => {
      isMounted = false
    }
  }, [])
  
  return { stripe, isLoading, error }
}

// Stripe Elements hook types
interface UseStripeElementsReturn {
  elements: StripeElements | null
  stripe: Stripe | null
  isReady: boolean
  error: string | null
}

/**
 * Hook to manage Stripe Elements
 */
export function useStripeElements(): UseStripeElementsReturn {
  const [elements, setElements] = useState<StripeElements | null>(null)
  const [stripe, setStripe] = useState<Stripe | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const initialize = useCallback(async (clientSecret: string, options?: any) => {
    try {
      setError(null)
      setIsReady(false)
      
      const stripeInstance = await getStripe()
      if (!stripeInstance) {
        throw new Error('Failed to load Stripe')
      }
      
      const elementsInstance = stripeInstance.elements({
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#0570de',
            colorBackground: '#ffffff',
            colorText: '#30313d',
            colorDanger: '#df1b41',
            fontFamily: 'Inter, system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '8px',
          },
        },
        ...options,
      })
      
      setStripe(stripeInstance)
      setElements(elementsInstance)
      setIsReady(true)
    } catch (err) {\n      setError(err instanceof Error ? err.message : 'Failed to initialize Stripe Elements')\n    }\n  }, [])\n  \n  return { elements, stripe, isReady, error, initialize }\n}\n\n// Payment method types\ninterface SavedPaymentMethod {\n  id: string\n  type: string\n  card?: {\n    brand: string\n    last4: string\n    exp_month: number\n    exp_year: number\n  }\n  created: number\n}\n\ninterface UsePaymentMethodsReturn {\n  paymentMethods: SavedPaymentMethod[]\n  isLoading: boolean\n  error: string | null\n  refresh: () => Promise<void>\n  deletePaymentMethod: (paymentMethodId: string) => Promise<void>\n}\n\n/**\n * Hook to manage saved payment methods\n */\nexport function usePaymentMethods(customerId?: string): UsePaymentMethodsReturn {\n  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([])\n  const [isLoading, setIsLoading] = useState(false)\n  const [error, setError] = useState<string | null>(null)\n  \n  const fetchPaymentMethods = useCallback(async () => {\n    if (!customerId) {\n      setPaymentMethods([])\n      return\n    }\n    \n    try {\n      setIsLoading(true)\n      setError(null)\n      \n      const response = await fetch(`/api/stripe/payment-methods?customerId=${customerId}`)\n      const data = await response.json()\n      \n      if (!response.ok) {\n        throw new Error(data.error || 'Failed to fetch payment methods')\n      }\n      \n      setPaymentMethods(data.paymentMethods || [])\n    } catch (err) {\n      setError(err instanceof Error ? err.message : 'Failed to load payment methods')\n      setPaymentMethods([])\n    } finally {\n      setIsLoading(false)\n    }\n  }, [customerId])\n  \n  const deletePaymentMethod = useCallback(async (paymentMethodId: string) => {\n    try {\n      setError(null)\n      \n      const response = await fetch('/api/stripe/payment-methods', {\n        method: 'DELETE',\n        headers: {\n          'Content-Type': 'application/json',\n        },\n        body: JSON.stringify({ paymentMethodId }),\n      })\n      \n      const data = await response.json()\n      \n      if (!response.ok) {\n        throw new Error(data.error || 'Failed to delete payment method')\n      }\n      \n      // Remove from local state\n      setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId))\n    } catch (err) {\n      setError(err instanceof Error ? err.message : 'Failed to delete payment method')\n      throw err\n    }\n  }, [])\n  \n  const refresh = useCallback(async () => {\n    await fetchPaymentMethods()\n  }, [fetchPaymentMethods])\n  \n  useEffect(() => {\n    fetchPaymentMethods()\n  }, [fetchPaymentMethods])\n  \n  return {\n    paymentMethods,\n    isLoading,\n    error,\n    refresh,\n    deletePaymentMethod,\n  }\n}\n\n// Connect account types\ninterface ConnectAccountStatus {\n  accountId: string\n  isOnboarded: boolean\n  canAcceptPayments: boolean\n  capabilities: {\n    cardPayments: string\n    transfers: string\n    allActive: boolean\n  }\n  requirements: {\n    currentlyDue: string[]\n    eventuallyDue: string[]\n    pastDue: string[]\n    pendingVerification: string[]\n  }\n  dashboardUrl?: string\n}\n\ninterface UseConnectAccountReturn {\n  account: ConnectAccountStatus | null\n  isLoading: boolean\n  error: string | null\n  refresh: () => Promise<void>\n  createOnboardingLink: (data: {\n    businessName: string\n    email: string\n    returnUrl: string\n    refreshUrl: string\n  }) => Promise<{ accountId: string; onboardingUrl: string }>\n}\n\n/**\n * Hook to manage Stripe Connect account\n */\nexport function useConnectAccount(restaurantId: string): UseConnectAccountReturn {\n  const [account, setAccount] = useState<ConnectAccountStatus | null>(null)\n  const [isLoading, setIsLoading] = useState(false)\n  const [error, setError] = useState<string | null>(null)\n  \n  const fetchAccountStatus = useCallback(async () => {\n    if (!restaurantId) return\n    \n    try {\n      setIsLoading(true)\n      setError(null)\n      \n      const response = await fetch(`/api/stripe/connect/status?restaurantId=${restaurantId}`)\n      const data = await response.json()\n      \n      if (response.ok && data.success) {\n        setAccount(data.data)\n      } else if (response.status === 404 && data.code === 'NO_STRIPE_ACCOUNT') {\n        // Restaurant doesn't have a Stripe account yet\n        setAccount(null)\n      } else {\n        throw new Error(data.error || 'Failed to fetch account status')\n      }\n    } catch (err) {\n      setError(err instanceof Error ? err.message : 'Failed to load account status')\n      setAccount(null)\n    } finally {\n      setIsLoading(false)\n    }\n  }, [restaurantId])\n  \n  const createOnboardingLink = useCallback(async (data: {\n    businessName: string\n    email: string\n    returnUrl: string\n    refreshUrl: string\n  }) => {\n    try {\n      setError(null)\n      \n      const response = await fetch('/api/stripe/connect/onboard', {\n        method: 'POST',\n        headers: {\n          'Content-Type': 'application/json',\n        },\n        body: JSON.stringify({\n          restaurantId,\n          ...data,\n        }),\n      })\n      \n      const result = await response.json()\n      \n      if (!response.ok) {\n        throw new Error(result.error || 'Failed to create onboarding link')\n      }\n      \n      return result.data\n    } catch (err) {\n      setError(err instanceof Error ? err.message : 'Failed to create onboarding link')\n      throw err\n    }\n  }, [restaurantId])\n  \n  const refresh = useCallback(async () => {\n    await fetchAccountStatus()\n  }, [fetchAccountStatus])\n  \n  useEffect(() => {\n    fetchAccountStatus()\n  }, [fetchAccountStatus])\n  \n  return {\n    account,\n    isLoading,\n    error,\n    refresh,\n    createOnboardingLink,\n  }\n}\n\n// Utility hooks\nexport function useStripeError() {\n  const formatError = useCallback((error: any): string => {\n    if (typeof error === 'string') return error\n    \n    if (error?.type) {\n      switch (error.type) {\n        case 'card_error':\n          return error.message || 'Your card was declined.'\n        case 'validation_error':\n          return error.message || 'Please check your card details.'\n        case 'api_error':\n          return 'A processing error occurred. Please try again.'\n        case 'authentication_error':\n          return 'Authentication failed. Please try again.'\n        case 'rate_limit_error':\n          return 'Too many requests. Please wait and try again.'\n        default:\n          return error.message || 'An unexpected error occurred.'\n      }\n    }\n    \n    if (error?.message) {\n      return error.message\n    }\n    \n    return 'An unexpected error occurred. Please try again.'\n  }, [])\n  \n  return { formatError }\n}\n\n// Export types\nexport type {\n  UseStripeReturn,\n  UseStripeElementsReturn,\n  SavedPaymentMethod,\n  UsePaymentMethodsReturn,\n  ConnectAccountStatus,\n  UseConnectAccountReturn,\n}