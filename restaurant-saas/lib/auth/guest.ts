import { z } from 'zod'
import { generateSecureId, AUTH_CONFIG } from './index'
import { sessionManager } from './session'
import { createServerSupabaseClient } from './index'
import type { Order, OrderItem } from '../../types'

// Guest cart item schema
export const GuestCartItemSchema = z.object({
  id: z.string(),
  menuItemId: z.string().uuid(),
  name: z.string(),
  price: z.number().min(0),
  quantity: z.number().min(1),
  notes: z.string().optional(),
  customizations: z.array(z.object({
    name: z.string(),
    price: z.number(),
  })).default([]),
  addedAt: z.number(),
})

export type GuestCartItem = z.infer<typeof GuestCartItemSchema>

// Guest cart schema
export const GuestCartSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string(),
  restaurantId: z.string().uuid(),
  items: z.array(GuestCartItemSchema).default([]),
  subtotal: z.number().default(0),
  taxAmount: z.number().default(0),
  total: z.number().default(0),
  createdAt: z.number(),
  updatedAt: z.number(),
  expiresAt: z.number(),
})

export type GuestCart = z.infer<typeof GuestCartSchema>

// Guest checkout info schema
export const GuestCheckoutInfoSchema = z.object({
  customerInfo: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(1, 'Phone number is required'),
  }),
  orderType: z.enum(['dine_in', 'takeout', 'delivery']),
  deliveryAddress: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(1, 'ZIP code is required'),
    country: z.string().default('US'),
    instructions: z.string().optional(),
  }).optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  marketing: z.object({
    acceptEmails: z.boolean().default(false),
    acceptSms: z.boolean().default(false),
  }).optional(),
})

export type GuestCheckoutInfo = z.infer<typeof GuestCheckoutInfoSchema>

/**
 * Guest cart management for edge environment
 */
export class GuestCartManager {
  private cartCache = new Map<string, GuestCart>()

  /**
   * Create new guest cart
   */
  createGuestCart(sessionId: string, restaurantId: string): GuestCart {
    const now = Date.now()
    
    const cart: GuestCart = {
      id: crypto.randomUUID(),
      sessionId,
      restaurantId,
      items: [],
      subtotal: 0,
      taxAmount: 0,
      total: 0,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + AUTH_CONFIG.GUEST_SESSION_DURATION,
    }

    this.cartCache.set(cart.id, cart)
    return cart
  }

  /**
   * Get guest cart by ID
   */
  getGuestCart(cartId: string): GuestCart | null {
    const cart = this.cartCache.get(cartId)
    
    if (!cart || cart.expiresAt < Date.now()) {
      if (cart) {
        this.cartCache.delete(cartId)
      }
      return null
    }

    return cart
  }

  /**
   * Get guest cart by session ID
   */
  getGuestCartBySession(sessionId: string): GuestCart | null {
    for (const cart of this.cartCache.values()) {
      if (cart.sessionId === sessionId && cart.expiresAt >= Date.now()) {
        return cart
      }
    }
    return null
  }

  /**
   * Add item to guest cart
   */
  addItemToCart(cartId: string, item: Omit<GuestCartItem, 'id' | 'addedAt'>): GuestCart | null {
    const cart = this.getGuestCart(cartId)
    if (!cart) return null

    // Check if item already exists (same menu item and customizations)
    const existingItemIndex = cart.items.findIndex(existing => 
      existing.menuItemId === item.menuItemId &&
      JSON.stringify(existing.customizations) === JSON.stringify(item.customizations)
    )

    if (existingItemIndex >= 0) {
      // Update quantity of existing item
      cart.items[existingItemIndex].quantity += item.quantity
    } else {
      // Add new item
      const newItem: GuestCartItem = {
        ...item,
        id: generateSecureId(),
        addedAt: Date.now(),
      }
      cart.items.push(newItem)
    }

    this.updateCartTotals(cart)
    this.cartCache.set(cartId, cart)
    return cart
  }

