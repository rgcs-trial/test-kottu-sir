'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginFormSchema } from '@/types'
import { useAuth } from '@/contexts/auth-context'

interface LoginFormProps {
  redirectTo?: string
  restaurantId?: string
  showGuestOption?: boolean
}

export function LoginForm({ 
  redirectTo, 
  restaurantId, 
  showGuestOption = false
}: LoginFormProps) {
  const router = useRouter()
  const { login } = useAuth()
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showMagicLink, setShowMagicLink] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    try {
      // Validate form data
      const validatedData = LoginFormSchema.parse(formData)
      
      // Attempt login
      await login(validatedData.email, validatedData.password, validatedData.rememberMe, restaurantId)
      
      // Redirect on success
      if (redirectTo) {
        router.push(redirectTo)
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message
          }
        })
        setErrors(fieldErrors)
      } else if (error instanceof Error) {
        setErrors({ submit: error.message })
      } else {
        setErrors({ submit: 'Login failed. Please try again.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleMagicLink = async () => {
    if (!formData.email) {
      setErrors({ email: 'Email is required for magic link' })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'magic-link',
          email: formData.email,
          purpose: 'login',
          restaurantId,
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        setMagicLinkSent(true)
      } else {
        setErrors({ submit: result.error })
      }
    } catch (error) {
      setErrors({ submit: 'Failed to send magic link' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    try {
      // This would integrate with Supabase social login
      window.location.href = `/api/auth/callback/${provider}?redirect_to=${encodeURIComponent(redirectTo || '/dashboard')}`
    } catch (error) {
      setErrors({ submit: `${provider} login failed` })
    }
  }

  if (magicLinkSent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Check Your Email</CardTitle>
          <CardDescription>
            We've sent a magic link to {formData.email}. Click the link to sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setMagicLinkSent(false)}
          >
            Back to Login
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-md space-y-4">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Social Login Buttons */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleSocialLogin('google')}
              disabled={isLoading}
            >
              <span className="mr-2">🔗</span>
              Continue with Google
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleSocialLogin('facebook')}
              disabled={isLoading}
            >
              <span className="mr-2">📘</span>
              Continue with Facebook
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {!showMagicLink && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link 
                    href="/auth/forgot-password" 
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className={errors.password ? 'border-red-500' : ''}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                disabled={isLoading}
                className="rounded border-gray-300"
              />
              <Label htmlFor="rememberMe" className="text-sm font-normal">
                Remember me for 30 days
              </Label>
            </div>

            {errors.submit && (
              <p className="text-sm text-red-500 text-center">{errors.submit}</p>
            )}

            <div className="space-y-2">
              {showMagicLink ? (
                <Button
                  type="button"
                  onClick={handleMagicLink}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Sending Magic Link...' : 'Send Magic Link'}
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowMagicLink(!showMagicLink)}
                disabled={isLoading}
                className="w-full"
              >
                {showMagicLink ? 'Use Password Instead' : 'Use Magic Link Instead'}
              </Button>
            </div>
          </form>

          {/* Guest Option */}
          {showGuestOption && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // Create guest session and redirect
                  window.location.href = `/restaurants/${restaurantId}/menu?guest=true`
                }}
                disabled={isLoading}
                className="w-full"
              >
                Continue as Guest
              </Button>
            </>
          )}

          {/* Sign Up Link */}
          <div className="text-center text-sm">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}