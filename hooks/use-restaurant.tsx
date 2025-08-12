'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@/lib/supabase/client'
import { 
  Restaurant, 
  OperatingHours, 
  DeliveryZone, 
  DashboardMetrics, 
  RestaurantStats,
  Tables 
} from '@/types'
import {
  getDashboardMetrics,
  getRestaurantStats,
  getOperatingHours,
  getDeliveryZones,
  toggleRestaurantStatus,
  updateOperatingHours,
} from '@/lib/restaurant/actions'

interface UseRestaurantReturn {
  // Restaurant data
  restaurant: Restaurant | null
  operatingHours: OperatingHours[]
  deliveryZones: DeliveryZone[]
  dashboardMetrics: DashboardMetrics | null
  restaurantStats: RestaurantStats | null
  
  // Loading states
  loading: boolean
  metricsLoading: boolean
  statsLoading: boolean
  operatingHoursLoading: boolean
  deliveryZonesLoading: boolean
  
  // Actions
  refreshRestaurant: () => Promise<void>
  refreshMetrics: () => Promise<void>
  refreshStats: () => Promise<void>
  refreshOperatingHours: () => Promise<void>
  refreshDeliveryZones: () => Promise<void>
  toggleOnlineStatus: (isOnline: boolean, reason?: string) => Promise<boolean>
  updateHours: (dayOfWeek: string, isOpen: boolean, openTime?: string, closeTime?: string) => Promise<boolean>
  
  // Real-time subscriptions
  subscribeToOrders: (callback: (order: any) => void) => () => void
  subscribeToRestaurantChanges: (callback: (restaurant: Restaurant) => void) => () => void
}

/**
 * Hook for managing restaurant data and operations
 */