  /**
   * Update item quantity in cart
   */
  updateItemQuantity(cartId: string, itemId: string, quantity: number): GuestCart | null {
    const cart = this.getGuestCart(cartId)
    if (!cart) return null

    if (quantity <= 0) {
      return this.removeItemFromCart(cartId, itemId)
    }

    const itemIndex = cart.items.findIndex(item => item.id === itemId)
    if (itemIndex === -1) return null

    cart.items[itemIndex].quantity = quantity
    cart.items[itemIndex].addedAt = Date.now() // Update timestamp
    
    this.updateCartTotals(cart)
    this.cartCache.set(cartId, cart)
    return cart
  }

  /**
   * Remove item from cart
   */
  removeItemFromCart(cartId: string, itemId: string): GuestCart | null {
    const cart = this.getGuestCart(cartId)
    if (!cart) return null

    cart.items = cart.items.filter(item => item.id !== itemId)
    
    this.updateCartTotals(cart)
    this.cartCache.set(cartId, cart)
    return cart
  }

  /**
   * Clear cart
   */
  clearCart(cartId: string): GuestCart | null {
    const cart = this.getGuestCart(cartId)
    if (!cart) return null

    cart.items = []
    this.updateCartTotals(cart)
    this.cartCache.set(cartId, cart)
    return cart
  }

  /**
   * Update cart totals
   */
  private updateCartTotals(cart: GuestCart): void {
    cart.subtotal = cart.items.reduce((total, item) => {
      const itemTotal = item.price * item.quantity
      const customizationsTotal = item.customizations.reduce((sum, customization) => 
        sum + (customization.price * item.quantity), 0)
      return total + itemTotal + customizationsTotal
    }, 0)

    // For now, assume 0% tax - this should be calculated based on restaurant settings
    cart.taxAmount = 0
    cart.total = cart.subtotal + cart.taxAmount
    cart.updatedAt = Date.now()
  }

  /**
   * Convert guest cart to order items
   */
  convertToOrderItems(cart: GuestCart): OrderItem[] {
    return cart.items.map(item => ({
      id: crypto.randomUUID(),
      menuItemId: item.menuItemId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      notes: item.notes,
      customizations: item.customizations,
    }))
  }

  /**
   * Cleanup expired carts
   */
  cleanup(): void {
    const now = Date.now()
    for (const [cartId, cart] of this.cartCache.entries()) {
      if (cart.expiresAt <= now) {
        this.cartCache.delete(cartId)
      }
    }
  }

  /**
   * Get cart stats
   */
  getStats(): { totalCarts: number; totalItems: number; totalValue: number } {
    const activeCarts = Array.from(this.cartCache.values())
      .filter(cart => cart.expiresAt >= Date.now())
    
    return {
      totalCarts: activeCarts.length,
      totalItems: activeCarts.reduce((sum, cart) => sum + cart.items.length, 0),
      totalValue: activeCarts.reduce((sum, cart) => sum + cart.total, 0),
    }
  }
}

// Global guest cart manager
export const guestCartManager = new GuestCartManager()

// Cleanup guest carts every 30 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    guestCartManager.cleanup()
  }, 30 * 60 * 1000)
}

/**
 * Guest checkout utilities
 */
