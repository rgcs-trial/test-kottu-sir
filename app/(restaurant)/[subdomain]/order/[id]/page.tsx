import { Suspense } from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  ChefHat, 
  Truck,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Receipt
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getOrderDetails, getOrderStatusHistory } from '@/lib/orders/actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CartItemSummary } from '@/components/cart/cart-item'

interface OrderTrackingPageProps {
  params: {
    subdomain: string
    id: string
  }
}

// Loading component
function OrderTrackingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="h-8 bg-gray-300 rounded w-1/3 animate-pulse"></div>
          
          {/* Status Card Skeleton */}
          <div className="bg-white rounded-lg border p-6">
            <div className="h-6 bg-gray-300 rounded w-1/4 animate-pulse mb-4"></div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-300 rounded-full animate-pulse"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-300 rounded w-1/2 animate-pulse"></div>
                <div className="h-3 bg-gray-300 rounded w-1/3 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Order Details Skeleton */}
          <div className="bg-white rounded-lg border p-6">
            <div className="h-6 bg-gray-300 rounded w-1/4 animate-pulse mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between py-2 border-b">
                  <div className="space-y-1">
                    <div className="h-4 bg-gray-300 rounded w-32 animate-pulse"></div>
                    <div className="h-3 bg-gray-300 rounded w-24 animate-pulse"></div>
                  </div>
                  <div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending': return 'bg-yellow-600'
    case 'confirmed': return 'bg-blue-600'
    case 'preparing': return 'bg-orange-600'
    case 'ready': return 'bg-green-600'
    case 'out_for_delivery': return 'bg-purple-600'
    case 'delivered': return 'bg-green-700'
    case 'completed': return 'bg-green-700'
    case 'canceled': return 'bg-red-600'
    case 'refunded': return 'bg-gray-600'
    default: return 'bg-gray-600'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'pending': return Clock
    case 'confirmed': return CheckCircle
    case 'preparing': return ChefHat
    case 'ready': return CheckCircle
    case 'out_for_delivery': return Truck
    case 'delivered': return CheckCircle
    case 'completed': return CheckCircle
    case 'canceled': return AlertCircle
    case 'refunded': return AlertCircle
    default: return Clock
  }
}

function getStatusDescription(status: string) {
  switch (status) {
    case 'pending': return 'Order placed and awaiting confirmation'
    case 'confirmed': return 'Order confirmed by restaurant'
    case 'preparing': return 'Kitchen is preparing your order'
    case 'ready': return 'Order is ready for pickup/delivery'
    case 'out_for_delivery': return 'Order is on the way'
    case 'delivered': return 'Order has been delivered'
    case 'completed': return 'Order completed successfully'
    case 'canceled': return 'Order was canceled'
    case 'refunded': return 'Order was refunded'
    default: return 'Order status updated'
  }
}

