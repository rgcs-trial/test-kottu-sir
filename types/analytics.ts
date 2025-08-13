// =============================================
// Analytics Type Definitions
// =============================================

// Base analytics interfaces
export interface BaseAnalytics {
  period: string
  startDate: string
  endDate: string
  lastUpdated: string
}

export interface TrendData {
  current: number
  previous: number
  change: number
  changePercent: number
  trend: 'up' | 'down' | 'stable'
}

// =============================================
// REVENUE ANALYTICS
// =============================================

export interface RevenueData {
  date: string
  grossRevenue: number
  netRevenue: number
  orderCount: number
  averageOrderValue: number
  taxCollected: number
  deliveryFees: number
  discountAmount: number
}

export interface RevenueAnalytics extends BaseAnalytics {
  data: RevenueData[]
  totals: {
    grossRevenue: number
    netRevenue: number
    totalOrders: number
    averageOrderValue: number
    totalTax: number
    totalDeliveryFees: number
    totalDiscounts: number
  }
  trends: {
    revenue: TrendData
    orders: TrendData
    averageOrderValue: TrendData
  }
  growth: {
    daily: number[]
    weekly: number[]
    monthly: number[]
  }
  projections?: {
    nextPeriod: number
    confidence: number
  }
}

// =============================================
// ORDER ANALYTICS
// =============================================

export interface OrderVolumeData {
  date: string
  totalOrders: number
  completedOrders: number
  cancelledOrders: number
  pendingOrders: number
  averageProcessingTime: number
  peakHours: number[]
}

export interface OrderAnalytics extends BaseAnalytics {
  data: OrderVolumeData[]
  totals: {
    totalOrders: number
    completedOrders: number
    cancelledOrders: number
    completionRate: number
    averageProcessingTime: number
  }
  trends: {
    volume: TrendData
    completion: TrendData
    processingTime: TrendData
  }
  peakAnalysis: {
    peakHours: Array<{
      hour: number
      averageOrders: number
      averageRevenue: number
      dayOfWeek?: string
    }>
    peakDays: Array<{
      dayOfWeek: number
      averageOrders: number
      dayName: string
    }>
  }
  statusBreakdown: Array<{
    status: string
    count: number
    percentage: number
  }>
}

// =============================================
// CUSTOMER ANALYTICS
// =============================================

export interface CustomerDemographics {
  ageGroups: Array<{
    range: string
    count: number
    percentage: number
    averageOrderValue: number
  }>
  locations: Array<{
    city: string
    state: string
    count: number
    percentage: number
    averageOrderValue: number
  }>
  orderFrequency: Array<{
    frequency: string
    count: number
    percentage: number
  }>
}

export interface CustomerBehavior {
  averageSessionDuration: number
  pagesPerSession: number
  bounceRate: number
  conversionRate: number
  repeatOrderRate: number
  cartAbandonmentRate: number
  favoriteItems: Array<{
    itemId: string
    itemName: string
    orderCount: number
  }>
  orderPatterns: Array<{
    dayOfWeek: string
    hour: number
    orderCount: number
  }>
}

export interface CustomerAnalytics extends BaseAnalytics {
  totals: {
    totalCustomers: number
    newCustomers: number
    returningCustomers: number
    activeCustomers: number
  }
  trends: {
    newCustomers: TrendData
    retention: TrendData
    lifetime_value: TrendData
  }
  metrics: {
    acquisitionRate: number
    retentionRate: number
    churnRate: number
    customerLifetimeValue: number
    averageOrderFrequency: number
  }
  demographics: CustomerDemographics
  behavior: CustomerBehavior
  cohortAnalysis: Array<{
    cohort: string
    size: number
    retentionRates: number[]
  }>
}

// =============================================
// MENU PERFORMANCE ANALYTICS
// =============================================

