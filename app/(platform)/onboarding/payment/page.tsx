'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft, 
  ArrowRight, 
  CreditCard, 
  Shield, 
  CheckCircle,
  Clock,
  DollarSign,
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { ProgressBar } from '@/components/onboarding/progress-bar'
import { useOnboarding } from '@/hooks/use-onboarding'
import { useStripe } from '@/hooks/use-stripe'

/**
 * Payment Setup Onboarding Page
 * Step 3: Set up Stripe Connect for payment processing
 */
export default function PaymentOnboardingPage() {
  const router = useRouter()
  const { updateStep, onboardingStatus } = useOnboarding()
  const { createStripeAccount, getAccountStatus } = useStripe()
  const [loading, setLoading] = useState(false)
  const [stripeStatus, setStripeStatus] = useState<any>(null)
  const [checkingStatus, setCheckingStatus] = useState(true)

  // Check existing Stripe account status
  useEffect(() => {
    const checkStripeStatus = async () => {
      try {
        const status = await getAccountStatus()
        setStripeStatus(status)
      } catch (error) {
        console.error('Failed to check Stripe status:', error)
      } finally {
        setCheckingStatus(false)
      }
    }
    
    checkStripeStatus()
  }, [getAccountStatus])

  const handleSetupStripe = async () => {
    try {
      setLoading(true)
      const result = await createStripeAccount()
      
      if (result.accountLink) {
        // Redirect to Stripe onboarding
        window.location.href = result.accountLink
      }
    } catch (error) {
      console.error('Failed to setup Stripe:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = async () => {
    try {
      setLoading(true)
      await updateStep('payment', { stripeAccountId: stripeStatus?.accountId }, 'completed')
      router.push('/onboarding/complete')
    } catch (error) {
      console.error('Failed to continue:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSkipForNow = async () => {
    try {
      setLoading(true)
      await updateStep('payment', { skipped: true }, 'completed')
      router.push('/onboarding/complete')
    } catch (error) {
      console.error('Failed to skip payment setup:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'text-green-600 bg-green-50 border-green-200'
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'restricted': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/onboarding/menu')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Menu Setup
            </Button>
            
            <div className="text-center">
              <h1 className="text-xl font-semibold text-gray-900">Payment Setup</h1>
              <p className="text-sm text-gray-600">Step 3 of 4</p>
            </div>
            
            <div className="w-20"></div>
          </div>
          
          <div className="mt-4">
            <ProgressBar currentStep="payment" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Introduction */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Set up payments
            </h2>
            <p className="text-gray-600">
              Connect your bank account to start accepting payments from customers.
            </p>
          </div>

          {/* Stripe Status Card */}
          {stripeStatus ? (
            <Card className={`mb-8 ${getStatusColor(stripeStatus.status)}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Account Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium">
                      {stripeStatus.status === 'complete' ? 'Account Active' :
                       stripeStatus.status === 'pending' ? 'Setup In Progress' :
                       stripeStatus.status === 'restricted' ? 'Action Required' :
                       'Not Set Up'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {stripeStatus.status === 'complete' ? 'You can accept payments' :
                       stripeStatus.status === 'pending' ? 'Complete your Stripe setup' :
                       stripeStatus.status === 'restricted' ? 'Additional information needed' :
                       'Connect your bank account'}
                    </p>
                  </div>
                  <Badge variant={
                    stripeStatus.status === 'complete' ? 'default' :
                    stripeStatus.status === 'pending' ? 'secondary' : 'destructive'
                  }>
                    {stripeStatus.status}
                  </Badge>
                </div>

                {stripeStatus.status === 'complete' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your payment account is fully set up and ready to process payments!
                    </AlertDescription>
                  </Alert>
                )}

                {stripeStatus.status === 'pending' && stripeStatus.accountLink && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>Complete your Stripe account setup to start accepting payments.</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.href = stripeStatus.accountLink}
                        className="ml-4"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Continue Setup
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {stripeStatus.status === 'restricted' && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your account needs additional verification. Please check your Stripe dashboard.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Connect Your Payment Account
                </CardTitle>
                <CardDescription>
                  We use Stripe to securely process payments and transfer funds to your bank account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stripe Benefits */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white rounded-lg border">
                    <Shield className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h3 className="font-medium text-gray-900 mb-1">Secure & Trusted</h3>
                    <p className="text-sm text-gray-600">Bank-level security with PCI compliance</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border">
                    <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <h3 className="font-medium text-gray-900 mb-1">Competitive Rates</h3>
                    <p className="text-sm text-gray-600">2.9% + 30¢ per transaction</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border">
                    <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <h3 className="font-medium text-gray-900 mb-1">Fast Payouts</h3>
                    <p className="text-sm text-gray-600">Daily automatic transfers</p>
                  </div>
                </div>

                <Button 
                  onClick={handleSetupStripe}
                  disabled={loading}
                  size="lg"
                  className="w-full"
                >
                  {loading ? 'Setting up...' : 'Connect with Stripe'}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  By connecting with Stripe, you agree to their terms of service and privacy policy.
                  This process takes 2-5 minutes to complete.
                </p>
              </CardContent>
            </Card>
          )}

          {/* What happens next */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>What happens after setup?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Start accepting orders</h4>
                    <p className="text-sm text-gray-600">
                      Customers can place orders and pay with credit cards, debit cards, and digital wallets.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Automatic payouts</h4>
                    <p className="text-sm text-gray-600">
                      Funds are transferred to your bank account daily (after initial verification period).
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-purple-100 p-2 rounded-full">
                    <Shield className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Full transaction history</h4>
                    <p className="text-sm text-gray-600">
                      View all payments, fees, and transfers in your dashboard.
                    </p>
                  </div>
                </div>
              </div>
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
                    Payment setup tips
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Have your bank account and routing number ready</li>
                    <li>• Business documents may be required for verification</li>
                    <li>• Initial payouts may take 2-7 business days</li>
                    <li>• You can update payment settings anytime in your dashboard</li>
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
              onClick={() => router.push('/onboarding/menu')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost"
                onClick={handleSkipForNow}
                disabled={loading}
              >
                Skip for Now
              </Button>
              
              <Button 
                onClick={handleContinue}
                disabled={loading || (!stripeStatus && !stripeStatus?.accountId)}
                className="flex items-center gap-2"
              >
                {loading ? 'Processing...' : 'Continue to Launch'}
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