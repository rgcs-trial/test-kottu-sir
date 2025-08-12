'use client'

import { useState } from 'react'
import { Minus, Plus, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart, type CartItem as CartItemType } from '@/hooks/use-cart'

interface CartItemProps {
  item: CartItemType
  onEdit?: (item: CartItemType) => void
  showEdit?: boolean
  compact?: boolean
}

export function CartItem({ item, onEdit, showEdit = true, compact = false }: CartItemProps) {
  const { updateItem, removeItem } = useCart()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(item.id)
      return
    }

    setIsUpdating(true)
    try {
      updateItem(item.id, { quantity: newQuantity })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemove = () => {
    removeItem(item.id)
  }

  const handleEdit = () => {
    if (onEdit) {
      onEdit(item)
    }
  }

  return (
    <div className={`flex gap-4 ${compact ? 'py-3' : 'p-4'} border-b last:border-b-0`}>
      {/* Item Image */}
      {item.image && !compact && (
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
          <img 
            src={item.image} 
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Item Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className={`font-medium ${compact ? 'text-sm' : 'text-base'} leading-tight mb-1`}>
              {item.name}
            </h3>
            
            {/* Variant */}
            {item.selectedVariant && (
              <p className={`text-gray-600 ${compact ? 'text-xs' : 'text-sm'} mb-1`}>
                Size: {item.selectedVariant.name}
                {item.selectedVariant.price !== item.price && (
                  <span className="text-green-600 ml-1">
                    (+${(item.selectedVariant.price - item.price).toFixed(2)})
                  </span>
                )}
              </p>
            )}
            
            {/* Modifiers */}
            {item.selectedModifiers.length > 0 && (
              <div className={`${compact ? 'text-xs' : 'text-sm'} text-gray-600 space-y-1 mb-2`}>
                {item.selectedModifiers.map((modifier) => (
                  <div key={modifier.modifierId}>
                    <span className="font-medium">{modifier.name}:</span>
                    <div className="ml-2">
                      {modifier.options.map((option, index) => (
                        <span key={option.id} className="block">
                          • {option.name}
                          {option.priceAdjustment > 0 && (
                            <span className="text-green-600 ml-1">
                              (+${option.priceAdjustment.toFixed(2)})
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Special Instructions */}
            {item.notes && (
              <p className={`text-gray-600 italic ${compact ? 'text-xs' : 'text-sm'} mb-2`}>
                Note: "{item.notes}"
              </p>
            )}

            {/* Price Info */}
            <div className={`${compact ? 'text-sm' : 'text-base'} font-medium text-gray-900`}>
              ${item.itemTotal.toFixed(2)}
              {item.quantity > 1 && (
                <span className="text-gray-500 ml-1">
                  each • ${item.lineTotal.toFixed(2)} total
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 items-end">
            {/* Edit Button */}
            {showEdit && onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="h-8 px-2 text-gray-500 hover:text-gray-700"
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}

            {/* Remove Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="h-8 px-2 text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Remove
            </Button>
          </div>
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center border rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-r-none"
              onClick={() => handleQuantityChange(item.quantity - 1)}
              disabled={isUpdating}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="px-4 py-1 text-center min-w-[3rem] border-x">
              <span className={`font-medium ${compact ? 'text-sm' : 'text-base'}`}>
                {item.quantity}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-l-none"
              onClick={() => handleQuantityChange(item.quantity + 1)}
              disabled={isUpdating}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Line Total */}
          <div className="text-right">
            <div className={`font-bold ${compact ? 'text-base' : 'text-lg'} text-gray-900`}>
              ${item.lineTotal.toFixed(2)}
            </div>
            {item.quantity > 1 && (
              <div className={`${compact ? 'text-xs' : 'text-sm'} text-gray-500`}>
                {item.quantity} × ${item.itemTotal.toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Summary version for checkout/order confirmation
export function CartItemSummary({ item }: { item: CartItemType }) {
  return (
    <div className="flex justify-between items-start py-2">
      <div className="flex-1">
        <h4 className="font-medium text-sm">
          {item.quantity}× {item.name}
        </h4>
        
        {/* Variant */}
        {item.selectedVariant && (
          <p className="text-xs text-gray-600">
            Size: {item.selectedVariant.name}
          </p>
        )}
        
        {/* Modifiers */}
        {item.selectedModifiers.length > 0 && (
          <div className="text-xs text-gray-600 mt-1">
            {item.selectedModifiers.map((modifier) => (
              <div key={modifier.modifierId}>
                {modifier.options.map((option) => (
                  <span key={option.id} className="block">
                    • {option.name}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
        
        {/* Notes */}
        {item.notes && (
          <p className="text-xs text-gray-600 italic mt-1">
            "{item.notes}"
          </p>
        )}
      </div>
      
      <span className="font-medium text-sm ml-4">
        ${item.lineTotal.toFixed(2)}
      </span>
    </div>
  )
}