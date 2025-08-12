import { Database } from '@/lib/supabase/types'

export type OrderStatus = Database['public']['Enums']['order_status']
export type OrderType = Database['public']['Enums']['order_type']
export type Order = Database['public']['Tables']['orders']['Row']

// Order status flow mappings for different order types
export const ORDER_STATUS_FLOWS = {
  dine_in: [
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'completed'
  ] as const,
  takeout: [
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'completed'
  ] as const,
  delivery: [
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'out_for_delivery',
    'delivered'
  ] as const
}

// Status display configurations
export const ORDER_STATUS_CONFIG = {
  pending: {
    label: 'Order Received',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: '⏳',
    description: 'We\'ve received your order and are processing it'
  },
  confirmed: {
    label: 'Order Confirmed',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '✅',
    description: 'Your order has been confirmed and sent to the kitchen'
  },
  preparing: {
    label: 'Preparing',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: '👨‍🍳',
    description: 'Our chefs are preparing your delicious meal'
  },
  ready: {
    label: 'Ready',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: '🍽️',
    description: 'Your order is ready for pickup'
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: '🚗',
    description: 'Your order is on its way to you'
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: '📦',
    description: 'Your order has been delivered successfully'
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: '✨',
    description: 'Order completed successfully'
  },
  canceled: {
    label: 'Canceled',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: '❌',
    description: 'This order has been canceled'
  },
  refunded: {
    label: 'Refunded',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: '💰',
    description: 'This order has been refunded'
  }
} as const

// Kitchen priority levels
export const KITCHEN_PRIORITY = {
  HIGH: { level: 1, color: 'bg-red-500', label: 'URGENT' },
  MEDIUM: { level: 2, color: 'bg-yellow-500', label: 'NORMAL' },
  LOW: { level: 3, color: 'bg-green-500', label: 'LOW' }
} as const

/**
 * Calculate estimated completion time based on order items and current kitchen load
 */
export function calculateEstimatedTime(order: Order, kitchenLoad = 0): Date {
  const baseTime = 15 // Base preparation time in minutes
  const loadMultiplier = Math.min(kitchenLoad * 0.1, 2) // Max 2x multiplier
  const itemCount = 1 // This would come from order_items count
  
  const estimatedMinutes = baseTime + (itemCount * 3) + (loadMultiplier * 5)
  
  const now = new Date()
  return new Date(now.getTime() + estimatedMinutes * 60000)
}

/**
 * Determine kitchen priority based on order age and type
 */
export function calculateKitchenPriority(order: Order): keyof typeof KITCHEN_PRIORITY {
  const orderAge = Date.now() - new Date(order.created_at).getTime()
  const ageInMinutes = orderAge / (1000 * 60)
  
  // High priority for orders older than 20 minutes or delivery orders
  if (ageInMinutes > 20 || order.type === 'delivery') {
    return 'HIGH'
  }
  
  // Medium priority for orders 10-20 minutes old
  if (ageInMinutes > 10) {
    return 'MEDIUM'
  }
  
  return 'LOW'
}

/**
 * Get the next valid status in the order flow
 */
export function getNextStatus(currentStatus: OrderStatus, orderType: OrderType): OrderStatus | null {
  const flow = ORDER_STATUS_FLOWS[orderType]
  const currentIndex = flow.indexOf(currentStatus as any)
  
  if (currentIndex === -1 || currentIndex >= flow.length - 1) {
    return null
  }
  
  return flow[currentIndex + 1] as OrderStatus
}

/**
 * Get the previous valid status in the order flow
 */
export function getPreviousStatus(currentStatus: OrderStatus, orderType: OrderType): OrderStatus | null {
  const flow = ORDER_STATUS_FLOWS[orderType]
  const currentIndex = flow.indexOf(currentStatus as any)
  
  if (currentIndex <= 0) {
    return null
  }
  
  return flow[currentIndex - 1] as OrderStatus
}

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
  orderType: OrderType
): boolean {
  const flow = ORDER_STATUS_FLOWS[orderType]
  const fromIndex = flow.indexOf(fromStatus as any)
  const toIndex = flow.indexOf(toStatus as any)
  
  // Allow transitions to canceled or refunded from any status
  if (toStatus === 'canceled' || toStatus === 'refunded') {
    return true
  }
  
  // Only allow forward transitions or staying in the same status
  return toIndex >= fromIndex
}

