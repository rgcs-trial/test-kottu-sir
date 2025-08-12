'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GuestCheckoutInfoSchema } from '@/lib/auth/guest'
import type { GuestCart, OrderType } from '@/types'

interface GuestCheckoutProps {
  cart: GuestCart
  restaurantId: string
  onSuccess?: (orderId: string) => void
  onLoginRedirect?: () => void
}

export function GuestCheckout({ 
  cart, 
  restaurantId, 
  onSuccess,
  onLoginRedirect 
}: GuestCheckoutProps) {
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    // Customer Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    
    // Order Details
    orderType: 'delivery' as OrderType,
    
    // Delivery Address
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    instructions: '',
    
    // Preferences
    notes: '',
    acceptEmails: false,
    acceptSms: false,
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateAccount, setShowCreateAccount] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
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
      const checkoutInfo = GuestCheckoutInfoSchema.parse({
        customerInfo: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
        },
        orderType: formData.orderType,
        deliveryAddress: formData.orderType === 'delivery' ? {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
          instructions: formData.instructions,
        } : undefined,
        notes: formData.notes,
        marketing: {
          acceptEmails: formData.acceptEmails,
          acceptSms: formData.acceptSms,
        },
      })

      // Process checkout
      const response = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId: cart.id,
          sessionId: cart.sessionId,
          checkoutInfo,
          isGuest: true,
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        if (onSuccess) {
          onSuccess(result.orderId)
        } else {
          router.push(`/orders/${result.orderId}/confirmation`)
        }
      } else {
        setErrors({ submit: result.error || 'Checkout failed' })
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.errors.forEach((err) => {
          const path = err.path.join('.')
          fieldErrors[path] = err.message
        })
        setErrors(fieldErrors)
      } else if (error instanceof Error) {
        setErrors({ submit: error.message })
      } else {
        setErrors({ submit: 'Checkout failed. Please try again.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const calculateTotal = () => {
    const deliveryFee = formData.orderType === 'delivery' ? 5.00 : 0
    return cart.total + deliveryFee
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Login Prompt */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">Have an account?</h3>
              <p className="text-sm text-blue-700">
                Sign in to save your order history and speed up future orders
              </p>
            </div>
            <Button
              variant="outline"
              onClick={onLoginRedirect}
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              Sign In
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Checkout Form */}
      <Card>
        <CardHeader>
          <CardTitle>Checkout Details</CardTitle>
          <CardDescription>
            Complete your order information below
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Contact Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className={errors['customerInfo.firstName'] ? 'border-red-500' : ''}
                  />
                  {errors['customerInfo.firstName'] && (
                    <p className="text-sm text-red-500">{errors['customerInfo.firstName']}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className={errors['customerInfo.lastName'] ? 'border-red-500' : ''}
                  />
                  {errors['customerInfo.lastName'] && (
                    <p className="text-sm text-red-500">{errors['customerInfo.lastName']}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className={errors['customerInfo.email'] ? 'border-red-500' : ''}
                />
                {errors['customerInfo.email'] && (
                  <p className="text-sm text-red-500">{errors['customerInfo.email']}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  We'll send your order confirmation here
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className={errors['customerInfo.phone'] ? 'border-red-500' : ''}
                />
                {errors['customerInfo.phone'] && (
                  <p className="text-sm text-red-500">{errors['customerInfo.phone']}</p>
                )}
              </div>
            </div>

            {/* Order Type */}
            <div className="space-y-4">
              <h3 className="font-semibold">Order Type</h3>
              
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={formData.orderType === 'delivery' ? 'default' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, orderType: 'delivery' }))}
                  disabled={isLoading}
                  className="text-sm"
                >
                  🚚 Delivery
                </Button>
                <Button
                  type="button"
                  variant={formData.orderType === 'takeout' ? 'default' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, orderType: 'takeout' }))}
                  disabled={isLoading}
                  className="text-sm"
                >
                  📦 Takeout
                </Button>
                <Button
                  type="button"
                  variant={formData.orderType === 'dine_in' ? 'default' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, orderType: 'dine_in' }))}
                  disabled={isLoading}
                  className="text-sm"
                >
                  🍽️ Dine In
                </Button>
              </div>
            </div>

            {/* Delivery Address */}
            {formData.orderType === 'delivery' && (
              <div className="space-y-4">
                <h3 className="font-semibold">Delivery Address</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="street">Street Address *</Label>
                  <Input
                    id="street"
                    name="street"
                    value={formData.street}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className={errors['deliveryAddress.street'] ? 'border-red-500' : ''}
                  />
                  {errors['deliveryAddress.street'] && (
                    <p className="text-sm text-red-500">{errors['deliveryAddress.street']}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className={errors['deliveryAddress.city'] ? 'border-red-500' : ''}
                    />
                    {errors['deliveryAddress.city'] && (
                      <p className="text-sm text-red-500">{errors['deliveryAddress.city']}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className={errors['deliveryAddress.state'] ? 'border-red-500' : ''}
                    />
                    {errors['deliveryAddress.state'] && (
                      <p className="text-sm text-red-500">{errors['deliveryAddress.state']}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code *</Label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className={`max-w-32 ${errors['deliveryAddress.zipCode'] ? 'border-red-500' : ''}`}
                  />
                  {errors['deliveryAddress.zipCode'] && (
                    <p className="text-sm text-red-500">{errors['deliveryAddress.zipCode']}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructions">Delivery Instructions</Label>
                  <textarea
                    id="instructions"
                    name="instructions"
                    value={formData.instructions}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    rows={3}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm"
                    placeholder="Leave at door, ring bell, etc."
                  />
                </div>
              </div>
            )}

            {/* Order Notes */}
            <div className="space-y-4">
              <h3 className="font-semibold">Special Instructions</h3>
              <div className="space-y-2">
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  rows={3}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  placeholder="Any special requests or allergies..."
                />
              </div>
            </div>

            {/* Marketing Preferences */}
            <div className="space-y-4">
              <h3 className="font-semibold">Stay Updated</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    id="acceptEmails"
                    name="acceptEmails"
                    type="checkbox"
                    checked={formData.acceptEmails}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="acceptEmails" className="text-sm font-normal">
                    Email me about order updates and special offers
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    id="acceptSms"
                    name="acceptSms"
                    type="checkbox"
                    checked={formData.acceptSms}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="acceptSms" className="text-sm font-normal">
                    Text me order updates (carrier charges may apply)
                  </Label>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${cart.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>${cart.taxAmount.toFixed(2)}</span>
                </div>
                {formData.orderType === 'delivery' && (
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>$5.00</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-base border-t pt-2">
                  <span>Total</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>

            {errors.submit && (
              <p className="text-sm text-red-500 text-center">{errors.submit}</p>
            )}

            <div className="space-y-3">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? 'Processing...' : `Place Order - $${calculateTotal().toFixed(2)}`}
              </Button>
              
              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateAccount(!showCreateAccount)}
                  disabled={isLoading}
                  className="text-sm"
                >
                  {showCreateAccount ? 'Continue as guest' : 'Create account after order'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account Creation Prompt */}
      {showCreateAccount && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-green-900">Save Time on Future Orders</h3>
              <p className="text-sm text-green-700">
                After placing your order, we'll offer to create an account with your information 
                so you can reorder easily and track your order history.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}