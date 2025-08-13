'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Store, 
  ChefHat, 
  CreditCard, 
  CheckCircle, 
  ArrowRight,
  Clock,
  Users,
  DollarSign,
  Globe
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useOnboarding } from '@/hooks/use-onboarding'

/**
 * Main Onboarding Page - Welcome and Step Overview
 * Shows onboarding progress and allows navigation to different steps
 */
export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { onboardingStatus, loading } = useOnboarding()

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Redirect if onboarding is complete
  useEffect(() => {
    if (onboardingStatus?.isComplete) {
      router.push('/dashboard')
    }
  }, [onboardingStatus, router])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const steps = [
    {
      id: 'restaurant',
      title: 'Restaurant Details',
      description: 'Set up your restaurant information and business details',
      icon: Store,
      status: onboardingStatus?.steps.restaurant || 'pending',
      estimatedTime: '5 minutes',
      href: '/onboarding/restaurant'
    },
    {
      id: 'menu',
      title: 'Menu Setup',
      description: 'Create your menu with items, categories, and pricing',
      icon: ChefHat,
      status: onboardingStatus?.steps.menu || 'pending',
      estimatedTime: '10 minutes',
      href: '/onboarding/menu'
    },
    {
      id: 'payment',
      title: 'Payment Setup',
      description: 'Connect your bank account and configure payment processing',
      icon: CreditCard,
      status: onboardingStatus?.steps.payment || 'pending',
      estimatedTime: '5 minutes',
      href: '/onboarding/payment'
    },
    {
      id: 'complete',
      title: 'Launch Checklist',
      description: 'Review your setup and go live with your restaurant',
      icon: CheckCircle,
      status: onboardingStatus?.steps.complete || 'pending',
      estimatedTime: '3 minutes',
      href: '/onboarding/complete'
    }
  ]

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200'
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStepBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default'
      case 'in_progress': return 'secondary'
      default: return 'outline'
    }
  }

  const completedSteps = steps.filter(step => step.status === 'completed').length
  const progressPercentage = (completedSteps / steps.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        {/* Welcome Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Your Restaurant Platform!
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Let's get your restaurant set up and ready to accept orders. 
            This should take about 20-25 minutes to complete.
          </p>
          
          {/* Progress Overview */}
          <div className="mt-8 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Overall Progress</span>
              <span className="text-sm font-medium text-gray-900">
                {completedSteps} of {steps.length} completed
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-lg p-6 shadow-sm border text-center">
            <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">~25</div>
            <div className="text-sm text-gray-600">Minutes Total</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border text-center">
            <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">24/7</div>
            <div className="text-sm text-gray-600">Support Available</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border text-center">
            <DollarSign className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">2.9%</div>
            <div className="text-sm text-gray-600">Processing Fee</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border text-center">
            <Globe className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">Live</div>
            <div className="text-sm text-gray-600">In Minutes</div>
          </div>
        </div>

        {/* Onboarding Steps */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Let's Get Started
          </h2>
          
          <div className="space-y-6">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isCompleted = step.status === 'completed'
              const isInProgress = step.status === 'in_progress'
              const isAvailable = isCompleted || isInProgress || (index === 0) || steps[index - 1]?.status === 'completed'

              return (
                <Card 
                  key={step.id} 
                  className={`transition-all duration-200 hover:shadow-md ${
                    isAvailable ? 'cursor-pointer' : 'opacity-50'
                  } ${getStepColor(step.status)}`}
                >
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full mr-4 ${
                      isCompleted ? 'bg-green-100' : isInProgress ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Icon className={`h-6 w-6 ${
                        isCompleted ? 'text-green-600' : isInProgress ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold">
                          {step.title}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStepBadgeVariant(step.status)}>
                            {step.status === 'completed' ? 'Completed' : 
                             step.status === 'in_progress' ? 'In Progress' : 
                             isAvailable ? 'Ready' : 'Locked'}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {step.estimatedTime}
                          </span>
                        </div>
                      </div>
                      <CardDescription className="mt-1">
                        {step.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-4">Step {index + 1} of {steps.length}</span>
                        {isCompleted && (
                          <span className="text-green-600 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Completed
                          </span>
                        )}
                      </div>
                      <Button
                        onClick={() => isAvailable && router.push(step.href)}
                        disabled={!isAvailable}
                        variant={isCompleted ? "outline" : "default"}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        {isCompleted ? 'Review' : isInProgress ? 'Continue' : 'Start'}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Help Section */}
          <div className="mt-12 bg-white rounded-lg p-8 shadow-sm border">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Need Help Getting Started?
              </h3>
              <p className="text-gray-600 mb-6">
                Our support team is here to help you every step of the way.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" size="lg">
                  📞 Schedule a Call
                </Button>
                <Button variant="outline" size="lg">
                  💬 Live Chat
                </Button>
                <Button variant="outline" size="lg">
                  📚 View Documentation
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}