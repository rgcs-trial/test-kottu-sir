'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Minus, Star, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useCart } from '@/hooks/use-cart'
import { cn } from '@/lib/utils'
import type { MenuItemWithRelations } from '@/hooks/use-restaurant-public'

interface MenuItemModalProps {
  item: MenuItemWithRelations | null
  isOpen: boolean
  onClose: () => void
}

interface SelectedModifier {
  modifierId: string
  name: string
  options: Array<{
    id: string
    name: string
    priceAdjustment: number
  }>
}

export function MenuItemModal({ item, isOpen, onClose }: MenuItemModalProps) {
  const { addItem } = useCart()
  
  // State
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([])
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)

  // Reset state when item changes
  useEffect(() => {
    if (item) {
      setSelectedVariant(null)
      setSelectedModifiers([])
      setQuantity(1)
      setNotes('')
    }
  }, [item])

  // Calculate current price
  const calculatePrice = () => {
    if (!item) return 0
    
    let price = selectedVariant ? selectedVariant.price : item.price
    
    selectedModifiers.forEach(modifier => {
      modifier.options.forEach(option => {
        price += option.priceAdjustment
      })
    })
    
    return price
  }

  const currentPrice = calculatePrice()

  // Handle modal close with animation
  const handleClose = () => {
    setIsAnimating(true)
    setTimeout(() => {
      onClose()
      setIsAnimating(false)
    }, 300)
  }

  // Handle variant selection
  const handleVariantSelect = (variant: any) => {
    setSelectedVariant(variant)
  }

  // Handle modifier option selection
  const handleModifierToggle = (modifier: any, option: any) => {
    const modifierId = modifier.id
    const existingModifierIndex = selectedModifiers.findIndex(m => m.modifierId === modifierId)
    
    if (modifier.type === 'single') {
      // Single selection modifier
      if (existingModifierIndex >= 0) {
        // Replace existing selection
        const updated = [...selectedModifiers]
        updated[existingModifierIndex] = {
          modifierId,
          name: modifier.name,
          options: [{ id: option.id, name: option.name, priceAdjustment: option.price_adjustment }]
        }
        setSelectedModifiers(updated)
      } else {
        // Add new selection
        setSelectedModifiers(prev => [...prev, {
          modifierId,
          name: modifier.name,
          options: [{ id: option.id, name: option.name, priceAdjustment: option.price_adjustment }]
        }])
      }
    } else {
      // Multiple selection modifier
      if (existingModifierIndex >= 0) {
        const existingModifier = selectedModifiers[existingModifierIndex]
        const optionIndex = existingModifier.options.findIndex(o => o.id === option.id)
        
        if (optionIndex >= 0) {
          // Remove option
          const updated = [...selectedModifiers]
          updated[existingModifierIndex].options.splice(optionIndex, 1)
          
          // Remove modifier if no options left
          if (updated[existingModifierIndex].options.length === 0) {
            updated.splice(existingModifierIndex, 1)
          }
          
          setSelectedModifiers(updated)
        } else {
          // Add option
          const updated = [...selectedModifiers]
          updated[existingModifierIndex].options.push({
            id: option.id,
            name: option.name,
            priceAdjustment: option.price_adjustment
          })
          setSelectedModifiers(updated)
        }
      } else {
        // Add new modifier with option
        setSelectedModifiers(prev => [...prev, {
          modifierId,
          name: modifier.name,
          options: [{ id: option.id, name: option.name, priceAdjustment: option.price_adjustment }]
        }])
      }
    }
  }

  // Check if option is selected
  const isOptionSelected = (modifierId: string, optionId: string) => {
    const modifier = selectedModifiers.find(m => m.modifierId === modifierId)
    return modifier?.options.some(o => o.id === optionId) || false
  }

  // Validate required modifiers
  const validateSelection = () => {
    if (!item) return { valid: false, errors: [] }
    
    const errors: string[] = []
    
    item.modifiers.forEach(modifier => {
      if (modifier.is_required) {
        const selectedModifier = selectedModifiers.find(m => m.modifierId === modifier.id)
        
        if (!selectedModifier || selectedModifier.options.length < modifier.min_selections) {
          errors.push(`Please select ${modifier.name}`)
        }
        
        if (modifier.max_selections && selectedModifier && selectedModifier.options.length > modifier.max_selections) {
          errors.push(`Too many selections for ${modifier.name}`)
        }
      }
    })
    
    return { valid: errors.length === 0, errors }
  }

  const validation = validateSelection()

  // Add to cart
  const handleAddToCart = () => {
    if (!item || !validation.valid) return

    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity,
      image: item.images?.[0],
      selectedVariant,
      selectedModifiers,
      notes: notes.trim() || undefined
    })

    handleClose()
  }

  if (!isOpen && !isAnimating) return null
  if (!item) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/20 backdrop-blur-sm z-50 transition-opacity duration-300",
          isOpen && !isAnimating ? "opacity-100" : "opacity-0"
        )}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300",
          isOpen && !isAnimating ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
      >
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header with Image */}
          <div className="relative">
            {item.images && item.images.length > 0 && (
              <div className="h-48 sm:h-64 overflow-hidden">
                <img
                  src={item.images[0]}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClose}
              className="absolute top-4 right-4 h-8 w-8 p-0 bg-white/90 hover:bg-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="p-6">
              {/* Item Info */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">{item.name}</h2>
                
                {item.description && (
                  <p className="text-gray-600 mb-3">{item.description}</p>
                )}

                {/* Meta Info */}
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  {item.calories && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {item.calories} cal
                    </div>
                  )}
                  
                  {item.preparation_time && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {item.preparation_time} min
                    </div>
                  )}
                </div>

                {/* Dietary Info */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {item.is_vegetarian && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Vegetarian
                    </span>
                  )}
                  {item.is_vegan && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Vegan
                    </span>
                  )}
                  {item.is_gluten_free && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Gluten-Free
                    </span>
                  )}
                  {item.allergens.length > 0 && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                      Contains: {item.allergens.join(', ')}
                    </span>
                  )}
                </div>

                {/* Base Price */}
                <div className="text-2xl font-bold text-green-600">
                  ${selectedVariant ? selectedVariant.price.toFixed(2) : item.price.toFixed(2)}
                  {item.compare_at_price && item.compare_at_price > item.price && (
                    <span className="text-lg text-gray-400 line-through ml-2">
                      ${item.compare_at_price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Variants */}
              {item.variants && item.variants.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Size</h3>
                  <div className="space-y-2">
                    {item.variants.filter(v => v.is_active).map((variant) => (
                      <label
                        key={variant.id}
                        className={cn(
                          "flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors",
                          selectedVariant?.id === variant.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="variant"
                            value={variant.id}
                            checked={selectedVariant?.id === variant.id}
                            onChange={() => handleVariantSelect(variant)}
                            className="sr-only"
                          />
                          <span className="font-medium">{variant.name}</span>
                        </div>
                        <span className="font-medium">
                          ${variant.price.toFixed(2)}
                          {variant.compare_at_price && variant.compare_at_price > variant.price && (
                            <span className="text-sm text-gray-400 line-through ml-1">
                              ${variant.compare_at_price.toFixed(2)}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Modifiers */}
              {item.modifiers && item.modifiers.length > 0 && (
                <div className="mb-6">
                  {item.modifiers.filter(m => m.is_active).map((modifier) => (
                    <div key={modifier.id} className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="font-semibold">{modifier.name}</h3>
                        {modifier.is_required && (
                          <span className="text-sm text-red-600">*</span>
                        )}
                        {modifier.max_selections && (
                          <span className="text-sm text-gray-500">
                            (max {modifier.max_selections})
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {modifier.options
                          .filter((option: any) => option.is_active)
                          .map((option: any) => (
                            <label
                              key={option.id}
                              className={cn(
                                "flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors",
                                isOptionSelected(modifier.id, option.id)
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300"
                              )}
                            >
                              <div className="flex items-center">
                                <input
                                  type={modifier.type === 'single' ? 'radio' : 'checkbox'}
                                  name={`modifier-${modifier.id}`}
                                  value={option.id}
                                  checked={isOptionSelected(modifier.id, option.id)}
                                  onChange={() => handleModifierToggle(modifier, option)}
                                  className="sr-only"
                                />
                                <span>{option.name}</span>
                              </div>
                              {option.price_adjustment > 0 && (
                                <span className="text-green-600 font-medium">
                                  +${option.price_adjustment.toFixed(2)}
                                </span>
                              )}
                            </label>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Special Instructions */}
              <div className="mb-6">
                <label className="block font-semibold mb-2">
                  Special Instructions (Optional)
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests or dietary needs..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Validation Errors */}
              {!validation.valid && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-red-800 text-sm">
                    {validation.errors.map((error, index) => (
                      <div key={index}>• {error}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              {/* Quantity Controls */}
              <div className="flex items-center border rounded-lg bg-white">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="px-4 py-2 font-medium min-w-[3rem] text-center">
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Add to Cart Button */}
              <Button
                onClick={handleAddToCart}
                disabled={!validation.valid}
                size="lg"
                className="flex-1 ml-4"
              >
                Add to Cart • ${(currentPrice * quantity).toFixed(2)}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}