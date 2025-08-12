'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { CartItem, CustomerInfo, DeliveryAddress } from '@/hooks/use-cart'

export interface CreateOrderRequest {
  restaurantId: string
  items: CartItem[]
  orderType: 'pickup' | 'delivery'
  customerInfo: CustomerInfo
  deliveryAddress?: DeliveryAddress
  notes?: string
  estimatedTime?: string
  subtotal: number
  taxAmount: number
  deliveryFee: number
  total: number
}

export interface CreateOrderResponse {
  success: boolean
  orderId?: string
  orderNumber?: string
  error?: string
  paymentIntentId?: string
}

// Generate order number
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `ORD-${timestamp}-${random}`.toUpperCase()
}

// Calculate order totals
function calculateOrderTotals(
  items: CartItem[], 
  taxRate: number, 
  deliveryFee: number = 0
) {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const taxAmount = subtotal * taxRate
  const total = subtotal + taxAmount + deliveryFee
  
  return { subtotal, taxAmount, total }
}

// Validate cart items against current menu
export async function validateCartItems(
  restaurantId: string, 
  items: CartItem[]
): Promise<{ valid: boolean; errors: string[] }> {
  const supabase = createClient()
  const errors: string[] = []

  try {
    // Fetch current menu items
    const { data: menuItems, error } = await supabase
      .from('menu_items')
      .select(`
        id,
        name,
        price,
        status,
        track_inventory,
        stock_quantity,
        menu_variants (*),
        menu_item_modifiers (
          modifier_id,
          menu_modifiers (
            id,
            name,
            menu_modifier_options (*)
          )
        )
      `)
      .eq('restaurant_id', restaurantId)
      .in('id', items.map(item => item.menuItemId))

    if (error || !menuItems) {
      errors.push('Failed to validate cart items')
      return { valid: false, errors }
    }

    // Validate each cart item
    for (const cartItem of items) {
      const menuItem = menuItems.find(m => m.id === cartItem.menuItemId)
      
      if (!menuItem) {
        errors.push(`Item "${cartItem.name}" is no longer available`)
        continue
      }

      if (menuItem.status !== 'active') {
        errors.push(`Item "${cartItem.name}" is currently unavailable`)
        continue
      }

      // Check inventory
      if (menuItem.track_inventory && menuItem.stock_quantity !== null) {
        if (menuItem.stock_quantity < cartItem.quantity) {
          errors.push(`Only ${menuItem.stock_quantity} of "${cartItem.name}" available`)
          continue
        }
      }

      // Validate variant if selected
      if (cartItem.selectedVariant) {
        const variant = menuItem.menu_variants?.find(v => v.id === cartItem.selectedVariant?.id)
        if (!variant || !variant.is_active) {
          errors.push(`Selected variant for "${cartItem.name}" is no longer available`)
        }
      }

      // Validate modifiers if selected
      if (cartItem.selectedModifiers && cartItem.selectedModifiers.length > 0) {
        for (const selectedModifier of cartItem.selectedModifiers) {
          const modifier = menuItem.menu_item_modifiers?.find(
            im => im.menu_modifiers.id === selectedModifier.modifierId
          )?.menu_modifiers
          
          if (!modifier || !modifier.is_active) {
            errors.push(`Modifier "${selectedModifier.name}" is no longer available for "${cartItem.name}"`)
            continue
          }

          // Validate modifier options
          for (const selectedOption of selectedModifier.options) {
            const option = modifier.menu_modifier_options?.find(o => o.id === selectedOption.id)
            if (!option || !option.is_active) {
              errors.push(`Option "${selectedOption.name}" is no longer available`)
            }
          }
        }
      }
    }

    return { valid: errors.length === 0, errors }
  } catch (error) {
    console.error('Error validating cart items:', error)
    return { valid: false, errors: ['Failed to validate cart items'] }
  }
}