export interface MenuItemPerformance {
  itemId: string
  itemName: string
  categoryName: string
  categoryId: string
  totalOrders: number
  totalRevenue: number
  averageRating: number
  profitMargin: number
  cost: number
  price: number
  trendDirection: 'up' | 'down' | 'stable'
  popularity: number
  seasonality?: Array<{
    month: number
    orders: number
  }>
}

export interface CategoryPerformance {
  categoryId: string
  categoryName: string
  totalOrders: number
  totalRevenue: number
  averageOrderValue: number
  profitMargin: number
  popularityTrend: 'up' | 'down' | 'stable'
  topItems: MenuItemPerformance[]
}

export interface MenuAnalytics extends BaseAnalytics {
  overview: {
    totalMenuItems: number
    activeItems: number
    totalCategories: number
    averageItemPrice: number
    mostPopularCategory: string
  }
  topPerformers: MenuItemPerformance[]
  worstPerformers: MenuItemPerformance[]
  categories: CategoryPerformance[]
  profitability: {
    highMargin: MenuItemPerformance[]
    lowMargin: MenuItemPerformance[]
    averageMargin: number
  }
  recommendations: Array<{
    type: 'promote' | 'optimize' | 'remove' | 'restock'
    itemId: string
    itemName: string
    reason: string
    impact: number
  }>
}

// =============================================
// GEOGRAPHIC ANALYTICS
// =============================================

export interface DeliveryZone {
  zoneName: string
  coordinates?: {
    lat: number
    lng: number
  }
  totalOrders: number
  totalRevenue: number
  averageDeliveryTime: number
  customerSatisfaction: number
  deliverySuccess: number
  averageOrderValue: number
  topItems: Array<{
    itemName: string
    orders: number
  }>
}

export interface GeographicAnalytics extends BaseAnalytics {
  overview: {
    totalDeliveryZones: number
    averageDeliveryTime: number
    longestDeliveryTime: number
    topPerformingZone: string
  }
  deliveryZones: DeliveryZone[]
  heatmapData: Array<{
    lat: number
    lng: number
    intensity: number
    orders: number
    revenue: number
  }>
  insights: Array<{
    zone: string
    insight: string
    impact: 'high' | 'medium' | 'low'
  }>
}

// =============================================
// PREDICTIVE ANALYTICS
// =============================================

export interface DemandForecast {
  date: string
  predictedOrders: number
  predictedRevenue: number
  confidenceLevel: number
  factors: Array<{
    factor: string
    impact: number
    confidence: number
  }>
}

export interface PredictiveAnalytics extends BaseAnalytics {
  demandForecasting: {
    daily: DemandForecast[]
    weekly: DemandForecast[]
    monthly: DemandForecast[]
  }
  seasonality: Array<{
    period: string
    seasonalityFactor: number
    historicalData: Array<{
      period: string
      value: number
    }>
  }>
  recommendations: Array<{
    category: 'inventory' | 'staffing' | 'marketing' | 'pricing'
    priority: 'high' | 'medium' | 'low'
    action: string
    expectedImpact: string
    confidence: number
  }>
}

// =============================================
// REAL-TIME ANALYTICS
// =============================================

export interface RealTimeMetrics {
  currentTime: string
  activeOrders: number
  todaysRevenue: number
  todaysOrders: number
  averageOrderValue: number
  peakHourProgress: number
  kitchenCapacity: {
    current: number
    maximum: number
    utilizationRate: number
  }
  deliveryMetrics: {
    averageTime: number
    activeDeliveries: number
    onTimeRate: number
  }
}

export interface LiveAnalytics {
  metrics: RealTimeMetrics
  alerts: Array<{
    id: string
    type: 'warning' | 'error' | 'info'
    message: string
    timestamp: string
    action?: string
  }>
  recentActivity: Array<{
    type: 'order' | 'cancellation' | 'completion'
    message: string
    timestamp: string
    amount?: number
  }>
}

// =============================================
// EXPORT AND REPORTING
// =============================================

