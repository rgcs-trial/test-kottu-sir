'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useAdminAnalytics } from '@/hooks/use-admin-analytics'
import { 
  Building2, 
  Users, 
  ShoppingCart, 
  DollarSign,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  changeType?: 'increase' | 'decrease' | 'neutral'
  icon: React.ComponentType<{ className?: string }>
  color: string
  loading?: boolean
}

function StatCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon: Icon, 
  color,
  loading = false 
}: StatCardProps) {
  const formatChange = (change: number) => {
    const prefix = change > 0 ? '+' : ''
    return `${prefix}${change.toFixed(1)}%`
  }

  const getChangeIcon = () => {
    if (changeType === 'increase') return TrendingUp
    if (changeType === 'decrease') return TrendingDown
    return null
  }

  const ChangeIcon = getChangeIcon()

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {loading ? (
                <span className="inline-block w-16 h-8 bg-gray-200 rounded animate-pulse"></span>
              ) : (
                typeof value === 'number' ? value.toLocaleString() : value
              )}
            </p>
            {change !== undefined && !loading && (
              <div className={cn(
                'flex items-center gap-1 mt-2 text-xs',
                changeType === 'increase' && 'text-green-600',
                changeType === 'decrease' && 'text-red-600',
                changeType === 'neutral' && 'text-gray-600'
              )}>
                {ChangeIcon && <ChangeIcon className="h-3 w-3" />}
                <span>{formatChange(change)} from last month</span>
              </div>
            )}
          </div>
          <div className={cn(
            'p-3 rounded-full',
            color
          )}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Platform Statistics Component
 * 
 * Displays key performance indicators for the entire platform:
 * - Total restaurants (active)
 * - Total users across all restaurants
 * - Platform-wide order volume
 * - Total platform revenue
 */
export function PlatformStats() {
  const { data: analytics, loading, error } = useAdminAnalytics()

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-800">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm">Error loading platform statistics</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const stats = [
    {
      title: 'Active Restaurants',
      value: analytics?.restaurants?.active || 0,
      change: analytics?.restaurants?.growthRate || 0,
      changeType: (analytics?.restaurants?.growthRate || 0) >= 0 ? 'increase' : 'decrease' as const,
      icon: Building2,
      color: 'bg-blue-500'
    },
    {
      title: 'Platform Users',
      value: analytics?.users?.total || 0,
      change: analytics?.users?.growthRate || 0,
      changeType: (analytics?.users?.growthRate || 0) >= 0 ? 'increase' : 'decrease' as const,
      icon: Users,
      color: 'bg-green-500'
    },
    {
      title: 'Monthly Orders',
      value: analytics?.orders?.thisMonth || 0,
      change: analytics?.orders?.growthRate || 0,
      changeType: (analytics?.orders?.growthRate || 0) >= 0 ? 'increase' : 'decrease' as const,
      icon: ShoppingCart,
      color: 'bg-purple-500'
    },
    {
      title: 'Monthly Revenue',
      value: analytics?.revenue?.thisMonth ? 
        `$${(analytics.revenue.thisMonth / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 
        '$0.00',
      change: analytics?.revenue?.growthRate || 0,
      changeType: (analytics?.revenue?.growthRate || 0) >= 0 ? 'increase' : 'decrease' as const,
      icon: DollarSign,
      color: 'bg-emerald-500'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          {...stat}
          loading={loading}
        />
      ))}
    </div>
  )
}

/**
 * Platform Health Indicators
 * 
 * Shows system health metrics and alerts
 */
export function PlatformHealth() {
  const { data: analytics, loading } = useAdminAnalytics()

  const healthMetrics = [
    {
      label: 'System Uptime',
      value: '99.9%',
      status: 'healthy' as const,
      description: 'Last 30 days'
    },
    {
      label: 'Payment Success Rate',
      value: `${analytics?.payments?.successRate || 0}%`,
      status: (analytics?.payments?.successRate || 0) > 95 ? 'healthy' : 'warning' as const,
      description: 'Last 7 days'
    },
    {
      label: 'Avg Response Time',
      value: `${analytics?.performance?.avgResponseTime || 0}ms`,
      status: (analytics?.performance?.avgResponseTime || 0) < 200 ? 'healthy' : 'warning' as const,
      description: 'API endpoints'
    },
    {
      label: 'Error Rate',
      value: `${analytics?.performance?.errorRate || 0}%`,
      status: (analytics?.performance?.errorRate || 0) < 1 ? 'healthy' : 'critical' as const,
      description: 'Last 24 hours'
    }
  ]

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Platform Health</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {healthMetrics.map((metric, index) => (
            <div key={index} className="text-center">
              <div className={cn(
                'inline-flex items-center justify-center w-12 h-12 rounded-full mb-2',
                metric.status === 'healthy' && 'bg-green-100 text-green-600',
                metric.status === 'warning' && 'bg-amber-100 text-amber-600',
                metric.status === 'critical' && 'bg-red-100 text-red-600'
              )}>
                <div className={cn(
                  'w-3 h-3 rounded-full',
                  metric.status === 'healthy' && 'bg-green-500',
                  metric.status === 'warning' && 'bg-amber-500',
                  metric.status === 'critical' && 'bg-red-500'
                )}></div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">{metric.label}</p>
                <p className="text-lg font-bold text-gray-900">
                  {loading ? (
                    <span className="inline-block w-12 h-6 bg-gray-200 rounded animate-pulse"></span>
                  ) : (
                    metric.value
                  )}
                </p>
                <p className="text-xs text-gray-500">{metric.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}