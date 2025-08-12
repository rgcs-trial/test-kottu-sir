'use client'

import { ORDER_STATUS_CONFIG, KITCHEN_PRIORITY, calculateKitchenPriority } from '@/lib/realtime/order-tracking'
import { Database } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type OrderStatus = Database['public']['Enums']['order_status']
type Order = Database['public']['Tables']['orders']['Row']

interface OrderStatusBadgeProps {
  status: OrderStatus
  order?: Order
  variant?: 'default' | 'outline' | 'kitchen'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  showDescription?: boolean
  className?: string
}

export function OrderStatusBadge({
  status,
  order,
  variant = 'default',
  size = 'md',
  showIcon = true,
  showDescription = false,
  className
}: OrderStatusBadgeProps) {
  const config = ORDER_STATUS_CONFIG[status]
  
  if (!config) {
    return (
      <Badge variant="outline" className={cn('text-gray-500', className)}>
        Unknown Status
      </Badge>
    )
  }

  // Kitchen variant shows priority-based styling
  if (variant === 'kitchen' && order) {
    const priority = calculateKitchenPriority(order)
    const priorityConfig = KITCHEN_PRIORITY[priority]
    
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Badge
          className={cn(
            'text-white border-0',
            priorityConfig.color,
            size === 'sm' && 'px-2 py-1 text-xs',
            size === 'md' && 'px-3 py-1.5 text-sm',
            size === 'lg' && 'px-4 py-2 text-base'
          )}
        >
          {showIcon && <span className="mr-1">{config.icon}</span>}
          {config.label}
        </Badge>
        <Badge
          variant="outline"
          className={cn(
            'border-2',
            priorityConfig.color.replace('bg-', 'border-'),
            priorityConfig.color.replace('bg-', 'text-'),
            size === 'sm' && 'px-1.5 py-0.5 text-xs',
            size === 'md' && 'px-2 py-1 text-xs',
            size === 'lg' && 'px-3 py-1.5 text-sm'
          )}
        >
          {priorityConfig.label}
        </Badge>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Badge
        variant={variant === 'outline' ? 'outline' : 'secondary'}
        className={cn(
          config.color,
          'border',
          size === 'sm' && 'px-2 py-1 text-xs',
          size === 'md' && 'px-3 py-1.5 text-sm',
          size === 'lg' && 'px-4 py-2 text-base'
        )}
      >
        {showIcon && <span className="mr-1">{config.icon}</span>}
        {config.label}
      </Badge>
      
      {showDescription && (
        <p className={cn(
          'text-gray-600',
          size === 'sm' && 'text-xs',
          size === 'md' && 'text-sm',
          size === 'lg' && 'text-base'
        )}>
          {config.description}
        </p>
      )}
    </div>
  )
}

// Specialized badge for kitchen display with urgency indicators
interface KitchenStatusBadgeProps {
  order: Order
  showTimer?: boolean
  compact?: boolean
  className?: string
}

