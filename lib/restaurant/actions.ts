'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { 
  Restaurant, 
  RestaurantSettingsForm, 
  OperatingHours, 
  DeliveryZone, 
  DashboardMetrics,
  RestaurantStats,
  Tables 
} from '@/types'

// ===== RESTAURANT MANAGEMENT =====

/**
 * Update restaurant settings
 */
export async function updateRestaurantSettings(formData: RestaurantSettingsForm) {
  const supabase = createClient()
  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    throw new Error('Restaurant not found')
  }

  try {
    // Update restaurant record
    const { data: restaurant, error } = await supabase
      .from(Tables.RESTAURANTS)
      .update({
        name: formData.name,
        description: formData.description,
        email: formData.email,
        phone: formData.phone,
        website: formData.website || null,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
        },
        timezone: formData.timezone,
        currency: formData.currency,
        taxRate: formData.taxRate,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', tenantId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/dashboard/restaurant')
    return { success: true, data: restaurant }
  } catch (error) {
    console.error('Update restaurant error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update restaurant'
    }
  }
}

/**
 * Toggle restaurant online status
 */
export async function toggleRestaurantStatus(isOnline: boolean, reason?: string) {
  const supabase = createClient()
  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    throw new Error('Restaurant not found')
  }

  try {
    const { data, error } = await supabase
      .from(Tables.RESTAURANTS)
      .update({
        isOnline,
        isAcceptingOrders: isOnline,
        temporaryClosureReason: isOnline ? null : reason,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', tenantId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/dashboard')
    return { success: true, data }
  } catch (error) {
    console.error('Toggle restaurant status error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update status'
    }
  }
}

// ===== OPERATING HOURS =====

/**
 * Get restaurant operating hours
 */
export async function getOperatingHours(): Promise<OperatingHours[]> {
  const supabase = createClient()
  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    throw new Error('Restaurant not found')
  }

  const { data, error } = await supabase
    .from(Tables.OPERATING_HOURS)
    .select('*')
    .eq('restaurantId', tenantId)
    .order('dayOfWeek')

  if (error) throw error
  return data || []
}

/**
 * Update operating hours for a specific day
 */
export async function updateOperatingHours(
  dayOfWeek: string,
  isOpen: boolean,
  openTime?: string,
  closeTime?: string
) {
  const supabase = createClient()
  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    throw new Error('Restaurant not found')
  }

  try {
    // Check if record exists
    const { data: existing } = await supabase
      .from(Tables.OPERATING_HOURS)
      .select('id')
      .eq('restaurantId', tenantId)
      .eq('dayOfWeek', dayOfWeek)
      .single()

    const updateData = {
      restaurantId: tenantId,
      dayOfWeek,
      isOpen,
      openTime: isOpen ? openTime : null,
      closeTime: isOpen ? closeTime : null,
      isOvernight: isOpen && openTime && closeTime ? openTime > closeTime : false,
      updatedAt: new Date().toISOString(),
    }

    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from(Tables.OPERATING_HOURS)
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } else {
      // Create new record
      const { data, error } = await supabase
        .from(Tables.OPERATING_HOURS)
        .insert({
          ...updateData,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    }
  } catch (error) {
    console.error('Update operating hours error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update hours'
    }
  }
}

// ===== DELIVERY ZONES =====

/**
 * Get restaurant delivery zones
 */
export async function getDeliveryZones(): Promise<DeliveryZone[]> {
  const supabase = createClient()
  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    throw new Error('Restaurant not found')
  }

  const { data, error } = await supabase
    .from(Tables.DELIVERY_ZONES)
    .select('*')
    .eq('restaurantId', tenantId)
    .order('name')

  if (error) throw error
  return data || []
}

/**
 * Create delivery zone
 */
export async function createDeliveryZone(zoneData: Omit<DeliveryZone, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt'>) {
  const supabase = createClient()
  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    throw new Error('Restaurant not found')
  }

  try {
    const { data, error } = await supabase
      .from(Tables.DELIVERY_ZONES)
      .insert({
        ...zoneData,
        id: crypto.randomUUID(),
        restaurantId: tenantId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/dashboard/restaurant')
    return { success: true, data }
  } catch (error) {
    console.error('Create delivery zone error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create zone'
    }
  }
}

/**
 * Update delivery zone
 */
export async function updateDeliveryZone(zoneId: string, zoneData: Partial<DeliveryZone>) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from(Tables.DELIVERY_ZONES)
      .update({
        ...zoneData,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', zoneId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/dashboard/restaurant')
    return { success: true, data }
  } catch (error) {
    console.error('Update delivery zone error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update zone'
    }
  }
}

