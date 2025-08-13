'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { RestaurantSettingsSchema } from '@/types'
import type { ApiResponse } from '@/types'

// ===== ONBOARDING SCHEMAS =====

export const OnboardingStepSchema = z.object({
  restaurant: z.object({
    status: z.enum(['pending', 'in_progress', 'completed']),
    data: RestaurantSettingsSchema.partial().optional(),
    completedAt: z.date().optional(),
  }).optional(),
  menu: z.object({
    status: z.enum(['pending', 'in_progress', 'completed']),
    data: z.object({
      method: z.enum(['template', 'import', 'manual']),
      template: z.string().optional(),
      categories: z.array(z.any()).optional(),
      items: z.array(z.any()).optional(),
      itemCount: z.number().optional(),
      skipped: z.boolean().optional(),
    }).optional(),
    completedAt: z.date().optional(),
  }).optional(),
  payment: z.object({
    status: z.enum(['pending', 'in_progress', 'completed']),
    data: z.object({
      stripeAccountId: z.string().optional(),
      skipped: z.boolean().optional(),
    }).optional(),
    completedAt: z.date().optional(),
  }).optional(),
  complete: z.object({
    status: z.enum(['pending', 'in_progress', 'completed']),
    data: z.object({
      checklist: z.array(z.object({
        id: z.string(),
        completed: z.boolean(),
      })).optional(),
    }).optional(),
    completedAt: z.date().optional(),
  }).optional(),
})

export type OnboardingSteps = z.infer<typeof OnboardingStepSchema>

export const OnboardingStatusSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  restaurantId: z.string().uuid().optional(),
  isComplete: z.boolean().default(false),
  currentStep: z.enum(['restaurant', 'menu', 'payment', 'complete']).default('restaurant'),
  steps: OnboardingStepSchema,
  startedAt: z.date(),
  completedAt: z.date().optional(),
  updatedAt: z.date(),
})

export type OnboardingStatus = z.infer<typeof OnboardingStatusSchema>

// ===== ONBOARDING ACTIONS =====

/**
 * Initialize onboarding for a new user
 */
export async function initializeOnboarding(userId: string): Promise<ApiResponse<OnboardingStatus>> {
  try {
    const supabase = createClient()

    // Check if onboarding already exists
    const { data: existing } = await supabase
      .from('onboarding_status')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (existing) {
      return {
        success: true,
        data: existing as OnboardingStatus,
        message: 'Onboarding already initialized'
      }
    }

    // Create new onboarding record
    const onboardingData = {
      user_id: userId,
      is_complete: false,
      current_step: 'restaurant',
      steps: {
        restaurant: { status: 'pending' },
        menu: { status: 'pending' },
        payment: { status: 'pending' },
        complete: { status: 'pending' },
      },
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('onboarding_status')
      .insert(onboardingData)
      .select()
      .single()

    if (error) {
      throw error
    }

    return {
      success: true,
      data: data as OnboardingStatus,
      message: 'Onboarding initialized successfully'
    }

  } catch (error) {
    console.error('Error initializing onboarding:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize onboarding'
    }
  }
}

/**
 * Get current onboarding status
 */
export async function getOnboardingStatus(userId: string): Promise<ApiResponse<OnboardingStatus | null>> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('onboarding_status')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error
    }

    return {
      success: true,
      data: data as OnboardingStatus | null,
    }

  } catch (error) {
    console.error('Error getting onboarding status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get onboarding status'
    }
  }
}

/**
 * Update a specific onboarding step
 */
