'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/lib/supabase/types'

type Order = Database['public']['Tables']['orders']['Row']
type OrderItem = Database['public']['Tables']['order_items']['Row']
type OrderStatus = Database['public']['Enums']['order_status']

export interface OrderWithDetails extends Order {
  order_items: OrderItem[]
  restaurant: {
    name: string
    phone: string
    email: string
    address_street: string
    address_city: string
    address_state: string
    address_zip_code: string
  }
}

// Get order with all details
export async function getOrderDetails(orderId: string): Promise<{
  order: OrderWithDetails | null
  error: string | null
}> {
  const supabase = createClient()

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        restaurants!inner (
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

    if (error) {
      console.error('Error fetching order details:', error)
      return { order: null, error: 'Order not found' }
    }

    return { order: order as OrderWithDetails, error: null }
  } catch (error) {
    console.error('Error fetching order details:', error)
    return { order: null, error: 'Failed to fetch order details' }
  }
}

// Get order by order number
export async function getOrderByOrderNumber(orderNumber: string): Promise<{
  order: OrderWithDetails | null
  error: string | null
}> {
  const supabase = createClient()

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        restaurants!inner (
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

    if (error) {
      console.error('Error fetching order by number:', error)
      return { order: null, error: 'Order not found' }
    }

    return { order: order as OrderWithDetails, error: null }
  } catch (error) {
    console.error('Error fetching order by number:', error)
    return { order: null, error: 'Failed to fetch order' }
  }
}

// Update order status
export async function updateOrderStatus(
  orderId: string, 
  status: OrderStatus,
  estimatedReadyTime?: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = createClient()

  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    // Set actual ready time when order is ready
    if (status === 'ready') {
      updateData.actual_ready_time = new Date().toISOString()
    }

    // Set delivered time when order is delivered/completed
    if (status === 'delivered' || status === 'completed') {
      updateData.delivered_at = new Date().toISOString()
    }

    // Update estimated ready time if provided
    if (estimatedReadyTime) {
      updateData.estimated_ready_time = estimatedReadyTime
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)

    if (error) {
      console.error('Error updating order status:', error)
      return { success: false, error: 'Failed to update order status' }
    }

    // Revalidate paths that might show this order
    revalidatePath('/dashboard/orders')
    revalidatePath(`/order/${orderId}`)

    return { success: true }
  } catch (error) {
    console.error('Error updating order status:', error)
    return { success: false, error: 'Failed to update order status' }
  }
}

// Get order status history (for tracking)
export async function getOrderStatusHistory(orderId: string) {
  // This would require an order_status_history table
  // For now, we'll return the current status with timestamps
  const { order } = await getOrderDetails(orderId)
  
  if (!order) {
    return { history: [], error: 'Order not found' }
  }

  // Build history from available timestamps
  const history = [
    {
      status: 'pending',
      timestamp: order.created_at,
      description: 'Order placed'
    }
  ]

  if (order.status !== 'pending') {
    history.push({
      status: order.status,
      timestamp: order.updated_at,
      description: getStatusDescription(order.status)
    })
  }

  if (order.actual_ready_time) {
    history.push({
      status: 'ready',
      timestamp: order.actual_ready_time,
      description: 'Order ready for pickup/delivery'
    })
  }

  if (order.delivered_at) {
    history.push({
      status: order.status,
      timestamp: order.delivered_at,
      description: order.type === 'delivery' ? 'Order delivered' : 'Order completed'
    })
  }

  return { history, error: null }
}

// Helper function to get status description
function getStatusDescription(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return 'Order placed and waiting for confirmation'
    case 'confirmed':
      return 'Order confirmed by restaurant'
    case 'preparing':
      return 'Kitchen is preparing your order'
    case 'ready':
      return 'Order is ready'
    case 'out_for_delivery':
      return 'Order is out for delivery'
    case 'delivered':
      return 'Order has been delivered'
    case 'completed':
      return 'Order completed'
    case 'canceled':
      return 'Order was canceled'
    case 'refunded':
      return 'Order was refunded'
    default:
      return 'Order status updated'
  }
}

