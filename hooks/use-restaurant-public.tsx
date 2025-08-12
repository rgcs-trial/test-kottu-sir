'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Restaurant = Database['public']['Tables']['restaurants']['Row']
type MenuCategory = Database['public']['Tables']['menu_categories']['Row']
type MenuItem = Database['public']['Tables']['menu_items']['Row']
type MenuVariant = Database['public']['Tables']['menu_variants']['Row']
type MenuModifier = Database['public']['Tables']['menu_modifiers']['Row']
type MenuModifierOption = Database['public']['Tables']['menu_modifier_options']['Row']

// Enhanced types with relationships
export interface MenuItemWithRelations extends MenuItem {
  category: MenuCategory
  variants: MenuVariant[]
  modifiers: Array<MenuModifier & {
    options: MenuModifierOption[]
  }>
}

export interface MenuCategoryWithItems extends MenuCategory {
  items: MenuItemWithRelations[]
}

export interface RestaurantWithMenu extends Restaurant {
  categories: MenuCategoryWithItems[]
  operatingHours?: OperatingHours[]
  deliveryZones?: DeliveryZone[]
}

interface OperatingHours {
  id: string
  restaurant_id: string
  day_of_week: number
  is_open: boolean
  open_time: string | null
  close_time: string | null
  is_overnight: boolean
}

interface DeliveryZone {
  id: string
  restaurant_id: string
  name: string
  delivery_fee: number
  minimum_order: number
  estimated_delivery_time: number
  is_active: boolean
  zip_codes: string[]
  radius: number | null
}

interface UseRestaurantPublicReturn {
  restaurant: RestaurantWithMenu | null
  menu: MenuCategoryWithItems[]
  loading: boolean
  error: string | null
  isOpen: boolean
  isAcceptingOrders: boolean
  operatingHours: OperatingHours[]
  deliveryZones: DeliveryZone[]
  
  // Helper functions
  getMenuItemById: (id: string) => MenuItemWithRelations | null
  getCategoryById: (id: string) => MenuCategoryWithItems | null
  checkDeliveryAvailability: (zipCode: string) => DeliveryZone | null
  getEstimatedDeliveryTime: (zipCode: string) => number | null
  getDeliveryFee: (zipCode: string) => number | null
  refreshMenu: () => Promise<void>
}

