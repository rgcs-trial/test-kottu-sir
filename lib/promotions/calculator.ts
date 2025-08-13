/**
 * Promotion Calculator - Comprehensive discount calculation engine
 * Handles all promotion types with business logic and validation
 */

import { createClient } from '@/lib/supabase/server';
import type { 
  Promotion, 
  PromotionCode, 
  PromotionUsage, 
  CartItem, 
  OrderPricing,
  DiscountApplication,
  PromotionValidationResult,
  PromotionCalculationResult,
  PromotionRule
} from '@/types';

// Promotion type definitions
export interface PromotionCalculatorInput {
  tenantId: string;
  userId?: string;
  cartItems: CartItem[];
  subtotal: number;
  deliveryFee: number;
  taxAmount: number;
  promoCodes?: string[];
  customerSegment?: string;
  orderHistory?: {
    totalOrders: number;
    totalSpent: number;
    daysSinceLastOrder?: number;
  };
}

export interface PromotionCalculationResult {
  isValid: boolean;
  totalDiscount: number;
  discountBreakdown: DiscountApplication[];
  finalPricing: OrderPricing;
  appliedPromotions: {
    promotionId: string;
    promotionName: string;
    discountAmount: number;
    promotionType: string;
    codeUsed?: string;
  }[];
  errors: string[];
  warnings: string[];
}

export interface DiscountApplication {
  promotionId: string;
  promotionName: string;
  promotionType: string;
  discountScope: string;
  discountAmount: number;
  appliedToItems?: {
    itemId: string;
    itemName: string;
    quantity: number;
    discountAmount: number;
  }[];
  codeUsed?: string;
}

export interface OrderPricing {
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  deliveryDiscount: number;
  taxAmount: number;
  totalAmount: number;
}

export class PromotionCalculator {
  private supabase;

  constructor() {
    this.supabase = createClient();
  }

  /**
   * Main calculation method - applies all eligible promotions
   */
  async calculatePromotions(input: PromotionCalculatorInput): Promise<PromotionCalculationResult> {
    try {
      const result: PromotionCalculationResult = {
        isValid: true,
        totalDiscount: 0,
        discountBreakdown: [],
        finalPricing: {
          subtotal: input.subtotal,
          discountAmount: 0,
          deliveryFee: input.deliveryFee,
          deliveryDiscount: 0,
          taxAmount: input.taxAmount,
          totalAmount: input.subtotal + input.deliveryFee + input.taxAmount,
        },
        appliedPromotions: [],
        errors: [],
        warnings: [],
      };

      // Step 1: Get all eligible promotions
      const eligiblePromotions = await this.getEligiblePromotions(input);
      
      // Step 2: Validate promotion codes if provided
      if (input.promoCodes?.length) {
        for (const code of input.promoCodes) {
          const codeValidation = await this.validatePromotionCode(
            input.tenantId, 
            code, 
            input.userId, 
            input.subtotal
          );
          
          if (!codeValidation.isValid) {
            result.errors.push(codeValidation.errorMessage);
            continue;
          }

          // Add code-based promotion to eligible list
          const codePromotion = await this.getPromotionById(codeValidation.promotionId);
          if (codePromotion) {
            eligiblePromotions.push({
              ...codePromotion,
              codeId: codeValidation.promotionCodeId,
              codeUsed: code
            });
          }
        }
      }

      // Step 3: Sort promotions by priority and apply stacking rules
      const sortedPromotions = this.sortPromotionsByPriority(eligiblePromotions);
      
      // Step 4: Calculate discounts respecting stacking rules
      let remainingSubtotal = input.subtotal;
      let remainingDeliveryFee = input.deliveryFee;
      const appliedPromotionIds = new Set<string>();

      for (const promotion of sortedPromotions) {
        // Check if promotion can stack with already applied promotions
        if (!this.canStackPromotion(promotion, appliedPromotionIds, eligiblePromotions)) {
          result.warnings.push(`${promotion.name} cannot be stacked with other applied promotions`);
          continue;
        }

        // Calculate discount for this promotion
        const discountCalc = await this.calculateSinglePromotionDiscount(
          promotion,
          input.cartItems,
          remainingSubtotal,
          remainingDeliveryFee
        );

        if (discountCalc.discountAmount > 0) {
          // Apply the discount
          const discountApp: DiscountApplication = {
            promotionId: promotion.id,
            promotionName: promotion.name,
            promotionType: promotion.promotion_type,
            discountScope: promotion.discount_scope,
            discountAmount: discountCalc.discountAmount,
            appliedToItems: discountCalc.appliedToItems,
            codeUsed: promotion.codeUsed,
          };

          result.discountBreakdown.push(discountApp);
          result.appliedPromotions.push({
            promotionId: promotion.id,
            promotionName: promotion.name,
            discountAmount: discountCalc.discountAmount,
            promotionType: promotion.promotion_type,
            codeUsed: promotion.codeUsed,
          });

          // Update remaining amounts for next promotion
          if (promotion.discount_scope === 'delivery_fee') {
            remainingDeliveryFee = Math.max(0, remainingDeliveryFee - discountCalc.discountAmount);
            result.finalPricing.deliveryDiscount += discountCalc.discountAmount;
          } else {
            remainingSubtotal = Math.max(0, remainingSubtotal - discountCalc.discountAmount);
            result.finalPricing.discountAmount += discountCalc.discountAmount;
          }

          result.totalDiscount += discountCalc.discountAmount;
          appliedPromotionIds.add(promotion.id);
        }
      }

      // Step 5: Calculate final pricing
      result.finalPricing = {
        subtotal: input.subtotal,
        discountAmount: result.finalPricing.discountAmount,
        deliveryFee: input.deliveryFee,
        deliveryDiscount: result.finalPricing.deliveryDiscount,
        taxAmount: input.taxAmount,
        totalAmount: Math.max(0, 
          input.subtotal - result.finalPricing.discountAmount + 
          input.deliveryFee - result.finalPricing.deliveryDiscount + 
          input.taxAmount
        ),
      };

      return result;

    } catch (error) {
      console.error('Promotion calculation error:', error);
      return {
        isValid: false,
        totalDiscount: 0,
        discountBreakdown: [],
        finalPricing: {
          subtotal: input.subtotal,
          discountAmount: 0,
          deliveryFee: input.deliveryFee,
          deliveryDiscount: 0,
          taxAmount: input.taxAmount,
          totalAmount: input.subtotal + input.deliveryFee + input.taxAmount,
        },
        appliedPromotions: [],
        errors: ['Failed to calculate promotions'],
        warnings: [],
      };
    }
  }

