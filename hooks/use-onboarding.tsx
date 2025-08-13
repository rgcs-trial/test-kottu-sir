'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { useAuth } from '@/hooks/use-auth'
import {
  initializeOnboarding,
  getOnboardingStatus,
  updateOnboardingStep,
  completeOnboarding,
  resetOnboarding,
  type OnboardingStatus,
  type OnboardingSteps
} from '@/lib/onboarding/actions'

interface OnboardingContextType {
  onboardingStatus: OnboardingStatus | null
  loading: boolean
  error: string | null
  
  // Actions
  initOnboarding: () => Promise<void>
  updateStep: (
    stepName: keyof OnboardingSteps,
    stepData: any,
    status: 'pending' | 'in_progress' | 'completed'
  ) => Promise<void>
  completeOnboarding: () => Promise<void>
  resetOnboarding: () => Promise<void>
  refreshStatus: () => Promise<void>
  
  // Computed properties
  isComplete: boolean
  currentStep: string
  progressPercentage: number
  canAccessStep: (step: keyof OnboardingSteps) => boolean
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

interface OnboardingProviderProps {
  children: React.ReactNode
}

/**
 * Onboarding Provider Component
 * Manages onboarding state across the application
 */
export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { user } = useAuth()
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize or fetch onboarding status
  const initOnboarding = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)

      // First try to get existing status
      const statusResult = await getOnboardingStatus(user.id)
      
      if (statusResult.success && statusResult.data) {
        setOnboardingStatus(statusResult.data)
      } else {
        // Initialize new onboarding
        const initResult = await initializeOnboarding(user.id)
        if (initResult.success && initResult.data) {
          setOnboardingStatus(initResult.data)
        } else {
          throw new Error(initResult.error || 'Failed to initialize onboarding')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load onboarding status')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // Update a specific onboarding step
  const updateStep = useCallback(async (
    stepName: keyof OnboardingSteps,
    stepData: any,
    status: 'pending' | 'in_progress' | 'completed'
  ) => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    try {
      setLoading(true)
      setError(null)

      const result = await updateOnboardingStep(user.id, stepName, stepData, status)
      
      if (result.success && result.data) {
        setOnboardingStatus(result.data)
      } else {
        throw new Error(result.error || 'Failed to update onboarding step')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update step'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // Complete the entire onboarding process
  const completeOnboardingProcess = useCallback(async () => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    try {
      setLoading(true)
      setError(null)

      const result = await completeOnboarding(user.id)
      
      if (result.success && result.data) {
        setOnboardingStatus(result.data)
      } else {
        throw new Error(result.error || 'Failed to complete onboarding')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete onboarding'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // Reset onboarding (for testing or restarting)
  const resetOnboardingProcess = useCallback(async () => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    try {
      setLoading(true)
      setError(null)

      const result = await resetOnboarding(user.id)
      
      if (result.success && result.data) {
        setOnboardingStatus(result.data)
      } else {
        throw new Error(result.error || 'Failed to reset onboarding')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset onboarding'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // Refresh onboarding status
  const refreshStatus = useCallback(async () => {
    if (!user?.id) return

    try {
      setError(null)
      const result = await getOnboardingStatus(user.id)
      
      if (result.success && result.data) {
        setOnboardingStatus(result.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh status')
    }
  }, [user?.id])

  // Computed properties
  const isComplete = onboardingStatus?.isComplete || false
  const currentStep = onboardingStatus?.currentStep || 'restaurant'
  
  const progressPercentage = onboardingStatus ? (() => {
    const steps = ['restaurant', 'menu', 'payment', 'complete']
    const currentIndex = steps.indexOf(currentStep)
    return ((currentIndex + 1) / steps.length) * 100
  })() : 0

  // Check if user can access a specific step
  const canAccessStep = useCallback((step: keyof OnboardingSteps) => {
    if (!onboardingStatus) return false

    const steps = ['restaurant', 'menu', 'payment', 'complete']
    const stepIndex = steps.indexOf(step)
    const currentIndex = steps.indexOf(currentStep)

    // Can access current step or any previous completed step
    return stepIndex <= currentIndex || 
           onboardingStatus.steps[step]?.status === 'completed'
  }, [onboardingStatus, currentStep])

  // Initialize onboarding when user is available
  useEffect(() => {
    if (user) {
      initOnboarding()
    } else {
      setLoading(false)
      setOnboardingStatus(null)
    }
  }, [user, initOnboarding])

  const contextValue: OnboardingContextType = {
    onboardingStatus,
    loading,
    error,
    
    // Actions
    initOnboarding,
    updateStep,
    completeOnboarding: completeOnboardingProcess,
    resetOnboarding: resetOnboardingProcess,
    refreshStatus,
    
    // Computed properties
    isComplete,
    currentStep,
    progressPercentage,
    canAccessStep,
  }

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  )
}

/**
 * useOnboarding Hook
 * Custom hook for accessing onboarding state and actions
 */
export function useOnboarding() {
  const context = useContext(OnboardingContext)
  
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  
  return context
}

/**
 * useOnboardingStep Hook
 * Hook for managing a specific onboarding step
 */
export function useOnboardingStep(stepName: keyof OnboardingSteps) {
  const { onboardingStatus, updateStep, loading, error } = useOnboarding()
  
  const step = onboardingStatus?.steps[stepName]
  const isActive = onboardingStatus?.currentStep === stepName
  const isCompleted = step?.status === 'completed'
  const isInProgress = step?.status === 'in_progress'
  
  const updateStepData = useCallback(async (
    data: any, 
    status: 'pending' | 'in_progress' | 'completed' = 'completed'
  ) => {
    await updateStep(stepName, data, status)
  }, [stepName, updateStep])

  return {
    step,
    isActive,
    isCompleted,
    isInProgress,
    loading,
    error,
    updateStep: updateStepData,
  }
}

/**
 * useOnboardingNavigation Hook
 * Hook for handling navigation between onboarding steps
 */
export function useOnboardingNavigation() {
  const { onboardingStatus, canAccessStep } = useOnboarding()
  
  const steps = [
    { key: 'restaurant' as const, path: '/onboarding/restaurant', label: 'Restaurant Details' },
    { key: 'menu' as const, path: '/onboarding/menu', label: 'Menu Setup' },
    { key: 'payment' as const, path: '/onboarding/payment', label: 'Payment Setup' },
    { key: 'complete' as const, path: '/onboarding/complete', label: 'Launch Checklist' },
  ]

  const currentStepIndex = steps.findIndex(step => step.key === onboardingStatus?.currentStep)
  
  const getNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      return steps[currentStepIndex + 1]
    }
    return null
  }

  const getPreviousStep = () => {
    if (currentStepIndex > 0) {
      return steps[currentStepIndex - 1]
    }
    return null
  }

  const getAccessibleSteps = () => {
    return steps.filter(step => canAccessStep(step.key))
  }

  return {
    steps,
    currentStepIndex,
    getNextStep,
    getPreviousStep,
    getAccessibleSteps,
    canAccessStep,
  }
}

/**
 * useOnboardingPersistence Hook
 * Hook for handling local storage persistence of onboarding data
 */
export function useOnboardingPersistence() {
  const [localData, setLocalData] = useState<Record<string, any>>({})

  // Save step data locally
  const saveStepData = useCallback((stepName: string, data: any) => {
    try {
      const key = `onboarding_${stepName}`
      localStorage.setItem(key, JSON.stringify(data))
      setLocalData(prev => ({ ...prev, [stepName]: data }))
    } catch (error) {
      console.warn('Failed to save onboarding data locally:', error)
    }
  }, [])

  // Load step data from local storage
  const loadStepData = useCallback((stepName: string) => {
    try {
      const key = `onboarding_${stepName}`
      const saved = localStorage.getItem(key)
      if (saved) {
        const data = JSON.parse(saved)
        setLocalData(prev => ({ ...prev, [stepName]: data }))
        return data
      }
    } catch (error) {
      console.warn('Failed to load onboarding data from local storage:', error)
    }
    return null
  }, [])

  // Clear local data
  const clearLocalData = useCallback((stepName?: string) => {
    try {
      if (stepName) {
        const key = `onboarding_${stepName}`
        localStorage.removeItem(key)
        setLocalData(prev => {
          const updated = { ...prev }
          delete updated[stepName]
          return updated
        })
      } else {
        // Clear all onboarding data
        const keys = Object.keys(localStorage).filter(key => key.startsWith('onboarding_'))
        keys.forEach(key => localStorage.removeItem(key))
        setLocalData({})
      }
    } catch (error) {
      console.warn('Failed to clear local onboarding data:', error)
    }
  }, [])

  return {
    localData,
    saveStepData,
    loadStepData,
    clearLocalData,
  }
}

/**
 * Higher-order component for onboarding protection
 * Redirects to onboarding if not completed
 */
export function withOnboardingCheck<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  redirectPath = '/onboarding'
) {
  return function OnboardingProtectedComponent(props: P) {
    const { isComplete, loading } = useOnboarding()
    
    useEffect(() => {
      if (!loading && !isComplete) {
        window.location.href = redirectPath
      }
    }, [loading, isComplete])

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    if (!isComplete) {
      return null // Will redirect
    }

    return <WrappedComponent {...props} />
  }
}