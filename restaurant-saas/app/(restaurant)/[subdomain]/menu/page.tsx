'use client'

import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useRestaurantPublic } from '@/hooks/use-restaurant-public'
import { CartProvider, useCart } from '@/hooks/use-cart'
import { CustomerMenu } from '@/components/menu/customer-menu'
import { CartSidebar } from '@/components/cart/cart-sidebar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface MenuPageProps {
  params: {
    subdomain: string
  }
}

function MenuPageContent({ params }: MenuPageProps) {
  const { restaurant, menu, loading, error, isOpen, isAcceptingOrders } = useRestaurantPublic(params.subdomain)
  const { itemCount, total } = useCart()
  const [isCartOpen, setIsCartOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header Skeleton */}
        <div className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="h-8 bg-gray-300 rounded w-1/3 animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-1/4 animate-pulse"></div>
          </div>
        </div>
        
        {/* Content Skeleton */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4">
                <div className="h-6 bg-gray-300 rounded w-1/4 animate-pulse"></div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {[1, 2].map((j) => (
                    <div key={j} className="flex gap-4 p-4 border rounded-xl">
                      <div className="w-24 h-24 bg-gray-300 rounded-lg animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-gray-300 rounded w-3/4 animate-pulse"></div>
                        <div className="h-4 bg-gray-300 rounded w-full animate-pulse"></div>
                        <div className="h-4 bg-gray-300 rounded w-1/3 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Restaurant Not Found</h1>
          <p className="text-gray-600">
            {error || "The restaurant you're looking for doesn't exist or is temporarily unavailable."}
          </p>
        </div>
      </div>
    )
  }

  if (menu.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold text-gray-900">{restaurant.name} Menu</h1>
            <p className="text-gray-600 mt-1">No menu items available at the moment</p>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Menu Coming Soon</h2>
          <p className="text-gray-600">We're working on adding our delicious menu items. Please check back soon!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{restaurant.name} Menu</h1>
              <div className="flex items-center gap-3 mt-1">
                <Badge 
                  variant={isOpen ? "default" : "secondary"}
                  className={isOpen ? "bg-green-600" : "bg-red-600"}
                >
                  {isOpen ? "Open Now" : "Closed"}
                </Badge>
                
                {!isAcceptingOrders && (
                  <Badge variant="secondary" className="bg-orange-600">
                    Not accepting orders
                  </Badge>
                )}
              </div>
            </div>

            {/* Cart Button */}
            <Button
              onClick={() => setIsCartOpen(true)}
              className="relative"
              variant={itemCount > 0 ? "default" : "outline"}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Cart
              {itemCount > 0 && (
                <>
                  <Badge 
                    variant="secondary" 
                    className="ml-2 bg-white text-gray-900 hover:bg-white"
                  >
                    {itemCount}
                  </Badge>
                  <span className="ml-2 font-semibold">
                    ${total.toFixed(2)}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Restaurant Status Banner */}
      {!isAcceptingOrders && (
        <div className="bg-orange-50 border-b border-orange-200">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <p className="text-orange-800 text-sm">
              {!isOpen 
                ? "Restaurant is currently closed. You can browse the menu but orders are not being accepted."
                : "Restaurant is temporarily not accepting new orders. Please check back later."
              }
            </p>
          </div>
        </div>
      )}

      {/* Menu Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <CustomerMenu categories={menu} />
      </div>

      {/* Mobile Cart Summary */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40 md:hidden">
          <Button 
            onClick={() => setIsCartOpen(true)}
            size="lg" 
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <span>View Cart ({itemCount} items)</span>
            </div>
            <span className="font-semibold">${total.toFixed(2)}</span>
          </Button>
        </div>
      )}

      {/* Cart Sidebar */}
      <CartSidebar 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        restaurantSlug={params.subdomain}
      />
    </div>
  )
}

export default function MenuPage({ params }: MenuPageProps) {
  return (
    <CartProvider restaurantId="temp-id">
      <MenuPageContent params={params} />
    </CartProvider>
  )
}

// Metadata is handled by the layout component for client components