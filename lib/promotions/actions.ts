/**
 * Promotion Server Actions
 * Server-side actions for promotion management and validation
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { promotionCalculator } from './calculator';
import { getCurrentUser } from '@/lib/auth/session';
import { generateSecureCode } from '@/lib/security/validation';
import QRCode from 'qrcode';

export interface CreatePromotionData {
  name: string;
  description?: string;
  internal_notes?: string;
  promotion_type: string;
  discount_scope: string;
  discount_percentage?: number;
  discount_amount?: number;
  max_discount_amount?: number;
  buy_quantity?: number;
  get_quantity?: number;
  get_discount_percentage?: number;
  min_order_amount: number;
  min_items_quantity: number;
  total_usage_limit?: number;
  per_customer_limit?: number;
  usage_frequency: string;
  valid_from?: string;
  valid_until?: string;
  valid_days: string[];
  valid_hours_start?: string;
  valid_hours_end?: string;
  target_segment: string;
  can_stack_with_others: boolean;
  stack_priority: number;
  auto_apply: boolean;
  requires_code: boolean;
  is_featured: boolean;
  display_banner: boolean;
  banner_text?: string;
  banner_color?: string;
}

export interface CreatePromotionCodeData {
  promotion_id: string;
  code?: string; // If not provided, will be generated
  description?: string;
  usage_limit?: number;
  valid_from?: string;
  valid_until?: string;
  is_single_use: boolean;
  generate_qr: boolean;
}

export interface BulkCodeGenerationData {
  promotion_id: string;
  count: number;
  prefix?: string;
  usage_limit?: number;
  valid_from?: string;
  valid_until?: string;
  is_single_use: boolean;
  generate_qr: boolean;
}

/**
 * Create a new promotion
 */
