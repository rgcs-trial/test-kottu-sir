"use server"

import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/types'
import { revalidatePath } from 'next/cache'

type MenuCategory = Database['public']['Tables']['menu_categories']['Row']
type MenuCategoryInsert = Database['public']['Tables']['menu_categories']['Insert']
type MenuCategoryUpdate = Database['public']['Tables']['menu_categories']['Update']
type MenuItem = Database['public']['Tables']['menu_items']['Row']
type MenuItemInsert = Database['public']['Tables']['menu_items']['Insert']
type MenuItemUpdate = Database['public']['Tables']['menu_items']['Update']

// Server-side Supabase client with service role
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Menu Category Actions
export async function createMenuCategory(data: MenuCategoryInsert) {
  try {
    const { data: category, error } = await supabaseAdmin
      .from('menu_categories')
      .insert(data)
      .select()
      .single()

    if (error) {
      console.error('Error creating menu category:', error)
      throw new Error(error.message)
    }

    revalidatePath('/staff/menu')
    return { success: true, data: category }
  } catch (error) {
    console.error('Error in createMenuCategory:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create category' 
    }
  }
}

export async function updateMenuCategory(id: string, data: MenuCategoryUpdate) {
  try {
    const { data: category, error } = await supabaseAdmin
      .from('menu_categories')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating menu category:', error)
      throw new Error(error.message)
    }

    revalidatePath('/staff/menu')
    return { success: true, data: category }
  } catch (error) {
    console.error('Error in updateMenuCategory:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update category' 
    }
  }
}

export async function deleteMenuCategory(id: string) {
  try {
    // First check if category has any menu items
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('menu_items')
      .select('id')
      .eq('category_id', id)
      .limit(1)

    if (itemsError) {
      throw new Error(itemsError.message)
    }

    if (items && items.length > 0) {
      return {
        success: false,
        error: 'Cannot delete category that contains menu items. Please move or delete all items first.'
      }
    }

    const { error } = await supabaseAdmin
      .from('menu_categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting menu category:', error)
      throw new Error(error.message)
    }

    revalidatePath('/staff/menu')
    return { success: true }
  } catch (error) {
    console.error('Error in deleteMenuCategory:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete category' 
    }
  }
}

export async function reorderMenuCategories(categories: { id: string; sort_order: number }[]) {
  try {
    const updatePromises = categories.map(category => 
      supabaseAdmin
        .from('menu_categories')
        .update({ sort_order: category.sort_order })
        .eq('id', category.id)
    )

    const results = await Promise.all(updatePromises)
    
    // Check for any errors
    const errors = results.filter(result => result.error)
    if (errors.length > 0) {
      throw new Error('Failed to reorder some categories')
    }

    revalidatePath('/staff/menu')
    return { success: true }
  } catch (error) {
    console.error('Error in reorderMenuCategories:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to reorder categories' 
    }
  }
}

// Menu Item Actions
export async function createMenuItem(data: MenuItemInsert) {
  try {
    const { data: item, error } = await supabaseAdmin
      .from('menu_items')
      .insert(data)
      .select(`
        *,
        category:menu_categories(*)
      `)
      .single()

    if (error) {
      console.error('Error creating menu item:', error)
      throw new Error(error.message)
    }

    revalidatePath('/staff/menu')
    return { success: true, data: item }
  } catch (error) {
    console.error('Error in createMenuItem:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create menu item' 
    }
  }
}

export async function updateMenuItem(id: string, data: MenuItemUpdate) {
  try {
    const { data: item, error } = await supabaseAdmin
      .from('menu_items')
      .update(data)
      .eq('id', id)
      .select(`
        *,
        category:menu_categories(*)
      `)
      .single()

    if (error) {
      console.error('Error updating menu item:', error)
      throw new Error(error.message)
    }

    revalidatePath('/staff/menu')
    return { success: true, data: item }
  } catch (error) {
    console.error('Error in updateMenuItem:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update menu item' 
    }
  }
}

export async function deleteMenuItem(id: string) {
  try {
    const { error } = await supabaseAdmin
      .from('menu_items')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting menu item:', error)
      throw new Error(error.message)
    }

    revalidatePath('/staff/menu')
    return { success: true }
  } catch (error) {
    console.error('Error in deleteMenuItem:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete menu item' 
    }
  }
}

export async function duplicateMenuItem(id: string) {
  try {
    // First get the original item
    const { data: originalItem, error: fetchError } = await supabaseAdmin
      .from('menu_items')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      throw new Error(fetchError.message)
    }

    // Create a copy with modified name
    const { id: _, created_at, updated_at, ...itemData } = originalItem
    const duplicateData = {
      ...itemData,
      name: `${originalItem.name} (Copy)`,
      sort_order: originalItem.sort_order + 1
    }

    const { data: newItem, error: insertError } = await supabaseAdmin
      .from('menu_items')
      .insert(duplicateData)
      .select(`
        *,
        category:menu_categories(*)
      `)
      .single()

    if (insertError) {
      throw new Error(insertError.message)
    }

    revalidatePath('/staff/menu')
    return { success: true, data: newItem }
  } catch (error) {
    console.error('Error in duplicateMenuItem:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to duplicate menu item' 
    }
  }
}

// Menu Data Fetching
export async function getMenuCategories(restaurantId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('menu_categories')
      .select(`
        *,
        menu_items:menu_items(count)
      `)
      .eq('restaurant_id', restaurantId)
      .order('sort_order', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in getMenuCategories:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch categories' 
    }
  }
}

export async function getMenuItems(restaurantId: string, categoryId?: string) {
  try {
    let query = supabaseAdmin
      .from('menu_items')
      .select(`
        *,
        category:menu_categories(*)
      `)
      .eq('restaurant_id', restaurantId)

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data, error } = await query.order('sort_order', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in getMenuItems:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch menu items' 
    }
  }
}

export async function getFullMenu(restaurantId: string) {
  try {
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('menu_categories')
      .select(`
        *,
        menu_items:menu_items(*)
      `)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (categoriesError) {
      throw new Error(categoriesError.message)
    }

    // Sort menu items within each category
    const sortedCategories = categories.map(category => ({
      ...category,
      menu_items: (category.menu_items || []).sort((a, b) => a.sort_order - b.sort_order)
    }))

    return { success: true, data: sortedCategories }
  } catch (error) {
    console.error('Error in getFullMenu:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch full menu' 
    }
  }
}

// Bulk Operations
export async function bulkUpdateMenuItemStatus(
  itemIds: string[], 
  status: 'active' | 'inactive' | 'out_of_stock'
) {
  try {
    const { error } = await supabaseAdmin
      .from('menu_items')
      .update({ status })
      .in('id', itemIds)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath('/staff/menu')
    return { success: true }
  } catch (error) {
    console.error('Error in bulkUpdateMenuItemStatus:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update items' 
    }
  }
}

export async function bulkDeleteMenuItems(itemIds: string[]) {
  try {
    const { error } = await supabaseAdmin
      .from('menu_items')
      .delete()
      .in('id', itemIds)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath('/staff/menu')
    return { success: true }
  } catch (error) {
    console.error('Error in bulkDeleteMenuItems:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete items' 
    }
  }
}