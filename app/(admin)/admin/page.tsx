import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlatformStats } from '@/components/admin/platform-stats'
import { RevenueDashboard } from '@/components/admin/revenue-dashboard'
import { OrderMonitor } from '@/components/admin/order-monitor'
import { RestaurantTable } from '@/components/admin/restaurant-table'
import { 
  Building2, 
  Users, 
  ShoppingCart, 
  DollarSign,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'

/**
 * Admin Dashboard Homepage
 * 
 * Provides high-level platform metrics and quick access to key management areas.
 * Features:
 * - Platform KPIs and statistics
 * - Revenue tracking and trends
 * - Real-time order monitoring
 * - Restaurant performance overview
 * - Quick actions and alerts
 */
export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Platform Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Monitor and manage your restaurant SaaS platform
        </p>
      </div>

      {/* Quick Stats Grid */}
      <Suspense fallback={<StatsLoadingSkeleton />}>
        <PlatformStats />
      </Suspense>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Dashboard */}
        <Card className="lg:col-span-1">
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

        {/* Order Activity */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              Live Order Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<OrderMonitorSkeleton />}>
              <OrderMonitor limit={5} />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      {/* Restaurant Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-600" />
            Restaurant Performance
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Top performing restaurants this month
          </p>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<RestaurantTableSkeleton />}>
            <RestaurantTable limit={8} showPerformanceOnly />
          </Suspense>
        </CardContent>
      </Card>

      {/* System Alerts */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            System Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-white rounded border">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span className="text-sm">3 restaurants pending Stripe verification</span>
              </div>
              <button className="text-xs text-amber-700 hover:text-amber-800 font-medium">
                View Details
              </button>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded border">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm">High payment failure rate detected</span>
              </div>
              <button className="text-xs text-red-700 hover:text-red-800 font-medium">
                Investigate
              </button>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded border">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Platform maintenance scheduled for tomorrow</span>
              </div>
              <button className="text-xs text-blue-700 hover:text-blue-800 font-medium">
                Schedule
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
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

function OrderMonitorSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 border rounded">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-gray-200 rounded-full"></div>
            <div className="space-y-1">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
          <div className="h-6 bg-gray-200 rounded w-16"></div>
        </div>
      ))}
    </div>
  )
}

function RestaurantTableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {Array.from({ length: 5 }).map((_, i) => (
                <th key={i} className="text-left py-3 px-4">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b">
                {Array.from({ length: 5 }).map((_, j) => (
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