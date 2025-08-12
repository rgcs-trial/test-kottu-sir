'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
// Simple toast replacement for now
const toast = ({ title, description }: { title: string; description?: string }) => {
  alert(`${title}${description ? ': ' + description : ''}`)
}

// Cart item type with all customization options
export interface CartItem {
  id: string // Unique cart item ID
  menuItemId: string
  name: string
  price: number
  quantity: number
  image?: string
  
  // Customization options
  selectedVariant?: {
    id: string
    name: string
    price: number
  }
  
  selectedModifiers: Array<{
    modifierId: string
    name: string
    options: Array<{
      id: string
      name: string
      priceAdjustment: number
    }>
  }>
  
  notes?: string
  
  // Calculated fields
  itemTotal: number // Base price + variant + modifiers
  lineTotal: number // itemTotal * quantity
}

// Customer information for guest checkout
export interface CustomerInfo {
  name: string
  email: string
  phone: string
}

// Delivery address
export interface DeliveryAddress {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  instructions?: string
}

// Cart context type
interface CartContextType {
  // Cart state
  items: CartItem[]
  itemCount: number
  subtotal: number
  taxAmount: number
  deliveryFee: number
  total: number
  
  // Order details
  orderType: 'pickup' | 'delivery'
  estimatedTime: string | null
  customerInfo: CustomerInfo | null
  deliveryAddress: DeliveryAddress | null
  
  // Cart actions
  addItem: (item: Omit<CartItem, 'id' | 'itemTotal' | 'lineTotal'>) => void
  updateItem: (id: string, updates: Partial<CartItem>) => void
  removeItem: (id: string) => void
  clearCart: () => void
  
  // Order actions
  setOrderType: (type: 'pickup' | 'delivery') => void
  setCustomerInfo: (info: CustomerInfo) => void
  setDeliveryAddress: (address: DeliveryAddress) => void
  setEstimatedTime: (time: string) => void
  
  // Validation
  canCheckout: boolean
  validationErrors: string[]
  
