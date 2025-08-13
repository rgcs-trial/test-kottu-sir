'use client'

import { CheckCircle, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  currentStep: 'restaurant' | 'menu' | 'payment' | 'complete'
  className?: string
}

/**
 * Onboarding Progress Bar Component
 * Shows visual progress through the multi-step onboarding flow
 */
export function ProgressBar({ currentStep, className }: ProgressBarProps) {
  const steps = [
    { key: 'restaurant', label: 'Restaurant', number: 1 },
    { key: 'menu', label: 'Menu', number: 2 },
    { key: 'payment', label: 'Payment', number: 3 },
    { key: 'complete', label: 'Launch', number: 4 },
  ]

  const currentStepIndex = steps.findIndex(step => step.key === currentStep)

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStepIndex) return 'completed'
    if (stepIndex === currentStepIndex) return 'current'
    return 'upcoming'
  }

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100 border-green-300'
      case 'current':
        return 'text-blue-600 bg-blue-100 border-blue-300'
      default:
        return 'text-gray-400 bg-gray-50 border-gray-200'
    }
  }

  const getConnectorColor = (stepIndex: number) => {
    return stepIndex < currentStepIndex ? 'bg-green-300' : 'bg-gray-200'
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(index)
          const isLast = index === steps.length - 1

          return (
            <div key={step.key} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex items-center">
                <div 
                  className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                    getStepColor(status)
                  )}
                >
                  {status === 'completed' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : status === 'current' ? (
                    <div className="w-3 h-3 bg-blue-600 rounded-full" />
                  ) : (
                    <span className="text-sm font-medium">{step.number}</span>
                  )}
                </div>
                
                {/* Step Label - Hidden on mobile */}
                <div className="ml-3 hidden sm:block">
                  <p className={cn(
                    "text-sm font-medium transition-colors duration-300",
                    status === 'completed' ? 'text-green-600' :
                    status === 'current' ? 'text-blue-600' : 'text-gray-400'
                  )}>
                    {step.label}
                  </p>
                  <p className={cn(
                    "text-xs transition-colors duration-300",
                    status === 'completed' ? 'text-green-500' :
                    status === 'current' ? 'text-blue-500' : 'text-gray-400'
                  )}>
                    Step {step.number}
                  </p>
                </div>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className="flex-1 mx-4">
                  <div 
                    className={cn(
                      "h-0.5 transition-all duration-300",
                      getConnectorColor(index)
                    )}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile Step Labels */}
      <div className="flex justify-between mt-2 sm:hidden">
        {steps.map((step, index) => {
          const status = getStepStatus(index)
          return (
            <div key={`${step.key}-mobile`} className="text-center flex-1">
              <p className={cn(
                "text-xs font-medium",
                status === 'completed' ? 'text-green-600' :
                status === 'current' ? 'text-blue-600' : 'text-gray-400'
              )}>
                {step.label}
              </p>
            </div>
          )
        })}
      </div>

      {/* Progress Percentage */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{Math.round(((currentStepIndex + 1) / steps.length) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
            style={{ 
              width: `${((currentStepIndex + 1) / steps.length) * 100}%` 
            }}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Compact Progress Bar Component
 * Minimal version for use in headers or constrained spaces
 */
export function CompactProgressBar({ currentStep, className }: ProgressBarProps) {
  const steps = ['restaurant', 'menu', 'payment', 'complete']
  const currentStepIndex = steps.findIndex(step => step === currentStep)
  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100

  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-between text-xs text-gray-600 mb-2">
        <span>Step {currentStepIndex + 1} of {steps.length}</span>
        <span>{Math.round(progressPercentage)}% Complete</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Step Progress Dots Component
 * Alternative dot-based progress indicator
 */
export function StepProgressDots({ currentStep, className }: ProgressBarProps) {
  const steps = ['restaurant', 'menu', 'payment', 'complete']
  const currentStepIndex = steps.findIndex(step => step === currentStep)

  return (
    <div className={cn("flex items-center justify-center space-x-2", className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStepIndex
        const isCurrent = index === currentStepIndex
        
        return (
          <div
            key={step}
            className={cn(
              "w-3 h-3 rounded-full transition-all duration-300",
              isCompleted ? 'bg-green-500' :
              isCurrent ? 'bg-blue-500' : 'bg-gray-300'
            )}
          />
        )
      })}
    </div>
  )
}