export function useRestaurant(): UseRestaurantReturn {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [operatingHours, setOperatingHours] = useState<OperatingHours[]>([])
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([])
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null)
  const [restaurantStats, setRestaurantStats] = useState<RestaurantStats | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [operatingHoursLoading, setOperatingHoursLoading] = useState(false)
  const [deliveryZonesLoading, setDeliveryZonesLoading] = useState(false)

  const supabase = createClientComponentClient()

  // Refresh restaurant data
  const refreshRestaurant = useCallback(async () => {
    try {
      setLoading(true)
      
      // Get restaurant from context/provider or fetch from server
      // This would typically come from RestaurantProvider context
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get user's restaurant (assuming restaurant owner)
      const { data: userRestaurant, error } = await supabase
        .from(Tables.RESTAURANTS)
        .select('*')
        .eq('ownerId', user.id)
        .single()

      if (error) throw error
      setRestaurant(userRestaurant)
    } catch (error) {
      console.error('Error fetching restaurant:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Refresh dashboard metrics
  const refreshMetrics = useCallback(async () => {
    try {
      setMetricsLoading(true)
      const metrics = await getDashboardMetrics()
      setDashboardMetrics(metrics)
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setMetricsLoading(false)
    }
  }, [])

  // Refresh restaurant stats
  const refreshStats = useCallback(async () => {
    try {
      setStatsLoading(true)
      const stats = await getRestaurantStats()
      setRestaurantStats(stats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  // Refresh operating hours
  const refreshOperatingHours = useCallback(async () => {
    try {
      setOperatingHoursLoading(true)
      const hours = await getOperatingHours()
      setOperatingHours(hours)
    } catch (error) {
      console.error('Error fetching operating hours:', error)
    } finally {
      setOperatingHoursLoading(false)
    }
  }, [])

  // Refresh delivery zones
  const refreshDeliveryZones = useCallback(async () => {
    try {
      setDeliveryZonesLoading(true)
      const zones = await getDeliveryZones()
      setDeliveryZones(zones)
    } catch (error) {
      console.error('Error fetching delivery zones:', error)
    } finally {
      setDeliveryZonesLoading(false)
    }
  }, [])

  // Toggle restaurant online status
  const toggleOnlineStatus = useCallback(async (isOnline: boolean, reason?: string): Promise<boolean> => {
    try {
      const result = await toggleRestaurantStatus(isOnline, reason)
      if (result.success && result.data) {
        setRestaurant(result.data)
        return true
      }
      return false
    } catch (error) {
      console.error('Error toggling status:', error)
      return false
    }
  }, [])

  // Update operating hours
  const updateHours = useCallback(async (
    dayOfWeek: string, 
    isOpen: boolean, 
    openTime?: string, 
    closeTime?: string
  ): Promise<boolean> => {
    try {
      const result = await updateOperatingHours(dayOfWeek, isOpen, openTime, closeTime)
      if (result.success) {
        await refreshOperatingHours()
        return true
      }
      return false
    } catch (error) {
      console.error('Error updating hours:', error)
      return false
    }
  }, [refreshOperatingHours])

  // Subscribe to real-time order updates
  const subscribeToOrders = useCallback((callback: (order: any) => void) => {
    if (!restaurant?.id) return () => {}

    const subscription = supabase
      .channel('orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: Tables.ORDERS,
          filter: `restaurantId=eq.${restaurant.id}`
        },
        (payload) => {
          callback(payload.new)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [restaurant?.id, supabase])

  // Subscribe to restaurant changes
  const subscribeToRestaurantChanges = useCallback((callback: (restaurant: Restaurant) => void) => {
    if (!restaurant?.id) return () => {}

    const subscription = supabase
      .channel('restaurant')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: Tables.RESTAURANTS,
          filter: `id=eq.${restaurant.id}`
        },
        (payload) => {
          const updatedRestaurant = payload.new as Restaurant
          setRestaurant(updatedRestaurant)
          callback(updatedRestaurant)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [restaurant?.id, supabase])

  // Initial data loading
  useEffect(() => {
    refreshRestaurant()
  }, [refreshRestaurant])

  // Load additional data when restaurant is available
  useEffect(() => {
    if (restaurant?.id) {
      refreshMetrics()
      refreshStats()
      refreshOperatingHours()
      refreshDeliveryZones()
    }
  }, [restaurant?.id, refreshMetrics, refreshStats, refreshOperatingHours, refreshDeliveryZones])

  return {
    // Data
    restaurant,
    operatingHours,
    deliveryZones,
    dashboardMetrics,
    restaurantStats,
    
    // Loading states
    loading,
    metricsLoading,
    statsLoading,
    operatingHoursLoading,
    deliveryZonesLoading,
    
    // Actions
    refreshRestaurant,
    refreshMetrics,
    refreshStats,
    refreshOperatingHours,
    refreshDeliveryZones,
    toggleOnlineStatus,
    updateHours,
    
    // Subscriptions
    subscribeToOrders,
    subscribeToRestaurantChanges,
  }
}

// ===== SPECIALIZED HOOKS =====

/**
 * Hook specifically for dashboard metrics with auto-refresh
 */
export function useDashboardMetrics(refreshInterval: number = 300000) { // 5 minutes
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null)
      const data = await getDashboardMetrics()
      setMetrics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
      console.error('Dashboard metrics error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()

    // Auto-refresh metrics
    const interval = setInterval(fetchMetrics, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchMetrics, refreshInterval])

  return {
    metrics,
    loading,
    error,
    refresh: fetchMetrics
  }
}

/**
 * Hook for restaurant statistics with caching
 */
export function useRestaurantStats(cacheTime: number = 600000) { // 10 minutes
  const [stats, setStats] = useState<RestaurantStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastFetch, setLastFetch] = useState<number>(0)

  const fetchStats = useCallback(async (force: boolean = false) => {
    const now = Date.now()
    
    // Use cache if available and not expired
    if (!force && stats && (now - lastFetch) < cacheTime) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await getRestaurantStats()
      setStats(data)
      setLastFetch(now)
    } catch (error) {
      console.error('Restaurant stats error:', error)
    } finally {
      setLoading(false)
    }
  }, [stats, lastFetch, cacheTime])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    loading,
    refresh: () => fetchStats(true),
    lastUpdated: lastFetch
  }
}

/**
 * Hook for managing restaurant online status
 */
export function useRestaurantStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [isAcceptingOrders, setIsAcceptingOrders] = useState<boolean>(true)
  const [temporaryClosureReason, setTemporaryClosureReason] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const toggleStatus = useCallback(async (online: boolean, reason?: string) => {
    setLoading(true)
    try {
      const result = await toggleRestaurantStatus(online, reason)
      if (result.success && result.data) {
        setIsOnline(result.data.isOnline)
        setIsAcceptingOrders(result.data.isAcceptingOrders)
        setTemporaryClosureReason(result.data.temporaryClosureReason || null)
        return true
      }
      return false
    } catch (error) {
      console.error('Toggle status error:', error)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    isOnline,
    isAcceptingOrders,
    temporaryClosureReason,
    loading,
    toggleStatus
  }
}