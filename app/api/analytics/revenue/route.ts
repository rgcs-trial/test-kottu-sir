import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import type { AnalyticsRequest, AnalyticsResponse, RevenueAnalytics } from '@/types/analytics'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const headersList = headers()
    
    // Get restaurant ID from headers (set by middleware)
    const restaurantId = headersList.get('x-tenant-id')
    if (!restaurantId) {
      return NextResponse.json({
        success: false,
        errors: [{ code: 'MISSING_RESTAURANT_ID', message: 'Restaurant ID is required' }]
      }, { status: 400 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'month'
    const granularity = searchParams.get('granularity') || 'day'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const startTime = Date.now()

    // Call the database function for revenue analytics
    const { data: revenueData, error: revenueError } = await supabase
      .rpc('get_revenue_analytics', {
        restaurant_id: restaurantId,
        time_period: period,
        granularity: granularity
      })

    if (revenueError) {
      console.error('Revenue analytics error:', revenueError)
      return NextResponse.json({
        success: false,
        errors: [{ code: 'DATABASE_ERROR', message: 'Failed to fetch revenue data' }]
      }, { status: 500 })
    }

    // Get previous period for trend calculation
    const { data: previousData, error: previousError } = await supabase
      .rpc('get_revenue_analytics', {
        restaurant_id: restaurantId,
        time_period: `last_${period}`,
        granularity: granularity
      })

    // Process the data into the expected format
    const processedData = revenueData?.map((row: any) => ({
      date: row.period_date,
      grossRevenue: Number(row.gross_revenue) || 0,
      netRevenue: Number(row.net_revenue) || 0,
      orderCount: Number(row.order_count) || 0,
      averageOrderValue: Number(row.average_order_value) || 0,
      taxCollected: Number(row.tax_collected) || 0,
      deliveryFees: Number(row.delivery_fees) || 0,
      discountAmount: Number(row.discount_amount) || 0
    })) || []

    const previousProcessedData = previousData?.map((row: any) => ({
      grossRevenue: Number(row.gross_revenue) || 0,
      netRevenue: Number(row.net_revenue) || 0,
      orderCount: Number(row.order_count) || 0,
    })) || []

    // Calculate totals
    const totals = processedData.reduce((acc, curr) => ({
      grossRevenue: acc.grossRevenue + curr.grossRevenue,
      netRevenue: acc.netRevenue + curr.netRevenue,
      totalOrders: acc.totalOrders + curr.orderCount,
      averageOrderValue: acc.averageOrderValue + curr.averageOrderValue,
      totalTax: acc.totalTax + curr.taxCollected,
      totalDeliveryFees: acc.totalDeliveryFees + curr.deliveryFees,
      totalDiscounts: acc.totalDiscounts + curr.discountAmount
    }), {
      grossRevenue: 0,
      netRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      totalTax: 0,
      totalDeliveryFees: 0,
      totalDiscounts: 0
    })

    // Calculate average order value
    if (totals.totalOrders > 0) {
      totals.averageOrderValue = totals.grossRevenue / totals.totalOrders
    }

    // Calculate previous period totals for trends
    const previousTotals = previousProcessedData.reduce((acc, curr) => ({
      grossRevenue: acc.grossRevenue + curr.grossRevenue,
      netRevenue: acc.netRevenue + curr.netRevenue,
      totalOrders: acc.totalOrders + curr.orderCount,
    }), {
      grossRevenue: 0,
      netRevenue: 0,
      totalOrders: 0
    })

    // Calculate trends
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return { 
        current, 
        previous, 
        change: current, 
        changePercent: current > 0 ? 100 : 0,
        trend: current > 0 ? 'up' as const : 'stable' as const
      }
      
      const change = current - previous
      const changePercent = (change / previous) * 100
      
      return {
        current,
        previous,
        change,
        changePercent,
        trend: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'stable' as const
      }
    }

    const trends = {
      revenue: calculateTrend(totals.grossRevenue, previousTotals.grossRevenue),
      orders: calculateTrend(totals.totalOrders, previousTotals.totalOrders),
      averageOrderValue: calculateTrend(
        totals.averageOrderValue, 
        previousTotals.totalOrders > 0 ? previousTotals.grossRevenue / previousTotals.totalOrders : 0
      )
    }

    // Generate growth arrays (simplified - would be more sophisticated in production)
    const growth = {
      daily: processedData.slice(-7).map(d => d.grossRevenue),
      weekly: [], // Would calculate weekly aggregates
      monthly: [] // Would calculate monthly aggregates
    }

    const analytics: RevenueAnalytics = {
      period,
      startDate: processedData[0]?.date || new Date().toISOString().split('T')[0],
      endDate: processedData[processedData.length - 1]?.date || new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString(),
      data: processedData,
      totals,
      trends,
      growth
    }

    const executionTime = Date.now() - startTime

    const response: AnalyticsResponse<RevenueAnalytics> = {
      success: true,
      data: analytics,
      metadata: {
        generatedAt: new Date().toISOString(),
        period,
        recordCount: processedData.length,
        executionTime
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Revenue analytics API error:', error)
    return NextResponse.json({
      success: false,
      errors: [{ 
        code: 'INTERNAL_ERROR', 
        message: 'Internal server error while fetching revenue analytics' 
      }]
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyticsRequest = await request.json()
    
    // Validate request body
    if (!body.metrics || !body.metrics.includes('revenue')) {
      return NextResponse.json({
        success: false,
        errors: [{ code: 'INVALID_METRICS', message: 'Revenue metrics must be included' }]
      }, { status: 400 })
    }

    // Forward to GET with query parameters
    const searchParams = new URLSearchParams({
      period: body.period,
      granularity: body.granularity || 'day',
      ...(body.startDate && { startDate: body.startDate }),
      ...(body.endDate && { endDate: body.endDate }),
    })

    const url = new URL(request.url)
    url.search = searchParams.toString()
    
    return GET(new NextRequest(url.toString(), { method: 'GET' }))

  } catch (error) {
    console.error('Revenue analytics POST error:', error)
    return NextResponse.json({
      success: false,
      errors: [{ code: 'INVALID_REQUEST', message: 'Invalid request body' }]
    }, { status: 400 })
  }
}