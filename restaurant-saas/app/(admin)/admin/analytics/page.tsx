import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlatformStats, PlatformHealth } from '@/components/admin/platform-stats'
import { RevenueDashboard } from '@/components/admin/revenue-dashboard'
import { RestaurantTable } from '@/components/admin/restaurant-table'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Building2,
  DollarSign,
  ShoppingCart,
  MapPin,
  Clock
} from 'lucide-react'

/**
 * Admin Analytics Page
 * 
 * Comprehensive analytics and reporting dashboard for platform administrators.
 * Features:
 * - Platform-wide performance metrics
 * - Revenue analysis and trends
 * - Restaurant performance comparison
 * - User engagement analytics
 * - Geographic and temporal analysis
 */
export default function AdminAnalytics() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Analytics</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive insights and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
            Export Report
          </button>
          <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Schedule Report
          </button>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <Suspense fallback={<StatsLoadingSkeleton />}>
        <PlatformStats />
      </Suspense>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Revenue Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<RevenueDashboardSkeleton />}>
                  <RevenueDashboard />
                </Suspense>
              </CardContent>
            </Card>

            {/* Platform Health */}
            <Suspense fallback={<PlatformHealthSkeleton />}>
              <PlatformHealth />
            </Suspense>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Order Volume"
              value="12,543"
              change="+8.2%"
              changeType="increase"
              icon={ShoppingCart}
              description="Orders this month"
            />
            <MetricCard
              title="Active Users"
              value="2,847"
              change="+12.5%"
              changeType="increase"
              icon={Users}
              description="Monthly active users"
            />
            <MetricCard
              title="Avg Session"
              value="4m 32s"
              change="-2.1%"
              changeType="decrease"
              icon={Clock}
              description="Average session duration"
            />
            <MetricCard
              title="Coverage"
              value="23 Cities"
              change="+2 cities"
              changeType="increase"
              icon={MapPin}
              description="Geographic coverage"
            />
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Revenue Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<RevenueDashboardSkeleton />}>
                  <RevenueDashboard />
                </Suspense>
              </CardContent>
            </Card>

            {/* Revenue Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <RevenueBreakdownCard
                title="Commission Revenue"
                amount="$24,560"
                percentage="78%"
                description="Platform commission from orders"
                color="bg-blue-500"
              />
              <RevenueBreakdownCard
                title="Subscription Revenue"
                amount="$6,840"
                percentage="22%"
                description="Monthly subscription fees"
                color="bg-green-500"
              />
              <RevenueBreakdownCard
                title="Processing Fees"
                amount="$1,240"
                percentage="4%"
                description="Payment processing costs"
                color="bg-red-500"
              />
            </div>
          </div>
        </TabsContent>

        {/* Restaurants Tab */}
        <TabsContent value="restaurants" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <MetricCard
              title="Active Restaurants"
              value="156"
              change="+4 this month"
              changeType="increase"
              icon={Building2}
              description="Currently operational"
            />
            <MetricCard
              title="Pending Approval"
              value="8"
              change="2 this week"
              changeType="neutral"
              icon={Clock}
              description="Awaiting onboarding"
            />
            <MetricCard
              title="Avg Revenue/Restaurant"
              value="$2,847"
              change="+15.2%"
              changeType="increase"
              icon={DollarSign}
              description="Monthly average"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Restaurant Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<RestaurantTableSkeleton />}>
                <RestaurantTable limit={20} showPerformanceMetrics />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <MetricCard
              title="Total Customers"
              value="12,847"
              change="+247 this month"
              changeType="increase"
              icon={Users}
              description="Registered users"
            />
            <MetricCard
              title="Active This Month"
              value="8,456"
              change="+12.3%"
              changeType="increase"
              icon={Users}
              description="Monthly active users"
            />
            <MetricCard
              title="Customer Retention"
              value="73.2%"
              change="+2.1%"
              changeType="increase"
              icon={TrendingUp}
              description="30-day retention rate"
            />
          </div>

          {/* Customer Analytics Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-50 rounded border-2 border-dashed border-gray-200 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Customer analytics visualization</p>
                  <p className="text-xs">User behavior and engagement metrics</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<PlatformHealthSkeleton />}>
                  <PlatformHealth />
                </Suspense>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Business Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Order Fulfillment Rate</span>
                    <span className="font-semibold">94.2%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Customer Satisfaction</span>
                    <span className="font-semibold">4.7/5.0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Avg Delivery Time</span>
                    <span className="font-semibold">28 minutes</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Restaurant Retention</span>
                    <span className="font-semibold">89.1%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper Components
interface MetricCardProps {
  title: string
  value: string
  change: string
  changeType: 'increase' | 'decrease' | 'neutral'
  icon: React.ComponentType<{ className?: string }>
  description: string
}

function MetricCard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  description 
}: MetricCardProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case 'increase': return 'text-green-600'
      case 'decrease': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
            <p className={`text-xs mt-2 ${getChangeColor()}`}>{change}</p>
          </div>
          <div className="p-3 rounded-full bg-blue-100 text-blue-600">
            <Icon className="h-6 w-6" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">{description}</p>
      </CardContent>
    </Card>
  )
}

interface RevenueBreakdownCardProps {
  title: string
  amount: string
  percentage: string
  description: string
  color: string
}

function RevenueBreakdownCard({ 
  title, 
  amount, 
  percentage, 
  description, 
  color 
}: RevenueBreakdownCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-4 h-4 rounded ${color}`}></div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="space-y-2">
          <p className="text-2xl font-bold text-gray-900">{amount}</p>
          <p className="text-sm text-gray-600">{percentage} of total revenue</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Loading Skeletons
function StatsLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
              <div className="mt-4 h-3 bg-gray-200 rounded w-20"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function RevenueDashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-6 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-6 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
      <div className="h-48 bg-gray-200 rounded"></div>
    </div>
  )
}

function PlatformHealthSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-2"></div>
                <div className="space-y-1">
                  <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
                  <div className="h-6 bg-gray-200 rounded w-12 mx-auto"></div>
                  <div className="h-3 bg-gray-200 rounded w-20 mx-auto"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RestaurantTableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {Array.from({ length: 6 }).map((_, i) => (
                <th key={i} className="text-left py-3 px-4">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="border-b">
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="py-3 px-4">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}