  /**
   * Calculate discount for a single promotion
   */
  private async calculateSinglePromotionDiscount(
    promotion: any,
    cartItems: CartItem[],
    subtotal: number,
    deliveryFee: number
  ) {
    const result = {
      discountAmount: 0,
      appliedToItems: [] as any[],
    };

    switch (promotion.promotion_type) {
      case 'percentage':
        result.discountAmount = this.calculatePercentageDiscount(
          promotion,
          subtotal,
          cartItems
        );
        break;

      case 'fixed_amount':
        result.discountAmount = this.calculateFixedAmountDiscount(
          promotion,
          subtotal,
          cartItems
        );
        break;

      case 'buy_x_get_y':
        const buyGetResult = this.calculateBuyXGetYDiscount(
          promotion,
          cartItems
        );
        result.discountAmount = buyGetResult.discountAmount;
        result.appliedToItems = buyGetResult.appliedToItems;
        break;

      case 'free_delivery':
        if (promotion.discount_scope === 'delivery_fee') {
          result.discountAmount = Math.min(deliveryFee, promotion.discount_amount || deliveryFee);
        }
        break;

      case 'happy_hour':
        if (this.isWithinTimeWindow(promotion)) {
          result.discountAmount = this.calculatePercentageDiscount(
            promotion,
            subtotal,
            cartItems
          );
        }
        break;

      case 'first_time_customer':
        // This should be validated at the eligibility level
        result.discountAmount = this.calculatePercentageDiscount(
          promotion,
          subtotal,
          cartItems
        );
        break;

      case 'category_discount':
        result.discountAmount = this.calculateCategoryDiscount(
          promotion,
          cartItems
        );
        break;

      default:
        console.warn(`Unknown promotion type: ${promotion.promotion_type}`);
    }

    // Apply maximum discount cap if set
    if (promotion.max_discount_amount) {
      result.discountAmount = Math.min(result.discountAmount, promotion.max_discount_amount);
    }

    return result;
  }

  /**
   * Calculate percentage-based discount
   */
  private calculatePercentageDiscount(
    promotion: any,
    subtotal: number,
    cartItems: CartItem[]
  ): number {
    if (!promotion.discount_percentage) return 0;

    let applicableAmount = subtotal;

    // Apply to specific scope if defined
    if (promotion.discount_scope === 'category' || promotion.discount_scope === 'item') {
      applicableAmount = this.calculateApplicableAmount(promotion, cartItems);
    }

    const discount = (applicableAmount * promotion.discount_percentage) / 100;
    return Math.min(discount, applicableAmount);
  }

