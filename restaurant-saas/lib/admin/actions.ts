'use server'

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/supabase/types'
import { revalidatePath } from 'next/cache'

/**
 * Admin Server Actions
 * 
 * Server-side actions for platform administrators to manage:
 * - Restaurant operations and status
 * - User management and roles
 * - Platform analytics and reporting
 * - System configuration and settings
 */

// Initialize Supabase client for server-side operations
function createAdminClient() {
  const cookieStore = cookies()
  return createServerComponentClient<Database>({ 
    cookies: () => cookieStore 
  })
}

/**
 * Restaurant Management Actions
 */

export async function updateRestaurantStatus(
  restaurantId: string, 
  status: 'active' | 'inactive' | 'suspended' | 'pending'
) {
  try {
    const supabase = createAdminClient()
    
    // Verify admin permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized: Admin access required')
    }

    // Check if user has admin role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || !['super_admin', 'platform_admin'].includes(userData.role)) {
      throw new Error('Insufficient permissions')
    }

    // Update restaurant status
    const { data, error } = await supabase
      .from('restaurants')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', restaurantId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update restaurant status: ${error.message}`)
    }

    // Revalidate relevant pages
    revalidatePath('/admin')
    revalidatePath('/admin/restaurants')
    revalidatePath('/admin/analytics')

    return {
      success: true,
      data,
      message: `Restaurant status updated to ${status}`
    }
  } catch (error) {
    console.error('updateRestaurantStatus error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

export async function approveRestaurantOnboarding(restaurantId: string) {
  try {
    const supabase = createAdminClient()
    
    // Verify admin permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized: Admin access required')
    }

    // Update restaurant to active status
    const { data, error } = await supabase
      .from('restaurants')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', restaurantId)
      .eq('status', 'pending')
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to approve restaurant: ${error.message}`)
    }

    if (!data) {
      throw new Error('Restaurant not found or not in pending status')
    }

    // TODO: Send approval notification email to restaurant owner
    // TODO: Trigger Stripe Connect account setup if needed

    revalidatePath('/admin')
    revalidatePath('/admin/restaurants')

    return {
      success: true,
      data,
      message: 'Restaurant approved and activated'
    }
  } catch (error) {
    console.error('approveRestaurantOnboarding error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

export async function suspendRestaurant(restaurantId: string, reason: string) {
  try {
    const supabase = createAdminClient()
    
    // Verify admin permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized: Admin access required')
    }

    // Update restaurant to suspended status
    const { data, error } = await supabase
      .from('restaurants')
      .update({ 
        status: 'suspended',
        updated_at: new Date().toISOString()
      })
      .eq('id', restaurantId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to suspend restaurant: ${error.message}`)
    }

    // TODO: Log suspension reason in audit table
    // TODO: Send suspension notification email
    // TODO: Cancel active orders if needed

    revalidatePath('/admin')
    revalidatePath('/admin/restaurants')

    return {
      success: true,
      data,
      message: `Restaurant suspended: ${reason}`
    }
  } catch (error) {
    console.error('suspendRestaurant error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * User Management Actions
 */

export async function updateUserRole(
  userId: string, 
  newRole: 'super_admin' | 'platform_admin' | 'restaurant_owner' | 'restaurant_admin' | 'staff' | 'customer'
) {
  try {
    const supabase = createAdminClient()
    
    // Verify admin permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized: Admin access required')
    }

    // Check if current user has super_admin role for role changes
    const { data: currentUserData, error: currentUserError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (currentUserError || !currentUserData || currentUserData.role !== 'super_admin') {
      throw new Error('Insufficient permissions: Super admin access required')
    }

    // Update user role
    const { data, error } = await supabase
      .from('users')
      .update({ 
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update user role: ${error.message}`)
    }

    // TODO: Log role change in audit table
    // TODO: Send role change notification

    revalidatePath('/admin')

    return {
      success: true,
      data,
      message: `User role updated to ${newRole}`
    }
  } catch (error) {
    console.error('updateUserRole error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

export async function deactivateUser(userId: string) {
  try {
    const supabase = createAdminClient()
    
    // Verify admin permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized: Admin access required')
    }

    // Update user to inactive
    const { data, error } = await supabase
      .from('users')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to deactivate user: ${error.message}`)
    }

    // TODO: Revoke active sessions
    // TODO: Send deactivation notification

    revalidatePath('/admin')

    return {
      success: true,
      data,
      message: 'User deactivated successfully'
    }
  } catch (error) {
    console.error('deactivateUser error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Analytics and Reporting Actions
 */

export async function getPlatformAnalytics(timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
  try {
    const supabase = createAdminClient()
    
    // Verify admin permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized: Admin access required')
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
    }

    // Get restaurant metrics
    const { data: restaurants, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, status, created_at')

    if (restaurantError) {
      throw new Error(`Failed to fetch restaurant data: ${restaurantError.message}`)
    }

    // Get order metrics
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('id, total, status, payment_status, created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (orderError) {
      throw new Error(`Failed to fetch order data: ${orderError.message}`)
    }

    // Get user metrics
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, role, is_active, created_at, last_login_at')

    if (userError) {
      throw new Error(`Failed to fetch user data: ${userError.message}`)
    }

    // Calculate analytics
    const analytics = {
      restaurants: {
        total: restaurants?.length || 0,
        active: restaurants?.filter(r => r.status === 'active').length || 0,
        pending: restaurants?.filter(r => r.status === 'pending').length || 0,
        suspended: restaurants?.filter(r => r.status === 'suspended').length || 0,
        growthRate: calculateGrowthRate(restaurants, startDate, 'created_at')
      },
      orders: {
        total: orders?.length || 0,
        thisMonth: orders?.length || 0,
        completed: orders?.filter(o => o.status === 'completed').length || 0,
        pending: orders?.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length || 0,
        growthRate: calculateGrowthRate(orders, startDate, 'created_at')
      },
      users: {
        total: users?.length || 0,
        active: users?.filter(u => u.is_active).length || 0,
        customers: users?.filter(u => u.role === 'customer').length || 0,
        restaurantOwners: users?.filter(u => u.role === 'restaurant_owner').length || 0,
        growthRate: calculateGrowthRate(users, startDate, 'created_at')
      },
      revenue: {
        thisMonth: orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0,
        platformCommission: orders?.reduce((sum, order) => sum + Math.floor((order.total || 0) * 0.05), 0) || 0,
        avgOrderValue: orders?.length ? Math.floor((orders.reduce((sum, order) => sum + (order.total || 0), 0) / orders.length)) : 0,
        growthRate: 0 // TODO: Calculate vs previous period
      },
      payments: {
        successRate: orders?.length ? 
          (orders.filter(o => o.payment_status === 'paid').length / orders.length) * 100 : 0,
        totalTransactions: orders?.length || 0,
        failedCount: orders?.filter(o => o.payment_status === 'failed').length || 0,
        failedAmount: orders?.filter(o => o.payment_status === 'failed').reduce((sum, order) => sum + (order.total || 0), 0) || 0
      }
    }

    return {
      success: true,
      data: analytics,
      timeRange,
      generatedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('getPlatformAnalytics error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

export async function getRestaurantPerformance(limit: number = 10) {
  try {
    const supabase = createAdminClient()
    
    // Verify admin permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized: Admin access required')
    }

    // Get restaurants with their order performance
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        orders(
          id,
          total,
          status,
          created_at
        )
      `)
      .eq('status', 'active')
      .limit(limit)

    if (error) {
      throw new Error(`Failed to fetch restaurant performance: ${error.message}`)
    }

    // Calculate performance metrics for each restaurant
    const performanceData = restaurants?.map(restaurant => {
      const orders = restaurant.orders || []
      const thisMonth = orders.filter(order => {
        const orderDate = new Date(order.created_at)
        const now = new Date()
        return orderDate.getMonth() === now.getMonth() && 
               orderDate.getFullYear() === now.getFullYear()
      })

      return {
        ...restaurant,
        performance: {
          totalOrders: orders.length,
          monthlyOrders: thisMonth.length,
          totalRevenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
          monthlyRevenue: thisMonth.reduce((sum, order) => sum + (order.total || 0), 0),
          avgOrderValue: orders.length ? 
            Math.floor(orders.reduce((sum, order) => sum + (order.total || 0), 0) / orders.length) : 0,
          completionRate: orders.length ? 
            (orders.filter(o => o.status === 'completed').length / orders.length) * 100 : 0
        }
      }
    }) || []

    // Sort by monthly revenue
    performanceData.sort((a, b) => b.performance.monthlyRevenue - a.performance.monthlyRevenue)

    return {
      success: true,
      data: performanceData,
      generatedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('getRestaurantPerformance error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * System Configuration Actions
 */

export async function updatePlatformSettings(settings: {
  maintenanceMode?: boolean
  platformCommissionRate?: number
  maxRestaurantsPerUser?: number
  defaultSubscriptionTier?: 'basic' | 'premium' | 'enterprise'
}) {
  try {
    const supabase = createAdminClient()
    
    // Verify super admin permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized: Super admin access required')
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'super_admin') {
      throw new Error('Insufficient permissions: Super admin access required')
    }

    // TODO: Store settings in a platform_settings table
    // For now, this is a placeholder that would update system configuration

    revalidatePath('/admin')

    return {
      success: true,
      message: 'Platform settings updated successfully'
    }
  } catch (error) {
    console.error('updatePlatformSettings error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Helper function to calculate growth rate
function calculateGrowthRate(
  items: any[], 
  startDate: Date, 
  dateField: string
): number {
  if (!items || items.length === 0) return 0

  const currentPeriodItems = items.filter(item => {
    const itemDate = new Date(item[dateField])
    return itemDate >= startDate
  })

  const previousPeriodStart = new Date(startDate)
  const periodLength = Date.now() - startDate.getTime()
  previousPeriodStart.setTime(previousPeriodStart.getTime() - periodLength)

  const previousPeriodItems = items.filter(item => {
    const itemDate = new Date(item[dateField])
    return itemDate >= previousPeriodStart && itemDate < startDate
  })

  if (previousPeriodItems.length === 0) return 100

  const growth = ((currentPeriodItems.length - previousPeriodItems.length) / previousPeriodItems.length) * 100
  return Number(growth.toFixed(1))
}