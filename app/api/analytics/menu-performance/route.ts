import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import type { AnalyticsResponse, MenuAnalytics } from '@/types/analytics'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const headersList = headers()
    
    const restaurantId = headersList.get('x-tenant-id')
    if (!restaurantId) {
      return NextResponse.json({
        success: false,
        errors: [{ code: 'MISSING_RESTAURANT_ID', message: 'Restaurant ID is required' }]
      }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'month'
    const limit = parseInt(searchParams.get('limit') || '20')
    const startTime = Date.now()

    // Get menu performance using the database function
    const { data: menuData, error: menuError } = await supabase
      .rpc('get_menu_performance', {
        restaurant_id: restaurantId,
        time_period: period,
        limit_items: limit
      })

    if (menuError) {
      console.error('Menu performance error:', menuError)
      return NextResponse.json({
        success: false,
        errors: [{ code: 'DATABASE_ERROR', message: 'Failed to fetch menu performance data' }]
      }, { status: 500 })
    }

    // Get menu overview data
    const { data: menuOverview, error: overviewError } = await supabase
      .from('menu_items')
      .select(`
        id,
        name,
        base_price,
        status,
        category:menu_categories!inner(id, name)
      `)
      .eq('tenant_id', restaurantId)

    if (overviewError) {
      console.error('Menu overview error:', overviewError)
    }

    // Process menu performance data
    const topPerformers = menuData?.map((item: any) => ({
      itemId: item.item_id,
      itemName: item.item_name,
      categoryName: item.category_name,
      categoryId: '', // Would be included in the query
      totalOrders: Number(item.total_orders) || 0,
      totalRevenue: Number(item.total_revenue) || 0,
      averageRating: Number(item.avg_rating) || 0,
      profitMargin: Number(item.profit_margin) || 0,
      cost: Number(item.profit_margin) / 0.7, // Simplified cost calculation
      price: Number(item.total_revenue) / Math.max(Number(item.total_orders), 1),
      trendDirection: item.trend_direction as 'up' | 'down' | 'stable',
      popularity: Number(item.total_orders) || 0
    })).sort((a, b) => b.totalRevenue - a.totalRevenue) || []

    // Get worst performers (lowest revenue items that have orders)
    const worstPerformers = topPerformers
      .filter(item => item.totalOrders > 0)
      .sort((a, b) => a.totalRevenue - b.totalRevenue)
      .slice(0, 10)

    // Group by categories for category performance
    const categoryMap = new Map()
    topPerformers.forEach(item => {
      if (!categoryMap.has(item.categoryName)) {
        categoryMap.set(item.categoryName, {
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          totalOrders: 0,
          totalRevenue: 0,
          items: []
        })
      }
      
      const category = categoryMap.get(item.categoryName)
      category.totalOrders += item.totalOrders
      category.totalRevenue += item.totalRevenue
      category.items.push(item)
    })

    const categories = Array.from(categoryMap.values()).map(category => ({
      ...category,
      averageOrderValue: category.totalOrders > 0 ? category.totalRevenue / category.totalOrders : 0,
      profitMargin: category.items.reduce((sum: number, item: any) => sum + item.profitMargin, 0) / category.items.length,
      popularityTrend: category.items.filter((item: any) => item.trendDirection === 'up').length > 
                      category.items.filter((item: any) => item.trendDirection === 'down').length ? 
                      'up' as const : 'down' as const,
      topItems: category.items.slice(0, 5)
    })).sort((a, b) => b.totalRevenue - a.totalRevenue)

    // Calculate overview
    const overview = {
      totalMenuItems: menuOverview?.length || 0,
      activeItems: menuOverview?.filter((item: any) => item.status === 'active').length || 0,
      totalCategories: new Set(menuOverview?.map((item: any) => item.category?.id)).size || 0,
      averageItemPrice: menuOverview?.reduce((sum: number, item: any) => sum + (item.base_price || 0), 0) / Math.max(menuOverview?.length || 1, 1) || 0,
      mostPopularCategory: categories[0]?.categoryName || 'N/A'
    }

    // Separate items by profit margin
    const highMarginThreshold = 0.4 // 40% margin
    const lowMarginThreshold = 0.2  // 20% margin

    const profitability = {
      highMargin: topPerformers.filter(item => (item.profitMargin / item.totalRevenue) > highMarginThreshold).slice(0, 10),
      lowMargin: topPerformers.filter(item => (item.profitMargin / item.totalRevenue) < lowMarginThreshold && item.totalOrders > 0).slice(0, 10),
      averageMargin: topPerformers.length > 0 ? 
        topPerformers.reduce((sum, item) => sum + (item.profitMargin / Math.max(item.totalRevenue, 1)), 0) / topPerformers.length : 0
    }

    // Generate recommendations
    const recommendations = []

    // Promote high-performing items
    topPerformers.slice(0, 3).forEach(item => {
      if (item.trendDirection === 'up') {
        recommendations.push({
          type: 'promote' as const,
          itemId: item.itemId,
          itemName: item.itemName,
          reason: 'High performance with upward trend - consider featuring or bundling',
          impact: item.totalRevenue * 0.15 // 15% potential increase
        })
      }
    })

    // Optimize underperforming items
    worstPerformers.slice(0, 3).forEach(item => {
      recommendations.push({
        type: 'optimize' as const,
        itemId: item.itemId,
        itemName: item.itemName,
        reason: 'Low performance - consider recipe changes, pricing adjustments, or better positioning',
        impact: item.totalRevenue * 0.3 // 30% potential increase
      })
    })

    // Remove very poor performers
    const veryPoorPerformers = worstPerformers.filter(item => item.totalOrders < 5 && item.totalRevenue < 50)
    veryPoorPerformers.slice(0, 2).forEach(item => {
      recommendations.push({
        type: 'remove' as const,
        itemId: item.itemId,
        itemName: item.itemName,
        reason: 'Very low sales - consider removing to streamline menu',
        impact: 0 // Cost savings rather than revenue increase
      })
    })

    const analytics: MenuAnalytics = {
      period,
      startDate: getStartDate(period),
      endDate: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString(),
      overview,
      topPerformers: topPerformers.slice(0, limit),
      worstPerformers,
      categories,
      profitability,
      recommendations
    }

    const executionTime = Date.now() - startTime

    const response: AnalyticsResponse<MenuAnalytics> = {
      success: true,
      data: analytics,
      metadata: {
        generatedAt: new Date().toISOString(),
        period,
        recordCount: topPerformers.length,
        executionTime
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Menu performance API error:', error)
    return NextResponse.json({
      success: false,
      errors: [{ 
        code: 'INTERNAL_ERROR', 
        message: 'Internal server error while fetching menu performance' 
      }]
    }, { status: 500 })
  }
}

function getStartDate(period: string): string {
  const now = new Date()
  switch (period) {
    case 'today':
      return now.toISOString().split('T')[0]
    case 'week':
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
      return weekStart.toISOString().split('T')[0]
    case 'month':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      return monthStart.toISOString().split('T')[0]
    case 'quarter':
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      return quarterStart.toISOString().split('T')[0]
    case 'year':
      const yearStart = new Date(now.getFullYear(), 0, 1)
      return yearStart.toISOString().split('T')[0]
    default:
      const defaultStart = new Date(now.setDate(now.getDate() - 30))
      return defaultStart.toISOString().split('T')[0]
  }
}