'use client'

import { useState } from 'react'
import Link from 'next/link'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmailSchema } from '@/lib/auth/index'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    try {
      // Validate email
      EmailSchema.parse(email)
      
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset-password',
          email,
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        setIsSuccess(true)
      } else {
        setErrors({ submit: result.error || 'Failed to send reset email' })
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors({ email: error.errors[0].message })
      } else {
        setErrors({ submit: 'Failed to send reset email' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Link href="/" className="inline-block">
              <h1 className="text-3xl font-bold text-gray-900">Kottu</h1>
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-green-600">Reset Email Sent</CardTitle>
              <CardDescription>
                If an account with {email} exists, we've sent password reset instructions to that email address.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600 space-y-2">
                <p>Please check your email and follow the instructions to reset your password.</p>
                <p>If you don't receive an email within a few minutes:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Check your spam/junk folder</li>
                  <li>Make sure you entered the correct email address</li>
                  <li>Try requesting another reset email</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <Button 
                  className="w-full"
                  onClick={() => {
                    setIsSuccess(false)
                    setEmail('')
                  }}
                >
                  Send Another Email
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <Link href="/login">Back to Login</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-gray-900">Kottu</h1>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (errors.email) {
                      setErrors(prev => ({ ...prev, email: '' }))
                    }
                  }}
                  disabled={isLoading}
                  className={errors.email ? 'border-red-500' : ''}
                  autoFocus
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              {errors.submit && (
                <p className="text-sm text-red-500 text-center">{errors.submit}</p>
              )}

              <Button
                type="submit"
                disabled={isLoading || !email}
                className="w-full"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <div className="text-sm">
                Remember your password?{' '}
                <Link href="/login" className="font-medium text-primary hover:text-primary/80">
                  Sign in
                </Link>
              </div>
              
              <div className="text-sm">
                Don't have an account?{' '}
                <Link href="/signup" className="font-medium text-primary hover:text-primary/80">
                  Sign up
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-gray-500">
          <p>
            For security reasons, we'll send password reset instructions to the email address 
            associated with your account, even if you enter an incorrect email address.
          </p>
        </div>
      </div>
    </div>
  )
}