/**
 * Delete delivery zone
 */
export async function deleteDeliveryZone(zoneId: string) {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from(Tables.DELIVERY_ZONES)
      .delete()
      .eq('id', zoneId)

    if (error) throw error

    revalidatePath('/dashboard/restaurant')
    return { success: true }
  } catch (error) {
    console.error('Delete delivery zone error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete zone'
    }
  }
}

// ===== ANALYTICS & DASHBOARD =====

/**
 * Get restaurant dashboard metrics
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = createClient()
  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    throw new Error('Restaurant not found')
  }

  try {
    // Get today's date range
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
    
    // Get yesterday's date range
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)
    const yesterdayEnd = todayStart
    
    // Get this month's date range
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    
    // Get last month's date range
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastMonthEnd = thisMonthStart

    // Fetch orders for calculations
    const { data: orders, error } = await supabase
      .from(Tables.ORDERS)
      .select('total, createdAt, customerId')
      .eq('restaurantId', tenantId)
      .in('status', ['completed', 'delivered'])
      .gte('createdAt', lastMonthStart.toISOString())

    if (error) throw error

    // Calculate metrics
    const todayOrders = orders?.filter(order => 
      new Date(order.createdAt) >= todayStart && new Date(order.createdAt) < todayEnd
    ) || []
    
    const yesterdayOrders = orders?.filter(order => 
      new Date(order.createdAt) >= yesterdayStart && new Date(order.createdAt) < yesterdayEnd
    ) || []
    
    const thisMonthOrders = orders?.filter(order => 
      new Date(order.createdAt) >= thisMonthStart && new Date(order.createdAt) < nextMonthStart
    ) || []
    
    const lastMonthOrders = orders?.filter(order => 
      new Date(order.createdAt) >= lastMonthStart && new Date(order.createdAt) < lastMonthEnd
    ) || []

    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0)
    const yesterdayRevenue = yesterdayOrders.reduce((sum, order) => sum + order.total, 0)
    const thisMonthRevenue = thisMonthOrders.reduce((sum, order) => sum + order.total, 0)
    const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + order.total, 0)

    // Calculate growth rates
    const dailyGrowth = yesterdayRevenue > 0 
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
      : 0
    const monthlyGrowth = lastMonthRevenue > 0 
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0

    // Get unique customers
    const allCustomers = new Set(orders?.map(order => order.customerId).filter(Boolean))
    const newCustomers = new Set()
    const returningCustomers = new Set()

    // Simple logic: if customer has more than one order, they're returning
    const customerOrderCounts = orders?.reduce((acc, order) => {
      if (order.customerId) {
        acc[order.customerId] = (acc[order.customerId] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>) || {}

    Object.entries(customerOrderCounts).forEach(([customerId, count]) => {
      if (count === 1) {
        newCustomers.add(customerId)
      } else {
        returningCustomers.add(customerId)
      }
    })

    // Calculate average order value
    const currentAvg = thisMonthOrders.length > 0 
      ? thisMonthRevenue / thisMonthOrders.length 
      : 0
    const previousAvg = lastMonthOrders.length > 0 
      ? lastMonthRevenue / lastMonthOrders.length 
      : 0
    const avgGrowth = previousAvg > 0 
      ? ((currentAvg - previousAvg) / previousAvg) * 100 
      : 0

    return {
      revenue: {
        today: todayRevenue,
        yesterday: yesterdayRevenue,
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        thisYear: thisMonthRevenue, // Simplified for now
        growth: {
          daily: dailyGrowth,
          monthly: monthlyGrowth,
          yearly: monthlyGrowth, // Simplified for now
        }
      },
      orders: {
        today: todayOrders.length,
        yesterday: yesterdayOrders.length,
        thisMonth: thisMonthOrders.length,
        lastMonth: lastMonthOrders.length,
        growth: {
          daily: yesterdayOrders.length > 0 
            ? ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length) * 100 
            : 0,
          monthly: lastMonthOrders.length > 0 
            ? ((thisMonthOrders.length - lastMonthOrders.length) / lastMonthOrders.length) * 100 
            : 0,
        }
      },
      customers: {
        total: allCustomers.size,
        new: newCustomers.size,
        returning: returningCustomers.size,
        growth: 0, // Can be implemented with historical data
      },
      avgOrderValue: {
        current: currentAvg,
        previous: previousAvg,
        growth: avgGrowth,
      }
    }
  } catch (error) {
    console.error('Get dashboard metrics error:', error)
    throw error
  }
}

/**
 * Get restaurant statistics for dashboard
 */
