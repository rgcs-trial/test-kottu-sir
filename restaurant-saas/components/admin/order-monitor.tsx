'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAdminAnalytics } from '@/hooks/use-admin-analytics'
import { OrderStatusBadge } from '@/components/orders/order-status-badge'
import { 
  Clock, 
  MapPin, 
  User, 
  DollarSign,
  AlertCircle,
  RefreshCw,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Database } from '@/lib/supabase/types'

type Order = Database['public']['Tables']['orders']['Row'] & {
  restaurant: {
    name: string
    subdomain: string
  }
  customer_info: {
    name: string
    email: string
    phone?: string
  }
}

interface OrderMonitorProps {
  limit?: number
  refreshInterval?: number
}

/**
 * Order Monitor Component
 * 
 * Real-time order activity monitor for platform admins:
 * - Live order updates across all restaurants
 * - Order status tracking and management
 * - Quick order details and customer info
 * - Performance indicators and alerts
 */
export function OrderMonitor({ 
  limit = 10, 
  refreshInterval = 30000 
}: OrderMonitorProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const { data: analytics } = useAdminAnalytics()

  // Simulated real-time orders data - replace with actual Supabase subscription
  useEffect(() => {
    const fetchRecentOrders = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // TODO: Replace with actual Supabase query
        // This is mock data for demonstration
        const mockOrders: Order[] = [
          {
            id: '1',
            order_number: 'ORD-001',
            restaurant_id: 'rest-1',
            customer_id: 'cust-1',
            type: 'delivery',
            status: 'preparing',
            customer_info: {
              name: 'John Doe',
              email: 'john@example.com',
              phone: '+1-555-0123'
            },
            delivery_address: {
              street: '123 Main St',
              city: 'San Francisco',
              zip: '94105'
            },
            subtotal: 2500,
            tax_amount: 200,
            delivery_fee: 300,
            tip_amount: 400,
            discount_amount: 0,
            total: 3400,
            payment_status: 'paid',
            payment_method: 'card',
            payment_intent_id: 'pi_123',
            estimated_ready_time: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            actual_ready_time: null,
            delivered_at: null,
            notes: 'Extra sauce on the side',
            created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
            restaurant: {
              name: 'Joe\'s Pizza',
              subdomain: 'joes-pizza'
            }
          },
          {
            id: '2',
            order_number: 'ORD-002',
            restaurant_id: 'rest-2',
            customer_id: 'cust-2',
            type: 'takeout',
            status: 'ready',
            customer_info: {
              name: 'Jane Smith',
              email: 'jane@example.com'
            },
            delivery_address: null,
            subtotal: 1800,
            tax_amount: 144,
            delivery_fee: 0,
            tip_amount: 200,
            discount_amount: 100,
            total: 2044,
            payment_status: 'paid',
            payment_method: 'card',
            payment_intent_id: 'pi_456',
            estimated_ready_time: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            actual_ready_time: new Date().toISOString(),
            delivered_at: null,
            notes: null,
            created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
            restaurant: {
              name: 'Burger Palace',
              subdomain: 'burger-palace'
            }
          }
        ]
        
        setOrders(mockOrders.slice(0, limit))
        setLastRefresh(new Date())
      } catch (err) {
        setError('Failed to load recent orders')
        console.error('Error fetching orders:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentOrders()
    
    // Set up refresh interval
    const interval = setInterval(fetchRecentOrders, refreshInterval)
    return () => clearInterval(interval)
  }, [limit, refreshInterval])

  const formatCurrency = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'preparing': return 'bg-orange-100 text-orange-800'
      case 'ready': return 'bg-green-100 text-green-800'
      case 'delivered': return 'bg-emerald-100 text-emerald-800'
      case 'canceled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'delivery': return <MapPin className="h-3 w-3" />
      case 'takeout': return <Clock className="h-3 w-3" />
      case 'dine_in': return <User className="h-3 w-3" />
      default: return <Clock className="h-3 w-3" />
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="h-4 w-4" />
          <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="flex items-center gap-1"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </Button>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {loading ? (
          <OrderMonitorSkeleton limit={limit} />
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No recent orders</p>
          </div>
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Order Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-1">
                        {getTypeIcon(order.type)}
                        <span className="font-mono text-sm font-medium">
                          {order.order_number}
                        </span>
                      </div>
                      <Badge className={cn('text-xs', getStatusColor(order.status))}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(order.created_at)}
                      </span>
                    </div>

                    {/* Restaurant and Customer */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-gray-900">
                          {order.restaurant.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <User className="h-3 w-3" />
                        <span>{order.customer_info.name}</span>
                      </div>
                      {order.type === 'delivery' && order.delivery_address && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">
                            {order.delivery_address.city}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <p className="text-xs text-gray-600 mt-1 italic">
                        "{order.notes}"
                      </p>
                    )}
                  </div>

                  {/* Order Value and Actions */}
                  <div className="flex items-center gap-3 ml-4">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-lg font-bold text-gray-900">
                        <DollarSign className="h-4 w-4" />
                        {formatCurrency(order.total)}
                      </div>
                      <div className={cn(
                        'text-xs',
                        order.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'
                      )}>
                        {order.payment_status}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Quick Stats */}
      {analytics && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">
              {analytics.orders?.active || 0}
            </p>
            <p className="text-xs text-gray-600">Active Orders</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">
              {analytics.orders?.avgPrepTime || 0}m
            </p>
            <p className="text-xs text-gray-600">Avg Prep Time</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">
              {analytics.performance?.orderFulfillmentRate || 0}%
            </p>
            <p className="text-xs text-gray-600">Fulfillment Rate</p>
          </div>
        </div>
      )}
    </div>
  )
}

function OrderMonitorSkeleton({ limit }: { limit: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: limit }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <div className="text-right">
                  <div className="h-5 bg-gray-200 rounded w-16 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-12"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-8"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}