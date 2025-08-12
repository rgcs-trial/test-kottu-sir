import type { Metadata } from 'next'
import { Suspense } from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  ShoppingBag, 
  Clock,
  MapPin,
  Phone,
  User,
  DollarSign,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Package,
  Truck,
  RefreshCw,
  Eye,
  MessageSquare,
  ChefHat
} from 'lucide-react'
import { Order, OrderStatus, OrderType } from '@/types'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Order Management',
  description: 'Manage incoming orders and track order status',
}

/**
 * Order Status Badge Component
 */
function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const getVariant = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return { variant: 'warning' as const, icon: Clock }
      case 'confirmed':
        return { variant: 'secondary' as const, icon: CheckCircle }
      case 'preparing':
        return { variant: 'warning' as const, icon: ChefHat }
      case 'ready':
        return { variant: 'success' as const, icon: Package }
      case 'out_for_delivery':
        return { variant: 'secondary' as const, icon: Truck }
      case 'delivered':
        return { variant: 'success' as const, icon: CheckCircle }
      case 'completed':
        return { variant: 'success' as const, icon: CheckCircle }
      case 'canceled':
        return { variant: 'destructive' as const, icon: AlertCircle }
      case 'refunded':
        return { variant: 'destructive' as const, icon: AlertCircle }
      default:
        return { variant: 'secondary' as const, icon: Clock }
    }
  }

  const { variant, icon: Icon } = getVariant(status)
  const label = status.replace('_', ' ').toUpperCase()

  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  )
}

/**
 * Order Type Badge Component
 */
function OrderTypeBadge({ type }: { type: OrderType }) {
  const getVariant = (type: OrderType) => {
    switch (type) {
      case 'dine_in':
        return { variant: 'secondary' as const, label: 'Dine In', icon: User }
      case 'takeout':
        return { variant: 'outline' as const, label: 'Takeout', icon: Package }
      case 'delivery':
        return { variant: 'default' as const, label: 'Delivery', icon: Truck }
      default:
        return { variant: 'secondary' as const, label: type, icon: User }
    }
  }

  const { variant, label, icon: Icon } = getVariant(type)

  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  )
}

/**
 * Order Card Component
 */
function OrderCard({ order }: { order: Order }) {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getUrgencyColor = () => {
    const now = new Date()
    const orderTime = new Date(order.createdAt as any)
    const minutesSinceOrder = (now.getTime() - orderTime.getTime()) / (1000 * 60)

    if (minutesSinceOrder > 45) return 'border-red-200 bg-red-50'
    if (minutesSinceOrder > 30) return 'border-orange-200 bg-orange-50'
    return ''
  }

  return (
    <Card className={cn("hover:shadow-md transition-shadow", getUrgencyColor())}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-bold">
              #{order.orderNumber}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">
                {formatTime(order.createdAt as any)} • {formatDate(order.createdAt as any)}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <OrderStatusBadge status={order.status} />
            <OrderTypeBadge type={order.type} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Customer Information */}
        <div className="flex items-start gap-3">
          <User className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">{order.customerInfo.name}</p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {order.customerInfo.phone}
              </span>
            </div>
          </div>
        </div>

        {/* Delivery Address (if delivery) */}
        {order.type === 'delivery' && order.deliveryAddress && (
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                {order.deliveryAddress.street}, {order.deliveryAddress.city}
              </p>
              {order.deliveryAddress.instructions && (
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Instructions:</strong> {order.deliveryAddress.instructions}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="space-y-2">
          <p className="font-medium text-sm">Items ({order.items.length})</p>
          <div className="space-y-1">
            {order.items.slice(0, 3).map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{item.quantity}x {item.name}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            {order.items.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{order.items.length - 3} more items
              </p>
            )}
          </div>
        </div>

        {/* Order Total */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="font-medium flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            Total
          </span>
          <span className="text-lg font-bold text-green-600">
            ${order.total.toFixed(2)}
          </span>
        </div>

        {/* Special Notes */}
        {order.notes && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm">
              <strong>Special Notes:</strong> {order.notes}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            View
          </Button>
          <Button size="sm" variant="outline" className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            Contact
          </Button>
          {order.status === 'pending' && (
            <Button size="sm" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Accept
            </Button>
          )}
          {(order.status === 'confirmed' || order.status === 'preparing') && (
            <Button size="sm" className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              Mark Ready
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Orders Loading Component
 */
function OrdersLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex justify-between">
              <div className="w-24 h-6 bg-gray-200 rounded animate-pulse" />
              <div className="w-20 h-5 bg-gray-200 rounded animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="w-full h-4 bg-gray-200 rounded animate-pulse" />
            <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="w-full h-3 bg-gray-200 rounded animate-pulse" />
              <div className="w-5/6 h-3 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex justify-between">
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse" />
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Order Management Page Component
 */
export default async function OrderManagementPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = createClient()
  const headersList = headers()
  
  // Get tenant information from middleware
  const tenantId = headersList.get('x-tenant-id')
  
  if (!tenantId) {
    notFound()
  }

  // Build query filters
  let query = supabase
    .from('orders')
    .select(`
      *,
      items:order_items(*)
    `)
    .eq('restaurantId', tenantId)
    .order('createdAt', { ascending: false })

  // Apply filters
  const statusFilter = searchParams.status as string
  const typeFilter = searchParams.type as string
  
  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }
  
  if (typeFilter && typeFilter !== 'all') {
    query = query.eq('type', typeFilter)
  }

  // Fetch orders
  const { data: orders, error } = await query.limit(50)

  if (error) {
    console.error('Error fetching orders:', error)
    notFound()
  }

  // Calculate stats
  const totalOrders = orders?.length || 0
  const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0
  const activeOrders = orders?.filter(o => 
    ['confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.status)
  ).length || 0
  const completedToday = orders?.filter(o => {
    const today = new Date().toDateString()
    const orderDate = new Date(o.createdAt).toDateString()
    return orderDate === today && ['delivered', 'completed'].includes(o.status)
  }).length || 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="h-6 w-6" />
            Order Management
          </h1>
          <p className="text-gray-600">
            Track and manage incoming orders in real-time
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Export Orders
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mr-4">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{pendingOrders}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mr-4">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{activeOrders}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mr-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{completedToday}</p>
              <p className="text-sm text-muted-foreground">Completed Today</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mr-4">
              <ShoppingBag className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalOrders}</p>
              <p className="text-sm text-muted-foreground">Total Orders</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search orders by order number, customer name..." 
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select defaultValue={statusFilter || 'all'}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Order Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
            </SelectContent>
          </Select>
          
          <Select defaultValue={typeFilter || 'all'}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Order Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="dine_in">Dine In</SelectItem>
              <SelectItem value="takeout">Takeout</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orders List */}
      {orders && orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders found</h3>
            <p className="text-muted-foreground text-center">
              {statusFilter || typeFilter 
                ? 'Try adjusting your filters to see more orders'
                : 'New orders will appear here when customers place them'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <Suspense fallback={<OrdersLoading />}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orders?.map((order) => (
              <OrderCard key={order.id} order={order as Order} />
            ))}
          </div>
        </Suspense>
      )}
    </div>
  )
}