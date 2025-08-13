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
  ScatterChart,
  Scatter,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalyticsClient } from '@/lib/analytics/client';
import type { CustomerMetrics, RetentionCohort } from '@/types/analytics';
import { Users, UserCheck, TrendingUp, Calendar } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface CustomerInsightsProps {
  restaurantId: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function CustomerInsights({ restaurantId }: CustomerInsightsProps) {
  const [customers, setCustomers] = useState<CustomerMetrics[]>([]);
  const [retention, setRetention] = useState<RetentionCohort[]>([]);
  const [loading, setLoading] = useState(true);
  const analytics = new AnalyticsClient();

  useEffect(() => {
    loadData();
  }, [restaurantId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [customerData, retentionData] = await Promise.all([
        analytics.getCustomerMetrics(restaurantId),
        analytics.getRetentionCohorts(restaurantId)
      ]);
      setCustomers(customerData);
      setRetention(retentionData);
    } catch (error) {
      console.error('Failed to load customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Customer segmentation
  const segments = {
    vip: customers.filter(c => c.total_spent > 500),
    regular: customers.filter(c => c.order_count >= 5),
    occasional: customers.filter(c => c.order_count >= 2 && c.order_count < 5),
    new: customers.filter(c => c.order_count === 1)
  };

  const segmentData = [
    { name: 'VIP', value: segments.vip.length, color: '#FFD700' },
    { name: 'Regular', value: segments.regular.length, color: '#4CAF50' },
    { name: 'Occasional', value: segments.occasional.length, color: '#2196F3' },
    { name: 'New', value: segments.new.length, color: '#9C27B0' }
  ];

  // Customer lifetime value distribution
  const clvData = customers
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 20)
    .map(c => ({
      name: c.customer_name.split(' ')[0],
      value: c.total_spent,
      orders: c.order_count
    }));

  // Order frequency distribution
  const frequencyData = [
    { range: '1 order', count: customers.filter(c => c.order_count === 1).length },
    { range: '2-5 orders', count: customers.filter(c => c.order_count >= 2 && c.order_count <= 5).length },
    { range: '6-10 orders', count: customers.filter(c => c.order_count >= 6 && c.order_count <= 10).length },
    { range: '11-20 orders', count: customers.filter(c => c.order_count >= 11 && c.order_count <= 20).length },
    { range: '20+ orders', count: customers.filter(c => c.order_count > 20).length }
  ];

  // Cohort retention data
  const cohortData = retention.reduce((acc, r) => {
    const existing = acc.find(a => a.month === r.months_since_first_order);
    if (existing) {
      existing.retention = (existing.retention + r.retention_rate) / 2;
    } else {
      acc.push({
        month: r.months_since_first_order,
        retention: r.retention_rate
      });
    }
    return acc;
  }, [] as { month: number; retention: number }[]);

  const kpis = [
    {
      label: 'Total Customers',
      value: customers.length.toLocaleString(),
      icon: Users,
      color: 'text-blue-600'
    },
    {
      label: 'VIP Customers',
      value: segments.vip.length.toLocaleString(),
      icon: UserCheck,
      color: 'text-yellow-600'
    },
    {
      label: 'Avg Customer Value',
      value: `$${(customers.reduce((sum, c) => sum + c.total_spent, 0) / customers.length || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      label: 'Repeat Rate',
      value: `${((customers.filter(c => c.order_count > 1).length / customers.length) * 100 || 0).toFixed(1)}%`,
      icon: Calendar,
      color: 'text-purple-600'
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
        {/* Customer Segmentation */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Segmentation</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={segmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {segmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Customers by Lifetime Value</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clvData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Frequency */}
        <Card>
          <CardHeader>
            <CardTitle>Order Frequency Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={frequencyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Retention Cohorts */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Retention by Month</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cohortData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" label={{ value: 'Months Since First Order', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: 'Retention %', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="retention" fill="#FF6B6B" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}