export function useRestaurantPublic(subdomain?: string): UseRestaurantPublicReturn {
  const [restaurant, setRestaurant] = useState<RestaurantWithMenu | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchRestaurantData = async (subdomainToFetch?: string) => {
    try {
      setLoading(true)
      setError(null)

      // If no subdomain provided, try to get from current host
      let targetSubdomain = subdomainToFetch
      if (!targetSubdomain && typeof window !== 'undefined') {
        const hostname = window.location.hostname
        // Extract subdomain from hostname (assuming format: subdomain.domain.com)
        const parts = hostname.split('.')
        if (parts.length > 2) {
          targetSubdomain = parts[0]
        }
      }

      if (!targetSubdomain) {
        throw new Error('No subdomain provided')
      }

      // Fetch restaurant by subdomain
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('subdomain', targetSubdomain)
        .eq('status', 'active')
        .single()

      if (restaurantError || !restaurantData) {
        throw new Error('Restaurant not found or inactive')
      }

      // Fetch menu categories with items
      const { data: categories, error: categoriesError } = await supabase
        .from('menu_categories')
        .select(`
          *,
          menu_items (
            *,
            menu_variants (*),
            menu_item_modifiers (
              modifier_id,
              menu_modifiers (
                *,
                menu_modifier_options (*)
              )
            )
          )
        `)
        .eq('restaurant_id', restaurantData.id)
        .eq('is_active', true)
        .order('sort_order')

      if (categoriesError) {
        throw new Error('Failed to fetch menu categories')
      }

      // Fetch operating hours
      const { data: operatingHours, error: hoursError } = await supabase
        .from('operating_hours')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .order('day_of_week')

      // Fetch delivery zones
      const { data: deliveryZones, error: zonesError } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .eq('is_active', true)

      // Transform the data structure
      const transformedCategories: MenuCategoryWithItems[] = (categories || []).map(category => ({
        ...category,
        items: (category.menu_items || [])
          .filter((item: any) => item.status === 'active')
          .map((item: any) => ({
            ...item,
            category: category,
            variants: item.menu_variants || [],
            modifiers: (item.menu_item_modifiers || [])
              .map((im: any) => ({
                ...im.menu_modifiers,
                options: im.menu_modifiers?.menu_modifier_options || []
              }))
              .filter((modifier: any) => modifier.is_active)
          }))
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
      })).filter(category => category.items.length > 0)

      const restaurantWithMenu: RestaurantWithMenu = {
        ...restaurantData,
        categories: transformedCategories,
        operatingHours: operatingHours || [],
        deliveryZones: deliveryZones || []
      }

      setRestaurant(restaurantWithMenu)
    } catch (err) {
      console.error('Error fetching restaurant data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load restaurant data')
    } finally {
      setLoading(false)
    }
  }

  // Initialize data fetch
  useEffect(() => {
    fetchRestaurantData(subdomain)
  }, [subdomain])

  // Helper function to check if restaurant is currently open
  const isOpen = (): boolean => {
    if (!restaurant?.operatingHours) return false
    
    const now = new Date()
    const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
    
    const todaysHours = restaurant.operatingHours.find(h => h.day_of_week === currentDay)
    
    if (!todaysHours || !todaysHours.is_open || !todaysHours.open_time || !todaysHours.close_time) {
      return false
    }
    
    // Handle overnight hours (e.g., 10:00 PM to 2:00 AM)
    if (todaysHours.is_overnight) {
      return currentTime >= todaysHours.open_time || currentTime <= todaysHours.close_time
    }
    
    return currentTime >= todaysHours.open_time && currentTime <= todaysHours.close_time
  }

  // Check if restaurant is accepting orders
  const isAcceptingOrders = (): boolean => {
    if (!restaurant) return false
    return restaurant.status === 'active' && isOpen()
  }

  // Get menu item by ID
  const getMenuItemById = (id: string): MenuItemWithRelations | null => {
    if (!restaurant) return null
    
    for (const category of restaurant.categories) {
      const item = category.items.find(item => item.id === id)
      if (item) return item
    }
    return null
  }

  // Get category by ID
  const getCategoryById = (id: string): MenuCategoryWithItems | null => {
    if (!restaurant) return null
    return restaurant.categories.find(category => category.id === id) || null
  }

  // Check delivery availability for a zip code
  const checkDeliveryAvailability = (zipCode: string): DeliveryZone | null => {
    if (!restaurant?.deliveryZones) return null
    
    return restaurant.deliveryZones.find(zone => 
      zone.is_active && zone.zip_codes.includes(zipCode)
    ) || null
  }

  // Get estimated delivery time for a zip code
  const getEstimatedDeliveryTime = (zipCode: string): number | null => {
    const zone = checkDeliveryAvailability(zipCode)
    return zone ? zone.estimated_delivery_time : null
  }

  // Get delivery fee for a zip code
  const getDeliveryFee = (zipCode: string): number | null => {
    const zone = checkDeliveryAvailability(zipCode)
    return zone ? zone.delivery_fee : null
  }

  // Refresh menu data
  const refreshMenu = async (): Promise<void> => {
    await fetchRestaurantData(subdomain)
  }

  return {
    restaurant,
    menu: restaurant?.categories || [],
    loading,
    error,
    isOpen: isOpen(),
    isAcceptingOrders: isAcceptingOrders(),
    operatingHours: restaurant?.operatingHours || [],
    deliveryZones: restaurant?.deliveryZones || [],
    
    // Helper functions
    getMenuItemById,
    getCategoryById,
    checkDeliveryAvailability,
    getEstimatedDeliveryTime,
    getDeliveryFee,
    refreshMenu
  }
}