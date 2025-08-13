'use client';

/**
 * Promotion Banner Component
 * Eye-catching banners for featured promotions and special offers
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Sparkles, 
  Clock, 
  Tag, 
  Gift, 
  Truck, 
  Users, 
  Percent,
  DollarSign,
  ChevronRight,
  Star,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PromotionBannerProps {
  promotions: Array<{
    id: string;
    name: string;
    description?: string;
    banner_text?: string;
    banner_color?: string;
    promotion_type: string;
    discount_percentage?: number;
    discount_amount?: number;
    min_order_amount?: number;
    valid_until?: string;
    is_featured?: boolean;
    auto_apply?: boolean;
    requires_code?: boolean;
  }>;
  onPromotionClick?: (promotion: any) => void;
  onDismiss?: (promotionId: string) => void;
  className?: string;
  variant?: 'carousel' | 'stack' | 'single';
  autoRotate?: boolean;
}

interface SingleBannerProps {
  promotion: any;
  onDismiss?: () => void;
  onClick?: () => void;
  className?: string;
}

interface FloatingBannerProps {
  promotion: any;
  onDismiss?: () => void;
  position?: 'top' | 'bottom';
  className?: string;
}

export function PromotionBanner({ 
  promotions,
  onPromotionClick,
  onDismiss,
  className = '',
  variant = 'carousel',
  autoRotate = true
}: PromotionBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const activeBanners = promotions.filter(p => 
    p.banner_text || p.is_featured || p.auto_apply
  ).filter(p => !dismissedIds.has(p.id));

  // Auto-rotate banners
  useEffect(() => {
    if (!autoRotate || activeBanners.length <= 1 || variant !== 'carousel') return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5000); // Rotate every 5 seconds

    return () => clearInterval(interval);
  }, [activeBanners.length, autoRotate, variant]);

  const handleDismiss = (promotionId: string) => {
    setDismissedIds(prev => new Set([...prev, promotionId]));
    onDismiss?.(promotionId);
    
    // Adjust current index if needed
    if (currentIndex >= activeBanners.length - 1) {
      setCurrentIndex(0);
    }
  };

  if (activeBanners.length === 0) return null;

  if (variant === 'single' && activeBanners[0]) {
    return (
      <SinglePromotionBanner
        promotion={activeBanners[0]}
        onDismiss={() => handleDismiss(activeBanners[0].id)}
        onClick={() => onPromotionClick?.(activeBanners[0])}
        className={className}
      />
    );
  }

  if (variant === 'stack') {
    return (
      <div className={cn('space-y-3', className)}>
        {activeBanners.slice(0, 3).map((promotion) => (
          <SinglePromotionBanner
            key={promotion.id}
            promotion={promotion}
            onDismiss={() => handleDismiss(promotion.id)}
            onClick={() => onPromotionClick?.(promotion)}
          />
        ))}
      </div>
    );
  }

  // Carousel variant
  return (
    <div className={cn('relative', className)}>
      <div className="overflow-hidden rounded-lg">
        <div 
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {activeBanners.map((promotion) => (
            <div key={promotion.id} className="w-full flex-shrink-0">
              <SinglePromotionBanner
                promotion={promotion}
                onDismiss={() => handleDismiss(promotion.id)}
                onClick={() => onPromotionClick?.(promotion)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Carousel Indicators */}
      {activeBanners.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {activeBanners.map((_, index) => (
            <button
              key={index}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                index === currentIndex 
                  ? 'bg-primary' 
                  : 'bg-muted hover:bg-muted-foreground/50'
              )}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SinglePromotionBanner({ 
  promotion, 
  onDismiss, 
  onClick,
  className = '' 
}: SingleBannerProps) {
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
        baseText = `🎉 ${promotion.discount_percentage}% OFF`;
        break;
      case 'fixed_amount':
        baseText = `💰 $${promotion.discount_amount} OFF`;
        break;
      case 'free_delivery':
        baseText = '🚚 FREE DELIVERY';
        break;
      case 'buy_x_get_y':
        baseText = '🎁 SPECIAL DEAL';
        break;
      case 'happy_hour':
        baseText = '⏰ HAPPY HOUR SPECIAL';
        break;
      case 'first_time_customer':
        baseText = '👋 WELCOME OFFER';
        break;
      default:
        baseText = '✨ SPECIAL OFFER';
    }

    if (promotion.min_order_amount && promotion.min_order_amount > 0) {
      baseText += ` on orders $${promotion.min_order_amount}+`;
    }

    return baseText;
  };

  const getTimeRemaining = () => {
    if (!promotion.valid_until) return null;
    
    const now = new Date();
    const expiry = new Date(promotion.valid_until);
    const diffMs = expiry.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expired';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} left`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} left`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} left`;
    }
  };

  const backgroundColor = promotion.banner_color || '#059669';
  const isDarkBackground = isColorDark(backgroundColor);
  const textColor = isDarkBackground ? '#FFFFFF' : '#000000';
  const timeRemaining = getTimeRemaining();
  const isUrgent = timeRemaining && (timeRemaining.includes('hour') || timeRemaining.includes('minute'));

  return (
    <Card 
      className={cn(
        'relative overflow-hidden border-0 shadow-lg cursor-pointer transition-transform hover:scale-[1.02]',
        className
      )}
      onClick={onClick}
      style={{ backgroundColor }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, ${textColor}20 0%, transparent 50%), 
                           radial-gradient(circle at 75% 75%, ${textColor}15 0%, transparent 50%)`,
        }} />
      </div>

      {/* Animated Gradient Overlay */}
      <div 
        className="absolute inset-0 opacity-20 animate-pulse"
        style={{
          background: `linear-gradient(45deg, transparent 30%, ${textColor}10 50%, transparent 70%)`,
        }}
      />

      <CardContent className="relative p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-full shrink-0"
              style={{ 
                backgroundColor: `${textColor}20`,
                color: textColor 
              }}
            >
              {getPromotionIcon()}
            </div>
            
            <div>
              <h3 
                className="font-bold text-lg leading-tight"
                style={{ color: textColor }}
              >
                {getPromotionText()}
              </h3>
              
              {promotion.description && (
                <p 
                  className="text-sm opacity-90 mt-1"
                  style={{ color: textColor }}
                >
                  {promotion.description}
                </p>
              )}

              <div className="flex items-center gap-2 mt-2">
                {promotion.is_featured && (
                  <Badge 
                    className="text-xs"
                    style={{ 
                      backgroundColor: `${textColor}20`, 
                      color: textColor,
                      border: `1px solid ${textColor}30`
                    }}
                  >
                    <Star className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                )}
                
                {promotion.auto_apply && (
                  <Badge 
                    className="text-xs"
                    style={{ 
                      backgroundColor: `${textColor}20`, 
                      color: textColor,
                      border: `1px solid ${textColor}30`
                    }}
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Auto-apply
                  </Badge>
                )}
                
                {promotion.requires_code && (
                  <Badge 
                    className="text-xs"
                    style={{ 
                      backgroundColor: `${textColor}20`, 
                      color: textColor,
                      border: `1px solid ${textColor}30`
                    }}
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    Code required
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {timeRemaining && (
              <div className="text-right">
                <Badge 
                  className={cn(
                    'text-xs',
                    isUrgent ? 'animate-pulse' : ''
                  )}
                  style={{ 
                    backgroundColor: isUrgent ? '#EF4444' : `${textColor}20`,
                    color: isUrgent ? '#FFFFFF' : textColor,
                    border: `1px solid ${isUrgent ? '#DC2626' : `${textColor}30`}`
                  }}
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {timeRemaining}
                </Badge>
              </div>
            )}

            <ChevronRight 
              className="w-5 h-5 ml-2" 
              style={{ color: textColor }}
            />
            
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-auto hover:bg-white/20"
                style={{ color: textColor }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      {/* Decorative Elements */}
      <div 
        className="absolute -right-2 -top-2 w-8 h-8 rounded-full opacity-20"
        style={{ backgroundColor: textColor }}
      />
      <div 
        className="absolute -right-6 -top-6 w-16 h-16 rounded-full opacity-10"
        style={{ backgroundColor: textColor }}
      />
    </Card>
  );
}

export function FloatingPromotionBanner({ 
  promotion, 
  onDismiss, 
  position = 'top',
  className = '' 
}: FloatingBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <div 
      className={cn(
        'fixed left-4 right-4 z-50 animate-in slide-in-from-top-4 duration-300',
        position === 'top' ? 'top-4' : 'bottom-4',
        className
      )}
    >
      <SinglePromotionBanner
        promotion={promotion}
        onDismiss={handleDismiss}
        className="shadow-2xl"
      />
    </div>
  );
}

// Compact banner for header/footer areas
export function CompactPromotionBanner({ 
  promotion, 
  className = '' 
}: { 
  promotion: any; 
  className?: string;
}) {
  const backgroundColor = promotion.banner_color || '#059669';
  const textColor = isColorDark(backgroundColor) ? '#FFFFFF' : '#000000';
  
  return (
    <div 
      className={cn(
        'px-4 py-2 text-center text-sm font-medium',
        'bg-gradient-to-r from-current to-current/90',
        className
      )}
      style={{ backgroundColor, color: textColor }}
    >
      <div className="flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4" />
        <span>{promotion.banner_text || promotion.name}</span>
        {promotion.valid_until && (
          <Badge 
            className="ml-2 text-xs"
            style={{ 
              backgroundColor: `${textColor}20`,
              color: textColor,
              border: `1px solid ${textColor}30`
            }}
          >
            Limited time
          </Badge>
        )}
      </div>
    </div>
  );
}

// Utility function to check if a color is dark
function isColorDark(hexColor: string): boolean {
  const color = hexColor.replace('#', '');
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}