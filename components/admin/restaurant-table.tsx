'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { useAdminAnalytics } from '@/hooks/use-admin-analytics'
import { 
  MoreHorizontal,
  Eye,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  Users,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RestaurantTableProps {
  filter?: 'all' | 'active' | 'pending' | 'suspended' | 'inactive' | 'issues'
  limit?: number
  showPerformanceOnly?: boolean
  showApprovalActions?: boolean
  showSuspensionDetails?: boolean
  showIssueDetails?: boolean
}

interface RestaurantAction {
  id: string
  type: 'approve' | 'suspend' | 'reactivate' | 'reject'
  reason?: string
}

/**
 * Restaurant Management Table
 * 
 * Comprehensive table for managing restaurants with:
 * - Filtering and search capabilities
 * - Status management actions
 * - Performance metrics display
 * - Bulk operations support
 * - Real-time data updates
 */
export function RestaurantTable({
  filter = 'all',
  limit,
  showPerformanceOnly = false,
  showApprovalActions = false,
  showSuspensionDetails = false,
  showIssueDetails = false
}: RestaurantTableProps) {
  const { restaurants, loading, error, refreshRestaurants } = useAdminAnalytics()
  const [sortBy, setSortBy] = useState<'name' | 'revenue' | 'orders' | 'created'>('revenue')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([])

  // Filter restaurants based on props
  const filteredRestaurants = restaurants.filter(restaurant => {
    switch (filter) {
      case 'active':
        return restaurant.status === 'active'
      case 'pending':
        return restaurant.status === 'pending'
      case 'suspended':
        return restaurant.status === 'suspended'
      case 'inactive':
        return restaurant.status === 'inactive'
      case 'issues':
        return hasIssues(restaurant)
      default:
        return true
    }
  }).slice(0, limit)

  // Sort restaurants
  const sortedRestaurants = [...filteredRestaurants].sort((a, b) => {
    let aValue, bValue
    
    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'revenue':
        aValue = a.metrics.revenueThisMonth
        bValue = b.metrics.revenueThisMonth
        break
      case 'orders':
        aValue = a.metrics.ordersThisMonth
        bValue = b.metrics.ordersThisMonth
        break
      case 'created':
        aValue = new Date(a.lastActivity).getTime()
        bValue = new Date(b.lastActivity).getTime()
        break
      default:
        return 0
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const handleRestaurantAction = async (restaurantId: string, action: RestaurantAction) => {
    try {
      // Implementation would call admin actions
      console.log('Restaurant action:', { restaurantId, action })
      await refreshRestaurants()
    } catch (error) {
      console.error('Failed to perform restaurant action:', error)
    }
  }

  const handleBulkAction = async (action: string) => {
    try {
      console.log('Bulk action:', { action, restaurantIds: selectedRestaurants })
      await refreshRestaurants()
      setSelectedRestaurants([])
    } catch (error) {
      console.error('Failed to perform bulk action:', error)
    }
  }

  if (loading) {
    return <RestaurantTableSkeleton />
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Failed to load restaurant data</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedRestaurants.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <span className="text-sm text-blue-800">
            {selectedRestaurants.length} restaurant(s) selected
          </span>
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('export')}
            >
              Export
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('suspend')}
              className="text-red-600 hover:text-red-700"
            >
              Suspend
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedRestaurants([])}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4">
                <input
                  type="checkbox"
                  checked={selectedRestaurants.length === sortedRestaurants.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRestaurants(sortedRestaurants.map(r => r.id))
                    } else {
                      setSelectedRestaurants([])
                    }
                  }}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('name')}
                  className="font-medium text-gray-900 hover:text-gray-700 flex items-center gap-1"
                >
                  Restaurant
                  {sortBy === 'name' && (
                    <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-4">Status</th>
              {!showPerformanceOnly && (
                <>
                  <th className="text-left py-3 px-4">
                    <button
                      onClick={() => handleSort('orders')}
                      className="font-medium text-gray-900 hover:text-gray-700 flex items-center gap-1"
                    >
                      Orders
                      {sortBy === 'orders' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4">
                    <button
                      onClick={() => handleSort('revenue')}
                      className="font-medium text-gray-900 hover:text-gray-700 flex items-center gap-1"
                    >
                      Revenue
                      {sortBy === 'revenue' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                </>
              )}
              {showPerformanceOnly && (
                <>
                  <th className="text-left py-3 px-4">Performance</th>
                  <th className="text-left py-3 px-4">Growth</th>
                </>
              )}
              {(showSuspensionDetails || showIssueDetails) && (
                <th className="text-left py-3 px-4">Issues</th>
              )}
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('created')}
                  className="font-medium text-gray-900 hover:text-gray-700 flex items-center gap-1"
                >
                  Last Activity
                  {sortBy === 'created' && (
                    <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
              <th className="text-right py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedRestaurants.map((restaurant) => (
              <tr key={restaurant.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selectedRestaurants.includes(restaurant.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRestaurants([...selectedRestaurants, restaurant.id])
                      } else {
                        setSelectedRestaurants(selectedRestaurants.filter(id => id !== restaurant.id))
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="py-3 px-4">
                  <div>
                    <Link
                      href={`/admin/restaurants/${restaurant.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {restaurant.name}
                    </Link>
                    <p className="text-sm text-gray-500">
                      {restaurant.slug}.kottu.co
                    </p>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <RestaurantStatusBadge status={restaurant.status} />
                </td>
                {!showPerformanceOnly && (
                  <>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium">{restaurant.metrics.ordersThisMonth}</p>
                          <p className="text-xs text-gray-500">
                            {restaurant.metrics.ordersToday} today
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium">
                            ${(restaurant.metrics.revenueThisMonth / 100).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            ${(restaurant.metrics.revenueToday / 100).toLocaleString()} today
                          </p>
                        </div>
                      </div>
                    </td>
                  </>
                )}
                {showPerformanceOnly && (
                  <>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">AOV:</span>
                          <span className="font-medium">
                            ${(restaurant.metrics.averageOrderValue / 100).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Rating:</span>
                          <span className="font-medium">
                            {restaurant.metrics.customerSatisfaction.toFixed(1)}★
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <GrowthIndicator
                          value={restaurant.trends.revenueGrowth}
                          label="Revenue"
                        />
                        <GrowthIndicator
                          value={restaurant.trends.orderGrowth}
                          label="Orders"
                        />
                      </div>
                    </td>
                  </>
                )}
                {(showSuspensionDetails || showIssueDetails) && (
                  <td className="py-3 px-4">
                    {getRestaurantIssues(restaurant).map((issue, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className={cn(
                          'mr-1 mb-1',
                          issue.severity === 'high' && 'border-red-300 text-red-700',
                          issue.severity === 'medium' && 'border-amber-300 text-amber-700',
                          issue.severity === 'low' && 'border-blue-300 text-blue-700'
                        )}
                      >
                        {issue.type}
                      </Badge>
                    ))}
                  </td>
                )}
                <td className="py-3 px-4">
                  <p className="text-sm text-gray-900">
                    {new Date(restaurant.lastActivity).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(restaurant.lastActivity).toLocaleTimeString()}
                  </p>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {showApprovalActions && restaurant.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleRestaurantAction(restaurant.id, { id: restaurant.id, type: 'approve' })}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestaurantAction(restaurant.id, { id: restaurant.id, type: 'reject' })}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/restaurants/${restaurant.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`https://${restaurant.slug}.kottu.co`} target="_blank">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Visit Site
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {restaurant.status === 'active' && (
                          <DropdownMenuItem
                            onClick={() => handleRestaurantAction(restaurant.id, { id: restaurant.id, type: 'suspend' })}
                            className="text-red-600"
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Suspend
                          </DropdownMenuItem>
                        )}
                        {restaurant.status === 'suspended' && (
                          <DropdownMenuItem
                            onClick={() => handleRestaurantAction(restaurant.id, { id: restaurant.id, type: 'reactivate' })}
                            className="text-green-600"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Reactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedRestaurants.length === 0 && (
        <div className="text-center py-8">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No restaurants found</h3>
          <p className="text-gray-500">
            {filter === 'all' 
              ? 'No restaurants have been added to the platform yet.'
              : `No restaurants match the "${filter}" filter.`
            }
          </p>
        </div>
      )}
    </div>
  )
}

// Helper Components

function RestaurantStatusBadge({ status }: { status: string }) {
  const statusConfig = {
    active: { label: 'Active', className: 'bg-green-100 text-green-800' },
    pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800' },
    suspended: { label: 'Suspended', className: 'bg-red-100 text-red-800' },
    inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-800' },
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive

  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  )
}

function GrowthIndicator({ value, label }: { value: number; label: string }) {
  const isPositive = value >= 0
  
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-500">{label}:</span>
      <span className={cn(
        'text-xs font-medium',
        isPositive ? 'text-green-600' : 'text-red-600'
      )}>
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </span>
    </div>
  )
}

// Helper Functions

function hasIssues(restaurant: any): boolean {
  return (
    restaurant.metrics.customerSatisfaction < 4.0 ||
    restaurant.trends.revenueGrowth < -20 ||
    restaurant.metrics.fulfillmentRate < 0.9
  )
}

function getRestaurantIssues(restaurant: any) {
  const issues = []

  if (restaurant.metrics.customerSatisfaction < 4.0) {
    issues.push({ type: 'Low Rating', severity: 'high' })
  }

  if (restaurant.trends.revenueGrowth < -20) {
    issues.push({ type: 'Revenue Decline', severity: 'high' })
  }

  if (restaurant.metrics.fulfillmentRate < 0.9) {
    issues.push({ type: 'Poor Fulfillment', severity: 'medium' })
  }

  if (restaurant.metrics.responseTime > 45) {
    issues.push({ type: 'Slow Response', severity: 'low' })
  }

  return issues
}

// Loading Skeleton
function RestaurantTableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {Array.from({ length: 8 }).map((_, i) => (
                <th key={i} className="text-left py-3 px-4">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="border-b">
                {Array.from({ length: 8 }).map((_, j) => (
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