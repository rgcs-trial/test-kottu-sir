'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'

function LoginPageContent() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || undefined
  const restaurant = searchParams.get('restaurant') || undefined
  const error = searchParams.get('error') || undefined

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-gray-900">Kottu</h1>
          </Link>
          <p className="mt-2 text-sm text-gray-600">
            Restaurant SaaS Platform
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Authentication Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error === 'access_denied' && 'Access was denied. Please try again.'}
                  {error === 'server_error' && 'A server error occurred. Please try again.'}
                  {error === 'temporarily_unavailable' && 'Service is temporarily unavailable. Please try again later.'}
                  {!['access_denied', 'server_error', 'temporarily_unavailable'].includes(error) && 'An error occurred during authentication.'}
                </div>
              </div>
            </div>
          </div>
        )}

        <LoginForm
          redirectTo={redirect}
          restaurantId={restaurant}
          showGuestOption={!!restaurant}
        />

        <div className="text-center space-y-2">
          <div className="text-sm">
            <Link 
              href="/forgot-password"
              className="font-medium text-primary hover:text-primary/80"
            >
              Forgot your password?
            </Link>
          </div>
          
          <div className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link 
              href={`/signup${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
              className="font-medium text-primary hover:text-primary/80"
            >
              Sign up
            </Link>
          </div>

          {restaurant && (
            <div className="text-xs text-gray-500 mt-4">
              <Link 
                href={`/restaurants/${restaurant}`}
                className="hover:text-gray-700"
              >
                ← Back to restaurant
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
}