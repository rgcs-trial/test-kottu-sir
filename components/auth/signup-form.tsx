'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RegisterFormSchema } from '@/types'
import { useAuth } from '@/contexts/auth-context'

interface SignupFormProps {
  redirectTo?: string
  userType?: 'customer' | 'restaurant_owner'
  restaurantId?: string
}

export function SignupForm({ 
  redirectTo, 
  userType = 'customer',
  restaurantId 
}: SignupFormProps) {
  const router = useRouter()
  const { register } = useAuth()
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    restaurantName: '',
    subdomain: '',
    acceptTerms: false,
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [selectedUserType, setSelectedUserType] = useState<'customer' | 'restaurant_owner'>(userType)

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

    // Auto-generate subdomain from restaurant name
    if (name === 'restaurantName' && selectedUserType === 'restaurant_owner') {
      const subdomain = value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 30)
      
      setFormData(prev => ({ ...prev, subdomain }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    try {
      // Prepare data based on user type
      const submitData = {
        ...formData,
        role: selectedUserType,
        ...(selectedUserType === 'customer' && restaurantId && { restaurantId }),
      }

      // Validate form data
      const validatedData = RegisterFormSchema.parse(submitData)
      
      // Attempt registration
      await register(validatedData)
      
      setRegistrationSuccess(true)
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
        setErrors({ submit: 'Registration failed. Please try again.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialSignup = async (provider: 'google' | 'facebook') => {
    try {
      window.location.href = `/api/auth/callback/${provider}?signup=true&redirect_to=${encodeURIComponent(redirectTo || '/dashboard')}`
    } catch (error) {
      setErrors({ submit: `${provider} signup failed` })
    }
  }

  const checkSubdomainAvailability = async (subdomain: string) => {
    if (!subdomain || subdomain.length < 3) return

    try {
      const response = await fetch('/api/auth/check-subdomain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain }),
      })

      const result = await response.json()
      
      if (!result.available) {
        setErrors(prev => ({ ...prev, subdomain: 'Subdomain is already taken' }))
      } else {
        setErrors(prev => ({ ...prev, subdomain: '' }))
      }
    } catch (error) {
      console.error('Error checking subdomain:', error)
    }
  }

  if (registrationSuccess) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-green-600">Registration Successful!</CardTitle>
          <CardDescription>
            We've sent a verification email to {formData.email}. 
            Please check your inbox and click the verification link to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            className="w-full"
            onClick={() => router.push('/auth/login')}
          >
            Go to Login
          </Button>
          
          {selectedUserType === 'restaurant_owner' && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Your restaurant will be available at:</p>
              <p className="font-medium text-primary">
                {formData.subdomain}.{process.env.NEXT_PUBLIC_APP_DOMAIN || 'kottu.com'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-md space-y-4">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Create Account</CardTitle>
          <CardDescription>
            {selectedUserType === 'restaurant_owner' 
              ? 'Start your restaurant\'s online presence'
              : 'Join to start ordering and save your favorites'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* User Type Selection (if not preset) */}
          {!restaurantId && (
            <div className="space-y-2">
              <Label>I want to:</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={selectedUserType === 'customer' ? 'default' : 'outline'}
                  onClick={() => setSelectedUserType('customer')}
                  disabled={isLoading}
                  className="text-sm"
                >
                  Order Food
                </Button>
                <Button
                  type="button"
                  variant={selectedUserType === 'restaurant_owner' ? 'default' : 'outline'}
                  onClick={() => setSelectedUserType('restaurant_owner')}
                  disabled={isLoading}
                  className="text-sm"
                >
                  Run Restaurant
                </Button>
              </div>
            </div>
          )}

          {/* Social Signup Buttons */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleSocialSignup('google')}
              disabled={isLoading}
            >
              <span className="mr-2">🔗</span>
              Sign up with Google
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleSocialSignup('facebook')}
              disabled={isLoading}
            >
              <span className="mr-2">📘</span>
              Sign up with Facebook
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

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Personal Information */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className={errors.firstName ? 'border-red-500' : ''}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500">{errors.firstName}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className={errors.lastName ? 'border-red-500' : ''}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoading}
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters with uppercase, lowercase, number, and symbol
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                disabled={isLoading}
                className={errors.confirmPassword ? 'border-red-500' : ''}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Restaurant Information (for restaurant owners) */}
            {selectedUserType === 'restaurant_owner' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="restaurantName">Restaurant Name</Label>
                  <Input
                    id="restaurantName"
                    name="restaurantName"
                    placeholder="Amazing Pizza Co."
                    value={formData.restaurantName}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className={errors.restaurantName ? 'border-red-500' : ''}
                  />
                  {errors.restaurantName && (
                    <p className="text-sm text-red-500">{errors.restaurantName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subdomain">Website Address</Label>
                  <div className="flex items-center">
                    <Input
                      id="subdomain"
                      name="subdomain"
                      placeholder="amazing-pizza"
                      value={formData.subdomain}
                      onChange={handleInputChange}
                      onBlur={() => checkSubdomainAvailability(formData.subdomain)}
                      disabled={isLoading}
                      className={`rounded-r-none ${errors.subdomain ? 'border-red-500' : ''}`}
                    />
                    <div className="px-3 py-2 bg-muted border border-l-0 rounded-r-md text-sm text-muted-foreground">
                      .{process.env.NEXT_PUBLIC_APP_DOMAIN || 'kottu.com'}
                    </div>
                  </div>
                  {errors.subdomain && (
                    <p className="text-sm text-red-500">{errors.subdomain}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Your restaurant will be available at this web address
                  </p>
                </div>
              </>
            )}

            {/* Terms and Conditions */}
            <div className="flex items-start space-x-2">
              <input
                id="acceptTerms"
                name="acceptTerms"
                type="checkbox"
                checked={formData.acceptTerms}
                onChange={handleInputChange}
                disabled={isLoading}
                className="mt-1 rounded border-gray-300"
              />
              <Label htmlFor="acceptTerms" className="text-sm font-normal leading-relaxed">
                I agree to the{' '}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>
            {errors.acceptTerms && (
              <p className="text-sm text-red-500">{errors.acceptTerms}</p>
            )}

            {errors.submit && (
              <p className="text-sm text-red-500 text-center">{errors.submit}</p>
            )}

            <Button
              type="submit"
              disabled={isLoading || !formData.acceptTerms}
              className="w-full"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          {/* Login Link */}
          <div className="text-center text-sm">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}