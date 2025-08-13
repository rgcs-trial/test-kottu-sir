'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
  AlertCircle,
  CheckCircle,
  Upload,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Validation Schema for Restaurant Setup
const RestaurantSetupSchema = z.object({
  // Basic Information
  name: z.string().min(1, 'Restaurant name is required'),
  description: z.string().optional(),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(1, 'Phone number is required'),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  
  // Address
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'ZIP code is required'),
  country: z.string().min(1, 'Country is required'),
  
  // Business Settings
  timezone: z.string().min(1, 'Timezone is required'),
  currency: z.string().min(1, 'Currency is required'),
  taxRate: z.number().min(0).max(100, 'Tax rate must be between 0 and 100'),

  // Operating Hours (simplified for onboarding)
  operatingHours: z.object({
    monday: z.object({ isOpen: z.boolean(), openTime: z.string(), closeTime: z.string() }),
    tuesday: z.object({ isOpen: z.boolean(), openTime: z.string(), closeTime: z.string() }),
    wednesday: z.object({ isOpen: z.boolean(), openTime: z.string(), closeTime: z.string() }),
    thursday: z.object({ isOpen: z.boolean(), openTime: z.string(), closeTime: z.string() }),
    friday: z.object({ isOpen: z.boolean(), openTime: z.string(), closeTime: z.string() }),
    saturday: z.object({ isOpen: z.boolean(), openTime: z.string(), closeTime: z.string() }),
    sunday: z.object({ isOpen: z.boolean(), openTime: z.string(), closeTime: z.string() }),
  }),

  // Additional Settings
  acceptsDelivery: z.boolean().default(true),
  acceptsTakeout: z.boolean().default(true),
  acceptsDineIn: z.boolean().default(false),
})

type RestaurantSetupForm = z.infer<typeof RestaurantSetupSchema>