function formatOrderStatus(status: string) {
  return status.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

async function OrderTrackingContent({ params }: OrderTrackingPageProps) {
  const supabase = createClient()
  const headersList = headers()
  
  // Get tenant information
  const tenantId = headersList.get('x-tenant-id')
  
  if (!tenantId) {
    notFound()
  }

  // Fetch order details
  const { order, error } = await getOrderDetails(params.id)
  
  if (error || !order) {
    notFound()
  }

  // Verify order belongs to this restaurant
  if (order.restaurant_id !== tenantId) {
    notFound()
  }

  // Get order status history
  const { history } = await getOrderStatusHistory(params.id)

  const StatusIcon = getStatusIcon(order.status)
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/${params.subdomain}`}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Restaurant
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order Tracking</h1>
              <p className="text-gray-600 mt-1">Order #{order.order_number}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">${order.total.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Order Status */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-6">Order Status</h2>
            
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getStatusColor(order.status)}`}>
                <StatusIcon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  {formatOrderStatus(order.status)}
                </h3>
                <p className="text-gray-600">{getStatusDescription(order.status)}</p>
                
                {/* Estimated time */}
                {order.estimated_ready_time && ['pending', 'confirmed', 'preparing'].includes(order.status) && (
                  <p className="text-sm text-green-600 mt-1">
                    Estimated ready time: {new Date(order.estimated_ready_time).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </p>
                )}
              </div>
              
              <Badge 
                variant="secondary"
                className={`${getStatusColor(order.status)} text-white hover:${getStatusColor(order.status)}`}
              >
                {formatOrderStatus(order.status)}
              </Badge>
            </div>

            {/* Order Timeline */}
            {history && history.length > 0 && (
              <div className="border-t pt-6">
                <h4 className="font-medium text-gray-900 mb-4">Order Timeline</h4>
                <div className="space-y-3">
                  {history.reverse().map((event, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {event.description}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order Details & Customer Info */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Order Details */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Order Details</h3>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span>Order Type</span>
                  <span className="capitalize font-medium">
                    {order.type.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Order Date</span>
                  <span className="font-medium">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Order Time</span>
                  <span className="font-medium">
                    {new Date(order.created_at).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Payment Status</span>
                  <span className="capitalize font-medium">
                    {order.payment_status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Items Ordered</h4>
                <div className="space-y-2">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start py-2">
                      <div className="flex-1">
                        <h5 className="font-medium text-sm">
                          {item.quantity}× {item.name}
                        </h5>
                        {item.notes && (
                          <p className="text-xs text-gray-600 italic">
                            Note: {item.notes}
                          </p>
                        )}
                        {item.customizations && (
                          <div className="text-xs text-gray-600 mt-1">
                            {/* Display customizations */}
                            {JSON.stringify(item.customizations) !== '{}' && (
                              <div>Customizations applied</div>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-sm">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Total Breakdown */}
              <div className="border-t pt-4 mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${order.subtotal.toFixed(2)}</span>
                </div>
                {order.delivery_fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Delivery Fee</span>
                    <span>${order.delivery_fee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Tax</span>
                  <span>${order.tax_amount.toFixed(2)}</span>
                </div>
                {order.tip_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tip</span>
                    <span>${order.tip_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Total</span>
                  <span>${order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Customer & Restaurant Info */}
            <div className="space-y-8">
              {/* Customer Info */}
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Name</span>
                    <p className="font-medium">{order.customer_info.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Phone</span>
                    <p className="font-medium">{order.customer_info.phone}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Email</span>
                    <p className="font-medium">{order.customer_info.email}</p>
                  </div>
                </div>

                {/* Delivery Address */}
                {order.type === 'delivery' && order.delivery_address && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Delivery Address</span>
                    </div>
                    <div className="text-sm">
                      <p>{order.delivery_address.street}</p>
                      <p>{order.delivery_address.city}, {order.delivery_address.state} {order.delivery_address.zipCode}</p>
                      {order.delivery_address.instructions && (
                        <p className="text-gray-600 italic mt-1">
                          Instructions: {order.delivery_address.instructions}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Restaurant Info */}
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">{order.restaurant.name}</h3>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="text-sm">
                      <p>{order.restaurant.address_street}</p>
                      <p>{order.restaurant.address_city}, {order.restaurant.address_state} {order.restaurant.address_zip_code}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <a 
                      href={`tel:${order.restaurant.phone}`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {order.restaurant.phone}
                    </a>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <a 
                      href={`mailto:${order.restaurant.email}`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {order.restaurant.email}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          {order.notes && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-3">Special Instructions</h3>
              <p className="text-gray-700">{order.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 justify-center">
            <Link href={`/${params.subdomain}`}>
              <Button size="lg">
                Order Again
              </Button>
            </Link>
            
            {['pending', 'confirmed'].includes(order.status) && (
              <Button variant="outline" size="lg">
                Contact Restaurant
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrderTrackingPage({ params }: OrderTrackingPageProps) {
  return (
    <Suspense fallback={<OrderTrackingSkeleton />}>
      <OrderTrackingContent params={params} />
    </Suspense>
  )
}

export const metadata = {
  title: 'Order Tracking',
  description: 'Track your order status and delivery information',
}