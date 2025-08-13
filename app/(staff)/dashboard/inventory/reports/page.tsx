'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts'
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Download,
  RefreshCw,
  Calendar,
  FileText,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'

interface InventoryReport {
  totalItems: number
  totalValue: number
  lowStockItems: number
  outOfStockItems: number
  overstockedItems: number
  
  // Category breakdown
  categoryBreakdown: Array<{
    category: string
    itemCount: number
    totalValue: number
    percentage: number
  }>
  
  // Stock movement over time
  stockMovement: Array<{
    date: string
    totalAdjustments: number
    positiveAdjustments: number
    negativeAdjustments: number
    value: number
  }>
  
  // Top items by various metrics
  topItemsByValue: Array<{
    id: string
    name: string
    category: string
    stockValue: number
    quantity: number
  }>
  
  topItemsByMovement: Array<{
    id: string
    name: string
    category: string
    movements: number
    totalQuantity: number
  }>
  
  // Purchase order analytics
  purchaseOrderStats: {
    totalOrders: number
    totalValue: number
    avgOrderValue: number
    pendingOrders: number
    onTimeDeliveryRate: number
  }
  
  // Supplier performance
  supplierPerformance: Array<{
    id: string
    name: string
    orderCount: number
    totalValue: number
    avgDeliveryDays: number
    onTimeRate: number
    rating: number
  }>
}

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function InventoryReportsPage() {
  const [reportData, setReportData] = useState<InventoryReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')
  const [reportType, setReportType] = useState('overview')
  
  // In a real implementation, get from auth context
  const tenantId = 'tenant-id-placeholder'

  useEffect(() => {
    loadReportData()
  }, [tenantId, dateRange])

  const loadReportData = async () => {
    try {
      setLoading(true)
      const endDate = new Date()
      const startDate = (() => {
        switch (dateRange) {
          case '7': return subDays(endDate, 7)
          case '30': return subDays(endDate, 30)
          case '90': return subDays(endDate, 90)
          case 'month': return startOfMonth(endDate)
          case 'lastMonth': return startOfMonth(subMonths(endDate, 1))
          default: return subDays(endDate, 30)
        }
      })()

      const response = await fetch(
        `/api/inventory/reports?tenantId=${tenantId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )
      const data = await response.json()
      
      if (data.success) {
        setReportData(data.data)
      }
    } catch (error) {
      console.error('Failed to load report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (format: 'csv' | 'pdf') => {
    try {
      const response = await fetch('/api/inventory/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          reportType,
          dateRange,
          format
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `inventory-report-${format}-${format(new Date(), 'yyyy-MM-dd')}.${format}`
        a.click()
      }
    } catch (error) {
      console.error('Failed to export report:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading inventory reports...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Failed to load report data</p>
            <Button onClick={loadReportData} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventory Reports & Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive insights into your inventory performance
          </p>
        </div>
        
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => exportReport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          
          <Button variant="outline" onClick={() => exportReport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total Items</p>
                <p className="text-2xl font-bold">{reportData.totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total Value</p>
                <p className="text-2xl font-bold">${reportData.totalValue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Low Stock</p>
                <p className="text-2xl font-bold text-orange-500">{reportData.lowStockItems}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Out of Stock</p>
                <p className="text-2xl font-bold text-red-500">{reportData.outOfStockItems}</p>
              </div>
              <Package className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Overstocked</p>
                <p className="text-2xl font-bold text-purple-500">{reportData.overstockedItems}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          <TabsTrigger value="top-items">Top Items</TabsTrigger>
          <TabsTrigger value="suppliers">Supplier Performance</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Category Breakdown Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Inventory by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reportData.categoryBreakdown}
                      dataKey="totalValue"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                    >
                      {reportData.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Value']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Stock Movement Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Stock Movement Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={reportData.stockMovement}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="positiveAdjustments" 
                      stackId="1"
                      stroke="#00C49F" 
                      fill="#00C49F" 
                      name="Increases"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="negativeAdjustments" 
                      stackId="1"
                      stroke="#FF8042" 
                      fill="#FF8042" 
                      name="Decreases"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Item Count</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.categoryBreakdown.map((category, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{category.category}</TableCell>
                      <TableCell>{category.itemCount}</TableCell>
                      <TableCell>${category.totalValue.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {category.percentage.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Movements Tab */}
        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Movement Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={reportData.stockMovement}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="totalAdjustments" 
                    stroke="#8884D8" 
                    name="Total Movements"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#82CA9D" 
                    name="Movement Value"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Items Tab */}
        <TabsContent value="top-items" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Top Items by Value */}
            <Card>
              <CardHeader>
                <CardTitle>Top Items by Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.topItemsByValue.slice(0, 10).map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.category} • {item.quantity} units
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${item.stockValue.toLocaleString()}</p>
                        <Badge variant="outline">#{index + 1}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Items by Movement */}
            <Card>
              <CardHeader>
                <CardTitle>Most Active Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.topItemsByMovement.slice(0, 10).map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.category}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{item.movements} movements</p>
                        <p className="text-sm text-muted-foreground">
                          {item.totalQuantity} total qty
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Supplier Performance Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Avg Delivery</TableHead>
                    <TableHead>On-Time Rate</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.supplierPerformance.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>{supplier.orderCount}</TableCell>
                      <TableCell>${supplier.totalValue.toLocaleString()}</TableCell>
                      <TableCell>{supplier.avgDeliveryDays} days</TableCell>
                      <TableCell>
                        <Badge variant={supplier.onTimeRate >= 90 ? "default" : "secondary"}>
                          {supplier.onTimeRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span>{supplier.rating.toFixed(1)}</span>
                          <span className="text-yellow-500">★</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchase-orders" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm font-medium">Total Orders</p>
                  <p className="text-2xl font-bold">{reportData.purchaseOrderStats.totalOrders}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm font-medium">Total Value</p>
                  <p className="text-2xl font-bold">${reportData.purchaseOrderStats.totalValue.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm font-medium">Avg Order Value</p>
                  <p className="text-2xl font-bold">${reportData.purchaseOrderStats.avgOrderValue.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm font-medium">On-Time Delivery</p>
                  <p className="text-2xl font-bold text-green-600">
                    {reportData.purchaseOrderStats.onTimeDeliveryRate.toFixed(1)}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Purchase Order Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.stockMovement}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884D8" name="Order Value" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export const metadata = {
  title: 'Inventory Reports',
  description: 'Comprehensive insights into your inventory performance',
}