export function KitchenStatusBadge({
  order,
  showTimer = true,
  compact = false,
  className
}: KitchenStatusBadgeProps) {
  const config = ORDER_STATUS_CONFIG[order.status]
  const priority = calculateKitchenPriority(order)
  const priorityConfig = KITCHEN_PRIORITY[priority]
  
  // Calculate time since order was placed
  const orderAge = Date.now() - new Date(order.created_at).getTime()
  const ageInMinutes = Math.floor(orderAge / (1000 * 60))
  
  // Show warning for orders taking too long
  const isOverdue = ageInMinutes > 30
  const isUrgent = ageInMinutes > 20 || priority === 'HIGH'

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div
          className={cn(
            'w-3 h-3 rounded-full',
            priorityConfig.color,
            isOverdue && 'animate-pulse'
          )}
        />
        <span className={cn(
          'text-sm font-medium',
          isUrgent && 'text-red-600'
        )}>
          {config.label}
        </span>
        {showTimer && (
          <span className={cn(
            'text-xs',
            isOverdue ? 'text-red-500 font-bold' : 'text-gray-500'
          )}>
            {ageInMinutes}m
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Badge
          className={cn(
            'text-white border-0',
            config.color,
            isOverdue && 'animate-pulse bg-red-500'
          )}
        >
          <span className="mr-1">{config.icon}</span>
          {config.label}
        </Badge>
        
        <Badge
          variant="outline"
          className={cn(
            'border-2',
            priorityConfig.color.replace('bg-', 'border-'),
            priorityConfig.color.replace('bg-', 'text-')
          )}
        >
          {priorityConfig.label}
        </Badge>
      </div>

      {showTimer && (
        <div className={cn(
          'text-sm',
          isOverdue ? 'text-red-600 font-bold' : 
          isUrgent ? 'text-orange-600 font-medium' : 'text-gray-600'
        )}>
          {isOverdue && '⚠️ '}
          {ageInMinutes < 1 ? 'Just now' : `${ageInMinutes} min ago`}
          {isOverdue && ' - OVERDUE'}
        </div>
      )}
    </div>
  )
}

// Progress indicator badge for customer-facing displays
interface ProgressStatusBadgeProps {
  status: OrderStatus
  orderType: Database['public']['Enums']['order_type']
  progress?: number
  estimatedTime?: string
  animated?: boolean
  className?: string
}

export function ProgressStatusBadge({
  status,
  orderType,
  progress,
  estimatedTime,
  animated = true,
  className
}: ProgressStatusBadgeProps) {
  const config = ORDER_STATUS_CONFIG[status]
  
  // Calculate progress if not provided
  const ORDER_FLOWS = {
    dine_in: ['pending', 'confirmed', 'preparing', 'ready', 'completed'],
    takeout: ['pending', 'confirmed', 'preparing', 'ready', 'completed'],
    delivery: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']
  }
  
  const flow = ORDER_FLOWS[orderType]
  const currentIndex = flow.indexOf(status)
  const calculatedProgress = currentIndex >= 0 ? Math.round((currentIndex / (flow.length - 1)) * 100) : 0
  const displayProgress = progress ?? calculatedProgress

  return (
    <div className={cn('space-y-3', className)}>
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <Badge
          className={cn(
            config.color,
            'border px-3 py-1.5',
            animated && status === 'preparing' && 'animate-pulse'
          )}
        >
          <span className="mr-2">{config.icon}</span>
          {config.label}
        </Badge>
        
        {estimatedTime && (
          <span className="text-sm text-gray-600">
            {estimatedTime}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Progress</span>
          <span>{displayProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={cn(
              'h-2 rounded-full transition-all duration-500 ease-out',
              displayProgress < 25 && 'bg-yellow-500',
              displayProgress >= 25 && displayProgress < 50 && 'bg-orange-500',
              displayProgress >= 50 && displayProgress < 75 && 'bg-blue-500',
              displayProgress >= 75 && 'bg-green-500',
              animated && 'animate-pulse'
            )}
            style={{ width: `${displayProgress}%` }}
          />
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600">
        {config.description}
      </p>
    </div>
  )
}

// Simple status indicator for lists and tables
interface StatusIndicatorProps {
  status: OrderStatus
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function StatusIndicator({
  status,
  size = 'md',
  className
}: StatusIndicatorProps) {
  const config = ORDER_STATUS_CONFIG[status]
  
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'rounded-full',
          sizeClasses[size],
          config.color.includes('yellow') && 'bg-yellow-500',
          config.color.includes('blue') && 'bg-blue-500',
          config.color.includes('orange') && 'bg-orange-500',
          config.color.includes('green') && 'bg-green-500',
          config.color.includes('purple') && 'bg-purple-500',
          config.color.includes('red') && 'bg-red-500',
          config.color.includes('gray') && 'bg-gray-500'
        )}
      />
      <span className={cn(
        'font-medium',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        size === 'lg' && 'text-base'
      )}>
        {config.label}
      </span>
    </div>
  )
}