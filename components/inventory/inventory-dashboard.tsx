'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  ShoppingCart,
  DollarSign,
  Users,
  BarChart3,
  RefreshCw,
  Plus,
  Search
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { StockLevels } from './stock-levels'
import { LowStockAlerts } from './low-stock-alerts'
import { RecentTransactions } from './inventory-history'
import { InventoryDashboardStats, InventoryAnalytics, StockAlertLevel } from '@/types/inventory'

interface InventoryDashboardProps {
  tenantId: string
}

export function InventoryDashboard({ tenantId }: InventoryDashboardProps) {
  const [dashboardStats, setDashboardStats] = useState<InventoryDashboardStats | null>(null)
  const [analytics, setAnalytics] = useState<InventoryAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [tenantId])

  const loadDashboardData = async () => {
    try {
      setRefreshing(true)
      
      // Load dashboard stats
      const statsResponse = await fetch(`/api/inventory/dashboard?tenantId=${tenantId}`)
      const statsData = await statsResponse.json()
      if (statsData.success) {
        setDashboardStats(statsData.data)
      }

      // Load analytics
      const analyticsResponse = await fetch(`/api/inventory/analytics?tenantId=${tenantId}`)
      const analyticsData = await analyticsResponse.json()
      if (analyticsData.success) {
        setAnalytics(analyticsData.data)
      }
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getStockHealthColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    if (percentage >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getAlertColor = (level: StockAlertLevel) => {
    switch (level) {
      case 'out_of_stock': return 'destructive'
      case 'critically_low': return 'destructive'
      case 'low_stock': return 'secondary'
      case 'overstocked': return 'outline'
      default: return 'default'
    }
  }

  if (loading && !dashboardStats) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">
            Monitor stock levels, track movements, and manage suppliers
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadDashboardData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search inventory items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.totalItems || 0}</div>
            <div className="text-xs text-muted-foreground">
              {dashboardStats?.activeSuppliers || 0} suppliers active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${dashboardStats?.totalValue?.toLocaleString() || '0'}
            </div>
            <div className="text-xs text-muted-foreground">
              Total inventory value
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {dashboardStats?.lowStockCount || 0}
            </div>
            <div className="text-xs text-muted-foreground">
              Items need attention
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purchase Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats?.pendingOrders || 0}</div>
            <div className="text-xs text-muted-foreground">
              Pending delivery
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Summary */}
      {analytics?.alertsBreakdown && analytics.alertsBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analytics.alertsBreakdown.map((alert) => (
                <Badge 
                  key={alert.type} 
                  variant={getAlertColor(alert.type)}
                  className="capitalize"
                >
                  {alert.type.replace('_', ' ')}: {alert.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock Value by Category */}
      {analytics?.valueByCategory && analytics.valueByCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stock Value by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.valueByCategory.slice(0, 5).map((category) => {
                const percentage = analytics.totalValue > 0 
                  ? (category.value / analytics.totalValue) * 100 
                  : 0
                return (
                  <div key={category.category} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{category.category || 'Uncategorized'}</span>
                      <span className="font-medium">
                        ${category.value.toLocaleString()} ({category.count} items)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="stock-levels" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock-levels">Stock Levels</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="stock-levels">
          <StockLevels tenantId={tenantId} searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="alerts">
          <LowStockAlerts tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="transactions">
          <RecentTransactions tenantId={tenantId} limit={20} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {/* Fast Moving Items */}
          {analytics?.fastMovingItems && analytics.fastMovingItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Fast Moving Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.fastMovingItems.slice(0, 10).map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.transactionCount} transactions
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{item.totalQuantityMoved} units</p>
                        <p className="text-sm text-muted-foreground">moved</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Analytics Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Inventory Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Stock Turnover Rate</p>
                  <p className="text-2xl font-bold">2.3x</p>
                  <p className="text-xs text-muted-foreground">Average monthly turnover</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Waste Reduction</p>
                  <p className="text-2xl font-bold text-green-600">-12%</p>
                  <p className="text-xs text-muted-foreground">Compared to last month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}