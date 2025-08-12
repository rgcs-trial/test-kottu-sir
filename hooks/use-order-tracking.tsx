'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { subscribeToOrder, subscribeToRestaurantOrders } from '@/lib/realtime/supabase-subscriptions'
import { calculateEstimatedTime, getNextStatus, isValidStatusTransition, validateOrderUpdate } from '@/lib/realtime/order-tracking'
import { Database } from '@/lib/supabase/types'

type Order = Database['public']['Tables']['orders']['Row'] & {
  order_items?: Array<{
    id: string
    name: string
    quantity: number
    price: number
    notes?: string
    customizations?: any
  }>
}

type OrderStatus = Database['public']['Enums']['order_status']
type OrderType = Database['public']['Enums']['order_type']

interface OrderTrackingState {
  order: Order | null
  loading: boolean
  error: string | null
  connected: boolean
  lastUpdated: Date | null
}

interface OrderListState {
  orders: Order[]
  loading: boolean
  error: string | null
  connected: boolean
  total: number
  hasMore: boolean
}

// Hook for tracking a single order
export function useOrderTracking(orderId: string) {
  const [state, setState] = useState<OrderTrackingState>({
    order: null,
    loading: true,
    error: null,
    connected: false,
    lastUpdated: null
  })

  const supabase = createClient()
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Fetch initial order data
  const fetchOrder = useCallback(async () => {
    if (!orderId) return

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            name,
            quantity,
            price,
            notes,
            customizations
          )
        `)
        .eq('id', orderId)
        .single()

      if (error) throw error

      setState(prev => ({
        ...prev,
        order: order as Order,
        loading: false,
        lastUpdated: new Date()
      }))
    } catch (error) {
      console.error('Error fetching order:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch order',
        loading: false
      }))
    }
  }, [orderId, supabase])

  // Update order status
  const updateStatus = useCallback(async (newStatus: OrderStatus) => {
    if (!state.order) return { success: false, error: 'No order loaded' }

    // Validate transition
    if (!isValidStatusTransition(state.order.status, newStatus, state.order.type)) {
      return { 
        success: false, 
        error: `Invalid status transition from ${state.order.status} to ${newStatus}` 
      }
    }

    try {
      const response = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId: state.order.id, 
          status: newStatus 
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update status')
      }

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update status'
      setState(prev => ({ ...prev, error: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }, [state.order])

  // Update estimated ready time
  const updateEstimatedTime = useCallback(async (estimatedTime: Date) => {
    if (!state.order) return { success: false, error: 'No order loaded' }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          estimated_ready_time: estimatedTime.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', state.order.id)

      if (error) throw error

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update estimated time'
      setState(prev => ({ ...prev, error: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }, [state.order, supabase])

  // Get next possible status
  const getNextPossibleStatus = useCallback(() => {
    if (!state.order) return null
    return getNextStatus(state.order.status, state.order.type)
  }, [state.order])

  // Get estimated completion time
  const getEstimatedCompletion = useCallback(() => {
    if (!state.order) return null
    return calculateEstimatedTime(state.order)
  }, [state.order])

  // Handle real-time updates
  const handleOrderUpdate = useCallback((updatedOrder: Order) => {
    setState(prev => ({
      ...prev,
      order: updatedOrder,
      lastUpdated: new Date(),
      error: null
    }))
  }, [])

  const handleError = useCallback((error: Error) => {
    setState(prev => ({
      ...prev,
      error: error.message,
      connected: false
    }))
  }, [])

  // Set up real-time subscription
  useEffect(() => {
    if (!orderId) return

    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
    }

    // Fetch initial data
    fetchOrder()

    // Set up real-time subscription
    const unsubscribe = subscribeToOrder(orderId, {
      onOrderUpdated: handleOrderUpdate,
      onError: handleError
    })

    unsubscribeRef.current = unsubscribe
    setState(prev => ({ ...prev, connected: true }))

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      setState(prev => ({ ...prev, connected: false }))
    }
  }, [orderId, fetchOrder, handleOrderUpdate, handleError])

  // Retry connection
  const retry = useCallback(() => {
    fetchOrder()
  }, [fetchOrder])

  return {
    order: state.order,
    loading: state.loading,
    error: state.error,
    connected: state.connected,
    lastUpdated: state.lastUpdated,
    updateStatus,
    updateEstimatedTime,
    getNextPossibleStatus,
    getEstimatedCompletion,
    retry,
    refetch: fetchOrder
  }
}

// Hook for tracking multiple orders (restaurant dashboard)
export function useOrderList(
  restaurantId: string,
  options: {
    statusFilter?: OrderStatus[]
    limit?: number
    realtime?: boolean
  } = {}
) {
  const {
    statusFilter = ['pending', 'confirmed', 'preparing', 'ready'],
    limit = 50,
    realtime = true
  } = options

  const [state, setState] = useState<OrderListState>({
    orders: [],
    loading: true,
    error: null,
    connected: false,
    total: 0,
    hasMore: false
  })

  const supabase = createClient()
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Fetch orders
  const fetchOrders = useCallback(async (offset = 0) => {
    if (!restaurantId) return

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            name,
            quantity,
            price,
            notes,
            customizations
          )
        `, { count: 'exact' })
        .eq('restaurant_id', restaurantId)
        .in('status', statusFilter)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      const { data: orders, error, count } = await query

      if (error) throw error

      setState(prev => ({
        ...prev,
        orders: offset === 0 ? (orders as Order[] || []) : [...prev.orders, ...(orders as Order[] || [])],
        loading: false,
        total: count || 0,
        hasMore: (count || 0) > offset + limit
      }))
    } catch (error) {
      console.error('Error fetching orders:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch orders',
        loading: false
      }))
    }
  }, [restaurantId, statusFilter, limit, supabase])

  // Load more orders
  const loadMore = useCallback(() => {
    if (state.loading || !state.hasMore) return
    fetchOrders(state.orders.length)
  }, [state.loading, state.hasMore, state.orders.length, fetchOrders])

  // Refresh orders
  const refresh = useCallback(() => {
    fetchOrders(0)
  }, [fetchOrders])

  // Update order in list
  const updateOrderInList = useCallback((updatedOrder: Order) => {
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(order => 
        order.id === updatedOrder.id ? updatedOrder : order
      ).filter(order => statusFilter.includes(order.status)),
      lastUpdated: new Date()
    }))
  }, [statusFilter])

  // Add new order to list
  const addOrderToList = useCallback((newOrder: Order) => {
    if (statusFilter.includes(newOrder.status)) {
      setState(prev => ({
        ...prev,
        orders: [newOrder, ...prev.orders],
        total: prev.total + 1
      }))
    }
  }, [statusFilter])

  // Remove order from list
  const removeOrderFromList = useCallback((orderId: string) => {
    setState(prev => ({
      ...prev,
      orders: prev.orders.filter(order => order.id !== orderId),
      total: Math.max(0, prev.total - 1)
    }))
  }, [])

  // Handle real-time updates
  const handleOrderCreated = useCallback((order: Order) => {
    addOrderToList(order)
  }, [addOrderToList])

  const handleOrderUpdated = useCallback((oldOrder: Order | null, newOrder: Order) => {
    updateOrderInList(newOrder)
  }, [updateOrderInList])

  const handleOrderDeleted = useCallback((order: Order) => {
    removeOrderFromList(order.id)
  }, [removeOrderFromList])

  const handleError = useCallback((error: Error) => {
    setState(prev => ({
      ...prev,
      error: error.message,
      connected: false
    }))
  }, [])

  // Set up real-time subscription
  useEffect(() => {
    if (!restaurantId || !realtime) return

    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
    }

    // Set up real-time subscription
    const unsubscribe = subscribeToRestaurantOrders(restaurantId, {
      onOrderCreated: handleOrderCreated,
      onOrderUpdated: handleOrderUpdated,
      onOrderDeleted: handleOrderDeleted,
      onError: handleError
    })

    unsubscribeRef.current = unsubscribe
    setState(prev => ({ ...prev, connected: true }))

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      setState(prev => ({ ...prev, connected: false }))
    }
  }, [restaurantId, realtime, handleOrderCreated, handleOrderUpdated, handleOrderDeleted, handleError])

  // Initial fetch
  useEffect(() => {
    if (restaurantId) {
      fetchOrders(0)
    }
  }, [restaurantId, fetchOrders])

  // Bulk update order statuses
  const bulkUpdateStatus = useCallback(async (orderIds: string[], newStatus: OrderStatus) => {
    try {
      const response = await fetch('/api/orders/bulk-update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds, status: newStatus })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update orders')
      }

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update orders'
      setState(prev => ({ ...prev, error: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }, [])

  // Get orders by status
  const getOrdersByStatus = useCallback((status: OrderStatus) => {
    return state.orders.filter(order => order.status === status)
  }, [state.orders])

  // Get order statistics
  const getStats = useCallback(() => {
    const stats = {
      total: state.orders.length,
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      completed: 0,
      canceled: 0
    }

    state.orders.forEach(order => {
      if (order.status in stats) {
        stats[order.status as keyof typeof stats]++
      }
    })

    return stats
  }, [state.orders])

  return {
    orders: state.orders,
    loading: state.loading,
    error: state.error,
    connected: state.connected,
    total: state.total,
    hasMore: state.hasMore,
    loadMore,
    refresh,
    bulkUpdateStatus,
    getOrdersByStatus,
    getStats,
    retry: refresh
  }
}

// Hook for kitchen-specific order management
export function useKitchenOrders(restaurantId: string) {
  const kitchenStatuses: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready']
  
  const orderList = useOrderList(restaurantId, {
    statusFilter: kitchenStatuses,
    realtime: true
  })

  // Mark order as next status
  const advanceOrder = useCallback(async (orderId: string) => {
    const order = orderList.orders.find(o => o.id === orderId)
    if (!order) return { success: false, error: 'Order not found' }

    const nextStatus = getNextStatus(order.status, order.type)
    if (!nextStatus) return { success: false, error: 'No next status available' }

    try {
      const response = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: nextStatus })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to advance order')
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to advance order' 
      }
    }
  }, [orderList.orders])

  // Get orders by priority
  const getOrdersByPriority = useCallback(() => {
    const high: Order[] = []
    const medium: Order[] = []
    const low: Order[] = []

    orderList.orders.forEach(order => {
      const age = Date.now() - new Date(order.created_at).getTime()
      const ageInMinutes = age / (1000 * 60)

      if (ageInMinutes > 20 || order.type === 'delivery') {
        high.push(order)
      } else if (ageInMinutes > 10) {
        medium.push(order)
      } else {
        low.push(order)
      }
    })

    return { high, medium, low }
  }, [orderList.orders])

  return {
    ...orderList,
    advanceOrder,
    getOrdersByPriority
  }
}