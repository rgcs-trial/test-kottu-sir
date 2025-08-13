'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, ArrowRight, Save } from 'lucide-react'
import { ProgressBar } from '@/components/onboarding/progress-bar'
import { RestaurantSetup } from '@/components/onboarding/restaurant-setup'
import { useOnboarding } from '@/hooks/use-onboarding'

/**
 * Restaurant Details Onboarding Page
 * Step 1: Collect restaurant information, address, and business settings
 */
export default function RestaurantOnboardingPage() {
  const router = useRouter()
  const { updateStep, onboardingStatus } = useOnboarding()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<any>(null)

  const handleSave = async (data: any) => {
    try {
      setLoading(true)
      await updateStep('restaurant', data, 'completed')
      // Continue to next step
      router.push('/onboarding/menu')
    } catch (error) {
      console.error('Failed to save restaurant details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAndContinueLater = async (data: any) => {
    try {
      setLoading(true)
      await updateStep('restaurant', data, 'in_progress')
      router.push('/onboarding')
    } catch (error) {
      console.error('Failed to save progress:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/onboarding')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Overview
            </Button>
            
            <div className="text-center">
              <h1 className="text-xl font-semibold text-gray-900">Restaurant Details</h1>
              <p className="text-sm text-gray-600">Step 1 of 4</p>
            </div>
            
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <ProgressBar currentStep="restaurant" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Introduction */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Tell us about your restaurant
            </h2>
            <p className="text-gray-600">
              This information helps us create your restaurant profile and customize your experience.
            </p>
          </div>

          {/* Main Form Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Restaurant Information</CardTitle>
              <CardDescription>
                Fill in your restaurant's basic information, address, and business settings.
                Don't worry - you can always change these later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RestaurantSetup
                initialData={onboardingStatus?.data?.restaurant}
                onSave={handleSave}
                onSaveAndContinueLater={handleSaveAndContinueLater}
                loading={loading}
              />
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  💡
                </div>
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">
                    Tips for getting started
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Use your actual business address for accurate delivery zones</li>
                    <li>• Choose a timezone that matches your location</li>
                    <li>• Set your tax rate to match local requirements</li>
                    <li>• Your restaurant name will appear on customer orders</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <Button 
              variant="outline" 
              onClick={() => router.push('/onboarding')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Overview
            </Button>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline"
                onClick={() => formData && handleSaveAndContinueLater(formData)}
                disabled={!formData || loading}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save & Continue Later
              </Button>
              
              <Button 
                onClick={() => formData && handleSave(formData)}
                disabled={!formData || loading}
                className="flex items-center gap-2"
              >
                {loading ? 'Saving...' : 'Continue to Menu Setup'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom padding to account for fixed navigation */}
      <div className="h-20"></div>
    </div>
  )
}