'use client'

import { useState, useEffect, useCallback } from 'react'
import { subscribeToKitchenOrders, subscribeToKitchenPresence } from '@/lib/realtime/supabase-subscriptions'
import { calculateKitchenPriority, getNextStatus, playOrderSound, formatCurrency, getOrderAge } from '@/lib/realtime/order-tracking'
import { Database } from '@/lib/supabase/types'
import { KitchenStatusBadge } from '../orders/order-status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  Clock,
  ChefHat,
  Users,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
  Bell,
  BellOff,
  Maximize2,
  Minimize2,
  Filter,
  SortAsc,
  SortDesc,
  Settings,
  Wifi,
  WifiOff,
  Timer,
  DollarSign,
  MapPin,
  Phone,
  MessageSquare
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

interface KitchenDisplayProps {
  restaurantId: string
  userId: string
  userInfo: {
    name: string
    role: string
    avatar?: string
  }
  className?: string
}

export function KitchenDisplay({
  restaurantId,
  userId,
  userInfo,
  className
}: KitchenDisplayProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [staff, setStaff] = useState<Array<{
    user_id: string
    name: string
    role: string
    avatar?: string
    online_at: string
  }>>([])
  const [isConnected, setIsConnected] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [sortBy, setSortBy] = useState<'time' | 'priority' | 'type'>('time')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [statusFilter, setStatusFilter] = useState<OrderStatus[]>(['pending', 'confirmed', 'preparing', 'ready'])
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Kitchen metrics
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    avgPrepTime: 0,
    completedToday: 0,
    revenue: 0
  })

  // Update orders from real-time subscription
  const handleOrdersChanged = useCallback((newOrders: Order[]) => {
    setOrders(newOrders)
    
    // Update metrics
    setMetrics({
      totalOrders: newOrders.length,
      avgPrepTime: 18, // Calculate from actual data
      completedToday: 42, // Get from API
      revenue: newOrders.reduce((sum, order) => sum + order.total, 0)
    })
    
    // Play sound for new orders if enabled
    if (soundEnabled) {
      const hasUrgentOrders = newOrders.some(order => 
        calculateKitchenPriority(order) === 'HIGH'
      )
      if (hasUrgentOrders) {
        playOrderSound('urgent')
      }
    }
  }, [soundEnabled])

  const handlePresenceChanged = useCallback((presence: typeof staff) => {
    setStaff(presence)
  }, [])

  const handleError = useCallback((error: Error) => {
    setError(error.message)
    setIsConnected(false)
  }, [])

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const response = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus })
      })

      if (!response.ok) {
        throw new Error('Failed to update order status')
      }

      if (soundEnabled) {
        playOrderSound('update')
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      setError('Failed to update order status')
    }
  }

  // Sort orders
  const sortedOrders = [...orders].sort((a, b) => {
    const multiplier = sortOrder === 'asc' ? 1 : -1
    
    switch (sortBy) {
      case 'priority':
        const aPriority = calculateKitchenPriority(a)
        const bPriority = calculateKitchenPriority(b)
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
        return (priorityOrder[aPriority] - priorityOrder[bPriority]) * multiplier
      
      case 'type':
        return a.type.localeCompare(b.type) * multiplier
      
      case 'time':
      default:
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * multiplier
    }
  })

  // Filter orders by status
  const filteredOrders = sortedOrders.filter(order => 
    statusFilter.includes(order.status)
  )

  useEffect(() => {
    setError(null)
    setIsConnected(true)

    // Subscribe to kitchen orders
    const unsubscribeOrders = subscribeToKitchenOrders(restaurantId, {
      onOrdersChanged: handleOrdersChanged,
      onError: handleError
    })

    // Subscribe to kitchen presence
    const unsubscribePresence = subscribeToKitchenPresence(
      restaurantId,
      userId,
      userInfo,
      {
        onPresenceChanged: handlePresenceChanged,
        onError: handleError
      }
    )

    return () => {
      unsubscribeOrders()
      unsubscribePresence()
      setIsConnected(false)
    }
  }, [restaurantId, userId, userInfo, handleOrdersChanged, handlePresenceChanged, handleError])

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setFullscreen(true)
    } else {
      document.exitFullscreen()
      setFullscreen(false)
    }
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-700">
          Kitchen display error: {error}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={cn(
      'min-h-screen bg-gray-50',
      fullscreen && 'fixed inset-0 z-50 bg-white',
      className
    )}>
      {/* Kitchen Display Header */}
      <Card className="rounded-none border-x-0 border-t-0">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ChefHat className="w-8 h-8 text-orange-600" />
              <div>
                <CardTitle className="text-2xl">Kitchen Display</CardTitle>
                <p className="text-gray-600">Real-time order management</p>
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center gap-2">
              {/* Connection Status */}
              <Badge variant={isConnected ? 'default' : 'destructive'}>
                {isConnected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                {isConnected ? 'Live' : 'Offline'}
              </Badge>

              {/* Sound Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </Button>

              {/* Fullscreen Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
              >
                {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Kitchen Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{metrics.totalOrders}</div>
                <div className="text-sm text-gray-600">Active Orders</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{metrics.avgPrepTime}m</div>
                <div className="text-sm text-gray-600">Avg Prep Time</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{metrics.completedToday}</div>
                <div className="text-sm text-gray-600">Completed Today</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{formatCurrency(metrics.revenue)}</div>
                <div className="text-sm text-gray-600">Active Revenue</div>
              </CardContent>
            </Card>
          </div>

          {/* Active Staff */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">Kitchen Staff ({staff.length})</span>
            </div>
            <div className="flex gap-2">
              {staff.map(member => (
                <Badge key={member.user_id} variant="secondary" className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  {member.name}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters and Sorting */}
      <Card className="rounded-none border-x-0 border-b">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Status Filters */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">Status:</span>
                {['pending', 'confirmed', 'preparing', 'ready'].map(status => (
                  <Button
                    key={status}
                    variant={statusFilter.includes(status as OrderStatus) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (statusFilter.includes(status as OrderStatus)) {
                        setStatusFilter(prev => prev.filter(s => s !== status))
                      } else {
                        setStatusFilter(prev => [...prev, status as OrderStatus])
                      }
                    }}
                  >
                    {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Sort Controls */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </Button>
              
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as 'time' | 'priority' | 'type')}
                className="px-3 py-2 border rounded text-sm"
              >
                <option value="time">Sort by Time</option>
                <option value="priority">Sort by Priority</option>
                <option value="type">Sort by Type</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Grid */}
      <div className="p-4">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-500 mb-2">No Active Orders</h3>
              <p className="text-gray-400">New orders will appear here automatically</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredOrders.map(order => (
              <KitchenOrderCard
                key={order.id}
                order={order}
                isSelected={selectedOrder === order.id}
                onSelect={() => setSelectedOrder(order.id === selectedOrder ? null : order.id)}
                onStatusUpdate={updateOrderStatus}
                soundEnabled={soundEnabled}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Individual order card for kitchen display
interface KitchenOrderCardProps {
  order: Order
  isSelected: boolean
  onSelect: () => void
  onStatusUpdate: (orderId: string, status: OrderStatus) => void
  soundEnabled: boolean
}

function KitchenOrderCard({
  order,
  isSelected,
  onSelect,
  onStatusUpdate,
  soundEnabled
}: KitchenOrderCardProps) {
  const priority = calculateKitchenPriority(order)
  const nextStatus = getNextStatus(order.status, order.type)
  const orderAge = getOrderAge(order.created_at)
  const isOverdue = Date.now() - new Date(order.created_at).getTime() > 30 * 60 * 1000

  // Parse customer info
  const customerInfo = typeof order.customer_info === 'string' 
    ? JSON.parse(order.customer_info) 
    : order.customer_info || {}

  const deliveryAddress = typeof order.delivery_address === 'string'
    ? JSON.parse(order.delivery_address)
    : order.delivery_address

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-lg',
        isSelected && 'ring-2 ring-blue-500',
        isOverdue && 'ring-2 ring-red-500 animate-pulse',
        priority === 'HIGH' && 'border-red-300 bg-red-50',
        priority === 'MEDIUM' && 'border-yellow-300 bg-yellow-50'
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-mono">#{order.order_number}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" size="sm">
                {order.type.replace('_', ' ').toUpperCase()}
              </Badge>
              <span className="text-sm text-gray-600">{orderAge}</span>
              {isOverdue && (
                <Badge variant="destructive" size="sm">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  OVERDUE
                </Badge>
              )}
            </div>
          </div>
          <KitchenStatusBadge order={order} compact />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Order Items */}
        {order.order_items && order.order_items.length > 0 && (
          <div className="space-y-2">
            {order.order_items.map(item => (
              <div key={item.id} className="flex justify-between items-start text-sm">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" size="sm">{item.quantity}x</Badge>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  {item.notes && (
                    <p className="text-xs text-gray-600 mt-1 ml-8">
                      Note: {item.notes}
                    </p>
                  )}
                  {item.customizations && Object.keys(item.customizations).length > 0 && (
                    <div className="text-xs text-blue-600 mt-1 ml-8">
                      Customizations: {JSON.stringify(item.customizations)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Customer Info */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span>{customerInfo.name || 'Customer'}</span>
          </div>
          
          {customerInfo.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500" />
              <span>{customerInfo.phone}</span>
            </div>
          )}

          {order.type === 'delivery' && deliveryAddress && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
              <div className="text-xs">
                <p>{deliveryAddress.street}</p>
                <p>{deliveryAddress.city}, {deliveryAddress.state}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-500" />
            <span className="font-medium">{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Special Instructions */}
        {order.notes && (
          <div className="p-2 bg-yellow-100 rounded text-sm">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div>
                <strong className="text-yellow-800">Special Instructions:</strong>
                <p className="text-yellow-700">{order.notes}</p>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex gap-2">
          {nextStatus && (
            <Button
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation()
                onStatusUpdate(order.id, nextStatus)
              }}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark {nextStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Button>
          )}
          
          {order.status !== 'pending' && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                // Add logic to go back to previous status
              }}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Estimated completion time */}
        {order.estimated_ready_time && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Timer className="w-4 h-4" />
            <span>Ready: {new Date(order.estimated_ready_time).toLocaleTimeString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}