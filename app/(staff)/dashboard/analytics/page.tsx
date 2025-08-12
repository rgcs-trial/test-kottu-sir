import type { Metadata } from 'next'
import { Suspense } from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Clock,
  Star,
  Download,
  Calendar,
  Target,
  Award,
  Zap,
  ArrowUpIcon,
  ArrowDownIcon
} from 'lucide-react'
import { RestaurantStatsCards } from '@/components/restaurant/restaurant-stats'
import { getDashboardMetrics, getRestaurantStats } from '@/lib/restaurant/actions'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Analytics Dashboard',
  description: 'Restaurant performance analytics and insights',
}

/**
 * Analytics Loading Component
 */
function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="w-48 h-8 bg-gray-200 rounded animate-pulse" />
        <div className="w-32 h-10 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 border rounded-lg">
            <div className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="w-16 h-8 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="w-20 h-3 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="p-6 border rounded-lg">
            <div className="w-32 h-6 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="w-full h-64 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Revenue Chart Component (Simplified representation)
 */
function RevenueChart({ monthlyData }: { monthlyData: any[] }) {
  const maxRevenue = Math.max(...monthlyData.map(d => d.revenue))
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Revenue Trend
        </CardTitle>
        <CardDescription>Monthly revenue over the last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {monthlyData.map((data, index) => {
            const percentage = maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0
            return (
              <div key={index} className="flex items-center gap-4">
                <div className="w-16 text-sm font-medium">{data.month}</div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <div className="w-20 text-sm text-right font-medium">
                  ${data.revenue.toLocaleString()}
                </div>
                <div className="w-12 text-xs text-muted-foreground text-right">
                  {data.orders}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Popular Items Chart Component
 */
function PopularItemsChart({ popularItems }: { popularItems: any[] }) {
  const maxCount = Math.max(...popularItems.map(item => item.orderCount))
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Top Performing Items
        </CardTitle>
        <CardDescription>Most ordered items this month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {popularItems.map((item, index) => {
            const percentage = maxCount > 0 ? (item.orderCount / maxCount) * 100 : 0
            return (
              <div key={item.id} className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm mb-1">{item.name}</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{item.orderCount} orders</div>
                  <div className="text-xs text-muted-foreground">${item.revenue.toLocaleString()}</div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Performance Insights Component
 */
function PerformanceInsights({ metrics, stats }: { metrics: any, stats: any }) {
  const insights = [
    {
      title: 'Revenue Growth',
      value: `${metrics?.revenue?.growth?.monthly?.toFixed(1) || 0}%`,
      description: 'vs last month',
      trend: (metrics?.revenue?.growth?.monthly || 0) >= 0 ? 'up' : 'down',
      icon: DollarSign
    },
    {
      title: 'Order Volume',
      value: `${metrics?.orders?.growth?.monthly?.toFixed(1) || 0}%`,
      description: 'vs last month',
      trend: (metrics?.orders?.growth?.monthly || 0) >= 0 ? 'up' : 'down',
      icon: ShoppingBag
    },
    {
      title: 'Customer Retention',
      value: `${stats?.popularItems?.length > 0 ? 
        (((metrics?.customers?.returning || 0) / (metrics?.customers?.total || 1)) * 100).toFixed(1) 
        : 0}%`,
      description: 'returning customers',
      trend: 'up',
      icon: Users
    },
    {
      title: 'Peak Hours',
      value: '7-9 PM',
      description: 'busiest time',
      trend: 'stable',
      icon: Clock
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Performance Insights
        </CardTitle>
        <CardDescription>Key metrics and business intelligence</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {insights.map((insight, index) => (
            <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
              <div className={cn(
                "flex items-center justify-center w-12 h-12 rounded-lg",
                insight.trend === 'up' ? "bg-green-100 text-green-600" :
                insight.trend === 'down' ? "bg-red-100 text-red-600" :
                "bg-blue-100 text-blue-600"
              )}>
                <insight.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-lg">{insight.value}</span>
                  {insight.trend === 'up' && <ArrowUpIcon className="h-4 w-4 text-green-600" />}
                  {insight.trend === 'down' && <ArrowDownIcon className="h-4 w-4 text-red-600" />}
                </div>
                <p className="text-sm text-muted-foreground">{insight.title}</p>
                <p className="text-xs text-muted-foreground">{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Analytics Dashboard Page Component
 */
export default async function AnalyticsPage({
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

  // Fetch analytics data
  const [metrics, stats] = await Promise.all([
    getDashboardMetrics().catch(() => null),
    getRestaurantStats().catch(() => null)
  ])

  const timeRange = searchParams.range as string || '30'

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analytics Dashboard
          </h1>
          <p className="text-gray-600">
            Track your restaurant's performance and discover insights
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select defaultValue={timeRange}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Report
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Badge variant="outline" className="px-4 py-2 text-sm">
          <Zap className="h-4 w-4 mr-2" />
          Real-time data
        </Badge>
        <Badge variant="outline" className="px-4 py-2 text-sm">
          <Award className="h-4 w-4 mr-2" />
          Performance tracking
        </Badge>
      </div>

      {/* Main Stats */}
      <Suspense fallback={<AnalyticsLoading />}>
        <RestaurantStatsCards refreshInterval={60000} />
      </Suspense>

      {/* Charts and Insights Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        {stats?.monthlyRevenue && (
          <RevenueChart monthlyData={stats.monthlyRevenue} />
        )}

        {/* Popular Items */}
        {stats?.popularItems && stats.popularItems.length > 0 && (
          <PopularItemsChart popularItems={stats.popularItems} />
        )}
      </div>

      {/* Performance Insights */}
      <PerformanceInsights metrics={metrics} stats={stats} />

      {/* Additional Analytics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Order Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Order Status
            </CardTitle>
            <CardDescription>Current order distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.orderStatusBreakdown && stats.orderStatusBreakdown.length > 0 ? (
              <div className="space-y-3">
                {stats.orderStatusBreakdown.map((status: any) => (
                  <div key={status.status} className="flex justify-between items-center">
                    <span className="text-sm capitalize">
                      {status.status.replace('_', ' ')}
                    </span>
                    <Badge variant="secondary">{status.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No pending orders</p>
            )}
          </CardContent>
        </Card>

        {/* Average Order Value Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Average Order Value
            </CardTitle>
            <CardDescription>Monthly comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">This Month</span>
                <span className="font-bold text-lg">
                  ${metrics?.avgOrderValue?.current?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Last Month</span>
                <span className="text-muted-foreground">
                  ${metrics?.avgOrderValue?.previous?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">Change</span>
                <span className={cn(
                  "font-semibold flex items-center gap-1",
                  (metrics?.avgOrderValue?.growth || 0) >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {(metrics?.avgOrderValue?.growth || 0) >= 0 ? 
                    <TrendingUp className="h-3 w-3" /> : 
                    <TrendingDown className="h-3 w-3" />
                  }
                  {Math.abs(metrics?.avgOrderValue?.growth || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customer Base
            </CardTitle>
            <CardDescription>Customer analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Customers</span>
                <span className="font-bold">{metrics?.customers?.total || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">New Customers</span>
                <Badge variant="success">{metrics?.customers?.new || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Returning Customers</span>
                <Badge variant="secondary">{metrics?.customers?.returning || 0}</Badge>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">Retention Rate</span>
                <span className="font-semibold">
                  {metrics?.customers?.total ? 
                    (((metrics.customers.returning || 0) / metrics.customers.total) * 100).toFixed(1) : 0
                  }%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}