  /**
   * Calculate fixed amount discount
   */
  private calculateFixedAmountDiscount(
    promotion: any,
    subtotal: number,
    cartItems: CartItem[]
  ): number {
    if (!promotion.discount_amount) return 0;

    let applicableAmount = subtotal;

    if (promotion.discount_scope === 'category' || promotion.discount_scope === 'item') {
      applicableAmount = this.calculateApplicableAmount(promotion, cartItems);
    }

    return Math.min(promotion.discount_amount, applicableAmount);
  }

  /**
   * Calculate Buy X Get Y discount
   */
  private calculateBuyXGetYDiscount(promotion: any, cartItems: CartItem[]) {
    const result = {
      discountAmount: 0,
      appliedToItems: [] as any[],
    };

    if (!promotion.buy_quantity || !promotion.get_quantity) return result;

    // Get eligible items based on promotion rules
    const eligibleItems = this.getEligibleCartItems(promotion, cartItems);
    
    // Sort by price (ascending for "get cheapest free" logic)
    eligibleItems.sort((a, b) => a.unit_price - b.unit_price);

    let totalQuantity = 0;
    for (const item of eligibleItems) {
      totalQuantity += item.quantity;
    }

    // Calculate how many free items customer gets
    const setsEligible = Math.floor(totalQuantity / promotion.buy_quantity);
    const freeItems = setsEligible * promotion.get_quantity;

    // Apply discount to cheapest eligible items
    let remainingFreeItems = freeItems;
    for (const item of eligibleItems) {
      if (remainingFreeItems <= 0) break;

      const freeQuantity = Math.min(remainingFreeItems, item.quantity);
      const discountPercentage = promotion.get_discount_percentage || 100;
      const itemDiscount = (item.unit_price * freeQuantity * discountPercentage) / 100;

      result.discountAmount += itemDiscount;
      result.appliedToItems.push({
        itemId: item.menu_item_id,
        itemName: item.name,
        quantity: freeQuantity,
        discountAmount: itemDiscount,
      });

      remainingFreeItems -= freeQuantity;
    }

    return result;
  }

  /**
   * Calculate category-specific discount
   */
  private calculateCategoryDiscount(promotion: any, cartItems: CartItem[]): number {
    const eligibleItems = this.getEligibleCartItems(promotion, cartItems);
    
    let totalEligibleAmount = 0;
    for (const item of eligibleItems) {
      totalEligibleAmount += item.unit_price * item.quantity;
    }

    if (promotion.discount_percentage) {
      return (totalEligibleAmount * promotion.discount_percentage) / 100;
    } else if (promotion.discount_amount) {
      return Math.min(promotion.discount_amount, totalEligibleAmount);
    }

    return 0;
  }

  /**
   * Get eligible cart items based on promotion rules
   */
  private getEligibleCartItems(promotion: any, cartItems: CartItem[]): CartItem[] {
    // This would check promotion rules for category/item inclusions/exclusions
    // For now, return all items - would be enhanced with actual rule checking
    return cartItems;
  }

  /**
   * Calculate applicable amount for scoped discounts
   */
  private calculateApplicableAmount(promotion: any, cartItems: CartItem[]): number {
    const eligibleItems = this.getEligibleCartItems(promotion, cartItems);
    
    return eligibleItems.reduce((total, item) => {
      return total + (item.unit_price * item.quantity);
    }, 0);
  }

