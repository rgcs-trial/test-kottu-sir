/**
 * Promotions Management Dashboard
 * Comprehensive interface for restaurant staff to manage promotions
 */

import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Eye, Edit, Trash2, BarChart3, QrCode, Copy, Download } from 'lucide-react';
import { PromotionForm } from '@/components/promotions/promotion-form';
import { PromotionAnalytics } from '@/components/promotions/promotion-analytics';
import { PromotionCodeManager } from '@/components/promotions/promotion-code-manager';

interface PromotionWithStats {
  id: string;
  name: string;
  description: string;
  promotion_type: string;
  status: string;
  discount_percentage: number;
  discount_amount: number;
  total_uses: number;
  total_discount_given: number;
  valid_from: string;
  valid_until: string;
  auto_apply: boolean;
  requires_code: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export default async function PromotionsPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }

  const supabase = createClient();
  
  // Get user profile with tenant information
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.tenant_id) {
    redirect('/login');
  }

  // Check if user has permission to manage promotions
  if (!['restaurant_owner', 'restaurant_staff'].includes(profile.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Promotions & Discounts</h1>
          <p className="text-muted-foreground mt-2">
            Manage promotional campaigns, discount codes, and special offers
          </p>
        </div>
        <PromotionForm>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Promotion
          </Button>
        </PromotionForm>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Active Promotions</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="codes">Promotion Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Suspense fallback={<PromotionsListSkeleton />}>
            <PromotionsList tenantId={profile.tenant_id} status="active" />
          </Suspense>
        </TabsContent>

        <TabsContent value="draft">
          <Suspense fallback={<PromotionsListSkeleton />}>
            <PromotionsList tenantId={profile.tenant_id} status="draft" />
          </Suspense>
        </TabsContent>

        <TabsContent value="analytics">
          <Suspense fallback={<div>Loading analytics...</div>}>
            <PromotionAnalytics tenantId={profile.tenant_id} />
          </Suspense>
        </TabsContent>

        <TabsContent value="codes">
          <Suspense fallback={<div>Loading codes...</div>}>
            <PromotionCodeManager tenantId={profile.tenant_id} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

async function PromotionsList({ tenantId, status }: { tenantId: string; status: string }) {
  const supabase = createClient();

  const { data: promotions, error } = await supabase
    .from('promotions')
    .select(`
      id,
      name,
      description,
      promotion_type,
      status,
      discount_percentage,
      discount_amount,
      max_discount_amount,
      total_uses,
      total_discount_given,
      total_usage_limit,
      per_customer_limit,
      valid_from,
      valid_until,
      auto_apply,
      requires_code,
      is_featured,
      display_banner,
      created_at,
      updated_at
    `)
    .eq('tenant_id', tenantId)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching promotions:', error);
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Failed to load promotions</p>
        </CardContent>
      </Card>
    );
  }

  if (!promotions || promotions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="space-y-3">
            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">No {status} promotions</h3>
            <p className="text-muted-foreground">
              {status === 'active' 
                ? 'Create your first promotion to start attracting more customers'
                : 'Your draft promotions will appear here'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {promotions.map((promotion) => (
        <PromotionCard key={promotion.id} promotion={promotion} />
      ))}
    </div>
  );
}

function PromotionCard({ promotion }: { promotion: PromotionWithStats }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDiscount = (promotion: PromotionWithStats) => {
    switch (promotion.promotion_type) {
      case 'percentage':
        return `${promotion.discount_percentage}% off`;
      case 'fixed_amount':
        return `$${promotion.discount_amount} off`;
      case 'free_delivery':
        return 'Free delivery';
      case 'buy_x_get_y':
        return 'Buy X Get Y';
      default:
        return 'Special offer';
    }
  };

  const isExpiringSoon = (validUntil: string) => {
    if (!validUntil) return false;
    const expiryDate = new Date(validUntil);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const isExpired = (validUntil: string) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  return (
    <Card className={`${isExpired(promotion.valid_until) ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{promotion.name}</CardTitle>
              <Badge className={getStatusColor(promotion.status)}>
                {promotion.status}
              </Badge>
              {promotion.is_featured && (
                <Badge variant="secondary">Featured</Badge>
              )}
              {promotion.auto_apply && (
                <Badge variant="outline">Auto-apply</Badge>
              )}
            </div>
            <CardDescription>
              {promotion.description || 'No description provided'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">
              <Eye className="w-4 h-4" />
            </Button>
            <PromotionForm promotion={promotion}>
              <Button variant="ghost" size="sm">
                <Edit className="w-4 h-4" />
              </Button>
            </PromotionForm>
            <Button variant="ghost" size="sm" className="text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Discount</p>
            <p className="font-semibold text-primary">
              {formatDiscount(promotion)}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Uses</p>
            <p className="font-semibold">
              {promotion.total_uses || 0}
              {promotion.total_usage_limit && ` / ${promotion.total_usage_limit}`}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Savings</p>
            <p className="font-semibold text-green-600">
              ${(promotion.total_discount_given || 0).toFixed(2)}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Valid Until</p>
            <p className={`font-semibold ${
              isExpired(promotion.valid_until) 
                ? 'text-red-600' 
                : isExpiringSoon(promotion.valid_until) 
                  ? 'text-yellow-600' 
                  : ''
            }`}>
              {promotion.valid_until 
                ? new Date(promotion.valid_until).toLocaleDateString()
                : 'No expiry'
              }
              {isExpiringSoon(promotion.valid_until) && (
                <span className="text-xs text-yellow-600 block">Expiring soon</span>
              )}
            </p>
          </div>
        </div>

        {promotion.requires_code && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Requires promotion code
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Copy className="w-4 h-4 mr-1" />
                  View Codes
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PromotionsListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-6 bg-muted rounded w-48" />
                <div className="h-4 bg-muted rounded w-64" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-8 bg-muted rounded" />
                <div className="h-8 w-8 bg-muted rounded" />
                <div className="h-8 w-8 bg-muted rounded" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="space-y-1">
                  <div className="h-4 bg-muted rounded w-16" />
                  <div className="h-5 bg-muted rounded w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}