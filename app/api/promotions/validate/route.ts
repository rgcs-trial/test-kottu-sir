/**
 * Promotion Code Validation API Endpoint
 * Handles promotion code validation and discount calculation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { promotionCalculator } from '@/lib/promotions/calculator';
import { getCurrentUser } from '@/lib/auth/session';
import { z } from 'zod';

// Validation schema for promotion validation request
const validatePromotionSchema = z.object({
  tenantId: z.string().uuid('Invalid tenant ID'),
  code: z.string().min(1, 'Promotion code is required').max(50, 'Code too long'),
  orderAmount: z.number().min(0, 'Order amount must be non-negative').optional(),
  cartItems: z.array(z.object({
    menu_item_id: z.string().uuid(),
    name: z.string(),
    quantity: z.number().positive(),
    unit_price: z.number().positive(),
  })).optional(),
  deliveryFee: z.number().min(0).optional().default(0),
  taxAmount: z.number().min(0).optional().default(0),
});

// Validation schema for bulk promotion calculation
const calculatePromotionsSchema = z.object({
  tenantId: z.string().uuid('Invalid tenant ID'),
  cartItems: z.array(z.object({
    menu_item_id: z.string().uuid(),
    name: z.string(),
    quantity: z.number().positive(),
    unit_price: z.number().positive(),
    category_id: z.string().uuid().optional(),
  })),
  subtotal: z.number().positive('Subtotal must be positive'),
  deliveryFee: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  promoCodes: z.array(z.string()).optional().default([]),
});

/**
 * POST /api/promotions/validate
 * Validate a single promotion code and calculate discount
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = validatePromotionSchema.parse(body);

    // Get current user (optional for guest checkout)
    const user = await getCurrentUser();
    const userId = user?.id;

    // Validate the promotion code
    const validationResult = await promotionCalculator.validatePromotionCode(
      validatedData.tenantId,
      validatedData.code,
      userId,
      validatedData.orderAmount
    );

    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.errorMessage,
          isValid: false,
          discountPreview: 0,
        },
        { status: 400 }
      );
    }

    // If cart items provided, calculate detailed discount
    let detailedCalculation = null;
    if (validatedData.cartItems && validatedData.orderAmount) {
      const calculationResult = await promotionCalculator.calculatePromotions({
        tenantId: validatedData.tenantId,
        userId,
        cartItems: validatedData.cartItems,
        subtotal: validatedData.orderAmount,
        deliveryFee: validatedData.deliveryFee,
        taxAmount: validatedData.taxAmount,
        promoCodes: [validatedData.code],
      });

      detailedCalculation = calculationResult;
    }

    // Log validation event for analytics
    await logPromotionEvent('validation', {
      tenantId: validatedData.tenantId,
      promotionId: validationResult.promotionId,
      code: validatedData.code,
      userId,
      orderAmount: validatedData.orderAmount,
      success: true,
    });

    return NextResponse.json({
      success: true,
      isValid: true,
      promotionId: validationResult.promotionId,
      promotionCodeId: validationResult.promotionCodeId,
      discountPreview: validationResult.discountPreview,
      detailedCalculation,
    });

  } catch (error) {
    console.error('Promotion validation error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        isValid: false,
        discountPreview: 0,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/promotions/validate
 * Calculate promotions for complete order (multiple codes + auto-apply)
 */
