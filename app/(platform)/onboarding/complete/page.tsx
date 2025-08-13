'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft, 
  CheckCircle, 
  ArrowRight,
  Store,
  Globe,
  Download,
  Users,
  MessageCircle,
  BookOpen,
  Rocket,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react'
import { ProgressBar } from '@/components/onboarding/progress-bar'
import { useOnboarding } from '@/hooks/use-onboarding'
import { useAuth } from '@/hooks/use-auth'

/**
 * Onboarding Completion Page
 * Step 4: Launch checklist and go-live preparation
 */
export default function OnboardingCompletePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { completeOnboarding, onboardingStatus } = useOnboarding()
  const [loading, setLoading] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [checklist, setChecklist] = useState([
    { id: 'test-order', label: 'Place a test order', completed: false },
    { id: 'review-menu', label: 'Review your menu items', completed: false },
    { id: 'check-hours', label: 'Verify operating hours', completed: false },
    { id: 'payment-test', label: 'Test payment processing', completed: false },
  ])

  const restaurantUrl = `https://${onboardingStatus?.data?.restaurant?.subdomain}.yourdomain.com`

  const handleChecklistToggle = (id: string) => {
    setChecklist(prev => 
      prev.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    )
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(restaurantUrl)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  const handleGoLive = async () => {
    try {
      setLoading(true)
      await completeOnboarding()
      router.push('/dashboard')
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
    } finally {
      setLoading(false)
    }
  }

  const completedItems = checklist.filter(item => item.completed).length
  const allCompleted = completedItems === checklist.length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/onboarding/payment')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Payment Setup
            </Button>
            
            <div className="text-center">
              <h1 className="text-xl font-semibold text-gray-900">Launch Checklist</h1>
              <p className="text-sm text-gray-600">Step 4 of 4</p>
            </div>
            
            <div className="w-20"></div>
          </div>
          
          <div className="mt-4">
            <ProgressBar currentStep="complete" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Congratulations Header */}
          <div className="text-center mb-8">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              🎉 Congratulations! You're almost ready to launch!
            </h2>
            <p className="text-gray-600">
              Complete the final checklist below to ensure everything is working perfectly.
            </p>
          </div>

          {/* Restaurant URL Card */}
          <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                Your Restaurant Website
              </CardTitle>
              <CardDescription>
                This is your live restaurant URL where customers can place orders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                <div className="flex-1 font-mono text-sm text-gray-700">
                  {restaurantUrl}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyUrl}
                  className="flex items-center gap-2"
                >
                  {copiedUrl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedUrl ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.open(restaurantUrl, '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Visit
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Launch Checklist */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                Launch Checklist
              </CardTitle>
              <CardDescription>
                Complete these steps to ensure your restaurant is ready for customers.
                ({completedItems} of {checklist.length} completed)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {checklist.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <button
                      onClick={() => handleChecklistToggle(item.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        item.completed 
                          ? 'bg-green-500 border-green-500 text-white' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {item.completed && <Check className="h-3 w-3" />}
                    </button>
                    <div className="flex-1">
                      <p className={`font-medium ${item.completed ? 'text-green-700 line-through' : 'text-gray-900'}`}>
                        {item.label}
                      </p>
                    </div>
                    <Badge variant={item.completed ? 'default' : 'secondary'}>
                      {item.completed ? 'Done' : 'Pending'}
                    </Badge>
                  </div>
                ))}
              </div>
              
              <Separator className="my-4" />
              
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  {allCompleted 
                    ? 'Great! All items completed. You\'re ready to go live!' 
                    : `Complete ${checklist.length - completedItems} more items to launch your restaurant.`
                  }
                </p>
                {allCompleted && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-green-800 font-medium">
                      Your restaurant is ready to accept orders!
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks to help you get started with your restaurant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex items-center gap-3 justify-start h-auto p-4"
                  onClick={() => window.open(restaurantUrl, '_blank')}
                >
                  <Store className="h-5 w-5 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium">View Your Restaurant</div>
                    <div className="text-sm text-gray-600">See how customers will see your menu</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="flex items-center gap-3 justify-start h-auto p-4"
                  onClick={() => router.push('/dashboard/menu')}
                >
                  <Download className="h-5 w-5 text-green-600" />
                  <div className="text-left">
                    <div className="font-medium">Manage Menu</div>
                    <div className="text-sm text-gray-600">Add, edit, or organize menu items</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="flex items-center gap-3 justify-start h-auto p-4"
                  onClick={() => router.push('/dashboard/restaurant')}
                >
                  <Users className="h-5 w-5 text-purple-600" />
                  <div className="text-left">
                    <div className="font-medium">Restaurant Settings</div>
                    <div className="text-sm text-gray-600">Update hours, contact info, and more</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="flex items-center gap-3 justify-start h-auto p-4"
                >
                  <BookOpen className="h-5 w-5 text-orange-600" />
                  <div className="text-left">
                    <div className="font-medium">View Documentation</div>
                    <div className="text-sm text-gray-600">Learn about features and best practices</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Support & Resources */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Need help or have questions?
                </h3>
                <p className="text-blue-800 mb-6">
                  Our team is here to support you as you launch your restaurant online.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button variant="outline" className="bg-white">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Live Chat Support
                  </Button>
                  <Button variant="outline" className="bg-white">
                    📞 Schedule Onboarding Call
                  </Button>
                  <Button variant="outline" className="bg-white">
                    📧 Email Support
                  </Button>
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
              onClick={() => router.push('/onboarding/payment')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
                disabled={loading}
              >
                Go to Dashboard
              </Button>
              
              <Button 
                onClick={handleGoLive}
                disabled={loading || !allCompleted}
                size="lg"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Launching...' : '🚀 Go Live!'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-20"></div>
    </div>
  )
}