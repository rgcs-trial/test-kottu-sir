"use client"

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/types'
import {
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
  reorderMenuCategories,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  duplicateMenuItem,
  getMenuCategories,
  getMenuItems,
  getFullMenu,
  bulkUpdateMenuItemStatus,
  bulkDeleteMenuItems
} from '@/lib/menu/actions'

type MenuCategory = Database['public']['Tables']['menu_categories']['Row'] & {
  menu_items?: { count: number } | Database['public']['Tables']['menu_items']['Row'][]
}
type MenuCategoryInsert = Database['public']['Tables']['menu_categories']['Insert']
type MenuCategoryUpdate = Database['public']['Tables']['menu_categories']['Update']

type MenuItem = Database['public']['Tables']['menu_items']['Row'] & {
  category?: Database['public']['Tables']['menu_categories']['Row']
}
type MenuItemInsert = Database['public']['Tables']['menu_items']['Insert']
type MenuItemUpdate = Database['public']['Tables']['menu_items']['Update']

export interface UseMenuProps {
  restaurantId: string
  enableRealtime?: boolean
}

export interface UseMenuReturn {
  // State
  categories: MenuCategory[]
  items: MenuItem[]
  isLoading: boolean
  error: string | null

  // Category operations
  createCategory: (data: MenuCategoryInsert) => Promise<{ success: boolean; error?: string; data?: MenuCategory }>
  updateCategory: (id: string, data: MenuCategoryUpdate) => Promise<{ success: boolean; error?: string; data?: MenuCategory }>
  deleteCategory: (id: string) => Promise<{ success: boolean; error?: string }>
  reorderCategories: (categories: MenuCategory[]) => Promise<{ success: boolean; error?: string }>
  toggleCategoryVisibility: (category: MenuCategory) => Promise<{ success: boolean; error?: string }>

  // Item operations
  createItem: (data: MenuItemInsert) => Promise<{ success: boolean; error?: string; data?: MenuItem }>
  updateItem: (id: string, data: MenuItemUpdate) => Promise<{ success: boolean; error?: string; data?: MenuItem }>
  deleteItem: (id: string) => Promise<{ success: boolean; error?: string }>
  duplicateItem: (id: string) => Promise<{ success: boolean; error?: string; data?: MenuItem }>

  // Bulk operations
  bulkUpdateItemStatus: (itemIds: string[], status: 'active' | 'inactive' | 'out_of_stock') => Promise<{ success: boolean; error?: string }>
  bulkDeleteItems: (itemIds: string[]) => Promise<{ success: boolean; error?: string }>

  // Data fetching
  refetchCategories: () => Promise<void>
  refetchItems: (categoryId?: string) => Promise<void>
  refetchAll: () => Promise<void>
  getFullMenuData: () => Promise<{ success: boolean; data?: any; error?: string }>
}

export function useMenu({ restaurantId, enableRealtime = true }: UseMenuProps): UseMenuReturn {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  // Fetch categories
  const refetchCategories = useCallback(async () => {
    try {
      const result = await getMenuCategories(restaurantId)
      if (result.success && result.data) {
        setCategories(result.data)
      } else {
        setError(result.error || 'Failed to fetch categories')
      }
    } catch (err) {
      setError('Failed to fetch categories')
      console.error('Error fetching categories:', err)
    }
  }, [restaurantId])

  // Fetch items
  const refetchItems = useCallback(async (categoryId?: string) => {
    try {
      const result = await getMenuItems(restaurantId, categoryId)
      if (result.success && result.data) {
        setItems(result.data)
      } else {
        setError(result.error || 'Failed to fetch items')
      }
    } catch (err) {
      setError('Failed to fetch items')
      console.error('Error fetching items:', err)
    }
  }, [restaurantId])

  // Fetch all data
  const refetchAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      await Promise.all([refetchCategories(), refetchItems()])
    } catch (err) {
      setError('Failed to fetch menu data')
    } finally {
      setIsLoading(false)
    }
  }, [refetchCategories, refetchItems])

  // Get full menu data for preview
  const getFullMenuData = useCallback(async () => {
    return await getFullMenu(restaurantId)
  }, [restaurantId])

  // Category operations
  const createCategory = useCallback(async (data: MenuCategoryInsert) => {
    const result = await createMenuCategory(data)
    if (result.success) {
      await refetchCategories()
    }
    return result
  }, [refetchCategories])

  const updateCategory = useCallback(async (id: string, data: MenuCategoryUpdate) => {
    const result = await updateMenuCategory(id, data)
    if (result.success) {
      await refetchCategories()
    }
    return result
  }, [refetchCategories])

  const deleteCategory = useCallback(async (id: string) => {
    const result = await deleteMenuCategory(id)
    if (result.success) {
      await refetchCategories()
      await refetchItems() // Refresh items as well
    }
    return result
  }, [refetchCategories, refetchItems])

  const reorderCategories = useCallback(async (reorderedCategories: MenuCategory[]) => {
    // Optimistically update UI
    setCategories(reorderedCategories)
    
    const categoryUpdates = reorderedCategories.map(cat => ({
      id: cat.id,
      sort_order: cat.sort_order
    }))
    
    const result = await reorderMenuCategories(categoryUpdates)
    if (!result.success) {
      // Revert on failure
      await refetchCategories()
    }
    return result
  }, [refetchCategories])

  const toggleCategoryVisibility = useCallback(async (category: MenuCategory) => {
    return await updateCategory(category.id, { is_active: !category.is_active })
  }, [updateCategory])

  // Item operations
  const createItem = useCallback(async (data: MenuItemInsert) => {
    const result = await createMenuItem(data)
    if (result.success) {
      await refetchItems()
    }
    return result
  }, [refetchItems])

  const updateItem = useCallback(async (id: string, data: MenuItemUpdate) => {
    const result = await updateMenuItem(id, data)
    if (result.success) {
      await refetchItems()
    }
    return result
  }, [refetchItems])

  const deleteItem = useCallback(async (id: string) => {
    const result = await deleteMenuItem(id)
    if (result.success) {
      await refetchItems()
    }
    return result
  }, [refetchItems])

  const duplicateItem = useCallback(async (id: string) => {
    const result = await duplicateMenuItem(id)
    if (result.success) {
      await refetchItems()
    }
    return result
  }, [refetchItems])

  // Bulk operations
  const bulkUpdateItemStatus = useCallback(async (
    itemIds: string[], 
    status: 'active' | 'inactive' | 'out_of_stock'
  ) => {
    const result = await bulkUpdateMenuItemStatus(itemIds, status)
    if (result.success) {
      await refetchItems()
    }
    return result
  }, [refetchItems])

  const bulkDeleteItems = useCallback(async (itemIds: string[]) => {
    const result = await bulkDeleteMenuItems(itemIds)
    if (result.success) {
      await refetchItems()
    }
    return result
  }, [refetchItems])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!enableRealtime) return

    const channel = supabase
      .channel('menu-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_categories',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        () => {
          refetchCategories()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        () => {
          refetchItems()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [restaurantId, enableRealtime, refetchCategories, refetchItems, supabase])

  // Initial data load
  useEffect(() => {
    refetchAll()
  }, [refetchAll])

  return {
    // State
    categories,
    items,
    isLoading,
    error,

    // Category operations
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    toggleCategoryVisibility,

    // Item operations
    createItem,
    updateItem,
    deleteItem,
    duplicateItem,

    // Bulk operations
    bulkUpdateItemStatus,
    bulkDeleteItems,

    // Data fetching
    refetchCategories,
    refetchItems,
    refetchAll,
    getFullMenuData
  }
}