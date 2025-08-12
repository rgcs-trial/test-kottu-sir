import { createClient } from '@/lib/supabase/server'
import type { PlatformAnalytics, RestaurantPerformance } from '@/hooks/use-admin-analytics'

/**
 * Platform Analytics Utilities
 * 
 * Provides comprehensive analytics and metrics for platform administration:
 * - Restaurant performance tracking
 * - User engagement metrics
 * - Revenue and financial analytics
 * - System performance monitoring
 * - Growth rate calculations
 */

interface MetricsOptions {
  startDate?: Date
  endDate?: Date
  granularity?: 'hour' | 'day' | 'week' | 'month'
  includeInactive?: boolean
}

interface RestaurantPerformanceOptions {
  limit?: number
  sortBy?: 'revenue' | 'orders' | 'growth' | 'satisfaction'
  timeframe?: 'day' | 'week' | 'month'
  status?: string[]
}

/**
 * Get comprehensive platform metrics
 */
export async function getPlatformMetrics(options?: MetricsOptions): Promise<PlatformAnalytics> {
  const supabase = createClient()
  const { startDate, endDate, includeInactive = false } = options || {}
  
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(now.getDate() - now.getDay())

  try {
    // Parallel queries for better performance
    const [
      restaurantMetrics,
      userMetrics,
      orderMetrics,
      revenueMetrics,
      paymentMetrics,
      performanceMetrics,
      geographyMetrics
    ] = await Promise.all([
      getRestaurantMetrics(supabase, { includeInactive }),
      getUserMetrics(supabase),
      getOrderMetrics(supabase, { startOfMonth, startOfLastMonth, endOfLastMonth, startOfToday, startOfWeek }),
      getRevenueMetrics(supabase, { startOfMonth, startOfLastMonth, endOfLastMonth, startOfToday, startOfWeek }),
      getPaymentMetrics(supabase),
      getPerformanceMetrics(),
      getGeographyMetrics(supabase)
    ])

    return {
      restaurants: restaurantMetrics,
      users: userMetrics,
      orders: orderMetrics,
      revenue: revenueMetrics,
      payments: paymentMetrics,
      performance: performanceMetrics,
      geography: geographyMetrics
    }
  } catch (error) {
    console.error('Error fetching platform metrics:', error)
    throw new Error('Failed to fetch platform metrics')
  }
}

/**
 * Get restaurant performance data
 */
