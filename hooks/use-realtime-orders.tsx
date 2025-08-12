'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  orderSubscriptionManager, 
  subscribeToKitchenOrders, 
  subscribeToPlatformMetrics,
  subscribeToKitchenPresence 
} from '@/lib/realtime/supabase-subscriptions'
import { playOrderSound } from '@/lib/realtime/order-tracking'
import { useOrderNotifications } from '@/components/notifications/order-notifications'
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

// Real-time connection states
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

interface RealtimeOrdersState {
  orders: Order[]
  connectionState: ConnectionState
  lastUpdated: Date | null
  error: string | null
  metrics: {
    totalOrders: number
    pendingOrders: number
    preparingOrders: number
    readyOrders: number
    avgPrepTime: number
    completedToday: number
  }
}

interface RealtimeOrdersOptions {
  restaurantId?: string
  statusFilter?: OrderStatus[]
  enableSound?: boolean
  enableNotifications?: boolean
  autoReconnect?: boolean
  maxReconnectAttempts?: number
}

// Main hook for real-time order management
export function useRealtimeOrders(options: RealtimeOrdersOptions = {}) {
  const {
    restaurantId,
    statusFilter = ['pending', 'confirmed', 'preparing', 'ready'],
    enableSound = true,
    enableNotifications = true,
    autoReconnect = true,
    maxReconnectAttempts = 5
  } = options

  const [state, setState] = useState<RealtimeOrdersState>({
    orders: [],
    connectionState: 'disconnected',
    lastUpdated: null,
    error: null,
    metrics: {
      totalOrders: 0,
      pendingOrders: 0,
      preparingOrders: 0,
      readyOrders: 0,
      avgPrepTime: 0,
      completedToday: 0
    }
  })

  const unsubscribeRef = useRef<(() => void) | null>(null)
  const reconnectAttempts = useRef(0)
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null)

  // Notification management
  const { addNotification } = useOrderNotifications(restaurantId)

  // Calculate metrics from orders
  const calculateMetrics = useCallback((orders: Order[]) => {
    const metrics = {
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      preparingOrders: orders.filter(o => o.status === 'preparing').length,
      readyOrders: orders.filter(o => o.status === 'ready').length,
      avgPrepTime: 0, // Would calculate from historical data
      completedToday: 0 // Would calculate from daily completed orders
    }

    // Calculate average prep time (simplified)
    const completedOrders = orders.filter(o => 
      o.status === 'completed' || o.status === 'delivered'
    )
    
    if (completedOrders.length > 0) {
      const totalPrepTime = completedOrders.reduce((sum, order) => {
        if (order.actual_ready_time && order.created_at) {
          const prepTime = new Date(order.actual_ready_time).getTime() - 
                          new Date(order.created_at).getTime()
          return sum + (prepTime / (1000 * 60)) // Convert to minutes
        }
        return sum
      }, 0)
      
      metrics.avgPrepTime = Math.round(totalPrepTime / completedOrders.length)
    }

    return metrics
  }, [])

  // Handle order updates
  const handleOrdersChanged = useCallback((newOrders: Order[]) => {
    const filteredOrders = newOrders.filter(order => 
      statusFilter.includes(order.status)
    )

    const metrics = calculateMetrics(filteredOrders)

    setState(prev => ({
      ...prev,
      orders: filteredOrders,
      lastUpdated: new Date(),
      metrics,
      error: null
    }))

    // Detect new orders for notifications
    const previousOrderIds = new Set(state.orders.map(o => o.id))
    const newOrdersOnly = filteredOrders.filter(order => 
      !previousOrderIds.has(order.id)
    )

    // Handle new orders
    newOrdersOnly.forEach(order => {
      if (enableSound) {
        playOrderSound('new_order')
      }

      if (enableNotifications) {
        const customerInfo = typeof order.customer_info === 'string' 
          ? JSON.parse(order.customer_info) 
          : order.customer_info || {}

        addNotification({
          orderId: order.id,
          orderNumber: order.order_number,
          type: 'new_order',
          title: 'New Order Received',
          message: `Order #${order.order_number} from ${customerInfo.name || 'Customer'}`,
          status: order.status,
          urgent: false,
          metadata: {
            customerName: customerInfo.name,
            orderTotal: order.total
          }
        })
      }
    })

    // Handle status changes
    state.orders.forEach(prevOrder => {
      const updatedOrder = filteredOrders.find(o => o.id === prevOrder.id)
      if (updatedOrder && updatedOrder.status !== prevOrder.status) {
        if (enableSound) {
          playOrderSound('update')
        }

        if (enableNotifications) {
          const customerInfo = typeof updatedOrder.customer_info === 'string' 
            ? JSON.parse(updatedOrder.customer_info) 
            : updatedOrder.customer_info || {}

          addNotification({
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.order_number,
            type: 'status_change',
            title: 'Order Status Updated',
            message: `Order #${updatedOrder.order_number} is now ${updatedOrder.status.replace('_', ' ')}`,
            status: updatedOrder.status,
            urgent: updatedOrder.status === 'ready',
            metadata: {
              previousStatus: prevOrder.status,
              customerName: customerInfo.name
            }
          })
        }
      }
    })
  }, [statusFilter, calculateMetrics, state.orders, enableSound, enableNotifications, addNotification])

  // Handle connection errors
  const handleError = useCallback((error: Error) => {
    console.error('Real-time orders error:', error)
    setState(prev => ({
      ...prev,
      connectionState: 'error',
      error: error.message
    }))

    // Auto-reconnect logic
    if (autoReconnect && reconnectAttempts.current < maxReconnectAttempts) {
      reconnectAttempts.current++
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
      
      reconnectTimeout.current = setTimeout(() => {
        console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})`)
        connect()
      }, delay)
    }
  }, [autoReconnect, maxReconnectAttempts])

  // Connect to real-time updates
  const connect = useCallback(() => {
    if (!restaurantId) {
      setState(prev => ({ ...prev, connectionState: 'error', error: 'No restaurant ID provided' }))
      return
    }

    setState(prev => ({ ...prev, connectionState: 'connecting', error: null }))

    // Clean up existing subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
    }

    try {
      const unsubscribe = subscribeToKitchenOrders(restaurantId, {
        onOrdersChanged: handleOrdersChanged,
        onError: handleError
      })

      unsubscribeRef.current = unsubscribe
      setState(prev => ({ ...prev, connectionState: 'connected' }))
      reconnectAttempts.current = 0

      // Clear any existing reconnect timeout
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
        reconnectTimeout.current = null
      }

    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Connection failed'))
    }
  }, [restaurantId, handleOrdersChanged, handleError])

  // Disconnect from real-time updates
  const disconnect = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current)
      reconnectTimeout.current = null
    }

    setState(prev => ({ ...prev, connectionState: 'disconnected' }))
    reconnectAttempts.current = 0
  }, [])

  // Manually retry connection
  const retry = useCallback(() => {
    reconnectAttempts.current = 0
    connect()
  }, [connect])

  // Set up initial connection
  useEffect(() => {
    if (restaurantId) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [restaurantId, connect, disconnect])

  // Filter orders by status
  const getOrdersByStatus = useCallback((status: OrderStatus) => {
    return state.orders.filter(order => order.status === status)
  }, [state.orders])

  // Get urgent orders (overdue or high priority)
  const getUrgentOrders = useCallback(() => {
    const now = Date.now()
    return state.orders.filter(order => {
      const orderAge = now - new Date(order.created_at).getTime()
      const ageInMinutes = orderAge / (1000 * 60)
      
      // Consider urgent if order is older than 30 minutes or delivery type
      return ageInMinutes > 30 || order.type === 'delivery'
    })
  }, [state.orders])

  // Update filter in real-time
  const updateStatusFilter = useCallback((newFilter: OrderStatus[]) => {
    // This would trigger a new subscription with the updated filter
    // For now, we'll just filter client-side
    const filteredOrders = state.orders.filter(order => 
      newFilter.includes(order.status)
    )
    
    setState(prev => ({
      ...prev,
      orders: filteredOrders,
      metrics: calculateMetrics(filteredOrders)
    }))
  }, [state.orders, calculateMetrics])

  return {
    // State
    orders: state.orders,
    connectionState: state.connectionState,
    lastUpdated: state.lastUpdated,
    error: state.error,
    metrics: state.metrics,
    
    // Actions
    connect,
    disconnect,
    retry,
    updateStatusFilter,
    
    // Helpers
    getOrdersByStatus,
    getUrgentOrders,
    
    // Connection info
    isConnected: state.connectionState === 'connected',
    isConnecting: state.connectionState === 'connecting',
    hasError: state.connectionState === 'error'
  }
}

// Hook for platform-wide metrics (admin dashboard)
export function usePlatformMetrics() {
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    activeRestaurants: 0
  })
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [error, setError] = useState<string | null>(null)

  const unsubscribeRef = useRef<(() => void) | null>(null)

  const handleMetricsUpdate = useCallback((newMetrics: typeof metrics) => {
    setMetrics(newMetrics)
    setError(null)
  }, [])

  const handleError = useCallback((error: Error) => {
    setError(error.message)
    setConnectionState('error')
  }, [])

  const connect = useCallback(() => {
    setConnectionState('connecting')

    if (unsubscribeRef.current) {
      unsubscribeRef.current()
    }

    const unsubscribe = subscribeToPlatformMetrics({
      onMetricsUpdated: handleMetricsUpdate,
      onError: handleError
    })

    unsubscribeRef.current = unsubscribe
    setConnectionState('connected')
  }, [handleMetricsUpdate, handleError])

  const disconnect = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
    setConnectionState('disconnected')
  }, [])

  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  return {
    metrics,
    connectionState,
    error,
    connect,
    disconnect,
    isConnected: connectionState === 'connected'
  }
}

// Hook for kitchen staff presence
export function useKitchenPresence(
  restaurantId: string,
  userId: string,
  userInfo: {
    name: string
    role: string
    avatar?: string
  }
) {
  const [staff, setStaff] = useState<Array<{
    user_id: string
    name: string
    role: string
    avatar?: string
    online_at: string
  }>>([])
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [error, setError] = useState<string | null>(null)

  const unsubscribeRef = useRef<(() => void) | null>(null)

  const handlePresenceChanged = useCallback((presence: typeof staff) => {
    setStaff(presence)
    setError(null)
  }, [])

  const handleError = useCallback((error: Error) => {
    setError(error.message)
    setConnectionState('error')
  }, [])

  const connect = useCallback(() => {
    if (!restaurantId || !userId) return

    setConnectionState('connecting')

    if (unsubscribeRef.current) {
      unsubscribeRef.current()
    }

    const unsubscribe = subscribeToKitchenPresence(
      restaurantId,
      userId,
      userInfo,
      {
        onPresenceChanged: handlePresenceChanged,
        onError: handleError
      }
    )

    unsubscribeRef.current = unsubscribe
    setConnectionState('connected')
  }, [restaurantId, userId, userInfo, handlePresenceChanged, handleError])

  const disconnect = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
    setConnectionState('disconnected')
  }, [])

  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  const getOnlineStaff = useCallback(() => {
    return staff.filter(member => {
      const lastSeen = new Date(member.online_at).getTime()
      const now = Date.now()
      // Consider online if last seen within 5 minutes
      return (now - lastSeen) < 5 * 60 * 1000
    })
  }, [staff])

  return {
    staff,
    onlineStaff: getOnlineStaff(),
    connectionState,
    error,
    connect,
    disconnect,
    isConnected: connectionState === 'connected'
  }
}

// Hook for connection health monitoring
export function useConnectionHealth() {
  const [health, setHealth] = useState({
    isOnline: navigator.onLine,
    lastCheck: new Date(),
    latency: 0,
    connectionQuality: 'good' as 'excellent' | 'good' | 'poor' | 'offline'
  })

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setHealth(prev => ({ 
      ...prev, 
      isOnline: true, 
      connectionQuality: 'good',
      lastCheck: new Date()
    }))
    
    const handleOffline = () => setHealth(prev => ({ 
      ...prev, 
      isOnline: false, 
      connectionQuality: 'offline',
      lastCheck: new Date()
    }))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Periodic connection test
  useEffect(() => {
    const testConnection = async () => {
      if (!health.isOnline) return

      try {
        const start = Date.now()
        const response = await fetch('/api/health', { 
          method: 'HEAD',
          cache: 'no-cache'
        })
        const latency = Date.now() - start

        setHealth(prev => ({
          ...prev,
          latency,
          connectionQuality: latency < 100 ? 'excellent' : 
                           latency < 300 ? 'good' : 'poor',
          lastCheck: new Date()
        }))
      } catch (error) {
        setHealth(prev => ({
          ...prev,
          connectionQuality: 'poor',
          lastCheck: new Date()
        }))
      }
    }

    const interval = setInterval(testConnection, 30000) // Test every 30 seconds
    testConnection() // Initial test

    return () => clearInterval(interval)
  }, [health.isOnline])

  return health
}

// Cleanup function for all subscriptions
export function cleanupAllSubscriptions() {
  orderSubscriptionManager.unsubscribeAll()
}