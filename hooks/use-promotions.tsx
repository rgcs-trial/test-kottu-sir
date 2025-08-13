'use client';

/**
 * Promotions Management Hook
 * Centralized state management for promotions functionality
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  createPromotion,
  updatePromotion,
  deletePromotion,
  togglePromotionStatus,
  validatePromotionCode,
  calculateOrderPromotions,
  createPromotionCode,
  bulkGenerateCodes,
} from '@/lib/promotions/actions';

interface UsePromotionsOptions {
  tenantId?: string;
  autoFetch?: boolean;
  includeInactive?: boolean;
}

interface PromotionCalculationInput {
  cartItems: any[];
  subtotal: number;
  deliveryFee?: number;
  taxAmount?: number;
  promoCodes?: string[];
  userId?: string;
}

export function usePromotions(options: UsePromotionsOptions = {}) {
  const { tenantId, autoFetch = false, includeInactive = false } = options;
  
  // Core state
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering and pagination
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'name' | 'total_uses' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const supabase = createClient();

  // Fetch promotions
  const fetchPromotions = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('promotions')
        .select(`
          id,
          name,
          description,
          internal_notes,
          promotion_type,
          status,
          discount_scope,
          discount_percentage,
          discount_amount,
          max_discount_amount,
          buy_quantity,
          get_quantity,
          get_discount_percentage,
          min_order_amount,
          min_items_quantity,
          total_usage_limit,
          per_customer_limit,
          usage_frequency,
          total_uses,
          total_discount_given,
          valid_from,
          valid_until,
          valid_days,
          valid_hours_start,
          valid_hours_end,
          target_segment,
          can_stack_with_others,
          stack_priority,
          auto_apply,
          requires_code,
          is_featured,
          display_banner,
          banner_text,
          banner_color,
          created_at,
          updated_at,
          created_by,
          last_modified_by
        `)
        .eq('tenant_id', tenantId);

      if (!includeInactive) {
        query = query.neq('status', 'cancelled');
      }

      const { data, error: fetchError } = await query
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (fetchError) throw fetchError;

      setPromotions(data || []);
    } catch (err) {
      console.error('Error fetching promotions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch promotions');
    } finally {
      setLoading(false);
    }
  }, [tenantId, includeInactive, sortBy, sortOrder, supabase]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchPromotions();
    }
  }, [fetchPromotions, autoFetch]);

  // Filtered promotions
  const filteredPromotions = useMemo(() => {
    return promotions.filter(promotion => {
      // Status filter
      if (statusFilter !== 'all' && promotion.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          promotion.name.toLowerCase().includes(searchLower) ||
          promotion.description?.toLowerCase().includes(searchLower) ||
          promotion.promotion_type.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [promotions, statusFilter, searchTerm]);

  // Analytics summary
  const analyticsData = useMemo(() => {
    const activePromotions = promotions.filter(p => p.status === 'active');
    const totalUses = promotions.reduce((sum, p) => sum + (p.total_uses || 0), 0);
    const totalDiscountGiven = promotions.reduce((sum, p) => sum + (p.total_discount_given || 0), 0);
    
    return {
      totalPromotions: promotions.length,
      activePromotions: activePromotions.length,
      totalUses,
      totalDiscountGiven,
      averageDiscount: totalUses > 0 ? totalDiscountGiven / totalUses : 0,
    };
  }, [promotions]);

  // Create new promotion
  const createNewPromotion = useCallback(async (promotionData: any) => {
    setLoading(true);
    try {
      const result = await createPromotion(promotionData);
      if (result.success) {
        await fetchPromotions(); // Refresh list
        toast.success('Promotion created successfully');
        return { success: true, promotion: result.promotion };
      } else {
        toast.error(result.error || 'Failed to create promotion');
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [fetchPromotions]);

  // Update promotion
  const updateExistingPromotion = useCallback(async (promotionId: string, promotionData: any) => {
    setLoading(true);
    try {
      const result = await updatePromotion(promotionId, promotionData);
      if (result.success) {
        await fetchPromotions(); // Refresh list
        toast.success('Promotion updated successfully');
        return { success: true, promotion: result.promotion };
      } else {
        toast.error(result.error || 'Failed to update promotion');
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [fetchPromotions]);

  // Delete promotion
  const deleteExistingPromotion = useCallback(async (promotionId: string) => {
    setLoading(true);
    try {
      const result = await deletePromotion(promotionId);
      if (result.success) {
        await fetchPromotions(); // Refresh list
        toast.success('Promotion deleted successfully');
        return { success: true };
      } else {
        toast.error(result.error || 'Failed to delete promotion');
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [fetchPromotions]);

  // Toggle promotion status
  const toggleStatus = useCallback(async (promotionId: string, newStatus: string) => {
    setLoading(true);
    try {
      const result = await togglePromotionStatus(promotionId, newStatus);
      if (result.success) {
        await fetchPromotions(); // Refresh list
        toast.success(`Promotion ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
        return { success: true };
      } else {
        toast.error(result.error || 'Failed to update promotion status');
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [fetchPromotions]);

  return {
    // Data
    promotions: filteredPromotions,
    allPromotions: promotions,
    analyticsData,
    
    // State
    loading,
    error,
    
    // Filters
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    
    // Actions
    fetchPromotions,
    createPromotion: createNewPromotion,
    updatePromotion: updateExistingPromotion,
    deletePromotion: deleteExistingPromotion,
    togglePromotionStatus: toggleStatus,
    
    // Utilities
    refreshData: fetchPromotions,
  };
}

// Hook for promotion code validation and calculation
export function usePromotionCalculation(tenantId: string) {
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [appliedCodes, setAppliedCodes] = useState<string[]>([]);
  
  // Validate single promotion code
  const validateCode = useCallback(async (
    code: string, 
    orderAmount: number = 0,
    userId?: string
  ) => {
    if (!code.trim()) return null;

    setIsValidating(true);
    try {
      const result = await validatePromotionCode(tenantId, code.trim(), userId, orderAmount);
      return result;
    } catch (error) {
      console.error('Code validation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed',
        result: {
          isValid: false,
          promotionId: '',
          promotionCodeId: '',
          errorMessage: 'Validation failed',
          discountPreview: 0,
        }
      };
    } finally {
      setIsValidating(false);
    }
  }, [tenantId]);

  // Calculate promotions for complete order
  const calculatePromotions = useCallback(async (input: PromotionCalculationInput) => {
    setIsValidating(true);
    try {
      const result = await calculateOrderPromotions(
        tenantId,
        input.cartItems,
        input.subtotal,
        input.deliveryFee || 0,
        input.taxAmount || 0,
        input.promoCodes || [],
        input.userId
      );
      
      if (result.success) {
        setCalculationResult(result.result);
        setAppliedCodes(input.promoCodes || []);
      }
      
      return result;
    } catch (error) {
      console.error('Promotion calculation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Calculation failed'
      };
    } finally {
      setIsValidating(false);
    }
  }, [tenantId]);

  // Add promotion code
  const addCode = useCallback(async (code: string, calculationInput: PromotionCalculationInput) => {
    if (appliedCodes.includes(code.trim())) {
      toast.error('This code is already applied');
      return;
    }

    const newCodes = [...appliedCodes, code.trim()];
    const result = await calculatePromotions({
      ...calculationInput,
      promoCodes: newCodes,
    });

    if (result.success && result.result?.appliedPromotions?.length > appliedCodes.length) {
      toast.success('Promotion code applied successfully!');
    } else {
      toast.error('Invalid or inapplicable promotion code');
    }
  }, [appliedCodes, calculatePromotions]);

  // Remove promotion code
  const removeCode = useCallback(async (code: string, calculationInput: PromotionCalculationInput) => {
    const newCodes = appliedCodes.filter(c => c !== code);
    setAppliedCodes(newCodes);
    
    if (newCodes.length > 0) {
      await calculatePromotions({
        ...calculationInput,
        promoCodes: newCodes,
      });
    } else {
      setCalculationResult(null);
    }
    
    toast.info('Promotion code removed');
  }, [appliedCodes, calculatePromotions]);

  // Clear all codes
  const clearCodes = useCallback(() => {
    setAppliedCodes([]);
    setCalculationResult(null);
    toast.info('All promotion codes cleared');
  }, []);

  return {
    // Data
    calculationResult,
    appliedCodes,
    
    // State
    isValidating,
    
    // Actions
    validateCode,
    calculatePromotions,
    addCode,
    removeCode,
    clearCodes,
    
    // Utilities
    hasAppliedPromotions: calculationResult?.appliedPromotions?.length > 0,
    totalDiscount: calculationResult?.totalDiscount || 0,
    finalPricing: calculationResult?.finalPricing,
  };
}

// Hook for promotion code management
export function usePromotionCodes(promotionId?: string) {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  // Fetch codes for a promotion
  const fetchCodes = useCallback(async () => {
    if (!promotionId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('promotion_codes')
        .select('*')
        .eq('promotion_id', promotionId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setCodes(data || []);
    } catch (err) {
      console.error('Error fetching promotion codes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch codes');
    } finally {
      setLoading(false);
    }
  }, [promotionId, supabase]);

  // Create single code
  const createCode = useCallback(async (codeData: any) => {
    if (!promotionId) return { success: false, error: 'No promotion ID' };

    setLoading(true);
    try {
      const result = await createPromotionCode({
        ...codeData,
        promotion_id: promotionId,
      });
      
      if (result.success) {
        await fetchCodes(); // Refresh list
        toast.success('Promotion code created successfully');
      } else {
        toast.error(result.error || 'Failed to create code');
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [promotionId, fetchCodes]);

  // Bulk generate codes
  const bulkGenerate = useCallback(async (bulkData: any) => {
    if (!promotionId) return { success: false, error: 'No promotion ID' };

    setLoading(true);
    try {
      const result = await bulkGenerateCodes({
        ...bulkData,
        promotion_id: promotionId,
      });
      
      if (result.success) {
        await fetchCodes(); // Refresh list
        toast.success(`${bulkData.count} codes generated successfully`);
      } else {
        toast.error(result.error || 'Failed to generate codes');
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [promotionId, fetchCodes]);

  // Auto-fetch codes when promotion ID changes
  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  return {
    // Data
    codes,
    
    // State
    loading,
    error,
    
    // Actions
    fetchCodes,
    createCode,
    bulkGenerate,
    
    // Utilities
    totalCodes: codes.length,
    usedCodes: codes.filter(c => c.current_usage > 0).length,
    activeCodes: codes.filter(c => c.is_active).length,
  };
}