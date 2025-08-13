'use client';

/**
 * Promotion Analytics Component
 * Comprehensive analytics dashboard for promotion performance
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Eye, 
  Target,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';
import { addDays, subDays, format } from 'date-fns';

interface PromotionAnalyticsProps {
  tenantId: string;
  promotionId?: string; // If provided, show analytics for specific promotion
  className?: string;
}

interface AnalyticsData {
  overview: {
    totalUses: number;
    totalDiscountGiven: number;
    totalOrderValue: number;
    uniqueCustomers: number;
    conversionRate: number;
    averageOrderValue: number;
  };
  trends: {
    date: string;
    uses: number;
    discountGiven: number;
    orderValue: number;
    customers: number;
  }[];
  topPromotions: {
    id: string;
    name: string;
    uses: number;
    discountGiven: number;
    conversionRate: number;
  }[];
  customerSegments: {
    segment: string;
    uses: number;
    percentage: number;
  }[];
}

export function PromotionAnalytics({ tenantId, promotionId, className = '' }: PromotionAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedPromotion, setSelectedPromotion] = useState<string>(promotionId || 'all');
  const [promotions, setPromotions] = useState<any[]>([]);

  // Fetch available promotions for filter
  useEffect(() => {
    fetchPromotions();
  }, [tenantId]);

  // Fetch analytics when filters change
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      fetchAnalytics();
    }
  }, [dateRange, selectedPromotion, tenantId]);

  const fetchPromotions = async () => {
    try {
      // This would typically use your existing API
      const response = await fetch(`/api/promotions/validate?tenantId=${tenantId}`);
      const data = await response.json();
      if (data.success) {
        setPromotions(data.promotions || []);
      }
    } catch (error) {
      console.error('Error fetching promotions:', error);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      // Mock data for now - would be replaced with actual API call
      const mockData: AnalyticsData = {
        overview: {
          totalUses: 1247,
          totalDiscountGiven: 12580.50,
          totalOrderValue: 45230.75,
          uniqueCustomers: 892,
          conversionRate: 15.3,
          averageOrderValue: 36.25,
        },
        trends: generateMockTrendData(),
        topPromotions: [
          { id: '1', name: 'Summer Sale 20%', uses: 450, discountGiven: 5670.25, conversionRate: 18.5 },
          { id: '2', name: 'Free Delivery Friday', uses: 340, discountGiven: 1360.00, conversionRate: 22.1 },
          { id: '3', name: 'First Order 15% Off', uses: 280, discountGiven: 3150.75, conversionRate: 45.2 },
          { id: '4', name: 'Buy 2 Get 1 Free', uses: 177, discountGiven: 2399.50, conversionRate: 12.8 },
        ],
        customerSegments: [
          { segment: 'New Customers', uses: 425, percentage: 34.1 },
          { segment: 'Returning Customers', uses: 520, percentage: 41.7 },
          { segment: 'VIP Customers', uses: 189, percentage: 15.2 },
          { segment: 'Inactive Customers', uses: 113, percentage: 9.0 },
        ],
      };

      setAnalyticsData(mockData);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const generateMockTrendData = () => {
    const data = [];
    const days = 30;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      data.push({
        date: format(date, 'yyyy-MM-dd'),
        uses: Math.floor(Math.random() * 50) + 10,
        discountGiven: Math.floor(Math.random() * 500) + 100,
        orderValue: Math.floor(Math.random() * 2000) + 500,
        customers: Math.floor(Math.random() * 30) + 5,
      });
    }
    
    return data;
  };

  const exportData = async () => {
    try {
      // Mock export functionality
      toast.success('Analytics data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-8 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-64 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-destructive">{error}</p>
          <Button onClick={fetchAnalytics} variant="outline" className="mt-2">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3">
          <DatePickerWithRange
            date={dateRange}
            onDateChange={setDateRange}
            placeholder="Select date range"
          />
          
          <Select value={selectedPromotion} onValueChange={setSelectedPromotion}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select promotion" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Promotions</SelectItem>
              {promotions.map((promo) => (
                <SelectItem key={promo.id} value={promo.id}>
                  {promo.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAnalytics}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {analyticsData && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Uses"
              value={analyticsData.overview.totalUses}
              change={+12.5}
              icon={Target}
              format="number"
            />
            <MetricCard
              title="Total Discount Given"
              value={analyticsData.overview.totalDiscountGiven}
              change={+8.2}
              icon={DollarSign}
              format="currency"
            />
            <MetricCard
              title="Total Order Value"
              value={analyticsData.overview.totalOrderValue}
              change={+15.7}
              icon={BarChart3}
              format="currency"
            />
            <MetricCard
              title="Unique Customers"
              value={analyticsData.overview.uniqueCustomers}
              change={-2.1}
              icon={Users}
              format="number"
            />
          </div>

          {/* Analytics Tabs */}
          <Tabs defaultValue="trends" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="segments">Customer Segments</TabsTrigger>
            </TabsList>

            <TabsContent value="trends">
              <Card>
                <CardHeader>
                  <CardTitle>Usage Trends</CardTitle>
                  <CardDescription>
                    Promotion usage and discount trends over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center bg-muted rounded">
                    <div className="text-center text-muted-foreground">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                      <p>Chart visualization would go here</p>
                      <p className="text-sm">Integration with chart library needed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Promotions</CardTitle>
                  <CardDescription>
                    Ranking of promotions by usage and conversion rate
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.topPromotions.map((promo, index) => (
                      <div key={promo.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">#{index + 1}</span>
                          </div>
                          <div>
                            <h4 className="font-medium">{promo.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {promo.uses} uses • ${promo.discountGiven.toFixed(2)} discount given
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-green-600">
                            {promo.conversionRate}%
                          </div>
                          <p className="text-xs text-muted-foreground">conversion rate</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="segments">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Segments</CardTitle>
                    <CardDescription>
                      Promotion usage by customer type
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData.customerSegments.map((segment) => (
                        <div key={segment.segment} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{segment.segment}</span>
                            <span>{segment.uses} uses ({segment.percentage}%)</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary rounded-full h-2 transition-all"
                              style={{ width: `${segment.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Key Metrics</CardTitle>
                    <CardDescription>
                      Important performance indicators
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                      <span className="text-sm font-medium">Conversion Rate</span>
                      <Badge className="bg-green-100 text-green-800">
                        {analyticsData.overview.conversionRate}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                      <span className="text-sm font-medium">Average Order Value</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        ${analyticsData.overview.averageOrderValue.toFixed(2)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                      <span className="text-sm font-medium">ROI Estimate</span>
                      <Badge className="bg-purple-100 text-purple-800">
                        +260%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                      <span className="text-sm font-medium">Customer Retention</span>
                      <Badge className="bg-orange-100 text-orange-800">
                        +18.5%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number;
  change: number;
  icon: React.ElementType;
  format: 'number' | 'currency' | 'percentage';
}

function MetricCard({ title, value, change, icon: Icon, format }: MetricCardProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return val.toLocaleString();
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{formatValue(value)}</p>
          </div>
          <div className="p-2 bg-primary/10 rounded-full">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
        <div className="flex items-center mt-2">
          {change >= 0 ? (
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
          )}
          <span className={`text-sm font-medium ${
            change >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {change >= 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
          <span className="text-sm text-muted-foreground ml-1">vs last period</span>
        </div>
      </CardContent>
    </Card>
  );
}