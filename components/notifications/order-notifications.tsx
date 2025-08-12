'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ORDER_STATUS_CONFIG, playOrderSound } from '@/lib/realtime/order-tracking'
import { Database } from '@/lib/supabase/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import {
  Bell,
  BellOff,
  X,
  Check,
  Settings,
  Smartphone,
  Mail,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Clock,
  ChefHat,
  Truck,
  CheckCircle,
  AlertCircle,
  Info,
  Zap
} from 'lucide-react'

type Order = Database['public']['Tables']['orders']['Row']
type OrderStatus = Database['public']['Enums']['order_status']

// Notification types
export interface OrderNotification {
  id: string
  orderId: string
  orderNumber: string
  type: 'new_order' | 'status_change' | 'overdue' | 'ready' | 'completed' | 'canceled'
  title: string
  message: string
  status: OrderStatus
  timestamp: Date
  read: boolean
  urgent: boolean
  metadata?: {
    previousStatus?: OrderStatus
    customerName?: string
    orderTotal?: number
    estimatedTime?: string
  }
}

// Notification preferences
export interface NotificationPreferences {
  enabled: boolean
  sound: boolean
  desktop: boolean
  email: boolean
  sms: boolean
  types: {
    new_order: boolean
    status_change: boolean
    overdue: boolean
    ready: boolean
    completed: boolean
    canceled: boolean
  }
  quietHours: {
    enabled: boolean
    start: string
    end: string
  }
}

// Default preferences
const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  sound: true,
  desktop: true,
  email: true,
  sms: false,
  types: {
    new_order: true,
    status_change: true,
    overdue: true,
    ready: true,
    completed: false,
    canceled: true
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  }
}

interface OrderNotificationsProps {
  notifications: OrderNotification[]
  preferences?: NotificationPreferences
  onMarkAsRead?: (notificationId: string) => void
  onMarkAllAsRead?: () => void
  onUpdatePreferences?: (preferences: NotificationPreferences) => void
  onDismiss?: (notificationId: string) => void
  compact?: boolean
  maxVisible?: number
  className?: string
}

