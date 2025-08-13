'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TreeMap,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalyticsClient } from '@/lib/analytics/client';
import type { MenuPerformance } from '@/types/analytics';
import { Package, TrendingUp, DollarSign, Star } from 'lucide-react';

interface MenuPerformanceChartProps {
  restaurantId: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

export function MenuPerformanceChart({ restaurantId }: MenuPerformanceChartProps) {
  const [data, setData] = useState<MenuPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const analytics = new AnalyticsClient();

  useEffect(() => {
    loadData();
  }, [restaurantId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const menuData = await analytics.getMenuPerformance(restaurantId);
      setData(menuData);
    } catch (error) {
      console.error('Failed to load menu performance:', error);
    } finally {
      setLoading(false);
    }
  };

  // Top performing items
  const topItems = data
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 10);

  // Category performance
  const categoryData = data.reduce((acc, item) => {
    const existing = acc.find(c => c.name === item.category_name);
    if (existing) {
      existing.revenue += item.total_revenue;
      existing.quantity += item.total_quantity;
    } else {
      acc.push({
        name: item.category_name,
        revenue: item.total_revenue,
        quantity: item.total_quantity
      });
    }
    return acc;
  }, [] as { name: string; revenue: number; quantity: number }[]);

  // Profitability analysis
  const profitabilityData = data.map(item => ({
    name: item.item_name,
    revenue: item.total_revenue,
    quantity: item.total_quantity,
    avgPrice: item.avg_price,
    revenuePerUnit: item.revenue_per_unit
  }));

  const totalRevenue = data.reduce((sum, item) => sum + item.total_revenue, 0);
  const totalQuantity = data.reduce((sum, item) => sum + item.total_quantity, 0);
  const avgItemPrice = totalRevenue / totalQuantity || 0;
  const bestSeller = data.sort((a, b) => b.times_ordered - a.times_ordered)[0];

  const kpis = [
    {
      label: 'Total Menu Revenue',
      value: `$${totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      label: 'Items Sold',
      value: totalQuantity.toLocaleString(),
      icon: Package,
      color: 'text-blue-600'
    },
    {
      label: 'Avg Item Price',
      value: `$${avgItemPrice.toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-purple-600'
    },
    {
      label: 'Best Seller',
      value: bestSeller?.item_name || 'N/A',
      icon: Star,
      color: 'text-yellow-600'
    }
  ];

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Items */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Menu Items by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topItems} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="item_name" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="total_revenue" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Performance by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Items by Quantity Sold */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Menu Items Performance Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topItems}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="item_name" angle={-45} textAnchor="end" height={100} />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="total_revenue" fill="#8884d8" name="Revenue ($)" />
                <Bar yAxisId="right" dataKey="total_quantity" fill="#82ca9d" name="Quantity Sold" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}