  // Storage
  loadCart: () => void
  saveCart: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const STORAGE_KEY = 'restaurant_cart'
const TAX_RATE = 0.0875 // 8.75% tax rate (configurable per restaurant)

interface CartProviderProps {
  children: React.ReactNode
  restaurantId: string
  taxRate?: number
  minimumOrderAmount?: number
  deliveryFee?: number
}

export function CartProvider({ 
  children, 
  restaurantId, 
  taxRate = TAX_RATE,
  minimumOrderAmount = 15,
  deliveryFee = 3.99
}: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>([])
  const [orderType, setOrderTypeState] = useState<'pickup' | 'delivery'>('pickup')
  const [estimatedTime, setEstimatedTimeState] = useState<string | null>(null)
  const [customerInfo, setCustomerInfoState] = useState<CustomerInfo | null>(null)
  const [deliveryAddress, setDeliveryAddressState] = useState<DeliveryAddress | null>(null)

  // Calculate totals
  const itemCount = items.reduce((count, item) => count + item.quantity, 0)
  const subtotal = items.reduce((total, item) => total + item.lineTotal, 0)
  const taxAmount = subtotal * taxRate
  const calculatedDeliveryFee = orderType === 'delivery' ? deliveryFee : 0
  const total = subtotal + taxAmount + calculatedDeliveryFee

  // Generate unique cart item ID
  const generateCartItemId = (menuItemId: string, variant?: any, modifiers?: any[]): string => {
    const variantId = variant?.id || 'no-variant'
    const modifierIds = modifiers?.map(m => m.modifierId + ':' + m.options.map(o => o.id).join(',')).join('|') || 'no-modifiers'
    return `${menuItemId}-${variantId}-${modifierIds}-${Date.now()}`
  }

  // Calculate item price with modifiers and variants
  const calculateItemPrice = (basePrice: number, variant?: any, modifiers?: any[]): number => {
    let price = basePrice
    
    // Add variant price
    if (variant) {
      price = variant.price
    }
    
    // Add modifier prices
    if (modifiers) {
      modifiers.forEach(modifier => {
        modifier.options.forEach((option: any) => {
          price += option.priceAdjustment
        })
      })
    }
    
    return price
  }

  // Add item to cart
  const addItem = useCallback((newItem: Omit<CartItem, 'id' | 'itemTotal' | 'lineTotal'>) => {
    const cartItemId = generateCartItemId(newItem.menuItemId, newItem.selectedVariant, newItem.selectedModifiers)
    const itemTotal = calculateItemPrice(newItem.price, newItem.selectedVariant, newItem.selectedModifiers)
    const lineTotal = itemTotal * newItem.quantity

    const cartItem: CartItem = {
      ...newItem,
      id: cartItemId,
      itemTotal,
      lineTotal
    }

    setItems(prevItems => [...prevItems, cartItem])
    toast({
      title: "Added to cart",
      description: `${newItem.name} added to your cart`,
    })
  }, [])

  // Update item in cart
  const updateItem = useCallback((id: string, updates: Partial<CartItem>) => {
    setItems(prevItems => 
      prevItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, ...updates }
          const itemTotal = calculateItemPrice(
            updates.price || item.price, 
            updates.selectedVariant || item.selectedVariant, 
            updates.selectedModifiers || item.selectedModifiers
          )
          updatedItem.itemTotal = itemTotal
          updatedItem.lineTotal = itemTotal * updatedItem.quantity
          return updatedItem
        }
        return item
      })
    )
  }, [])

  // Remove item from cart
  const removeItem = useCallback((id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id))
    toast({
      title: "Item removed",
      description: "Item has been removed from your cart",
    })
  }, [])

  // Clear entire cart
  const clearCart = useCallback(() => {
    setItems([])
    setCustomerInfoState(null)
    setDeliveryAddressState(null)
    setEstimatedTimeState(null)
    localStorage.removeItem(`${STORAGE_KEY}_${restaurantId}`)
  }, [restaurantId])

  // Set order type
  const setOrderType = useCallback((type: 'pickup' | 'delivery') => {
    setOrderTypeState(type)
    if (type === 'pickup') {
      setDeliveryAddressState(null)
    }
  }, [])

  // Set customer info
  const setCustomerInfo = useCallback((info: CustomerInfo) => {
    setCustomerInfoState(info)
  }, [])

  // Set delivery address
  const setDeliveryAddress = useCallback((address: DeliveryAddress) => {
    setDeliveryAddressState(address)
  }, [])

  // Set estimated time
  const setEstimatedTime = useCallback((time: string) => {
    setEstimatedTimeState(time)
  }, [])

  // Validation logic
  const validationErrors: string[] = []
  if (items.length === 0) {
    validationErrors.push("Cart is empty")
  }
  if (subtotal < minimumOrderAmount) {
    validationErrors.push(`Minimum order amount is $${minimumOrderAmount.toFixed(2)}`)
  }
  if (!customerInfo?.name) {
    validationErrors.push("Customer name is required")
  }
  if (!customerInfo?.phone) {
    validationErrors.push("Customer phone is required")
  }
  if (orderType === 'delivery' && !deliveryAddress) {
    validationErrors.push("Delivery address is required")
  }

  const canCheckout = validationErrors.length === 0

  // Load cart from localStorage
  const loadCart = useCallback(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${restaurantId}`)
      if (stored) {
        const cartData = JSON.parse(stored)
        setItems(cartData.items || [])
        setOrderTypeState(cartData.orderType || 'pickup')
        setCustomerInfoState(cartData.customerInfo || null)
        setDeliveryAddressState(cartData.deliveryAddress || null)
        setEstimatedTimeState(cartData.estimatedTime || null)
      }
    } catch (error) {
      console.error('Failed to load cart from storage:', error)
    }
  }, [restaurantId])

  // Save cart to localStorage
  const saveCart = useCallback(() => {
    try {
      const cartData = {
        items,
        orderType,
        customerInfo,
        deliveryAddress,
        estimatedTime,
        timestamp: Date.now()
      }
      localStorage.setItem(`${STORAGE_KEY}_${restaurantId}`, JSON.stringify(cartData))
    } catch (error) {
      console.error('Failed to save cart to storage:', error)
    }
  }, [items, orderType, customerInfo, deliveryAddress, estimatedTime, restaurantId])

  // Auto-save cart when state changes
  useEffect(() => {
    if (items.length > 0) {
      saveCart()
    }
  }, [items, orderType, customerInfo, deliveryAddress, estimatedTime, saveCart])

  // Load cart on mount
  useEffect(() => {
    loadCart()
  }, [loadCart])

  const contextValue: CartContextType = {
    // State
    items,
    itemCount,
    subtotal,
    taxAmount,
    deliveryFee: calculatedDeliveryFee,
    total,
    orderType,
    estimatedTime,
    customerInfo,
    deliveryAddress,

    // Actions
    addItem,
    updateItem,
    removeItem,
    clearCart,
    setOrderType,
    setCustomerInfo,
    setDeliveryAddress,
    setEstimatedTime,

    // Validation
    canCheckout,
    validationErrors,

    // Storage
    loadCart,
    saveCart,
  }

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  )
}

// Hook to use cart context
export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}