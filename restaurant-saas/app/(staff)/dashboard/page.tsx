import type { Metadata } from 'next'
import { Suspense } from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RestaurantStatsCards, PopularItems, RecentOrders } from '@/components/restaurant/restaurant-stats'
import { RestaurantStatusToggle } from '@/components/restaurant/restaurant-form'
import { OperatingHoursDisplay } from '@/components/restaurant/operating-hours'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  TrendingUp, 
  Clock,
  Settings,
  ChefHat,
  Bell,
  Users,
  MapPin
} from 'lucide-react'
import Link from 'next/link'
import { Restaurant } from '@/types'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Restaurant management dashboard',
}

/**
 * Staff Dashboard Loading Component
 */
function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="w-48 h-8 bg-gray-200 rounded animate-pulse" />
        <div className="w-32 h-10 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 border rounded-lg">
            <div className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="w-16 h-8 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="w-20 h-3 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-6 border rounded-lg">
            <div className="w-32 h-6 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="w-full h-4 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Quick Actions Component
 */
function QuickActions({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Quick Actions
        </CardTitle>
        <CardDescription>
          Common tasks and shortcuts
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Button asChild variant="outline" className="justify-start">
          <Link href="/dashboard/orders">
            <ChefHat className="h-4 w-4 mr-2" />
            View Orders
          </Link>
        </Button>
        
        <Button asChild variant="outline" className="justify-start">
          <Link href="/dashboard/menu">
            <BarChart3 className="h-4 w-4 mr-2" />
            Manage Menu
          </Link>
        </Button>
        
        <Button asChild variant="outline" className="justify-start">
          <Link href="/dashboard/analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            View Analytics
          </Link>
        </Button>
        
        <Button asChild variant="outline" className="justify-start">
          <Link href="/dashboard/restaurant">
            <Settings className="h-4 w-4 mr-2" />
            Restaurant Settings
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * Restaurant Info Card Component
 */
function RestaurantInfoCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Restaurant Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <RestaurantStatusToggle restaurant={restaurant} />
        </div>

        {/* Basic Info */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Address:</span>
            <span className="text-right max-w-48">
              {restaurant.address.street}, {restaurant.address.city}, {restaurant.address.state}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phone:</span>
            <span>{restaurant.phone}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email:</span>
            <span className="truncate max-w-32">{restaurant.email}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subscription:</span>
            <Badge variant="success" className="capitalize">
              {restaurant.subscriptionTier}
            </Badge>
          </div>
        </div>

        {/* Operating Hours */}
        <div className="pt-2 border-t">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Today's Hours
          </h4>
          <Suspense fallback={<div className="w-full h-16 bg-gray-100 rounded animate-pulse" />}>
            <OperatingHoursDisplay />
          </Suspense>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Main Dashboard Page Component
 */
export default async function DashboardPage() {
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
            Welcome back! 👋
          </h1>
          <p className="text-gray-600">
            Here's what's happening at {restaurant.name} today
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/orders">
              <Bell className="h-4 w-4 mr-2" />
              View Orders
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/dashboard/analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Link>
          </Button>
        </div>
      </div>

      {/* Restaurant Status Alert */}
      {!restaurant.isOnline && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            <div className="flex-1">
              <p className="font-medium text-yellow-800">
                Your restaurant is currently offline
              </p>
              <p className="text-sm text-yellow-700">
                {restaurant.temporaryClosureReason || 'Customers cannot place orders while offline'}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/restaurant">
                Manage Status
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Stats */}
      <Suspense fallback={<DashboardLoading />}>
        <RestaurantStatsCards />
      </Suspense>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Orders */}
        <div className="md:col-span-2 lg:col-span-1">
          <Suspense fallback={
            <Card>
              <CardHeader>
                <div className="w-32 h-6 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="w-full h-16 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              </CardContent>
            </Card>
          }>
            <RecentOrders limit={5} />
          </Suspense>
        </div>

        {/* Popular Items */}
        <div className="lg:col-span-1">
          <Suspense fallback={
            <Card>
              <CardHeader>
                <div className="w-32 h-6 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="w-full h-12 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              </CardContent>
            </Card>
          }>
            <PopularItems limit={5} />
          </Suspense>
        </div>

        {/* Restaurant Info & Quick Actions */}
        <div className="space-y-6 lg:col-span-1">
          <RestaurantInfoCard restaurant={restaurant} />
          <QuickActions restaurant={restaurant} />
        </div>
      </div>

      {/* Additional Actions */}
      <div className="flex flex-wrap gap-4 pt-6 border-t">
        <Button variant="outline" asChild>
          <Link href="/dashboard/staff">
            <Users className="h-4 w-4 mr-2" />
            Manage Staff
          </Link>
        </Button>
        
        <Button variant="outline" asChild>
          <Link href="/dashboard/menu">
            <ChefHat className="h-4 w-4 mr-2" />
            Update Menu
          </Link>
        </Button>
        
        <Button variant="outline" asChild>
          <Link href="/dashboard/analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            View Reports
          </Link>
        </Button>
      </div>
    </div>
  )
}