export async function PUT(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = calculatePromotionsSchema.parse(body);

    // Get current user (optional for guest checkout)
    const user = await getCurrentUser();
    const userId = user?.id;

    // Get customer order history for segment targeting
    let orderHistory = undefined;
    if (userId) {
      orderHistory = await getCustomerOrderHistory(validatedData.tenantId, userId);
    }

    // Calculate all applicable promotions
    const calculationResult = await promotionCalculator.calculatePromotions({
      tenantId: validatedData.tenantId,
      userId,
      cartItems: validatedData.cartItems,
      subtotal: validatedData.subtotal,
      deliveryFee: validatedData.deliveryFee,
      taxAmount: validatedData.taxAmount,
      promoCodes: validatedData.promoCodes,
      orderHistory,
    });

    // Log calculation event for analytics
    await logPromotionEvent('calculation', {
      tenantId: validatedData.tenantId,
      userId,
      orderAmount: validatedData.subtotal,
      promoCodes: validatedData.promoCodes,
      success: calculationResult.isValid,
      totalDiscount: calculationResult.totalDiscount,
    });

    return NextResponse.json({
      success: true,
      result: calculationResult,
    });

  } catch (error) {
    console.error('Promotion calculation error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        result: {
          isValid: false,
          totalDiscount: 0,
          discountBreakdown: [],
          finalPricing: {
            subtotal: 0,
            discountAmount: 0,
            deliveryFee: 0,
            deliveryDiscount: 0,
            taxAmount: 0,
            totalAmount: 0,
          },
          appliedPromotions: [],
          errors: ['Server error'],
          warnings: [],
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/promotions/validate?tenantId=xxx
 * Get all auto-apply eligible promotions for display
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Validate tenant ID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tenant ID format' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const user = await getCurrentUser();

    // Get active promotions that can be displayed to customers
    const { data: promotions, error } = await supabase
      .from('promotions')
      .select(`
        id,
        name,
        description,
        promotion_type,
        discount_percentage,
        discount_amount,
        max_discount_amount,
        min_order_amount,
        is_featured,
        display_banner,
        banner_text,
        banner_color,
        auto_apply,
        requires_code,
        valid_from,
        valid_until,
        valid_days,
        valid_hours_start,
        valid_hours_end,
        target_segment
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .or('display_banner.eq.true,is_featured.eq.true,auto_apply.eq.true')
      .order('stack_priority', { ascending: false });

    if (error) {
      console.error('Database error fetching promotions:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch promotions' },
        { status: 500 }
      );
    }

    // Filter promotions by time and customer eligibility
    const now = new Date();
    const currentDay = now.toLocaleDateString('en', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toTimeString().slice(0, 5);

    const eligiblePromotions = (promotions || []).filter(promotion => {
      // Check date range
      if (promotion.valid_from && now < new Date(promotion.valid_from)) return false;
      if (promotion.valid_until && now > new Date(promotion.valid_until)) return false;
      
      // Check day of week
      if (promotion.valid_days?.length && !promotion.valid_days.includes(currentDay)) return false;
      
      // Check time window
      if (promotion.valid_hours_start && promotion.valid_hours_end) {
        if (currentTime < promotion.valid_hours_start || currentTime > promotion.valid_hours_end) {
          return false;
        }
      }
      
      return true;
    });

    return NextResponse.json({
      success: true,
      promotions: eligiblePromotions,
    });

  } catch (error) {
    console.error('Error fetching eligible promotions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get customer order history for segment targeting
 */
async function getCustomerOrderHistory(tenantId: string, userId: string) {
  try {
    const supabase = createClient();
    
    const { data: orderStats } = await supabase
      .from('orders')
      .select('total_amount, created_at')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false });

    if (!orderStats?.length) {
      return {
        totalOrders: 0,
        totalSpent: 0,
        daysSinceLastOrder: undefined,
      };
    }

    const totalOrders = orderStats.length;
    const totalSpent = orderStats.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
    const lastOrderDate = new Date(orderStats[0].created_at);
    const daysSinceLastOrder = Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      totalOrders,
      totalSpent,
      daysSinceLastOrder,
    };

  } catch (error) {
    console.error('Error fetching customer order history:', error);
    return {
      totalOrders: 0,
      totalSpent: 0,
      daysSinceLastOrder: undefined,
    };
  }
}

/**
 * Log promotion events for analytics
 */
async function logPromotionEvent(eventType: string, data: any) {
  try {
    const supabase = createClient();

    // This could be expanded to a more comprehensive event logging system
    await supabase
      .from('promotion_analytics')
      .upsert({
        tenant_id: data.tenantId,
        promotion_id: data.promotionId,
        date: new Date().toISOString().split('T')[0],
        hour: new Date().getHours(),
        views: eventType === 'view' ? 1 : 0,
        applications: eventType === 'validation' && data.success ? 1 : 0,
      }, {
        onConflict: 'tenant_id,promotion_id,date,hour',
        ignoreDuplicates: false,
      });

  } catch (error) {
    // Log event failures shouldn't block the main operation
    console.error('Failed to log promotion event:', error);
  }
}