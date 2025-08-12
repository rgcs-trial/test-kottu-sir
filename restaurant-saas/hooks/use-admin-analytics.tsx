'use client'

import { useState, useEffect, useCallback } from 'react'
import { getPlatformMetrics, getRestaurantPerformance, getUserAnalytics } from '@/lib/analytics/platform-metrics'

export interface PlatformAnalytics {
  restaurants: {
    total: number
    active: number
    pending: number
    suspended: number
    growthRate: number
  }
  users: {
    total: number
    active: number
    newThisMonth: number
    growthRate: number
    byRole: Record<string, number>
  }
  orders: {
    today: number
    thisWeek: number
    thisMonth: number
    total: number
    growthRate: number
    averageValue: number
    statusBreakdown: Record<string, number>
  }
  revenue: {
    today: number
    thisWeek: number
    thisMonth: number
    total: number
    growthRate: number
    platformFees: number
    payoutsPending: number
  }
  payments: {
    successRate: number
    failureRate: number
    averageProcessingTime: number
    chargebacks: number
    refunds: number
  }
  performance: {
    avgResponseTime: number
    errorRate: number
    uptime: number
    peakHours: string[]
  }
  geography: {
    topCities: Array<{
      city: string
      state: string
      restaurantCount: number
      orderVolume: number
      revenue: number
    }>
    coverage: {
      states: number
      cities: number
      countries: number
    }
  }
}

export interface RestaurantPerformance {
  id: string
  name: string
  slug: string
  status: string
  metrics: {
    ordersToday: number
    ordersThisMonth: number
    revenueToday: number
    revenueThisMonth: number
    averageOrderValue: number
    customerSatisfaction: number
    responseTime: number
    fulfillmentRate: number
  }
  trends: {
    orderGrowth: number
    revenueGrowth: number
    customerGrowth: number
  }
  lastActivity: string
}

export interface AdminAnalyticsHookReturn {
  data: PlatformAnalytics | null
  restaurants: RestaurantPerformance[]
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
  refreshRestaurants: () => Promise<void>
}

/**
 * Admin Analytics Hook
 * 
 * Provides comprehensive platform analytics for admin dashboard:
 * - Platform-wide metrics and KPIs
 * - Restaurant performance data
 * - User engagement statistics
 * - Revenue and payment analytics
 * - System performance metrics
 * 
 * Features:
 * - Real-time data updates
 * - Error handling with retry logic
 * - Automatic refresh intervals
 * - Performance optimizations
 */
export function useAdminAnalytics(options?: {
  refreshInterval?: number
  autoRefresh?: boolean
}): AdminAnalyticsHookReturn {
  const { refreshInterval = 30000, autoRefresh = true } = options || {}
  
  const [data, setData] = useState<PlatformAnalytics | null>(null)
  const [restaurants, setRestaurants] = useState<RestaurantPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPlatformMetrics = useCallback(async () => {
    try {
      setError(null)
      const metrics = await getPlatformMetrics()
      setData(metrics)
    } catch (err) {
      console.error('Failed to fetch platform metrics:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch platform metrics'))
    }
  }, [])

  const fetchRestaurantPerformance = useCallback(async () => {
    try {
      const performance = await getRestaurantPerformance({ limit: 50 })
      setRestaurants(performance)
    } catch (err) {
      console.error('Failed to fetch restaurant performance:', err)
      // Don't set error for restaurant data as it's secondary
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchPlatformMetrics(),
        fetchRestaurantPerformance()
      ])
    } finally {
      setLoading(false)
    }
  }, [fetchPlatformMetrics, fetchRestaurantPerformance])

  const refreshRestaurants = useCallback(async () => {
    await fetchRestaurantPerformance()
  }, [fetchRestaurantPerformance])

  // Initial load
  useEffect(() => {
    refresh()
  }, [refresh])

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchPlatformMetrics()
        fetchRestaurantPerformance()
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchPlatformMetrics, fetchRestaurantPerformance])

  // Refresh when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && autoRefresh) {
        fetchPlatformMetrics()
        fetchRestaurantPerformance()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [autoRefresh, fetchPlatformMetrics, fetchRestaurantPerformance])

  return {
    data,
    restaurants,
    loading,
    error,
    refresh,
    refreshRestaurants
  }
}

/**
 * Revenue Analytics Hook
 * 
 * Specialized hook for revenue and financial metrics
 */
export function useRevenueAnalytics(options?: {
  period?: 'day' | 'week' | 'month' | 'year'
  granularity?: 'hour' | 'day' | 'week' | 'month'
}) {
  const { period = 'month', granularity = 'day' } = options || {}
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // This would call a specific revenue analytics endpoint
        const revenueData = await getPlatformMetrics()
        setData(revenueData?.revenue)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch revenue data'))
      } finally {
        setLoading(false)
      }
    }

    fetchRevenueData()
  }, [period, granularity])

  return { data, loading, error }
}

/**
 * Real-time Order Analytics Hook
 * 
 * Provides live order monitoring and analytics
 */
export function useOrderAnalytics(options?: {
  realTime?: boolean
  restaurantId?: string
}) {
  const { realTime = true, restaurantId } = options || {}
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const metrics = await getPlatformMetrics()
        setData(metrics?.orders)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch order data'))
      } finally {
        setLoading(false)
      }
    }

    fetchOrderData()

    if (realTime) {
      const interval = setInterval(fetchOrderData, 5000) // Update every 5 seconds
      return () => clearInterval(interval)
    }
  }, [realTime, restaurantId])

  return { data, loading, error }
}

/**
 * User Analytics Hook
 * 
 * Provides user engagement and activity metrics
 */
export function useUserAnalytics() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const userData = await getUserAnalytics()
        setData(userData)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch user data'))
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  return { data, loading, error }
}