export interface ExportOptions {
  format: 'csv' | 'pdf' | 'excel' | 'json'
  dateRange: {
    start: string
    end: string
  }
  includeCharts: boolean
  sections: Array<'revenue' | 'orders' | 'customers' | 'menu' | 'geographic'>
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly'
  filters?: {
    categories?: string[]
    orderTypes?: string[]
    customerSegments?: string[]
  }
}

export interface ReportData {
  metadata: {
    title: string
    generated: string
    period: string
    restaurantName: string
  }
  summary: {
    totalRevenue: number
    totalOrders: number
    totalCustomers: number
    growthRate: number
  }
  sections: {
    revenue?: RevenueAnalytics
    orders?: OrderAnalytics
    customers?: CustomerAnalytics
    menu?: MenuAnalytics
    geographic?: GeographicAnalytics
  }
}

// =============================================
// COMPREHENSIVE ANALYTICS DASHBOARD
// =============================================

export interface AnalyticsDashboard {
  restaurant: {
    id: string
    name: string
    timezone: string
  }
  overview: {
    revenue: RevenueAnalytics
    orders: OrderAnalytics
    customers: CustomerAnalytics
  }
  detailed: {
    menu: MenuAnalytics
    geographic: GeographicAnalytics
    predictive: PredictiveAnalytics
  }
  realTime: LiveAnalytics
  lastUpdated: string
  refreshInterval: number
}

// =============================================
// API REQUEST/RESPONSE TYPES
// =============================================

export interface AnalyticsRequest {
  restaurantId?: string
  period: 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  startDate?: string
  endDate?: string
  granularity?: 'hour' | 'day' | 'week' | 'month'
  metrics: Array<'revenue' | 'orders' | 'customers' | 'menu' | 'geographic' | 'predictive'>
  filters?: {
    categories?: string[]
    orderTypes?: ('dine_in' | 'takeaway' | 'delivery')[]
    orderStatuses?: string[]
  }
}

export interface AnalyticsResponse<T = any> {
  success: boolean
  data: T
  metadata: {
    generatedAt: string
    period: string
    recordCount: number
    executionTime: number
  }
  errors?: Array<{
    code: string
    message: string
    field?: string
  }>
}

// Chart-specific types for recharts integration
export interface ChartDataPoint {
  name: string
  value: number
  date?: string
  category?: string
  [key: string]: any
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'area' | 'pie' | 'scatter' | 'heatmap'
  title: string
  description?: string
  xAxisKey: string
  yAxisKey: string
  dataKey: string
  color?: string
  gradient?: boolean
  stacked?: boolean
  showGrid?: boolean
  showLegend?: boolean
  height?: number
  responsive?: boolean
}

export interface AnalyticsWidget {
  id: string
  title: string
  type: 'metric' | 'chart' | 'table' | 'alert'
  size: 'small' | 'medium' | 'large' | 'full'
  config: ChartConfig | any
  data: any
  loading?: boolean
  error?: string
  refreshInterval?: number
  lastUpdated?: string
}

// Platform admin analytics (extends restaurant analytics)
export interface PlatformAnalytics {
  restaurants: {
    total: number
    active: number
    pending: number
    suspended: number
    growthRate: number
    topPerformers: Array<{
      id: string
      name: string
      revenue: number
      orders: number
      growthRate: number
    }>
  }
  revenue: {
    platformRevenue: number
    commissionEarned: number
    subscriptionRevenue: number
    processingFees: number
    growthRate: number
    breakdown: Array<{
      source: string
      amount: number
      percentage: number
    }>
  }
  users: {
    total: number
    active: number
    byRole: Record<string, number>
    growthRate: number
    engagement: {
      dailyActive: number
      weeklyActive: number
      monthlyActive: number
    }
  }
  systemMetrics: {
    uptime: number
    responseTime: number
    errorRate: number
    throughput: number
    peakUsage: Array<{
      hour: number
      requests: number
    }>
  }
}