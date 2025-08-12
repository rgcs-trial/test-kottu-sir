'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRestaurant } from '@/hooks/use-restaurant'
import { useRealtimeOrders, useKitchenPresence, useConnectionHealth } from '@/hooks/use-realtime-orders'
import { useOrderNotifications } from '@/components/notifications/order-notifications'
import { KitchenDisplay } from '@/components/kitchen/kitchen-display'
import { OrderNotifications } from '@/components/notifications/order-notifications'
import { LiveOrderList } from '@/components/orders/live-order-updates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  ChefHat,
  Monitor,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Users,
  Wifi,
  WifiOff,
  Settings,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle,
  Maximize2,
  RefreshCw,
  Zap
} from 'lucide-react'

export default function KitchenDashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const { restaurant, loading: restaurantLoading } = useRestaurant()
  const connectionHealth = useConnectionHealth()
  
  const [activeTab, setActiveTab] = useState('display')
  const [fullscreenMode, setFullscreenMode] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  // Real-time orders
  const {
    orders,
    connectionState,
    metrics,
    error: ordersError,
    isConnected,
    retry: retryOrders
  } = useRealtimeOrders({
    restaurantId: restaurant?.id,
    enableSound: soundEnabled,
    enableNotifications: notificationsEnabled
  })

  // Kitchen staff presence
  const {
    staff,
    onlineStaff,
    isConnected: presenceConnected
  } = useKitchenPresence(
    restaurant?.id || '',
    user?.id || '',
    {
      name: `${user?.first_name} ${user?.last_name}` || 'Staff Member',
      role: user?.role || 'staff',
      avatar: user?.avatar
    }
  )

  // Notifications
  const {
    notifications,
    preferences,
    markAsRead,
    markAllAsRead,
    updatePreferences
  } = useOrderNotifications(restaurant?.id)

  // Check permissions
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/login'
      return
    }

    if (user && !['restaurant_owner', 'restaurant_admin', 'staff'].includes(user.role)) {
      window.location.href = '/dashboard'
      return
    }
  }, [user, authLoading])

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setFullscreenMode(true)
    } else {
      document.exitFullscreen()
      setFullscreenMode(false)
    }
  }

  const handleFullscreenChange = () => {
    setFullscreenMode(!!document.fullscreenElement)
  }

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  if (authLoading || restaurantLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No restaurant found. Please contact support.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Kitchen Dashboard Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ChefHat className="w-8 h-8 text-orange-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Kitchen Dashboard</h1>
                <p className="text-gray-600">{restaurant.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                {isConnected && connectionHealth.isOnline ? (
                  <Badge variant="default" className="bg-green-600">
                    <Wifi className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <WifiOff className="w-3 h-3 mr-1" />
                    Offline
                  </Badge>
                )}
                
                {connectionHealth.connectionQuality && (
                  <span className="text-xs text-gray-500">
                    {connectionHealth.latency}ms
                  </span>
                )}
              </div>

              {/* Online Staff */}
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-600">
                  {onlineStaff.length} online
                </span>
              </div>

              {/* Quick Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                >
                  {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFullscreen}
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alerts */}
      {ordersError && (
        <div className="container mx-auto px-4 py-2">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              Connection error: {ordersError}
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2"
                onClick={retryOrders}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {!connectionHealth.isOnline && (
        <div className="container mx-auto px-4 py-2">
          <Alert className="border-orange-200 bg-orange-50">
            <WifiOff className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700">
              You're currently offline. Some features may be limited.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="display" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Kitchen Display
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ChefHat className="w-4 h-4" />
              Order List
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
              {notifications.filter(n => !n.read).length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {notifications.filter(n => !n.read).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Kitchen Display Tab */}
          <TabsContent value="display" className="space-y-6">
            {restaurant && user && (
              <KitchenDisplay
                restaurantId={restaurant.id}
                userId={user.id}
                userInfo={{
                  name: `${user.first_name} ${user.last_name}`,
                  role: user.role,
                  avatar: user.avatar
                }}
              />
            )}
          </TabsContent>

          {/* Order List Tab */}
          <TabsContent value="orders" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Metrics Cards */}
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold text-blue-600">{metrics.totalOrders}</div>
                  <div className="text-sm text-gray-600">Active Orders</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold text-orange-600">{metrics.preparingOrders}</div>
                  <div className="text-sm text-gray-600">Preparing</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold text-green-600">{metrics.readyOrders}</div>
                  <div className="text-sm text-gray-600">Ready</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold text-purple-600">{metrics.avgPrepTime}m</div>
                  <div className="text-sm text-gray-600">Avg Prep Time</div>
                </CardContent>
              </Card>
            </div>

            {/* Order List */}
            {restaurant && (
              <LiveOrderList
                restaurantId={restaurant.id}
                variant="kitchen"
                onOrderCreated={(order) => {
                  console.log('New order created:', order)
                }}
                onOrderUpdated={(order) => {
                  console.log('Order updated:', order)
                }}
              />
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Performance Today
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Orders Completed</span>
                    <span className="font-bold">{metrics.completedToday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Prep Time</span>
                    <span className="font-bold">{metrics.avgPrepTime}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span>On-Time Rate</span>
                    <span className="font-bold text-green-600">87%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer Rating</span>
                    <span className="font-bold text-blue-600">4.8/5</span>
                  </div>
                </CardContent>
              </Card>

              {/* Staff Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Staff Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {staff.map(member => (
                    <div key={member.user_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          onlineStaff.find(s => s.user_id === member.user_id) 
                            ? 'bg-green-500' 
                            : 'bg-gray-300'
                        }`} />
                        <span className="text-sm">{member.name}</span>
                      </div>
                      <Badge variant="outline" size="sm">
                        {member.role}
                      </Badge>
                    </div>
                  ))}
                  {staff.length === 0 && (
                    <p className="text-sm text-gray-500">No staff currently active</p>
                  )}
                </CardContent>
              </Card>

              {/* Order Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Order Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Pending</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded">
                        <div 
                          className="h-2 bg-yellow-500 rounded"
                          style={{ width: `${(metrics.pendingOrders / Math.max(metrics.totalOrders, 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold">{metrics.pendingOrders}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Preparing</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded">
                        <div 
                          className="h-2 bg-orange-500 rounded"
                          style={{ width: `${(metrics.preparingOrders / Math.max(metrics.totalOrders, 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold">{metrics.preparingOrders}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Ready</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded">
                        <div 
                          className="h-2 bg-green-500 rounded"
                          style={{ width: `${(metrics.readyOrders / Math.max(metrics.totalOrders, 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold">{metrics.readyOrders}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Connection Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${connectionHealth.isOnline ? 'text-green-600' : 'text-red-600'}`}>
                      {connectionHealth.isOnline ? <CheckCircle className="w-8 h-8 mx-auto" /> : <AlertTriangle className="w-8 h-8 mx-auto" />}
                    </div>
                    <div className="text-sm text-gray-600">Network Status</div>
                    <div className="text-xs">{connectionHealth.isOnline ? 'Online' : 'Offline'}</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                      {connectionHealth.latency}ms
                    </div>
                    <div className="text-sm text-gray-600">Latency</div>
                    <div className="text-xs">{connectionHealth.connectionQuality}</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${presenceConnected ? 'text-green-600' : 'text-red-600'}`}>
                      {presenceConnected ? <CheckCircle className="w-8 h-8 mx-auto" /> : <AlertTriangle className="w-8 h-8 mx-auto" />}
                    </div>
                    <div className="text-sm text-gray-600">Real-time</div>
                    <div className="text-xs">{presenceConnected ? 'Connected' : 'Disconnected'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Quick Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Sound Notifications</label>
                    <Switch
                      checked={soundEnabled}
                      onCheckedChange={setSoundEnabled}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Push Notifications</label>
                    <Switch
                      checked={notificationsEnabled}
                      onCheckedChange={setNotificationsEnabled}
                    />
                  </div>
                  <Separator />
                  <div className="text-sm text-gray-600">
                    <p>Notifications: {notifications.length} total</p>
                    <p>Unread: {notifications.filter(n => !n.read).length}</p>
                    <p>Last update: {connectionHealth.lastCheck.toLocaleTimeString()}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Notifications */}
              <div className="lg:col-span-2">
                <OrderNotifications
                  notifications={notifications}
                  preferences={preferences}
                  onMarkAsRead={markAsRead}
                  onMarkAllAsRead={markAllAsRead}
                  onUpdatePreferences={updatePreferences}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}