'use client'

import { Receipt, MapPin, Clock, User } from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { CartItemSummary } from '@/components/cart/cart-item'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface OrderSummaryProps {
  restaurantName: string
  restaurantSlug: string
  isSticky?: boolean
}

export function OrderSummary({ restaurantName, restaurantSlug, isSticky = false }: OrderSummaryProps) {
  const {
    items,
    itemCount,
    subtotal,
    taxAmount,
    deliveryFee,
    total,
    orderType,
    customerInfo,
    deliveryAddress,
    estimatedTime
  } = useCart()

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6 text-center">
        <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
        <p className="text-gray-500 mb-4">Add some items to see your order summary</p>
        <Link href={`/${restaurantSlug}/menu`}>
          <Button>Browse Menu</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border ${isSticky ? 'sticky top-4' : ''}`}>
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Receipt className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Order Summary</h2>
        </div>
        <p className="text-sm text-gray-600">
          {itemCount} item{itemCount !== 1 ? 's' : ''} from {restaurantName}
        </p>
      </div>

      {/* Order Details */}
      <div className="p-6 space-y-6">
        {/* Order Type & Timing */}
        <div className="flex items-start gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            {orderType === 'delivery' ? <MapPin className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm">
              {orderType === 'delivery' ? 'Delivery' : 'Pickup'}
            </div>
            <div className="text-sm text-gray-600">
              {estimatedTime ? (
                estimatedTime === 'ASAP' ? 'ASAP (30-45 min)' : 
                `Scheduled for ${new Date(`2000-01-01T${estimatedTime}`).toLocaleTimeString([], { 
                  hour: 'numeric', 
                  minute: '2-digit', 
                  hour12: true 
                })}`
              ) : 'ASAP (30-45 min)'}
            </div>
            
            {/* Delivery Address */}
            {orderType === 'delivery' && deliveryAddress && (
              <div className="text-sm text-gray-600 mt-1">
                {deliveryAddress.street}<br />
                {deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.zipCode}
              </div>
            )}
          </div>
        </div>

        {/* Customer Info */}
        {customerInfo && (
          <div className="flex items-start gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">Contact</div>
              <div className="text-sm text-gray-600">
                {customerInfo.name}<br />
                {customerInfo.phone}<br />
                {customerInfo.email}
              </div>
            </div>
          </div>
        )}

        {/* Items */}
        <div>
          <h3 className="font-medium text-sm mb-3">Items</h3>
          <div className="space-y-2">
            {items.map((item) => (
              <CartItemSummary key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Order Totals */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          
          {deliveryFee > 0 && (
            <div className="flex justify-between text-sm">
              <span>Delivery Fee</span>
              <span>${deliveryFee.toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span>Tax</span>
            <span>${taxAmount.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-base font-bold border-t pt-2">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Estimated Total Time */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-sm font-medium text-blue-900">
            Estimated {orderType === 'delivery' ? 'Delivery' : 'Pickup'} Time
          </div>
          <div className="text-sm text-blue-700">
            {estimatedTime && estimatedTime !== 'ASAP' ? (
              new Date(`2000-01-01T${estimatedTime}`).toLocaleTimeString([], { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
              })
            ) : (
              '30-45 minutes'
            )}
          </div>
        </div>

        {/* Restaurant Info */}
        <div className="text-xs text-gray-500 border-t pt-4">
          <div className="font-medium">{restaurantName}</div>
          <div>Questions? Contact the restaurant directly.</div>
        </div>
      </div>
    </div>
  )
}

// Simplified version for mobile checkout
export function OrderSummaryMobile({ restaurantName, restaurantSlug }: OrderSummaryProps) {
  const { items, itemCount, total } = useCart()

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40 md:hidden">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{itemCount} items</div>
          <div className="text-sm text-gray-600">{restaurantName}</div>
        </div>
        <div className="font-bold text-lg">${total.toFixed(2)}</div>
      </div>
    </div>
  )
}

// Expanded summary for cart page
export function OrderSummaryExpanded({ restaurantName, restaurantSlug }: OrderSummaryProps) {
  const {
    items,
    itemCount,
    subtotal,
    taxAmount,
    deliveryFee,
    total,
    orderType,
    validationErrors,
    canCheckout
  } = useCart()

  return (
    <div className="bg-white rounded-lg border">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Order Summary</h2>
            <p className="text-sm text-gray-600 mt-1">
              {itemCount} item{itemCount !== 1 ? 's' : ''} from {restaurantName}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">${total.toFixed(2)}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="p-6">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Subtotal ({itemCount} items)</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          
          {orderType === 'delivery' && deliveryFee > 0 && (
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>${deliveryFee.toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span>Estimated Tax</span>
            <span>${taxAmount.toFixed(2)}</span>
          </div>
          
          <div className="border-t pt-3 flex justify-between text-lg font-bold">
            <span>Order Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-800 text-sm space-y-1">
              {validationErrors.map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
            </div>
          </div>
        )}

        {/* Checkout Button */}
        <Link href={`/${restaurantSlug}/checkout`} className="block mt-6">
          <Button 
            size="lg" 
            className="w-full"
            disabled={!canCheckout}
          >
            {canCheckout ? 'Proceed to Checkout' : 'Cannot Checkout'}
          </Button>
        </Link>

        {/* Continue Shopping */}
        <Link href={`/${restaurantSlug}/menu`} className="block mt-3">
          <Button variant="outline" size="lg" className="w-full">
            Continue Shopping
          </Button>
        </Link>
      </div>
    </div>
  )
}