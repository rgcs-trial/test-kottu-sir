'use client';

/**
 * Discount Badge Component
 * Visual indicators for discounts and savings throughout the UI
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Percent, 
  DollarSign, 
  Gift, 
  Truck, 
  Clock, 
  Users, 
  Sparkles,
  Tag,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiscountBadgeProps {
  discountAmount: number;
  originalPrice: number;
  discountType: 'percentage' | 'fixed_amount' | 'free_delivery' | 'buy_x_get_y' | 'special';
  variant?: 'default' | 'success' | 'accent' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  showSavings?: boolean;
  className?: string;
}

interface DiscountSummaryProps {
  discounts: Array<{
    name: string;
    amount: number;
    type: string;
  }>;
  originalTotal: number;
  finalTotal: number;
  className?: string;
}

interface PromotionBannerProps {
  promotion: {
    name: string;
    description?: string;
    banner_text?: string;
    banner_color?: string;
    promotion_type: string;
    discount_percentage?: number;
    discount_amount?: number;
    min_order_amount?: number;
    valid_until?: string;
  };
  className?: string;
}

const DISCOUNT_VARIANTS = {
  default: 'bg-blue-100 text-blue-800 border-blue-200',
  success: 'bg-green-100 text-green-800 border-green-200', 
  accent: 'bg-orange-100 text-orange-800 border-orange-200',
  outline: 'bg-transparent border-2 border-current',
};

const SIZE_VARIANTS = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
};

export function DiscountBadge({ 
  discountAmount, 
  originalPrice, 
  discountType,
  variant = 'success',
  size = 'md',
  showSavings = true,
  className = '' 
}: DiscountBadgeProps) {
  if (discountAmount <= 0) return null;

  const percentage = Math.round((discountAmount / originalPrice) * 100);
  
  const getDiscountIcon = () => {
    switch (discountType) {
      case 'percentage':
        return <Percent className="w-3 h-3" />;
      case 'fixed_amount':
        return <DollarSign className="w-3 h-3" />;
      case 'free_delivery':
        return <Truck className="w-3 h-3" />;
      case 'buy_x_get_y':
        return <Gift className="w-3 h-3" />;
      default:
        return <Tag className="w-3 h-3" />;
    }
  };

  const getDiscountText = () => {
    switch (discountType) {
      case 'percentage':
        return `${percentage}% OFF`;
      case 'fixed_amount':
        return `$${discountAmount.toFixed(2)} OFF`;
      case 'free_delivery':
        return 'FREE DELIVERY';
      case 'buy_x_get_y':
        return 'DEAL APPLIED';
      default:
        return 'DISCOUNT';
    }
  };

  return (
    <div className={cn('inline-flex items-center gap-1 font-semibold rounded-full border', 
      DISCOUNT_VARIANTS[variant], 
      SIZE_VARIANTS[size], 
      className
    )}>
      {getDiscountIcon()}
      <span>{getDiscountText()}</span>
      {showSavings && (
        <span className="ml-1 opacity-75">
          Save ${discountAmount.toFixed(2)}
        </span>
      )}
    </div>
  );
}

export function DiscountSummary({ 
  discounts, 
  originalTotal, 
  finalTotal,
  className = '' 
}: DiscountSummaryProps) {
  if (!discounts.length) return null;

  const totalSavings = discounts.reduce((sum, discount) => sum + discount.amount, 0);
  const savingsPercentage = Math.round((totalSavings / originalTotal) * 100);

  return (
    <Card className={cn('border-green-200 bg-green-50', className)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-green-100 rounded-full">
            <TrendingDown className="w-4 h-4 text-green-600" />
          </div>
          <h4 className="font-semibold text-green-800">Your Savings</h4>
          <Badge className="bg-green-600 text-white">
            {savingsPercentage}% OFF
          </Badge>
        </div>

        <div className="space-y-2">
          {discounts.map((discount, index) => (
            <div key={index} className="flex justify-between items-center text-sm">
              <span className="text-green-700">{discount.name}</span>
              <span className="font-medium text-green-800">
                -${discount.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-green-200 pt-3 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 line-through">
              Original: ${originalTotal.toFixed(2)}
            </span>
            <span className="text-sm text-green-700">
              You save: ${totalSavings.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-lg font-bold text-green-800">
            <span>Final Total:</span>
            <span>${finalTotal.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PromotionBanner({ promotion, className = '' }: PromotionBannerProps) {
  const getPromotionIcon = () => {
    switch (promotion.promotion_type) {
      case 'percentage':
        return <Percent className="w-5 h-5" />;
      case 'fixed_amount':
        return <DollarSign className="w-5 h-5" />;
      case 'buy_x_get_y':
        return <Gift className="w-5 h-5" />;
      case 'free_delivery':
        return <Truck className="w-5 h-5" />;
      case 'happy_hour':
        return <Clock className="w-5 h-5" />;
      case 'first_time_customer':
        return <Users className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  const getPromotionText = () => {
    if (promotion.banner_text) {
      return promotion.banner_text;
    }

    let baseText = '';
    switch (promotion.promotion_type) {
      case 'percentage':
        baseText = `${promotion.discount_percentage}% OFF`;
        break;
      case 'fixed_amount':
        baseText = `$${promotion.discount_amount} OFF`;
        break;
      case 'free_delivery':
        baseText = 'FREE DELIVERY';
        break;
      case 'buy_x_get_y':
        baseText = 'SPECIAL DEAL';
        break;
      case 'happy_hour':
        baseText = 'HAPPY HOUR SPECIAL';
        break;
      case 'first_time_customer':
        baseText = 'WELCOME OFFER';
        break;
      default:
        baseText = 'SPECIAL OFFER';
    }

    if (promotion.min_order_amount && promotion.min_order_amount > 0) {
      baseText += ` on orders $${promotion.min_order_amount}+`;
    }

    return baseText;
  };

  const isExpiringSoon = () => {
    if (!promotion.valid_until) return false;
    const expiryDate = new Date(promotion.valid_until);
    const now = new Date();
    const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry <= 24 && hoursUntilExpiry > 0;
  };

  const backgroundColor = promotion.banner_color || '#059669'; // Default green
  const textColor = getContrastColor(backgroundColor);

  return (
    <div 
      className={cn(
        'relative overflow-hidden rounded-lg p-4 shadow-sm',
        'bg-gradient-to-r from-current to-current/90',
        className
      )}
      style={{ 
        backgroundColor,
        color: textColor,
      }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="h-full w-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full">
            {getPromotionIcon()}
          </div>
          <div>
            <h3 className="font-bold text-lg">{getPromotionText()}</h3>
            {promotion.description && (
              <p className="text-sm opacity-90 mt-1">
                {promotion.description}
              </p>
            )}
          </div>
        </div>

        {isExpiringSoon() && (
          <div className="text-right">
            <Badge className="bg-white/20 text-current border-white/30">
              <Clock className="w-3 h-3 mr-1" />
              Expires Soon
            </Badge>
          </div>
        )}
      </div>

      {/* Decorative Element */}
      <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full" />
      <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/5 rounded-full" />
    </div>
  );
}

// Item-specific discount badge for menu items
export function ItemDiscountBadge({ 
  originalPrice, 
  discountedPrice, 
  className = '' 
}: {
  originalPrice: number;
  discountedPrice: number;
  className?: string;
}) {
  if (discountedPrice >= originalPrice) return null;

  const discountAmount = originalPrice - discountedPrice;
  const discountPercentage = Math.round((discountAmount / originalPrice) * 100);

  return (
    <div className={cn('relative', className)}>
      <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
        {discountPercentage}% OFF
      </Badge>
    </div>
  );
}

// Utility function to determine contrasting text color
function getContrastColor(hexcolor: string): string {
  // Remove # if present
  hexcolor = hexcolor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hexcolor.substr(0, 2), 16);
  const g = parseInt(hexcolor.substr(2, 2), 16);
  const b = parseInt(hexcolor.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}