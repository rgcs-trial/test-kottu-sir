import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/types'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { playOrderSound } from './order-tracking'

type Order = Database['public']['Tables']['orders']['Row']
type OrderItem = Database['public']['Tables']['order_items']['Row']
type OrderStatus = Database['public']['Enums']['order_status']

// Subscription manager class for handling real-time connections
export class OrderSubscriptionManager {
  private channels: Map<string, RealtimeChannel> = new Map()
  private supabase = createClient()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  /**
   * Subscribe to order updates for a specific restaurant
   */
  subscribeToRestaurantOrders(
    restaurantId: string,
    callbacks: {
      onOrderCreated?: (order: Order) => void
      onOrderUpdated?: (oldOrder: Order | null, newOrder: Order) => void
      onOrderDeleted?: (order: Order) => void
      onError?: (error: Error) => void
    }
  ): () => void {
    const channelName = `restaurant-orders-${restaurantId}`
    
    // Remove existing subscription if it exists
    this.unsubscribeFromChannel(channelName)

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload: RealtimePostgresChangesPayload<Order>) => {
          console.log('New order received:', payload.new)
          if (callbacks.onOrderCreated && payload.new) {
            callbacks.onOrderCreated(payload.new)
            // Play sound for new orders
            playOrderSound('new_order')
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload: RealtimePostgresChangesPayload<Order>) => {
          console.log('Order updated:', payload.new)
          if (callbacks.onOrderUpdated && payload.new) {
            callbacks.onOrderUpdated(payload.old || null, payload.new)
            // Play update sound for status changes
            if (payload.old?.status !== payload.new.status) {
              playOrderSound('update')
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload: RealtimePostgresChangesPayload<Order>) => {
          console.log('Order deleted:', payload.old)
          if (callbacks.onOrderDeleted && payload.old) {
            callbacks.onOrderDeleted(payload.old)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to restaurant orders: ${restaurantId}`)
          this.reconnectAttempts = 0
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Subscription error for restaurant: ${restaurantId}`)
          if (callbacks.onError) {
            callbacks.onError(new Error('Real-time subscription failed'))
          }
          this.handleReconnection(channelName, restaurantId, callbacks)
        }
      })

    this.channels.set(channelName, channel)

    // Return unsubscribe function
    return () => this.unsubscribeFromChannel(channelName)
  }

  /**
   * Subscribe to a specific order updates
   */
  subscribeToOrder(
    orderId: string,
    callbacks: {
      onOrderUpdated?: (order: Order) => void
      onOrderItemsUpdated?: (items: OrderItem[]) => void
      onError?: (error: Error) => void
    }
  ): () => void {
    const channelName = `order-${orderId}`
    
    // Remove existing subscription if it exists
    this.unsubscribeFromChannel(channelName)

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload: RealtimePostgresChangesPayload<Order>) => {
          console.log('Order updated:', payload.new)
          if (callbacks.onOrderUpdated && payload.new) {
            callbacks.onOrderUpdated(payload.new)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items',
          filter: `order_id=eq.${orderId}`
        },
        async (payload: RealtimePostgresChangesPayload<OrderItem>) => {
          console.log('Order items updated:', payload)
          if (callbacks.onOrderItemsUpdated) {
            // Fetch all order items for this order
            const { data: items, error } = await this.supabase
              .from('order_items')
              .select('*')
              .eq('order_id', orderId)
              .order('created_at', { ascending: true })

            if (error) {
              console.error('Error fetching order items:', error)
              if (callbacks.onError) {
                callbacks.onError(error)
              }
            } else {
              callbacks.onOrderItemsUpdated(items || [])
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to order: ${orderId}`)
          this.reconnectAttempts = 0
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Subscription error for order: ${orderId}`)
          if (callbacks.onError) {
            callbacks.onError(new Error('Real-time subscription failed'))
          }
          this.handleReconnection(channelName, orderId, callbacks)
        }
      })

    this.channels.set(channelName, channel)

