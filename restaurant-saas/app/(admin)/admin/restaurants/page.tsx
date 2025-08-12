import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RestaurantTable } from '@/components/admin/restaurant-table'
import { 
  Building2, 
  Plus, 
  Search, 
  Filter,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'

/**
 * Restaurant Management Page
 * 
 * Comprehensive restaurant management interface for platform administrators:
 * - View all restaurants with filtering and search
 * - Restaurant status management (approve, suspend, activate)
 * - Performance metrics and analytics
 * - Onboarding queue management
 * - Bulk operations and exports
 */
export default function RestaurantsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Restaurant Management</h1>
          <p className="text-gray-600 mt-2">
            Manage restaurants, review applications, and monitor performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Advanced Filters
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Restaurants</p>
                <p className="text-2xl font-bold text-green-600 mt-2">247</p>
                <p className="text-xs text-gray-500 mt-1">+12 this month</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-amber-600 mt-2">18</p>
                <p className="text-xs text-gray-500 mt-1">Requires review</p>
              </div>
              <div className="p-3 rounded-full bg-amber-100">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Suspended</p>
                <p className="text-2xl font-bold text-red-600 mt-2">7</p>
                <p className="text-xs text-gray-500 mt-1">Policy violations</p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Issues Detected</p>
                <p className="text-2xl font-bold text-orange-600 mt-2">3</p>
                <p className="text-xs text-gray-500 mt-1">Needs attention</p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Restaurant Management Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All Restaurants</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="suspended">Suspended</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  All Restaurants
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search restaurants..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<RestaurantTableSkeleton />}>
                <RestaurantTable />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Active Restaurants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<RestaurantTableSkeleton />}>
                <RestaurantTable filter="active" />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <Clock className="h-5 w-5" />
                Pending Approval
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Review and approve new restaurant applications
              </p>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<RestaurantTableSkeleton />}>
                <RestaurantTable filter="pending" showApprovalActions />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suspended" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                Suspended Restaurants
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Restaurants suspended due to policy violations or issues
              </p>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<RestaurantTableSkeleton />}>
                <RestaurantTable filter="suspended" showSuspensionDetails />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-600">
                <Building2 className="h-5 w-5" />
                Inactive Restaurants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<RestaurantTableSkeleton />}>
                <RestaurantTable filter="inactive" />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                Restaurants with Issues
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Restaurants requiring immediate attention
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Issue Categories */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-red-800">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">Payment Issues</span>
                      </div>
                      <p className="text-2xl font-bold text-red-900 mt-2">2</p>
                      <p className="text-xs text-red-700">Stripe verification failed</p>
                    </CardContent>
                  </Card>

                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-amber-800">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">High Refund Rate</span>
                      </div>
                      <p className="text-2xl font-bold text-amber-900 mt-2">1</p>
                      <p className="text-xs text-amber-700">&gt;15% refund rate</p>
                    </CardContent>
                  </Card>

                  <Card className="border-orange-200 bg-orange-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-orange-800">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">Poor Performance</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-900 mt-2">1</p>
                      <p className="text-xs text-orange-700">Low order fulfillment</p>
                    </CardContent>
                  </Card>
                </div>

                <Suspense fallback={<RestaurantTableSkeleton />}>
                  <RestaurantTable filter="issues" showIssueDetails />
                </Suspense>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Loading Skeleton
function RestaurantTableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {Array.from({ length: 7 }).map((_, i) => (
                <th key={i} className="text-left py-3 px-4">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="border-b">
                {Array.from({ length: 7 }).map((_, j) => (
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