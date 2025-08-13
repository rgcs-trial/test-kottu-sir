'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AnalyticsClient } from '@/lib/analytics/client';
import type { DemandPrediction } from '@/types/analytics';
import { format, addDays } from 'date-fns';
import { CalendarIcon, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DemandForecastProps {
  restaurantId: string;
}

export function DemandForecast({ restaurantId }: DemandForecastProps) {
  const [predictions, setPredictions] = useState<DemandPrediction[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1));
  const [loading, setLoading] = useState(false);
  const analytics = new AnalyticsClient();

  useEffect(() => {
    loadPredictions();
  }, [restaurantId, selectedDate]);

  const loadPredictions = async () => {
    setLoading(true);
    try {
      const data = await analytics.predictDemand(restaurantId, selectedDate);
      setPredictions(data);
    } catch (error) {
      console.error('Failed to load predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate peak hours
  const peakHours = predictions
    .sort((a, b) => b.predicted_orders - a.predicted_orders)
    .slice(0, 3)
    .map(p => p.hour);

  // Calculate total predicted orders
  const totalPredicted = predictions.reduce((sum, p) => sum + p.predicted_orders, 0);

  // Prepare chart data
  const chartData = predictions.map(p => ({
    hour: `${p.hour}:00`,
    predicted: p.predicted_orders,
    low: p.confidence_interval_low,
    high: p.confidence_interval_high,
    range: p.confidence_interval_high - p.confidence_interval_low
  }));

  // Staffing recommendations based on predictions
  const getStaffingRecommendation = (orders: number): { level: string; color: string; icon: any } => {
    if (orders < 5) return { level: 'Minimal', color: 'text-green-600', icon: CheckCircle };
    if (orders < 15) return { level: 'Normal', color: 'text-blue-600', icon: CheckCircle };
    if (orders < 30) return { level: 'Increased', color: 'text-yellow-600', icon: AlertTriangle };
    return { level: 'Maximum', color: 'text-red-600', icon: AlertTriangle };
  };

  const staffingSchedule = predictions.map(p => ({
    hour: p.hour,
    ...getStaffingRecommendation(p.predicted_orders),
    orders: p.predicted_orders
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
      {/* Date Selector and Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Demand Forecast</CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Total Predicted Orders</p>
              <p className="text-2xl font-bold text-blue-900">{Math.round(totalPredicted)}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-600 font-medium">Peak Hours</p>
              <p className="text-2xl font-bold text-yellow-900">
                {peakHours.map(h => `${h}:00`).join(', ')}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Avg Orders/Hour</p>
              <p className="text-2xl font-bold text-green-900">
                {(totalPredicted / 24).toFixed(1)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demand Prediction Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Hourly Demand Prediction with Confidence Intervals</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="high"
                stackId="1"
                stroke="#82ca9d"
                fill="#82ca9d"
                fillOpacity={0.3}
                name="Upper Confidence"
              />
              <Area
                type="monotone"
                dataKey="predicted"
                stackId="2"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
                name="Predicted Orders"
              />
              <Area
                type="monotone"
                dataKey="low"
                stackId="3"
                stroke="#ffc658"
                fill="#ffc658"
                fillOpacity={0.3}
                name="Lower Confidence"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Staffing Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Staffing Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
            {staffingSchedule.map((slot) => (
              <div
                key={slot.hour}
                className={cn(
                  "p-3 rounded-lg text-center border",
                  slot.level === 'Minimal' && "bg-green-50 border-green-200",
                  slot.level === 'Normal' && "bg-blue-50 border-blue-200",
                  slot.level === 'Increased' && "bg-yellow-50 border-yellow-200",
                  slot.level === 'Maximum' && "bg-red-50 border-red-200"
                )}
              >
                <p className="text-xs font-medium">{slot.hour}:00</p>
                <slot.icon className={cn("h-4 w-4 mx-auto mt-1", slot.color)} />
                <p className="text-xs mt-1">{Math.round(slot.orders)}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-200 rounded"></div>
              <span>Minimal Staff</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-200 rounded"></div>
              <span>Normal Staff</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-200 rounded"></div>
              <span>Increased Staff</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-200 rounded"></div>
              <span>Maximum Staff</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}