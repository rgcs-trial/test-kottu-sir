'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RevenueChart } from '@/components/analytics/revenue-chart';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line,
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
import { DollarSign, Store, Users, TrendingUp, ShoppingCart, CreditCard } from 'lucide-react';

export default function PlatformAnalyticsPage() {
  const [platformStats, setPlatformStats] = useState<any>({});
  const [restaurantPerformance, setRestaurantPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadPlatformData();
  }, []);

  const loadPlatformData = async () => {
    setLoading(true);
    try {
      // Get all restaurants with their revenue
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select(`
          id,
          name,
          created_at,
          orders (
            total_amount,
            status,
            created_at
          )
        `);

      if (restaurants) {
        // Calculate platform metrics
        const totalRevenue = restaurants.reduce((sum, r) => 
          sum + (r.orders?.filter((o: any) => o.status === 'delivered')
            .reduce((s: number, o: any) => s + o.total_amount, 0) || 0), 0
        );
        
        const platformFee = totalRevenue * 0.03; // 3% platform fee
        const totalOrders = restaurants.reduce((sum, r) => 
          sum + (r.orders?.filter((o: any) => o.status === 'delivered').length || 0), 0
        );

        setPlatformStats({
          totalRevenue,
          platformFee,
          totalOrders,
          activeRestaurants: restaurants.length,
          avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
        });

        // Prepare restaurant performance data
        const perfData = restaurants.map(r => ({
          name: r.name,
          revenue: r.orders?.filter((o: any) => o.status === 'delivered')
            .reduce((s: number, o: any) => s + o.total_amount, 0) || 0,
          orders: r.orders?.filter((o: any) => o.status === 'delivered').length || 0,
          platformFee: (r.orders?.filter((o: any) => o.status === 'delivered')
            .reduce((s: number, o: any) => s + o.total_amount, 0) || 0) * 0.03
        })).sort((a, b) => b.revenue - a.revenue);

        setRestaurantPerformance(perfData);
      }
    } catch (error) {
      console.error('Failed to load platform data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  const kpis = [
    {
      label: 'Platform Revenue (3% Fee)',
      value: `$${platformStats.platformFee?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Total GMV',
      value: `$${platformStats.totalRevenue?.toFixed(2) || '0.00'}`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Active Restaurants',
      value: platformStats.activeRestaurants || 0,
      icon: Store,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      label: 'Total Orders',
      value: platformStats.totalOrders?.toLocaleString() || '0',
      icon: ShoppingCart,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Platform Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Monitor platform-wide performance and revenue metrics
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-6">
              <div className={`${kpi.bgColor} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-bold mt-1">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Restaurant Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Restaurant Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={restaurantPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Total Revenue ($)" />
              <Bar yAxisId="right" dataKey="orders" fill="#82ca9d" name="Order Count" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Fee Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Fee by Restaurant</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={restaurantPerformance.slice(0, 5)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="platformFee"
                >
                  {restaurantPerformance.slice(0, 5).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Performing Restaurants */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Restaurants by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {restaurantPerformance.slice(0, 5).map((restaurant, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-8 rounded`} style={{ backgroundColor: COLORS[index] }}></div>
                    <div>
                      <p className="font-medium">{restaurant.name}</p>
                      <p className="text-sm text-muted-foreground">{restaurant.orders} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${restaurant.revenue.toFixed(2)}</p>
                    <p className="text-sm text-green-600">+${restaurant.platformFee.toFixed(2)} fee</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform-wide Revenue Chart */}
      <RevenueChart />
    </div>
  );
}