// Create a new order
export async function createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
  const supabase = createClient()

  try {
    // Validate cart items first
    const validation = await validateCartItems(request.restaurantId, request.items)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', ')
      }
    }

    // Get restaurant details for tax rate
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('tax_rate')
      .eq('id', request.restaurantId)
      .single()

    if (restaurantError || !restaurant) {
      return {
        success: false,
        error: 'Restaurant not found'
      }
    }

    // Recalculate totals to ensure accuracy
    const calculatedTotals = calculateOrderTotals(
      request.items,
      restaurant.tax_rate,
      request.deliveryFee
    )

    // Generate order number
    const orderNumber = generateOrderNumber()

    // Create order record
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        restaurant_id: request.restaurantId,
        type: request.orderType,
        status: 'pending',
        customer_info: request.customerInfo,
        delivery_address: request.deliveryAddress || null,
        subtotal: calculatedTotals.subtotal,
        tax_amount: calculatedTotals.taxAmount,
        delivery_fee: request.deliveryFee,
        tip_amount: 0,
        discount_amount: 0,
        total: calculatedTotals.total,
        payment_status: 'pending',
        estimated_ready_time: request.estimatedTime || null,
        notes: request.notes || null
      })
      .select('id')
      .single()

    if (orderError || !order) {
      console.error('Error creating order:', orderError)
      return {
        success: false,
        error: 'Failed to create order'
      }
    }

    // Create order items
    const orderItems = request.items.map(item => ({
      order_id: order.id,
      menu_item_id: item.menuItemId,
      name: item.name,
      price: item.itemTotal,
      quantity: item.quantity,
      notes: item.notes || null,
      customizations: {
        variant: item.selectedVariant || null,
        modifiers: item.selectedModifiers || []
      }
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Error creating order items:', itemsError)
      // Cleanup: delete the order if items failed
      await supabase.from('orders').delete().eq('id', order.id)
      return {
        success: false,
        error: 'Failed to create order items'
      }
    }

    // Update inventory if tracking is enabled
    for (const item of request.items) {
      const { error: inventoryError } = await supabase.rpc(
        'update_menu_item_inventory',
        {
          item_id: item.menuItemId,
          quantity_used: item.quantity
        }
      )

      if (inventoryError) {
        console.error('Error updating inventory:', inventoryError)
        // Don't fail the order for inventory update errors
      }
    }

    return {
      success: true,
      orderId: order.id,
      orderNumber: orderNumber
    }

  } catch (error) {
    console.error('Error creating order:', error)
    return {
      success: false,
      error: 'An unexpected error occurred while creating your order'
    }
  }
}

// Get order by ID
export async function getOrder(orderId: string) {
  const supabase = createClient()

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        restaurants (
          name,
          phone,
          email,
          address_street,
          address_city,
          address_state,
          address_zip_code
        )
      `)
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return { order: null, error: 'Order not found' }
    }

    return { order, error: null }
  } catch (error) {
    console.error('Error fetching order:', error)
    return { order: null, error: 'Failed to fetch order' }
  }
}

// Get order by order number
export async function getOrderByNumber(orderNumber: string) {
  const supabase = createClient()

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        restaurants (
          name,
          phone,
          email,
          address_street,
          address_city,
          address_state,
          address_zip_code
        )
      `)
      .eq('order_number', orderNumber)
      .single()

    if (error || !order) {
      return { order: null, error: 'Order not found' }
    }

    return { order, error: null }
  } catch (error) {
    console.error('Error fetching order:', error)
    return { order: null, error: 'Failed to fetch order' }
  }
}

// Update order status
export async function updateOrderStatus(orderId: string, status: string) {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('orders')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (error) {
      console.error('Error updating order status:', error)
      return { success: false, error: 'Failed to update order status' }
    }

    // Revalidate related paths
    revalidatePath('/dashboard/orders')
    
    return { success: true }
  } catch (error) {
    console.error('Error updating order status:', error)
    return { success: false, error: 'Failed to update order status' }
  }
}

// Calculate delivery fee based on zone
export async function calculateDeliveryFee(
  restaurantId: string,
  zipCode: string
): Promise<{ fee: number; estimatedTime: number | null; error?: string }> {
  const supabase = createClient()

  try {
    const { data: zones, error } = await supabase
      .from('delivery_zones')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .contains('zip_codes', [zipCode])

    if (error) {
      return { fee: 0, estimatedTime: null, error: 'Failed to calculate delivery fee' }
    }

    if (!zones || zones.length === 0) {
      return { fee: 0, estimatedTime: null, error: 'Delivery not available to this area' }
    }

    // Use the first matching zone
    const zone = zones[0]
    return { 
      fee: zone.delivery_fee, 
      estimatedTime: zone.estimated_delivery_time 
    }

  } catch (error) {
    console.error('Error calculating delivery fee:', error)
    return { fee: 0, estimatedTime: null, error: 'Failed to calculate delivery fee' }
  }
}

// Check if minimum order amount is met
export async function checkMinimumOrder(
  restaurantId: string,
  orderAmount: number,
  zipCode?: string
): Promise<{ meetsMinimum: boolean; minimumAmount: number; error?: string }> {
  const supabase = createClient()

  try {
    // For delivery orders, check delivery zone minimum
    if (zipCode) {
      const { data: zones, error } = await supabase
        .from('delivery_zones')
        .select('minimum_order')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .contains('zip_codes', [zipCode])

      if (error) {
        return { meetsMinimum: false, minimumAmount: 0, error: 'Failed to check minimum order' }
      }

      if (zones && zones.length > 0) {
        const minimumAmount = zones[0].minimum_order
        return { 
          meetsMinimum: orderAmount >= minimumAmount, 
          minimumAmount 
        }
      }
    }

    // Default minimum order (could be restaurant-specific)
    const defaultMinimum = 15.00
    return { 
      meetsMinimum: orderAmount >= defaultMinimum, 
      minimumAmount: defaultMinimum 
    }

  } catch (error) {
    console.error('Error checking minimum order:', error)
    return { meetsMinimum: false, minimumAmount: 0, error: 'Failed to check minimum order' }
  }
}