/**
 * Get progress percentage based on current status
 */
export function getOrderProgress(status: OrderStatus, orderType: OrderType): number {
  const flow = ORDER_STATUS_FLOWS[orderType]
  const currentIndex = flow.indexOf(status as any)
  
  if (currentIndex === -1) {
    return 0
  }
  
  return Math.round((currentIndex / (flow.length - 1)) * 100)
}

/**
 * Format order number for display
 */
export function formatOrderNumber(orderNumber: string): string {
  return `#${orderNumber.toUpperCase()}`
}

/**
 * Calculate order age in human-readable format
 */
export function getOrderAge(createdAt: string): string {
  const now = Date.now()
  const orderTime = new Date(createdAt).getTime()
  const diffInMinutes = Math.floor((now - orderTime) / (1000 * 60))
  
  if (diffInMinutes < 1) {
    return 'Just now'
  }
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }
  
  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays}d ago`
}

/**
 * Generate order timeline events
 */
export function generateOrderTimeline(order: Order) {
  const timeline: Array<{
    status: OrderStatus
    timestamp: string | null
    isCompleted: boolean
    isCurrent: boolean
  }> = []
  
  const flow = ORDER_STATUS_FLOWS[order.type]
  const currentStatusIndex = flow.indexOf(order.status as any)
  
  flow.forEach((status, index) => {
    timeline.push({
      status: status as OrderStatus,
      timestamp: index === 0 ? order.created_at : null,
      isCompleted: index < currentStatusIndex,
      isCurrent: index === currentStatusIndex
    })
  })
  
  return timeline
}

/**
 * Sound notifications for kitchen display
 */
export function playOrderSound(type: 'new_order' | 'update' | 'urgent' = 'new_order') {
  if (typeof window === 'undefined') return
  
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    const frequencies = {
      new_order: [800, 1000, 800], // Pleasant chime
      update: [600], // Single tone
      urgent: [400, 600, 400, 600] // Urgent pattern
    }
    
    const pattern = frequencies[type]
    let time = audioContext.currentTime
    
    pattern.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = freq
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0, time)
      gainNode.gain.linearRampToValueAtTime(0.1, time + 0.05)
      gainNode.gain.linearRampToValueAtTime(0, time + 0.3)
      
      oscillator.start(time)
      oscillator.stop(time + 0.3)
      
      time += 0.4
    })
  } catch (error) {
    console.warn('Audio notifications not supported:', error)
  }
}

/**
 * Validate order data for real-time updates
 */
export function validateOrderUpdate(order: Partial<Order>): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (order.status && !Object.keys(ORDER_STATUS_CONFIG).includes(order.status)) {
    errors.push('Invalid order status')
  }
  
  if (order.type && !['dine_in', 'takeout', 'delivery'].includes(order.type)) {
    errors.push('Invalid order type')
  }
  
  if (order.estimated_ready_time) {
    const estimatedTime = new Date(order.estimated_ready_time)
    if (estimatedTime.getTime() < Date.now()) {
      errors.push('Estimated ready time cannot be in the past')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Format currency values for display
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

/**
 * Calculate time remaining until estimated ready time
 */
export function getTimeRemaining(estimatedReadyTime: string | null): string | null {
  if (!estimatedReadyTime) return null
  
  const now = Date.now()
  const readyTime = new Date(estimatedReadyTime).getTime()
  const diffInMinutes = Math.ceil((readyTime - now) / (1000 * 60))
  
  if (diffInMinutes <= 0) {
    return 'Ready now'
  }
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes} min`
  }
  
  const hours = Math.floor(diffInMinutes / 60)
  const minutes = diffInMinutes % 60
  
  return `${hours}h ${minutes}m`
}