// Calculate estimated ready time based on order complexity
export function calculateEstimatedReadyTime(orderItems: any[], orderType: 'pickup' | 'delivery'): Date {
  // Base preparation time (in minutes)
  let baseTime = 15

  // Add time based on number of items
  const itemCount = orderItems.reduce((sum, item) => sum + item.quantity, 0)
  const additionalTime = Math.max(0, (itemCount - 1) * 3) // 3 minutes per additional item

  // Add delivery time if applicable
  const deliveryTime = orderType === 'delivery' ? 20 : 0

  // Calculate total time
  const totalMinutes = baseTime + additionalTime + deliveryTime

  // Add current time
  const readyTime = new Date()
  readyTime.setMinutes(readyTime.getMinutes() + totalMinutes)

  return readyTime
}

// Get restaurant orders (for staff dashboard)
export async function getRestaurantOrders(
  restaurantId: string,
  status?: OrderStatus,
  limit: number = 50
) {
  const supabase = createClient()

  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('Error fetching restaurant orders:', error)
      return { orders: [], error: 'Failed to fetch orders' }
    }

    return { orders: orders || [], error: null }
  } catch (error) {
    console.error('Error fetching restaurant orders:', error)
    return { orders: [], error: 'Failed to fetch orders' }
  }
}

// Get order analytics for dashboard
export async function getOrderAnalytics(restaurantId: string, days: number = 7) {
  const supabase = createClient()

  try {
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days)

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, total, status, created_at, type')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', fromDate.toISOString())

    if (error) {
      console.error('Error fetching order analytics:', error)
      return { analytics: null, error: 'Failed to fetch analytics' }
    }

    const analytics = {
      totalOrders: orders?.length || 0,
      totalRevenue: orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0,
      avgOrderValue: 0,
      ordersByStatus: {} as Record<string, number>,
      ordersByType: {} as Record<string, number>,
      dailyOrders: [] as Array<{ date: string; orders: number; revenue: number }>
    }

    if (orders && orders.length > 0) {
      analytics.avgOrderValue = analytics.totalRevenue / analytics.totalOrders

      // Count by status
      orders.forEach(order => {
        analytics.ordersByStatus[order.status] = (analytics.ordersByStatus[order.status] || 0) + 1
        analytics.ordersByType[order.type] = (analytics.ordersByType[order.type] || 0) + 1
      })

      // Group by day
      const dailyData: Record<string, { orders: number; revenue: number }> = {}
      orders.forEach(order => {
        const date = new Date(order.created_at).toDateString()
        if (!dailyData[date]) {
          dailyData[date] = { orders: 0, revenue: 0 }
        }
        dailyData[date].orders++
        dailyData[date].revenue += order.total || 0
      })

      analytics.dailyOrders = Object.entries(dailyData).map(([date, data]) => ({
        date,
        ...data
      }))
    }

    return { analytics, error: null }
  } catch (error) {
    console.error('Error fetching order analytics:', error)
    return { analytics: null, error: 'Failed to fetch analytics' }
  }
}

// Cancel order (only if not confirmed yet)
export async function cancelOrder(orderId: string, reason?: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = createClient()

  try {
    // First check if order can be canceled
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      return { success: false, error: 'Order not found' }
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      return { success: false, error: 'Order cannot be canceled at this stage' }
    }

    // Update order status to canceled
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'canceled',
        notes: reason ? `Canceled: ${reason}` : 'Canceled by customer',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('Error canceling order:', updateError)
      return { success: false, error: 'Failed to cancel order' }
    }

    // Revalidate paths
    revalidatePath('/dashboard/orders')
    revalidatePath(`/order/${orderId}`)

    return { success: true }
  } catch (error) {
    console.error('Error canceling order:', error)
    return { success: false, error: 'Failed to cancel order' }
  }
}

// Real-time order status updates (placeholder for future WebSocket implementation)
export async function subscribeToOrderUpdates(orderId: string, callback: (order: any) => void) {
  const supabase = createClient()

  // Set up real-time subscription
  const subscription = supabase
    .channel(`order_${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      },
      (payload) => {
        callback(payload.new)
      }
    )
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}