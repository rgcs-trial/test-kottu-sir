'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useOrderTracking } from '@/hooks/use-order-tracking'
import { OrderTimeline, MobileTimeline } from '@/components/orders/order-timeline'
import { LiveOrderUpdates } from '@/components/orders/live-order-updates'
import { ProgressStatusBadge } from '@/components/orders/order-status-badge'
import { getTimeRemaining, formatCurrency, getOrderProgress } from '@/lib/realtime/order-tracking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Database } from '@/lib/supabase/types'
import {
  Clock,
  MapPin,
  Phone,
  Mail,
  RefreshCw,
  Share2,
  Download,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  Truck,
  Store,
  User,
  Calendar,
  DollarSign
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

interface Restaurant {
  id: string
  name: string
  logo?: string
  phone: string
  email: string
  address_street: string
  address_city: string
  address_state: string
  address_zip_code: string
}

export default function OrderTrackingPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const subdomain = params.subdomain as string

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [restaurantLoading, setRestaurantLoading] = useState(true)
  const [restaurantError, setRestaurantError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  const {
    order,
    loading,
    error,
    connected,
    lastUpdated,
    retry
  } = useOrderTracking(orderId)

  const supabase = createClient()

  // Detect mobile screen
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  // Fetch restaurant information
  useEffect(() => {
    async function fetchRestaurant() {
      if (!subdomain) return

      setRestaurantLoading(true)
      setRestaurantError(null)

      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select(`
            id,
            name,
            logo,
            phone,
            email,
            address_street,
            address_city,
            address_state,
            address_zip_code
          `)
          .eq('subdomain', subdomain)
          .eq('status', 'active')
          .single()

        if (error) throw error

        setRestaurant(data)
      } catch (error) {
        console.error('Error fetching restaurant:', error)
        setRestaurantError('Restaurant not found')
      } finally {
        setRestaurantLoading(false)
      }
    }

    fetchRestaurant()
  }, [subdomain, supabase])

  // Share order tracking
  const shareOrder = async () => {
    if (navigator.share && order) {
      try {
        await navigator.share({
          title: `Order #${order.order_number} - ${restaurant?.name}`,
          text: `Track your order from ${restaurant?.name}`,
          url: window.location.href
        })
      } catch (error) {
        // Fall back to copying to clipboard
        copyToClipboard()
      }
    } else {
      copyToClipboard()
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => alert('Order tracking link copied to clipboard!'))
      .catch(() => alert('Failed to copy link'))
  }

  // Download receipt (placeholder)
  const downloadReceipt = () => {
    alert('Receipt download would be implemented here')
  }

  // Contact restaurant
  const contactRestaurant = () => {
    if (restaurant?.phone) {
      window.open(`tel:${restaurant.phone}`)
    }
  }

  if (restaurantLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your order...</p>
        </div>
      </div>
    )
  }

  if (restaurantError || error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {restaurantError || error}
            </AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!restaurant || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Order Not Found</h2>
          <p className="text-gray-600">The order you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    )
  }

  const customerInfo = typeof order.customer_info === 'string' 
    ? JSON.parse(order.customer_info) 
    : order.customer_info || {}

  const deliveryAddress = typeof order.delivery_address === 'string'
    ? JSON.parse(order.delivery_address)
    : order.delivery_address

  const timeRemaining = getTimeRemaining(order.estimated_ready_time)
  const orderProgress = getOrderProgress(order.status, order.type)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {restaurant.logo && (
                <img 
                  src={restaurant.logo} 
                  alt={restaurant.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{restaurant.name}</h1>
                <p className="text-sm text-gray-600">Order Tracking</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                {connected ? (
                  <Badge variant="default" className="bg-green-600 text-white">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Live
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-orange-500 text-orange-600">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Offline
                  </Badge>
                )}
              </div>

              {/* Action Buttons */}
              <Button variant="outline" size="sm" onClick={shareOrder}>
                <Share2 className="w-4 h-4" />
              </Button>
              
              <Button variant="outline" size="sm" onClick={contactRestaurant}>
                <Phone className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Order Status Hero */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Order #{order.order_number}</h2>
                <p className="text-gray-600">
                  Placed on {new Date(order.created_at).toLocaleString()}
                </p>
              </div>

              <ProgressStatusBadge
                status={order.status}
                orderType={order.type}
                progress={orderProgress}
                estimatedTime={timeRemaining}
                animated={true}
                className="max-w-md mx-auto"
              />

              {/* Quick Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-600 mb-1">
                    {order.type === 'delivery' ? <Truck className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                    <span className="text-sm font-medium">Type</span>
                  </div>
                  <p className="text-sm">
                    {order.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-600 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm font-medium">Total</span>
                  </div>
                  <p className="text-sm font-bold">{formatCurrency(order.total)}</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-600 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">Status</span>
                  </div>
                  <p className="text-sm">
                    {timeRemaining ? `Ready in ${timeRemaining}` : 'Processing...'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Timeline */}
          <div className="lg:col-span-2">
            {isMobile ? (
              <MobileTimeline order={order} />
            ) : (
              <OrderTimeline 
                order={order}
                showEstimatedTime={true}
                showOrderDetails={true}
                showCustomerInfo={false}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Customer</label>
                  <p className="text-sm">{customerInfo.name || 'Customer'}</p>
                </div>

                {customerInfo.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-sm">{customerInfo.phone}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-600">Order Type</label>
                  <p className="text-sm capitalize">{order.type.replace('_', ' ')}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Payment Status</label>
                  <Badge 
                    variant={order.payment_status === 'paid' ? 'default' : 'outline'}
                    className={order.payment_status === 'paid' ? 'bg-green-600' : ''}
                  >
                    {order.payment_status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Address */}
            {order.type === 'delivery' && deliveryAddress && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Delivery Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    <p>{deliveryAddress.street}</p>
                    <p>{deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.zipCode}</p>
                    {deliveryAddress.instructions && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded text-xs">
                        <strong>Delivery Instructions:</strong> {deliveryAddress.instructions}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Restaurant Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Restaurant Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium">{restaurant.name}</p>
                  <div className="text-sm text-gray-600 space-y-1 mt-2">
                    <p>{restaurant.address_street}</p>
                    <p>{restaurant.address_city}, {restaurant.address_state} {restaurant.address_zip_code}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={contactRestaurant}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call Restaurant
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => window.open(`mailto:${restaurant.email}`)}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email Restaurant
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={shareOrder}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Order
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={downloadReceipt}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Receipt
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={retry}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Order
                </Button>
              </CardContent>
            </Card>

            {/* Connection Info */}
            {lastUpdated && (
              <div className="text-xs text-gray-500 text-center">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Real-time Updates Component (Hidden - for background updates) */}
        <div className="hidden">
          <LiveOrderUpdates
            orderId={orderId}
            initialOrder={order}
            showTimeline={false}
          />
        </div>
      </div>

      {/* Bottom Navigation for Mobile */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={contactRestaurant}>
              <Phone className="w-4 h-4 mr-2" />
              Call
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={shareOrder}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={retry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}