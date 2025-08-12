'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdminAnalytics } from '@/hooks/use-admin-analytics'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RevenueMetric {
  label: string
  value: string
  change: number
  changeType: 'increase' | 'decrease' | 'neutral'
  description: string
}

/**
 * Revenue Dashboard Component
 * 
 * Provides comprehensive revenue tracking and analysis:
 * - Monthly revenue trends
 * - Payment processing metrics
 * - Revenue growth analysis
 * - Platform commission tracking
 */
export function RevenueDashboard() {
  const { data: analytics, loading, error } = useAdminAnalytics()

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">Error loading revenue data</span>
        </div>
      </div>
    )
  }

  const revenueMetrics: RevenueMetric[] = [
    {
      label: 'Monthly Revenue',
      value: analytics?.revenue?.thisMonth ? 
        `$${(analytics.revenue.thisMonth / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 
        '$0.00',
      change: analytics?.revenue?.growthRate || 0,
      changeType: (analytics?.revenue?.growthRate || 0) >= 0 ? 'increase' : 'decrease',
      description: 'Total platform revenue this month'
    },
    {
      label: 'Platform Commission',
      value: analytics?.revenue?.platformCommission ? 
        `$${(analytics.revenue.platformCommission / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 
        '$0.00',
      change: analytics?.revenue?.commissionGrowthRate || 0,
      changeType: (analytics?.revenue?.commissionGrowthRate || 0) >= 0 ? 'increase' : 'decrease',
      description: 'Platform commission earned'
    },
    {
      label: 'Avg Order Value',
      value: analytics?.revenue?.avgOrderValue ? 
        `$${(analytics.revenue.avgOrderValue / 100).toFixed(2)}` : 
        '$0.00',
      change: analytics?.revenue?.aovGrowthRate || 0,
      changeType: (analytics?.revenue?.aovGrowthRate || 0) >= 0 ? 'increase' : 'decrease',
      description: 'Average order value across platform'
    },
    {
      label: 'Processing Fees',
      value: analytics?.revenue?.processingFees ? 
        `$${(analytics.revenue.processingFees / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 
        '$0.00',
      change: analytics?.revenue?.feesGrowthRate || 0,
      changeType: (analytics?.revenue?.feesGrowthRate || 0) >= 0 ? 'increase' : 'decrease',
      description: 'Stripe processing fees'
    }
  ]

  const formatChange = (change: number) => {
    const prefix = change > 0 ? '+' : ''
    return `${prefix}${change.toFixed(1)}%`
  }

  const getChangeIcon = (changeType: 'increase' | 'decrease' | 'neutral') => {
    if (changeType === 'increase') return TrendingUp
    if (changeType === 'decrease') return TrendingDown
    return null
  }

  if (loading) {
    return <RevenueDashboardSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Revenue Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {revenueMetrics.map((metric, index) => {
          const ChangeIcon = getChangeIcon(metric.changeType)
          
          return (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{metric.value}</p>
                  <div className={cn(
                    'flex items-center gap-1 mt-2 text-xs',
                    metric.changeType === 'increase' && 'text-green-600',
                    metric.changeType === 'decrease' && 'text-red-600',
                    metric.changeType === 'neutral' && 'text-gray-600'
                  )}>
                    {ChangeIcon && <ChangeIcon className="h-3 w-3" />}
                    <span>{formatChange(metric.change)} vs last month</span>
                  </div>
                </div>
                <div className="ml-4">
                  <div className={cn(
                    'p-2 rounded-full',
                    metric.changeType === 'increase' && 'bg-green-100 text-green-600',
                    metric.changeType === 'decrease' && 'bg-red-100 text-red-600',
                    metric.changeType === 'neutral' && 'bg-gray-100 text-gray-600'
                  )}>
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Revenue Chart Placeholder */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Total Revenue</span>
            <div className="w-3 h-3 bg-green-500 rounded ml-4"></div>
            <span>Platform Commission</span>
          </div>
        </div>
        
        {/* Simplified chart representation */}
        <div className="h-48 bg-gray-50 rounded border-2 border-dashed border-gray-200 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <TrendingUp className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Revenue chart visualization</p>
            <p className="text-xs">Integration with charting library needed</p>
          </div>
        </div>
      </div>

      {/* Payment Processing Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.payments?.successRate?.toFixed(1) || '0.0'}%
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {analytics?.payments?.totalTransactions || 0} transactions this month
                </p>
              </div>
              <div className={cn(
                'p-3 rounded-full',
                (analytics?.payments?.successRate || 0) > 95 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
              )}>
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Failed Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.payments?.failedAmount ? 
                    `$${(analytics.payments.failedAmount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 
                    '$0.00'
                  }
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {analytics?.payments?.failedCount || 0} failed transactions
                </p>
              </div>
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function RevenueDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Metrics Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded-full ml-4"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="h-48 bg-gray-200 rounded"></div>
      </div>

      {/* Payment Stats Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="h-5 bg-gray-200 rounded w-32"></div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-36"></div>
                </div>
                <div className="w-11 h-11 bg-gray-200 rounded-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}