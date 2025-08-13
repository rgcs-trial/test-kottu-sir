import { Suspense } from 'react'
import { InventoryDashboard } from '@/components/inventory/inventory-dashboard'
import { Card, CardContent } from '@/components/ui/card'
import { RefreshCw } from 'lucide-react'

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<InventoryPageSkeleton />}>
        <InventoryDashboardWrapper />
      </Suspense>
    </div>
  )
}

function InventoryDashboardWrapper() {
  // In a real implementation, you would get the tenantId from the current user session
  // For now, we'll use a placeholder
  const tenantId = 'tenant-id-placeholder' // TODO: Get from auth context

  return <InventoryDashboard tenantId={tenantId} />
}

function InventoryPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-72 bg-muted rounded animate-pulse" />
          <div className="h-4 w-96 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 bg-muted rounded animate-pulse" />
          <div className="h-9 w-24 bg-muted rounded animate-pulse" />
        </div>
      </div>

      {/* Search Skeleton */}
      <div className="h-10 w-64 bg-muted rounded animate-pulse" />

      {/* Stats Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-8 w-8 bg-muted rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loading Message */}
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading inventory dashboard...</p>
        </CardContent>
      </Card>
    </div>
  )
}

export const metadata = {
  title: 'Inventory Management',
  description: 'Monitor stock levels, track movements, and manage suppliers',
}