export function OrderNotifications({
  notifications = [],
  preferences = DEFAULT_PREFERENCES,
  onMarkAsRead,
  onMarkAllAsRead,
  onUpdatePreferences,
  onDismiss,
  compact = false,
  maxVisible = 5,
  className
}: OrderNotificationsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [localPreferences, setLocalPreferences] = useState(preferences)
  const audioRef = useRef<HTMLAudioElement>(null)

  const unreadCount = notifications.filter(n => !n.read).length
  const visibleNotifications = notifications.slice(0, maxVisible)

  // Request desktop notification permission
  useEffect(() => {
    if (localPreferences.desktop && 'Notification' in window) {
      Notification.requestPermission()
    }
  }, [localPreferences.desktop])

  // Show desktop notification
  const showDesktopNotification = useCallback((notification: OrderNotification) => {
    if (!localPreferences.desktop || !localPreferences.enabled) return
    if ('Notification' in window && Notification.permission === 'granted') {
      const config = ORDER_STATUS_CONFIG[notification.status]
      
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.urgent,
        actions: [
          { action: 'view', title: 'View Order' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      })
    }
  }, [localPreferences.desktop, localPreferences.enabled])

  // Play notification sound
  const playNotificationSound = useCallback((notification: OrderNotification) => {
    if (!localPreferences.sound || !localPreferences.enabled) return
    
    const soundType = notification.urgent ? 'urgent' : 
                     notification.type === 'new_order' ? 'new_order' : 'update'
    
    playOrderSound(soundType)
  }, [localPreferences.sound, localPreferences.enabled])

  // Check if we're in quiet hours
  const isQuietHours = useCallback(() => {
    if (!localPreferences.quietHours.enabled) return false
    
    const now = new Date()
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                       now.getMinutes().toString().padStart(2, '0')
    
    const { start, end } = localPreferences.quietHours
    
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end
    }
    
    return currentTime >= start && currentTime <= end
  }, [localPreferences.quietHours])

  // Process new notifications
  useEffect(() => {
    const latestNotification = notifications[0]
    if (!latestNotification || latestNotification.read) return
    
    // Check if notification type is enabled
    if (!localPreferences.types[latestNotification.type]) return
    
    // Skip if in quiet hours (except for urgent notifications)
    if (isQuietHours() && !latestNotification.urgent) return
    
    // Play sound
    playNotificationSound(latestNotification)
    
    // Show desktop notification
    showDesktopNotification(latestNotification)
    
  }, [notifications, localPreferences.types, isQuietHours, playNotificationSound, showDesktopNotification])

  // Update preferences
  const updatePreferences = (newPreferences: NotificationPreferences) => {
    setLocalPreferences(newPreferences)
    onUpdatePreferences?.(newPreferences)
  }

  // Get notification icon and color
  const getNotificationIcon = (notification: OrderNotification) => {
    switch (notification.type) {
      case 'new_order':
        return <Bell className="w-5 h-5 text-blue-600" />
      case 'status_change':
        return <Zap className="w-5 h-5 text-orange-600" />
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'ready':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'completed':
        return <Check className="w-5 h-5 text-green-600" />
      case 'canceled':
        return <X className="w-5 h-5 text-red-600" />
      default:
        return <Info className="w-5 h-5 text-gray-600" />
    }
  }

  const getNotificationBgColor = (notification: OrderNotification) => {
    if (notification.urgent) return 'bg-red-50 border-red-200'
    
    switch (notification.type) {
      case 'new_order':
        return 'bg-blue-50 border-blue-200'
      case 'status_change':
        return 'bg-orange-50 border-orange-200'
      case 'overdue':
        return 'bg-red-50 border-red-200'
      case 'ready':
        return 'bg-green-50 border-green-200'
      case 'completed':
        return 'bg-green-50 border-green-200'
      case 'canceled':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  if (compact) {
    return (
      <div className={cn('relative', className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="relative"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>

        {isOpen && (
          <Card className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto z-50 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Notifications</CardTitle>
                <div className="flex gap-1">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onMarkAllAsRead}
                    >
                      Mark all read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {visibleNotifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No notifications
                </div>
              ) : (
                <div className="space-y-1">
                  {visibleNotifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={onMarkAsRead}
                      onDismiss={onDismiss}
                      compact
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount}</Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={onMarkAllAsRead}>
                Mark all read
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Notification Settings */}
        {showSettings && (
          <NotificationSettings
            preferences={localPreferences}
            onUpdatePreferences={updatePreferences}
          />
        )}

        {/* Notifications List */}
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No notifications yet</p>
              <p className="text-sm">You'll see order updates here</p>
            </div>
          ) : (
            notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onDismiss={onDismiss}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Individual notification item
interface NotificationItemProps {
  notification: OrderNotification
  onMarkAsRead?: (id: string) => void
  onDismiss?: (id: string) => void
  compact?: boolean
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onDismiss,
  compact = false
}: NotificationItemProps) {
  const getNotificationIcon = (notification: OrderNotification) => {
    switch (notification.type) {
      case 'new_order':
        return <Bell className="w-4 h-4 text-blue-600" />
      case 'status_change':
        return <Zap className="w-4 h-4 text-orange-600" />
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'completed':
        return <Check className="w-4 h-4 text-green-600" />
      case 'canceled':
        return <X className="w-4 h-4 text-red-600" />
      default:
        return <Info className="w-4 h-4 text-gray-600" />
    }
  }

  const getBgColor = (notification: OrderNotification) => {
    if (notification.urgent) return 'bg-red-50 border-red-200'
    
    switch (notification.type) {
      case 'new_order':
        return 'bg-blue-50 border-blue-200'
      case 'status_change':
        return 'bg-orange-50 border-orange-200'
      case 'overdue':
        return 'bg-red-50 border-red-200'
      case 'ready':
        return 'bg-green-50 border-green-200'
      case 'completed':
        return 'bg-green-50 border-green-200'
      case 'canceled':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div
      className={cn(
        'p-3 border rounded-lg transition-all duration-200',
        !notification.read && 'border-l-4',
        notification.read && 'opacity-60',
        getBgColor(notification),
        compact && 'p-2'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={cn(
                'font-medium text-sm',
                notification.urgent && 'text-red-700',
                compact && 'text-xs'
              )}>
                {notification.title}
              </h4>
              <p className={cn(
                'text-gray-600 mt-1',
                compact ? 'text-xs' : 'text-sm'
              )}>
                {notification.message}
              </p>
              
              {!compact && notification.metadata && (
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  {notification.metadata.customerName && (
                    <span>Customer: {notification.metadata.customerName}</span>
                  )}
                  {notification.metadata.orderTotal && (
                    <span>Total: ${notification.metadata.orderTotal}</span>
                  )}
                  {notification.metadata.estimatedTime && (
                    <span>ETA: {notification.metadata.estimatedTime}</span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <span className={cn(
                'text-gray-500',
                compact ? 'text-xs' : 'text-sm'
              )}>
                {notification.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
              
              {!notification.read && onMarkAsRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMarkAsRead(notification.id)}
                  className="h-6 w-6 p-0"
                >
                  <Eye className="w-3 h-3" />
                </Button>
              )}
              
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismiss(notification.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {notification.urgent && !compact && (
        <div className="mt-2 flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-3 h-3" />
          <span>Urgent - Requires immediate attention</span>
        </div>
      )}
    </div>
  )
}

// Notification settings component
interface NotificationSettingsProps {
  preferences: NotificationPreferences
  onUpdatePreferences: (preferences: NotificationPreferences) => void
}

function NotificationSettings({
  preferences,
  onUpdatePreferences
}: NotificationSettingsProps) {
  const updatePreference = (key: keyof NotificationPreferences, value: any) => {
    onUpdatePreferences({
      ...preferences,
      [key]: value
    })
  }

  const updateTypePreference = (type: keyof NotificationPreferences['types'], enabled: boolean) => {
    onUpdatePreferences({
      ...preferences,
      types: {
        ...preferences.types,
        [type]: enabled
      }
    })
  }

  const updateQuietHours = (key: keyof NotificationPreferences['quietHours'], value: any) => {
    onUpdatePreferences({
      ...preferences,
      quietHours: {
        ...preferences.quietHours,
        [key]: value
      }
    })
  }

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Notification Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Master toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="text-sm font-medium">Enable Notifications</span>
          </div>
          <Switch
            checked={preferences.enabled}
            onCheckedChange={(checked) => updatePreference('enabled', checked)}
          />
        </div>

        <Separator />

        {/* Delivery methods */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Delivery Methods</h4>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              <span className="text-sm">Sound</span>
            </div>
            <Switch
              checked={preferences.sound}
              onCheckedChange={(checked) => updatePreference('sound', checked)}
              disabled={!preferences.enabled}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              <span className="text-sm">Desktop Notifications</span>
            </div>
            <Switch
              checked={preferences.desktop}
              onCheckedChange={(checked) => updatePreference('desktop', checked)}
              disabled={!preferences.enabled}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span className="text-sm">Email</span>
            </div>
            <Switch
              checked={preferences.email}
              onCheckedChange={(checked) => updatePreference('email', checked)}
              disabled={!preferences.enabled}
            />
          </div>
        </div>

        <Separator />

        {/* Notification types */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Notification Types</h4>
          
          {Object.entries(preferences.types).map(([type, enabled]) => (
            <div key={type} className="flex items-center justify-between">
              <span className="text-sm">
                {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              <Switch
                checked={enabled}
                onCheckedChange={(checked) => updateTypePreference(type as keyof NotificationPreferences['types'], checked)}
                disabled={!preferences.enabled}
              />
            </div>
          ))}
        </div>

        <Separator />

        {/* Quiet hours */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Quiet Hours</span>
            </div>
            <Switch
              checked={preferences.quietHours.enabled}
              onCheckedChange={(checked) => updateQuietHours('enabled', checked)}
              disabled={!preferences.enabled}
            />
          </div>
          
          {preferences.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-600">Start</label>
                <input
                  type="time"
                  value={preferences.quietHours.start}
                  onChange={(e) => updateQuietHours('start', e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">End</label>
                <input
                  type="time"
                  value={preferences.quietHours.end}
                  onChange={(e) => updateQuietHours('end', e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Hook for managing notifications
export function useOrderNotifications(restaurantId?: string) {
  const [notifications, setNotifications] = useState<OrderNotification[]>([])
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES)

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('orderNotificationPreferences')
    if (saved) {
      try {
        setPreferences(JSON.parse(saved))
      } catch (error) {
        console.error('Error loading notification preferences:', error)
      }
    }
  }, [])

  // Save preferences to localStorage
  const updatePreferences = useCallback((newPreferences: NotificationPreferences) => {
    setPreferences(newPreferences)
    localStorage.setItem('orderNotificationPreferences', JSON.stringify(newPreferences))
  }, [])

  // Add new notification
  const addNotification = useCallback((notification: Omit<OrderNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: OrderNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false
    }
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 100)) // Keep max 100 notifications
  }, [])

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }, [])

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  // Dismiss notification
  const dismiss = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }, [])

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  return {
    notifications,
    preferences,
    addNotification,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
    updatePreferences
  }
}