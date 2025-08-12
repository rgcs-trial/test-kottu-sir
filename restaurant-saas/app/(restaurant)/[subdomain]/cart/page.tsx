'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, ArrowLeft, Trash2 } from 'lucide-react'
import { useRestaurantPublic } from '@/hooks/use-restaurant-public'
import { CartProvider, useCart } from '@/hooks/use-cart'
import { CartItem } from '@/components/cart/cart-item'
import { OrderSummaryExpanded } from '@/components/checkout/order-summary'
import { MenuItemModal } from '@/components/menu/menu-item-modal'
import { Button } from '@/components/ui/button'

interface CartPageProps {
  params: {
    subdomain: string
  }
}

function CartPageContent({ params }: CartPageProps) {
  const { restaurant, loading, getMenuItemById } = useRestaurantPublic(params.subdomain)
  const { items, clearCart } = useCart()
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Handle edit item
  const handleEditItem = (cartItem: any) => {
    const menuItem = getMenuItemById(cartItem.menuItemId)
    if (menuItem) {
      setSelectedItem(menuItem)
      setIsModalOpen(true)
    }
  }

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false)
    setTimeout(() => setSelectedItem(null), 300)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="h-8 bg-gray-300 rounded w-1/4 animate-pulse"></div>
            <div className="bg-white rounded-lg p-6">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 p-4 border rounded-lg">
                    <div className="w-20 h-20 bg-gray-300 rounded-lg animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-gray-300 rounded w-3/4 animate-pulse"></div>
                      <div className="h-4 bg-gray-300 rounded w-1/2 animate-pulse"></div>
                      <div className="h-4 bg-gray-300 rounded w-1/3 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Restaurant Not Found</h1>
          <p className="text-gray-600">Unable to load restaurant information.</p>
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
            href={`/${params.subdomain}/menu`}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Menu
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Your Cart</h1>
          <p className="text-gray-600 mt-1">Review your order from {restaurant.name}</p>
        </div>

        {/* Content */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            {items.length === 0 ? (
              <div className="bg-white rounded-lg border p-8 text-center">
                <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
                <p className="text-gray-600 mb-6">
                  Looks like you haven't added any items to your cart yet. 
                  Browse our menu to get started!
                </p>
                <Link href={`/${params.subdomain}/menu`}>
                  <Button size="lg">
                    Browse Menu
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Cart Items */}
                <div className="bg-white rounded-lg border">
                  <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold">
                        Order Items ({items.length})
                      </h2>
                      {items.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => clearCart()}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Clear Cart
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="divide-y">
                    {items.map((item) => (
                      <CartItem
                        key={item.id}
                        item={item}
                        onEdit={handleEditItem}
                        showEdit={true}
                        compact={false}
                      />
                    ))}
                  </div>
                </div>

                {/* Add More Items */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-blue-900">Want to add more items?</h3>
                      <p className="text-sm text-blue-700">Browse our full menu to discover more delicious options.</p>
                    </div>
                    <Link href={`/${params.subdomain}/menu`}>
                      <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                        Add More Items
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <OrderSummaryExpanded 
                restaurantName={restaurant.name} 
                restaurantSlug={params.subdomain}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Item Modal */}
      <MenuItemModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  )
}

export default function CartPage({ params }: CartPageProps) {
  return (
    <CartProvider restaurantId="temp-id">
      <CartPageContent params={params} />
    </CartProvider>
  )
}

// Metadata is handled by the layout component for client components