export async function createPromotion(data: CreatePromotionData) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id || !['restaurant_owner', 'restaurant_staff'].includes(profile.role)) {
      throw new Error('Insufficient permissions');
    }

    // Validate promotion data
    const validationErrors = validatePromotionData(data);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Create promotion
    const { data: promotion, error } = await supabase
      .from('promotions')
      .insert({
        ...data,
        tenant_id: profile.tenant_id,
        created_by: user.id,
        status: 'draft', // Always start as draft
      })
      .select()
      .single();

    if (error) {
      console.error('Database error creating promotion:', error);
      throw new Error('Failed to create promotion');
    }

    revalidatePath('/dashboard/promotions');
    return { success: true, promotion };

  } catch (error) {
    console.error('Error creating promotion:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Update an existing promotion
 */
export async function updatePromotion(promotionId: string, data: Partial<CreatePromotionData>) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Verify ownership
    const { data: promotion } = await supabase
      .from('promotions')
      .select('tenant_id')
      .eq('id', promotionId)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!promotion || promotion.tenant_id !== profile?.tenant_id) {
      throw new Error('Promotion not found or unauthorized');
    }

    if (!['restaurant_owner', 'restaurant_staff'].includes(profile.role)) {
      throw new Error('Insufficient permissions');
    }

    // Update promotion
    const { data: updatedPromotion, error } = await supabase
      .from('promotions')
      .update({
        ...data,
        last_modified_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', promotionId)
      .select()
      .single();

    if (error) {
      console.error('Database error updating promotion:', error);
      throw new Error('Failed to update promotion');
    }

    revalidatePath('/dashboard/promotions');
    return { success: true, promotion: updatedPromotion };

  } catch (error) {
    console.error('Error updating promotion:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Delete a promotion
 */
export async function deletePromotion(promotionId: string) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Verify ownership and check if promotion has been used
    const { data: promotion } = await supabase
      .from('promotions')
      .select('tenant_id, total_uses')
      .eq('id', promotionId)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!promotion || promotion.tenant_id !== profile?.tenant_id) {
      throw new Error('Promotion not found or unauthorized');
    }

    if (!['restaurant_owner', 'restaurant_staff'].includes(profile.role)) {
      throw new Error('Insufficient permissions');
    }

    // Don't allow deletion of used promotions for audit purposes
    if (promotion.total_uses && promotion.total_uses > 0) {
      throw new Error('Cannot delete promotions that have been used. Consider marking as cancelled instead.');
    }

    // Delete promotion (cascades to codes and rules)
    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', promotionId);

    if (error) {
      console.error('Database error deleting promotion:', error);
      throw new Error('Failed to delete promotion');
    }

    revalidatePath('/dashboard/promotions');
    return { success: true };

  } catch (error) {
    console.error('Error deleting promotion:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Toggle promotion status
 */
export async function togglePromotionStatus(promotionId: string, newStatus: string) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Verify ownership
    const { data: promotion } = await supabase
      .from('promotions')
      .select('tenant_id, status')
      .eq('id', promotionId)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!promotion || promotion.tenant_id !== profile?.tenant_id) {
      throw new Error('Promotion not found or unauthorized');
    }

    if (!['restaurant_owner', 'restaurant_staff'].includes(profile.role)) {
      throw new Error('Insufficient permissions');
    }

    // Update status
    const { error } = await supabase
      .from('promotions')
      .update({ 
        status: newStatus,
        last_modified_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', promotionId);

    if (error) {
      console.error('Database error updating promotion status:', error);
      throw new Error('Failed to update promotion status');
    }

    revalidatePath('/dashboard/promotions');
    return { success: true };

  } catch (error) {
    console.error('Error updating promotion status:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Create a promotion code
 */
export async function createPromotionCode(data: CreatePromotionCodeData) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Verify promotion ownership
    const { data: promotion } = await supabase
      .from('promotions')
      .select('tenant_id')
      .eq('id', data.promotion_id)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!promotion || promotion.tenant_id !== profile?.tenant_id) {
      throw new Error('Promotion not found or unauthorized');
    }

    if (!['restaurant_owner', 'restaurant_staff'].includes(profile.role)) {
      throw new Error('Insufficient permissions');
    }

    // Generate code if not provided
    const code = data.code || generateSecureCode(8);

    // Check if code already exists
    const { data: existingCode } = await supabase
      .from('promotion_codes')
      .select('id')
      .eq('code', code)
      .single();

    if (existingCode) {
      throw new Error('Promotion code already exists');
    }

    let qrCodeUrl = null;
    let qrCodeData = null;

    // Generate QR code if requested
    if (data.generate_qr) {
      const qrData = JSON.stringify({
        type: 'promotion',
        code: code,
        tenant_id: profile.tenant_id,
      });
      
      try {
        qrCodeUrl = await QRCode.toDataURL(qrData, {
          width: 256,
          margin: 2,
        });
        qrCodeData = qrData;
      } catch (qrError) {
        console.error('QR code generation failed:', qrError);
        // Continue without QR code
      }
    }

    // Create promotion code
    const { data: promotionCode, error } = await supabase
      .from('promotion_codes')
      .insert({
        promotion_id: data.promotion_id,
        code,
        description: data.description,
        usage_limit: data.usage_limit,
        valid_from: data.valid_from,
        valid_until: data.valid_until,
        is_single_use: data.is_single_use,
        qr_code_url: qrCodeUrl,
        qr_code_data: qrCodeData,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error creating promotion code:', error);
      throw new Error('Failed to create promotion code');
    }

    revalidatePath('/dashboard/promotions');
    return { success: true, promotionCode };

  } catch (error) {
    console.error('Error creating promotion code:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Bulk generate promotion codes
 */
export async function bulkGenerateCodes(data: BulkCodeGenerationData) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Verify promotion ownership
    const { data: promotion } = await supabase
      .from('promotions')
      .select('tenant_id')
      .eq('id', data.promotion_id)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!promotion || promotion.tenant_id !== profile?.tenant_id) {
      throw new Error('Promotion not found or unauthorized');
    }

    if (!['restaurant_owner', 'restaurant_staff'].includes(profile.role)) {
      throw new Error('Insufficient permissions');
    }

    // Generate batch ID for tracking
    const batchId = crypto.randomUUID();
    const codes = [];

    // Generate multiple codes
    for (let i = 0; i < data.count; i++) {
      const code = data.prefix ? 
        `${data.prefix}${generateSecureCode(6)}` : 
        generateSecureCode(10);
      
      let qrCodeUrl = null;
      let qrCodeData = null;

      if (data.generate_qr) {
        const qrData = JSON.stringify({
          type: 'promotion',
          code: code,
          tenant_id: profile.tenant_id,
        });
        
        try {
          qrCodeUrl = await QRCode.toDataURL(qrData, { width: 256, margin: 2 });
          qrCodeData = qrData;
        } catch (qrError) {
          console.error('QR code generation failed for code:', code);
        }
      }

      codes.push({
        promotion_id: data.promotion_id,
        code,
        usage_limit: data.usage_limit,
        valid_from: data.valid_from,
        valid_until: data.valid_until,
        is_single_use: data.is_single_use,
        generated_batch_id: batchId,
        qr_code_url: qrCodeUrl,
        qr_code_data: qrCodeData,
      });
    }

    // Insert all codes
    const { data: createdCodes, error } = await supabase
      .from('promotion_codes')
      .insert(codes)
      .select();

    if (error) {
      console.error('Database error creating promotion codes:', error);
      throw new Error('Failed to create promotion codes');
    }

    revalidatePath('/dashboard/promotions');
    return { 
      success: true, 
      codes: createdCodes,
      batchId 
    };

  } catch (error) {
    console.error('Error bulk generating promotion codes:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Validate promotion code (for customer-facing validation)
 */
export async function validatePromotionCode(
  tenantId: string,
  code: string,
  userId?: string,
  orderAmount: number = 0
) {
  try {
    const result = await promotionCalculator.validatePromotionCode(
      tenantId,
      code,
      userId,
      orderAmount
    );

    return { success: true, result };

  } catch (error) {
    console.error('Error validating promotion code:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      result: {
        isValid: false,
        promotionId: '',
        promotionCodeId: '',
        errorMessage: 'Validation failed',
        discountPreview: 0,
      }
    };
  }
}

/**
 * Calculate promotions for an order
 */
export async function calculateOrderPromotions(
  tenantId: string,
  cartItems: any[],
  subtotal: number,
  deliveryFee: number,
  taxAmount: number,
  promoCodes: string[] = [],
  userId?: string
) {
  try {
    const result = await promotionCalculator.calculatePromotions({
      tenantId,
      userId,
      cartItems,
      subtotal,
      deliveryFee,
      taxAmount,
      promoCodes,
    });

    return { success: true, result };

  } catch (error) {
    console.error('Error calculating promotions:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      result: {
        isValid: false,
        totalDiscount: 0,
        discountBreakdown: [],
        finalPricing: {
          subtotal,
          discountAmount: 0,
          deliveryFee,
          deliveryDiscount: 0,
          taxAmount,
          totalAmount: subtotal + deliveryFee + taxAmount,
        },
        appliedPromotions: [],
        errors: ['Calculation failed'],
        warnings: [],
      }
    };
  }
}

/**
 * Get promotion analytics
 */
export async function getPromotionAnalytics(
  promotionId?: string,
  dateFrom?: string,
  dateTo?: string
) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id || !['restaurant_owner', 'restaurant_staff'].includes(profile.role)) {
      throw new Error('Insufficient permissions');
    }

    let query = supabase
      .from('promotion_analytics')
      .select('*')
      .eq('tenant_id', profile.tenant_id);

    if (promotionId) {
      query = query.eq('promotion_id', promotionId);
    }

    if (dateFrom) {
      query = query.gte('date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('date', dateTo);
    }

    const { data: analytics, error } = await query
      .order('date', { ascending: false });

    if (error) {
      console.error('Database error fetching analytics:', error);
      throw new Error('Failed to fetch analytics');
    }

    return { success: true, analytics };

  } catch (error) {
    console.error('Error fetching promotion analytics:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Validate promotion data
 */
function validatePromotionData(data: CreatePromotionData): string[] {
  const errors: string[] = [];

  if (!data.name?.trim()) {
    errors.push('Name is required');
  }

  if (!data.promotion_type) {
    errors.push('Promotion type is required');
  }

  if (data.promotion_type === 'percentage' && (!data.discount_percentage || data.discount_percentage <= 0 || data.discount_percentage > 100)) {
    errors.push('Discount percentage must be between 1 and 100');
  }

  if (data.promotion_type === 'fixed_amount' && (!data.discount_amount || data.discount_amount <= 0)) {
    errors.push('Discount amount must be greater than 0');
  }

  if (data.promotion_type === 'buy_x_get_y') {
    if (!data.buy_quantity || data.buy_quantity <= 0) {
      errors.push('Buy quantity must be greater than 0');
    }
    if (!data.get_quantity || data.get_quantity <= 0) {
      errors.push('Get quantity must be greater than 0');
    }
  }

  if (data.valid_from && data.valid_until && new Date(data.valid_from) >= new Date(data.valid_until)) {
    errors.push('Valid from date must be before valid until date');
  }

  if (data.valid_hours_start && data.valid_hours_end && data.valid_hours_start >= data.valid_hours_end) {
    errors.push('Valid hours start must be before valid hours end');
  }

  return errors;
}