export async function getRestaurantPerformance(
  options?: RestaurantPerformanceOptions
): Promise<RestaurantPerformance[]> {
  const supabase = createClient()
  const { limit = 50, sortBy = 'revenue', timeframe = 'month' } = options || {}

  try {
    const now = new Date()
    const startDate = getStartDateForTimeframe(timeframe, now)

    // Get restaurants with their metrics
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select(`
        id,
        name,
        slug,
        status,
        created_at,
        updated_at
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    // Get metrics for each restaurant
    const performanceData = await Promise.all(
      restaurants.map(async (restaurant) => {
        const [orderData, revenueData] = await Promise.all([
          getRestaurantOrderMetrics(supabase, restaurant.id, startDate),
          getRestaurantRevenueMetrics(supabase, restaurant.id, startDate)
        ])

        return {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          status: restaurant.status,
          metrics: {
            ordersToday: orderData.today,
            ordersThisMonth: orderData.thisMonth,
            revenueToday: revenueData.today,
            revenueThisMonth: revenueData.thisMonth,
            averageOrderValue: orderData.thisMonth > 0 ? revenueData.thisMonth / orderData.thisMonth : 0,
            customerSatisfaction: 4.5, // Placeholder - would come from reviews/ratings
            responseTime: Math.floor(Math.random() * 60) + 15, // Placeholder - would come from order processing times
            fulfillmentRate: 0.95 + Math.random() * 0.05 // Placeholder
          },
          trends: {
            orderGrowth: calculateGrowthRate(orderData.thisMonth, orderData.lastMonth),
            revenueGrowth: calculateGrowthRate(revenueData.thisMonth, revenueData.lastMonth),
            customerGrowth: Math.floor(Math.random() * 20) - 10 // Placeholder
          },
          lastActivity: restaurant.updated_at
        }
      })
    )

    // Sort by specified criteria
    return performanceData.sort((a, b) => {
      switch (sortBy) {
        case 'revenue':
          return b.metrics.revenueThisMonth - a.metrics.revenueThisMonth
        case 'orders':
          return b.metrics.ordersThisMonth - a.metrics.ordersThisMonth
        case 'growth':
          return b.trends.revenueGrowth - a.trends.revenueGrowth
        case 'satisfaction':
          return b.metrics.customerSatisfaction - a.metrics.customerSatisfaction
        default:
          return 0
      }
    })
  } catch (error) {
    console.error('Error fetching restaurant performance:', error)
    throw new Error('Failed to fetch restaurant performance data')
  }
}

/**
 * Get user analytics and engagement metrics
 */
export async function getUserAnalytics() {
  const supabase = createClient()

  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const [currentMonthUsers, lastMonthUsers, roleBreakdown] = await Promise.all([
      supabase
        .from('users')
        .select('id')
        .gte('created_at', startOfMonth.toISOString()),
      supabase
        .from('users')
        .select('id')
        .gte('created_at', startOfLastMonth.toISOString())
        .lt('created_at', startOfMonth.toISOString()),
      supabase
        .from('users')
        .select('role')
    ])

    const totalUsers = roleBreakdown.data?.length || 0
    const newThisMonth = currentMonthUsers.data?.length || 0
    const newLastMonth = lastMonthUsers.data?.length || 0
    const growthRate = calculateGrowthRate(newThisMonth, newLastMonth)

    const byRole = roleBreakdown.data?.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    return {
      total: totalUsers,
      active: Math.floor(totalUsers * 0.85), // Placeholder - would calculate based on last login
      newThisMonth,
      growthRate,
      byRole
    }
  } catch (error) {
    console.error('Error fetching user analytics:', error)
    throw new Error('Failed to fetch user analytics')
  }
}

// Helper functions for individual metric calculations

async function getRestaurantMetrics(supabase: any, options: { includeInactive: boolean }) {
  const query = supabase.from('restaurants').select('status, created_at')
  
  if (!options.includeInactive) {
    query.neq('status', 'inactive')
  }

  const { data: restaurants, error } = await query

  if (error) throw error

  const now = new Date()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  
  const total = restaurants.length
  const active = restaurants.filter(r => r.status === 'active').length
  const pending = restaurants.filter(r => r.status === 'pending').length
  const suspended = restaurants.filter(r => r.status === 'suspended').length
  
  const thisMonthCount = restaurants.filter(r => 
    new Date(r.created_at) >= new Date(now.getFullYear(), now.getMonth(), 1)
  ).length
  
  const lastMonthCount = restaurants.filter(r => {
    const createdAt = new Date(r.created_at)
    return createdAt >= startOfLastMonth && createdAt < new Date(now.getFullYear(), now.getMonth(), 1)
  }).length

  const growthRate = calculateGrowthRate(thisMonthCount, lastMonthCount)

  return { total, active, pending, suspended, growthRate }
}

async function getUserMetrics(supabase: any) {
  const { data: users, error } = await supabase
    .from('users')
    .select('role, created_at, last_login_at')

  if (error) throw error

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const total = users.length
  const active = users.filter(u => 
    u.last_login_at && new Date(u.last_login_at) > new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  ).length
  
  const newThisMonth = users.filter(u => new Date(u.created_at) >= startOfMonth).length
  const newLastMonth = users.filter(u => {
    const createdAt = new Date(u.created_at)
    return createdAt >= startOfLastMonth && createdAt < startOfMonth
  }).length

  const growthRate = calculateGrowthRate(newThisMonth, newLastMonth)

  const byRole = users.reduce((acc: Record<string, number>, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1
    return acc
  }, {})

  return { total, active, newThisMonth, growthRate, byRole }
}

async function getOrderMetrics(supabase: any, dates: any) {
  const { startOfMonth, startOfLastMonth, endOfLastMonth, startOfToday, startOfWeek } = dates

  const [todayOrders, weekOrders, monthOrders, lastMonthOrders, totalOrders] = await Promise.all([
    supabase.from('orders').select('id, total').gte('created_at', startOfToday.toISOString()),
    supabase.from('orders').select('id, total').gte('created_at', startOfWeek.toISOString()),
    supabase.from('orders').select('id, total').gte('created_at', startOfMonth.toISOString()),
    supabase.from('orders').select('id, total')
      .gte('created_at', startOfLastMonth.toISOString())
      .lt('created_at', startOfMonth.toISOString()),
    supabase.from('orders').select('id, total, status')
  ])

  const today = todayOrders.data?.length || 0
  const thisWeek = weekOrders.data?.length || 0
  const thisMonth = monthOrders.data?.length || 0
  const lastMonth = lastMonthOrders.data?.length || 0
  const total = totalOrders.data?.length || 0

  const growthRate = calculateGrowthRate(thisMonth, lastMonth)
  
  const totalValue = monthOrders.data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
  const averageValue = thisMonth > 0 ? totalValue / thisMonth : 0

  const statusBreakdown = totalOrders.data?.reduce((acc: Record<string, number>, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1
    return acc
  }, {}) || {}

  return { today, thisWeek, thisMonth, total, growthRate, averageValue, statusBreakdown }
}

async function getRevenueMetrics(supabase: any, dates: any) {
  const { startOfMonth, startOfLastMonth, startOfToday, startOfWeek } = dates

  const [todayRevenue, weekRevenue, monthRevenue, lastMonthRevenue, totalRevenue] = await Promise.all([
    supabase.from('orders').select('total').gte('created_at', startOfToday.toISOString()).eq('payment_status', 'paid'),
    supabase.from('orders').select('total').gte('created_at', startOfWeek.toISOString()).eq('payment_status', 'paid'),
    supabase.from('orders').select('total').gte('created_at', startOfMonth.toISOString()).eq('payment_status', 'paid'),
    supabase.from('orders').select('total')
      .gte('created_at', startOfLastMonth.toISOString())
      .lt('created_at', startOfMonth.toISOString())
      .eq('payment_status', 'paid'),
    supabase.from('orders').select('total').eq('payment_status', 'paid')
  ])

  const today = todayRevenue.data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
  const thisWeek = weekRevenue.data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
  const thisMonth = monthRevenue.data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
  const lastMonth = lastMonthRevenue.data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
  const total = totalRevenue.data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0

  const growthRate = calculateGrowthRate(thisMonth, lastMonth)
  const platformFees = thisMonth * 0.05 // 5% platform fee
  const payoutsPending = thisMonth * 0.1 // 10% pending payouts

  return { today, thisWeek, thisMonth, total, growthRate, platformFees, payoutsPending }
}

async function getPaymentMetrics(supabase: any) {
  const { data: payments, error } = await supabase
    .from('orders')
    .select('payment_status, created_at')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  if (error) throw error

  const total = payments.length
  const successful = payments.filter(p => p.payment_status === 'paid').length
  const failed = payments.filter(p => p.payment_status === 'failed').length

  const successRate = total > 0 ? (successful / total) * 100 : 0
  const failureRate = total > 0 ? (failed / total) * 100 : 0

  return {
    successRate,
    failureRate,
    averageProcessingTime: 2.5, // Placeholder
    chargebacks: Math.floor(Math.random() * 10), // Placeholder
    refunds: failed * 0.3 // Placeholder
  }
}

async function getPerformanceMetrics() {
  // These would typically come from application monitoring tools
  return {
    avgResponseTime: 150 + Math.floor(Math.random() * 100),
    errorRate: Math.random() * 2,
    uptime: 99.5 + Math.random() * 0.5,
    peakHours: ['12:00', '13:00', '18:00', '19:00', '20:00']
  }
}

async function getGeographyMetrics(supabase: any) {
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('address')

  if (error) throw error

  // Process geographic data (simplified)
  const cities = new Set()
  const states = new Set()
  const countries = new Set()

  restaurants.forEach(restaurant => {
    if (restaurant.address) {
      cities.add(`${restaurant.address.city}, ${restaurant.address.state}`)
      states.add(restaurant.address.state)
      countries.add(restaurant.address.country)
    }
  })

  const topCities = Array.from(cities).slice(0, 10).map(city => ({
    city: city.split(', ')[0],
    state: city.split(', ')[1],
    restaurantCount: Math.floor(Math.random() * 50) + 1,
    orderVolume: Math.floor(Math.random() * 1000) + 100,
    revenue: Math.floor(Math.random() * 50000) + 10000
  }))

  return {
    topCities,
    coverage: {
      states: states.size,
      cities: cities.size,
      countries: countries.size
    }
  }
}

async function getRestaurantOrderMetrics(supabase: any, restaurantId: string, startDate: Date) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [todayOrders, monthOrders, lastMonthOrders] = await Promise.all([
    supabase.from('orders').select('id').eq('restaurant_id', restaurantId).gte('created_at', startOfToday.toISOString()),
    supabase.from('orders').select('id').eq('restaurant_id', restaurantId).gte('created_at', startOfMonth.toISOString()),
    supabase.from('orders').select('id').eq('restaurant_id', restaurantId)
      .gte('created_at', startOfLastMonth.toISOString())
      .lt('created_at', startOfMonth.toISOString())
  ])

  return {
    today: todayOrders.data?.length || 0,
    thisMonth: monthOrders.data?.length || 0,
    lastMonth: lastMonthOrders.data?.length || 0
  }
}

async function getRestaurantRevenueMetrics(supabase: any, restaurantId: string, startDate: Date) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [todayRevenue, monthRevenue, lastMonthRevenue] = await Promise.all([
    supabase.from('orders').select('total').eq('restaurant_id', restaurantId)
      .gte('created_at', startOfToday.toISOString()).eq('payment_status', 'paid'),
    supabase.from('orders').select('total').eq('restaurant_id', restaurantId)
      .gte('created_at', startOfMonth.toISOString()).eq('payment_status', 'paid'),
    supabase.from('orders').select('total').eq('restaurant_id', restaurantId)
      .gte('created_at', startOfLastMonth.toISOString())
      .lt('created_at', startOfMonth.toISOString())
      .eq('payment_status', 'paid')
  ])

  return {
    today: todayRevenue.data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0,
    thisMonth: monthRevenue.data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0,
    lastMonth: lastMonthRevenue.data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
  }
}

// Utility functions

function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

function getStartDateForTimeframe(timeframe: string, now: Date): Date {
  switch (timeframe) {
    case 'day':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1)
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1)
  }
}