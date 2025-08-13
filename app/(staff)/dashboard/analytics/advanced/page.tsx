'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RevenueChart } from '@/components/analytics/revenue-chart';
import { CustomerInsights } from '@/components/analytics/customer-insights';
import { MenuPerformanceChart } from '@/components/analytics/menu-performance';
import { DemandForecast } from '@/components/analytics/demand-forecast';
import { HourlyHeatmap } from '@/components/analytics/hourly-heatmap';
import { useRestaurant } from '@/hooks/use-restaurant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, TrendingUp, Clock, Package, DollarSign } from 'lucide-react';

export default function AdvancedAnalyticsPage() {
  const { restaurant } = useRestaurant();
  const [activeTab, setActiveTab] = useState('revenue');

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'revenue', label: 'Revenue', icon: DollarSign },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'menu', label: 'Menu Performance', icon: Package },
    { id: 'demand', label: 'Demand Forecast', icon: TrendingUp },
    { id: 'patterns', label: 'Order Patterns', icon: Clock }
  ];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Advanced Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive insights and predictive analytics for {restaurant.name}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="revenue" className="space-y-6">
          <RevenueChart restaurantId={restaurant.id} />
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <CustomerInsights restaurantId={restaurant.id} />
        </TabsContent>

        <TabsContent value="menu" className="space-y-6">
          <MenuPerformanceChart restaurantId={restaurant.id} />
        </TabsContent>

        <TabsContent value="demand" className="space-y-6">
          <DemandForecast restaurantId={restaurant.id} />
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <HourlyHeatmap restaurantId={restaurant.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}