export class GuestCheckoutManager {
  /**
   * Process guest checkout
   */
  async processGuestCheckout(
    sessionId: string,
    checkoutInfo: GuestCheckoutInfo,
    paymentIntentId?: string
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      // Get guest cart
      const cart = guestCartManager.getGuestCartBySession(sessionId)
      if (!cart || cart.items.length === 0) {
        return { success: false, error: 'Cart is empty' }
      }

      // Validate checkout info
      const validatedInfo = GuestCheckoutInfoSchema.parse(checkoutInfo)

      // Create order in database
      const supabase = createServerSupabaseClient()
      
      // Generate order number
      const orderNumber = this.generateOrderNumber()

      const orderData = {
        order_number: orderNumber,
        restaurant_id: cart.restaurantId,
        customer_id: null, // Guest order
        type: validatedInfo.orderType,
        status: 'pending' as const,
        customer_info: validatedInfo.customerInfo,
        delivery_address: validatedInfo.deliveryAddress || null,
        subtotal: cart.subtotal,
        tax_amount: cart.taxAmount,
        delivery_fee: validatedInfo.orderType === 'delivery' ? 5.00 : 0, // Fixed delivery fee
        tip_amount: 0,
        discount_amount: 0,
        total: cart.total + (validatedInfo.orderType === 'delivery' ? 5.00 : 0),
        payment_status: 'pending' as const,
        payment_method: validatedInfo.paymentMethod,
        payment_intent_id: paymentIntentId,
        notes: validatedInfo.notes,
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single()

      if (orderError) {
        console.error('Error creating order:', orderError)
        return { success: false, error: 'Failed to create order' }
      }

      // Create order items
      const orderItems = cart.items.map(item => ({
        order_id: order.id,
        menu_item_id: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes,
        customizations: item.customizations,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Error creating order items:', itemsError)
        // Try to cleanup the order
        await supabase.from('orders').delete().eq('id', order.id)
        return { success: false, error: 'Failed to create order items' }
      }

      // Clear the cart after successful order
      guestCartManager.clearCart(cart.id)

      return { success: true, orderId: order.id }
    } catch (error) {
      console.error('Guest checkout error:', error)
      return { success: false, error: 'Checkout failed' }
    }
  }

  /**
   * Generate unique order number
   */
  private generateOrderNumber(): string {
    const timestamp = Date.now().toString()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `ORD-${timestamp.slice(-6)}${random}`
  }

  /**
   * Offer account creation after guest checkout
   */
  async offerAccountCreation(
    email: string,
    restaurantId: string,
    orderIds: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createServerSupabaseClient()

      // Check if email already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

      if (!checkError && existingUser) {
        return { success: false, error: 'Email already registered' }
      }

      // This would typically send an email with account creation link
      // For now, we'll just return success
      console.log(`Account creation offered for ${email} with orders:`, orderIds)

      return { success: true }
    } catch (error) {
      console.error('Error offering account creation:', error)
      return { success: false, error: 'Failed to process request' }
    }
  }

  /**
   * Track guest order without account
   */
  async trackGuestOrder(orderNumber: string, email: string): Promise<any> {
    try {
      const supabase = createServerSupabaseClient()

      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*)
        `)
        .eq('order_number', orderNumber)
        .single()

      if (error) {
        return null
      }

      // Verify the email matches
      const customerEmail = (order.customer_info as any)?.email
      if (customerEmail !== email) {
        return null
      }

      return order
    } catch (error) {
      console.error('Error tracking guest order:', error)
      return null
    }
  }
}

// Global guest checkout manager
export const guestCheckoutManager = new GuestCheckoutManager()

/**
 * Guest session utilities
 */
export async function createGuestSession(restaurantId: string): Promise<{
  sessionToken: string;
  cartId: string;
}> {
  // Create guest session
  const sessionToken = await sessionManager.createGuestSession(restaurantId)
  
  // Extract session ID from token (this is a simplified approach)
  const sessionId = generateSecureId()
  
  // Create guest cart
  const cart = guestCartManager.createGuestCart(sessionId, restaurantId)
  
  // Update session with cart ID
  sessionManager.updateGuestSessionCart(sessionId, cart.id)

  return {
    sessionToken,
    cartId: cart.id,
  }
}

/**
 * Get guest cart from session token
 */
export function getGuestCartFromSession(sessionId: string): GuestCart | null {
  return guestCartManager.getGuestCartBySession(sessionId)
}

/**
 * Migrate guest cart to user account
 */
export async function migrateGuestCartToUser(
  sessionId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cart = guestCartManager.getGuestCartBySession(sessionId)
    if (!cart || cart.items.length === 0) {
      return { success: true } // No cart to migrate
    }

    // Here you would typically save the cart items to the user's account
    // For now, we'll just clear the guest cart
    guestCartManager.clearCart(cart.id)

    return { success: true }
  } catch (error) {
    console.error('Error migrating guest cart:', error)
    return { success: false, error: 'Failed to migrate cart' }
  }
}