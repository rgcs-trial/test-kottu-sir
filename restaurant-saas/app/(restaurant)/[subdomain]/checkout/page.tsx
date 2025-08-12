'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useRestaurantPublic } from '@/hooks/use-restaurant-public'
import { CartProvider } from '@/hooks/use-cart'
import { CheckoutForm } from '@/components/checkout/checkout-form'
import { OrderSummary } from '@/components/checkout/order-summary'

interface CheckoutPageProps {
  params: {
    subdomain: string
  }
}

function CheckoutPageContent({ params }: CheckoutPageProps) {
  const { restaurant, loading, error } = useRestaurantPublic(params.subdomain)
  const [orderCreated, setOrderCreated] = useState(false)

  const handleOrderCreated = (orderId: string, orderNumber: string) => {
    setOrderCreated(true)
    // Additional handling could go here (analytics, etc.)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="space-y-8">
            <div className="h-8 bg-gray-300 rounded w-1/4 animate-pulse"></div>
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg border p-6">
                    <div className="h-6 bg-gray-300 rounded w-1/3 animate-pulse mb-4"></div>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-300 rounded w-full animate-pulse"></div>
                      <div className="h-4 bg-gray-300 rounded w-3/4 animate-pulse"></div>
                      <div className="h-4 bg-gray-300 rounded w-1/2 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg border p-6">
                  <div className="h-6 bg-gray-300 rounded w-1/2 animate-pulse mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-300 rounded w-full animate-pulse"></div>
                    <div className="h-4 bg-gray-300 rounded w-2/3 animate-pulse"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/2 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Checkout</h1>
          <p className="text-gray-600 mb-6">
            {error || "There was an error loading the checkout page. Please try again."}
          </p>
          <Link href={`/${params.subdomain}/cart`}>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Return to Cart
            </button>
          </Link>
        </div>
      </div>
    )
  }

  if (orderCreated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your order. You'll receive a confirmation email shortly and can track your order status.
          </p>
          <div className="space-y-3">
            <Link href={`/${params.subdomain}`} className="block">
              <button className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
                Return to Restaurant
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/${params.subdomain}/cart`}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Cart
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600 mt-1">Complete your order from {restaurant.name}</p>
        </div>

        {/* Checkout Content */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <CheckoutForm
              restaurantId={restaurant.id}
              restaurantName={restaurant.name}
              onOrderCreated={handleOrderCreated}
            />
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <OrderSummary 
                restaurantName={restaurant.name} 
                restaurantSlug={params.subdomain}
                isSticky={true}
              />
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-12 bg-gray-100 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-7V6a3 3 0 0 0-6 0v1H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1V6a3 3 0 0 0-3 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Secure Checkout</h3>
              <p className="text-sm text-gray-600">
                Your personal information and payment details are protected with industry-standard encryption. 
                We never store your payment information on our servers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage({ params }: CheckoutPageProps) {
  return (
    <CartProvider restaurantId="temp-id">
      <CheckoutPageContent params={params} />
    </CartProvider>
  )
}

// Metadata is handled by the layout component for client components