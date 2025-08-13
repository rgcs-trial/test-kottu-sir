'use client';

/**
 * Promo Code Input Component
 * Customer-facing promotion code input with validation and preview
 */

import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Tag, 
  Check, 
  X, 
  Loader2, 
  AlertCircle, 
  Gift,
  Sparkles,
  Clock,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

interface PromoCodeInputProps {
  tenantId: string;
  cartItems: any[];
  subtotal: number;
  deliveryFee?: number;
  taxAmount?: number;
  onPromotionApplied: (result: any) => void;
  onPromotionRemoved: () => void;
  className?: string;
}

interface AppliedPromotion {
  code: string;
  promotionId: string;
  promotionName: string;
  discountAmount: number;
  promotionType: string;
  isValid: boolean;
}

export function PromoCodeInput({
  tenantId,
  cartItems,
  subtotal,
  deliveryFee = 0,
  taxAmount = 0,
  onPromotionApplied,
  onPromotionRemoved,
  className = '',
}: PromoCodeInputProps) {
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromotions, setAppliedPromotions] = useState<AppliedPromotion[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [availablePromotions, setAvailablePromotions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const debouncedPromoCode = useDebounce(promoCode, 500);

  // Fetch available promotions on mount
  useEffect(() => {
    fetchAvailablePromotions();
  }, [tenantId]);

  // Auto-validate promotion code as user types
  useEffect(() => {
    if (debouncedPromoCode && debouncedPromoCode.length >= 3) {
      validatePromoCode(debouncedPromoCode, false); // Preview mode
    } else {
      setValidationError(null);
    }
  }, [debouncedPromoCode, subtotal, cartItems]);

  const fetchAvailablePromotions = async () => {
    try {
      const response = await fetch(`/api/promotions/validate?tenantId=${tenantId}`);
      const data = await response.json();
      
      if (data.success) {
        setAvailablePromotions(data.promotions || []);
      }
    } catch (error) {
      console.error('Error fetching available promotions:', error);
    }
  };

  const validatePromoCode = async (code: string, applyPromotion = true) => {
    if (!code.trim()) return;

    setIsValidating(true);
    setValidationError(null);

    try {
      const response = await fetch('/api/promotions/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          code: code.trim(),
          orderAmount: subtotal,
          cartItems,
          deliveryFee,
          taxAmount,
        }),
      });

      const result = await response.json();

      if (result.success && result.isValid) {
        if (applyPromotion) {
          const newPromotion: AppliedPromotion = {
            code: code.trim(),
            promotionId: result.promotionId,
            promotionName: result.detailedCalculation?.appliedPromotions[0]?.promotionName || 'Promotion',
            discountAmount: result.discountPreview,
            promotionType: result.detailedCalculation?.appliedPromotions[0]?.promotionType || 'discount',
            isValid: true,
          };

          // Remove any existing promotion with same code
          const updatedPromotions = appliedPromotions.filter(p => p.code !== code.trim());
          updatedPromotions.push(newPromotion);
          
          setAppliedPromotions(updatedPromotions);
          setPromoCode('');
          
          // Notify parent component
          onPromotionApplied(result.detailedCalculation || result);
          
          toast.success(`Promotion "${newPromotion.promotionName}" applied successfully! Saved $${newPromotion.discountAmount.toFixed(2)}`);
        } else {
          // Preview mode - just clear errors
          setValidationError(null);
        }
      } else {
        const errorMessage = result.error || 'Invalid promotion code';
        if (applyPromotion) {
          setValidationError(errorMessage);
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      console.error('Error validating promotion code:', error);
      const errorMessage = 'Failed to validate promotion code';
      if (applyPromotion) {
        setValidationError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleApplyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;

    // Check if code is already applied
    if (appliedPromotions.some(p => p.code === promoCode.trim())) {
      toast.error('This promotion code is already applied');
      return;
    }

    await validatePromoCode(promoCode, true);
  };

  const handleRemovePromotion = (code: string) => {
    const updatedPromotions = appliedPromotions.filter(p => p.code !== code);
    setAppliedPromotions(updatedPromotions);
    
    if (updatedPromotions.length === 0) {
      onPromotionRemoved();
      toast.info('Promotion removed');
    } else {
      // Recalculate with remaining promotions
      recalculatePromotions(updatedPromotions.map(p => p.code));
    }
  };

  const recalculatePromotions = async (promoCodes: string[]) => {
    try {
      const response = await fetch('/api/promotions/validate', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          cartItems,
          subtotal,
          deliveryFee,
          taxAmount,
          promoCodes,
        }),
      });

      const result = await response.json();
      if (result.success) {
        onPromotionApplied(result.result);
      }
    } catch (error) {
      console.error('Error recalculating promotions:', error);
    }
  };

  const handleSuggestionClick = (promotion: any) => {
    if (promotion.requires_code) {
      // For code-required promotions, just show a hint
      toast.info(`This promotion requires a code. Check your email or social media for the code!`);
      return;
    }
    
    // For auto-apply promotions, just notify about eligibility
    toast.info(`"${promotion.name}" will be automatically applied if you meet the requirements!`);
  };

  const getPromotionIcon = (type: string) => {
    switch (type) {
      case 'percentage':
      case 'fixed_amount':
        return <Tag className="w-4 h-4" />;
      case 'buy_x_get_y':
        return <Gift className="w-4 h-4" />;
      case 'free_delivery':
        return <Sparkles className="w-4 h-4" />;
      case 'happy_hour':
        return <Clock className="w-4 h-4" />;
      case 'first_time_customer':
        return <Users className="w-4 h-4" />;
      default:
        return <Tag className="w-4 h-4" />;
    }
  };

  const getPromotionDescription = (promotion: any) => {
    switch (promotion.promotion_type) {
      case 'percentage':
        return `${promotion.discount_percentage}% off`;
      case 'fixed_amount':
        return `$${promotion.discount_amount} off`;
      case 'free_delivery':
        return 'Free delivery';
      case 'buy_x_get_y':
        return 'Buy X get Y deal';
      default:
        return 'Special offer';
    }
  };

  const filteredSuggestions = availablePromotions.filter(promo => 
    promo.display_banner || promo.is_featured || promo.auto_apply
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Applied Promotions */}
      {appliedPromotions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-green-700 flex items-center gap-2">
            <Check className="w-4 h-4" />
            Applied Promotions
          </h4>
          {appliedPromotions.map((promotion) => (
            <div 
              key={promotion.code}
              className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getPromotionIcon(promotion.promotionType)}
                <div>
                  <p className="font-medium text-green-800">{promotion.promotionName}</p>
                  <p className="text-sm text-green-600">
                    Code: {promotion.code.toUpperCase()} • Saves ${promotion.discountAmount.toFixed(2)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemovePromotion(promotion.code)}
                className="text-green-700 hover:text-green-900 hover:bg-green-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Promo Code Input */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Have a promo code?</span>
        </div>
        
        <form onSubmit={handleApplyCode} className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Enter promo code..."
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              className={`uppercase ${validationError ? 'border-red-300' : ''}`}
              disabled={isValidating}
            />
            {isValidating && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <Button 
            type="submit" 
            disabled={!promoCode.trim() || isValidating}
            className="whitespace-nowrap"
          >
            Apply Code
          </Button>
        </form>

        {validationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Available Promotions Suggestions */}
      {filteredSuggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Available Offers</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSuggestions(!showSuggestions)}
            >
              {showSuggestions ? 'Hide' : 'Show'} ({filteredSuggestions.length})
            </Button>
          </div>

          {showSuggestions && (
            <div className="space-y-2">
              {filteredSuggestions.slice(0, 3).map((promotion) => (
                <Card 
                  key={promotion.id} 
                  className="cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => handleSuggestionClick(promotion)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                          {getPromotionIcon(promotion.promotion_type)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{promotion.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {getPromotionDescription(promotion)}
                            {promotion.min_order_amount > 0 && ` • Min order $${promotion.min_order_amount}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {promotion.auto_apply && (
                          <Badge variant="secondary" className="text-xs">
                            Auto
                          </Badge>
                        )}
                        {promotion.requires_code && (
                          <Badge variant="outline" className="text-xs">
                            Code
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredSuggestions.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{filteredSuggestions.length - 3} more offers available
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-muted-foreground">
        <p>• Promo codes are case-insensitive</p>
        <p>• Some promotions may automatically apply if you're eligible</p>
        <p>• Multiple promotions can sometimes be combined</p>
      </div>
    </div>
  );
}