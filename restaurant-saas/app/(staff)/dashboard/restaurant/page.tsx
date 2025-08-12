import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RestaurantForm } from '@/components/restaurant/restaurant-form'
import { Restaurant } from '@/types'

export const metadata: Metadata = {
  title: 'Restaurant Settings',
  description: 'Manage your restaurant settings and configuration',
}

/**
 * Restaurant Settings Page
 * Allows restaurant owners to manage their restaurant settings
 */
export default async function RestaurantSettingsPage() {
  const supabase = createClient()
  const headersList = headers()
  
  // Get tenant information from middleware
  const tenantId = headersList.get('x-tenant-id')
  
  if (!tenantId) {
    notFound()
  }

  // Fetch restaurant data
  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', tenantId)
    .single()

  if (error || !restaurant) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Restaurant Settings
          </h1>
          <p className="text-gray-600">
            Manage your restaurant information, operating hours, and business settings
          </p>
        </div>
      </div>

      {/* Restaurant Form */}
      <RestaurantForm 
        restaurant={restaurant} 
        onUpdate={(updatedRestaurant: Restaurant) => {
          // Handle restaurant update
          console.log('Restaurant updated:', updatedRestaurant)
        }}
      />
    </div>
  )
}