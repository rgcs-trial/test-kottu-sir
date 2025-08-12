'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/hooks/use-cart'
import { cn } from '@/lib/utils'

interface CartSidebarProps {
  isOpen: boolean
  onClose: () => void
  restaurantSlug: string
}

export function CartSidebar({ isOpen, onClose, restaurantSlug }: CartSidebarProps) {
  const { 
    items, 
    itemCount, 
    subtotal, 
    total, 
    updateItem, 
    removeItem,
    canCheckout,
    validationErrors 
  } = useCart()

  const [isAnimating, setIsAnimating] = useState(false)

  const handleClose = () => {
    setIsAnimating(true)
    setTimeout(() => {
      onClose()
      setIsAnimating(false)
    }, 300)
  }

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(itemId)
    } else {
      updateItem(itemId, { quantity: newQuantity })
    }
  }

  if (!isOpen && !isAnimating) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300",
          isOpen && !isAnimating ? "opacity-100" : "opacity-0"
        )}
        onClick={handleClose}
      />

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out",
          isOpen && !isAnimating ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Your Order</h2>
              {itemCount > 0 && (
                <span className="text-sm text-gray-500">
                  ({itemCount} item{itemCount !== 1 ? 's' : ''})
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <ShoppingBag className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
                <p className="text-gray-500 mb-4">Add some delicious items to get started!</p>
                <Button onClick={handleClose} variant="outline">
                  Browse Menu
                </Button>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 p-3 border rounded-lg">
                    {/* Item Image */}
                    {item.image && (
                      <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm leading-tight mb-1">
                        {item.name}
                      </h4>
                      
                      {/* Variant */}
                      {item.selectedVariant && (
                        <p className="text-xs text-gray-600 mb-1">
                          {item.selectedVariant.name}
                        </p>
                      )}
                      
                      {/* Modifiers */}
                      {item.selectedModifiers.map((modifier) => (
                        <div key={modifier.modifierId} className="text-xs text-gray-600 mb-1">
                          <span className="font-medium">{modifier.name}:</span>
                          {modifier.options.map((option, index) => (
                            <span key={option.id}>
                              {index > 0 && ', '}
                              {option.name}
                              {option.priceAdjustment > 0 && (
                                <span className="text-green-600"> (+${option.priceAdjustment.toFixed(2)})</span>
                              )}
                            </span>
                          ))}
                        </div>
                      ))}
                      
                      {/* Notes */}
                      {item.notes && (
                        <p className="text-xs text-gray-600 italic mb-2">
                          "{item.notes}"
                        </p>
                      )}

                      {/* Quantity Controls & Price */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border rounded-md">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            ${item.lineTotal.toFixed(2)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t p-4 space-y-4 bg-gray-50">
              {/* Subtotal */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="text-xs text-gray-500">
                  Taxes and fees will be calculated at checkout
                </div>
              </div>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="text-sm text-red-600 space-y-1">
                  {validationErrors.map((error, index) => (
                    <p key={index}>• {error}</p>
                  ))}
                </div>
              )}

              {/* Checkout Button */}
              <Link href={`/${restaurantSlug}/checkout`} className="block">
                <Button 
                  className="w-full" 
                  size="lg"
                  disabled={!canCheckout}
                  onClick={handleClose}
                >
                  {canCheckout ? (
                    <>
                      Checkout • ${total.toFixed(2)}
                    </>
                  ) : (
                    'Cannot Checkout'
                  )}
                </Button>
              </Link>

              {/* View Cart Link */}
              <Link 
                href={`/${restaurantSlug}/cart`} 
                className="block text-center"
                onClick={handleClose}
              >
                <Button variant="outline" className="w-full">
                  View Cart Details
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}