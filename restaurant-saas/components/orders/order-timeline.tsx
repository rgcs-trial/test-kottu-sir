'use client'

import { useState, useEffect } from 'react'
import { ORDER_STATUS_CONFIG, ORDER_STATUS_FLOWS, generateOrderTimeline, getTimeRemaining, formatCurrency } from '@/lib/realtime/order-tracking'
import { Database } from '@/lib/supabase/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { Clock, CheckCircle, Circle, Timer, MapPin, User, Phone, DollarSign } from 'lucide-react'

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

interface OrderTimelineProps {
  order: Order
  showEstimatedTime?: boolean
  showOrderDetails?: boolean
  showCustomerInfo?: boolean
  compact?: boolean
  className?: string
}

export function OrderTimeline({
  order,
  showEstimatedTime = true,
  showOrderDetails = true,
  showCustomerInfo = true,
  compact = false,
  className
}: OrderTimelineProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Update current time every minute for live estimates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [])

  const timeline = generateOrderTimeline(order)
  const flow = ORDER_STATUS_FLOWS[order.type]
  const currentStatusIndex = flow.indexOf(order.status as any)
  const progress = currentStatusIndex >= 0 ? Math.round((currentStatusIndex / (flow.length - 1)) * 100) : 0
  
  const timeRemaining = getTimeRemaining(order.estimated_ready_time)
  
  // Parse customer info
  const customerInfo = typeof order.customer_info === 'string' 
    ? JSON.parse(order.customer_info) 
    : order.customer_info || {}
    
  const deliveryAddress = typeof order.delivery_address === 'string'
    ? JSON.parse(order.delivery_address)
    : order.delivery_address

  if (compact) {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Compact Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Order #{order.order_number}</h3>
            <Badge className={ORDER_STATUS_CONFIG[order.status].color}>
              {ORDER_STATUS_CONFIG[order.status].icon} {ORDER_STATUS_CONFIG[order.status].label}
            </Badge>
          </div>
          
          <Progress value={progress} className="w-full h-2" />
          
          {showEstimatedTime && timeRemaining && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Timer className="w-4 h-4" />
              <span>Estimated: {timeRemaining}</span>
            </div>
          )}
        </div>

        {/* Compact Timeline */}
        <div className="flex justify-between items-center">
          {flow.map((status, index) => {
            const config = ORDER_STATUS_CONFIG[status as OrderStatus]
            const isCompleted = index < currentStatusIndex
            const isCurrent = index === currentStatusIndex
            
            return (
              <div key={status} className="flex flex-col items-center">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm',
                  isCompleted && 'bg-green-500 text-white',
                  isCurrent && 'bg-blue-500 text-white animate-pulse',
                  !isCompleted && !isCurrent && 'bg-gray-200 text-gray-500'
                )}>
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span>{config.icon}</span>
                  )}
                </div>
                <span className={cn(
                  'text-xs mt-1 text-center max-w-16',
                  isCurrent && 'font-semibold text-blue-600',
                  isCompleted && 'text-green-600',
                  !isCompleted && !isCurrent && 'text-gray-500'
                )}>
                  {config.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">Order #{order.order_number}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {order.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Order
            </p>
          </div>
          <Badge className={ORDER_STATUS_CONFIG[order.status].color} size="lg">
            {ORDER_STATUS_CONFIG[order.status].icon} {ORDER_STATUS_CONFIG[order.status].label}
          </Badge>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2 mt-4">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{progress}% Complete</span>
          </div>
          <Progress value={progress} className="w-full h-3" />
        </div>
        
        {/* Estimated Time */}
        {showEstimatedTime && (
          <div className="flex items-center justify-between mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">Estimated Ready Time</span>
            </div>
            <span className="text-lg font-bold text-blue-600">
              {timeRemaining || 'Calculating...'}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Detailed Timeline */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Order Progress</h3>
          <div className="relative">
            {timeline.map((item, index) => {
              const config = ORDER_STATUS_CONFIG[item.status]
              const isLast = index === timeline.length - 1
              
              return (
                <div key={item.status} className="relative flex items-start">
                  {/* Timeline Line */}
                  {!isLast && (
                    <div className={cn(
                      'absolute left-4 top-8 w-0.5 h-16',
                      item.isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    )} />
                  )}
                  
                  {/* Status Icon */}
                  <div className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                    item.isCompleted && 'bg-green-500 text-white',
                    item.isCurrent && 'bg-blue-500 text-white animate-pulse',
                    !item.isCompleted && !item.isCurrent && 'bg-gray-200 text-gray-500'
                  )}>
                    {item.isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : item.isCurrent ? (
                      <Circle className="w-4 h-4 fill-current" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </div>
                  
                  {/* Status Details */}
                  <div className="ml-4 pb-8 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config.icon}</span>
                      <h4 className={cn(
                        'font-medium',
                        item.isCurrent && 'text-blue-600',
                        item.isCompleted && 'text-green-600'
                      )}>
                        {config.label}
                      </h4>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {config.description}
                    </p>
                    {item.timestamp && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Customer Information */}
        {showCustomerInfo && customerInfo && (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">{customerInfo.name || 'Customer'}</p>
                  {customerInfo.email && (
                    <p className="text-sm text-gray-600">{customerInfo.email}</p>
                  )}
                  {customerInfo.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      {customerInfo.phone}
                    </div>
                  )}
                </div>
                
                {/* Delivery Address */}
                {order.type === 'delivery' && deliveryAddress && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span className="font-medium">Delivery Address</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>{deliveryAddress.street}</p>
                      <p>{deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.zipCode}</p>
                      {deliveryAddress.instructions && (
                        <p className="mt-1 text-xs italic">
                          Instructions: {deliveryAddress.instructions}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Order Details */}
        {showOrderDetails && order.order_items && order.order_items.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Order Details</h3>
              <div className="space-y-3">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.name}</span>
                        <Badge variant="outline" size="sm">
                          Qty: {item.quantity}
                        </Badge>
                      </div>
                      {item.notes && (
                        <p className="text-sm text-gray-600 mt-1">
                          Note: {item.notes}
                        </p>
                      )}
                      {item.customizations && Object.keys(item.customizations).length > 0 && (
                        <div className="text-sm text-gray-600 mt-1">
                          Customizations: {JSON.stringify(item.customizations)}
                        </div>
                      )}
                    </div>
                    <span className="font-medium">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Order Total */}
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.tax_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>{formatCurrency(order.tax_amount)}</span>
                  </div>
                )}
                {order.delivery_fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Delivery Fee</span>
                    <span>{formatCurrency(order.delivery_fee)}</span>
                  </div>
                )}
                {order.tip_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tip</span>
                    <span>{formatCurrency(order.tip_amount)}</span>
                  </div>
                )}
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(order.discount_amount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-5 h-5" />
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Special Notes */}
        {order.notes && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="font-semibold">Special Instructions</h3>
              <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
                {order.notes}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Simplified timeline for mobile/small screens
interface MobileTimelineProps {
  order: Order
  className?: string
}

export function MobileTimeline({ order, className }: MobileTimelineProps) {
  const flow = ORDER_STATUS_FLOWS[order.type]
  const currentStatusIndex = flow.indexOf(order.status as any)
  const timeRemaining = getTimeRemaining(order.estimated_ready_time)

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">Order #{order.order_number}</h2>
        <Badge className={ORDER_STATUS_CONFIG[order.status].color} size="lg">
          {ORDER_STATUS_CONFIG[order.status].icon} {ORDER_STATUS_CONFIG[order.status].label}
        </Badge>
        <p className="text-sm text-gray-600">
          {ORDER_STATUS_CONFIG[order.status].description}
        </p>
        {timeRemaining && (
          <div className="flex items-center justify-center gap-2 text-green-600 font-medium">
            <Timer className="w-4 h-4" />
            Ready in {timeRemaining}
          </div>
        )}
      </div>

      {/* Mobile Progress Steps */}
      <div className="space-y-3">
        {flow.map((status, index) => {
          const config = ORDER_STATUS_CONFIG[status as OrderStatus]
          const isCompleted = index < currentStatusIndex
          const isCurrent = index === currentStatusIndex
          
          return (
            <div
              key={status}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg',
                isCompleted && 'bg-green-50',
                isCurrent && 'bg-blue-50 border border-blue-200',
                !isCompleted && !isCurrent && 'bg-gray-50'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm',
                isCompleted && 'bg-green-500 text-white',
                isCurrent && 'bg-blue-500 text-white',
                !isCompleted && !isCurrent && 'bg-gray-300 text-gray-600'
              )}>
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span>{config.icon}</span>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className={cn(
                  'font-medium',
                  isCurrent && 'text-blue-600',
                  isCompleted && 'text-green-600'
                )}>
                  {config.label}
                </h3>
                <p className="text-sm text-gray-600">
                  {config.description}
                </p>
              </div>
              
              {isCurrent && (
                <div className="animate-pulse">
                  <Circle className="w-4 h-4 text-blue-500 fill-current" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}