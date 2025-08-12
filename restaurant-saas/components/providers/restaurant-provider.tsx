'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { Restaurant, RestaurantContextType } from '@/types'

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined)

interface RestaurantProviderProps {
  children: React.ReactNode
  restaurant: Restaurant
}

/**
 * Restaurant context provider
 * Provides restaurant data and management functions to child components
 */
export function RestaurantProvider({ children, restaurant: initialRestaurant }: RestaurantProviderProps) {
  const [restaurant, setRestaurant] = useState<Restaurant>(initialRestaurant)
  const [loading, setLoading] = useState(false)

  const updateRestaurant = async (data: Partial<Restaurant>) => {
    setLoading(true)
    try {
      // API call to update restaurant
      const response = await fetch('/api/restaurants', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to update restaurant')
      }

      const updatedRestaurant = await response.json()
      setRestaurant(updatedRestaurant)
    } catch (error) {
      console.error('Error updating restaurant:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const refreshRestaurant = async () => {
    setLoading(true)
    try {
      // API call to refresh restaurant data
      const response = await fetch('/api/restaurants/current')
      
      if (!response.ok) {
        throw new Error('Failed to refresh restaurant')
      }

      const refreshedRestaurant = await response.json()
      setRestaurant(refreshedRestaurant)
    } catch (error) {
      console.error('Error refreshing restaurant:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const contextValue: RestaurantContextType = {
    restaurant,
    loading,
    updateRestaurant,
    refreshRestaurant,
  }

  return (
    <RestaurantContext.Provider value={contextValue}>
      {children}
    </RestaurantContext.Provider>
  )
}

/**
 * Hook to use restaurant context
 */
export function useRestaurant() {
  const context = useContext(RestaurantContext)
  if (context === undefined) {
    throw new Error('useRestaurant must be used within a RestaurantProvider')
  }
  return context
}