'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnalyticsClient } from '@/lib/analytics/client';
import type { RevenueMetrics, AnalyticsFilters } from '@/types/analytics';
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { Download, TrendingUp, TrendingDown, DollarSign, Users, ShoppingCart, Calendar } from 'lucide-react';

interface RevenueChartProps {
  restaurantId?: string;
}

export function RevenueChart({ restaurantId }: RevenueChartProps) {
  const [data, setData] = useState<RevenueMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '3m' | '1y'>('30d');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('area');
  const analytics = new AnalyticsClient();

  useEffect(() => {
    loadData();
  }, [restaurantId, timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case '7d':
          startDate = subDays(endDate, 7);
          break;
        case '30d':
          startDate = subDays(endDate, 30);
          break;
        case '3m':
          startDate = subDays(endDate, 90);
          break;
        case '1y':
          startDate = subDays(endDate, 365);
          break;
      }

      const filters: AnalyticsFilters = {
        startDate,
        endDate,
        restaurantId
      };

      const metrics = await analytics.getRevenueMetrics(filters);
      setData(metrics);
    } catch (error) {
      console.error('Failed to load revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    analytics.exportData(data, 'csv', `revenue-${timeRange}-${Date.now()}`);
  };

  const chartData = data.map(d => ({
    date: format(new Date(d.date), 'MMM dd'),
    revenue: d.gross_revenue,
    orders: d.order_count,
    customers: d.unique_customers,
    avgOrder: d.avg_order_value
  }));

  const totalRevenue = data.reduce((sum, d) => sum + d.gross_revenue, 0);
  const totalOrders = data.reduce((sum, d) => sum + d.order_count, 0);
  const totalCustomers = data.reduce((sum, d) => sum + d.unique_customers, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const kpis = [
    {
      label: 'Total Revenue',
      value: `$${totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      label: 'Total Orders',
      value: totalOrders.toLocaleString(),
      icon: ShoppingCart,
      color: 'text-blue-600'
    },
    {
      label: 'Unique Customers',
      value: totalCustomers.toLocaleString(),
      icon: Users,
      color: 'text-purple-600'
    },
    {
      label: 'Avg Order Value',
      value: `$${avgOrderValue.toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-orange-600'
    }
  ];

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue ($)" />
            <Line type="monotone" dataKey="orders" stroke="#82ca9d" name="Orders" />
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="revenue" fill="#8884d8" name="Revenue ($)" />
            <Bar dataKey="orders" fill="#82ca9d" name="Orders" />
          </BarChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" name="Revenue ($)" />
            <Area type="monotone" dataKey="orders" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="Orders" />
          </AreaChart>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold">{kpi.value}</p>
              </div>
              <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Revenue Analytics</CardTitle>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="3m">Last 3 months</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={chartType} onValueChange={(v: any) => setChartType(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="area">Area Chart</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={exportData}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            {renderChart()}
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}