export async function updateOnboardingStep(
  userId: string,
  stepName: keyof OnboardingSteps,
  stepData: any,
  status: 'pending' | 'in_progress' | 'completed'
): Promise<ApiResponse<OnboardingStatus>> {
  try {
    const supabase = createClient()

    // Get current onboarding status
    const { data: currentStatus, error: fetchError } = await supabase
      .from('onboarding_status')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (!currentStatus) {
      throw new Error('Onboarding not initialized')
    }

    // Update the specific step
    const updatedSteps = { ...currentStatus.steps }
    updatedSteps[stepName] = {
      status,
      data: stepData,
      completedAt: status === 'completed' ? new Date() : undefined,
    }

    // Determine next step and overall completion
    let nextStep = currentStatus.current_step
    let isComplete = false

    if (status === 'completed') {
      switch (stepName) {
        case 'restaurant':
          nextStep = 'menu'
          break
        case 'menu':
          nextStep = 'payment'
          break
        case 'payment':
          nextStep = 'complete'
          break
        case 'complete':
          isComplete = true
          break
      }
    }

    // Handle restaurant step completion - create restaurant record
    if (stepName === 'restaurant' && status === 'completed' && stepData) {
      const restaurantData = {
        name: stepData.name,
        description: stepData.description,
        email: stepData.email,
        phone: stepData.phone,
        website: stepData.website,
        address: {
          street: stepData.street,
          city: stepData.city,
          state: stepData.state,
          zipCode: stepData.zipCode,
          country: stepData.country,
        },
        timezone: stepData.timezone,
        currency: stepData.currency,
        tax_rate: stepData.taxRate / 100, // Convert percentage to decimal
        owner_id: userId,
        slug: stepData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        subdomain: stepData.name.toLowerCase().replace(/[^a-z0-9]+/g, '').substring(0, 20),
        status: 'active',
        subscription_tier: 'basic',
        subscription_status: 'active',
        is_online: true,
        is_accepting_orders: false, // Initially false until fully set up
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert(restaurantData)
        .select()
        .single()

      if (restaurantError) {
        throw restaurantError
      }

      // Create operating hours
      if (stepData.operatingHours) {
        const operatingHoursData = Object.entries(stepData.operatingHours).map(([day, hours]: [string, any]) => ({
          restaurant_id: restaurant.id,
          day_of_week: day,
          is_open: hours.isOpen,
          open_time: hours.isOpen ? hours.openTime : null,
          close_time: hours.isOpen ? hours.closeTime : null,
          is_overnight: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))

        await supabase
          .from('operating_hours')
          .insert(operatingHoursData)
      }

      // Update onboarding with restaurant ID
      currentStatus.restaurant_id = restaurant.id
    }

    // Handle menu step completion
    if (stepName === 'menu' && status === 'completed' && stepData && !stepData.skipped && currentStatus.restaurant_id) {
      const { categories, items } = stepData

      if (categories && categories.length > 0) {
        // Create categories
        const categoryData = categories.map((category: any, index: number) => ({
          restaurant_id: currentStatus.restaurant_id,
          name: category.name,
          description: category.description,
          sort_order: index,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))

        const { data: createdCategories, error: categoryError } = await supabase
          .from('menu_categories')
          .insert(categoryData)
          .select()

        if (categoryError) {
          throw categoryError
        }

        // Create menu items
        if (items && items.length > 0) {
          const categoryMap = new Map(createdCategories.map(cat => [cat.name, cat.id]))
          
          const itemData = items.map((item: any, index: number) => ({
            restaurant_id: currentStatus.restaurant_id,
            category_id: categoryMap.get(item.category) || createdCategories[0].id,
            name: item.name,
            description: item.description,
            price: item.price,
            images: item.image ? [item.image] : [],
            status: 'active',
            is_vegetarian: item.isVegetarian || false,
            is_vegan: item.isVegan || false,
            is_gluten_free: item.isGlutenFree || false,
            allergens: item.allergens || [],
            sort_order: index,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))

          const { error: itemError } = await supabase
            .from('menu_items')
            .insert(itemData)

          if (itemError) {
            throw itemError
          }
        }
      }
    }

    // Update onboarding status
    const updateData = {
      steps: updatedSteps,
      current_step: nextStep,
      is_complete: isComplete,
      completed_at: isComplete ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
      restaurant_id: currentStatus.restaurant_id,
    }

    const { data, error } = await supabase
      .from('onboarding_status')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return {
      success: true,
      data: data as OnboardingStatus,
      message: `${stepName} step ${status}`
    }

  } catch (error) {
    console.error('Error updating onboarding step:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update onboarding step'
    }
  }
}

/**
 * Complete the entire onboarding process
 */
export async function completeOnboarding(userId: string): Promise<ApiResponse<OnboardingStatus>> {
  try {
    const supabase = createClient()

    // Get current onboarding status
    const { data: currentStatus, error: fetchError } = await supabase
      .from('onboarding_status')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (!currentStatus) {
      throw new Error('Onboarding not found')
    }

    if (currentStatus.is_complete) {
      return {
        success: true,
        data: currentStatus as OnboardingStatus,
        message: 'Onboarding already complete'
      }
    }

    // Mark restaurant as accepting orders
    if (currentStatus.restaurant_id) {
      await supabase
        .from('restaurants')
        .update({ 
          is_accepting_orders: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentStatus.restaurant_id)
    }

    // Complete the onboarding
    const updateData = {
      is_complete: true,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('onboarding_status')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return {
      success: true,
      data: data as OnboardingStatus,
      message: 'Onboarding completed successfully'
    }

  } catch (error) {
    console.error('Error completing onboarding:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete onboarding'
    }
  }
}

/**
 * Reset onboarding status (for testing or restarting)
 */
export async function resetOnboarding(userId: string): Promise<ApiResponse<OnboardingStatus>> {
  try {
    const supabase = createClient()

    const resetData = {
      is_complete: false,
      current_step: 'restaurant',
      steps: {
        restaurant: { status: 'pending' },
        menu: { status: 'pending' },
        payment: { status: 'pending' },
        complete: { status: 'pending' },
      },
      completed_at: null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('onboarding_status')
      .update(resetData)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return {
      success: true,
      data: data as OnboardingStatus,
      message: 'Onboarding reset successfully'
    }

  } catch (error) {
    console.error('Error resetting onboarding:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset onboarding'
    }
  }
}

/**
 * Get onboarding analytics (for admin dashboard)
 */
export async function getOnboardingAnalytics(): Promise<ApiResponse<{
  totalStarted: number
  totalCompleted: number
  completionRate: number
  averageTimeToComplete: number
  dropoffByStep: Record<string, number>
}>> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('onboarding_status')
      .select('*')

    if (error) {
      throw error
    }

    const totalStarted = data.length
    const totalCompleted = data.filter(item => item.is_complete).length
    const completionRate = totalStarted > 0 ? (totalCompleted / totalStarted) * 100 : 0

    // Calculate average time to complete (in hours)
    const completedOnboarding = data.filter(item => item.is_complete && item.completed_at)
    const averageTimeToComplete = completedOnboarding.length > 0
      ? completedOnboarding.reduce((acc, item) => {
          const start = new Date(item.started_at).getTime()
          const end = new Date(item.completed_at!).getTime()
          return acc + ((end - start) / (1000 * 60 * 60)) // Convert to hours
        }, 0) / completedOnboarding.length
      : 0

    // Calculate dropoff by step
    const dropoffByStep: Record<string, number> = {
      restaurant: 0,
      menu: 0,
      payment: 0,
      complete: 0,
    }

    data.forEach(item => {
      if (!item.is_complete) {
        dropoffByStep[item.current_step] = (dropoffByStep[item.current_step] || 0) + 1
      }
    })

    return {
      success: true,
      data: {
        totalStarted,
        totalCompleted,
        completionRate,
        averageTimeToComplete,
        dropoffByStep,
      }
    }

  } catch (error) {
    console.error('Error getting onboarding analytics:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get analytics'
    }
  }
}