    // Return unsubscribe function
    return () => this.unsubscribeFromChannel(channelName)
  }

  /**
   * Subscribe to orders by status (useful for kitchen displays)
   */
  subscribeToOrdersByStatus(
    restaurantId: string,
    statuses: OrderStatus[],
    callbacks: {
      onOrdersChanged?: (orders: Order[]) => void
      onError?: (error: Error) => void
    }
  ): () => void {
    const channelName = `restaurant-orders-status-${restaurantId}-${statuses.join('-')}`
    
    // Remove existing subscription if it exists
    this.unsubscribeFromChannel(channelName)

    const statusFilter = statuses.map(status => `status=eq.${status}`).join(',')

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        async (payload: RealtimePostgresChangesPayload<Order>) => {
          console.log('Order status change:', payload)
          if (callbacks.onOrdersChanged) {
            // Fetch all orders with the specified statuses
            const { data: orders, error } = await this.supabase
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
              .eq('restaurant_id', restaurantId)
              .in('status', statuses)
              .order('created_at', { ascending: true })

            if (error) {
              console.error('Error fetching orders by status:', error)
              if (callbacks.onError) {
                callbacks.onError(error)
              }
            } else {
              callbacks.onOrdersChanged(orders as any || [])
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to orders by status: ${restaurantId} - ${statuses.join(', ')}`)
          this.reconnectAttempts = 0
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Subscription error for orders by status: ${restaurantId}`)
          if (callbacks.onError) {
            callbacks.onError(new Error('Real-time subscription failed'))
          }
          this.handleReconnection(channelName, { restaurantId, statuses }, callbacks)
        }
      })

    this.channels.set(channelName, channel)

    // Return unsubscribe function
    return () => this.unsubscribeFromChannel(channelName)
  }

  /**
   * Subscribe to platform-wide order metrics (for admin dashboard)
   */
  subscribeToPlatformMetrics(
    callbacks: {
      onMetricsUpdated?: (metrics: {
        totalOrders: number
        pendingOrders: number
        activeRestaurants: number
      }) => void
      onError?: (error: Error) => void
    }
  ): () => void {
    const channelName = 'platform-metrics'
    
    // Remove existing subscription if it exists
    this.unsubscribeFromChannel(channelName)

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        async () => {
          if (callbacks.onMetricsUpdated) {
            try {
              // Fetch platform metrics
              const [ordersResult, pendingResult, restaurantsResult] = await Promise.all([
                this.supabase
                  .from('orders')
                  .select('id', { count: 'exact', head: true }),
                this.supabase
                  .from('orders')
                  .select('id', { count: 'exact', head: true })
                  .in('status', ['pending', 'confirmed', 'preparing']),
                this.supabase
                  .from('restaurants')
                  .select('id', { count: 'exact', head: true })
                  .eq('status', 'active')
              ])

              callbacks.onMetricsUpdated({
                totalOrders: ordersResult.count || 0,
                pendingOrders: pendingResult.count || 0,
                activeRestaurants: restaurantsResult.count || 0
              })
            } catch (error) {
              console.error('Error fetching platform metrics:', error)
              if (callbacks.onError) {
                callbacks.onError(error as Error)
              }
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to platform metrics')
          this.reconnectAttempts = 0
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Subscription error for platform metrics')
          if (callbacks.onError) {
            callbacks.onError(new Error('Real-time subscription failed'))
          }
        }
      })

    this.channels.set(channelName, channel)

    // Return unsubscribe function
    return () => this.unsubscribeFromChannel(channelName)
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnection(channelName: string, params: any, callbacks: any) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnection attempts reached for ${channelName}`)
      return
    }

    this.reconnectAttempts++
    console.log(`Attempting to reconnect ${channelName} (attempt ${this.reconnectAttempts})`)

    setTimeout(() => {
      this.unsubscribeFromChannel(channelName)
      
      // Retry based on channel type
      if (channelName.includes('restaurant-orders-status')) {
        this.subscribeToOrdersByStatus(params.restaurantId, params.statuses, callbacks)
      } else if (channelName.includes('restaurant-orders')) {
        this.subscribeToRestaurantOrders(params, callbacks)
      } else if (channelName.includes('order-')) {
        this.subscribeToOrder(params, callbacks)
      } else if (channelName === 'platform-metrics') {
        this.subscribeToPlatformMetrics(callbacks)
      }
    }, this.reconnectDelay * this.reconnectAttempts)
  }

  /**
   * Unsubscribe from a specific channel
   */
  private unsubscribeFromChannel(channelName: string) {
    const channel = this.channels.get(channelName)
    if (channel) {
      this.supabase.removeChannel(channel)
      this.channels.delete(channelName)
      console.log(`Unsubscribed from ${channelName}`)
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll() {
    for (const [channelName, channel] of this.channels) {
      this.supabase.removeChannel(channel)
      console.log(`Unsubscribed from ${channelName}`)
    }
    this.channels.clear()
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    // Check if any channels are connected
    for (const channel of this.channels.values()) {
      if (channel.state === 'joined') {
        return 'connected'
      } else if (channel.state === 'joining') {
        return 'connecting'
      }
    }
    return 'disconnected'
  }

  /**
   * Get active channel count
   */
  getActiveChannelCount(): number {
    return this.channels.size
  }

  /**
   * Presence tracking for kitchen staff
   */
  subscribeToKitchenPresence(
    restaurantId: string,
    userId: string,
    userInfo: {
      name: string
      role: string
      avatar?: string
    },
    callbacks: {
      onPresenceChanged?: (presence: Array<{
        user_id: string
        name: string
        role: string
        avatar?: string
        online_at: string
      }>) => void
      onError?: (error: Error) => void
    }
  ): () => void {
    const channelName = `kitchen-presence-${restaurantId}`
    
    // Remove existing subscription if it exists
    this.unsubscribeFromChannel(channelName)

    const channel = this.supabase
      .channel(channelName, {
        config: {
          presence: {
            key: userId
          }
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users = Object.keys(state).map(key => ({
          user_id: key,
          ...state[key][0] // Get the first presence entry for each user
        }))
        
        if (callbacks.onPresenceChanged) {
          callbacks.onPresenceChanged(users)
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            ...userInfo,
            online_at: new Date().toISOString()
          })
          console.log(`Joined kitchen presence: ${restaurantId}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Kitchen presence error: ${restaurantId}`)
          if (callbacks.onError) {
            callbacks.onError(new Error('Kitchen presence subscription failed'))
          }
        }
      })

    this.channels.set(channelName, channel)

    // Return unsubscribe function
    return () => {
      channel.untrack()
      this.unsubscribeFromChannel(channelName)
    }
  }
}

// Global instance for subscription management
export const orderSubscriptionManager = new OrderSubscriptionManager()

// Utility functions for common subscription patterns
export function subscribeToRestaurantOrders(
  restaurantId: string,
  callbacks: Parameters<OrderSubscriptionManager['subscribeToRestaurantOrders']>[1]
) {
  return orderSubscriptionManager.subscribeToRestaurantOrders(restaurantId, callbacks)
}

export function subscribeToOrder(
  orderId: string,
  callbacks: Parameters<OrderSubscriptionManager['subscribeToOrder']>[1]
) {
  return orderSubscriptionManager.subscribeToOrder(orderId, callbacks)
}

export function subscribeToKitchenOrders(
  restaurantId: string,
  callbacks: Parameters<OrderSubscriptionManager['subscribeToOrdersByStatus']>[2]
) {
  return orderSubscriptionManager.subscribeToOrdersByStatus(
    restaurantId,
    ['pending', 'confirmed', 'preparing', 'ready'],
    callbacks
  )
}

export function subscribeToPlatformMetrics(
  callbacks: Parameters<OrderSubscriptionManager['subscribeToPlatformMetrics']>[0]
) {
  return orderSubscriptionManager.subscribeToPlatformMetrics(callbacks)
}

export function subscribeToKitchenPresence(
  restaurantId: string,
  userId: string,
  userInfo: Parameters<OrderSubscriptionManager['subscribeToKitchenPresence']>[2],
  callbacks: Parameters<OrderSubscriptionManager['subscribeToKitchenPresence']>[3]
) {
  return orderSubscriptionManager.subscribeToKitchenPresence(restaurantId, userId, userInfo, callbacks)
}

// Cleanup function for when the app unmounts
export function cleanupSubscriptions() {
  orderSubscriptionManager.unsubscribeAll()
}