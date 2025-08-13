'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalyticsClient } from '@/lib/analytics/client';
import type { HourlyPattern } from '@/types/analytics';
import { cn } from '@/lib/utils';

interface HourlyHeatmapProps {
  restaurantId: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function HourlyHeatmap({ restaurantId }: HourlyHeatmapProps) {
  const [patterns, setPatterns] = useState<HourlyPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const analytics = new AnalyticsClient();

  useEffect(() => {
    loadData();
  }, [restaurantId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await analytics.getHourlyPatterns(restaurantId);
      setPatterns(data);
    } catch (error) {
      console.error('Failed to load hourly patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create heatmap data structure
  const heatmapData: Record<string, number> = {};
  let maxOrders = 0;

  patterns.forEach(p => {
    const key = `${p.day_of_week}-${p.hour}`;
    heatmapData[key] = p.order_count;
    if (p.order_count > maxOrders) {
      maxOrders = p.order_count;
    }
  });

  const getIntensity = (orders: number): string => {
    if (orders === 0) return 'bg-gray-100';
    const intensity = (orders / maxOrders) * 100;
    if (intensity < 20) return 'bg-blue-200';
    if (intensity < 40) return 'bg-blue-300';
    if (intensity < 60) return 'bg-blue-400';
    if (intensity < 80) return 'bg-blue-500';
    return 'bg-blue-600';
  };

  const getHeatValue = (day: number, hour: number): number => {
    return heatmapData[`${day}-${hour}`] || 0;
  };

  // Calculate busiest times
  const busiestTimes = patterns
    .sort((a, b) => b.order_count - a.order_count)
    .slice(0, 5)
    .map(p => ({
      day: DAYS[p.day_of_week],
      hour: `${p.hour}:00`,
      orders: p.order_count,
      revenue: p.total_revenue
    }));

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
      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Order Pattern Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Hour labels */}
              <div className="flex gap-1 mb-2 ml-24">
                {HOURS.map(hour => (
                  <div key={hour} className="w-8 text-xs text-center text-muted-foreground">
                    {hour}
                  </div>
                ))}
              </div>

              {/* Heatmap grid */}
              {DAYS.map((day, dayIndex) => (
                <div key={day} className="flex gap-1 mb-1">
                  <div className="w-24 text-sm font-medium flex items-center">
                    {day.slice(0, 3)}
                  </div>
                  {HOURS.map(hour => {
                    const value = getHeatValue(dayIndex, hour);
                    return (
                      <div
                        key={`${dayIndex}-${hour}`}
                        className={cn(
                          "w-8 h-8 rounded flex items-center justify-center text-xs transition-all hover:scale-110",
                          getIntensity(value)
                        )}
                        title={`${day} ${hour}:00 - ${value} orders`}
                      >
                        {value > 0 && value}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-6">
            <span className="text-sm text-muted-foreground">Low Activity</span>
            <div className="flex gap-1">
              <div className="w-6 h-6 bg-gray-100 rounded"></div>
              <div className="w-6 h-6 bg-blue-200 rounded"></div>
              <div className="w-6 h-6 bg-blue-300 rounded"></div>
              <div className="w-6 h-6 bg-blue-400 rounded"></div>
              <div className="w-6 h-6 bg-blue-500 rounded"></div>
              <div className="w-6 h-6 bg-blue-600 rounded"></div>
            </div>
            <span className="text-sm text-muted-foreground">High Activity</span>
          </div>
        </CardContent>
      </Card>

      {/* Busiest Times */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Busiest Time Slots</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {busiestTimes.map((time, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{time.day} at {time.hour}</p>
                    <p className="text-sm text-muted-foreground">{time.orders} orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">${time.revenue.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}