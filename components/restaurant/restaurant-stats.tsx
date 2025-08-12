'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Star,
  RefreshCw,
  ChefHat,
  Clock,
  ArrowUpIcon,
  ArrowDownIcon
} from 'lucide-react'
import { DashboardMetrics, RestaurantStats, Order, OrderStatus } from '@/types'
import { useDashboardMetrics, useRestaurantStats } from '@/hooks/use-restaurant'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: React.ReactNode
  loading?: boolean
  className?: string
}

/**
 * Individual Stat Card Component
 */
function StatCard({ title, value, change, changeLabel, icon, loading, className }: StatCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (title.toLowerCase().includes('revenue') || title.toLowerCase().includes('value')) {
        return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }
      return val.toLocaleString()
    }
    return val
  }

  const getChangeColor = (change?: number) => {
    if (!change) return 'text-muted-foreground'
    return change >= 0 ? 'text-green-600' : 'text-red-600'
  }

  const getChangeIcon = (change?: number) => {
    if (!change) return null
    return change >= 0 ? 
      <ArrowUpIcon className="h-3 w-3" /> : 
      <ArrowDownIcon className="h-3 w-3" />
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
          <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="w-16 h-8 bg-gray-200 rounded animate-pulse mb-1" />
          <div className="w-24 h-3 bg-gray-200 rounded animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {change !== undefined && (
          <p className={cn("text-xs flex items-center gap-1", getChangeColor(change))}>
            {getChangeIcon(change)}
            {Math.abs(change).toFixed(1)}% {changeLabel}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

interface RestaurantStatsCardsProps {
  className?: string
  refreshInterval?: number
}

/**
 * Restaurant Statistics Cards Component
 * Displays key metrics in a grid layout
 */
export function RestaurantStatsCards({ className, refreshInterval = 300000 }: RestaurantStatsCardsProps) {
  const { metrics, loading: metricsLoading, error: metricsError, refresh } = useDashboardMetrics(refreshInterval)
  const { stats, loading: statsLoading } = useRestaurantStats()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refresh()
    setIsRefreshing(false)
  }

  const loading = metricsLoading || statsLoading

  // If we have an error, show error state
  if (metricsError) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Dashboard Overview</h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Failed to load metrics</p>
              <Button variant="link" onClick={handleRefresh}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Dashboard Overview</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Revenue"
          value={metrics?.revenue.today || 0}
          change={metrics?.revenue.growth.daily}
          changeLabel="from yesterday"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          loading={loading}
        />
        
        <StatCard
          title="Today's Orders"
          value={metrics?.orders.today || 0}
          change={metrics?.orders.growth.daily}
          changeLabel="from yesterday"
          icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
          loading={loading}
        />
        
        <StatCard
          title="Average Order Value"
          value={metrics?.avgOrderValue.current || 0}
          change={metrics?.avgOrderValue.growth}
          changeLabel="this month"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          loading={loading}
        />
        
        <StatCard
          title="Total Customers"
          value={metrics?.customers.total || 0}
          change={metrics?.customers.growth}
          changeLabel="this month"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          loading={loading}
        />
      </div>

      {/* Monthly Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Monthly Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                <div className="w-full h-4 bg-gray-200 rounded animate-pulse" />
                <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="w-1/2 h-4 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm">This Month</span>
                  <span className="font-semibold">
                    ${metrics?.revenue.thisMonth.toLocaleString() || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Last Month</span>
                  <span className="text-muted-foreground">
                    ${metrics?.revenue.lastMonth.toLocaleString() || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">Growth</span>
                  <span className={cn(
                    "font-semibold flex items-center gap-1",
                    (metrics?.revenue.growth.monthly || 0) >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {(metrics?.revenue.growth.monthly || 0) >= 0 ? 
                      <TrendingUp className="h-3 w-3" /> : 
                      <TrendingDown className="h-3 w-3" />
                    }
                    {Math.abs(metrics?.revenue.growth.monthly || 0).toFixed(1)}%
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Customer Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                <div className="w-full h-4 bg-gray-200 rounded animate-pulse" />
                <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="w-1/2 h-4 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm">New Customers</span>
                  <Badge variant="success">{metrics?.customers.new || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Returning Customers</span>
                  <Badge variant="secondary">{metrics?.customers.returning || 0}</Badge>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">Return Rate</span>
                  <span className="font-semibold">
                    {metrics?.customers.total ? 
                      (((metrics.customers.returning || 0) / metrics.customers.total) * 100).toFixed(1) : 0
                    }%
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface PopularItemsProps {
  className?: string
  limit?: number
}

/**
 * Popular Items Component
 * Shows the most ordered items
 */
export function PopularItems({ className, limit = 5 }: PopularItemsProps) {
  const { stats, loading } = useRestaurantStats()

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Popular Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="w-32 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const popularItems = stats?.popularItems.slice(0, limit) || []

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Popular Items
        </CardTitle>
      </CardHeader>
      <CardContent>
        {popularItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data available yet</p>
        ) : (
          <div className="space-y-3">
            {popularItems.map((item, index) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.orderCount} orders
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">
                    ${item.revenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">revenue</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface RecentOrdersProps {
  className?: string
  limit?: number
}

/**
 * Recent Orders Component
 * Shows the most recent orders
 */
export function RecentOrders({ className, limit = 5 }: RecentOrdersProps) {
  const { stats, loading } = useRestaurantStats()

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded">
                <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const recentOrders = stats?.recentOrders.slice(0, limit) || []

  const getStatusBadge = (status: OrderStatus) => {
    const variants = {
      pending: 'warning',
      confirmed: 'secondary',
      preparing: 'warning',
      ready: 'success',
      out_for_delivery: 'secondary',
      delivered: 'success',
      completed: 'success',
      canceled: 'destructive',
      refunded: 'destructive',
    } as const

    return variants[status] || 'secondary'
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Orders
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent orders</p>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="font-medium text-sm">#{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(order.createdAt as any)} • {order.customerInfo.name}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={getStatusBadge(order.status)} className="mb-1">
                    {order.status.replace('_', ' ')}
                  </Badge>
                  <p className="text-sm font-medium">${order.total.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}