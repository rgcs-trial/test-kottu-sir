import { createClient } from '@/lib/supabase/client';
import type { 
  RevenueMetrics, 
  CustomerMetrics, 
  MenuPerformance,
  HourlyPattern,
  PaymentMethodStats,
  RetentionCohort,
  DemandPrediction,
  AnalyticsFilters 
} from '@/types/analytics';

export class AnalyticsClient {
  private supabase = createClient();

  async getRevenueMetrics(filters: AnalyticsFilters): Promise<RevenueMetrics[]> {
    let query = this.supabase
      .from('analytics_revenue')
      .select('*');

    if (filters.restaurantId) {
      query = query.eq('restaurant_id', filters.restaurantId);
    }

    if (filters.startDate) {
      query = query.gte('date', filters.startDate.toISOString());
    }

    if (filters.endDate) {
      query = query.lte('date', filters.endDate.toISOString());
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getCustomerMetrics(restaurantId: string): Promise<CustomerMetrics[]> {
    const { data, error } = await this.supabase
      .from('analytics_customers')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('total_spent', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  }

  async getMenuPerformance(restaurantId: string): Promise<MenuPerformance[]> {
    const { data, error } = await this.supabase
      .from('analytics_menu_performance')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('total_revenue', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getHourlyPatterns(restaurantId: string): Promise<HourlyPattern[]> {
    const { data, error } = await this.supabase
      .from('analytics_hourly_patterns')
      .select('*')
      .eq('restaurant_id', restaurantId);

    if (error) throw error;
    return data || [];
  }

  async getPaymentMethodStats(restaurantId: string): Promise<PaymentMethodStats[]> {
    const { data, error } = await this.supabase
      .from('analytics_payment_methods')
      .select('*')
      .eq('restaurant_id', restaurantId);

    if (error) throw error;
    return data || [];
  }

  async getRetentionCohorts(restaurantId: string): Promise<RetentionCohort[]> {
    const { data, error } = await this.supabase
      .rpc('get_retention_cohorts', { restaurant_uuid: restaurantId });

    if (error) throw error;
    return data || [];
  }

  async predictDemand(
    restaurantId: string, 
    targetDate: Date,
    lookbackDays: number = 30
  ): Promise<DemandPrediction[]> {
    const { data, error } = await this.supabase
      .rpc('predict_demand', {
        restaurant_uuid: restaurantId,
        target_date: targetDate.toISOString(),
        lookback_days: lookbackDays
      });

    if (error) throw error;
    return data || [];
  }

  async exportData(
    data: any[],
    format: 'csv' | 'json',
    filename: string
  ): Promise<void> {
    let content: string;
    let mimeType: string;

    if (format === 'csv') {
      // Convert to CSV
      const headers = Object.keys(data[0] || {}).join(',');
      const rows = data.map(row => 
        Object.values(row).map(v => 
          typeof v === 'string' && v.includes(',') ? `"${v}"` : v
        ).join(',')
      );
      content = [headers, ...rows].join('\n');
      mimeType = 'text/csv';
    } else {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
    }

    // Create download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}