'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Store, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  DollarSign, 
  Clock,
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { Restaurant, RestaurantSettingsForm, RestaurantSettingsSchema } from '@/types'
import { updateRestaurantSettings, toggleRestaurantStatus } from '@/lib/restaurant/actions'
import { OperatingHoursManager } from './operating-hours'
import { cn } from '@/lib/utils'

interface RestaurantFormProps {
  restaurant: Restaurant
  onUpdate?: (restaurant: Restaurant) => void
  className?: string
}

// Common timezone options
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
]

// Currency options
const CURRENCIES = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'CAD', label: 'Canadian Dollar (C$)' },
  { value: 'AUD', label: 'Australian Dollar (A$)' },
]

/**
 * Restaurant Settings Form Component
 * Comprehensive form for managing restaurant settings
 */
export function RestaurantForm({ restaurant, onUpdate, className }: RestaurantFormProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)

  const form = useForm<RestaurantSettingsForm>({
    resolver: zodResolver(RestaurantSettingsSchema),
    defaultValues: {
      name: restaurant.name,
      description: restaurant.description || '',
      email: restaurant.email,
      phone: restaurant.phone,
      website: restaurant.website || '',
      street: restaurant.address.street,
      city: restaurant.address.city,
      state: restaurant.address.state,
      zipCode: restaurant.address.zipCode,
      country: restaurant.address.country,
      timezone: restaurant.timezone,
      currency: restaurant.currency,
      taxRate: restaurant.taxRate,
    }
  })

  const { register, handleSubmit, formState: { errors, isDirty }, setValue, watch } = form

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const onSubmit = async (data: RestaurantSettingsForm) => {
    try {
      setLoading(true)
      setMessage(null)

      const result = await updateRestaurantSettings(data)
      
      if (result.success && result.data) {
        setMessage({ type: 'success', text: 'Restaurant settings updated successfully!' })
        onUpdate?.(result.data)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update settings' })
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'An unexpected error occurred' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusToggle = async () => {
    try {
      setStatusLoading(true)
      const newStatus = !restaurant.isOnline
      const reason = newStatus ? undefined : 'Temporarily closed'
      
      const result = await toggleRestaurantStatus(newStatus, reason)
      
      if (result.success && result.data) {
        setMessage({ 
          type: 'success', 
          text: `Restaurant is now ${result.data.isOnline ? 'online' : 'offline'}` 
        })
        onUpdate?.(result.data)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update status' })
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to update status' 
      })
    } finally {
      setStatusLoading(false)
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Status Message */}
      {message && (
        <div className={cn(
          "flex items-center gap-2 p-4 rounded-lg",
          message.type === 'success' ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        )}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {message.text}
        </div>
      )}

      {/* Restaurant Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Restaurant Status
          </CardTitle>
          <CardDescription>
            Control your restaurant's online presence and order acceptance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Online Status</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, customers can view your menu and place orders
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge 
                variant={restaurant.isOnline ? 'success' : 'secondary'}
                className="min-w-[60px] justify-center"
              >
                {restaurant.isOnline ? 'Online' : 'Offline'}
              </Badge>
              <Switch
                checked={restaurant.isOnline}
                onCheckedChange={handleStatusToggle}
                disabled={statusLoading}
              />
            </div>
          </div>
          
          {!restaurant.isOnline && restaurant.temporaryClosureReason && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Closure Reason:</strong> {restaurant.temporaryClosureReason}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              General information about your restaurant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Restaurant Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Your Restaurant Name"
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Business Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="business@restaurant.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                {...register('description')}
                placeholder="Brief description of your restaurant"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="+1 (555) 123-4567"
                />
                {errors.phone && (
                  <p className="text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  {...register('website')}
                  placeholder="https://www.restaurant.com"
                />
                {errors.website && (
                  <p className="text-sm text-red-600">{errors.website.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address Information
            </CardTitle>
            <CardDescription>
              Physical location of your restaurant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="street">Street Address *</Label>
              <Input
                id="street"
                {...register('street')}
                placeholder="123 Main Street"
              />
              {errors.street && (
                <p className="text-sm text-red-600">{errors.street.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  {...register('city')}
                  placeholder="New York"
                />
                {errors.city && (
                  <p className="text-sm text-red-600">{errors.city.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State/Province *</Label>
                <Input
                  id="state"
                  {...register('state')}
                  placeholder="NY"
                />
                {errors.state && (
                  <p className="text-sm text-red-600">{errors.state.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP/Postal Code *</Label>
                <Input
                  id="zipCode"
                  {...register('zipCode')}
                  placeholder="10001"
                />
                {errors.zipCode && (
                  <p className="text-sm text-red-600">{errors.zipCode.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                {...register('country')}
                placeholder="United States"
              />
              {errors.country && (
                <p className="text-sm text-red-600">{errors.country.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Business Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Business Settings
            </CardTitle>
            <CardDescription>
              Configure your business operations and pricing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone *</Label>
                <Select 
                  value={watch('timezone')} 
                  onValueChange={(value) => setValue('timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.timezone && (
                  <p className="text-sm text-red-600">{errors.timezone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <Select 
                  value={watch('currency')} 
                  onValueChange={(value) => setValue('currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.currency && (
                  <p className="text-sm text-red-600">{errors.currency.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('taxRate', { valueAsNumber: true })}
                placeholder="8.25"
              />
              <p className="text-xs text-muted-foreground">
                Enter tax rate as a percentage (e.g., 8.25 for 8.25%)
              </p>
              {errors.taxRate && (
                <p className="text-sm text-red-600">{errors.taxRate.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="submit"
            disabled={loading || !isDirty}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>

      {/* Operating Hours Section */}
      <OperatingHoursManager />
    </div>
  )
}

/**
 * Quick Restaurant Status Toggle Component
 * Simplified component for quick status changes
 */
export function RestaurantStatusToggle({ 
  restaurant, 
  onUpdate, 
  className 
}: {
  restaurant: Restaurant
  onUpdate?: (restaurant: Restaurant) => void
  className?: string
}) {
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    try {
      setLoading(true)
      const newStatus = !restaurant.isOnline
      const reason = newStatus ? undefined : 'Temporarily closed'
      
      const result = await toggleRestaurantStatus(newStatus, reason)
      
      if (result.success && result.data) {
        onUpdate?.(result.data)
      }
    } catch (error) {
      console.error('Failed to toggle status:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Badge 
        variant={restaurant.isOnline ? 'success' : 'secondary'}
        className="min-w-[60px] justify-center"
      >
        {restaurant.isOnline ? 'Online' : 'Offline'}
      </Badge>
      <Switch
        checked={restaurant.isOnline}
        onCheckedChange={handleToggle}
        disabled={loading}
      />
      <span className="text-sm text-muted-foreground">
        {restaurant.isOnline ? 'Accepting orders' : 'Not accepting orders'}
      </span>
    </div>
  )
}