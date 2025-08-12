'use client'

import { useEffect, useState, useCallback } from 'react'
import { subscribeToOrder, subscribeToRestaurantOrders, orderSubscriptionManager } from '@/lib/realtime/supabase-subscriptions'
import { playOrderSound } from '@/lib/realtime/order-tracking'
import { Database } from '@/lib/supabase/types'
import { OrderStatusBadge, KitchenStatusBadge } from './order-status-badge'
import { OrderTimeline } from './order-timeline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { 
  Bell, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Users,
  TrendingUp
} from 'lucide-react'

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

// Live order updates for a single order
interface LiveOrderUpdatesProps {
  orderId: string
  initialOrder?: Order
  onOrderUpdate?: (order: Order) => void
  showTimeline?: boolean
  className?: string
}

export function LiveOrderUpdates({
  orderId,
  initialOrder,
  onOrderUpdate,
  showTimeline = true,
  className
}: LiveOrderUpdatesProps) {
  const [order, setOrder] = useState<Order | null>(initialOrder || null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const handleOrderUpdate = useCallback((updatedOrder: Order) => {
    setOrder(updatedOrder)
    setLastUpdate(new Date())
    onOrderUpdate?.(updatedOrder)
    
    // Play sound for status changes
    if (order && order.status !== updatedOrder.status) {
      playOrderSound('update')
    }
  }, [order, onOrderUpdate])

  const handleError = useCallback((error: Error) => {
    setError(error.message)
    setIsConnected(false)
  }, [])

  useEffect(() => {
    setError(null)
    setIsConnected(true)

    const unsubscribe = subscribeToOrder(orderId, {
      onOrderUpdated: handleOrderUpdate,
      onError: handleError
    })

    return () => {
      unsubscribe()
      setIsConnected(false)
    }
  }, [orderId, handleOrderUpdate, handleError])

  if (error) {
    return (
      <Alert className={cn('border-red-200 bg-red-50', className)}>
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-700">
          Connection error: {error}
        </AlertDescription>
      </Alert>
    )
  }

  if (!order) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span className={cn(
            'text-sm',
            isConnected ? 'text-green-600' : 'text-red-600'
          )}>
            {isConnected ? 'Live Updates Active' : 'Connection Lost'}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          Last update: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      {/* Order Content */}
      {showTimeline ? (
        <OrderTimeline order={order} />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Order #{order.order_number}</CardTitle>
              <OrderStatusBadge status={order.status} order={order} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                {new Date(order.created_at).toLocaleString()}
              </div>
              {order.estimated_ready_time && (
                <div className="text-sm">
                  <span className="font-medium">Estimated ready:</span>{' '}
                  {new Date(order.estimated_ready_time).toLocaleString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Live order list for restaurant dashboard
interface LiveOrderListProps {
  restaurantId: string
  statusFilter?: OrderStatus[]
  onOrderCreated?: (order: Order) => void
  onOrderUpdated?: (order: Order) => void
  maxOrders?: number
  variant?: 'default' | 'kitchen' | 'compact'
  className?: string
}

export function LiveOrderList({
  restaurantId,
  statusFilter = ['pending', 'confirmed', 'preparing', 'ready'],
  onOrderCreated,
  onOrderUpdated,
  maxOrders = 50,
  variant = 'default',
  className
}: LiveOrderListProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    preparing: 0,
    ready: 0
  })

  const updateStats = useCallback((orderList: Order[]) => {
    setStats({
      total: orderList.length,
      pending: orderList.filter(o => o.status === 'pending').length,
      preparing: orderList.filter(o => o.status === 'preparing').length,
      ready: orderList.filter(o => o.status === 'ready').length
    })
  }, [])

  const handleOrderCreated = useCallback((order: Order) => {
    setOrders(prev => {
      const updated = [order, ...prev].slice(0, maxOrders)
      updateStats(updated)
      return updated
    })
    onOrderCreated?.(order)
    playOrderSound('new_order')
  }, [maxOrders, onOrderCreated, updateStats])

  const handleOrderUpdated = useCallback((oldOrder: Order | null, newOrder: Order) => {
    setOrders(prev => {
      const updated = prev.map(o => o.id === newOrder.id ? newOrder : o)
        .filter(o => statusFilter.includes(o.status))
      updateStats(updated)
      return updated
    })
    onOrderUpdated?.(newOrder)
    
    if (oldOrder && oldOrder.status !== newOrder.status) {
      playOrderSound('update')
    }
  }, [statusFilter, onOrderUpdated, updateStats])

  const handleError = useCallback((error: Error) => {
    setError(error.message)
    setIsConnected(false)
  }, [])

  useEffect(() => {
    setError(null)
    setIsConnected(true)

    const unsubscribe = subscribeToRestaurantOrders(restaurantId, {
      onOrderCreated: handleOrderCreated,
      onOrderUpdated: handleOrderUpdated,
      onError: handleError
    })

    return () => {
      unsubscribe()
      setIsConnected(false)
    }
  }, [restaurantId, handleOrderCreated, handleOrderUpdated, handleError])

  if (error) {
    return (
      <Alert className={cn('border-red-200 bg-red-50', className)}>
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-700">
          Failed to load live orders: {error}
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Stats Bar */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm font-medium">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span>Total: <strong>{stats.total}</strong></span>
              <span>Pending: <strong>{stats.pending}</strong></span>
              <span>Preparing: <strong>{stats.preparing}</strong></span>
              <span>Ready: <strong>{stats.ready}</strong></span>
            </div>
          </div>
        </div>

        {/* Compact Order List */}
        <div className="space-y-2">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                No active orders
              </CardContent>
            </Card>
          ) : (
            orders.map(order => (
              <Card key={order.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">#{order.order_number}</span>
                    <OrderStatusBadge 
                      status={order.status} 
                      order={order} 
                      variant="outline" 
                      size="sm" 
                    />
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    )
  }

  if (variant === 'kitchen') {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Kitchen Header */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Kitchen Display
              </CardTitle>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <Wifi className="w-3 h-3 mr-1" />
                    Live
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-red-600 border-red-600">
                    <WifiOff className="w-3 h-3 mr-1" />
                    Offline
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Kitchen Stats */}
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-xs text-gray-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.preparing}</div>
                <div className="text-xs text-gray-600">Preparing</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
                <div className="text-xs text-gray-600">Ready</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Kitchen Order Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No orders in kitchen queue</p>
              </CardContent>
            </Card>
          ) : (
            orders.map(order => (
              <Card key={order.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">#{order.order_number}</CardTitle>
                      <p className="text-sm text-gray-600">
                        {order.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                    </div>
                    <KitchenStatusBadge order={order} compact />
                  </div>
                </CardHeader>
                <CardContent>
                  {order.order_items && (
                    <div className="space-y-2">
                      {order.order_items.slice(0, 3).map(item => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.name}</span>
                        </div>
                      ))}
                      {order.order_items.length > 3 && (
                        <p className="text-xs text-gray-500">
                          +{order.order_items.length - 3} more items
                        </p>
                      )}
                    </div>
                  )}
                  {order.notes && (
                    <div className="mt-3 p-2 bg-yellow-50 rounded text-sm">
                      <strong>Note:</strong> {order.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Live Orders
            </CardTitle>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600 border-red-600">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Disconnected
                </Badge>
              )}
              <Badge variant="secondary">
                {orders.length} active
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Order List */}
      <div className="space-y-4">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No active orders</p>
              <p className="text-sm">New orders will appear here automatically</p>
            </CardContent>
          </Card>
        ) : (
          orders.map(order => (
            <LiveOrderUpdates
              key={order.id}
              orderId={order.id}
              initialOrder={order}
              showTimeline={false}
            />
          ))
        )}
      </div>
    </div>
  )
}