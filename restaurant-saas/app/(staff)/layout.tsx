import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StaffSidebar } from '@/components/staff/sidebar'
import { StaffHeader } from '@/components/staff/header'
import { RestaurantProvider } from '@/components/providers/restaurant-provider'

export const metadata: Metadata = {
  title: {
    template: '%s | Staff Dashboard',
    default: 'Staff Dashboard',
  },
  description: 'Restaurant staff management dashboard',
  robots: {
    index: false,
    follow: false,
  },
}

interface StaffLayoutProps {
  children: React.ReactNode
}

/**
 * Staff layout for restaurant management pages
 * Used for: Restaurant dashboard, menu management, orders, analytics, etc.
 * This is the restaurant owner/staff backend management interface
 */
export default async function StaffLayout({ children }: StaffLayoutProps) {
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
      <div className="flex h-screen bg-neutral-50">
        {/* Staff Sidebar */}
        <StaffSidebar restaurant={restaurant} />
        
        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Staff Header */}
          <StaffHeader restaurant={restaurant} />
          
          {/* Page Content */}
          <main 
            id="main-content" 
            className="flex-1 overflow-y-auto bg-background p-6"
          >
            {children}
          </main>
        </div>
      </div>
    </RestaurantProvider>
  )
}