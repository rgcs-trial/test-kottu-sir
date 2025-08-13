import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import type { AnalyticsResponse, PredictiveAnalytics } from '@/types/analytics'

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
    const forecastDays = parseInt(searchParams.get('forecast_days') || '7')
    const startTime = Date.now()

    // Get demand forecast using the database function
    const { data: forecastData, error: forecastError } = await supabase
      .rpc('forecast_demand', {
        restaurant_id: restaurantId,
        forecast_days: forecastDays
      })

    if (forecastError) {
      console.error('Demand forecast error:', forecastError)
      return NextResponse.json({
        success: false,
        errors: [{ code: 'DATABASE_ERROR', message: 'Failed to fetch demand forecast' }]
      }, { status: 500 })
    }

    // Get historical data for seasonality analysis
    const { data: historicalData, error: historicalError } = await supabase
      .from('analytics_daily')
      .select('date, total_orders, gross_revenue')
      .eq('tenant_id', restaurantId)
      .gte('date', getStartDate('year'))
      .order('date', { ascending: true })

    if (historicalError) {
      console.error('Historical data error:', historicalError)
    }

    // Process demand forecast data
    const demandForecasting = {
      daily: forecastData?.map((forecast: any) => ({
        date: forecast.forecast_date,
        predictedOrders: Number(forecast.predicted_orders) || 0,
        predictedRevenue: Number(forecast.predicted_revenue) || 0,
        confidenceLevel: Number(forecast.confidence_level) || 0,
        factors: [
          { factor: 'Day of Week', impact: 0.3, confidence: 0.8 },
          { factor: 'Historical Trend', impact: 0.5, confidence: 0.9 },
          { factor: 'Seasonal Pattern', impact: 0.2, confidence: 0.6 }
        ]
      })) || [],
      weekly: [], // Would aggregate daily forecasts
      monthly: [] // Would aggregate daily forecasts
    }

    // Generate weekly aggregates from daily data
    if (demandForecasting.daily.length > 0) {
      const weeklyMap = new Map()
      
      demandForecasting.daily.forEach(day => {
        const weekStart = getWeekStart(new Date(day.date))
        const weekKey = weekStart.toISOString().split('T')[0]
        
        if (!weeklyMap.has(weekKey)) {
          weeklyMap.set(weekKey, {
            date: weekKey,
            predictedOrders: 0,
            predictedRevenue: 0,
            confidenceLevel: 0,
            dayCount: 0,
            factors: day.factors
          })
        }
        
        const week = weeklyMap.get(weekKey)
        week.predictedOrders += day.predictedOrders
        week.predictedRevenue += day.predictedRevenue
        week.confidenceLevel += day.confidenceLevel
        week.dayCount++
      })
      
      demandForecasting.weekly = Array.from(weeklyMap.values()).map(week => ({
        ...week,
        confidenceLevel: week.confidenceLevel / week.dayCount
      }))
    }

    // Analyze seasonality from historical data
    const seasonality = []
    if (historicalData && historicalData.length > 0) {
      const monthlyData = new Map()
      
      historicalData.forEach((row: any) => {
        const date = new Date(row.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, {
            period: monthKey,
            orders: 0,
            revenue: 0,
            days: 0
          })
        }
        
        const month = monthlyData.get(monthKey)
        month.orders += Number(row.total_orders) || 0
        month.revenue += Number(row.gross_revenue) || 0
        month.days++
      })
      
      const monthlyAverages = Array.from(monthlyData.values()).map(month => ({
        period: month.period,
        avgDailyOrders: month.orders / month.days,
        avgDailyRevenue: month.revenue / month.days
      }))
      
      const overallAvgOrders = monthlyAverages.reduce((sum, month) => sum + month.avgDailyOrders, 0) / monthlyAverages.length
      
      seasonality.push({
        period: 'Monthly',
        seasonalityFactor: 1.0, // Base factor
        historicalData: monthlyAverages.map(month => ({
          period: month.period,
          value: month.avgDailyOrders / overallAvgOrders // Relative to average
        }))
      })
    }

    // Generate recommendations based on trends and forecasts
    const recommendations = []

    // Inventory recommendations
    const highDemandDays = demandForecasting.daily
      .filter(day => day.confidenceLevel > 0.7 && day.predictedOrders > 30)
    
    if (highDemandDays.length > 0) {
      recommendations.push({
        category: 'inventory' as const,
        priority: 'high' as const,
        action: `Increase inventory for ${highDemandDays.length} high-demand days in forecast period`,
        expectedImpact: 'Reduce stockouts and potential revenue loss',
        confidence: 0.8
      })
    }

    // Staffing recommendations
    const peakDays = demandForecasting.daily.filter(day => day.predictedOrders > 40)
    if (peakDays.length > 0) {
      recommendations.push({
        category: 'staffing' as const,
        priority: 'medium' as const,
        action: `Schedule additional staff for ${peakDays.length} predicted peak days`,
        expectedImpact: 'Improve service quality and order processing speed',
        confidence: 0.7
      })
    }

    // Marketing recommendations
    const lowDemandDays = demandForecasting.daily.filter(day => day.predictedOrders < 20)
    if (lowDemandDays.length > 0) {
      recommendations.push({
        category: 'marketing' as const,
        priority: 'medium' as const,
        action: `Launch targeted promotions for ${lowDemandDays.length} low-demand days`,
        expectedImpact: 'Increase order volume by 15-25%',
        confidence: 0.6
      })
    }

    // Pricing recommendations
    const highConfidenceDays = demandForecasting.daily.filter(day => day.confidenceLevel > 0.8)
    if (highConfidenceDays.length > 0) {
      recommendations.push({
        category: 'pricing' as const,
        priority: 'low' as const,
        action: 'Consider dynamic pricing for high-confidence forecast periods',
        expectedImpact: 'Optimize revenue based on predicted demand',
        confidence: 0.5
      })
    }

    const analytics: PredictiveAnalytics = {
      period,
      startDate: getStartDate(period),
      endDate: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString(),
      demandForecasting,
      seasonality,
      recommendations
    }

    const executionTime = Date.now() - startTime

    const response: AnalyticsResponse<PredictiveAnalytics> = {
      success: true,
      data: analytics,
      metadata: {
        generatedAt: new Date().toISOString(),
        period,
        recordCount: demandForecasting.daily.length,
        executionTime
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Trends analytics API error:', error)
    return NextResponse.json({
      success: false,
      errors: [{ 
        code: 'INTERNAL_ERROR', 
        message: 'Internal server error while fetching trend analytics' 
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

function getWeekStart(date: Date): Date {
  const start = new Date(date)
  const day = start.getDay()
  const diff = start.getDate() - day
  return new Date(start.setDate(diff))
}