interface RestaurantSetupProps {
  initialData?: Partial<RestaurantSetupForm>
  onSave: (data: RestaurantSetupForm) => void
  onSaveAndContinueLater: (data: RestaurantSetupForm) => void
  loading?: boolean
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

// Days of the week
const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const

/**
 * Restaurant Setup Component
 * Comprehensive form for collecting restaurant information during onboarding
 */
export function RestaurantSetup({
  initialData,
  onSave,
  onSaveAndContinueLater,
  loading = false,
  className
}: RestaurantSetupProps) {
  const [logo, setLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [errors, setErrors] = useState<any>({})

  const form = useForm<RestaurantSetupForm>({
    resolver: zodResolver(RestaurantSetupSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      website: initialData?.website || '',
      street: initialData?.street || '',
      city: initialData?.city || '',
      state: initialData?.state || '',
      zipCode: initialData?.zipCode || '',
      country: initialData?.country || 'United States',
      timezone: initialData?.timezone || 'America/New_York',
      currency: initialData?.currency || 'USD',
      taxRate: initialData?.taxRate || 8.25,
      operatingHours: initialData?.operatingHours || {
        monday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        tuesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        wednesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        thursday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        friday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
        saturday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
        sunday: { isOpen: true, openTime: '10:00', closeTime: '20:00' },
      },
      acceptsDelivery: initialData?.acceptsDelivery ?? true,
      acceptsTakeout: initialData?.acceptsTakeout ?? true,
      acceptsDineIn: initialData?.acceptsDineIn ?? false,
    }
  })

  const { register, handleSubmit, formState: { errors: formErrors, isDirty }, setValue, watch } = form

  // Handle logo upload
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setLogo(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeLogo = () => {
    setLogo(null)
    setLogoPreview('')
  }

  // Handle form submission
  const onSubmit = (data: RestaurantSetupForm) => {
    try {
      setErrors({})
      onSave({ ...data, logo: logoPreview })
    } catch (error) {
      setErrors({ submit: 'Failed to save restaurant information' })
    }
  }

  const onSaveProgress = (data: RestaurantSetupForm) => {
    try {
      setErrors({})
      onSaveAndContinueLater({ ...data, logo: logoPreview })
    } catch (error) {
      setErrors({ submit: 'Failed to save progress' })
    }
  }

  // Copy hours from previous day
  const copyHoursFromPreviousDay = (dayKey: string) => {
    const dayIndex = DAYS_OF_WEEK.findIndex(d => d.key === dayKey)
    if (dayIndex > 0) {
      const previousDay = DAYS_OF_WEEK[dayIndex - 1]
      const previousHours = watch(`operatingHours.${previousDay.key}`)
      setValue(`operatingHours.${dayKey}`, previousHours)
    }
  }

  const setAllDaysHours = () => {
    const mondayHours = watch('operatingHours.monday')
    DAYS_OF_WEEK.slice(1).forEach(day => {
      setValue(`operatingHours.${day.key}`, mondayHours)
    })
  }

  return (
    <div className={cn("space-y-8", className)}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Logo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Restaurant Logo
            </CardTitle>
            <CardDescription>
              Upload your restaurant logo (optional). This will appear on your menu and orders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                {logoPreview ? (
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Store className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Logo
                  </Button>
                  {logoPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeLogo}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Recommended: 200x200px, PNG or JPG, max 5MB
                </p>
              </div>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Tell us about your restaurant
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
                {formErrors.name && (
                  <p className="text-sm text-red-600">{formErrors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="+1 (555) 123-4567"
                />
                {formErrors.phone && (
                  <p className="text-sm text-red-600">{formErrors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Brief description of your restaurant (this will appear on your menu)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Business Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="business@restaurant.com"
                />
                {formErrors.email && (
                  <p className="text-sm text-red-600">{formErrors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  {...register('website')}
                  placeholder="https://www.restaurant.com"
                />
                {formErrors.website && (
                  <p className="text-sm text-red-600">{formErrors.website.message}</p>
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
              Where is your restaurant located?
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
              {formErrors.street && (
                <p className="text-sm text-red-600">{formErrors.street.message}</p>
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
                {formErrors.city && (
                  <p className="text-sm text-red-600">{formErrors.city.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State/Province *</Label>
                <Input
                  id="state"
                  {...register('state')}
                  placeholder="NY"
                />
                {formErrors.state && (
                  <p className="text-sm text-red-600">{formErrors.state.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP/Postal Code *</Label>
                <Input
                  id="zipCode"
                  {...register('zipCode')}
                  placeholder="10001"
                />
                {formErrors.zipCode && (
                  <p className="text-sm text-red-600">{formErrors.zipCode.message}</p>
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
              {formErrors.country && (
                <p className="text-sm text-red-600">{formErrors.country.message}</p>
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
              Configure your business operations
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
              <p className="text-xs text-gray-500">
                Enter tax rate as a percentage (e.g., 8.25 for 8.25%)
              </p>
              {formErrors.taxRate && (
                <p className="text-sm text-red-600">{formErrors.taxRate.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Operating Hours
            </CardTitle>
            <CardDescription>
              Set your restaurant's operating hours (you can adjust these later)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={setAllDaysHours}
              >
                Copy Monday to All Days
              </Button>
            </div>

            <div className="space-y-3">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.key} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="w-20">
                    <Label className="text-sm font-medium">{day.label}</Label>
                  </div>
                  
                  <Switch
                    checked={watch(`operatingHours.${day.key}.isOpen`)}
                    onCheckedChange={(checked) => 
                      setValue(`operatingHours.${day.key}.isOpen`, checked)
                    }
                  />
                  
                  {watch(`operatingHours.${day.key}.isOpen`) ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        {...register(`operatingHours.${day.key}.openTime`)}
                        className="w-32"
                      />
                      <span className="text-sm text-gray-500">to</span>
                      <Input
                        type="time"
                        {...register(`operatingHours.${day.key}.closeTime`)}
                        className="w-32"
                      />
                      {day.key !== 'monday' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyHoursFromPreviousDay(day.key)}
                        >
                          Copy Previous
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1">
                      <span className="text-sm text-gray-500">Closed</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Service Options */}
        <Card>
          <CardHeader>
            <CardTitle>Service Options</CardTitle>
            <CardDescription>
              What types of service do you offer?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <Switch
                  id="acceptsDelivery"
                  checked={watch('acceptsDelivery')}
                  onCheckedChange={(checked) => setValue('acceptsDelivery', checked)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="acceptsDelivery" className="font-medium">
                    Delivery
                  </Label>
                  <p className="text-xs text-gray-600">
                    Deliver food to customers
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <Switch
                  id="acceptsTakeout"
                  checked={watch('acceptsTakeout')}
                  onCheckedChange={(checked) => setValue('acceptsTakeout', checked)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="acceptsTakeout" className="font-medium">
                    Takeout
                  </Label>
                  <p className="text-xs text-gray-600">
                    Customers pick up orders
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <Switch
                  id="acceptsDineIn"
                  checked={watch('acceptsDineIn')}
                  onCheckedChange={(checked) => setValue('acceptsDineIn', checked)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="acceptsDineIn" className="font-medium">
                    Dine-in
                  </Label>
                  <p className="text-xs text-gray-600">
                    Table service available
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions - Hidden as they're handled by parent */}
        <div className="hidden">
          <Button type="submit">Save</Button>
        </div>
      </form>

      {/* External Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <p className="text-sm text-gray-600">
          All fields marked with * are required
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleSubmit(onSaveProgress)}
            disabled={loading}
          >
            Save Progress
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={loading || !isDirty}
          >
            {loading ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </div>

      {errors.submit && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <p className="text-sm text-red-600">{errors.submit}</p>
        </div>
      )}
    </div>
  )
}