  /**
   * Check if current time is within promotion time window
   */
  private isWithinTimeWindow(promotion: any): boolean {
    const now = new Date();
    
    // Check date range
    if (promotion.valid_from && now < new Date(promotion.valid_from)) return false;
    if (promotion.valid_until && now > new Date(promotion.valid_until)) return false;
    
    // Check day of week
    if (promotion.valid_days?.length) {
      const currentDay = now.toLocaleDateString('en', { weekday: 'long' }).toLowerCase();
      if (!promotion.valid_days.includes(currentDay)) return false;
    }
    
    // Check time window
    if (promotion.valid_hours_start && promotion.valid_hours_end) {
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      if (currentTime < promotion.valid_hours_start || currentTime > promotion.valid_hours_end) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get all eligible promotions for the given input
   */
  private async getEligiblePromotions(input: PromotionCalculatorInput) {
    const { data: promotions, error } = await this.supabase
      .from('promotions')
      .select('*')
      .eq('tenant_id', input.tenantId)
      .eq('status', 'active')
      .or('auto_apply.eq.true,requires_code.eq.false');

    if (error) {
      console.error('Error fetching eligible promotions:', error);
      return [];
    }

    // Filter promotions by customer eligibility, time windows, etc.
    return (promotions || []).filter(promotion => {
      return this.isPromotionEligible(promotion, input);
    });
  }

  /**
   * Check if a promotion is eligible for the current order
   */
  private isPromotionEligible(promotion: any, input: PromotionCalculatorInput): boolean {
    // Check minimum order amount
    if (promotion.min_order_amount && input.subtotal < promotion.min_order_amount) {
      return false;
    }

    // Check minimum items quantity
    if (promotion.min_items_quantity) {
      const totalItems = input.cartItems.reduce((sum, item) => sum + item.quantity, 0);
      if (totalItems < promotion.min_items_quantity) {
        return false;
      }
    }

    // Check time windows
    if (!this.isWithinTimeWindow(promotion)) {
      return false;
    }

    // Check customer segment targeting
    if (promotion.target_segment !== 'all_customers') {
      if (!this.isCustomerInSegment(promotion.target_segment, input)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if customer belongs to target segment
   */
  private isCustomerInSegment(segment: string, input: PromotionCalculatorInput): boolean {
    switch (segment) {
      case 'new_customers':
        return !input.orderHistory || input.orderHistory.totalOrders === 0;
      
      case 'returning_customers':
        return input.orderHistory ? input.orderHistory.totalOrders > 0 : false;
      
      case 'vip_customers':
        return input.orderHistory ? input.orderHistory.totalSpent > 1000 : false; // $1000+ spent
      
      case 'inactive_customers':
        return input.orderHistory ? (input.orderHistory.daysSinceLastOrder || 0) > 30 : false;
      
      default:
        return true;
    }
  }

  /**
   * Sort promotions by priority and stacking rules
   */
  private sortPromotionsByPriority(promotions: any[]): any[] {
    return promotions.sort((a, b) => {
      // Higher stack_priority comes first
      if (a.stack_priority !== b.stack_priority) {
        return (b.stack_priority || 0) - (a.stack_priority || 0);
      }
      
      // Then sort by discount amount (higher first)
      const aDiscount = a.discount_amount || 0;
      const bDiscount = b.discount_amount || 0;
      return bDiscount - aDiscount;
    });
  }

  /**
   * Check if promotion can stack with already applied promotions
   */
  private canStackPromotion(promotion: any, appliedIds: Set<string>, allPromotions: any[]): boolean {
    if (appliedIds.size === 0) return true; // First promotion always applies
    
    if (!promotion.can_stack_with_others) return false;
    
    // Check if any applied promotion doesn't allow stacking
    for (const appliedId of appliedIds) {
      const appliedPromotion = allPromotions.find(p => p.id === appliedId);
      if (appliedPromotion && !appliedPromotion.can_stack_with_others) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Validate a promotion code
   */
  async validatePromotionCode(
    tenantId: string,
    code: string,
    userId?: string,
    orderAmount: number = 0
  ): Promise<PromotionValidationResult> {
    const { data, error } = await this.supabase.rpc('validate_promotion_code', {
      p_tenant_id: tenantId,
      p_code: code,
      p_user_id: userId,
      p_order_amount: orderAmount,
    });

    if (error || !data || data.length === 0) {
      return {
        isValid: false,
        promotionId: '',
        promotionCodeId: '',
        errorMessage: 'Invalid promotion code',
        discountPreview: 0,
      };
    }

    const result = data[0];
    return {
      isValid: result.is_valid,
      promotionId: result.promotion_id,
      promotionCodeId: result.promotion_code_id,
      errorMessage: result.error_message,
      discountPreview: result.discount_preview,
    };
  }

  /**
   * Get promotion by ID
   */
  private async getPromotionById(promotionId: string) {
    const { data, error } = await this.supabase
      .from('promotions')
      .select('*')
      .eq('id', promotionId)
      .single();

    if (error) {
      console.error('Error fetching promotion:', error);
      return null;
    }

    return data;
  }

  /**
   * Record promotion usage for analytics
   */
  async recordPromotionUsage(
    promotionId: string,
    orderId: string,
    userId: string | undefined,
    discountAmount: number,
    originalAmount: number,
    promotionCodeId?: string,
    appliedItems?: any[]
  ): Promise<void> {
    const usageData = {
      promotion_id: promotionId,
      promotion_code_id: promotionCodeId,
      order_id: orderId,
      user_id: userId,
      discount_amount: discountAmount,
      original_order_amount: originalAmount,
      final_order_amount: originalAmount - discountAmount,
      applied_items: appliedItems || [],
      created_at: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from('promotion_usage')
      .insert(usageData);

    if (error) {
      console.error('Error recording promotion usage:', error);
    }
  }
}

// Export singleton instance
export const promotionCalculator = new PromotionCalculator();