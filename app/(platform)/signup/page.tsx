import { Suspense } from 'react'
import Link from 'next/link'
import { SignupForm } from '@/components/auth/signup-form'

interface SignupPageProps {
  searchParams: {
    redirect?: string
    type?: 'customer' | 'restaurant_owner'
    restaurant?: string
  }
}

function SignupPageContent({ searchParams }: SignupPageProps) {
  const userType = searchParams.type || 'customer'
  const isRestaurantSignup = userType === 'restaurant_owner'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-gray-900">Kottu</h1>
          </Link>
          <p className="mt-2 text-sm text-gray-600">
            {isRestaurantSignup 
              ? 'Start your restaurant online' 
              : 'Join the Kottu community'
            }
          </p>
        </div>

        {/* Feature highlights */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            {isRestaurantSignup ? 'Restaurant Features:' : 'Customer Benefits:'}
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            {isRestaurantSignup ? (
              <>
                <li>• Online ordering system</li>
                <li>• Menu management</li>
                <li>• Order tracking & analytics</li>
                <li>• Staff management tools</li>
              </>
            ) : (
              <>
                <li>• Fast & easy ordering</li>
                <li>• Save favorite restaurants</li>
                <li>• Order history & reordering</li>
                <li>• Exclusive deals & offers</li>
              </>
            )}
          </ul>
        </div>

        <SignupForm
          redirectTo={searchParams.redirect}
          userType={userType}
          restaurantId={searchParams.restaurant}
        />

        <div className="text-center space-y-2">
          <div className="text-sm">
            Already have an account?{' '}
            <Link 
              href={`/login${searchParams.redirect ? `?redirect=${encodeURIComponent(searchParams.redirect)}` : ''}`}
              className="font-medium text-primary hover:text-primary/80"
            >
              Sign in
            </Link>
          </div>

          {!isRestaurantSignup && (
            <div className="text-sm">
              Want to add your restaurant?{' '}
              <Link 
                href="/signup?type=restaurant_owner"
                className="font-medium text-primary hover:text-primary/80"
              >
                Restaurant signup
              </Link>
            </div>
          )}

          {searchParams.restaurant && (
            <div className="text-xs text-gray-500 mt-4">
              <Link 
                href={`/restaurants/${searchParams.restaurant}`}
                className="hover:text-gray-700"
              >
                ← Back to restaurant
              </Link>
            </div>
          )}
        </div>

        {/* Terms and Privacy Links */}
        <div className="text-center text-xs text-gray-500 space-x-4">
          <Link href="/terms" className="hover:text-gray-700">
            Terms of Service
          </Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-gray-700">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage({ searchParams }: SignupPageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <SignupPageContent searchParams={searchParams} />
    </Suspense>
  )
}

// Page metadata
export const metadata = {
  title: 'Sign Up - Kottu',
  description: 'Create your Kottu account',
}