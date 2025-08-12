import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RestaurantProvider } from '@/components/providers/restaurant-provider'
import { RestaurantHeader } from '@/components/restaurant/header'
import { RestaurantFooter } from '@/components/restaurant/footer'

export const metadata: Metadata = {
  title: {
    template: '%s | Restaurant',
    default: 'Restaurant',
  },
  description: 'Order delicious food online',
}

interface RestaurantLayoutProps {
  children: React.ReactNode
  params: {
    subdomain: string
  }
}

/**
 * Restaurant layout for customer-facing restaurant pages
 * Used for: Restaurant homepage, menu, cart, order tracking, etc.
 * This is the customer-facing frontend for each restaurant
 */
export default async function RestaurantLayout({ 
  children, 
  params 
}: RestaurantLayoutProps) {
  const supabase = createClient()
  const headersList = headers()
  
  // Get tenant information from middleware headers
  const tenantId = headersList.get('x-tenant-id')
  const tenantSubdomain = headersList.get('x-tenant-subdomain')
  
  if (!tenantId || !tenantSubdomain) {
    notFound()
  }
  
  // Fetch restaurant data
  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', tenantId)
    .eq('status', 'active')
    .single()
  
  if (error || !restaurant) {
    notFound()
  }
  
  return (
    <RestaurantProvider restaurant={restaurant}>
      <div className="flex min-h-screen flex-col">
        {/* Restaurant Header with branding */}
        <RestaurantHeader restaurant={restaurant} />
        
        {/* Main Content */}
        <main id="main-content" className="flex-1">
          {children}
        </main>
        
        {/* Restaurant Footer */}
        <RestaurantFooter restaurant={restaurant} />
      </div>
    </RestaurantProvider>
  )
}