export async function getRestaurantStats(): Promise<RestaurantStats> {
  const supabase = createClient()
  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    throw new Error('Restaurant not found')
  }

  try {
    // Get today's date range
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    // Get all completed orders
    const { data: orders, error: ordersError } = await supabase
      .from(Tables.ORDERS)
      .select(`
        *,
        items:order_items(*)
      `)
      .eq('restaurantId', tenantId)
      .in('status', ['completed', 'delivered'])
      .order('createdAt', { ascending: false })

    if (ordersError) throw ordersError

    // Calculate basic stats
    const todayOrders = orders?.filter(order => 
      new Date(order.createdAt) >= todayStart && new Date(order.createdAt) < todayEnd
    ) || []
    
    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0)
    const totalRevenue = orders?.reduce((sum, order) => sum + order.total, 0) || 0
    const avgOrderValue = orders && orders.length > 0 ? totalRevenue / orders.length : 0

    // Get popular items
    const itemCounts = new Map<string, { name: string; count: number; revenue: number }>()
    
    orders?.forEach(order => {
      order.items?.forEach((item: any) => {
        const existing = itemCounts.get(item.menuItemId) || { name: item.name, count: 0, revenue: 0 }
        existing.count += item.quantity
        existing.revenue += item.price * item.quantity
        itemCounts.set(item.menuItemId, existing)
      })
    })

    const popularItems = Array.from(itemCounts.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Get recent orders (last 10)
    const recentOrders = orders?.slice(0, 10) || []

    // Get monthly revenue (last 6 months)
    const monthlyRevenue = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 1)
      
      const monthOrders = orders?.filter(order => 
        new Date(order.createdAt) >= monthStart && new Date(order.createdAt) < monthEnd
      ) || []
      
      monthlyRevenue.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
        revenue: monthOrders.reduce((sum, order) => sum + order.total, 0),
        orders: monthOrders.length
      })
    }

    // Get order status breakdown (current pending orders)
    const { data: pendingOrders, error: pendingError } = await supabase
      .from(Tables.ORDERS)
      .select('status')
      .eq('restaurantId', tenantId)
      .not('status', 'in', '(completed,delivered,canceled,refunded)')

    if (pendingError) throw pendingError

    const statusBreakdown = pendingOrders?.reduce((acc, order) => {
      const existing = acc.find(item => item.status === order.status)
      if (existing) {
        existing.count++
      } else {
        acc.push({ status: order.status, count: 1 })
      }
      return acc
    }, [] as Array<{ status: any; count: number }>) || []

    return {
      todayOrders: todayOrders.length,
      todayRevenue,
      totalOrders: orders?.length || 0,
      totalRevenue,
      averageOrderValue: avgOrderValue,
      popularItems: popularItems.map(item => ({
        id: item.id,
        name: item.name,
        orderCount: item.count,
        revenue: item.revenue
      })),
      recentOrders,
      monthlyRevenue,
      orderStatusBreakdown: statusBreakdown
    }
  } catch (error) {
    console.error('Get restaurant stats error:', error)
    throw error
  }
}

// ===== MENU MANAGEMENT =====

/**
 * Get restaurant menu categories
 */
export async function getMenuCategories() {
  const supabase = createClient()
  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    throw new Error('Restaurant not found')
  }

  const { data, error } = await supabase
    .from(Tables.MENU_CATEGORIES)
    .select('*')
    .eq('restaurantId', tenantId)
    .order('sortOrder')

  if (error) throw error
  return data || []
}

/**
 * Get restaurant menu items
 */
export async function getMenuItems(categoryId?: string) {
  const supabase = createClient()
  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    throw new Error('Restaurant not found')
  }

  let query = supabase
    .from(Tables.MENU_ITEMS)
    .select(`
      *,
      category:menu_categories(name)
    `)
    .eq('restaurantId', tenantId)
    .order('sortOrder')

  if (categoryId) {
    query = query.eq('categoryId', categoryId)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}