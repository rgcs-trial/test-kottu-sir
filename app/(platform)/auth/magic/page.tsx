import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { verifyMagicLinkToken } from '@/lib/auth/index'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface MagicLinkPageProps {
  searchParams: {
    token?: string
    redirect?: string
  }
}

async function MagicLinkPageContent({ searchParams }: MagicLinkPageProps) {
  const { token, redirect: redirectTo } = searchParams

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Invalid Magic Link</CardTitle>
            <CardDescription>
              The magic link is missing or invalid.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  try {
    // Verify the magic link token
    const tokenData = await verifyMagicLinkToken(token)

    if (!tokenData) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-red-600">Expired Magic Link</CardTitle>
              <CardDescription>
                This magic link has expired or is invalid. Please request a new one.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-3">
              <Button asChild>
                <Link href="/login">Request New Magic Link</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Handle login magic link
    if (tokenData.purpose === 'login') {
      // Here you would typically sign in the user automatically
      // For now, we'll redirect to login with the email pre-filled
      const loginUrl = new URL('/login', process.env.NEXT_PUBLIC_APP_URL)
      loginUrl.searchParams.set('email', tokenData.email)
      loginUrl.searchParams.set('magic', 'verified')
      if (redirectTo) {
        loginUrl.searchParams.set('redirect', redirectTo)
      }

      redirect(loginUrl.toString())
    }

    // Handle signup magic link
    if (tokenData.purpose === 'signup') {
      const signupUrl = new URL('/signup', process.env.NEXT_PUBLIC_APP_URL)
      signupUrl.searchParams.set('email', tokenData.email)
      signupUrl.searchParams.set('magic', 'verified')
      if (redirectTo) {
        signupUrl.searchParams.set('redirect', redirectTo)
      }

      redirect(signupUrl.toString())
    }

    // Fallback for unknown purpose
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Magic Link Verified</CardTitle>
            <CardDescription>
              Your magic link has been verified for: {tokenData.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <Button asChild>
              <Link href="/login">Continue to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )

  } catch (error) {
    console.error('Magic link verification error:', error)

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Verification Failed</CardTitle>
            <CardDescription>
              There was an error verifying your magic link. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <Button asChild>
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
}

export default function MagicLinkPage({ searchParams }: MagicLinkPageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">Verifying magic link...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <MagicLinkPageContent searchParams={searchParams} />
    </Suspense>
  )
}

export const metadata = {
  title: 'Magic Link Verification - Kottu',
  description: 'Verifying your magic link authentication',
}