'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Loader2, MapPin, User, Phone, Mail, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCart } from '@/hooks/use-cart'
import { createOrder } from '@/lib/cart/actions'
// Simple toast replacement for now
const toast = ({ title, description, variant }: { title: string; description?: string; variant?: string }) => {
  alert(`${title}${description ? ': ' + description : ''}`)
}

// Form validation schemas
const customerInfoSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
})

const deliveryAddressSchema = z.object({
  street: z.string().min(5, 'Please enter a complete street address'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().min(5, 'Please enter a valid ZIP code'),
  country: z.string().default('US'),
  instructions: z.string().optional(),
})

const checkoutFormSchema = z.object({
  customer: customerInfoSchema,
  orderType: z.enum(['pickup', 'delivery']),
  deliveryAddress: deliveryAddressSchema.optional(),
  scheduledTime: z.string().optional(),
  paymentMethod: z.enum(['card', 'cash']),
  notes: z.string().optional(),
})

type CheckoutFormData = z.infer<typeof checkoutFormSchema>

interface CheckoutFormProps {
  restaurantId: string
  restaurantName: string
  onOrderCreated: (orderId: string, orderNumber: string) => void
}

export function CheckoutForm({ restaurantId, restaurantName, onOrderCreated }: CheckoutFormProps) {
  const router = useRouter()
  const {
    items,
    subtotal,
    taxAmount,
    deliveryFee,
    total,
    orderType,
    customerInfo,
    deliveryAddress,
    estimatedTime,
    setOrderType,
    setCustomerInfo,
    setDeliveryAddress,
    setEstimatedTime,
    clearCart
  } = useCart()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableTimes, setAvailableTimes] = useState<string[]>([])

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      customer: {
        name: customerInfo?.name || '',
        email: customerInfo?.email || '',
        phone: customerInfo?.phone || '',
      },
      orderType: orderType,
      deliveryAddress: deliveryAddress ? {
        street: deliveryAddress.street,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        zipCode: deliveryAddress.zipCode,
        country: deliveryAddress.country,
        instructions: deliveryAddress.instructions || '',
      } : undefined,
      scheduledTime: estimatedTime || '',
      paymentMethod: 'card',
      notes: '',
    },
  })

  const watchedOrderType = form.watch('orderType')

  // Update cart context when form values change
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value.customer && (
        value.customer.name !== customerInfo?.name ||
        value.customer.email !== customerInfo?.email ||
        value.customer.phone !== customerInfo?.phone
      )) {
        setCustomerInfo({
          name: value.customer.name || '',
          email: value.customer.email || '',
          phone: value.customer.phone || '',
        })
      }

      if (value.orderType && value.orderType !== orderType) {
        setOrderType(value.orderType)
      }

      if (value.deliveryAddress && value.orderType === 'delivery') {
        setDeliveryAddress({
          street: value.deliveryAddress.street || '',
          city: value.deliveryAddress.city || '',
          state: value.deliveryAddress.state || '',
          zipCode: value.deliveryAddress.zipCode || '',
          country: value.deliveryAddress.country || 'US',
          instructions: value.deliveryAddress.instructions || '',
        })
      }

      if (value.scheduledTime) {
        setEstimatedTime(value.scheduledTime)
      }
    })

    return () => subscription.unsubscribe()
  }, [form, orderType, customerInfo, setOrderType, setCustomerInfo, setDeliveryAddress, setEstimatedTime])

  // Generate available pickup/delivery times
  useEffect(() => {
    const generateAvailableTimes = () => {
      const times = []
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      
      // Start from next 15-minute interval
      let startHour = currentHour
      let startMinute = Math.ceil(currentMinute / 15) * 15
      
      if (startMinute >= 60) {
        startHour += 1
        startMinute = 0
      }
      
      // Add base preparation time (30 minutes)
      startMinute += 30
      if (startMinute >= 60) {
        startHour += Math.floor(startMinute / 60)
        startMinute = startMinute % 60
      }

      // Generate times for next 8 hours
      for (let i = 0; i < 32; i++) {
        const hour = (startHour + Math.floor((startMinute + i * 15) / 60)) % 24
        const minute = (startMinute + i * 15) % 60
        
        if (hour >= 6 && hour <= 23) { // Only between 6 AM and 11 PM
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
          times.push(`${timeString}|${displayTime}`)
        }
      }
      
      setAvailableTimes(['ASAP', ...times])
    }

    generateAvailableTimes()
  }, [])

  const onSubmit = async (data: CheckoutFormData) => {
    if (items.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to your cart before checkout",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const orderRequest = {
        restaurantId,
        items,
        orderType: data.orderType,
        customerInfo: data.customer,
        deliveryAddress: data.orderType === 'delivery' ? data.deliveryAddress : undefined,
        notes: data.notes,
        estimatedTime: data.scheduledTime === 'ASAP' ? undefined : data.scheduledTime,
        subtotal,
        taxAmount,
        deliveryFee: data.orderType === 'delivery' ? deliveryFee : 0,
        total: data.orderType === 'delivery' ? total : subtotal + taxAmount,
      }

      const result = await createOrder(orderRequest)

      if (!result.success) {
        throw new Error(result.error || 'Failed to create order')
      }

      // Clear cart
      clearCart()

      // Show success message
      toast({
        title: "Order placed successfully!",
        description: `Order #${result.orderNumber} has been placed`,
      })

      // Redirect to order tracking
      if (result.orderId) {
        onOrderCreated(result.orderId, result.orderNumber!)
        router.push(`/order/${result.orderId}`)
      }

    } catch (error) {
      console.error('Error placing order:', error)
      toast({
        title: "Failed to place order",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Customer Information */}
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Contact Information</h2>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="customer.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="customer.phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" type="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="customer.email"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="john@example.com" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Order Type */}
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Order Type</h2>
          </div>
          
          <FormField
            control={form.control}
            name="orderType"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={field.value === 'pickup' ? 'default' : 'outline'}
                    onClick={() => field.onChange('pickup')}
                    className="h-16 flex-col"
                  >
                    <div className="font-semibold">Pickup</div>
                    <div className="text-xs opacity-80">Pick up at restaurant</div>
                  </Button>
                  <Button
                    type="button"
                    variant={field.value === 'delivery' ? 'default' : 'outline'}
                    onClick={() => field.onChange('delivery')}
                    className="h-16 flex-col"
                  >
                    <div className="font-semibold">Delivery</div>
                    <div className="text-xs opacity-80">Delivered to you</div>
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Delivery Address (if delivery selected) */}
        {watchedOrderType === 'delivery' && (
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Delivery Address</h3>
            
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="deliveryAddress.street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="deliveryAddress.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="New York" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="deliveryAddress.state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="NY" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="deliveryAddress.zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input placeholder="10001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="deliveryAddress.instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Instructions (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Apartment number, gate code, special instructions..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        {/* Timing */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">
            When would you like your order?
          </h3>
          
          <FormField
            control={form.control}
            name="scheduledTime"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableTimes.map((time) => (
                      <SelectItem key={time} value={time === 'ASAP' ? 'ASAP' : time.split('|')[0]}>
                        {time === 'ASAP' ? 'ASAP (30-45 min)' : time.split('|')[1]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Payment Method */}
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Payment Method</h3>
          </div>
          
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={field.value === 'card' ? 'default' : 'outline'}
                    onClick={() => field.onChange('card')}
                    className="h-16 flex-col"
                  >
                    <div className="font-semibold">Credit Card</div>
                    <div className="text-xs opacity-80">Pay online</div>
                  </Button>
                  <Button
                    type="button"
                    variant={field.value === 'cash' ? 'default' : 'outline'}
                    onClick={() => field.onChange('cash')}
                    className="h-16 flex-col"
                  >
                    <div className="font-semibold">Cash</div>
                    <div className="text-xs opacity-80">Pay {watchedOrderType === 'pickup' ? 'at pickup' : 'on delivery'}</div>
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Special Instructions */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Special Instructions (Optional)</h3>
          
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea 
                    placeholder="Any special requests or notes for the restaurant..."
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting || items.length === 0}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Placing Order...
            </>
          ) : (
            `Place Order • $${total.toFixed(2)}`
          )}
        </Button>
      </form>
    </Form>
  )
}